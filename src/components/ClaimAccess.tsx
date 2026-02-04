import { useState, useEffect } from 'react';
import { Key, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { claimAccess } from '../lib/teamService';
import { supabase } from '../lib/supabaseClient';

interface ClaimAccessProps {
  onSuccess: () => void;
}

export function ClaimAccess({ onSuccess }: ClaimAccessProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    if (urlToken) {
      setToken(urlToken);
    } else {
      setError('No invitation token found in URL');
    }

    // Check if user is authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError('Please sign in with the magic link from your email first');
        setLoading(false);
        return;
      }

      setUserEmail(user.email || null);
      setLoading(false);
    } catch (err) {
      console.error('Error checking auth:', err);
      setError('Failed to verify authentication');
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!token) {
      setError('No invitation token available');
      return;
    }

    try {
      setClaiming(true);
      setError(null);
      
      await claimAccess(token);

      setSuccess(true);
      
      // Show success message for 1.5 seconds, then redirect
      setTimeout(() => {
        // Clear the token from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Error claiming access:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim access';
      setError(errorMessage);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] via-[#FFF5F8] to-[#FFE8EF] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-[#FF2B5E] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] via-[#FFF5F8] to-[#FFE8EF] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to MARIAN TBI Connect!</h2>
          <p className="text-gray-600 mb-4">
            Your access has been successfully activated. You can now access the system.
          </p>
          <Loader2 className="w-6 h-6 text-[#FF2B5E] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] via-[#FFF5F8] to-[#FFE8EF] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Claim Your Access</h2>
          <p className="text-gray-600">
            You've been invited to join the MARIAN TBI Connect system
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
              {error.includes('sign in') && (
                <p className="text-xs text-red-600 mt-2">
                  Check your email for the magic link and click it to sign in first.
                </p>
              )}
            </div>
          </div>
        )}

        {userEmail && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Signed in as:</strong> {userEmail}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {!error || !error.includes('sign in') ? (
            <>
              <button
                onClick={handleClaim}
                disabled={claiming || !userEmail}
                className="w-full flex items-center justify-center gap-2 bg-[#FF2B5E] text-white px-6 py-3 rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Claiming Access...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Claim Access Now
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By claiming access, you'll be able to use the MARIAN TBI Connect system
                with your assigned role and permissions.
              </p>
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Please check your email and click the magic link to sign in, then return to this page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
