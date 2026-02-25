import { supabase } from './supabaseClient';
import type { Incubatee, Founder } from '../components/IncubateeTable';

// ─── Database row interfaces ───────────────────────────────────

interface FounderRow {
  id: number;
  incubatee_id: number | null;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface IncubateeRow {
  id: number;
  startup_name: string;
  cohort_level: number;
  startup_description: string;
  status: string;
  is_active: boolean;
  founders?: FounderRow[];
}

// ─── Row → Model mappers ──────────────────────────────────────

function mapFounderRow(row: FounderRow): Founder {
  return {
    id: row.id.toString(),
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
  };
}

function mapIncubateeRow(row: IncubateeRow): Incubatee {
  return {
    id: row.id.toString(),
    startupName: row.startup_name,
    cohortLevel: row.cohort_level as 1 | 2 | 3 | 4,
    startupDescription: row.startup_description,
    status: row.status as Incubatee['status'],
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

  // 1. Upsert the incubatee row
  const incubateePayload: Record<string, unknown> = {
    startup_name: incubatee.startupName,
    cohort_level: incubatee.cohortLevel,
    startup_description: incubatee.startupDescription,
    status: incubatee.status,
    is_active: true,
  };

  let savedIncubateeId: number;

  if (isNew) {
    const { data, error } = await supabase
      .from('incubatees')
      .insert(incubateePayload)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error creating incubatee:', error);
      throw error;
    }
    savedIncubateeId = data.id;
    console.log('✅ Created incubatee:', savedIncubateeId);
  } else {
    savedIncubateeId = parseInt(incubatee.id, 10);
    const { error } = await supabase
      .from('incubatees')
      .update(incubateePayload)
      .eq('id', savedIncubateeId);

    if (error) {
      console.error('❌ Error updating incubatee:', error);
      throw error;
    }
    console.log('✅ Updated incubatee:', savedIncubateeId);
  }

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
      role: f.role,
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
        role: founder.role,
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
        role: founder.role,
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
      role: founder.role,
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
      role: founder.role,
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
