import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: "No SUPABASE_DB_URL" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pool = new Pool(dbUrl, 1);
  const conn = await pool.connect();

  try {
    // 1. Get all triggers on auth.users
    const triggerResult = await conn.queryObject(`
      SELECT 
        t.tgname AS trigger_name,
        CASE t.tgtype & 66
          WHEN 2 THEN 'BEFORE'
          WHEN 64 THEN 'INSTEAD OF'
          ELSE 'AFTER'
        END AS timing,
        CASE t.tgtype & 28
          WHEN 4 THEN 'INSERT'
          WHEN 8 THEN 'DELETE'
          WHEN 16 THEN 'UPDATE'
          WHEN 20 THEN 'INSERT OR UPDATE'
          WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
          WHEN 12 THEN 'INSERT OR DELETE'
          WHEN 24 THEN 'UPDATE OR DELETE'
          ELSE 'UNKNOWN'
        END AS event,
        p.proname AS function_name,
        n.nspname AS function_schema,
        t.tgenabled AS enabled
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace ns ON c.relnamespace = ns.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE ns.nspname = 'auth' AND c.relname = 'users'
        AND NOT t.tgisinternal
      ORDER BY t.tgname;
    `);

    // 2. Get the source of each trigger function
    const functions: Record<string, string> = {};
    for (const row of triggerResult.rows as { function_schema: string; function_name: string }[]) {
      const funcResult = await conn.queryObject(`
        SELECT prosrc FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = $1 AND p.proname = $2
        LIMIT 1;
      `, [row.function_schema, row.function_name]);
      const r = funcResult.rows[0] as { prosrc: string } | undefined;
      functions[`${row.function_schema}.${row.function_name}`] = r?.prosrc || "NOT FOUND";
    }

    // 3. Check if public.profiles or similar tables exist
    const tablesResult = await conn.queryObject(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('profiles', 'users', 'user_profiles', 'accounts')
      ORDER BY table_name;
    `);

    // 4. Try to create a test user to get the exact error
    let createError = null;
    try {
      await conn.queryObject(`
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'test-trigger-debug@example.com', crypt('testpass123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
        RETURNING id;
      `);
      // If it succeeded, clean up
      await conn.queryObject(`DELETE FROM auth.users WHERE email = 'test-trigger-debug@example.com';`);
      createError = "SUCCESS - no error creating user";
    } catch (err) {
      createError = err instanceof Error ? err.message : String(err);
    }

    // 4b. Check if email exists as deleted user or in identities
    let emailCheck = null;
    try {
      const emailParam = "laboneteianben@gmail.com";
      const r1 = await conn.queryObject(`SELECT id, email, deleted_at, banned_until FROM auth.users WHERE email = $1`, [emailParam]);
      const r2 = await conn.queryObject(`SELECT id, user_id, provider, identity_data FROM auth.identities WHERE identity_data->>'email' = $1`, [emailParam]);
      const r3 = await conn.queryObject(`SELECT id, email, deleted_at FROM auth.users WHERE email ILIKE '%labonete%' OR email ILIKE '%ianben%'`);
      
      // Also check team row for this email — what are all the FK columns?
      const r4 = await conn.queryObject(`SELECT * FROM public.teams WHERE email ILIKE '%labonete%'`);
      
      // Check the teams table columns
      const r5 = await conn.queryObject(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'teams'
        ORDER BY ordinal_position
      `);
      
      emailCheck = {
        users_match: r1.rows,
        identities_match: r2.rows,
        partial_match: r3.rows,
        team_rows: r4.rows,
        teams_columns: r5.rows,
      };
    } catch (err) {
      emailCheck = { error: err instanceof Error ? err.message : String(err) };
    }

    // 4c. Try creating user with that specific email via raw SQL
    let specificCreateTest = null;
    try {
      const result = await conn.queryObject(`
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'laboneteianben@gmail.com', crypt('testpass123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
        RETURNING id;
      `);
      const newId = (result.rows[0] as { id: string })?.id;
      specificCreateTest = { success: true, id: newId };
      // Clean up
      await conn.queryObject(`DELETE FROM auth.users WHERE id = $1`, [newId]);
    } catch (err) {
      specificCreateTest = { success: false, error: err instanceof Error ? err.message : String(err) };
    }

    // 4d. Check auth.users instance_id value (GoTrue uses this)
    let instanceId = null;
    try {
      const r = await conn.queryObject(`SELECT DISTINCT instance_id FROM auth.users LIMIT 5`);
      instanceId = r.rows;
    } catch (err) {
      instanceId = err instanceof Error ? err.message : String(err);
    }

    // 5. Check teams table structure (are there constraints that might fail?)
    const teamsConstraints = await conn.queryObject(`
      SELECT conname, contype, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'public.teams'::regclass
      ORDER BY conname;
    `);

    // 6. Check auth.identities table triggers
    const identityTriggers = await conn.queryObject(`
      SELECT 
        t.tgname AS trigger_name,
        p.proname AS function_name,
        n.nspname AS function_schema,
        t.tgenabled AS enabled
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace ns ON c.relnamespace = ns.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE ns.nspname = 'auth' AND c.relname = 'identities'
        AND NOT t.tgisinternal
      ORDER BY t.tgname;
    `);

    // 7. Check auth schema columns to see if there's a mismatch
    const authColumns = await conn.queryObject(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'auth' AND table_name IN ('users', 'identities')
      ORDER BY table_name, ordinal_position;
    `);

    // 8. Check auth.schema_migrations for version
    let schemaMigrations = null;
    try {
      const migResult = await conn.queryObject(`
        SELECT version FROM auth.schema_migrations ORDER BY version DESC LIMIT 5;
      `);
      schemaMigrations = migResult.rows;
    } catch (_) {
      schemaMigrations = "could not query";
    }

    // 9. Try using the supabase auth API approach
    let authTest = null;
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // STEP A: Drop BOTH duplicate triggers that update public.teams from auth.users
      // GoTrue's transaction can't handle cross-schema updates in triggers
      let dropResult = "not attempted";
      try {
        await conn.queryObject(`DROP TRIGGER IF EXISTS link_team_to_auth_user_trigger ON auth.users;`);
        await conn.queryObject(`DROP FUNCTION IF EXISTS public.link_team_to_auth_user();`);
        await conn.queryObject(`DROP TRIGGER IF EXISTS on_auth_user_created_link_to_team ON auth.users;`);
        await conn.queryObject(`DROP FUNCTION IF EXISTS public.auto_link_user_to_team();`);
        dropResult = "dropped BOTH triggers successfully";
      } catch (err) {
        dropResult = "drop failed: " + (err instanceof Error ? err.message : String(err));
      }

      // Verify triggers are gone
      let remainingTriggers = null;
      try {
        const r = await conn.queryObject(`
          SELECT t.tgname FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_namespace ns ON c.relnamespace = ns.oid
          WHERE ns.nspname = 'auth' AND c.relname = 'users' AND NOT t.tgisinternal
        `);
        remainingTriggers = r.rows;
      } catch (_) { /* ignore */ }

      // STEP B: Now test createUser with the specific problematic email
      const targetEmail = "laboneteianben@gmail.com";
      
      const { data: signUpData, error: signUpError } = await adminClient.auth.admin.createUser({
        email: targetEmail,
        password: "TestPass123!",
        email_confirm: true,
      });

      if (signUpError) {
        authTest = { 
          dropResult, remainingTriggers,
          success: false, email: targetEmail, error: signUpError.message, status: signUpError.status 
        };
      } else {
        authTest = { 
          dropResult, remainingTriggers,
          success: true, email: targetEmail, userId: signUpData.user?.id 
        };
        // Don't delete — keep the user
      }
    } catch (err) {
      authTest = { success: false, error: err instanceof Error ? err.message : String(err) };
    }

    return new Response(JSON.stringify({
      triggers: triggerResult.rows,
      trigger_functions: functions,
      related_tables: tablesResult.rows,
      test_create_user: createError,
      email_check: emailCheck,
      specific_create_test: specificCreateTest,
      instance_ids: instanceId,
      teams_constraints: teamsConstraints.rows,
      identity_triggers: identityTriggers.rows,
      auth_schema_migrations: schemaMigrations,
      auth_admin_create_user_test: authTest,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    conn.release();
    await pool.end();
  }
});
