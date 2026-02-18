import { X, Mail, Phone, Building2, GraduationCap, Briefcase, Calendar, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { Contact } from '../types';
import { sendVerificationEmail } from './email/sendVerificationEmail';

interface ViewContactProps {
  contact: Contact;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  // Optional callback to update contact status (e.g. after email verification)
  onUpdateStatus?: (contact: Contact) => void;
}

export function ViewContact({ contact, onClose, onEdit }: ViewContactProps) {
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleEdit = () => {
    onEdit(contact);
  };

  const handleSendVerification = async () => {
    if (isSendingVerification) return;

    setVerificationError(null);
    setVerificationSent(false);

    const email = contact.email?.trim();
    if (!email) {
      setVerificationError('This contact has no email address.');
      return;
    }

    setIsSendingVerification(true);
    try {
      await sendVerificationEmail({
        to: email,
        firstName: contact.firstName,
        brandName: 'Marian Alumni Network',
      });
      setVerificationSent(true);
    } catch (err) {
      console.error('Failed to send verification email', err);
      setVerificationError('Unable to send verification email right now. Please try again.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div />
          <h2 className="text-xl font-semibold text-gray-900">Contact Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto">
            {/* Profile Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-3xl mb-4">
                {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {contact.firstName} {contact.lastName}
              </h3>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <span
                  className={`inline-flex px-4 py-1.5 rounded-full text-sm font-medium ${
                    contact.status === 'Verified'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {contact.status}
                </span>
                {contact.status === 'Unverified' && (
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={isSendingVerification}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-[#FF2B5E] text-[#FF2B5E] hover:bg-[#FF2B5E] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSendingVerification ? 'Sending…' : 'Send Verification'}
                  </button>
                )}
              </div>

              {verificationError && (
                <p className="mt-2 text-sm text-red-600">{verificationError}</p>
              )}
              {verificationSent && !verificationError && (
                <p className="mt-2 text-sm text-green-700">Verification email sent.</p>
              )}
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                Contact Information
              </h4>

              <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm text-gray-900">{contact.email}</p>
                </div>
              </div>

              {contact.contactNumber && (
                <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Contact Number</p>
                    <p className="text-sm text-gray-900">{contact.contactNumber}</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Personal Address</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">
                    {contact.address?.trim() || 'No address on file. Select Update to add one.'}
                  </p>
                  {contact.locationId && (
                    <p className="text-xs text-gray-500 mt-1">
                    </p>
                  )}
                </div>
              </div>

              <h4 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide mt-6">
                Education
              </h4>
              {contact.alumniType && (
                <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Alumni Type</p>
                    <p className="text-sm text-gray-900">
                      {contact.alumniType === 'marian_graduate' ? 'Marian Graduate' : 'Graduate'}
                    </p>
                  </div>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">College</p>
                  <p className="text-sm text-gray-900">{contact.college}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Program</p>
                  <p className="text-sm text-gray-900">{contact.program}</p>
                </div>
              </div>

              {contact.dateGraduated && (
                <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Date Graduated</p>
                    <p className="text-sm text-gray-900">
                      {new Date(contact.dateGraduated).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {(contact.occupation || contact.company) && (
                <>
                  <h4 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide mt-6">
                    Professional Information
                  </h4>

                  {contact.occupation && (
                    <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                      <Briefcase className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Occupation</p>
                        <p className="text-sm text-gray-900">{contact.occupation}</p>
                      </div>
                    </div>
                  )}

                  {contact.company && (
                    <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-[#FF2B5E] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Company</p>
                        <p className="text-sm text-gray-900">{contact.company}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 max-w-xs px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleEdit}
            className="flex-1 max-w-xs px-6 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
