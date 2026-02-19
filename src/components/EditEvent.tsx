import { useState } from 'react';
import { X, Calendar, MapPin, Clock, Users } from 'lucide-react';
import type { Event, Contact } from '../types';

interface EditEventProps {
  event: Event;
  contacts: Contact[];
  onClose: () => void;
  onSave: (eventId: string, eventData: Omit<Event, 'id' | 'attendees'>, attendees: Contact[]) => void;
}

export function EditEvent({ event, contacts, onClose, onSave }: EditEventProps) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [date, setDate] = useState(event.date);
  const [time, setTime] = useState(event.time);
  const [location, setLocation] = useState(event.location);
  const [selectedAttendees, setSelectedAttendees] = useState<Contact[]>(event.attendees);
  const [searchQuery, setSearchQuery] = useState('');

  const availableContacts = contacts.filter(
    (contact) => !selectedAttendees.some((attendee) => attendee.id === contact.id)
  );

  const filteredContacts = availableContacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderVerificationBadge = (status: Contact['status']) => {
    const isVerified = status === 'Verified';
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
          isVerified
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
        }`}
      >
        {status}
      </span>
    );
  };

  const handleAddAttendee = (contact: Contact) => {
    setSelectedAttendees([...selectedAttendees, { ...contact, rsvpStatus: 'pending' }]);
    setSearchQuery('');
  };

  const handleRemoveAttendee = (contactId: string) => {
    setSelectedAttendees(selectedAttendees.filter((c) => c.id !== contactId));
  };

  const toggleAvailableGroup = (contactsToToggle: Contact[]) => {
    const targetIds = contactsToToggle.map((contact) => contact.id);
    const allSelected = targetIds.every((id) =>
      selectedAttendees.some((attendee) => attendee.id === id)
    );

    if (allSelected) {
      setSelectedAttendees((prev) =>
        prev.filter((attendee) => !targetIds.includes(attendee.id))
      );
      return;
    }

    setSelectedAttendees((prev) => {
      const existingIds = new Set(prev.map((attendee) => attendee.id));
      const contactsToAdd = contactsToToggle
        .filter((contact) => !existingIds.has(contact.id))
        .map((contact) => ({ ...contact, rsvpStatus: 'pending' as const }));

      return [...prev, ...contactsToAdd];
    });
  };

  const selectAllAttendees = () => {
    toggleAvailableGroup(availableContacts);
  };

  const selectVerifiedAttendees = () => {
    toggleAvailableGroup(
      availableContacts.filter((contact) => contact.status === 'Verified')
    );
  };

  const selectUnverifiedAttendees = () => {
    toggleAvailableGroup(
      availableContacts.filter((contact) => contact.status === 'Unverified')
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      event.id,
      {
        title,
        description,
        date,
        time,
        location,
      },
      selectedAttendees
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Edit Event</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E]"
              placeholder="Enter event title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] resize-none"
              rows={3}
              placeholder="Enter event description"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time *
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E]"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E]"
              placeholder="Enter event location"
              required
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Attendees ({selectedAttendees.length})
            </label>

            {/* Search contacts */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={selectAllAttendees}
                  className="px-3 py-1.5 text-xs bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={selectVerifiedAttendees}
                  className="px-3 py-1.5 text-xs bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Select Verified Only
                </button>
                <button
                  type="button"
                  onClick={selectUnverifiedAttendees}
                  className="px-3 py-1.5 text-xs bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Select Unverified Only
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E]"
                placeholder="Search contacts to add..."
              />
              {searchQuery && filteredContacts.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {filteredContacts.slice(0, 5).map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleAddAttendee(contact)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{contact.name}</div>
                          <div className="text-sm text-gray-500 truncate">{contact.email}</div>
                        </div>
                        <div className="shrink-0">
                          {renderVerificationBadge(contact.status)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected attendees */}
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {selectedAttendees.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No attendees added yet
                </div>
              ) : (
                selectedAttendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className="p-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{attendee.name}</div>
                      <div className="text-sm text-gray-500">{attendee.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(attendee.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
            >
              Update Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
