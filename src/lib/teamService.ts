import { supabase } from './supabaseClient';
import type { TeamMember, TeamRole } from '../types';

// Database interfaces
interface TeamRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role_id: number | null;
  department_id: number | null;
  joined_date: string | null;
  avatar_color: string | null;
  is_active: boolean;
  has_access: boolean | null;
  roles?: { id: number; role_name: string } | null;
  departments?: { id: number; department_name: string } | null;
}

/**
 * Convert database row to TeamMember
 */
function rowToTeamMember(row: TeamRow): TeamMember {
  const roleName = (row.roles?.role_name || 'Member') as TeamRole;
  const departmentName = row.departments?.department_name;

  return {
    id: row.id.toString(),
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`,
    email: row.email,
    role: roleName,
    department: departmentName,
    phone: row.phone || undefined,
    joinedDate: row.joined_date ? new Date(row.joined_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : undefined,
    avatarColor: row.avatar_color || '#FF2B5E',
    hasAccess: row.has_access ?? undefined,
  };
}

/**
 * Fetch all active team members from the database
 */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  console.log('🔍 Fetching team members from database...');
  
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      roles(id, role_name),
      departments(id, department_name)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching team members:', error);
    throw error;
  }

  console.log('✅ Fetched team members:', data?.length || 0, 'members');
  return (data || []).map(rowToTeamMember);
}

/**
 * Fetch all inactive (archived) team members from the database
 */
export async function fetchArchivedTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      roles(id, role_name),
      departments(id, department_name)
    `)
    .eq('is_active', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching archived team members:', error);
    throw error;
  }

  return (data || []).map(rowToTeamMember);
}

/**
 * Helper to get role ID by name
 */
async function getRoleIdByName(roleName: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('roles')
    .select('id')
    .eq('role_name', roleName)
    .single();

  if (error) return null;
  return data?.id || null;
}

/**
 * Helper to get department ID by name (creates if doesn't exist)
 */
async function ensureDepartmentId(departmentName?: string): Promise<number | null> {
  if (!departmentName) return null;

  // Try to find existing department
  const { data: existing } = await supabase
    .from('departments')
    .select('id')
    .eq('department_name', departmentName)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  // Try to create new department
  try {
    const { data, error } = await supabase
      .from('departments')
      .insert({ department_name: departmentName })
      .select('id')
      .single();

    if (error) {
      // Might have been created by another request
      const { data: retry } = await supabase
        .from('departments')
        .select('id')
        .eq('department_name', departmentName)
        .maybeSingle();
      return retry?.id || null;
    }
    return data?.id || null;
  } catch (err) {
    console.warn('Department creation failed:', err);
    return null;
  }
}

/**
 * Create a new team member
 */
