import { CheckCircle } from 'lucide-react';

interface EmailconfirmationProps {
  email: string;
  onSubmitAnother: () => void;
}

export function Emailconfirmation({ email, onSubmitAnother }: EmailconfirmationProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-12 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-semibold text-gray-900 mb-4">Thank You!</h2>
        <p className="text-lg text-gray-600 mb-6">
          Your information has been received and added to the MARIAN TBI directory.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <p className="text-sm text-blue-900">
            <strong>What's Next?</strong>
            <br />
            We sent a verification email to <strong>{email}</strong> to confirm you are the intended recipient.
            Please check your inbox and follow the verification link to activate your entry.
          </p>
        </div>
        <button
          onClick={onSubmitAnother}
          className="px-8 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors font-medium"
        >
          Submit Another Response
        </button>
      </div>
    </div>
  );
}
