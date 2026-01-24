import { supabase } from '../../lib/supabaseClient';
import {
  renderVerifyEmailHTML,
  renderVerifyEmailText,
  type VerifyEmailTemplateProps,
} from './verifyEmailTemplate';

export interface SendVerificationEmailParams extends VerifyEmailTemplateProps {
  to: string;
  subject?: string;
}

// Client-side helper that calls the Supabase Edge Function `send-verification`.
// The Edge Function should take { to, subject, html, text } and send via SMTP (already configured in Supabase).
export async function sendVerificationEmail({
  to,
  subject = 'Please verify your email',
  firstName,
  verifyUrl,
  brandName,
}: SendVerificationEmailParams) {
  const html = renderVerifyEmailHTML({ firstName, verifyUrl, brandName });
  const text = renderVerifyEmailText({ firstName, verifyUrl, brandName });

  const { data, error } = await supabase.functions.invoke('send-verification', {
    body: { to, subject, html, text },
  });

  if (error) {
    throw error;
  }

  return data;
}
