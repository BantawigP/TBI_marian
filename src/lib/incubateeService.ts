import { supabase } from './supabaseClient';
import type { Incubatee, Founder } from '../components/IncubateeTable';

// ─── Database row interfaces ───────────────────────────────────

interface FounderRow {
  id: number;
  incubatee_id: number | null;
  name: string;
  email: string;
  phone: string;
  role: string;       // legacy column kept for backward compat
  roles?: string[];   // new array column
}

interface IncubateeRow {
  id: number;
  startup_name: string;
  cohort_level: number[] | number;
  startup_description: string;
  google_drive_link?: string;
  notes?: string;
  status: string;
  is_active: boolean;
  founders?: FounderRow[];
}

// ─── Row → Model mappers ──────────────────────────────────────

function mapFounderRow(row: FounderRow): Founder {
  // Prefer the new roles[] column; fall back to wrapping the legacy role string
  const roles: string[] =
    Array.isArray(row.roles) && row.roles.length > 0
      ? row.roles
      : row.role
      ? [row.role]
      : [];
  return {
    id: row.id.toString(),
    name: row.name,
    email: row.email,
    phone: row.phone,
    roles,
  };
}

function mapIncubateeRow(row: IncubateeRow): Incubatee {
  return {
    id: row.id.toString(),
    startupName: row.startup_name,
    cohortLevel: Array.isArray(row.cohort_level) ? row.cohort_level : [row.cohort_level],
    startupDescription: row.startup_description,
    googleDriveLink: row.google_drive_link || '',
    notes: row.notes || '',
    status: row.status as string,
    founders: (row.founders || []).map(mapFounderRow),
  };
}

// ─── FETCH ─────────────────────────────────────────────────────

/**
 * Fetch all active incubatees with their founders.
 */
export async function fetchIncubatees(): Promise<Incubatee[]> {
  console.log('🔍 Fetching incubatees from database...');

  const { data, error } = await supabase
    .from('incubatees')
    .select('*, founders(*)')
    .or('is_active.eq.true,is_active.is.null')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching incubatees:', error);
    throw error;
  }

  console.log('✅ Fetched incubatees:', data?.length || 0);
  return (data || []).map(mapIncubateeRow);
}

/**
 * Fetch founders that are NOT assigned to any incubatee (incubatee_id IS NULL).
 */
export async function fetchUnassignedFounders(): Promise<Founder[]> {
  console.log('🔍 Fetching unassigned founders from database...');

  const { data, error } = await supabase
    .from('founders')
    .select('*')
    .is('incubatee_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching unassigned founders:', error);
    throw error;
  }

  console.log('✅ Fetched unassigned founders:', data?.length || 0);
  return (data || []).map(mapFounderRow);
}

// ─── CREATE / UPDATE an Incubatee ──────────────────────────────

/**
 * Persist (create or update) an incubatee and its founders.
 * Returns the saved Incubatee with DB-generated IDs.
 */
export async function saveIncubatee(incubatee: Incubatee): Promise<Incubatee> {
  const isNew = !incubatee.id || incubatee.id.startsWith('inc_');

  // 1. Build the incubatee payload
  const incubateePayload: Record<string, unknown> = {
    startup_name: incubatee.startupName,
    cohort_level: incubatee.cohortLevel,
    startup_description: incubatee.startupDescription,
    google_drive_link: incubatee.googleDriveLink || null,
    notes: incubatee.notes || null,
    status: incubatee.status,
    is_active: true,
  };

  let savedIncubateeId: number;

  // Helper: attempt insert or update, retrying without unsupported columns if needed
  const attemptSave = async (payload: Record<string, unknown>): Promise<number> => {
    if (isNew) {
      const { data, error } = await supabase
        .from('incubatees')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } else {
      const id = parseInt(incubatee.id, 10);
      const { error } = await supabase
        .from('incubatees')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      return id;
    }
  };

  try {
    savedIncubateeId = await attemptSave(incubateePayload);
  } catch (err: unknown) {
    // If the error is about an unknown column (notes or google_drive_link), retry without those columns
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('notes') || msg.includes('google_drive_link')) {
      console.warn('⚠️ Column missing in DB, retrying without optional columns:', msg);
      const fallbackPayload = { ...incubateePayload };
      delete fallbackPayload.notes;
      delete fallbackPayload.google_drive_link;
      try {
        savedIncubateeId = await attemptSave(fallbackPayload);
      } catch (retryErr) {
        console.error('❌ Error saving incubatee (retry):', retryErr);
        throw retryErr;
      }
    } else {
      console.error('❌ Error saving incubatee:', err);
      throw err;
    }
  }
  console.log(isNew ? '✅ Created incubatee:' : '✅ Updated incubatee:', savedIncubateeId);

  // 2. Sync founders
  await syncFounders(savedIncubateeId, incubatee.founders);

  // 3. Re-fetch the complete incubatee with founders
  const { data: refreshed, error: fetchErr } = await supabase
    .from('incubatees')
    .select('*, founders(*)')
    .eq('id', savedIncubateeId)
    .single();

  if (fetchErr) {
    console.error('❌ Error re-fetching incubatee:', fetchErr);
    throw fetchErr;
  }

  return mapIncubateeRow(refreshed);
}

