import { Mail, Phone, Briefcase, Building2, Users } from 'lucide-react';
import { useState } from 'react';
import { Founder, Incubatee } from './IncubateeTable';

interface ViewFounderProps {
  founder: Founder;
  incubatee: Incubatee;
  onClose: () => void;
  onSave: (founder: Founder) => void;
}

export function ViewFounder({ founder, incubatee, onClose, onSave }: ViewFounderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Founder>(founder);
  const [roleInput, setRoleInput] = useState('');

  const getStatusColor = (status: Incubatee['status']) => {
    switch (status) {
      case 'Graduate':
        return 'bg-green-100 text-green-700';
      case 'Incubatee':
        return 'bg-blue-100 text-blue-700';
      case 'Incubatee Extended':
        return 'bg-purple-100 text-purple-700';
      case 'Applicant':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const addRole = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !(formData.roles ?? []).includes(trimmed)) {
      setFormData((prev) => ({ ...prev, roles: [...(prev.roles ?? []), trimmed] }));
    }
    setRoleInput('');
  };

  const removeRole = (role: string) =>
    setFormData((prev) => ({ ...prev, roles: (prev.roles ?? []).filter((r) => r !== role) }));

  const handleRoleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRole(roleInput);
    } else if (e.key === 'Backspace' && !roleInput && (formData.roles ?? []).length > 0) {
      setFormData((prev) => ({ ...prev, roles: (prev.roles ?? []).slice(0, -1) }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (roleInput.trim()) addRole(roleInput);
    onSave(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (isEditing) {
      setFormData(founder);
      setIsEditing(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Founder' : 'Founder Details'}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto">
            {!isEditing ? (
              // View Mode
              <>
                {/* Profile Section */}
                <div className="flex flex-col items-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-3xl mb-4">
                    {founder.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    {founder.name}
                  </h3>
                  {(founder.roles ?? []).length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {(founder.roles ?? []).map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FF2B5E]/10 text-[#FF2B5E]"
                        >
                          <Briefcase className="w-3 h-3" />
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      No roles assigned
                    </p>
                  )}
                </div>

                {/* Startup Information */}
                <div className="space-y-4 mb-6">
                  <h4 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                    Startup Information
                  </h4>

                  <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Startup Name</p>
                      <p className="text-sm text-gray-900">{incubatee.startupName}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                    <Users className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Cohort Level</p>
                      <p className="text-sm text-gray-900">{incubatee.cohortLevel.map((l: number) => `Cohort ${l}`).join(', ')}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          incubatee.status
                        )}`}
                      >
                        {incubatee.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                    Contact Information
                  </h4>

                  <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="text-sm text-gray-900">{founder.email}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                    <Phone className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                      <p className="text-sm text-gray-900">{founder.phone}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Edit Mode
              <form onSubmit={handleSave} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                    placeholder="Enter founder name"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roles / Positions
                  </label>
                  <div className="w-full min-h-[48px] px-3 py-2 bg-white border border-gray-200 rounded-xl flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-[#FF2B5E] focus-within:border-transparent">
                    {(formData.roles ?? []).map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FF2B5E]/10 text-[#FF2B5E]"
                      >
                        <Briefcase className="w-3 h-3" />
                        {r}
                        <button
                          type="button"
                          onClick={() => removeRole(r)}
                          className="ml-0.5 hover:text-[#c0234f]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      onKeyDown={handleRoleKeyDown}
                      onBlur={() => { if (roleInput.trim()) addRole(roleInput); }}
                      className="flex-1 min-w-[120px] outline-none text-sm py-0.5"
                      placeholder={(formData.roles ?? []).length === 0 ? 'e.g. CEO — press Enter to add' : 'Add another...'}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Press Enter or comma to add a role.</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                    placeholder="founder@example.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                    placeholder="+63 912 345 6789"
                  />
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="flex-1 max-w-xs px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex-1 max-w-xs px-6 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex-1 max-w-xs px-6 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}