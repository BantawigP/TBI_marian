import { ArrowLeft, X, Calendar, Clock, MapPin, Users, Mail, UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { Contact, Event } from '../types';

interface ViewEventProps {
  event: Event;
  contacts: Contact[];
  onClose: () => void;
  onAddAttendees: (eventId: string, attendees: Contact[]) => void;
}

export function ViewEvent({ event, contacts, onClose, onAddAttendees }: ViewEventProps) {
  const [showAddAttendees, setShowAddAttendees] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Filter only contacted people who are not already attendees
  const contactedPeople = contacts.filter(
    (c) =>
      c.status === 'Contacted' &&
      !event.attendees.some((a) => a.id === c.id)
  );

  const filteredContacts = contactedPeople.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAttendee = (contactId: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleAddAttendees = () => {
    const newAttendees = contactedPeople.filter((c) =>
      selectedAttendees.includes(c.id)
    );
    console.log('🎯 ViewEvent - handleAddAttendees called:', {
      selectedIds: selectedAttendees,
      newAttendeesCount: newAttendees.length,
      newAttendees: newAttendees.map(a => ({ id: a.id, name: a.name, alumniId: a.alumniId }))
    });
    onAddAttendees(event.id, newAttendees);
    setShowAddAttendees(false);
    setSelectedAttendees([]);
    setSearchQuery('');
  };

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
          <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Event Info */}
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-4">
                {event.title}
              </h1>
              <p className="text-gray-600 mb-6">{event.description}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-10 h-10 bg-[#FF2B5E]/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#FF2B5E]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm font-medium">{formatDate(event.date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-10 h-10 bg-[#FF2B5E]/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#FF2B5E]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="text-sm font-medium">{formatTime(event.time)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-10 h-10 bg-[#FF2B5E]/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#FF2B5E]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-medium">{event.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendees Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#FF2B5E]" />
                  Attendees ({event.attendees.length})
                </h3>
                <button
                  onClick={() => setShowAddAttendees(!showAddAttendees)}
                  className="flex items-center gap-2 text-sm bg-[#FF2B5E] text-white px-4 py-2 rounded-lg hover:bg-[#E6275A] transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Attendees
                </button>
              </div>

              {/* Add Attendees Panel */}
              {showAddAttendees && (
                <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Select Contacts to Add
                  </h4>
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent mb-3"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-3">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact) => (
                        <label
                          key={contact.id}
                          className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200 hover:border-[#FF2B5E] cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAttendees.includes(contact.id)}
                            onChange={() => toggleAttendee(contact.id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] focus:ring-[#FF2B5E]"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-xs">
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
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No contacts available to add
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowAddAttendees(false);
                        setSelectedAttendees([]);
                        setSearchQuery('');
                      }}
                      className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        console.log('🔘 Add button clicked! Selected:', selectedAttendees.length);
                        handleAddAttendees();
                      }}
                      disabled={selectedAttendees.length === 0}
                      className="flex-1 px-4 py-2 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add ({selectedAttendees.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Attendees List */}
              <div className="space-y-3">
                {event.attendees.length > 0 ? (
                  event.attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white">
                        {attendee.firstName.charAt(0)}
                        {attendee.lastName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {attendee.firstName} {attendee.lastName}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {attendee.email}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No attendees yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
