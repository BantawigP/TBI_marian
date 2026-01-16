# Supabase Connection Guide

This project now ships with a shared Supabase client so you can call your database from React components or utilities.

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

Create a `.env.local` (Vite auto-loads it) in the project root:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Keep keys private; never commit this file.

## 3) Client location

The client lives in `src/lib/supabaseClient.ts`. It reads the env vars above and throws if they are missing.

## 4) Example usage

```ts
import { supabase } from '../lib/supabaseClient'

export async function fetchContacts() {
  const { data, error } = await supabase.from('contacts').select('*')
  if (error) throw error
  return data
}
```

You can call this inside React effects or event handlers as needed.

## 5) Helpful notes

- Vite only exposes env vars prefixed with `VITE_`.
- The anon key is fine for client-side usage with Row Level Security properly configured.
- For service-role keys or admin tasks, prefer a server-side function instead of the browser client.
