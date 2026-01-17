import { useEffect, useState } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Home } from './components/Home';
import { Events } from './components/Events';
import { Archives } from './components/Archives';
import { CreateEvent } from './components/CreateEvent';
import { ViewEvent } from './components/ViewEvent';
import { ContactsTable } from './components/ContactsTable';
import { ContactForm } from './components/ContactForm';
import { ViewContact } from './components/ViewContact';
import { ImportContact } from './components/ImportContact';
import { ExportContact } from './components/ExportContact';
import { SearchBar } from './components/SearchBar';
import { Plus, Upload, Download, Trash2 } from 'lucide-react';
import type { Contact, ContactStatus, Event } from './types';
import { supabase } from './lib/supabaseClient';

// Mock contacts - these will be replaced by database contacts after login
const initialContacts: Contact[] = [];
const defaultStatus: ContactStatus = 'Contacted';

const numberOrNull = (value: string | number | undefined | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanPhone = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits || null;
};

const parseYearFromDate = (value?: string | null) => {
  if (!value) return null;
  const year = new Date(value).getFullYear();
  return Number.isFinite(year) ? year : null;
};

const ensureIdByName = async (
  table: string,
  nameColumn: string,
  idColumn: string,
  value?: string | null
): Promise<number | null> => {
  if (!value) return null;

  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select(idColumn)
    .eq(nameColumn, value)
    .maybeSingle();

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError;
  }

  if (existing && (existing as Record<string, any>)[idColumn] != null) {
    return (existing as Record<string, any>)[idColumn] as number;
  }

  const { data, error } = await supabase
    .from(table)
    .upsert({ [nameColumn]: value }, { onConflict: nameColumn })
    .select(idColumn)
    .single();

  if (error) {
    throw error;
  }

  return (data as Record<string, any> | null)?.[idColumn] ?? null;
};

const mapContactRowToContact = (row: Record<string, any>): Contact => {
  const firstName = row.f_name ?? row.F_name ?? row.first_name ?? row.firstName ?? '';
  const lastName = row.l_name ?? row.L_name ?? row.last_name ?? row.lastName ?? '';

  const collegeId = row.college_id ?? row.colleges?.college_id ?? null;
  const programId = row.program_id ?? row.programs?.program_id ?? null;
  const companyId = row.company_id ?? row.companies?.company_id ?? null;
  const occupationId = row.occupation_id ?? row.occupations?.occupation_id ?? null;

   return {
     id: (row.alumni_id ?? row.id ?? row.uuid)?.toString() || Date.now().toString(),
     alumniId: numberOrNull(row.alumni_id) || undefined,
    firstName,
    lastName,
    name: row.full_name ?? row.name ?? `${firstName} ${lastName}`.trim(),
    college: row.college ?? row.college_name ?? row.colleges?.college_name ?? '',
    program: row.program ?? row.program_name ?? row.programs?.program_name ?? '',
    email: row.email ?? '',
    status: (row.status ?? defaultStatus) as ContactStatus,
    contactNumber: row.contact_number
      ? row.contact_number.toString()
      : row.contactNumber ?? '',
    dateGraduated: row.date_graduated ?? '',
    occupation:
      row.occupation ?? row.occupation_title ?? row.occupations?.occupation_title ?? '',
    company: row.company ?? row.company_name ?? row.companies?.company_name ?? '',
    collegeId: collegeId ?? undefined,
    programId: programId ?? undefined,
    companyId: companyId ?? undefined,
    occupationId: occupationId ?? undefined,
  };
};

