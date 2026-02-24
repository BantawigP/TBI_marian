import { X, Plus, Loader2, ChevronDown } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import type { Contact, ContactStatus, AlumniType } from '../types';
import { supabase } from '../lib/supabaseClient';

interface ContactFormProps {
  contact?: Contact | null;
  existingContacts: Contact[];
  onClose: () => void;
  onSave: (contact: Contact) => void | Promise<void>;
}

type DimensionKey = 'college' | 'program' | 'company' | 'address' | 'occupation';

interface DimensionOption {
  id: number;
  label: string;
}

const dimensionConfig: Record<DimensionKey, { table: string; id: string; name: string }> = {
  college: { table: 'colleges', id: 'college_id', name: 'college_name' },
  program: { table: 'programs', id: 'program_id', name: 'program_name' },
  company: { table: 'companies', id: 'company_id', name: 'company_name' },
  address: { table: 'locations', id: 'location_id', name: 'name' },
  occupation: { table: 'occupations', id: 'occupation_id', name: 'occupation_title' },
};

const FALLBACK_ALUMNI_TYPES = [
  { id: 1, name: 'Graduate',         slug: 'graduate' as AlumniType },
  { id: 2, name: 'MARIAN Graduate',  slug: 'marian_graduate' as AlumniType },
];

