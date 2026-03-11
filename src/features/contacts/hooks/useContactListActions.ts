import { Dispatch, SetStateAction } from 'react';
import type { Contact } from '../../../types';

type UseContactListActionsParams = {
  selectedContacts: string[];
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setViewingContact: Dispatch<SetStateAction<Contact | null>>;
  setShowDeleteConfirm: Dispatch<SetStateAction<boolean>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  persistContactsBatch: (items: Contact[]) => Promise<Contact[]>;
};

export const useContactListActions = ({
  selectedContacts,
  setContacts,
  setViewingContact,
  setShowDeleteConfirm,
  setIsSyncing,
  setSyncError,
  persistContactsBatch,
}: UseContactListActionsParams) => {
  const handleDelete = () => {
    if (selectedContacts.length > 0) {
      setShowDeleteConfirm(true);
    }
  };

  const handleImportContacts = (importedContacts: Contact[]) => {
    setContacts((prev) => [...prev, ...importedContacts]);
    setIsSyncing(true);

    persistContactsBatch(importedContacts)
      .then((saved) => {
        if (!saved.length) return;

        setContacts((prev) => {
          const filtered = prev.filter(
            (contact) => !saved.some((savedContact) => savedContact.id === contact.id || savedContact.email === contact.email)
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

  return {
    handleDelete,
    handleImportContacts,
    handleViewContact,
  };
};
