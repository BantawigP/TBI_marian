import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type VerifyState =
  | { status: 'idle' | 'verifying' }
  | { status: 'success'; email?: string }
  | { status: 'error'; message: string };

export function VerifyEmailPage() {
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') ?? '';
  }, []);

  const [state, setState] = useState<VerifyState>({ status: 'idle' });

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setState({ status: 'error', message: 'Missing verification token.' });
        return;
      }

      setState({ status: 'verifying' });

      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: { token },
      });

      if (error) {
        setState({ status: 'error', message: error.message || 'Verification failed.' });
        return;
      }

      setState({ status: 'success', email: (data as any)?.email });
    };

    void run();
  }, [token]);

  const title =
    state.status === 'success'
      ? 'Email verified'
      : state.status === 'error'
        ? 'Verification failed'
        : 'Verifying…';

  return (
    <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h1>

        {state.status === 'verifying' && (
          <p className="text-gray-700">Please wait while we verify your email.</p>
        )}

        {state.status === 'success' && (
          <p className="text-gray-700">
            Your email{state.email ? ` (${state.email})` : ''} has been verified. You can close this
            tab.
          </p>
        )}

        {state.status === 'error' && (
          <p className="text-red-700">{state.message}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => (window.location.href = '/')}
            className="flex-1 px-4 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
          >
            Back to app
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          If you keep seeing this page, ask an admin to resend your verification email.
        </p>
      </div>
    </div>
  );
}