// ─── SYNC FOUNDERS ─────────────────────────────────────────────

/**
 * Reconcile the founders list for a given incubatee:
 * - Insert new founders (local IDs starting with "founder_" or "f-")
 * - Update existing founders
 * - Delete removed founders
 */
async function syncFounders(incubateeId: number, founders: Founder[]): Promise<void> {
  // Get current founders from DB
  const { data: existing, error: fetchErr } = await supabase
    .from('founders')
    .select('id')
    .eq('incubatee_id', incubateeId);

  if (fetchErr) {
    console.error('❌ Error fetching existing founders:', fetchErr);
    throw fetchErr;
  }

  const existingIds = new Set((existing || []).map((f: { id: number }) => f.id));
  const isLocalId = (id: string) => id.startsWith('founder_') || id.startsWith('f-');

  // Categorize
  const toInsert: Founder[] = [];
  const toUpdate: Founder[] = [];
  const toReassign: Founder[] = [];  // existing DB founders being moved to this incubatee
  const keptIds = new Set<number>();

  for (const founder of founders) {
    if (isLocalId(founder.id)) {
      toInsert.push(founder);
    } else {
      const numId = parseInt(founder.id, 10);
      if (existingIds.has(numId)) {
        toUpdate.push(founder);
        keptIds.add(numId);
      } else if (Number.isFinite(numId)) {
        // Existing DB founder being reassigned to this incubatee
        toReassign.push(founder);
        keptIds.add(numId);
      } else {
        // New founder with unexpected ID format, insert it
        toInsert.push(founder);
      }
    }
  }

  // IDs that are in DB but NOT in the incoming list → delete
  const toDeleteIds = [...existingIds].filter((id) => !keptIds.has(id));

  // Execute deletes
  if (toDeleteIds.length > 0) {
    const { error } = await supabase
      .from('founders')
      .delete()
      .in('id', toDeleteIds);

    if (error) console.error('❌ Error deleting founders:', error);
    else console.log(`🗑️ Deleted ${toDeleteIds.length} founder(s)`);
  }

  // Execute inserts
  if (toInsert.length > 0) {
    const rows = toInsert.map((f) => ({
      incubatee_id: incubateeId,
      name: f.name,
      email: f.email,
      phone: f.phone,
      role: (f.roles ?? [])[0] ?? '',  // legacy column
      roles: f.roles ?? [],
    }));

    const { error } = await supabase.from('founders').insert(rows);
    if (error) console.error('❌ Error inserting founders:', error);
    else console.log(`➕ Inserted ${rows.length} founder(s)`);
  }

  // Execute updates
  for (const founder of toUpdate) {
    const { error } = await supabase
      .from('founders')
      .update({
        name: founder.name,
        email: founder.email,
        phone: founder.phone,
        role: (founder.roles ?? [])[0] ?? '',
        roles: founder.roles ?? [],
      })
      .eq('id', parseInt(founder.id, 10));

    if (error) console.error(`❌ Error updating founder ${founder.id}:`, error);
  }

  if (toUpdate.length > 0) {
    console.log(`✏️ Updated ${toUpdate.length} founder(s)`);
  }

  // Execute reassignments (move existing founders to this incubatee)
  for (const founder of toReassign) {
    const { error } = await supabase
      .from('founders')
      .update({
        incubatee_id: incubateeId,
        name: founder.name,
        email: founder.email,
        phone: founder.phone,
        role: (founder.roles ?? [])[0] ?? '',
        roles: founder.roles ?? [],
      })
      .eq('id', parseInt(founder.id, 10));

    if (error) console.error(`❌ Error reassigning founder ${founder.id}:`, error);
  }

  if (toReassign.length > 0) {
    console.log(`🔄 Reassigned ${toReassign.length} founder(s) to incubatee ${incubateeId}`);
  }
}

// ─── DELETE (soft) ─────────────────────────────────────────────

/**
 * Soft-delete incubatees by setting is_active = false.
 */
export async function deleteIncubatees(ids: string[]): Promise<void> {
  const numericIds = ids.map((id) => parseInt(id, 10)).filter(Number.isFinite);
  if (numericIds.length === 0) return;

  const { error } = await supabase
    .from('incubatees')
    .update({ is_active: false })
    .in('id', numericIds);

  if (error) {
    console.error('❌ Error soft-deleting incubatees:', error);
    throw error;
  }

  console.log(`🗑️ Soft-deleted ${numericIds.length} incubatee(s)`);
}

