import { Users, Calendar, RotateCcw, Trash2, AlertCircle, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import type { Contact, Event, TeamMember } from '../types';
import type { Incubatee, Founder } from './IncubateeTable';
import { PopupDialog } from './PopupDialog';

interface ArchivesProps {
  archivedContacts: Contact[];
  archivedEvents: Event[];
  archivedTeamMembers: TeamMember[];
  archivedIncubatees: Incubatee[];
  archivedFounders: (Founder & { startupName: string })[];
  onRestoreContact: (contact: Contact) => void;
  onRestoreEvent: (event: Event) => void;
  onPermanentDeleteContact: (contactId: string) => void;
  onPermanentDeleteEvent: (eventId: string) => void | Promise<void>;
  onRestoreTeamMember: (member: TeamMember) => void | Promise<void>;
  onPermanentDeleteTeamMember: (memberId: string) => void | Promise<void>;
  onRestoreIncubatee: (incubatee: Incubatee) => void | Promise<void>;
  onPermanentDeleteIncubatee: (id: string) => void | Promise<void>;
  onDeleteArchivedFounder: (founderId: string) => void;
  onRemoveFounderFromIncubatee: (incubateeId: string, founderId: string) => void;
  onRestoreFounder: (founder: Founder, incubateeId: string | null) => void | Promise<void>;
}

export function Archives({
  archivedContacts,
  archivedEvents,
  archivedTeamMembers,
  archivedIncubatees,
  archivedFounders: orphanedFounders,
  onRestoreContact,
  onRestoreEvent,
  onPermanentDeleteContact,
  onPermanentDeleteEvent,
  onRestoreTeamMember,
  onPermanentDeleteTeamMember,
  onRestoreIncubatee,
  onPermanentDeleteIncubatee,
  onDeleteArchivedFounder,
  onRemoveFounderFromIncubatee,
  onRestoreFounder,
}: ArchivesProps) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'events' | 'team' | 'incubatees'>('contacts');
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'primary' | 'danger' | 'neutral' | 'success';
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const openConfirm = (config: Omit<NonNullable<typeof dialog>, 'onConfirm' | 'onCancel'>) =>
    new Promise<boolean>((resolve) => {
      setDialog({
        ...config,
        cancelLabel: config.cancelLabel ?? 'Cancel',
        confirmLabel: config.confirmLabel ?? 'Confirm',
        onConfirm: () => {
          resolve(true);
          setDialog(null);
        },
        onCancel: () => {
          resolve(false);
          setDialog(null);
        },
      });
    });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleRestoreContact = async (contact: Contact) => {
    const confirmed = await openConfirm({
      title: 'Restore contact',
      message: `Restore ${contact.lastName}, ${contact.firstName}?`,
      tone: 'primary',
    });
    if (confirmed) {
      onRestoreContact(contact);
    }
  };

  const handleRestoreEvent = async (event: Event) => {
    const confirmed = await openConfirm({
      title: 'Restore event',
      message: `Restore event "${event.title}"?`,
      tone: 'primary',
    });
    if (confirmed) {
      onRestoreEvent(event);
    }
  };

  const handlePermanentDeleteContact = async (contactId: string, contactName: string) => {
    const confirmed = await openConfirm({
      title: 'Permanently delete contact',
      message: `Permanently delete ${contactName}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) {
      onPermanentDeleteContact(contactId);
    }
  };

  const handlePermanentDeleteEvent = async (eventId: string, eventTitle: string) => {
    const confirmed = await openConfirm({
      title: 'Permanently delete event',
      message: `Permanently delete "${eventTitle}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) {
      onPermanentDeleteEvent(eventId);
    }
  };

  const handleRestoreTeamMember = async (member: TeamMember) => {
    const confirmed = await openConfirm({
      title: 'Restore team member',
      message: `Restore ${member.lastName}, ${member.firstName}?`,
      tone: 'primary',
    });
    if (confirmed) {
      onRestoreTeamMember(member);
    }
  };

  const handlePermanentDeleteTeamMember = async (memberId: string, memberName: string) => {
    const confirmed = await openConfirm({
      title: 'Permanently delete team member',
      message: `Permanently delete ${memberName}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) {
      onPermanentDeleteTeamMember(memberId);
    }
  };

  const handleRestoreIncubatee = async (incubatee: Incubatee) => {
    const confirmed = await openConfirm({
      title: 'Restore incubatee',
      message: `Restore "${incubatee.startupName}" and its founders?`,
      tone: 'primary',
    });
    if (confirmed) {
      onRestoreIncubatee(incubatee);
    }
  };

  const handlePermanentDeleteIncubatee = async (id: string, name: string) => {
    const confirmed = await openConfirm({
      title: 'Permanently delete incubatee',
      message: `Permanently delete "${name}"? Its founders will be preserved. This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) {
      onPermanentDeleteIncubatee(id);
    }
  };

  const handlePermanentDeleteFounder = async (founder: typeof allArchivedFounders[number]) => {
    const confirmed = await openConfirm({
      title: 'Delete founder',
      message: `Permanently delete "${founder.name}"? The startup will not be affected.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) {
      if (founder.incubateeId === 'deleted') {
        onDeleteArchivedFounder(founder.id);
      } else {
        onRemoveFounderFromIncubatee(founder.incubateeId, founder.id);
      }
    }
  };

  const handleRestoreFounder = async (founder: typeof allArchivedFounders[number]) => {
    const confirmed = await openConfirm({
      title: 'Restore founder',
      message: `Restore "${founder.name}"?`,
      tone: 'primary',
    });
    if (confirmed) {
      const incId = founder.incubateeId === 'deleted' ? null : founder.incubateeId;
      const { startupName: _s, incubateeId: _i, ...founderOnly } = founder;
      onRestoreFounder(founderOnly, incId);
      if (founder.incubateeId === 'deleted') {
        onDeleteArchivedFounder(founder.id);
      }
    }
  };

  // Gather all founders: from archived incubatees + orphaned founders from deleted startups
  const incubateeFounders = archivedIncubatees.flatMap((inc) =>
    inc.founders.map((f) => ({ ...f, startupName: inc.startupName, incubateeId: inc.id }))
  );
  const allArchivedFounders = [
    ...incubateeFounders,
    ...orphanedFounders.map((f) => ({ ...f, incubateeId: 'deleted' as string })),
  ];

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

      {/* Summary Cards (Clickable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          className={`text-left rounded-xl p-6 border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2B5E] ${
            activeTab === 'contacts'
              ? 'bg-white border-[#FF2B5E]/40 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
          aria-pressed={activeTab === 'contacts'}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FF2B5E]/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-[#FF2B5E]" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {archivedContacts.length}
            </h3>
          </div>
          <p className="text-sm text-gray-600">Archived Contacts</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`text-left rounded-xl p-6 border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2B5E] ${
            activeTab === 'events'
              ? 'bg-white border-[#FF2B5E]/40 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
          aria-pressed={activeTab === 'events'}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {archivedEvents.length}
            </h3>
          </div>
          <p className="text-sm text-gray-600">Archived Events</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={`text-left rounded-xl p-6 border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2B5E] ${
            activeTab === 'team'
              ? 'bg-white border-[#FF2B5E]/40 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
          aria-pressed={activeTab === 'team'}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-700" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {archivedTeamMembers.length}
            </h3>
          </div>
          <p className="text-sm text-gray-600">Archived Users</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('incubatees')}
          className={`text-left rounded-xl p-6 border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2B5E] ${
            activeTab === 'incubatees'
              ? 'bg-white border-[#FF2B5E]/40 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
          aria-pressed={activeTab === 'incubatees'}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {archivedIncubatees.length}
            </h3>
          </div>
          <p className="text-sm text-gray-600">Archived Incubatees</p>
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
                              contact.status === 'Verified'
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
                                handlePermanentDeleteContact(contact.id, `${contact.lastName}, ${contact.firstName}`)
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
      ) : activeTab === 'events' ? (
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
      ) : activeTab === 'team' ? (
        <div>
          {archivedTeamMembers.length > 0 ? (
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
                        Role
                      </th>
                      <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                        Department
                      </th>
                      <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                        Joined
                      </th>
                      <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedTeamMembers.map((member, index) => (
                      <tr
                        key={member.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index === archivedTeamMembers.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-sm">
                              {member.firstName.charAt(0)}
                              {member.lastName.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">{member.email}</td>
                        <td className="p-4 text-gray-600">{member.role}</td>
                        <td className="p-4 text-gray-600">{member.department || '—'}</td>
                        <td className="p-4 text-gray-600">{member.joinedDate || '—'}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRestoreTeamMember(member)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Restore user"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handlePermanentDeleteTeamMember(member.id, `${member.lastName}, ${member.firstName}`)
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
                No Archived Users
              </h3>
              <p className="text-gray-600">
                Deleted team members will appear here.
              </p>
            </div>
          )}
        </div>
      ) : activeTab === 'incubatees' ? (
        <div className="space-y-8">
          {/* Startups Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[#FF2B5E]" />
              Startups ({archivedIncubatees.length})
            </h2>
            {archivedIncubatees.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                          Startup Name
                        </th>
                        <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                          Cohort
                        </th>
                        <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                          Founders
                        </th>
                        <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivedIncubatees.map((inc, index) => (
                        <tr
                          key={inc.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index === archivedIncubatees.length - 1 ? 'border-b-0' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#FF2B5E]/10 flex items-center justify-center">
                                <Lightbulb className="w-4 h-4 text-[#FF2B5E]" />
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">
                                  {inc.startupName}
                                </span>
                                <p className="text-xs text-gray-500 truncate max-w-xs">
                                  {inc.startupDescription}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FF2B5E]/10 text-[#FF2B5E]">
                              {inc.cohortLevel.map((l) => `Cohort ${l}`).join(', ')}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              inc.status === 'Graduate' ? 'bg-green-100 text-green-700' :
                              inc.status === 'Incubatee' ? 'bg-blue-100 text-blue-700' :
                              inc.status === 'Undergraduate' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {inc.status}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {inc.founders.length} founder{inc.founders.length !== 1 ? 's' : ''}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRestoreIncubatee(inc)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Restore incubatee"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePermanentDeleteIncubatee(inc.id, inc.startupName)}
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
                <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Archived Startups
                </h3>
                <p className="text-gray-600">
                  Deleted startups will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Founders Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#FF2B5E]" />
              Founders ({allArchivedFounders.length})
            </h2>
            {allArchivedFounders.length > 0 ? (
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
                          Phone
                        </th>
                        <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                          Role
                        </th>
                        <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                          Startup
                        </th>
                        <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allArchivedFounders.map((founder, index) => (
                        <tr
                          key={`${founder.incubateeId}-${founder.id}`}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index === allArchivedFounders.length - 1 ? 'border-b-0' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-sm">
                                {founder.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900">
                                {founder.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-gray-600 text-sm">{founder.email}</td>
                          <td className="p-4 text-gray-600 text-sm">{founder.phone}</td>
                          <td className="p-4 text-gray-600 text-sm">{(founder.roles ?? []).join(', ') || '—'}</td>
                          <td className="p-4 text-gray-600 text-sm">
                            {founder.startupName}
                            {founder.incubateeId === 'deleted' && (
                              <span className="ml-1 text-xs text-gray-400">(deleted)</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRestoreFounder(founder)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Restore founder"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePermanentDeleteFounder(founder)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Permanently delete founder"
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
                  No Archived Founders
                </h3>
                <p className="text-gray-600">
                  Founders from deleted startups will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
      <PopupDialog
        open={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        tone={dialog?.tone}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />
    </div>
  );
}
