// Supabase Edge Function: claim-access
// Claims an access invitation and creates app_user record
// Callable by authenticated users who have received a magic link

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user is authenticated
    const supabaseAnon = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - please sign in with the magic link' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabaseService
      .from('access_invites')
      .select('*, teams(id, first_name, last_name, email, role_id, roles(role_name))')
      .eq('token', token)
      .is('claimed_at', null)
      .single()

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify email matches
    if (user.email !== invite.email) {
      return new Response(
        JSON.stringify({ error: 'Email mismatch - please sign in with the invited email' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has access
    const { data: existingUser } = await supabaseService
      .from('app_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'You already have access to the system' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create app_user record
    const { error: appUserError } = await supabaseService
      .from('app_users')
      .insert({
        user_id: user.id,
        team_member_id: invite.team_member_id,
        email: invite.email,
        role: invite.role,
      })

    if (appUserError) {
      console.error('Error creating app_user:', appUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to create user access' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark invite as claimed
    await supabaseService
      .from('access_invites')
      .update({
        claimed_at: new Date().toISOString(),
        claimed_by_user_id: user.id,
      })
      .eq('invite_id', invite.invite_id)

    // Update team member to mark as having access
    await supabaseService
      .from('teams')
      .update({ has_access: true })
      .eq('id', invite.team_member_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Access granted successfully',
        user: {
          email: user.email,
          role: invite.role,
          teamMemberId: invite.team_member_id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in claim-access function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
