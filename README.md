# TBI Marian

TBI Marian is a React + TypeScript + Vite web system for managing contacts, events, incubatees, team access, and email verification workflows.

## Coders

- Paul Bantawig
- Ian Labonete

## System Features

- Authentication and profile handling (login, callback handling, claim access, personal settings, verify email pages).
- Contacts management:
- Create, view, edit, and organize alumni/contact records.
- Import and export contact data.
- Search and filtering support.
- Contact archive and restore flows.
- Events management:
- Create, edit, view, and list events.
- Calendar-based event view.
- Event archive and restore flows.
- Event invite sending and RSVP processing.
- Incubatee and founder management:
- Incubatee cards/forms and startup/alumni forms.
- Founder assignment and founder table management.
- Assessment and confirmation related workflows.
- Export for incubatees and founders.
- Team management:
- Team member CRUD and archive handling.
- Role/context-based access support and route guarding.
- Access granting and claiming utilities.
- Shared archive module for archived entities.
- Supabase-integrated backend edge functions for access, verification, RSVP, and email automation.

## Backend Automation (Supabase Functions)

The project includes edge functions under `supabase/functions/`, including:

- `claim-access`
- `grant-access`
- `preauth-check`
- `process-team-auth`
- `verify-email`
- `send-verification-email`
- `send-event-invite`
- `event-rsvp`
- `send-mass-email`
- `send-incubation-confirmation`
- `reverification-report`

### Verification Rapport Campaign

The verification campaign supports follow-up intervals at `1`, `3`, `6`, and `12` months for unverified contacts.

- Scheduler target: `supabase/functions/reverification-report`
- Sender function: `supabase/functions/send-verification-email`
- Anchor table: `verification_email_anchor`
- Campaign log table: `reverification_campaign_log`

Run dry run payload:

```json
{ "dryRun": true }
```

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS.
- Backend/DB: Supabase.
- Routing: React Router.
- Data import/export and reporting: PapaParse, XLSX, jsPDF.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview production build:

```bash
npm run preview
```

## License

This project is licensed under a custom company-restricted license.
Full access is granted only to `MARIAN TBI`; other parties are allowed view-only access.
See `LICENSE` for details.

<<<<<<< HEAD
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

=======
>>>>>>> d6770a6c5839df08cc3a49078206a5268cc7140b
