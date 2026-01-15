import { Users, Calendar, RotateCcw, Trash2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { Contact, Event } from '../types';

interface ArchivesProps {
  archivedContacts: Contact[];
  archivedEvents: Event[];
  onRestoreContact: (contact: Contact) => void;
  onRestoreEvent: (event: Event) => void;
  onPermanentDeleteContact: (contactId: string) => void;
  onPermanentDeleteEvent: (eventId: string) => void;
}

export function Archives({
  archivedContacts,
  archivedEvents,
  onRestoreContact,
  onRestoreEvent,
  onPermanentDeleteContact,
  onPermanentDeleteEvent,
}: ArchivesProps) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'events'>('contacts');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleRestoreContact = (contact: Contact) => {
    if (confirm(`Restore ${contact.name}?`)) {
      onRestoreContact(contact);
    }
  };

  const handleRestoreEvent = (event: Event) => {
    if (confirm(`Restore event "${event.title}"?`)) {
      onRestoreEvent(event);
    }
  };

  const handlePermanentDeleteContact = (contactId: string, contactName: string) => {
    if (
      confirm(
        `Permanently delete ${contactName}? This action cannot be undone.`
      )
    ) {
      onPermanentDeleteContact(contactId);
    }
  };

  const handlePermanentDeleteEvent = (eventId: string, eventTitle: string) => {
    if (
      confirm(
        `Permanently delete "${eventTitle}"? This action cannot be undone.`
      )
    ) {
      onPermanentDeleteEvent(eventId);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Archives</h1>
        <p className="text-gray-600">
          View and restore deleted contacts and events
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">About Archives</p>
            <p className="text-blue-800">
              Deleted items are moved to archives. You can restore them or permanently delete them from here.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FF2B5E]/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-[#FF2B5E]" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {archivedContacts.length}
            </h3>
          </div>
          <p className="text-sm text-gray-600">Archived Contacts</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {archivedEvents.length}
            </h3>
          </div>
          <p className="text-sm text-gray-600">Archived Events</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'contacts'
              ? 'text-[#FF2B5E] border-b-2 border-[#FF2B5E]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Contacts ({archivedContacts.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'events'
              ? 'text-[#FF2B5E] border-b-2 border-[#FF2B5E]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Events ({archivedEvents.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'contacts' ? (
        <div>
          {archivedContacts.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                        Name
                      </th>
                      <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                        Email
                      </th>
                      <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                        College
                      </th>
                      <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                        Program
                      </th>
                      <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedContacts.map((contact, index) => (
                      <tr
                        key={contact.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index === archivedContacts.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-sm">
                              {contact.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">
                              {contact.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">{contact.email}</td>
                        <td className="p-4 text-gray-600">{contact.college}</td>
                        <td className="p-4 text-gray-600">{contact.program}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              contact.status === 'Contacted'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {contact.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRestoreContact(contact)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Restore contact"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handlePermanentDeleteContact(contact.id, contact.name)
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Permanently delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Archived Contacts
              </h3>
              <p className="text-gray-600">
                Deleted contacts will appear here.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {archivedEvents.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {archivedEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-xl border border-gray-200 p-6"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {event.description}
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#FF2B5E]" />
                        {formatDate(event.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#FF2B5E]" />
                        {event.attendees.length} attendee
                        {event.attendees.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleRestoreEvent(event)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </button>
                    <button
                      onClick={() =>
                        handlePermanentDeleteEvent(event.id, event.title)
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Archived Events
              </h3>
              <p className="text-gray-600">
                Deleted events will appear here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
