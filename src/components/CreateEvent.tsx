import { ArrowLeft, X } from 'lucide-react';
import { useState } from 'react';
import type { Contact, Event } from '../types';

interface CreateEventProps {
  contacts: Contact[];
  onClose: () => void;
  onSave: (event: Event) => void;
}

export function CreateEvent({ contacts, onClose, onSave }: CreateEventProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
  });

  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only contacted people
  const contactedPeople = contacts.filter((c) => c.status === 'Contacted');

  const filteredContacts = contactedPeople.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAttendee = (contactId: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const attendees = contactedPeople.filter((c) =>
      selectedAttendees.includes(c.id)
    );

    const newEvent: Event = {
      id: Date.now().toString(),
      ...formData,
      attendees,
    };

    onSave(newEvent);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[#FF2B5E] hover:bg-pink-50 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Create Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column - Event Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                  Event Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                      required
                      placeholder="e.g., Alumni Networking Night"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent resize-none"
                      required
                      placeholder="Brief description of the event..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleChange('time', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                      required
                      placeholder="e.g., Grand Ballroom, Marian Hall"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Add Attendees */}
            <div className="space-y-6">
              <div>
                <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                  Add Attendees ({selectedAttendees.length} selected)
                </h3>

                {/* Search */}
                <input
                  type="text"
                  placeholder="Search contacted people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent mb-4"
                />

                {/* Attendees List */}
                <div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto">
                  {filteredContacts.length > 0 ? (
                    <div className="space-y-2">
                      {filteredContacts.map((contact) => (
                        <label
                          key={contact.id}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-[#FF2B5E] cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAttendees.includes(contact.id)}
                            onChange={() => toggleAttendee(contact.id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] focus:ring-[#FF2B5E]"
                          />
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-sm">
                              {contact.firstName.charAt(0)}
                              {contact.lastName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {contact.name}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {contact.email}
                              </p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">
                        {contactedPeople.length === 0
                          ? 'No contacted people available'
                          : 'No contacts found'}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Only contacted people can be added to events
                </p>
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
            type="submit"
            className="px-6 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
          >
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
}