export async function createTeamMember(member: Omit<TeamMember, 'id'>): Promise<TeamMember> {
  try {
    const roleId = await getRoleIdByName(member.role);
    const departmentId = await ensureDepartmentId(member.department);

    // Parse joined date
    let joinedDate: string | null = null;
    if (member.joinedDate) {
      try {
        const date = new Date(member.joinedDate);
        joinedDate = date.toISOString().split('T')[0];
      } catch {
        joinedDate = new Date().toISOString().split('T')[0];
      }
    } else {
      joinedDate = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('teams')
      .insert({
        first_name: member.firstName,
        last_name: member.lastName,
        email: member.email,
        phone: member.phone || null,
        role_id: roleId,
        department_id: departmentId,
        joined_date: joinedDate,
        avatar_color: member.avatarColor || '#FF2B5E',
        is_active: true,
      })
      .select(`
        *,
        roles(id, role_name),
        departments(id, department_name)
      `)
      .single();

    if (error) {
      console.error('Error creating team member:', error);
      if (error.code === '23505' && error.message?.includes('teams_email_key')) {
        throw new Error('A team member with this email already exists. Please use a different email.');
      }
      throw new Error(`Failed to create team member: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from team member creation');
    }

    return rowToTeamMember(data);
  } catch (err) {
    console.error('Create team member failed:', err);
    throw err;
  }
}

/**
 * Update a team member
 */
export async function updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember> {
  const updateData: any = {};

  if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
  if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone || null;

  if (updates.role !== undefined) {
    updateData.role_id = await getRoleIdByName(updates.role);
  }

  if (updates.department !== undefined) {
    updateData.department_id = await ensureDepartmentId(updates.department);
  }

  if (updates.joinedDate !== undefined) {
    try {
      const date = new Date(updates.joinedDate);
      updateData.joined_date = date.toISOString().split('T')[0];
    } catch {
      // Keep existing date if parse fails
    }
  }

  if (updates.avatarColor !== undefined) {
    updateData.avatar_color = updates.avatarColor;
  }

  const { data, error } = await supabase
    .from('teams')
    .update(updateData)
    .eq('id', parseInt(id))
    .select(`
      *,
      roles(id, role_name),
      departments(id, department_name)
    `)
    .single();

  if (error) throw error;
  return rowToTeamMember(data);
}

/**
 * Soft delete a team member (set is_active to false)
 */
export async function deleteTeamMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .update({ is_active: false })
    .eq('id', parseInt(id));

  if (error) throw error;
}

/**
 * Restore a soft-deleted team member (set is_active back to true)
 */
export async function restoreTeamMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .update({ is_active: true })
    .eq('id', parseInt(id));

  if (error) throw error;
}

/**
 * Permanently delete a team member
 */
export async function deleteTeamMemberPermanently(id: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', parseInt(id));

  if (error) throw error;
}

/**
 * Grant system access to a team member by sending a magic link invitation
 * @param teamMemberId - The ID of the team member
 * @param email - The email to send the invitation to
 * @param role - The role to grant (Admin, Manager, or Member)
 */
export async function grantAccess(
  teamMemberId: string,
  email: string,
  role: 'Admin' | 'Manager' | 'Member'
): Promise<{ success: boolean; message: string; warning?: string; claimLink?: string; actionLink?: string }> {
  try {
    // Refresh session first to ensure we have a valid token
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshData.session) {
      console.error('Session refresh error:', refreshError);
      throw new Error('Your session has expired. Please log in again.');
    }

    const session = refreshData.session;
    console.log('✓ Session refreshed, granting access...');
    console.log('Token length:', session.access_token.length);
    console.log('User:', session.user.email);

    // Call the grant-access Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grant-access`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamMemberId: parseInt(teamMemberId),
          email,
          role,
        }),
      }
    );

    const rawText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', rawText);
    
    const result = rawText ? JSON.parse(rawText) : {};

    if (!response.ok) {
      const detail = result.detail ? ` (${result.detail})` : '';
      const errorMessage = (result.error || result.message || rawText || 'Failed to grant access') + detail;
      throw new Error(errorMessage);
    }

    return {
      success: true,
      message: result.message || 'Access invitation sent successfully',
      warning: result.warning,
      claimLink: result.claimLink,
      actionLink: result.actionLink,
    };
  } catch (error) {
    console.error('Error granting access:', error);
    throw error;
  }
}

/**
 * Claim an access invitation using a token
 * @param token - The invitation token from the magic link
 */
export async function claimAccess(token: string): Promise<{ success: boolean; message: string }> {
  try {
    // Refresh session first to ensure we have a valid token
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshData.session) {
      throw new Error('Your session has expired. Please sign in again to claim access.');
    }

    const session = refreshData.session;

    // Call the claim-access Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-access`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      }
    );

    const rawText = await response.text();
    console.log('Claim access response:', response.status, rawText);
    const result = rawText ? JSON.parse(rawText) : {};

    if (!response.ok) {
      const detail = result.detail ? ` (${result.detail})` : '';
      const errorMessage = (result.error || result.message || rawText || 'Failed to claim access') + detail;
      throw new Error(errorMessage);
    }

    return {
      success: true,
      message: result.message || 'Access granted successfully',
    };
  } catch (error) {
    console.error('Error claiming access:', error);
    throw error;
  }
}
