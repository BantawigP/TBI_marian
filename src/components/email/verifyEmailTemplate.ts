export interface VerifyEmailTemplateProps {
  firstName?: string;
  verifyUrl: string;
  brandName?: string;
  heading?: string;
  intro?: string;
  detail?: string;
  ctaLabel?: string;
}

export const renderVerifyEmailHTML = ({
  firstName = 'there',
  verifyUrl,
  brandName = 'Marian Alumni Network',
  heading = 'Verify your email',
  intro = 'Thank you for completing the form.',
  detail = 'To ensure we have the right person, please verify your email address by clicking the link below:',
  ctaLabel = 'Verify email',
}: VerifyEmailTemplateProps) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 12px 0;font-size:14px;color:#6b7280;">${brandName}</p>
            <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">${heading}</h1>
            <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hello ${firstName},</p>
            <p style="margin:0 0 10px 0;font-size:15px;color:#374151;">${intro}</p>
            <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">${detail}</p>
            <p style="margin:0 0 24px 0;">
              <a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#FF2B5E;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
                ${ctaLabel}
              </a>
            </p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">If the button doesn't work, copy and paste this link:</p>
            <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">${verifyUrl}</p>
            <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">If you did not request this, you can safely ignore this message.</p>
            <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">Best regards,<br />MARIAN TBI</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

export const renderVerifyEmailText = ({
  firstName = 'there',
  verifyUrl,
  brandName = 'Marian Alumni Network',
  intro = 'Thank you for completing the form.',
  detail = 'To ensure we have the right person, please verify your email address by clicking the link below:',
}: VerifyEmailTemplateProps) => `
${brandName}

Hello ${firstName},

${intro}
${detail}
${verifyUrl}

If you did not request this, you can safely ignore this message.

Best regards,
MARIAN TBI
`;
