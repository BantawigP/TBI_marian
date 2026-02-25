import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { Incubatee, Founder } from './IncubateeTable';

interface IncubateeFormProps {
  incubatee?: Incubatee | null;
  allFounders: Founder[];
  onSave: (incubatee: Incubatee) => void;
  onClose: () => void;
}

export function IncubateeForm({ incubatee, allFounders, onSave, onClose }: IncubateeFormProps) {
  const [formData, setFormData] = useState<Incubatee>({
    id: incubatee?.id || `inc_${Date.now()}`,
    startupName: incubatee?.startupName || '',
    cohortLevel: incubatee?.cohortLevel || 1,
    startupDescription: incubatee?.startupDescription || '',
    founders: incubatee?.founders || [],
    status: incubatee?.status || 'Incubatee',
  });

  const [showFounderForm, setShowFounderForm] = useState(false);
  const [editingFounder, setEditingFounder] = useState<Founder | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleAddFounder = (founder: Founder) => {
    if (editingFounder) {
      // Update existing founder
      setFormData({
        ...formData,
        founders: formData.founders.map((f) =>
          f.id === founder.id ? founder : f
        ),
      });
    } else {
      // Add new founder
      setFormData({
        ...formData,
        founders: [...formData.founders, founder],
      });
    }
    setShowFounderForm(false);
    setEditingFounder(null);
  };

  const handleEditFounder = (founder: Founder) => {
    setEditingFounder(founder);
    setShowFounderForm(true);
  };

  const handleRemoveFounder = (founderId: string) => {
    setFormData({
      ...formData,
      founders: formData.founders.filter((f) => f.id !== founderId),
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {incubatee ? 'Edit Incubatee' : 'Add New Incubatee'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Startup Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Startup Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.startupName}
                  onChange={(e) =>
                    setFormData({ ...formData, startupName: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  placeholder="Enter startup name"
                />
              </div>

              {/* Cohort Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cohort Level *
                </label>
                <select
                  required
                  value={formData.cohortLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cohortLevel: parseInt(e.target.value) as 1 | 2 | 3 | 4,
                    })
                  }
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                >
                  <option value={1}>Cohort 1</option>
                  <option value={2}>Cohort 2</option>
                  <option value={3}>Cohort 3</option>
                  <option value={4}>Cohort 4</option>
                </select>
              </div>

              {/* Startup Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Startup Description *
                </label>
                <textarea
                  required
                  value={formData.startupDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      startupDescription: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent resize-none"
                  placeholder="Describe the startup..."
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as Incubatee['status'],
                    })
                  }
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                >
                  <option value="Incubatee">Incubatee</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Parked">Parked</option>
                </select>
              </div>

              {/* Founders */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Founders ({formData.founders.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFounder(null);
                      setShowFounderForm(true);
                    }}
                    className="flex items-center gap-1 text-sm text-[#FF2B5E] hover:text-[#E6275A] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Founder
                  </button>
                </div>
                
                {formData.founders.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                    <p className="text-sm text-gray-500">
                      No founders added yet. You can add founders later in the Founders section.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.founders.map((founder) => (
                      <div
                        key={founder.id}
                        className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white font-medium flex-shrink-0">
                          {founder.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {founder.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {founder.role} • {founder.email}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEditFounder(founder)}
                          className="p-2 text-[#FF2B5E] hover:bg-[#FF2B5E]/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFounder(founder.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
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
                {incubatee ? 'Update' : 'Add'} Incubatee
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Founder Form Modal */}
      {showFounderForm && (
        <FounderForm
          founder={editingFounder}
          allFounders={allFounders}
          onSave={handleAddFounder}
          onClose={() => {
            setShowFounderForm(false);
            setEditingFounder(null);
          }}
        />
      )}
    </>
  );
}

// Founder Form Component
interface FounderFormProps {
  founder: Founder | null;
  allFounders: Founder[];
  onSave: (founder: Founder) => void;
  onClose: () => void;
}

function FounderForm({ founder, allFounders, onSave, onClose }: FounderFormProps) {
  const [mode, setMode] = useState<'new' | 'existing'>(founder ? 'new' : 'new');
  const [selectedFounderId, setSelectedFounderId] = useState('');
  const [formData, setFormData] = useState<Founder>({
    id: founder?.id || `founder_${Date.now()}`,
    name: founder?.name || '',
    email: founder?.email || '',
    phone: founder?.phone || '',
    role: founder?.role || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'existing' && selectedFounderId) {
      const selectedFounder = allFounders.find(f => f.id === selectedFounderId);
      if (selectedFounder) {
        onSave(selectedFounder);
      }
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {founder ? 'Edit Founder' : 'Add Founder'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Mode Toggle - only show when not editing and there are unassigned founders */}
            {!founder && allFounders.length > 0 && (
              <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === 'new'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Create New
                </button>
                <button
                  type="button"
                  onClick={() => setMode('existing')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === 'existing'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Select Existing
                </button>
              </div>
            )}

            {/* Select Existing Founder */}
            {mode === 'existing' && allFounders.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Founder *
                </label>
                <select
                  required
                  value={selectedFounderId}
                  onChange={(e) => setSelectedFounderId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                >
                  <option value="">Choose a founder...</option>
                  {allFounders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} - {f.role}
                    </option>
                  ))}
                </select>
                
                {/* Preview Selected Founder */}
                {selectedFounderId && (
                  <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    {(() => {
                      const selected = allFounders.find(f => f.id === selectedFounderId);
                      return selected ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white font-medium flex-shrink-0">
                            {selected.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {selected.name}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {selected.role} • {selected.email}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {selected.phone}
                            </p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Create New Founder Form */}
            {mode === 'new' && (
              <>
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
                    Role / Position *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                    placeholder="e.g., CEO, CTO, Co-Founder"
                  />
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
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
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
              {founder ? 'Update' : 'Add'} Founder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}