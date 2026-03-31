# TBI Marian – Cloned App (Frontend Preview)

A standalone, **backend-free** copy of the TBI Marian app.  
No Supabase project, no environment variables, and no internet connection
are required to run this version.

It is intended for **UI checking and feature previewing** only. All data
is stored in memory and resets when the page is refreshed.

---

## Pre-loaded Sample Data

| Section     | Contents |
|-------------|----------|
| Contacts    | 3 alumni records (Juan Santos, Maria Reyes, Pedro Cruz) |
| Events      | 1 event (Annual Alumni Homecoming 2024) |
| Incubatees  | 2 startups (AgroTech Solutions, EduBridge PH) with 3 founders |
| Team        | 3 members (Demo Admin, Jane Manager, Mark Member) |

You are automatically logged in as **Demo Admin** with full Admin access.

---

## How to Run

### Prerequisites
- **Node.js** 18 or newer  
- **npm** 8 or newer

### Steps

```bash
# 1. Navigate to this folder
cd cloned-app

# 2. Install dependencies (first time only)
npm install

# 3. Start the development server
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Build for static hosting

```bash
npm run build    # Outputs to dist/
npm run preview  # Serves the built output locally
```

The output in `dist/` can be deployed to any static host
(Vercel, Netlify, GitHub Pages, etc.) without any server-side component.

---

## What Works

- ✅ Dashboard / Home view
- ✅ Contacts list, create, edit, delete, archive
- ✅ Events list, create, edit, delete, archive
- ✅ Incubatees & Founders management
- ✅ Team members view
- ✅ Archives (soft-deleted records)
- ✅ Form Preview (public alumni/startup forms)
- ✅ Sidebar navigation with role-based visibility

## What Is Mocked (No Real Backend)

- 🔇 Authentication – auto-logged in as Demo Admin (no real login screen)
- 🔇 Email sending – all email actions succeed silently, no email is actually sent
- 🔇 Supabase Edge Functions – return a success response in memory
- 🔇 Data persistence – all changes are **in-memory only** and reset on page refresh

---

## Differences from the Production App

| Feature | Production | This Clone |
|---------|------------|------------|
| Auth | Supabase Auth (email/OAuth) | Mock – auto Admin login |
| Database | Supabase PostgreSQL | In-memory JS object |
| Email | Resend via Edge Functions | No-op (logs to console) |
| Realtime | Supabase Realtime channel | No-op listener |
| Env vars | Required (.env file) | Not required |
