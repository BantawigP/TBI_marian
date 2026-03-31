/**
 * Mock Supabase client for the cloned (backend-free) version.
 *
 * This replaces @supabase/supabase-js with an in-memory implementation so the
 * entire app can be run without any Supabase project or environment variables.
 *
 * All table data lives in `mockStore`. Mutations (insert/update/delete/upsert)
 * are reflected immediately in memory so the UI stays reactive during a session
 * (data resets on page refresh, which is expected for a preview build).
 */

// ─── In-memory data store ────────────────────────────────────────────────────

const mockStore: Record<string, Record<string, unknown>[]> = {
  teams: [
    {
      id: 1,
      user_id: 'mock-user-id-demo',
      email: 'admin@demo.com',
      first_name: 'Demo',
      last_name: 'Admin',
      has_access: true,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      roles: { id: 1, role_name: 'Admin' },
      departments: { id: 1, department_name: 'Management' },
    },
    {
      id: 2,
      user_id: null,
      email: 'manager@demo.com',
      first_name: 'Jane',
      last_name: 'Manager',
      has_access: true,
      is_active: true,
      created_at: '2024-02-01T00:00:00Z',
      roles: { id: 2, role_name: 'Manager' },
      departments: { id: 2, department_name: 'Operations' },
    },
    {
      id: 3,
      user_id: null,
      email: 'member@demo.com',
      first_name: 'Mark',
      last_name: 'Member',
      has_access: true,
      is_active: true,
      created_at: '2024-03-01T00:00:00Z',
      roles: { id: 3, role_name: 'Member' },
      departments: { id: 2, department_name: 'Operations' },
    },
  ],
  alumni: [
    {
      alumni_id: 1,
      f_name: 'Juan',
      l_name: 'Santos',
      date_graduated: '2023-03-15',
      email_id: 1,
      contact_number: '09171234567',
      alumni_type_id: 1,
      college_id: 1,
      program_id: 1,
      company_id: 1,
      occupation_id: 1,
      is_active: true,
      alumniaddress_id: null,
      colleges: { college_id: 1, college_name: 'College of Engineering' },
      programs: { program_id: 1, program_name: 'BS Computer Science' },
      companies: { company_id: 1, company_name: 'TechCorp PH' },
      occupations: { occupation_id: 1, occupation_title: 'Software Engineer' },
      email_address: { email_id: 1, email: 'juan.santos@email.com', status: true },
      alumni_types: { id: 1, name: 'graduate' },
    },
    {
      alumni_id: 2,
      f_name: 'Maria',
      l_name: 'Reyes',
      date_graduated: '2022-10-20',
      email_id: 2,
      contact_number: '09289876543',
      alumni_type_id: 2,
      college_id: 2,
      program_id: 2,
      company_id: null,
      occupation_id: null,
      is_active: true,
      alumniaddress_id: null,
      colleges: { college_id: 2, college_name: 'College of Business' },
      programs: { program_id: 2, program_name: 'BS Business Administration' },
      companies: null,
      occupations: null,
      email_address: { email_id: 2, email: 'maria.reyes@email.com', status: false },
      alumni_types: { id: 2, name: 'marian_graduate' },
    },
    {
      alumni_id: 3,
      f_name: 'Pedro',
      l_name: 'Cruz',
      date_graduated: '2024-04-10',
      email_id: 3,
      contact_number: '09351112233',
      alumni_type_id: 1,
      college_id: 3,
      program_id: 3,
      company_id: 2,
      occupation_id: 2,
      is_active: true,
      alumniaddress_id: null,
      colleges: { college_id: 3, college_name: 'College of Arts and Sciences' },
      programs: { program_id: 3, program_name: 'BS Information Technology' },
      companies: { company_id: 2, company_name: 'InnovatePH' },
      occupations: { occupation_id: 2, occupation_title: 'IT Specialist' },
      email_address: { email_id: 3, email: 'pedro.cruz@email.com', status: true },
      alumni_types: { id: 1, name: 'graduate' },
    },
  ],
  events: [
    {
      event_id: 1,
      title: 'Annual Alumni Homecoming 2024',
      description: 'Join us for our annual alumni gathering to reconnect with batchmates and celebrate the achievements of our graduates.',
      event_date: '2024-12-15',
      event_time: '09:00',
      location_id: 1,
      is_active: true,
      locations: { location_id: 1, name: 'Marian Convention Center', city: 'Quezon City', country: 'Philippines' },
      event_participants: [],
    },
  ],
  incubatees: [
    {
      id: 1,
      startup_name: 'AgroTech Solutions',
      cohort_level: [1, 2],
      startup_description: 'A startup focused on precision agriculture using IoT sensors and AI-driven insights.',
      google_drive_link: '',
      notes: 'Promising team with strong technical background.',
      status: 'Active',
      is_active: true,
      founders: [
        { id: 1, incubatee_id: 1, name: 'Carlos Dela Cruz', email: 'carlos@agrotech.ph', phone: '09171112222', role: 'CEO', roles: ['CEO', 'Co-Founder'] },
      ],
    },
    {
      id: 2,
      startup_name: 'EduBridge PH',
      cohort_level: [2],
      startup_description: 'An e-learning platform connecting students in remote areas to quality education resources.',
      google_drive_link: '',
      notes: '',
      status: 'Graduated',
      is_active: true,
      founders: [
        { id: 2, incubatee_id: 2, name: 'Ana Lim', email: 'ana@edubridge.ph', phone: '09282223333', role: 'CEO', roles: ['CEO'] },
        { id: 3, incubatee_id: 2, name: 'Ben Torres', email: 'ben@edubridge.ph', phone: '09353334444', role: 'CTO', roles: ['CTO', 'Co-Founder'] },
      ],
    },
  ],
  founders: [
    { id: 1, incubatee_id: 1, name: 'Carlos Dela Cruz', email: 'carlos@agrotech.ph', phone: '09171112222', role: 'CEO', roles: ['CEO', 'Co-Founder'] },
    { id: 2, incubatee_id: 2, name: 'Ana Lim', email: 'ana@edubridge.ph', phone: '09282223333', role: 'CEO', roles: ['CEO'] },
    { id: 3, incubatee_id: 2, name: 'Ben Torres', email: 'ben@edubridge.ph', phone: '09353334444', role: 'CTO', roles: ['CTO', 'Co-Founder'] },
  ],
  roles: [
    { id: 1, role_name: 'Admin' },
    { id: 2, role_name: 'Manager' },
    { id: 3, role_name: 'Member' },
  ],
  departments: [
    { id: 1, department_name: 'Management' },
    { id: 2, department_name: 'Operations' },
    { id: 3, department_name: 'Finance' },
  ],
  colleges: [
    { college_id: 1, college_name: 'College of Engineering' },
    { college_id: 2, college_name: 'College of Business' },
    { college_id: 3, college_name: 'College of Arts and Sciences' },
    { college_id: 4, college_name: 'College of Education' },
  ],
  programs: [
    { program_id: 1, program_name: 'BS Computer Science' },
    { program_id: 2, program_name: 'BS Business Administration' },
    { program_id: 3, program_name: 'BS Information Technology' },
    { program_id: 4, program_name: 'BS Secondary Education' },
  ],
  companies: [
    { company_id: 1, company_name: 'TechCorp PH' },
    { company_id: 2, company_name: 'InnovatePH' },
  ],
  occupations: [
    { occupation_id: 1, occupation_title: 'Software Engineer' },
    { occupation_id: 2, occupation_title: 'IT Specialist' },
  ],
  locations: [
    { location_id: 1, name: 'Marian Convention Center', city: 'Quezon City', country: 'Philippines' },
  ],
  email_address: [
    { email_id: 1, email: 'juan.santos@email.com', status: true },
    { email_id: 2, email: 'maria.reyes@email.com', status: false },
    { email_id: 3, email: 'pedro.cruz@email.com', status: true },
  ],
  alumni_types: [
    { id: 1, name: 'graduate' },
    { id: 2, name: 'marian_graduate' },
  ],
  alumni_addresses: [],
  event_participants: [],
  assessments: [],
  cohort_levels: [
    { id: 1, label: 'Cohort 1' },
    { id: 2, label: 'Cohort 2' },
    { id: 3, label: 'Cohort 3' },
  ],
  status_options: [
    { id: 1, label: 'Active' },
    { id: 2, label: 'Graduated' },
    { id: 3, label: 'Inactive' },
  ],
};