// ─── FETCH ARCHIVED ────────────────────────────────────────────

/**
 * Fetch all archived (soft-deleted) incubatees with their founders.
 */
export async function fetchArchivedIncubatees(): Promise<Incubatee[]> {
  console.log('🔍 Fetching archived incubatees...');

  const { data, error } = await supabase
    .from('incubatees')
    .select('*, founders(*)')
    .eq('is_active', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching archived incubatees:', error);
    throw error;
  }

  console.log('✅ Fetched archived incubatees:', data?.length || 0);
  return (data || []).map(mapIncubateeRow);
}

// ─── RESTORE ───────────────────────────────────────────────────

/**
 * Restore soft-deleted incubatees by setting is_active = true.
 */
export async function restoreIncubatees(ids: string[]): Promise<void> {
  const numericIds = ids.map((id) => parseInt(id, 10)).filter(Number.isFinite);
  if (numericIds.length === 0) return;

  const { error } = await supabase
    .from('incubatees')
    .update({ is_active: true })
    .in('id', numericIds);

  if (error) {
    console.error('❌ Error restoring incubatees:', error);
    throw error;
  }

  console.log(`✅ Restored ${numericIds.length} incubatee(s)`);
}

// ─── PERMANENT DELETE ──────────────────────────────────────────

/**
 * Permanently delete an incubatee and its founders from the database.
 */
export async function deleteIncubateePermanently(id: string): Promise<void> {
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) return;

  // Detach founders (set incubatee_id to null) so they survive as unassigned
  const { error: founderErr } = await supabase
    .from('founders')
    .update({ incubatee_id: null })
    .eq('incubatee_id', numericId);

  if (founderErr) {
    console.error('❌ Error detaching founders from incubatee:', founderErr);
    throw founderErr;
  }

  const { error } = await supabase
    .from('incubatees')
    .delete()
    .eq('id', numericId);

  if (error) {
    console.error('❌ Error permanently deleting incubatee:', error);
    throw error;
  }

  console.log(`🗑️ Permanently deleted incubatee ${numericId}, founders preserved`);
}

// ─── ADD FOUNDER to existing Incubatee ─────────────────────────

/**
 * Insert a single founder into an existing incubatee.
 * Returns the saved founder with a DB-generated ID.
 */
export async function addFounderToIncubatee(
  incubateeId: string,
  founder: Founder
): Promise<Founder> {
  const numericIncubateeId = incubateeId ? parseInt(incubateeId, 10) : null;
  const resolvedId = numericIncubateeId !== null && Number.isFinite(numericIncubateeId)
    ? numericIncubateeId
    : null;

  const { data, error } = await supabase
    .from('founders')
    .insert({
      incubatee_id: resolvedId,
      name: founder.name,
      email: founder.email,
      phone: founder.phone,
      role: (founder.roles ?? [])[0] ?? '',
      roles: founder.roles ?? [],
    })
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error adding founder:', error);
    throw error;
  }

  console.log('✅ Added founder:', data.id);
  return mapFounderRow(data);
}

// ─── UPDATE a single Founder ───────────────────────────────────

/**
 * Update a founder's details in the database.
 */
export async function updateFounder(founder: Founder): Promise<Founder> {
  const numericId = parseInt(founder.id, 10);

  const { data, error } = await supabase
    .from('founders')
    .update({
      name: founder.name,
      email: founder.email,
      phone: founder.phone,
      role: (founder.roles ?? [])[0] ?? '',
      roles: founder.roles ?? [],
    })
    .eq('id', numericId)
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error updating founder:', error);
    throw error;
  }

  console.log('✅ Updated founder:', data.id);
  return mapFounderRow(data);
}

// ─── DELETE Founders ───────────────────────────────────────────

/**
 * Permanently delete founders by their IDs.
 */
export async function deleteFounders(ids: string[]): Promise<void> {
  const numericIds = ids.map((id) => parseInt(id, 10)).filter(Number.isFinite);
  if (numericIds.length === 0) return;

  const { error } = await supabase
    .from('founders')
    .delete()
    .in('id', numericIds);

  if (error) {
    console.error('❌ Error deleting founders:', error);
    throw error;
  }

  console.log(`🗑️ Deleted ${numericIds.length} founder(s)`);
}

/**
 * Find a founder by name and email — used for duplicate detection before adding.
 */
export async function findFounderByNameAndEmail(
  name: string,
  email: string
): Promise<Founder | null> {
  const { data, error } = await supabase
    .from('founders')
    .select('*')
    .ilike('name', name.trim())
    .ilike('email', email.trim())
    .maybeSingle();

  if (error) {
    console.error('❌ Error finding founder by name/email:', error);
    return null;
  }

  return data ? mapFounderRow(data as FounderRow) : null;
}