const mapEventRowToEvent = (row: Record<string, any>): Event => {
  const attendees = (row.event_participants ?? [])
    .map((participant: any) => {
      const alumni = participant.alumni ?? participant.alumni_id ?? participant.alumniRow;
      return alumni ? mapContactRowToContact(alumni) : null;
    })
    .filter(Boolean) as Contact[];

  const locationName =
    row.locations?.name ??
    row.location_name ??
    row.location ??
    (row.locations?.city
      ? `${row.locations.city}${row.locations.country ? `, ${row.locations.country}` : ''}`
      : '');

  return {
    id: (row.event_id ?? row.id)?.toString() ?? Date.now().toString(),
    title: row.title ?? '',
    description: row.description ?? '',
    date: row.event_date ?? row.date ?? '',
    time: row.event_time ?? row.time ?? '',
    location: locationName || 'TBD',
    locationId: row.location_id ?? row.locations?.location_id ?? undefined,
    attendees,
  };
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [archivedContacts, setArchivedContacts] = useState<Contact[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [graduatedFrom, setGraduatedFrom] = useState('');
  const [graduatedTo, setGraduatedTo] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchContactsFromSupabase = async (): Promise<Contact[]> => {
    const { data, error } = await supabase
      .from('alumni')
      .select(
        'alumni_id,f_name,l_name,year_graduated,email,contact_number,college_id,program_id,company_id,occupation_id,colleges(college_id,college_name),programs(program_id,program_name),companies(company_id,company_name),occupations(occupation_id,occupation_title)'
      );

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapContactRowToContact);
  };

  const fetchEventsFromSupabase = async (): Promise<Event[]> => {
    const { data, error } = await supabase
      .from('events')
      .select(
        'event_id,title,description,event_date,event_time,location_id,locations(location_id,name,city,country),event_participants(alumni:alumni_id(alumni_id,f_name,l_name,email,year_graduated,contact_number,college_id,program_id,company_id,occupation_id,colleges(college_id,college_name),programs(program_id,program_name),companies(company_id,company_name),occupations(occupation_id,occupation_title)))'
      );

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapEventRowToEvent);
  };

  const persistContactToSupabase = async (contact: Contact) => {
    const [collegeId, programId, companyId, occupationId] = await Promise.all([
      ensureIdByName('colleges', 'college_name', 'college_id', contact.college),
      ensureIdByName('programs', 'program_name', 'program_id', contact.program),
      ensureIdByName('companies', 'company_name', 'company_id', contact.company),
      ensureIdByName('occupations', 'occupation_title', 'occupation_id', contact.occupation),
    ]);

    const payload: Record<string, any> = {
      f_name: contact.firstName,
      l_name: contact.lastName,
      year_graduated: parseYearFromDate(contact.dateGraduated),
      email: contact.email,
      college_id: collegeId,
      program_id: programId,
      company_id: companyId,
      occupation_id: occupationId,
      contact_number: cleanPhone(contact.contactNumber),
    };

    const alumniId = numberOrNull(contact.id);
    if (alumniId) {
      payload.alumni_id = alumniId;
    }

    const { data, error } = await supabase
      .from('alumni')
      .upsert(payload, { onConflict: 'alumni_id' })
      .select(
        'alumni_id,f_name,l_name,year_graduated,email,contact_number,college_id,program_id,company_id,occupation_id,colleges(college_id,college_name),programs(program_id,program_name),companies(company_id,company_name),occupations(occupation_id,occupation_title)'
      )
      .single();

    if (error) {
      throw error;
    }

    return mapContactRowToContact(data);
  };

  const persistContactsBatch = async (items: Contact[]) => {
    const saved: Contact[] = [];
    for (const item of items) {
      const savedContact = await persistContactToSupabase(item);
      saved.push(savedContact);
    }
    return saved;
  };

  const persistEventToSupabase = async (event: Event) => {
    const locationId = await ensureIdByName('locations', 'name', 'location_id', event.location);

    const { data, error } = await supabase
      .from('events')
      .insert({
        title: event.title,
        description: event.description,
        event_date: event.date,
        event_time: event.time,
        location_id: locationId,
      })
      .select('event_id,title,description,event_date,event_time,location_id,locations(location_id,name,city,country)')
      .single();

    if (error) {
      throw error;
    }

    const eventId = data?.event_id ?? null;

    const attendeeRows = (event.attendees ?? [])
      .map((attendee) => numberOrNull(attendee.id))
      .filter((id): id is number => Boolean(id))
      .map((alumniId) => ({ event_id: eventId, alumni_id: alumniId }));

    if (eventId && attendeeRows.length > 0) {
      const { error: attendeeError } = await supabase
        .from('event_participants')
        .upsert(attendeeRows, { onConflict: 'event_id,alumni_id' });
      if (attendeeError) {
        throw attendeeError;
      }
    }

    return mapEventRowToEvent({
      ...data,
      event_participants: event.attendees.map((attendee) => ({ alumni: attendee })),
    });
  };

  const persistEventAttendees = async (eventId: string, attendees: Contact[]) => {
    const numericEventId = numberOrNull(eventId);
    if (!numericEventId) return;

    const rows = attendees
      .map((attendee) => numberOrNull(attendee.id))
      .filter((id): id is number => Boolean(id))
      .map((alumniId) => ({ event_id: numericEventId, alumni_id: alumniId }));

    if (rows.length === 0) return;

    const { error } = await supabase
      .from('event_participants')
      .upsert(rows, { onConflict: 'event_id,alumni_id' });

    if (error) {
      throw error;
    }
  };

  const deleteEventFromSupabase = async (eventId: string) => {
    const numericEventId = numberOrNull(eventId);
    if (!numericEventId) return;

    const { error } = await supabase.from('events').delete().eq('event_id', numericEventId);

    if (error) {
      throw error;
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    let isMounted = true;

    const loadData = async () => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        const [loadedContacts, loadedEvents] = await Promise.all([
          fetchContactsFromSupabase(),
          fetchEventsFromSupabase(),
        ]);

        if (!isMounted) return;

        if (loadedContacts.length > 0) {
          setContacts(loadedContacts);
        }

        setEvents(loadedEvents);
      } catch (error) {
        console.error('Supabase: failed to load data', error);
        if (isMounted) {
          setSyncError('Unable to load some data from Supabase. Showing local data.');
        }
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Clear any persisted browser data after sign-out
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.error('Supabase: failed to sign out', error);
    }

    setIsLoggedIn(false);
    setActiveTab('home');
    setShowForm(false);
    setEditingContact(null);
    setViewingContact(null);
    setShowImport(false);
    setShowExport(false);
    setSelectedContacts([]);
    setShowCreateEvent(false);
    setViewingEvent(null);
    setShowDeleteConfirm(false);
  };

  const handleReset = () => {
    setSearchQuery('');
    setGraduatedFrom('');
    setGraduatedTo('');
    setSelectedContacts([]);
  };

  const handleNewContact = () => {
    setEditingContact(null);
    setShowForm(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleSaveContact = async (contact: Contact) => {
    const normalizedContact: Contact = {
      ...contact,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      dateGraduated: contact.dateGraduated || '',
    };

    const editingId = editingContact?.id;

    // Optimistically update UI
    setContacts((prev) =>
      editingId
        ? prev.map((c) => (c.id === editingId ? normalizedContact : c))
        : [...prev, normalizedContact]
    );

    setShowForm(false);
    setEditingContact(null);
    setIsSyncing(true);
    setSyncError(null);

    try {
      const savedContact = await persistContactToSupabase(normalizedContact);

      setContacts((prev) => {
        if (editingId) {
          return prev.map((c) => (c.id === editingId ? savedContact : c));
        }

        const hasSameEmail = prev.find((c) => c.email === savedContact.email);
        if (hasSameEmail) {
          return prev.map((c) => (c.email === savedContact.email ? savedContact : c));
        }

        return [...prev, savedContact];
      });
    } catch (error) {
      console.error('Supabase: failed to save contact', error);
      setSyncError('Saved locally but failed to sync contact to Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingContact(null);
  };

  const handleCloseView = () => {
    setViewingContact(null);
  };

  const handleDelete = () => {
    if (selectedContacts.length > 0) {
      setShowDeleteConfirm(true);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm(`Are you sure you want to delete this event?`)) {
      const eventToArchive = events.find((e) => e.id === eventId);
      if (eventToArchive) {
        setArchivedEvents([...archivedEvents, eventToArchive]);
      }
      setEvents(events.filter((e) => e.id !== eventId));

      deleteEventFromSupabase(eventId).catch((error) => {
        console.error('Supabase: failed to delete event', error);
        setSyncError('Deleted locally but failed to delete event in Supabase.');
      });
    }
  };

  const handleImportContacts = (importedContacts: Contact[]) => {
    setContacts([...contacts, ...importedContacts]);
    setIsSyncing(true);

    persistContactsBatch(importedContacts)
      .then((saved) => {
        if (!saved.length) return;

        setContacts((prev) => {
          const filtered = prev.filter(
            (contact) => !saved.some((s) => s.id === contact.id || s.email === contact.email)
          );
          return [...filtered, ...saved];
        });
      })
      .catch((error) => {
        console.error('Supabase: failed to import contacts', error);
        setSyncError('Imported locally but failed to sync new contacts to Supabase.');
      })
      .finally(() => setIsSyncing(false));
  };

  const handleViewContact = (contact: Contact) => {
    setViewingContact(contact);
  };

  const handleCreateEvent = async (event: Event) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log('App - handleCreateEvent received event:', {
        id: event.id,
        title: event.title,
        attendeeCount: event.attendees.length,
        attendees: event.attendees.map(a => ({ id: a.id, name: a.name, alumniId: a.alumniId }))
      });

      // Event is already saved to database by createEvent()
      // Just add it to the local state
      setEvents((prev) => [...prev, event]);
      setShowCreateEvent(false);
    } catch (err) {
      console.error('Failed to add event', err);
      setSyncError('Failed to add event.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewEvent = (event: Event) => {
    setViewingEvent(event);
  };

  const handleAddAttendees = (eventId: string, newAttendees: Contact[]) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? { ...event, attendees: [...event.attendees, ...newAttendees] }
          : event
      )
    );

    persistEventAttendees(eventId, newAttendees).catch((error) => {
      console.error('Supabase: failed to add attendees', error);
      setSyncError('Added attendees locally but failed to sync with Supabase.');
    });
  };

  const handleRestoreContact = (contact: Contact) => {
    setContacts([...contacts, contact]);
    setArchivedContacts(archivedContacts.filter((c) => c.id !== contact.id));
  };

  const handleRestoreEvent = (event: Event) => {
    setEvents([...events, event]);
    setArchivedEvents(archivedEvents.filter((e) => e.id !== event.id));
  };

  const handlePermanentDeleteContact = (contactId: string) => {
    setArchivedContacts(archivedContacts.filter((c) => c.id !== contactId));
  };

  const handlePermanentDeleteEvent = (eventId: string) => {
    setArchivedEvents(archivedEvents.filter((e) => e.id !== eventId));
  };

  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = query
      ? [
          contact.name,
          contact.college,
          contact.program,
          contact.email,
          contact.occupation,
          contact.company,
        ]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query))
      : true;

    const hasFrom = Boolean(graduatedFrom);
    const hasTo = Boolean(graduatedTo);
    const graduatedDate = contact.dateGraduated ? new Date(contact.dateGraduated) : null;

    const matchesDate = (() => {
      if (!hasFrom && !hasTo) return true;
      if (!graduatedDate) return false;

      const fromOk = hasFrom ? graduatedDate >= new Date(graduatedFrom) : true;
      const toOk = hasTo ? graduatedDate <= new Date(graduatedTo) : true;
      return fromOk && toOk;
    })();

    return matchesQuery && matchesDate;
  });

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#F5F1ED]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
      
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-8">
          {isSyncing && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Syncing with Supabase...
            </div>
          )}

          {syncError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {syncError}
            </div>
          )}

          {activeTab === 'home' ? (
            <Home contacts={contacts} onViewContact={handleViewContact} />
          ) : activeTab === 'events' ? (
            <Events
              events={events}
              onCreateEvent={() => setShowCreateEvent(true)}
              onViewEvent={handleViewEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          ) : activeTab === 'archives' ? (
            <Archives
              archivedContacts={archivedContacts}
              archivedEvents={archivedEvents}
              onRestoreContact={handleRestoreContact}
              onRestoreEvent={handleRestoreEvent}
              onPermanentDeleteContact={handlePermanentDeleteContact}
              onPermanentDeleteEvent={handlePermanentDeleteEvent}
            />
          ) : activeTab === 'contacts' ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl mb-6">Manage Contacts</h1>
                
                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                  <button 
                    onClick={handleNewContact}
                    className="flex items-center gap-2 bg-[#FF2B5E] text-white px-5 py-2.5 rounded-lg hover:bg-[#E6275A] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={selectedContacts.length === 0}
                    className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button 
                    onClick={() => setShowImport(true)}
                    className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  <button 
                    onClick={() => setShowExport(true)}
                    className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                {/* Search Bar with Filters */}
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onReset={handleReset}
                  graduatedFrom={graduatedFrom}
                  graduatedTo={graduatedTo}
                  setGraduatedFrom={setGraduatedFrom}
                  setGraduatedTo={setGraduatedTo}
                />
              </div>

              {/* Table */}
              <ContactsTable
                contacts={filteredContacts}
                selectedContacts={selectedContacts}
                setSelectedContacts={setSelectedContacts}
                onViewContact={handleViewContact}
              />

              {/* Pagination */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <button className="px-5 py-2.5 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Previous
                </button>
                <span className="text-gray-700 px-4">Page 1 of 1</span>
                <button className="px-5 py-2.5 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
                <p className="text-gray-600">This section is under development.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Contact Form Modal */}
      {showForm && (
        <ContactForm
          contact={editingContact}
          existingContacts={contacts}
          onClose={handleCloseForm}
          onSave={handleSaveContact}
        />
      )}

      {/* View Contact Modal */}
      {viewingContact && (
        <ViewContact
          contact={viewingContact}
          onClose={handleCloseView}
          onEdit={handleEditContact}
        />
      )}

      {/* Create Event Modal */}
      {showCreateEvent && (
        <CreateEvent
          contacts={contacts}
          onClose={() => setShowCreateEvent(false)}
          onSave={handleCreateEvent}
        />
      )}

      {/* View Event Modal */}
      {viewingEvent && (
        <ViewEvent
          event={viewingEvent}
          contacts={contacts}
          onClose={() => setViewingEvent(null)}
          onAddAttendees={handleAddAttendees}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportContact
          onClose={() => setShowImport(false)}
          onImport={handleImportContacts}
        />
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportContact
          contacts={contacts}
          selectedContacts={selectedContacts}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900">Delete contacts?</h3>
            <p className="text-gray-600">
              This will move {selectedContacts.length} contact(s) to archives. You can restore them later.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setArchivedContacts((prev) => [
                    ...prev,
                    ...contacts.filter((c) => selectedContacts.includes(c.id)),
                  ]);
                  setContacts((prev) => prev.filter((c) => !selectedContacts.includes(c.id)));
                  setSelectedContacts([]);
                  setShowDeleteConfirm(false);
                }}
                className="px-5 py-2.5 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}