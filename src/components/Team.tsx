import { useState, useEffect } from 'react';
import { Users, Mail, Phone, Calendar, Search, Plus, Edit2, Trash2, Shield, UserCog, X, Key } from 'lucide-react';
import type { TeamMember, TeamRole } from '../types';
import { fetchTeamMembers, createTeamMember, deleteTeamMember, grantAccess } from '../lib/teamService';
import { PopupDialog } from './PopupDialog';

interface TeamProps {
  refreshToken?: number;
  onArchived?: (member: TeamMember) => void;
}

export function Team({ refreshToken, onArchived }: TeamProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'primary' | 'danger' | 'neutral' | 'success';
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Member' as TeamRole,
    department: '',
    joinedDate: '',
  });

  // Load team members on mount
  useEffect(() => {
    loadTeamMembers();
  }, [refreshToken]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Team component: Loading team members...');
      const data = await fetchTeamMembers();
      console.log('✅ Team component: Loaded', data.length, 'members');
      setTeamMembers(data);
    } catch (err) {
      console.error('❌ Team component: Error loading team members:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load team members. Please check the console for details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openConfirm = (config: Omit<NonNullable<typeof dialog>, 'onConfirm' | 'onCancel'>) =>
    new Promise<boolean>((resolve) => {
      setDialog({
        ...config,
        cancelLabel: config.cancelLabel ?? 'Cancel',
        confirmLabel: config.confirmLabel ?? 'Confirm',
        onConfirm: () => {
          resolve(true);
          setDialog(null);
        },
        onCancel: () => {
          resolve(false);
          setDialog(null);
        },
      });
    });

  const openAlert = (config: Omit<NonNullable<typeof dialog>, 'onConfirm' | 'onCancel' | 'cancelLabel'>) => {
    setDialog({
      ...config,
      confirmLabel: config.confirmLabel ?? 'OK',
      onConfirm: () => setDialog(null),
    });
  };

  const handleAddMember = async () => {
    if (!newMember.firstName || !newMember.lastName || !newMember.email) return;

    try {
      setLoading(true);
      setError(null);
      const createdMember = await createTeamMember({
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        name: `${newMember.firstName} ${newMember.lastName}`,
        email: newMember.email,
        phone: newMember.phone || undefined,
        role: newMember.role,
        department: newMember.department || undefined,
        joinedDate: newMember.joinedDate || new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
        avatarColor: '#FF2B5E',
      });
      await loadTeamMembers();
      openAlert({
        title: 'Member added',
        message: `Member added successfully: ${createdMember.name}`,
        tone: 'success',
      });
      setShowAddModal(false);
      setNewMember({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'Member',
        department: '',
        joinedDate: '',
      });
    } catch (err) {
      console.error('Error creating team member:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create team member';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    const confirmed = await openConfirm({
      title: 'Remove team member',
      message: `Are you sure you want to remove ${name} from the team?`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!confirmed) return;

    const archivedCandidate = teamMembers.find((m) => m.id === id);

    try {
      setLoading(true);
      await deleteTeamMember(id);
      await loadTeamMembers();

      if (archivedCandidate && onArchived) {
        onArchived(archivedCandidate);
      }
    } catch (err) {
      console.error('Error deleting team member:', err);
      setError('Failed to delete team member');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (member: TeamMember) => {
    if (member.hasAccess) {
      setError('This member already has system access');
      return;
    }

    if (member.role !== 'Manager' && member.role !== 'Member') {
      setError('Only Manager and Member roles can be granted access');
      return;
    }

    const confirmed = await openConfirm({
      title: 'Send access invitation',
      message: `Send access invitation to ${member.name} (${member.email})?`,
      confirmLabel: 'Send invite',
      tone: 'primary',
    });
    if (!confirmed) return;

    try {
      setLoading(true);
      setError(null);
      const result = await grantAccess(member.id, member.email, member.role);
      
      if (result.warning && result.actionLink) {
        // Email couldn't be sent due to Resend limitations - show the link
        const copyLink = await openConfirm({
          title: 'Copy magic link?',
          message: `${result.message}\n\nWould you like to copy the magic link to share manually?`,
          confirmLabel: 'Copy link',
          tone: 'primary',
        });
        if (copyLink) {
          await navigator.clipboard.writeText(result.actionLink);
          openAlert({
            title: 'Magic link copied',
            message: `Magic link copied to clipboard!\n\nShare this link with ${member.email}`,
            tone: 'success',
          });
        }
      } else {
        openAlert({
          title: 'Access invited',
          message: `${result.message}\n\nA magic link has been sent to ${member.email}`,
          tone: 'success',
        });
      }
      await loadTeamMembers(); // Reload to update has_access status
    } catch (err) {
      console.error('Error granting access:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to grant access';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter team members
  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || member.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Calculate statistics
  const totalMembers = teamMembers.length;
  const adminCount = teamMembers.filter((m) => m.role === 'Admin').length;
  const managerCount = teamMembers.filter((m) => m.role === 'Manager').length;
  const memberCount = teamMembers.filter((m) => m.role === 'Member').length;

  // Group by department
  const departmentStats = teamMembers.reduce((acc, member) => {
    const dept = member.department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin':
        return <Shield className="w-4 h-4" />;
      case 'Manager':
        return <UserCog className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-700';
      case 'Manager':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Team Management</h1>
          <p className="text-gray-600">Manage your team members and their roles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={loading}
          className="flex items-center gap-2 bg-[#FF2B5E] text-white px-5 py-2.5 rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Members */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#FF2B5E]/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-[#FF2B5E]" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">{totalMembers}</h3>
          <p className="text-sm text-gray-600">Total Members</p>
        </div>

        {/* Admins */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">{adminCount}</h3>
          <p className="text-sm text-gray-600">Admins</p>
        </div>

        {/* Managers */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserCog className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">{managerCount}</h3>
          <p className="text-sm text-gray-600">Managers</p>
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-600" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">{memberCount}</h3>
          <p className="text-sm text-gray-600">Members</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E]"
            />
          </div>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] bg-white"
          >
            <option value="all">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Member">Member</option>
          </select>
        </div>
      </div>

      {/* Team Members Grid */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || selectedRole !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first team member'}
          </p>
          {!searchQuery && selectedRole === 'all' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-[#FF2B5E] text-white px-5 py-2.5 rounded-lg hover:bg-[#E6275A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Member
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Card Header with Background */}
              <div className="h-24 bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E]" />

              {/* Card Content */}
              <div className="p-6 -mt-12">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-white font-semibold text-xl mb-4 bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E]">
                  {member.firstName.charAt(0)}
                  {member.lastName.charAt(0)}
                </div>

                {/* Member Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {member.firstName} {member.lastName}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(
                        member.role
                      )}`}
                    >
                      {getRoleIcon(member.role)}
                      {member.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{member.department}</p>
                </div>

                {/* Contact Details */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Joined {member.joinedDate || 'N/A'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  {/* Show Grant Access button for Manager/Member without access */}
                  {(member.role === 'Manager' || member.role === 'Member') && !member.hasAccess ? (
                    <button
                      onClick={() => handleGrantAccess(member)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <Key className="w-4 h-4" />
                      Grant Access
                    </button>
                  ) : member.hasAccess ? (
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <Key className="w-4 h-4" />
                      Has Access
                    </div>
                  ) : null}
                  
                  <button
                    onClick={() => {}}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMember(member.id, member.name)}
                    disabled={loading}
                    className="flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Departments Overview */}
      {Object.keys(departmentStats).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Team by Department</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(departmentStats).map(([department, count]) => (
              <div
                key={department}
                className="bg-gray-50 rounded-lg p-4 border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{department}</span>
                  <span className="text-2xl font-semibold text-[#FF2B5E]">{count}</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#FF2B5E] h-2 rounded-full transition-all"
                    style={{
                      width: `${(count / totalMembers) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Team Member</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={newMember.firstName}
                  onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={newMember.lastName}
                  onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  placeholder="Enter last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  placeholder="member@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  placeholder="+63 XXX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={newMember.department}
                  onChange={(e) => setNewMember({ ...newMember, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  placeholder="Enter department"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value as TeamRole })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                >
                  <option value="Member">Member</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!newMember.firstName || !newMember.lastName || !newMember.email || loading}
                className="flex-1 px-4 py-2 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6265A] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
      <PopupDialog
        open={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        tone={dialog?.tone}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />
    </div>
  );
}
