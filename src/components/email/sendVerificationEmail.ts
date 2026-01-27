import { supabase } from '../../lib/supabaseClient';

export interface SendVerificationEmailParams {
  to: string;
  subject?: string;
  firstName?: string;
  brandName?: string;
}

// Client-side helper that calls the Supabase Edge Function `send-verification`.
// The Edge Function generates a one-time token + verification URL and sends via SendGrid (or any provider) server-side.
export async function sendVerificationEmail({
  to,
  subject = 'Please verify your email',
  firstName,
  brandName,
}: SendVerificationEmailParams) {
  const { data, error } = await supabase.functions.invoke('send-verification', {
    body: { to, subject, firstName, brandName },
  });

  if (error) {
    throw error;
  }

  return data;
}