export function ContactForm({ contact, existingContacts, onClose, onSave }: ContactFormProps) {
  const [formData, setFormData] = useState<Contact>({
    id: contact?.id || '',
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    name: contact?.name || '',
    college: contact?.college || '',
    program: contact?.program || '',
    contactNumber: contact?.contactNumber || '',
    email: contact?.email || '',
    dateGraduated: contact?.dateGraduated || '',
    occupation: contact?.occupation || '',
    company: contact?.company || '',
    address: contact?.address || '',
    status: contact?.status || 'Unverified',
    alumniType: contact?.alumniType ?? undefined,
  });
  const [autoGenerateId, setAutoGenerateId] = useState(!contact?.id);
  const [error, setError] = useState('');
  const [referenceError, setReferenceError] = useState('');
  const alumniTypeOptions = FALLBACK_ALUMNI_TYPES;
  const [dimensionOptions, setDimensionOptions] = useState<
    Record<DimensionKey, DimensionOption[]>
  >({
    college: [],
    program: [],
    company: [],
    address: [],
    occupation: [],
  });
  const [addingKey, setAddingKey] = useState<DimensionKey | null>(null);
  const [openDropdown, setOpenDropdown] = useState<DimensionKey | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const justSelectedRef = useRef(false);

  const handleChange = (field: keyof Contact, value: string) => {
    setFormData((prev) => {
      const next: Contact = { ...prev, [field]: value };

      if (field === 'firstName' || field === 'lastName') {
        const nextFirst = field === 'firstName' ? value : next.firstName;
        const nextLast = field === 'lastName' ? value : next.lastName;
        next.name = `${nextFirst} ${nextLast}`.trim();
      }

      return next;
    });
  };

  const loadReferenceData = async () => {
    setReferenceError('');

    // alumni_types are static (Graduate / Marian Graduate) — no DB fetch needed,
    // FALLBACK_ALUMNI_TYPES is used directly as the initial state.

    try {
      const keys = Object.keys(dimensionConfig) as DimensionKey[];
      const results = await Promise.all(
        keys.map(async (key) => {
          const cfg = dimensionConfig[key];
          const { data, error } = await supabase
            .from(cfg.table)
            .select(`${cfg.id},${cfg.name}`)
            .order(cfg.name, { ascending: true });

          if (error) throw error;

          const normalized: DimensionOption[] = (data ?? [])
            .filter((row: Record<string, any>) => row?.[cfg.name])
            .map((row: Record<string, any>) => ({ id: row[cfg.id], label: row[cfg.name] }));

          return [key, normalized] as const;
        })
      );

      const next: Record<DimensionKey, DimensionOption[]> = {
        college: [],
        program: [],
        company: [],
        address: [],
        occupation: [],
      };

      results.forEach(([key, options]) => {
        next[key] = options;
      });

      setDimensionOptions(next);
    } catch (err) {
      console.error('Failed to load reference data', err);
      setReferenceError('Some dropdown data failed to load. You can still add new entries.');
    } finally {
      // done
    }
  };

  useEffect(() => {
    loadReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const handleAddDimension = async (key: DimensionKey, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const existing = dimensionOptions[key].find(
      (opt) => opt.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      handleChange(key, existing.label);
      return;
    }

    const cfg = dimensionConfig[key];
    setAddingKey(key);
    setReferenceError('');

    try {
      const { data, error } = await supabase
        .from(cfg.table)
        .upsert({ [cfg.name]: trimmed }, { onConflict: cfg.name })
        .select(`${cfg.id},${cfg.name}`)
        .single();

      if (error) throw error;

      const newOption: DimensionOption = {
        id: (data as Record<string, any>)?.[cfg.id] ?? Date.now(),
        label: (data as Record<string, any>)?.[cfg.name] ?? trimmed,
      };

      setDimensionOptions((prev) => ({
        ...prev,
        [key]: [...prev[key], newOption].sort((a, b) => a.label.localeCompare(b.label)),
      }));

      handleChange(key, newOption.label);
    } catch (err) {
      console.error('Failed to add new entry', err);
      setReferenceError('Unable to add entry right now. Please try again.');
    } finally {
      setAddingKey(null);
    }
  };

  const renderSuggestionField = (
    key: DimensionKey,
    label: string,
    placeholder: string,
    required?: boolean,
    showAdd: boolean = true
  ) => {
    const value = (formData as unknown as Record<string, string | undefined>)[key] ?? '';
    const trimmed = value.trim();
    const normalizedValue = trimmed.toLowerCase();
    const isDropdownOpen = openDropdown === key;
    const filteredOptions = dimensionOptions[key].filter((opt) =>
      opt.label.toLowerCase().includes(normalizedValue)
    );
    const canAdd = Boolean(trimmed) &&
      !dimensionOptions[key].some((opt) => opt.label.toLowerCase() === normalizedValue);

    // Show dropdown list only when explicitly opened
    const showList = isDropdownOpen;
    const displayOptions = trimmed
      ? filteredOptions
      : dimensionOptions[key];

    return (
      <div ref={(el) => { dropdownRefs.current[key] = el; }} className="relative">
        <label className="block text-sm text-[#FF2B5E] mb-2">{label}</label>
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  handleChange(key, e.target.value);
                  setOpenDropdown(key);
                }}
                onFocus={() => {
                  if (!justSelectedRef.current) {
                    setOpenDropdown(key);
                  }
                  justSelectedRef.current = false;
                }}
                placeholder={placeholder}
                className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                required={required}
              />
              <button
                type="button"
                onClick={() => setOpenDropdown(isDropdownOpen ? null : key)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#FF2B5E] hover:bg-gray-100 rounded transition-colors"
                title={`Select ${label.toLowerCase()}`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            {showList && displayOptions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                {displayOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      handleChange(key, opt.label);
                      justSelectedRef.current = true;
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#FF2B5E]/10 transition-colors border-b border-gray-100 last:border-b-0 text-sm text-gray-700 hover:text-[#FF2B5E]"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {showAdd && canAdd && (
            <button
              type="button"
              onClick={() => handleAddDimension(key, trimmed)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 hover:bg-gray-50 whitespace-nowrap"
            >
              {addingKey === key ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedId = autoGenerateId || !formData.id.trim() ? Date.now().toString() : formData.id.trim();

    const normalized: Contact = {
      ...formData,
      id: resolvedId,
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      dateGraduated: formData.dateGraduated || '',
      address: formData.address?.trim() || '',
    };

    const duplicateId = existingContacts.find(
      (c) => c.id === normalized.id && c.id !== contact?.id
    );
    const duplicateEmail = existingContacts.find(
      (c) => c.email.toLowerCase() === normalized.email.toLowerCase() && c.id !== contact?.id
    );

    if (duplicateId) {
      setError('ID already exists. Please use a unique ID or enable auto-generate.');
      return;
    }

    if (duplicateEmail) {
      setError('Email already exists. Please use a unique email.');
      return;
    }

    setError('');
    try {
      await onSave(normalized);
    } catch (err) {
      console.error('Failed to save contact', err);
      setError('Unable to save contact right now. Please try again.');
    }
  };

  const isEditMode = !!contact;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div />
          <h2 className="text-xl font-semibold text-gray-900 text-center flex-1">
            {isEditMode ? 'Edit Contact' : 'New Contact'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Contact Info Section */}
            <div>
              <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                Contact Info
              </h3>
              
              {referenceError && (
                <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-4 py-3 text-sm mb-3">
                  {referenceError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#FF2B5E] mb-2">Alumni ID</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      type="text"
                      value={formData.id}
                      onChange={(e) => !autoGenerateId && handleChange('id', e.target.value)}
                      disabled={autoGenerateId}
                      placeholder="Enter ID or auto-generate"
                      className="flex-1 min-w-[200px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent disabled:opacity-70"
                      required={!autoGenerateId}
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoGenerateId}
                        onChange={(e) => setAutoGenerateId(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] focus:ring-[#FF2B5E]"
                      />
                      Auto-generate ID
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value.replace(/[0-9]/g, ''))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value.replace(/[0-9]/g, ''))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Contact Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+63</span>
                      <input
                        type="tel"
                        value={(formData.contactNumber || '').replace(/^\+63\s?/, '')}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          handleChange('contactNumber', digits ? `+63${digits}` : '');
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                        placeholder="9XX XXX XXXX"
                        maxLength={12}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value as ContactStatus)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                    >
                      <option value="Verified">Verified</option>
                      <option value="Unverified">Unverified</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Alumni Type
                    </label>
                    <div className="flex gap-6 pt-3">
                      {alumniTypeOptions.map((opt) => (
                        <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="alumniType"
                            value={opt.slug}
                            checked={formData.alumniType === opt.slug}
                            onChange={() =>
                              setFormData((prev) => ({ ...prev, alumniType: opt.slug }))
                            }
                            className="w-4 h-4 text-[#FF2B5E] focus:ring-[#FF2B5E]"
                          />
                          <span className="text-sm text-gray-700">{opt.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {renderSuggestionField('college', 'College', 'Select a college', true, false)}
                {renderSuggestionField('program', 'Program', 'Select a program', true, false)}
                {renderSuggestionField('company', 'Company Name', 'Select a company', false, false)}
                {renderSuggestionField('address', 'Address / Location', 'Select an address', false, false)}
                {renderSuggestionField('occupation', 'Occupation', 'Select an occupation', false, false)}

                <div>
                  <label className="block text-sm text-[#FF2B5E] mb-2">
                    Date Graduated (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.dateGraduated}
                    onChange={(e) => handleChange('dateGraduated', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
          >
            {isEditMode ? 'Update Contact' : 'Create Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}