// ─── Query Builder ────────────────────────────────────────────────────────────

type FilterFn = (row: Record<string, unknown>) => boolean;
type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

let _mockIdCounter = 1000;
const nextId = () => ++_mockIdCounter;

class MockQueryBuilder {
  private _table: string;
  private _filters: FilterFn[] = [];
  private _operation: Operation = 'select';
  private _insertPayload: Record<string, unknown>[] = [];
  private _updatePayload: Record<string, unknown> = {};
  private _upsertPayload: Record<string, unknown>[] = [];
  private _upsertConflictCol = '';
  private _singleMode: '' | 'single' | 'maybeSingle' = '';
  private _orderBy: { col: string; ascending: boolean }[] = [];
  private _limitN: number | null = null;

  constructor(table: string) {
    this._table = table;
  }

  select(_cols = '*'): this {
    return this;
  }

  eq(col: string, val: unknown): this {
    this._filters.push((row) => row[col] === val);
    return this;
  }

  neq(col: string, val: unknown): this {
    this._filters.push((row) => row[col] !== val);
    return this;
  }

  is(col: string, val: unknown): this {
    this._filters.push((row) =>
      val === null ? row[col] == null : row[col] === val
    );
    return this;
  }

  ilike(col: string, pattern: string): this {
    const term = pattern.replace(/%/g, '').toLowerCase();
    this._filters.push((row) =>
      String(row[col] ?? '').toLowerCase().includes(term)
    );
    return this;
  }

