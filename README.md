# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Verification Rapport Campaign

The verification campaign now supports follow-up intervals at **1, 3, 6, and 12 months** for unverified contacts.

- Scheduler target: `supabase/functions/reverification-report`
- Sender function: `supabase/functions/send-verification-email`
- Anchor table: `verification_email_anchor` (stores first verification send timestamp per email)
- Campaign log table: `reverification_campaign_log` (tracks sent intervals and status)

### Run manually (dry run)

Invoke `reverification-report` with:

```json
{ "dryRun": true }
```

Dry run returns counts (`dueCount`, `sentCount`, `skippedNoAnchor`) and per-email results without sending mail.

### Deployment notes

1. Apply migration: `supabase/migrations/20260218_rapport_campaign_verification.sql`
2. Ensure `APP_URL`, `RESEND_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are set for edge functions.
3. Configure a Supabase scheduled job (recommended daily) that triggers `reverification-report` with `POST`.

