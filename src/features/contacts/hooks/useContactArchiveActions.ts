import { Dispatch, SetStateAction } from 'react';
import type { Contact } from '../../../types';

type UseContactArchiveActionsParams = {
  contacts: Contact[];
  selectedContacts: string[];
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setArchivedContacts: Dispatch<SetStateAction<Contact[]>>;
  setSelectedContacts: Dispatch<SetStateAction<string[]>>;
  setShowDeleteConfirm: Dispatch<SetStateAction<boolean>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  deleteContactFromSupabase: (contactId: string) => Promise<void>;
};

export const useContactArchiveActions = ({
  contacts,
  selectedContacts,
  setContacts,
  setArchivedContacts,
  setSelectedContacts,
  setShowDeleteConfirm,
  setIsSyncing,
  setSyncError,
  deleteContactFromSupabase,
}: UseContactArchiveActionsParams) => {
  const handleCancelDeleteConfirm = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmArchiveContacts = async () => {
    const contactsToArchive = contacts.filter((contact) => selectedContacts.includes(contact.id));

    setArchivedContacts((prev) => [...prev, ...contactsToArchive]);
    setContacts((prev) => prev.filter((contact) => !selectedContacts.includes(contact.id)));
    setSelectedContacts([]);
    setShowDeleteConfirm(false);

    setIsSyncing(true);
    try {
      for (const contact of contactsToArchive) {
        await deleteContactFromSupabase(contact.id);
      }
      console.log(`✅ Successfully archived ${contactsToArchive.length} contact(s) in database`);
    } catch (error) {
      console.error('❌ Failed to archive contacts in database:', error);
      setSyncError('Contacts archived locally but failed to update in database.');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    handleCancelDeleteConfirm,
    handleConfirmArchiveContacts,
  };
};