  in(col: string, vals: unknown[]): this {
    this._filters.push((row) => vals.includes(row[col]));
    return this;
  }

  /**
   * Simplified OR parser for patterns used in this app such as:
   *   "is_active.eq.true,is_active.is.null"
   */
  or(condition: string): this {
    const parts = condition.split(',').map((p) => p.trim());
    const fns: FilterFn[] = [];
    let allParsed = true;

    for (const part of parts) {
      const match = part.match(/^(\w+)\.(eq|neq|is)\.(true|false|null|\S+)$/);
      if (!match) { allParsed = false; break; }
      const [, col, op, raw] = match;
      const val = raw === 'null' ? null : raw === 'true' ? true : raw === 'false' ? false : raw;
      if (op === 'eq') fns.push((row) => row[col] === val);
      else if (op === 'neq') fns.push((row) => row[col] !== val);
      else if (op === 'is') fns.push((row) => (val === null ? row[col] == null : row[col] === val));
      else { allParsed = false; break; }
    }

    if (allParsed && fns.length > 0) {
      this._filters.push((row) => fns.some((fn) => fn(row)));
    }
    return this;
  }

  not(_col: string, _op: string, _val: unknown): this {
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this._orderBy.push({ col, ascending: opts?.ascending !== false });
    return this;
  }

  limit(n: number): this {
    this._limitN = n;
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]): this {
    this._operation = 'insert';
    this._insertPayload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(payload: Record<string, unknown>): this {
    this._operation = 'update';
    this._updatePayload = payload;
    return this;
  }

  delete(): this {
    this._operation = 'delete';
    return this;
  }

  upsert(payload: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }): this {
    this._operation = 'upsert';
    this._upsertPayload = Array.isArray(payload) ? payload : [payload];
    this._upsertConflictCol = opts?.onConflict ?? 'id';
    return this;
  }

  single(): Promise<{ data: Record<string, unknown> | null; error: null }> {
    this._singleMode = 'single';
    return Promise.resolve(this._execute() as { data: Record<string, unknown> | null; error: null });
  }

  maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: null }> {
    this._singleMode = 'maybeSingle';
    return Promise.resolve(this._execute() as { data: Record<string, unknown> | null; error: null });
  }

  then(
    onfulfilled?: (value: { data: unknown; error: null }) => unknown,
    onrejected?: (reason: unknown) => unknown
  ): Promise<unknown> {
    return Promise.resolve(this._execute()).then(onfulfilled, onrejected);
  }

  private _execute(): { data: unknown; error: null } {
    if (!mockStore[this._table]) {
      mockStore[this._table] = [];
    }
    const tableData = mockStore[this._table]!;

    if (this._operation === 'select') {
      let results = tableData.filter((row) =>
        this._filters.every((fn) => fn(row as Record<string, unknown>))
      );

      if (this._orderBy.length > 0) {
        results = [...results].sort((a, b) => {
          for (const { col, ascending } of this._orderBy) {
            const av = (a as Record<string, unknown>)[col];
            const bv = (b as Record<string, unknown>)[col];
            if (av == null && bv == null) continue;
            if (av == null) return ascending ? 1 : -1;
            if (bv == null) return ascending ? -1 : 1;
            if (av < bv) return ascending ? -1 : 1;
            if (av > bv) return ascending ? 1 : -1;
          }
          return 0;
        });
      }

      if (this._limitN !== null) results = results.slice(0, this._limitN);

      if (this._singleMode) {
        return { data: (results[0] ?? null) as Record<string, unknown> | null, error: null };
      }
      return { data: results, error: null };
    }

    if (this._operation === 'insert') {
      const inserted = this._insertPayload.map((row) => {
        const newRow = { id: nextId(), ...row };
        tableData.push(newRow);
        return newRow;
      });
      if (this._singleMode) return { data: inserted[0] ?? null, error: null };
      return { data: inserted, error: null };
    }

    if (this._operation === 'update') {
      const updated: Record<string, unknown>[] = [];
      mockStore[this._table] = tableData.map((row) => {
        if (this._filters.every((fn) => fn(row as Record<string, unknown>))) {
          const updatedRow = { ...(row as Record<string, unknown>), ...this._updatePayload };
          updated.push(updatedRow);
          return updatedRow;
        }
        return row;
      });
      if (this._singleMode) return { data: updated[0] ?? null, error: null };
      return { data: updated, error: null };
    }

    if (this._operation === 'delete') {
      const deleted: Record<string, unknown>[] = [];
      mockStore[this._table] = tableData.filter((row) => {
        if (this._filters.every((fn) => fn(row as Record<string, unknown>))) {
          deleted.push(row as Record<string, unknown>);
          return false;
        }
        return true;
      });
      return { data: deleted, error: null };
    }

    if (this._operation === 'upsert') {
      const conflictCol = this._upsertConflictCol;
      const upserted: Record<string, unknown>[] = [];

      for (const row of this._upsertPayload) {
        const idx = conflictCol
          ? tableData.findIndex((r) => (r as Record<string, unknown>)[conflictCol] === row[conflictCol])
          : -1;

        if (idx >= 0) {
          const mergedRow = { ...(tableData[idx] as Record<string, unknown>), ...row };
          tableData[idx] = mergedRow;
          upserted.push(mergedRow);
        } else {
          const newRow = { id: nextId(), ...row };
          tableData.push(newRow);
          upserted.push(newRow);
        }
      }

      mockStore[this._table] = [...tableData];
      if (this._singleMode) return { data: upserted[0] ?? null, error: null };
      return { data: upserted, error: null };
    }

    return { data: null, error: null };
  }
}

