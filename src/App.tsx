import { useState } from 'react';
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
import type { Contact, Event } from './types';

const initialContacts: Contact[] = [
  {
    id: '111',
    firstName: 'Maria',
    lastName: 'Santos',
    name: 'Maria Santos',
    college: 'Business',
    program: 'Marketing',
    email: 'maria@example.com',
    status: 'Contacted',
    contactNumber: '+63 912 345 6789',
    dateGraduated: '2023-05-15',
    occupation: 'Marketing Manager',
    company: 'Tech Corp',
  },
  {
    id: '112',
    firstName: 'Jose',
    lastName: 'Rivera',
    name: 'Jose Rivera',
    college: 'Engineering',
    program: 'Mechanical',
    email: 'jose@example.com',
    status: 'Pending',
    contactNumber: '+63 923 456 7890',
    dateGraduated: '2022-06-20',
    occupation: 'Mechanical Engineer',
    company: 'AutoWorks Inc',
  },
  {
    id: '113',
    firstName: 'Ana',
    lastName: 'Cruz',
    name: 'Ana Cruz',
    college: 'IT',
    program: 'Computer Science',
    email: 'ana@example.com',
    status: 'Contacted',
    contactNumber: '+63 934 567 8901',
    dateGraduated: '2023-03-10',
    occupation: 'Software Developer',
    company: 'DevSolutions',
  },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [events, setEvents] = useState<Event[]>([]);
  const [archivedContacts, setArchivedContacts] = useState<Contact[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedStatus([]);
    setSelectedExpertise([]);
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

  const handleSaveContact = (contact: Contact) => {
    const normalizedContact: Contact = {
      ...contact,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
    };

    if (editingContact) {
      // Update existing contact
      setContacts(contacts.map((c) => (c.id === normalizedContact.id ? normalizedContact : c)));
    } else {
      // Add new contact
      setContacts([...contacts, normalizedContact]);
    }
    setShowForm(false);
    setEditingContact(null);
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
      if (confirm(`Are you sure you want to delete ${selectedContacts.length} contact(s)?`)) {
        const toArchive = contacts.filter((c) => selectedContacts.includes(c.id));
        setArchivedContacts([...archivedContacts, ...toArchive]);
        setContacts(contacts.filter((c) => !selectedContacts.includes(c.id)));
        setSelectedContacts([]);
      }
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm(`Are you sure you want to delete this event?`)) {
      const eventToArchive = events.find((e) => e.id === eventId);
      if (eventToArchive) {
        setArchivedEvents([...archivedEvents, eventToArchive]);
      }
      setEvents(events.filter((e) => e.id !== eventId));
    }
  };

  const handleImportContacts = (importedContacts: Contact[]) => {
    setContacts([...contacts, ...importedContacts]);
  };

  const handleViewContact = (contact: Contact) => {
    setViewingContact(contact);
  };

  const handleCreateEvent = (event: Event) => {
    setEvents([...events, event]);
    setShowCreateEvent(false);
  };

  const handleViewEvent = (event: Event) => {
    setViewingEvent(event);
  };

  const handleAddAttendees = (eventId: string, newAttendees: Contact[]) => {
    setEvents(
      events.map((event) =>
        event.id === eventId
          ? { ...event, attendees: [...event.attendees, ...newAttendees] }
          : event
      )
    );
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

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#F5F1ED]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-8">
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
                  selectedStatus={selectedStatus}
                  setSelectedStatus={setSelectedStatus}
                  selectedExpertise={selectedExpertise}
                  setSelectedExpertise={setSelectedExpertise}
                />
              </div>

              {/* Table */}
              <ContactsTable
                contacts={contacts}
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
    </div>
  );
}