import { supabase } from '../../lib/supabaseClient';

export interface SendVerificationEmailParams {
  to: string;
  subject?: string;
  firstName?: string;
  brandName?: string;
  verifyUrl?: string; // optional: pass a fully built verification link if you already have one
  from?: string;
  campaignType?: 'initial' | 'rapport';
  intervalMonths?: 1 | 3 | 6 | 12;
}

// Sends a verification email via the `send-verification-email` Edge Function (Resend-backed).
// This helper builds the HTML/text using the local template and posts to the Edge Function.
export async function sendVerificationEmail({
  to,
  subject = 'Please verify your email',
  firstName,
  brandName = 'Marian Alumni Network',
  verifyUrl,
  from,
  campaignType,
  intervalMonths,
}: SendVerificationEmailParams) {
  const fallbackVerifyUrl = `${window.location.origin.replace(/\/$/, '')}/verify-email`;
  const finalVerifyUrl = verifyUrl || fallbackVerifyUrl;


  const { data, error } = await supabase.functions.invoke('send-verification-email', {
    body: {
      to,
      subject,
      // Pass minimal context; let the Edge Function build the tokenized verify URL using APP_URL.
      firstName,
      brandName,
      // Only send verifyUrl if caller explicitly provided one; otherwise let the Edge Function attach the token.
      ...(verifyUrl ? { verifyUrl: finalVerifyUrl } : {}),
      from: from || 'no-reply@mariantbi.uic.edu.ph',
      ...(campaignType ? { campaignType } : {}),
      ...(intervalMonths ? { intervalMonths } : {}),
    },
  });

  if (error) {
    console.error(error);
    throw new Error(error.message ?? 'Function failed');
  }

  return data;
}