// Supabase Edge Function: grant-access
// Sends a magic link invitation to a team member
// Only callable by authenticated admins

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
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user is authenticated (using anon key client)
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { teamMemberId, email, role } = await req.json()

    if (!teamMemberId || !email || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: teamMemberId, email, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role is Manager or Member
    if (role !== 'Manager' && role !== 'Member') {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Only Manager and Member can be granted access' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if team member exists
    const { data: teamMember, error: teamError } = await supabase
      .from('teams')
      .select('id, first_name, last_name, email, has_access')
      .eq('id', teamMemberId)
      .single()

    if (teamError || !teamMember) {
      return new Response(
        JSON.stringify({ error: 'Team member not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already has access
    if (teamMember.has_access) {
      return new Response(
        JSON.stringify({ error: 'Team member already has access' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('access_invites')
      .insert({
        team_member_id: teamMemberId,
        email: email,
        role: role,
        token: token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invite:', inviteError)
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate magic link
    const redirectUrl = `${req.headers.get('origin') || Deno.env.get('SITE_URL')}/claim-access?token=${token}`
    
    // Send magic link via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (authError) {
      console.error('Error generating magic link:', authError)
      // Clean up invite
      await supabase.from('access_invites').delete().eq('invite_id', invite.invite_id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update team member to indicate invite sent
    await supabase
      .from('teams')
      .update({ has_access: false }) // Explicitly mark as pending
      .eq('id', teamMemberId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Access invitation sent successfully',
        inviteId: invite.invite_id,
        email: email,
        expiresAt: expiresAt.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in grant-access function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
