import { Dispatch, SetStateAction } from 'react';
import type { Contact, Event } from '../../../types';

type UseArchiveActionsParams = {
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setArchivedContacts: Dispatch<SetStateAction<Contact[]>>;
  setEvents: Dispatch<SetStateAction<Event[]>>;
  setArchivedEvents: Dispatch<SetStateAction<Event[]>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  restoreContactInSupabase: (contactId: string) => Promise<void>;
  restoreEventInSupabase: (eventId: string) => Promise<void>;
  deleteContactPermanently: (contactId: string) => Promise<void>;
  deleteEventPermanently: (eventId: string) => Promise<void>;
};

export const useArchiveActions = ({
  setContacts,
  setArchivedContacts,
  setEvents,
  setArchivedEvents,
  setIsSyncing,
  setSyncError,
  restoreContactInSupabase,
  restoreEventInSupabase,
  deleteContactPermanently,
  deleteEventPermanently,
}: UseArchiveActionsParams) => {
  const handleRestoreContact = async (contact: Contact) => {
    setContacts((prev) => [...prev, contact]);
    setArchivedContacts((prev) => prev.filter((savedContact) => savedContact.id !== contact.id));

    setIsSyncing(true);
    try {
      await restoreContactInSupabase(contact.id);
      console.log('✅ Contact restored in database');
    } catch (error) {
      console.error('❌ Failed to restore contact in database:', error);
      setSyncError('Contact restored locally but failed to update in database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreEvent = async (event: Event) => {
    setEvents((prev) => [...prev, event]);
    setArchivedEvents((prev) => prev.filter((savedEvent) => savedEvent.id !== event.id));

    setIsSyncing(true);
    try {
      await restoreEventInSupabase(event.id);
      console.log('✅ Event restored in database');
    } catch (error) {
      console.error('❌ Failed to restore event in database:', error);
      setSyncError('Event restored locally but failed to update in database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePermanentDeleteContact = async (contactId: string) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await deleteContactPermanently(contactId);
      setArchivedContacts((prev) => prev.filter((contact) => contact.id !== contactId));
      console.log('✅ Contact permanently deleted from database');
    } catch (error) {
      console.error('❌ Failed to permanently delete contact', error);
      setSyncError('Failed to permanently delete contact from database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePermanentDeleteEvent = async (eventId: string) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await deleteEventPermanently(eventId);
      setArchivedEvents((prev) => prev.filter((event) => event.id !== eventId));
    } catch (error) {
      console.error('❌ Failed to permanently delete event', error);
      setSyncError('Failed to permanently delete event from Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    handleRestoreContact,
    handleRestoreEvent,
    handlePermanentDeleteContact,
    handlePermanentDeleteEvent,
  };
};
