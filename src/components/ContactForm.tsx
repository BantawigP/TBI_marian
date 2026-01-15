import { ArrowLeft, X } from 'lucide-react';
import { useState } from 'react';
import type { Contact, ContactStatus } from '../types';

interface ContactFormProps {
  contact?: Contact | null;
  onClose: () => void;
  onSave: (contact: Contact) => void;
}

export function ContactForm({ contact, onClose, onSave }: ContactFormProps) {
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
    status: contact?.status || 'Pending',
  });

  const handleChange = (field: keyof Contact, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized: Contact = {
      ...formData,
      id: formData.id || Date.now().toString(),
      name: `${formData.firstName} ${formData.lastName}`.trim(),
    };

    onSave(normalized);
  };

  const isEditMode = !!contact;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[#FF2B5E] hover:bg-pink-50 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Contact' : 'New Contact'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Contact Info Section */}
            <div>
              <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                Contact Info
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#FF2B5E] mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
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
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#FF2B5E] mb-2">
                    College
                  </label>
                  <input
                    type="text"
                    value={formData.college}
                    onChange={(e) => handleChange('college', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#FF2B5E] mb-2">
                    Program
                  </label>
                  <input
                    type="text"
                    value={formData.program}
                    onChange={(e) => handleChange('program', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#FF2B5E] mb-2">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) => handleChange('contactNumber', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                    required
                  />
                </div>

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
                    Date Graduated
                  </label>
                  <input
                    type="date"
                    value={formData.dateGraduated}
                    onChange={(e) => handleChange('dateGraduated', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#FF2B5E] mb-2">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => handleChange('occupation', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#FF2B5E] mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#FF2B5E] mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value as ContactStatus)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Contacted">Contacted</option>
                  </select>
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
