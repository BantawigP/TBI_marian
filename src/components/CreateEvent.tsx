import { X, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Contact, Event } from '../types';
import { createEvent } from '../lib/eventService';

interface CreateEventProps {
  contacts: Contact[];
  onClose: () => void;
  onSave: (event: Event) => void;
}

const PREDEFINED_EVENT_TITLES = [
  'Official Commencement & Enrollment',
  'Legal Execution (NDA & Incubation)',
  'Initial Needs & Baseline Assessment',
  'Info Session on Pitching',
  'Pitching Simulation',
  'Acceptance & Orientation',
  'BMC Workshop',
  'Mentorship & Technical Assistance',
  'Capacity-Building Workshops',
  'Business Planning Workshop',
  'Financial Management Workshop',
  'Digital Marketing',
  'Effective Communication & Negotiation on Startups Workshop',
  'info Session on DTI/Sec Registration/Business Registration',
  'IP Orientation, IP Search, IP Drafting',
  'Monthly Progress Reporting',
  'Market Validation & Stakeholder Engagement',
  'Refinement of MVP & Business Model',
  'Final Milestone Review & Evaluation',
  'Final Pitch to Evaluators & Mentors',
  'Official Graduation & Certification',
];

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const titleDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (titleDropdownRef.current && !titleDropdownRef.current.contains(event.target as Node)) {
        setShowTitleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  console.log('CreateEvent - Available contacts:', contacts.map(c => ({
    id: c.id,
    name: c.name,
    alumniId: c.alumniId,
    status: c.status
  })));

  // Filter only verified people
  const contactedPeople = contacts.filter((c) => c.status === 'Verified');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const attendees = contactedPeople
        .filter((c) => selectedAttendees.includes(c.id))
        .map((c) => ({ ...c, rsvpStatus: 'pending' as const }));

      console.log('CreateEvent - Selected attendees:', attendees.map(a => ({ 
        id: a.id, 
        name: a.name, 
        alumniId: a.alumniId 
      })));

      // Call the database function to create the event
      const createdEvent = await createEvent(formData, attendees);
      
      console.log('CreateEvent - Received event from createEvent:', {
        id: createdEvent.id,
        title: createdEvent.title,
        attendeeCount: createdEvent.attendees.length,
        attendees: createdEvent.attendees.map(a => ({ id: a.id, name: a.name }))
      });

      // Call the parent's onSave callback with the created event
      onSave(createdEvent);
      
      // Close the modal after successful creation
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      console.error('Event creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div />
          <h2 className="text-xl font-semibold text-gray-900">Create Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column - Event Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                  Event Details
                </h3>

                <div className="space-y-4">
                  <div ref={titleDropdownRef} className="relative">
                    <label className="block text-sm text-[#FF2B5E] mb-2">
                      Event Title
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                        required
                        placeholder="e.g., Alumni Networking Night"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTitleDropdown(!showTitleDropdown)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#FF2B5E] hover:bg-gray-100 rounded transition-colors"
                        title="Select from predefined titles"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Dropdown Menu */}
                    {showTitleDropdown && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {PREDEFINED_EVENT_TITLES.map((title, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              handleChange('title', title);
                              setShowTitleDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-[#FF2B5E]/10 transition-colors border-b border-gray-100 last:border-b-0 text-sm text-gray-700 hover:text-[#FF2B5E]"
                          >
                            {title}
                          </button>
                        ))}
                      </div>
                    )}
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
