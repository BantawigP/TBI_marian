import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Handles the Google OAuth redirect at /auth/callback.
 *
 * Supabase's detectSessionInUrl:true exchanges the code in the URL for a
 * session automatically. This component just waits for the resulting
 * onAuthStateChange event and then redirects to '/' so App.tsx can run the
 * full login bootstrap (teams check, linkMyAccountToTeam, role fetch).
 */
export function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let redirected = false;

    const redirect = () => {
      if (redirected) return;
      redirected = true;
      window.location.replace('/');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Session established — hand off to App.tsx at '/'
        redirect();
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        // Exchange failed or no session (e.g. link expired)
        setStatus('error');
        setErrorMsg('Google sign-in failed or the link has expired. Please try again.');
      }
    });

    // Safety net: if no auth event fires within 15 s, redirect anyway
    const timeout = setTimeout(redirect, 15_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (status === 'error') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #F5F1ED, #FFF5F8, #FFE8EF)',
          gap: 16,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#FFE8EF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          ✕
        </div>
        <p style={{ color: '#FF2B5E', fontWeight: 600, fontSize: 16, maxWidth: 340 }}>
          {errorMsg}
        </p>
        <button
          onClick={() => window.location.replace('/')}
          style={{
            marginTop: 8,
            padding: '10px 28px',
            background: '#FF2B5E',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F5F1ED, #FFF5F8, #FFE8EF)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '4px solid #FFB3C6',
          borderTopColor: '#FF2B5E',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ marginTop: 16, color: '#FF2B5E', fontWeight: 600, fontSize: 15 }}>
        Signing you in with Google…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
