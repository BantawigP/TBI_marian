import { Dispatch, SetStateAction } from 'react';
import type { Contact } from '../../../types';

type SendVerificationEmailFn = (args: {
  to: string;
  firstName: string;
  brandName: string;
}) => Promise<void>;

type UseContactFormActionsParams = {
  editingContact: Contact | null;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setShowForm: Dispatch<SetStateAction<boolean>>;
  setEditingContact: Dispatch<SetStateAction<Contact | null>>;
  setViewingContact: Dispatch<SetStateAction<Contact | null>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  persistContactToSupabase: (contact: Contact) => Promise<Contact>;
  sendVerificationEmail: SendVerificationEmailFn;
};

export const useContactFormActions = ({
  editingContact,
  setContacts,
  setShowForm,
  setEditingContact,
  setViewingContact,
  setIsSyncing,
  setSyncError,
  persistContactToSupabase,
  sendVerificationEmail,
}: UseContactFormActionsParams) => {
  const handleSaveContact = async (contact: Contact) => {
    const normalizedContact: Contact = {
      ...contact,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      dateGraduated: contact.dateGraduated || '',
    };

    const editingId = editingContact?.id;

    setShowForm(false);
    setEditingContact(null);
    setIsSyncing(true);
    setSyncError(null);

    try {
      const savedContact = await persistContactToSupabase(normalizedContact);
      console.log('✅ Contact saved with alumniId:', savedContact.alumniId);

      const shouldSendVerification =
        savedContact.status === 'Unverified' &&
        Boolean(savedContact.email?.trim()) &&
        (!editingId || editingContact?.status !== 'Unverified');

      if (shouldSendVerification && savedContact.email) {
        try {
          await sendVerificationEmail({
            to: savedContact.email,
            firstName: savedContact.firstName,
            brandName: 'Marian Alumni Network',
          });
          console.log('✅ Verification email sent for newly unverified contact');
        } catch (emailError) {
          console.error('❌ Contact saved but failed to send verification email:', emailError);
          setSyncError('Contact saved, but sending verification email failed.');
        }
      }

      setContacts((prev) => {
        if (editingId) {
          return prev.map((saved) => (saved.id === editingId ? savedContact : saved));
        }

        const hasSameEmail = prev.find((saved) => saved.email === savedContact.email);
        if (hasSameEmail) {
          return prev.map((saved) => (saved.email === savedContact.email ? savedContact : saved));
        }

        return [...prev, savedContact];
      });
    } catch (error) {
      console.error('❌ Failed to save contact', error);
      setSyncError('Failed to save contact to Supabase.');
      setContacts((prev) =>
        editingId
          ? prev.map((saved) => (saved.id === editingId ? normalizedContact : saved))
          : [...prev, normalizedContact]
      );
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

  return {
    handleSaveContact,
    handleCloseForm,
    handleCloseView,
  };
};