/**
 * Link an existing founder to an incubatee by updating incubatee_id.
 */
export async function linkFounderToIncubatee(
  founderId: string,
  incubateeId: string
): Promise<void> {
  const numericFounderId = parseInt(founderId, 10);
  const numericIncubateeId = incubateeId ? parseInt(incubateeId, 10) : null;

  const { error } = await supabase
    .from('founders')
    .update({ incubatee_id: numericIncubateeId })
    .eq('id', numericFounderId);

  if (error) {
    console.error('❌ Error linking founder to incubatee:', error);
    throw error;
  }

  console.log(`🔗 Linked founder ${founderId} to incubatee ${incubateeId}`);
}

/**
 * Detach founders from their incubatees by setting incubatee_id = null.
 * Used when archiving founders — they remain in the DB as unassigned.
 */
export async function unassignFounders(ids: string[]): Promise<void> {
  const numericIds = ids.map((id) => parseInt(id, 10)).filter(Number.isFinite);
  if (numericIds.length === 0) return;

  const { error } = await supabase
    .from('founders')
    .update({ incubatee_id: null })
    .in('id', numericIds);

  if (error) {
    console.error('❌ Error unassigning founders:', error);
    throw error;
  }

  console.log(`📦 Unassigned (archived) ${numericIds.length} founder(s)`);
}

// ─── COHORT LEVELS ─────────────────────────────────────────────

export interface CohortLevelOption {
  id: number;
  level: number;
}

/**
 * Fetch all cohort levels from the cohort_levels table.
 * Falls back to default [1,2,3,4] if the table doesn't exist or is empty.
 */
export async function fetchCohortLevels(): Promise<CohortLevelOption[]> {
  try {
    const { data, error } = await supabase
      .from('cohort_levels')
      .select('id, level')
      .order('level', { ascending: true });

    if (error) {
      console.warn('⚠️ Could not fetch cohort_levels, using defaults:', error.message);
      return [1, 2, 3, 4].map((l, i) => ({ id: i + 1, level: l }));
    }

    if (!data || data.length === 0) {
      return [1, 2, 3, 4].map((l, i) => ({ id: i + 1, level: l }));
    }

    return data as CohortLevelOption[];
  } catch {
    return [1, 2, 3, 4].map((l, i) => ({ id: i + 1, level: l }));
  }
}

/**
 * Add a new cohort level to the database. Returns the saved option.
 */
export async function addCohortLevel(level: number): Promise<CohortLevelOption> {
  try {
    const { data, error } = await supabase
      .from('cohort_levels')
      .upsert({ level }, { onConflict: 'level' })
      .select('id, level')
      .single();

    if (error) {
      console.warn('⚠️ Could not save cohort level to DB:', error.message);
      return { id: 0, level };
    }

    console.log('✅ Added cohort level:', data.level);
    return data as CohortLevelOption;
  } catch {
    console.warn('⚠️ Could not save cohort level to DB');
    return { id: 0, level };
  }
}

// ─── STATUS OPTIONS ────────────────────────────────────────────

export interface StatusOption {
  id: number;
  name: string;
}

const DEFAULT_STATUSES = ['Applicant', 'Incubatee', 'Incubatee Extended', 'Graduate'];

/**
 * Fetch all status options from the incubatee_statuses table.
 * Falls back to defaults if the table doesn't exist or is empty.
 */
export async function fetchStatusOptions(): Promise<StatusOption[]> {
  try {
    const { data, error } = await supabase
      .from('incubatee_statuses')
      .select('id, name')
      .order('id', { ascending: true });

    if (error) {
      console.warn('⚠️ Could not fetch incubatee_statuses, using defaults:', error.message);
      return DEFAULT_STATUSES.map((s, i) => ({ id: i + 1, name: s }));
    }

    if (!data || data.length === 0) {
      return DEFAULT_STATUSES.map((s, i) => ({ id: i + 1, name: s }));
    }

    return data as StatusOption[];
  } catch {
    return DEFAULT_STATUSES.map((s, i) => ({ id: i + 1, name: s }));
  }
}

/**
 * Add a new status option to the database. Returns the saved option.
 */
export async function addStatusOption(name: string): Promise<StatusOption> {
  try {
    const { data, error } = await supabase
      .from('incubatee_statuses')
      .upsert({ name }, { onConflict: 'name' })
      .select('id, name')
      .single();

    if (error) {
      console.warn('⚠️ Could not save status option to DB:', error.message);
      return { id: 0, name };
    }

    console.log('✅ Added status option:', data.name);
    return data as StatusOption;
  } catch {
    console.warn('⚠️ Could not save status option to DB');
    return { id: 0, name };
  }
}
