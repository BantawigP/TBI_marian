import { X, AlertTriangle, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { Founder, Incubatee } from './IncubateeTable';

interface AddFounderModalProps {
  incubatees: Incubatee[];
  /** All known founders (assigned + unassigned) for duplicate detection */
  allFounders: (Founder & { startupName: string })[];
  onClose: () => void;
  onSave: (incubateeId: string, founder: Founder) => void;
  /** Called when user chooses to link an existing founder instead of creating a new one */
  onLinkExisting: (incubateeId: string, existingFounder: Founder) => void;
}

export function AddFounderModal({ incubatees, allFounders, onClose, onSave, onLinkExisting }: AddFounderModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    incubateeId: '',
  });
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState('');
  const [duplicate, setDuplicate] = useState<(Founder & { startupName: string }) | null>(null);

  // Detect duplicate on name+email change
  const checkDuplicate = (name: string, email: string) => {
    if (!name.trim() || !email.trim()) { setDuplicate(null); return; }
    const match = allFounders.find(
      (f) =>
        f.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        f.email.trim().toLowerCase() === email.trim().toLowerCase()
    );
    setDuplicate(match ?? null);
  };

  const addRole = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !roles.includes(trimmed)) {
      setRoles((prev) => [...prev, trimmed]);
    }
    setRoleInput('');
  };

  const removeRole = (role: string) => setRoles((prev) => prev.filter((r) => r !== role));

  const handleRoleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRole(roleInput);
    } else if (e.key === 'Backspace' && !roleInput && roles.length > 0) {
      setRoles((prev) => prev.slice(0, -1));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roleInput.trim()) addRole(roleInput); // commit any partially-typed role

    const newFounder: Founder = {
      id: `f-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      roles,
    };

    onSave(formData.incubateeId, newFounder);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Add New Founder</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate warning banner */}
        {duplicate && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">Founder already exists</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  <strong>{duplicate.name}</strong> ({duplicate.email}) is already linked to{' '}
                  <strong>{duplicate.startupName}</strong>.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => { onLinkExisting(formData.incubateeId, duplicate); }}
                    className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Link Existing Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicate(null)}
                    className="px-3 py-1.5 bg-white text-amber-700 border border-amber-300 text-xs font-medium rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    Create New Anyway
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 bg-white text-gray-600 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Select Startup */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Startup</label>
              <select
                value={formData.incubateeId}
                onChange={(e) => setFormData({ ...formData, incubateeId: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
              >
                <option value="">Choose a startup...</option>
                {incubatees.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.startupName} - {inc.cohortLevel.map((l) => `Cohort ${l}`).join(', ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  checkDuplicate(e.target.value, formData.email);
                }}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                placeholder="Enter founder name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  checkDuplicate(formData.name, e.target.value);
                }}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                placeholder="founder@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                placeholder="+63 912 345 6789"
              />
            </div>

            {/* Roles â€” tag chip input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Roles / Positions</label>
              <div className="w-full min-h-[48px] px-3 py-2 bg-white border border-gray-200 rounded-xl flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-[#FF2B5E] focus-within:border-transparent">
                {roles.map((r) => (
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
                      Ã—
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
                  placeholder={roles.length === 0 ? 'e.g. CEO, CTO â€” press Enter to add' : 'Add another...'}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Press Enter or comma to add a role.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#FF2B5E] text-white rounded-xl hover:bg-[#E6275A] transition-colors"
            >
              Add Founder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


interface AddFounderModalProps {
  incubatees: Incubatee[];
  onClose: () => void;
  onSave: (incubateeId: string, founder: Founder) => void;
}
