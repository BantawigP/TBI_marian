import { Dispatch, SetStateAction } from 'react';
import type { Contact, ContactStatus } from '../../../types';

type SendVerificationEmailFn = (args: {
  to: string;
  firstName: string;
  brandName: string;
}) => Promise<void>;

type UseContactStatusActionsParams = {
  contacts: Contact[];
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setViewingContact: Dispatch<SetStateAction<Contact | null>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  ensureEmailId: (email?: string, status?: ContactStatus) => Promise<number | null>;
  sendVerificationEmail: SendVerificationEmailFn;
};

export const useContactStatusActions = ({
  contacts,
  setContacts,
  setViewingContact,
  setSyncError,
  ensureEmailId,
  sendVerificationEmail,
}: UseContactStatusActionsParams) => {
  const handleUpdateContactStatus = async (updatedContact: Contact) => {
    const previous = contacts.find((contact) => contact.id === updatedContact.id);
    const becameUnverified =
      updatedContact.status === 'Unverified' && previous?.status !== 'Unverified';

    setContacts((prev) =>
      prev.map((contact) => (contact.id === updatedContact.id ? updatedContact : contact))
    );

    setViewingContact(updatedContact);

    try {
      if (updatedContact.email) {
        await ensureEmailId(updatedContact.email, updatedContact.status);

        if (becameUnverified) {
          try {
            await sendVerificationEmail({
              to: updatedContact.email,
              firstName: updatedContact.firstName,
              brandName: 'Marian Alumni Network',
            });
            console.log('✅ Verification email sent for unverified contact');
          } catch (emailError) {
            console.error('❌ Status updated but failed to send verification email:', emailError);
            setSyncError('Contact status updated, but sending verification email failed.');
          }
        }

        console.log('✅ Contact status updated in email_address table');
      }
    } catch (error) {
      console.error('❌ Failed to update contact status in backend:', error);
      setSyncError('Failed to update contact status in database.');
    }
  };

  return {
    handleUpdateContactStatus,
  };
};