// ─── Mock Auth ────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'mock-user-id-demo',
  email: 'admin@demo.com',
  user_metadata: { full_name: 'Demo Admin', has_password: true },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  identities: [],
};

const MOCK_SESSION = {
  access_token: 'mock-access-token-demo',
  refresh_token: 'mock-refresh-token-demo',
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  token_type: 'bearer',
  user: MOCK_USER,
};

type AuthChangeCallback = (event: string, session: typeof MOCK_SESSION | null) => void;
const authChangeSubscribers: AuthChangeCallback[] = [];

const mockAuth = {
  getSession: async () => ({ data: { session: MOCK_SESSION }, error: null }),
  getUser: async () => ({ data: { user: MOCK_USER }, error: null }),
  signInWithPassword: async (_creds: { email: string; password: string }) => ({
    data: { session: MOCK_SESSION, user: MOCK_USER },
    error: null,
  }),
  signInWithOAuth: async (_opts: { provider: string }) => ({
    data: { provider: 'google', url: null },
    error: null,
  }),
  signOut: async () => {
    authChangeSubscribers.forEach((cb) => cb('SIGNED_OUT', null));
    return { error: null };
  },
  updateUser: async (updates: Record<string, unknown>) => ({
    data: { user: { ...MOCK_USER, ...updates } },
    error: null,
  }),
  resetPasswordForEmail: async (_email: string) => ({ data: {}, error: null }),
  refreshSession: async () => ({
    data: { session: MOCK_SESSION, user: MOCK_USER },
    error: null,
  }),
  onAuthStateChange: (callback: AuthChangeCallback) => {
    authChangeSubscribers.push(callback);
    setTimeout(() => callback('INITIAL_SESSION', MOCK_SESSION), 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const idx = authChangeSubscribers.indexOf(callback);
            if (idx !== -1) authChangeSubscribers.splice(idx, 1);
          },
        },
      },
    };
  },
};

// ─── Mock Channel (Realtime) ──────────────────────────────────────────────────

const mockChannel = {
  on: (_event: string, _filter: unknown, _callback: unknown) => mockChannel,
  subscribe: (_callback?: unknown) => mockChannel,
  unsubscribe: () => Promise.resolve(),
};

// ─── Mock Edge Functions ──────────────────────────────────────────────────────

const mockFunctions = {
  invoke: async (_fn: string, _opts?: { body?: unknown; headers?: Record<string, string> }) => ({
    data: { success: true },
    error: null,
  }),
};

// ─── Mock RPC ─────────────────────────────────────────────────────────────────

const mockRpc = async (_fn: string, _params?: Record<string, unknown>) =>
  ({ data: null, error: null });

// ─── Exported mock client ─────────────────────────────────────────────────────

export const supabase = {
  from: (table: string) => new MockQueryBuilder(table),
  auth: mockAuth,
  functions: mockFunctions,
  rpc: mockRpc,
  channel: (_name: string) => mockChannel,
};
