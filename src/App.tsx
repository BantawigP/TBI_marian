import { useEffect, useRef, useState } from 'react';
import { Login } from './components/Login';
import { ClaimAccess } from './components/ClaimAccess';
import { Sidebar } from './components/Sidebar';
import { Home } from './components/Home';
import { Events } from './components/Events';
import { Archives } from './components/Archives';
import { CreateEvent } from './components/CreateEvent';
import { EditEvent } from './components/EditEvent';
import { ViewEvent } from './components/ViewEvent';
import { ContactsTable } from './components/ContactsTable';
import { ContactForm } from './components/ContactForm';
import { ViewContact } from './components/ViewContact';
import { ImportContact } from './components/ImportContact';
import { ExportContact } from './components/ExportContact';
import { FormPreview } from './components/FormPreview';
import { SearchBar } from './components/SearchBar';
import { Team } from './components/Team';
import { PopupDialog } from './components/PopupDialog';
import { PersonalSettings } from './components/PersonalSettings';
import { Incubatee, Founder } from './components/IncubateeTable';
import { IncubateeCards } from './components/IncubateeCards';
import { IncubateeForm } from './components/IncubateeForm';
import { ViewIncubatee } from './components/ViewIncubatee';
import { ViewFounder } from './components/ViewFounder';
import { AddFounderModal } from './components/AddFounderModal';
import { FoundersTable } from './components/FoundersTable';
import { Plus, Upload, Download, Trash2, LayoutGrid, List, Lightbulb } from 'lucide-react';
import type { Contact, ContactStatus, Event, RsvpStatus, AlumniType, TeamMember, TeamRole } from './types';
import { sendVerificationEmail } from './components/email/sendVerificationEmail';
import { supabase } from './lib/supabaseClient';
import { sendEventInvites } from './lib/eventInviteService';
import { updateEvent, deleteEventPermanently } from './lib/eventService';
import {
  fetchArchivedTeamMembers,
  restoreTeamMember,
  deleteTeamMemberPermanently,
} from './lib/teamService';
import { linkMyAccountToTeam } from './lib/linkAccountService';
import { setCachedSession, clearCachedSession } from './lib/sessionCache';
import {
  fetchIncubatees as fetchIncubateesFromSupabase,
  fetchUnassignedFounders as fetchUnassignedFoundersFromSupabase,
  saveIncubatee as persistIncubateeToSupabase,
  deleteIncubatees as deleteIncubateesFromSupabase,
  addFounderToIncubatee as addFounderToIncubateeInDb,
  updateFounder as updateFounderInDb,
} from './lib/incubateeService';

// Mock contacts - these will be replaced by database contacts after login
const initialContacts: Contact[] = [];
const defaultStatus: ContactStatus = 'Verified';

const numberOrNull = (value: string | number | undefined | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanPhone = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits || null;
};

const isRlsViolation = (error: any) => error?.code === '42501';

const ensureIdByName = async (
  table: string,
  nameColumn: string,
  idColumn: string,
  value?: string | null
): Promise<number | null> => {
  if (!value) return null;

  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select(idColumn)
    .eq(nameColumn, value)
    .maybeSingle();

  if (selectError && selectError.code !== 'PGRST116') {
    if (isRlsViolation(selectError)) {
      console.warn(`Supabase RLS prevented reading ${table}. Falling back to null.`);
      return null;
    }
    throw selectError;
  }

  if (existing && (existing as Record<string, any>)[idColumn] != null) {
    return (existing as Record<string, any>)[idColumn] as number;
  }

  const { data, error } = await supabase
    .from(table)
    .upsert({ [nameColumn]: value }, { onConflict: nameColumn })
    .select(idColumn)
    .single();

  if (error) {
    if (isRlsViolation(error)) {
      console.warn(`Supabase RLS prevented inserting into ${table}. Falling back to null.`);
      return null;
    }
    throw error;
  }

  return (data as Record<string, any> | null)?.[idColumn] ?? null;
};

const ensureEmailId = async (email?: string, status?: ContactStatus): Promise<number | null> => {
  if (!email || !email.trim()) return null;

  const trimmed = email.trim().toLowerCase();
  
  // Convert ContactStatus to boolean: 'Verified' -> true, 'Unverified' -> false
  const statusToBoolean = (s?: ContactStatus): boolean => s === 'Verified';
  
  // Check if email already exists
  const { data: existing } = await supabase
    .from('email_address')
    .select('email_id,status')
    .eq('email', trimmed)
    .maybeSingle();

  if (existing?.email_id) {
    // Determine final status: use provided status or keep existing, default to false (Unverified)
    const currentBool = existing.status ?? false;
    const newBool = status ? statusToBoolean(status) : currentBool;
    
    // Update status if it's different from what's in the database
    if (status && newBool !== currentBool) {
      await supabase
        .from('email_address')
        .update({ status: newBool })
        .eq('email_id', existing.email_id);
    }
    return existing.email_id;
  }

  // Insert new email with status (default to false/Unverified)
  const { data: inserted, error } = await supabase
    .from('email_address')
    .insert({ email: trimmed, status: statusToBoolean(status) })
    .select('email_id')
    .single();

  if (error) {
    console.error('Failed to insert email:', error);
    return null;
  }
  
  return inserted?.email_id ?? null;
};

const mapContactRowToContact = (row: Record<string, any>): Contact => {
  const firstName = row.f_name ?? row.F_name ?? row.first_name ?? row.firstName ?? '';
  const lastName = row.l_name ?? row.L_name ?? row.last_name ?? row.lastName ?? '';

  const collegeId = numberOrNull(row.college_id ?? row.colleges?.college_id ?? null);
  const programId = numberOrNull(row.program_id ?? row.programs?.program_id ?? null);
  const companyId = numberOrNull(row.company_id ?? row.companies?.company_id ?? null);
  const occupationId = numberOrNull(row.occupation_id ?? row.occupations?.occupation_id ?? null);
  const alumniAddressId = numberOrNull(
    row.alumniaddress_id ?? row.alumni_addresses?.alumniaddress_id ?? null
  );
  const locationId = numberOrNull(
    row.location_id ??
      row.locations?.location_id ??
      row.alumni_addresses?.location_id ??
      row.alumni_addresses?.locations?.location_id ??
      null
  );

  return {
    id: (row.alumni_id ?? row.id ?? row.uuid)?.toString() || Date.now().toString(),
    alumniId: numberOrNull(row.alumni_id) || undefined,
    firstName,
    lastName,
    name: row.full_name ?? row.name ?? `${firstName} ${lastName}`.trim(),
    college: row.college ?? row.college_name ?? row.colleges?.college_name ?? '',
    program: row.program ?? row.program_name ?? row.programs?.program_name ?? '',
    email: row.email_address?.email ?? '',
    status: (
      row.email_address?.status === true ? 'Verified' :
      row.email_address?.status === false ? 'Unverified' :
      row.status === true ? 'Verified' :
      row.status === false ? 'Unverified' :
      defaultStatus
    ) as ContactStatus,
    contactNumber: row.contact_number
      ? row.contact_number.toString()
      : row.contactNumber ?? '',
    dateGraduated: row.date_graduated ?? row.year_graduated ?? '',
    occupation:
      row.occupation ?? row.occupation_title ?? row.occupations?.occupation_title ?? '',
    company: row.company ?? row.company_name ?? row.companies?.company_name ?? '',
    address:
      row.address ??
      row.location ??
      row.locations?.name ??
      row.alumni_addresses?.locations?.name ??
      '',
    collegeId: collegeId ?? undefined,
    programId: programId ?? undefined,
    companyId: companyId ?? undefined,
    occupationId: occupationId ?? undefined,
    locationId: locationId ?? undefined,
    alumniAddressId: alumniAddressId ?? undefined,
    alumniType: (() => {
      const typeName = row.alumni_types?.name ?? null;
      if (typeName === 'Graduate') return 'graduate' as AlumniType;
      if (typeName === 'Marian Graduate') return 'marian_graduate' as AlumniType;
      // Fallback: id-based mapping when alumni_types join is unavailable
      const typeId = row.alumni_type_id;
      if (typeId === 1) return 'graduate' as AlumniType;
      if (typeId === 2) return 'marian_graduate' as AlumniType;
      return undefined;
    })(),
  };
};

const mapEventRowToEvent = (row: Record<string, any>): Event => {
  const attendees = (row.event_participants ?? [])
    .map((participant: any) => {
      const alumni = participant.alumni ?? participant.alumni_id ?? participant.alumniRow;
      const rsvpStatus = (participant.rsvp_status || participant.rsvpStatus || 'pending') as RsvpStatus;
      return alumni ? { ...mapContactRowToContact(alumni), rsvpStatus } : null;
    })
    .filter(Boolean) as Contact[];

  const locationName =
    row.locations?.name ??
    row.location_name ??
    row.location ??
    (row.locations?.city
      ? `${row.locations.city}${row.locations.country ? `, ${row.locations.country}` : ''}`
      : '');

  return {
    id: (row.event_id ?? row.id)?.toString() ?? Date.now().toString(),
    title: row.title ?? '',
    description: row.description ?? '',
    date: row.event_date ?? row.date ?? '',
    time: row.event_time ?? row.time ?? '',
    location: locationName || 'TBD',
    locationId: row.location_id ?? row.locations?.location_id ?? undefined,
    attendees,
  };
};

const CONTACT_SELECT_BASE_FULL =
  'alumni_id,f_name,l_name,date_graduated,email_id,contact_number,alumni_type_id,alumni_types(id,name),college_id,program_id,company_id,occupation_id,colleges(college_id,college_name),programs(program_id,program_name),companies(company_id,company_name),occupations(occupation_id,occupation_title),email_address(email_id,email,status)';
const CONTACT_SELECT_BASE_NO_TYPES =
  'alumni_id,f_name,l_name,date_graduated,email_id,contact_number,alumni_type_id,college_id,program_id,company_id,occupation_id,colleges(college_id,college_name),programs(program_id,program_name),companies(company_id,company_name),occupations(occupation_id,occupation_title),email_address(email_id,email,status)';

let supportsAlumniAddressColumn = true;
let supportsAlumniTypes = true;
let loggedMissingAlumniAddressColumn = false;
let supportsEventRsvpStatus = true;
let loggedMissingEventRsvpStatus = false;
let loggedMissingAlumniTypes = false;

const noteMissingAlumniTypes = () => {
  if (loggedMissingAlumniTypes) return;
  loggedMissingAlumniTypes = true;
  console.warn('Supabase: alumni_types table not found, run migration to enable — falling back to id-based mapping.');
};

const noteMissingAlumniAddressColumn = () => {
  if (loggedMissingAlumniAddressColumn) return;
  loggedMissingAlumniAddressColumn = true;
  console.warn('Supabase: alumniaddress_id column missing, continuing without address linkage.');
};

const noteMissingEventRsvpStatus = () => {
  if (loggedMissingEventRsvpStatus) return;
  loggedMissingEventRsvpStatus = true;
  console.warn('Supabase: event_participants.rsvp_status column missing, continuing without RSVP status.');
};

const deriveUserProfile = (user?: any) => {
  if (!user) {
    return { name: '', email: '' };
  }

  const metadata = user.user_metadata || {};
  const identityData = user.identities?.[0]?.identity_data || {};
  const email =
    user.email || metadata.email || metadata.preferred_email || identityData.email || '';
  const name =
    metadata.full_name ||
    metadata.name ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(' ') ||
    identityData.name ||
    email ||
    '';

  return { name, email };
};

const baseContactSelect = () =>
  supportsAlumniTypes ? CONTACT_SELECT_BASE_FULL : CONTACT_SELECT_BASE_NO_TYPES;

const getContactSelect = () =>
  supportsAlumniAddressColumn ? `${baseContactSelect()},alumniaddress_id` : baseContactSelect();

const hydrateContactsWithLocations = async (contacts: Contact[]): Promise<Contact[]> => {
  const locationIds = Array.from(
    new Set(
      contacts
        .map((contact) => contact.locationId)
        .filter((id): id is number => typeof id === 'number')
    )
  );

  if (locationIds.length === 0) {
    return contacts;
  }

  const { data, error } = await supabase
    .from('locations')
    .select('location_id,name,city,country')
    .in('location_id', locationIds);

  if (error) {
    console.warn('Supabase: failed to load locations', error);
    return contacts;
  }

  const locationMap = new Map<number, string>();
  (data ?? []).forEach((row: Record<string, any>) => {
    const id = row.location_id ?? row.id;
    if (typeof id === 'number') {
      const derivedCityCountry = [row.city, row.country].filter(Boolean).join(', ');
      const segments = [row.name, derivedCityCountry].filter(Boolean);
      const label = segments.join(' • ');
      locationMap.set(id, label || row.name || derivedCityCountry || '');
    }
  });

  if (locationMap.size === 0) {
    return contacts;
  }

  return contacts.map((contact) =>
    contact.locationId && locationMap.has(contact.locationId)
      ? { ...contact, address: locationMap.get(contact.locationId) ?? contact.address ?? '' }
      : contact
  );
};

const hydrateContactsWithAddresses = async (contacts: Contact[]): Promise<Contact[]> => {
  const addressIds = Array.from(
    new Set(
      contacts
        .map((contact) => contact.alumniAddressId)
        .filter((id): id is number => typeof id === 'number')
    )
  );

  if (addressIds.length === 0) {
    return hydrateContactsWithLocations(contacts);
  }

  const { data, error } = await supabase
    .from('alumni_addresses')
    .select('alumniaddress_id,location_id')
    .in('alumniaddress_id', addressIds);

  if (error) {
    console.warn('Supabase: failed to load alumni addresses', error);
    return hydrateContactsWithLocations(contacts);
  }

  const addressToLocation = new Map<number, number>();
  (data ?? []).forEach((row: Record<string, any>) => {
    const addrId = numberOrNull(row.alumniaddress_id);
    const locId = numberOrNull(row.location_id);
    if (addrId && locId) {
      addressToLocation.set(addrId, locId);
    }
  });

  const contactsWithLocationIds = contacts.map((contact) => {
    if (!contact.alumniAddressId) {
      return contact;
    }

    const linkedLocationId = addressToLocation.get(contact.alumniAddressId);
    if (linkedLocationId && linkedLocationId !== contact.locationId) {
      return { ...contact, locationId: linkedLocationId };
    }

    return contact;
  });

  return hydrateContactsWithLocations(contactsWithLocationIds);
};

const saveAlumniAddressLink = async (
  alumniId: number | null,
  locationId: number | null,
  existingAddressId?: number
): Promise<number | null> => {
  if (!alumniId || !locationId) {
    return existingAddressId ?? null;
  }

  const addressPayload: Record<string, any> = {
    alumni_id: alumniId,
    location_id: locationId,
  };

  if (existingAddressId) {
    addressPayload.alumniaddress_id = existingAddressId;
  }

  const query = existingAddressId
    ? supabase
        .from('alumni_addresses')
        .update(addressPayload)
        .eq('alumniaddress_id', existingAddressId)
    : supabase.from('alumni_addresses').insert(addressPayload);

  const { data, error } = await query.select('alumniaddress_id').single();

  if (error) {
    console.error('Supabase: failed to save alumni address link', error);
    throw error;
  }

  const newAddressId = numberOrNull((data as Record<string, any>)?.alumniaddress_id);

  if (!existingAddressId && newAddressId) {
    const { error: linkError } = await supabase
      .from('alumni')
      .update({ alumniaddress_id: newAddressId })
      .eq('alumni_id', alumniId);

    if (linkError) {
      console.warn('Supabase: failed to assign alumniaddress_id to alumni', linkError);
    }
  }

  return newAddressId ?? existingAddressId ?? null;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showClaimAccess, setShowClaimAccess] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [archivedContacts, setArchivedContacts] = useState<Contact[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<Event[]>([]);
  const [archivedTeamMembers, setArchivedTeamMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [graduatedFrom, setGraduatedFrom] = useState('');
  const [graduatedTo, setGraduatedTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContactStatus>('all');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'primary' | 'danger' | 'neutral' | 'success';
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);
  const [teamRefreshToken, setTeamRefreshToken] = useState(0);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);
  const [currentUserDepartment, setCurrentUserDepartment] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  // Cache the last valid session token + user from onAuthStateChange.
  // getSession() can return null when device clock is skewed, so we preserve
  // the token here and use it as a fallback in fetchCurrentUserRole.
  const cachedSessionRef = useRef<{ accessToken: string; user: any } | null>(null);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Incubatee state
  const [incubatees, setIncubatees] = useState<Incubatee[]>([]);
  const [unassignedFounders, setUnassignedFounders] = useState<Founder[]>([]);
  const [selectedIncubatees, setSelectedIncubatees] = useState<string[]>([]);
  const [showIncubateeForm, setShowIncubateeForm] = useState(false);
  const [editingIncubatee, setEditingIncubatee] = useState<Incubatee | null>(null);
  const [viewingIncubatee, setViewingIncubatee] = useState<Incubatee | null>(null);
  const [viewingFounder, setViewingFounder] = useState<{ founder: Founder; incubatee: Incubatee } | null>(null);
  const [showAddFounderModal, setShowAddFounderModal] = useState(false);
  const [incubateeViewMode, setIncubateeViewMode] = useState<'Startup' | 'founders'>('Startup');
  const [showDeleteIncubateeConfirm, setShowDeleteIncubateeConfirm] = useState(false);
  const [hasExistingPassword, setHasExistingPassword] = useState(false);

  // Check if URL contains claim-access token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('token')) {
      setShowClaimAccess(true);
    }
  }, []);

  // Keep UI auth state in sync with Supabase session (Google OAuth, etc.)
  useEffect(() => {
    let isMounted = true;

    const rememberMe = () => localStorage.getItem('remember_me') === 'true';
    const loginInitiated = () => localStorage.getItem('login_initiated') === 'true';

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;

      // After a Google OAuth flow, auth_method is set to 'oauth'.
      // Treat the session as valid regardless of rememberMe so the user isn't
      // immediately signed out before onAuthStateChange can fire SIGNED_IN.
      const isOAuthReturn = localStorage.getItem('auth_method') === 'oauth';

      if (data.session && !rememberMe() && !loginInitiated() && !isOAuthReturn) {
        await supabase.auth.signOut();
        setIsLoggedIn(false);
        return;
      }

      if (data.session) {
        const { name, email } = deriveUserProfile(data.session.user);
        setCurrentUserEmail(email);
        setCurrentUserName(name);
      }

      setIsLoggedIn(rememberMe() || isOAuthReturn ? !!data.session : false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        if (!session) {
          setIsLoggedIn(false);
          return;
        }

        const allowAutoLogin = rememberMe();
        const hasLoginIntent = loginInitiated();

        if (_event === 'INITIAL_SESSION' && !allowAutoLogin && !hasLoginIntent) {
          setIsLoggedIn(false);
          return;
        }

        if (hasLoginIntent) {
          localStorage.removeItem('login_initiated');
        }

        const { name, email } = deriveUserProfile(session.user);
        setCurrentUserEmail(email);
        setCurrentUserName(name);

        const isGoogleOAuth = localStorage.getItem('pending_google_oauth') === 'true';

        // --- Google OAuth enforcement ---
        // After Google OAuth, verify the signed-in email exists in the teams table.
        // If not pre-added by admin, reject the login.
        if (isGoogleOAuth) {
          localStorage.removeItem('pending_google_oauth');

          const googleEmail = (session.user?.email || '').toLowerCase();
          if (!googleEmail) {
            await supabase.auth.signOut();
            setIsLoggedIn(false);
            setSyncError('Could not determine email from Google account.');
            return;
          }

          // Check directly against the teams table (no Edge Function needed)
          const { data: teamRow, error: teamError } = await supabase
            .from('teams')
            .select('id, has_access')
            .ilike('email', googleEmail)
            .maybeSingle();

          if (teamError) {
            console.error('Teams lookup error after Google OAuth:', teamError);
          }

          const isAllowed = Boolean(teamRow?.id) && Boolean(teamRow?.has_access);

          if (!isAllowed) {
            await supabase.auth.signOut();
            setIsLoggedIn(false);
            setSyncError(
              'This Google account is not authorized. Ask your admin to add your email to the team first.'
            );
            return;
          }
        }

        // Cache the session token for use in fetchCurrentUserRole and services
        // like grantAccess. This survives clock-skew scenarios where getSession()
        // returns null because the SDK discards a token it sees as "from the future".
        cachedSessionRef.current = { accessToken: session.access_token, user: session.user };
        setCachedSession(session.access_token, session.user);

        // Link the auth user to their teams row (sets user_id + has_access)
        // This covers all login methods: password, magic link, Google OAuth, etc.
        // Pass access_token directly so linkMyAccountToTeam doesn't call
        // refreshSession() which can corrupt the session mid-transition.
        try {
          await linkMyAccountToTeam(session.user, session.access_token);
        } catch (e) {
          console.warn('Account linking failed (role-based features may not work):', e);
        }

        setIsLoggedIn(true);
      }
    );

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const fetchCurrentUserRole = async () => {
    setIsRoleLoading(true);
    try {
      // Try getUser first; fall back to session user (avoids AuthSessionMissingError on OAuth).
      // getUser() makes a network call to validate the token — it throws
      // AuthSessionMissingError when the OAuth session hasn't fully committed to
      // the SDK's in-memory state yet. Always treat this error as a soft fallback.
      let authUser: any = null;
      let accessToken: string | null = null;

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!userError && userData?.user) {
          authUser = userData.user;
        }
      } catch {
        // AuthSessionMissingError — session not yet in SDK memory; will use fallbacks below
      }

      // Always grab the session to get the access token (needed for edge function fallback)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        accessToken = sessionData.session.access_token;
        if (!authUser) {
          authUser = sessionData.session.user;
        }
      }

      // Fallback: use the token/user cached from onAuthStateChange.
      // This is essential when the device clock is skewed — getSession() returns
      // null because the SDK refuses to restore a token it thinks is from the
      // future, but the token we received directly from the auth event is still valid.
      if (!accessToken && cachedSessionRef.current?.accessToken) {
        accessToken = cachedSessionRef.current.accessToken;
        console.log('fetchCurrentUserRole: using cached session token (clock skew fallback)');
      }
      if (!authUser && cachedSessionRef.current?.user) {
        authUser = cachedSessionRef.current.user;
      }

      if (!authUser) {
        setCurrentUserRole(null);
        // Only clear name/email if nothing was set yet
        if (!currentUserName && !currentUserEmail) {
          setCurrentUserName('');
          setCurrentUserEmail('');
        }
        setHasExistingPassword(false);
        return;
      }
      const { name: derivedName, email: derivedEmail } = deriveUserProfile(authUser);
      const storedAuthMethod = localStorage.getItem('auth_method');
      const metadataHasPassword = Boolean(
        (authUser.user_metadata as { has_password?: boolean; password_set?: boolean } | undefined)
          ?.has_password ??
          (authUser.user_metadata as { has_password?: boolean; password_set?: boolean } | undefined)
            ?.password_set
      );
      setHasExistingPassword(storedAuthMethod === 'password' || metadataHasPassword);

      const userEmail = derivedEmail || authUser.email || '';
      setCurrentUserEmail(userEmail);

      // Try finding the teams row by user_id first, then fall back to email lookup
      let roleRow: any = null;
      let roleError: any = null;

      const { data: byUserId, error: byUserIdError } = await supabase
        .from('teams')
        .select('id, email, first_name, last_name, roles(role_name), departments(department_name)')
        .eq('user_id', authUser.id)
        .or('has_access.eq.true,has_access.is.null')
        .maybeSingle();

      if (!byUserIdError && byUserId) {
        roleRow = byUserId;
      } else {
        // Fallback: look up by email (covers Google OAuth before user_id is linked)
        if (userEmail) {
          const { data: byEmail, error: byEmailError } = await supabase
            .from('teams')
            .select('id, email, first_name, last_name, roles(role_name), departments(department_name)')
            .ilike('email', userEmail)
            .or('has_access.eq.true,has_access.is.null')
            .maybeSingle();

          if (byEmailError) {
            roleError = byEmailError;
          } else {
            roleRow = byEmail;
          }
        } else {
          roleError = byUserIdError;
        }
      }

      if (roleError) {
        console.warn('Supabase: failed to load current user role via direct query', roleError);
      }

      // If direct DB lookups failed (e.g. RLS blocking or user_id not linked),
      // use the process-team-auth edge function as a fallback.
      // It uses the service role key to bypass RLS and link the account.
      if (!roleRow) {
        console.log('Direct role lookup failed, trying process-team-auth edge function...');
        const linkedRole = await linkMyAccountToTeam(authUser, accessToken ?? undefined);
        if (linkedRole) {
          setCurrentUserRole(linkedRole as TeamRole);
          // Re-try the direct lookup now that user_id is linked
          const { data: retryRow } = await supabase
            .from('teams')
            .select('id, email, first_name, last_name, roles(role_name), departments(department_name)')
            .eq('user_id', authUser.id)
            .or('is_active.eq.true,is_active.is.null')
            .maybeSingle();
          if (retryRow) {
            roleRow = retryRow;
            // Update name from teams row
            const teamName = `${retryRow.first_name ?? ''} ${retryRow.last_name ?? ''}`.trim();
            if (teamName) setCurrentUserName(teamName);
            else setCurrentUserName(derivedName || userEmail || '');
            if (retryRow.email) setCurrentUserEmail(retryRow.email);
            // Extract department from retry
            const retryDept = retryRow.departments as { department_name?: string } | { department_name?: string }[] | null;
            const retryDeptName = Array.isArray(retryDept) ? retryDept[0]?.department_name ?? null : retryDept?.department_name ?? null;
            setCurrentUserDepartment(retryDeptName);
          } else {
            // RLS still blocks retry — use edge function role and derived profile
            setCurrentUserName(derivedName || userEmail || '');
          }
          return; // Role already set from edge function
        } else {
          setCurrentUserRole(null);
          setCurrentUserName(derivedName || userEmail || '');
          return;
        }
      }

      const rolesData = roleRow?.roles as { role_name?: string } | { role_name?: string }[] | null;
      const roleName = Array.isArray(rolesData)
        ? rolesData[0]?.role_name ?? null
        : rolesData?.role_name ?? null;
      setCurrentUserRole((roleName as TeamRole | null) ?? null);

      // Extract department
      const deptData = roleRow?.departments as { department_name?: string } | { department_name?: string }[] | null;
      const deptName = Array.isArray(deptData)
        ? deptData[0]?.department_name ?? null
        : deptData?.department_name ?? null;
      setCurrentUserDepartment(deptName);

      if (roleRow) {
        const teamName = `${roleRow.first_name ?? ''} ${roleRow.last_name ?? ''}`.trim();
        if (teamName) {
          setCurrentUserName(teamName);
        } else if (derivedName) {
          setCurrentUserName(derivedName);
        } else {
          setCurrentUserName(userEmail);
        }

        if (roleRow.email) {
          setCurrentUserEmail(roleRow.email);
        }
      } else if (derivedName) {
        setCurrentUserName(derivedName);
      } else {
        setCurrentUserName(userEmail);
      }
    } finally {
      setIsRoleLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setCurrentUserRole(null);
      return;
    }

    // Fix the URL after a Google OAuth callback without a page reload
    if (window.location.pathname === '/auth/callback') {
      window.history.replaceState({}, '', '/');
    }

    fetchCurrentUserRole();
  }, [isLoggedIn]);

  useEffect(() => {
    if (currentUserRole === 'Member' && activeTab === 'team') {
      setActiveTab('home');
    }
  }, [activeTab, currentUserRole]);

  const openConfirm = (config: Omit<NonNullable<typeof dialog>, 'onConfirm' | 'onCancel'>) =>
    new Promise<boolean>((resolve) => {
      setDialog({
        ...config,
        cancelLabel: config.cancelLabel ?? 'Cancel',
        confirmLabel: config.confirmLabel ?? 'Confirm',
        onConfirm: () => {
          resolve(true);
          setDialog(null);
        },
        onCancel: () => {
          resolve(false);
          setDialog(null);
        },
      });
    });

  const isMemberPath = window.location.pathname === '/member';

  useEffect(() => {
    if (!isMemberPath || !isLoggedIn || isRoleLoading) return;
    if (currentUserRole !== 'Member') {
      window.location.replace('/');
    }
  }, [currentUserRole, isLoggedIn, isMemberPath, isRoleLoading]);

  const fetchContactsFromSupabase = async (): Promise<Contact[]> => {
    let { data, error } = await supabase.from('alumni').select(getContactSelect()).or('is_active.eq.true,is_active.is.null');

    if (error && (error.code === '42703' || error.message?.includes('alumni_types'))) {
      if (error.message?.includes('alumni_types')) {
        noteMissingAlumniTypes();
        supportsAlumniTypes = false;
      } else {
        noteMissingAlumniAddressColumn();
        supportsAlumniAddressColumn = false;
      }
      ({ data, error } = await supabase.from('alumni').select(getContactSelect()).or('is_active.eq.true,is_active.is.null'));
    }

    if (error) {
      throw error;
    }

    const contacts = (data ?? []).map(mapContactRowToContact);
    return hydrateContactsWithAddresses(contacts);
  };

  const fetchArchivedContactsFromSupabase = async (): Promise<Contact[]> => {
    let { data, error } = await supabase.from('alumni').select(getContactSelect()).eq('is_active', false);

    if (error && (error.code === '42703' || error.message?.includes('alumni_types'))) {
      if (error.message?.includes('alumni_types')) {
        noteMissingAlumniTypes();
        supportsAlumniTypes = false;
      } else {
        noteMissingAlumniAddressColumn();
        supportsAlumniAddressColumn = false;
      }
      ({ data, error } = await supabase.from('alumni').select(getContactSelect()).eq('is_active', false));
    }

    if (error) {
      throw error;
    }

    const contacts = (data ?? []).map(mapContactRowToContact);
    return hydrateContactsWithAddresses(contacts);
  };

  function eventAlumniFields() {
    const typeJoin = supportsAlumniTypes ? 'alumni_type_id,alumni_types(id,name),' : 'alumni_type_id,';
    return supportsAlumniAddressColumn
      ? `alumni_id,alumniaddress_id,f_name,l_name,email_id,date_graduated,contact_number,${typeJoin}college_id,program_id,company_id,occupation_id,colleges(college_id,college_name),programs(program_id,program_name),companies(company_id,company_name),occupations(occupation_id,occupation_title),email_address(email_id,email,status)`
      : `alumni_id,f_name,l_name,email_id,date_graduated,contact_number,${typeJoin}college_id,program_id,company_id,occupation_id,colleges(college_id,college_name),programs(program_id,program_name),companies(company_id,company_name),occupations(occupation_id,occupation_title),email_address(email_id,email,status)`;
  }

  function eventParticipantsSelect() {
    return supportsEventRsvpStatus
      ? `event_participants(rsvp_status,alumni:alumni_id(${eventAlumniFields()}))`
      : `event_participants(alumni:alumni_id(${eventAlumniFields()}))`;
  }

  const fetchEventsFromSupabase = async (): Promise<Event[]> => {
    const selectClause = `event_id,title,description,event_date,event_time,location_id,is_active,locations(location_id,name,city,country),${eventParticipantsSelect()}`;
    let { data, error } = await supabase.from('events').select(selectClause).or('is_active.eq.true,is_active.is.null');

    if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('rsvp_status') || error.message?.includes('alumni_types'))) {
      if (error.message?.includes('rsvp_status')) {
        noteMissingEventRsvpStatus();
        supportsEventRsvpStatus = false;
      } else if (error.message?.includes('alumni_types')) {
        noteMissingAlumniTypes();
        supportsAlumniTypes = false;
      } else {
        noteMissingAlumniAddressColumn();
        supportsAlumniAddressColumn = false;
      }

      const fallbackSelect = `event_id,title,description,event_date,event_time,location_id,is_active,locations(location_id,name,city,country),${eventParticipantsSelect()}`;
      ({ data, error } = await supabase.from('events').select(fallbackSelect).or('is_active.eq.true,is_active.is.null'));
    }

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapEventRowToEvent);
  };

  const fetchArchivedEventsFromSupabase = async (): Promise<Event[]> => {
    const selectClause = `event_id,title,description,event_date,event_time,location_id,is_active,locations(location_id,name,city,country),${eventParticipantsSelect()}`;
    let { data, error } = await supabase.from('events').select(selectClause).eq('is_active', false);

    if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('rsvp_status') || error.message?.includes('alumni_types'))) {
      if (error.message?.includes('rsvp_status')) {
        noteMissingEventRsvpStatus();
        supportsEventRsvpStatus = false;
      } else if (error.message?.includes('alumni_types')) {
        noteMissingAlumniTypes();
        supportsAlumniTypes = false;
      } else {
        noteMissingAlumniAddressColumn();
        supportsAlumniAddressColumn = false;
      }

      const fallbackSelect = `event_id,title,description,event_date,event_time,location_id,is_active,locations(location_id,name,city,country),${eventParticipantsSelect()}`;
      ({ data, error } = await supabase.from('events').select(fallbackSelect).eq('is_active', false));
    }

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapEventRowToEvent);
  };

  const fetchArchivedTeamMembersFromSupabase = async (): Promise<TeamMember[]> => {
    const data = await fetchArchivedTeamMembers();
    return data;
  };

  const persistContactToSupabase = async (contact: Contact): Promise<Contact> => {
    const [collegeId, programId, companyId, occupationId, locationId, emailId] = await Promise.all([
      ensureIdByName('colleges', 'college_name', 'college_id', contact.college),
      ensureIdByName('programs', 'program_name', 'program_id', contact.program),
      ensureIdByName('companies', 'company_name', 'company_id', contact.company),
      ensureIdByName('occupations', 'occupation_title', 'occupation_id', contact.occupation),
      ensureIdByName('locations', 'name', 'location_id', contact.address),
      ensureEmailId(contact.email, contact.status),
    ]);

    // Map AlumniType slug → numeric alumni_type_id
    // 'graduate' → 1, 'marian_graduate' → 2 (matches FALLBACK_ALUMNI_TYPES in ContactForm)
    const alumniTypeIdMap: Record<string, number> = {
      graduate: 1,
      marian_graduate: 2,
    };
    const alumniTypeId = contact.alumniType ? (alumniTypeIdMap[contact.alumniType] ?? null) : null;

    const payload: Record<string, any> = {
      f_name: contact.firstName,
      l_name: contact.lastName,
      date_graduated: contact.dateGraduated || null,
      email_id: emailId,
      college_id: collegeId,
      program_id: programId,
      company_id: companyId,
      occupation_id: occupationId,
      contact_number: cleanPhone(contact.contactNumber),
      alumni_type_id: alumniTypeId,
    };

    const alumniId = numberOrNull(contact.alumniId ?? contact.id);
    if (alumniId) {
      payload.alumni_id = alumniId;
    }

    const { data, error } = await supabase
      .from('alumni')
      .upsert(payload, { onConflict: 'alumni_id' })
      .select(getContactSelect())
      .single();

    if (error && error.code === '42703') {
      noteMissingAlumniAddressColumn();
      supportsAlumniAddressColumn = false;
      const retry = await supabase
        .from('alumni')
        .upsert(payload, { onConflict: 'alumni_id' })
        .select(getContactSelect())
        .single();

      if (retry.error) {
        throw retry.error;
      }

      if (!retry.data) {
        throw new Error('Failed to save contact: no data returned');
      }

      const savedContactNoAddress = mapContactRowToContact(retry.data as Record<string, any>);
      const [hydratedNoAddress] = await hydrateContactsWithAddresses([savedContactNoAddress]);
      return hydratedNoAddress ?? savedContactNoAddress;
    }

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Failed to save contact: no data returned');
    }

    const savedRow = data as Record<string, any>;
    const persistedAlumniId = numberOrNull(savedRow.alumni_id) ?? alumniId ?? null;

    if (supportsAlumniAddressColumn && persistedAlumniId && locationId) {
      const existingAddressId =
        numberOrNull(savedRow.alumniaddress_id) ?? contact.alumniAddressId ?? null;
      const linkedAddressId = await saveAlumniAddressLink(
        persistedAlumniId,
        locationId,
        existingAddressId ?? undefined
      );

      if (linkedAddressId && linkedAddressId !== savedRow.alumniaddress_id) {
        savedRow.alumniaddress_id = linkedAddressId;
      }
    }

    const savedContact = mapContactRowToContact(savedRow);
    const [hydratedContact] = await hydrateContactsWithAddresses([savedContact]);
    return hydratedContact ?? savedContact;
  };

  const persistContactsBatch = async (items: Contact[]) => {
    const saved: Contact[] = [];
    for (const item of items) {
      const savedContact = await persistContactToSupabase(item);
      saved.push(savedContact);
    }
    return saved;
  };

  const triggerEventInvites = async (event: Event, attendees: Contact[], context: string) => {
    if (!attendees.length) return;
    try {
      await sendEventInvites(event, attendees);
    } catch (err) {
      console.error(`❌ Failed to send invites (${context})`, err);
      setSyncError('Event saved, but sending invitations failed.');
    }
  };

  const persistEventAttendees = async (eventId: string, attendees: Contact[]) => {
    const numericEventId = numberOrNull(eventId);
    console.log('📝 Adding attendees to event:', { 
      eventId, 
      numericEventId, 
      attendeesCount: attendees.length,
      attendees: attendees.map(a => ({ name: a.name, id: a.id, alumniId: a.alumniId }))
    });
    
    if (!numericEventId) {
      console.error('❌ Invalid event ID - must be numeric:', eventId);
      throw new Error('Event must be saved to database before adding attendees');
    }

    const rows = attendees
      .map((attendee) => {
        // Try alumniId first, then fallback to id if it's numeric
        const alumniId = attendee.alumniId ? numberOrNull(attendee.alumniId) : numberOrNull(attendee.id);
        if (!alumniId) {
          console.warn('⚠️ Attendee has no valid alumniId:', { name: attendee.name, id: attendee.id, alumniId: attendee.alumniId });
        }
        return alumniId ? { alumniId, rsvpStatus: attendee.rsvpStatus ?? 'pending' as RsvpStatus } : null;
      })
      .filter((row): row is { alumniId: number; rsvpStatus: RsvpStatus } => row !== null)
      .map(({ alumniId, rsvpStatus }) => ({ event_id: numericEventId, alumni_id: alumniId, rsvp_status: rsvpStatus }));

    console.log('📊 Rows to insert:', rows);

    if (rows.length === 0) {
      console.error('❌ No valid attendee IDs found. All attendees must be saved to database first.');
      throw new Error('Attendees must be saved to database before adding to events');
    }

    // Use insert instead of upsert since table may not have unique constraint
    const { error } = await supabase
      .from('event_participants')
      .insert(rows);

    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
      console.warn('event_participants.rsvp_status missing; inserting without status');
      const fallbackRows = rows.map(({ event_id, alumni_id }) => ({ event_id, alumni_id }));
      const { error: fallbackError } = await supabase.from('event_participants').insert(fallbackRows);
      if (fallbackError) {
        console.error('❌ Failed to persist attendees (fallback):', fallbackError);
        throw fallbackError;
      }
    } else if (error) {
      console.error('❌ Failed to persist attendees:', error);
      throw error;
    }

    console.log('✅ Successfully added', rows.length, 'attendees to event');
  };

  const deleteContactFromSupabase = async (contactId: string) => {
    const numericAlumniId = numberOrNull(contactId);
    if (!numericAlumniId) return;

    // Soft delete: mark as inactive instead of deleting
    const { error } = await supabase
      .from('alumni')
      .update({ is_active: false })
      .eq('alumni_id', numericAlumniId);

    if (error) {
      console.error('❌ Failed to mark contact as inactive:', error);
      throw error;
    }

    console.log('✅ Contact marked as inactive (soft deleted):', numericAlumniId);
  };

  const deleteContactPermanently = async (contactId: string) => {
    const numericAlumniId = numberOrNull(contactId);

    if (!numericAlumniId) {
      throw new Error('Invalid contact ID; cannot delete');
    }

    // Delete related records first to maintain referential integrity
    
    // 1. Delete event participations
    const { error: participantsError } = await supabase
      .from('event_participants')
      .delete()
      .eq('alumni_id', numericAlumniId);

    if (participantsError) {
      console.error('❌ Failed to delete event participants:', participantsError);
      throw participantsError;
    }

    // 2. Delete alumni addresses
    const { error: addressError } = await supabase
      .from('alumni_addresses')
      .delete()
      .eq('alumni_id', numericAlumniId);

    if (addressError) {
      console.error('❌ Failed to delete alumni addresses:', addressError);
      throw addressError;
    }

    // 3. Finally delete the alumni record
    const { error: alumniError } = await supabase
      .from('alumni')
      .delete()
      .eq('alumni_id', numericAlumniId);

    if (alumniError) {
      console.error('❌ Failed to delete alumni record:', alumniError);
      throw alumniError;
    }

    console.log('✅ Contact permanently deleted:', numericAlumniId);
  };

  const restoreContactInSupabase = async (contactId: string) => {
    const numericAlumniId = numberOrNull(contactId);
    if (!numericAlumniId) return;

    const { error } = await supabase
      .from('alumni')
      .update({ is_active: true })
      .eq('alumni_id', numericAlumniId);

    if (error) {
      console.error('❌ Failed to restore contact in database:', error);
      throw error;
    }

    console.log('✅ Contact restored (marked active):', numericAlumniId);
  };

  const restoreEventInSupabase = async (eventId: string) => {
    const numericEventId = numberOrNull(eventId);
    if (!numericEventId) return;

    const { error } = await supabase
      .from('events')
      .update({ is_active: true })
      .eq('event_id', numericEventId);

    if (error) {
      console.error('❌ Failed to restore event in database:', error);
      throw error;
    }

    console.log('✅ Event restored (marked active):', numericEventId);
  };

  const deleteEventFromSupabase = async (eventId: string) => {
    const numericEventId = numberOrNull(eventId);
    if (!numericEventId) return;

    // Soft delete: mark as inactive instead of deleting
    const { error } = await supabase
      .from('events')
      .update({ is_active: false })
      .eq('event_id', numericEventId);

    if (error) {
      console.error('❌ Failed to mark event as inactive:', error);
      throw error;
    }

    console.log('✅ Event marked as inactive (soft deleted):', numericEventId);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    let isMounted = true;

    const loadData = async () => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        console.log('🔄 Starting to fetch data from Supabase...');
        
        const [loadedContacts, loadedEvents, loadedArchivedContacts, loadedArchivedEvents, loadedArchivedTeams, loadedIncubatees, loadedUnassignedFounders] = await Promise.all([
          fetchContactsFromSupabase(),
          fetchEventsFromSupabase(),
          fetchArchivedContactsFromSupabase(),
          fetchArchivedEventsFromSupabase(),
          fetchArchivedTeamMembersFromSupabase(),
          fetchIncubateesFromSupabase(),
          fetchUnassignedFoundersFromSupabase(),
        ]);

        console.log('✅ Data fetched successfully!');
        console.log('  - Contacts:', loadedContacts.length);
        console.log('  - Events:', loadedEvents.length);
        console.log('  - Archived Contacts:', loadedArchivedContacts.length);
        console.log('  - Archived Events:', loadedArchivedEvents.length);
        console.log('  - Archived Team Members:', loadedArchivedTeams.length);
        console.log('  - Incubatees:', loadedIncubatees.length);
        console.log('  - Unassigned Founders:', loadedUnassignedFounders.length);

        if (!isMounted) return;

        if (loadedContacts.length > 0) {
          setContacts(loadedContacts);
          console.log('✅ Contacts state updated');
        } else {
          console.log('⚠️ No contacts found in database');
        }

        setEvents(loadedEvents);
        console.log('✅ Events state updated');
        
        setArchivedContacts(loadedArchivedContacts);
        console.log('✅ Archived contacts state updated');
        
        setArchivedEvents(loadedArchivedEvents);
        console.log('✅ Archived events state updated');

        setArchivedTeamMembers(loadedArchivedTeams);
        console.log('✅ Archived team members state updated');

        setIncubatees(loadedIncubatees);
        console.log('✅ Incubatees state updated');

        setUnassignedFounders(loadedUnassignedFounders);
        console.log('✅ Unassigned founders state updated');
      } catch (error) {
        console.error('❌ Supabase: failed to load data', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          fullError: error,
        });
        
        // Show more specific error message
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        const specificError = `Unable to load data from Supabase: ${errorMsg}`;
        
        console.error('📋 Full error object:', error);
        
        if (isMounted) {
          setSyncError(specificError);
        }
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const channel = supabase
      .channel('event-participants-rsvp')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_participants' },
        (payload) => {
          const row: any = payload.new ?? payload.old;
          if (!row) return;

          const eventId = row.event_id;
          const alumniId = row.alumni_id;
          const rsvpStatus = row.rsvp_status as RsvpStatus | undefined;

          if (!eventId || !alumniId) return;

          const updateList = (list: Event[]) =>
            list.map((evt) => {
              if (evt.id !== String(eventId)) return evt;
              const attendees = evt.attendees.map((attendee) => {
                const matchId = attendee.alumniId ?? numberOrNull(attendee.id);
                if (matchId !== numberOrNull(alumniId)) return attendee;
                return { ...attendee, rsvpStatus: rsvpStatus ?? attendee.rsvpStatus };
              });
              return { ...evt, attendees };
            });

          setEvents((prev) => updateList(prev));
          setArchivedEvents((prev) => updateList(prev));
        }
      );

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || activeTab !== 'archives') return;

    fetchArchivedTeamMembersFromSupabase()
      .then((teams) => setArchivedTeamMembers(teams))
      .catch((error) => {
        console.error('❌ Failed to refresh archived team members', error);
        setSyncError('Unable to refresh archived team members.');
      });
  }, [activeTab, isLoggedIn]);

  const handleLogin = async () => {
    setIsLoggedIn(true);
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { name, email } = deriveUserProfile(data.session.user);
      setCurrentUserEmail(email);
      setCurrentUserName(name);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Supabase: failed to sign out', error);
    }

    clearCachedSession();
    cachedSessionRef.current = null;
    localStorage.removeItem('auth_method');
    localStorage.removeItem('login_initiated');
    localStorage.removeItem('pending_google_oauth');
    setIsLoggedIn(false);
    setActiveTab('home');
    setShowForm(false);
    setEditingContact(null);
    setViewingContact(null);
    setShowImport(false);
    setShowExport(false);
    setSelectedContacts([]);
    setShowCreateEvent(false);
    setViewingEvent(null);
    setShowDeleteConfirm(false);
    setShowPersonalSettings(false);
    setCurrentUserName('');
    setCurrentUserEmail('');
    setHasExistingPassword(false);
    // Reset incubatee state
    setIncubatees([]);
    setUnassignedFounders([]);
    setSelectedIncubatees([]);
    setShowIncubateeForm(false);
    setEditingIncubatee(null);
    setViewingIncubatee(null);
    setViewingFounder(null);
    setShowAddFounderModal(false);
    setShowDeleteIncubateeConfirm(false);
    localStorage.removeItem('auth_method');
  };

  const handleReset = () => {
    setSearchQuery('');
    setGraduatedFrom('');
    setGraduatedTo('');
    setStatusFilter('all');
    setSelectedContacts([]);
  };

  // ─── Incubatee Handlers ───

  const allFounders = [...incubatees.flatMap((inc) => inc.founders), ...unassignedFounders];

  const handleNewIncubatee = () => {
    setEditingIncubatee(null);
    setShowIncubateeForm(true);
  };

  const handleEditIncubatee = (incubatee: Incubatee) => {
    setViewingIncubatee(null);
    setEditingIncubatee(incubatee);
    setShowIncubateeForm(true);
  };

  const handleSaveIncubatee = async (incubatee: Incubatee) => {
    // Optimistic local update
    setIncubatees((prev) => {
      const exists = prev.find((i) => i.id === incubatee.id);
      if (exists) {
        return prev.map((i) => (i.id === incubatee.id ? incubatee : i));
      }
      return [...prev, incubatee];
    });
    // Optimistically remove any founders that are now part of this incubatee
    const founderIdsInIncubatee = new Set(incubatee.founders.map((f) => f.id));
    setUnassignedFounders((prev) => prev.filter((f) => !founderIdsInIncubatee.has(f.id)));
    setShowIncubateeForm(false);
    setEditingIncubatee(null);

    // Persist to database
    setIsSyncing(true);
    try {
      const saved = await persistIncubateeToSupabase(incubatee);
      // Replace the optimistic entry with DB-backed one (real IDs)
      setIncubatees((prev) =>
        prev.map((i) => (i.id === incubatee.id || i.id === saved.id ? saved : i))
      );
      // Remove any founders that were reassigned from the unassigned list
      const savedFounderIds = new Set(saved.founders.map((f) => f.id));
      setUnassignedFounders((prev) => prev.filter((f) => !savedFounderIds.has(f.id)));
      console.log('✅ Incubatee saved to database');
    } catch (error) {
      console.error('❌ Failed to save incubatee to database:', error);
      setSyncError('Incubatee saved locally but failed to sync with database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewIncubatee = (incubatee: Incubatee) => {
    setViewingIncubatee(incubatee);
  };

  const handleDeleteIncubatees = async () => {
    const idsToDelete = [...selectedIncubatees];
    // Optimistic local removal
    setIncubatees((prev) => prev.filter((i) => !idsToDelete.includes(i.id)));
    setSelectedIncubatees([]);
    setShowDeleteIncubateeConfirm(false);

    // Persist to database
    setIsSyncing(true);
    try {
      await deleteIncubateesFromSupabase(idsToDelete);
      console.log(`✅ Deleted ${idsToDelete.length} incubatee(s) from database`);
    } catch (error) {
      console.error('❌ Failed to delete incubatees from database:', error);
      setSyncError('Incubatees deleted locally but failed to sync with database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewFounder = (founder: Founder, incubatee: Incubatee) => {
    setViewingFounder({ founder, incubatee });
  };

  const handleSaveFounder = async (updatedFounder: Founder) => {
    if (!viewingFounder) return;
    // Optimistic update
    setIncubatees((prev) =>
      prev.map((inc) => {
        if (inc.id === viewingFounder.incubatee.id) {
          return {
            ...inc,
            founders: inc.founders.map((f) =>
              f.id === updatedFounder.id ? updatedFounder : f
            ),
          };
        }
        return inc;
      })
    );
    setViewingFounder(null);

    // Persist to database
    setIsSyncing(true);
    try {
      const saved = await updateFounderInDb(updatedFounder);
      setIncubatees((prev) =>
        prev.map((inc) => {
          if (inc.id === viewingFounder.incubatee.id) {
            return {
              ...inc,
              founders: inc.founders.map((f) =>
                f.id === updatedFounder.id || f.id === saved.id ? saved : f
              ),
            };
          }
          return inc;
        })
      );
      console.log('✅ Founder updated in database');
    } catch (error) {
      console.error('❌ Failed to update founder in database:', error);
      setSyncError('Founder updated locally but failed to sync with database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddFounderToIncubatee = async (incubateeId: string, founder: Founder) => {
    // Optimistic local update — only attach to incubatee if one was selected
    if (incubateeId) {
      setIncubatees((prev) =>
        prev.map((inc) => {
          if (inc.id === incubateeId) {
            return { ...inc, founders: [...inc.founders, founder] };
          }
          return inc;
        })
      );
    } else {
      // No startup selected — track as unassigned founder
      setUnassignedFounders((prev) => [founder, ...prev]);
    }
    setShowAddFounderModal(false);

    // Persist to database
    setIsSyncing(true);
    try {
      const savedFounder = await addFounderToIncubateeInDb(incubateeId, founder);
      // Replace the optimistic founder with DB-backed one
      if (incubateeId) {
        setIncubatees((prev) =>
          prev.map((inc) => {
            if (inc.id === incubateeId) {
              return {
                ...inc,
                founders: inc.founders.map((f) =>
                  f.id === founder.id ? savedFounder : f
                ),
              };
            }
            return inc;
          })
        );
      } else {
        setUnassignedFounders((prev) =>
          prev.map((f) => (f.id === founder.id ? savedFounder : f))
        );
      }
      console.log('✅ Founder added to database');
    } catch (error) {
      console.error('❌ Failed to add founder to database:', error);
      setSyncError('Founder added locally but failed to sync with database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNewContact = () => {
    setEditingContact(null);
    setShowForm(true);
  };

  const handleEditContact = (contact: Contact) => {
    // Close the view modal so the edit form sits on top without being obscured
    setViewingContact(null);
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleUpdateContactStatus = async (updatedContact: Contact) => {
    const previous = contacts.find((c) => c.id === updatedContact.id);
    const becameUnverified =
      updatedContact.status === 'Unverified' && previous?.status !== 'Unverified';

    // Update contact status locally
    setContacts((prev) =>
      prev.map((c) => (c.id === updatedContact.id ? updatedContact : c))
    );

    // Also update the currently viewed contact so the modal reflects the change
    setViewingContact(updatedContact);

    // Update status in backend via email_address table
    try {
      if (updatedContact.email) {
        await ensureEmailId(updatedContact.email, updatedContact.status);

        if (becameUnverified) {
          try {
            await sendVerificationEmail({
              to: updatedContact.email,
              firstName: updatedContact.firstName,
              brandName: 'Marian Alumni Network',
            });
            console.log('✅ Verification email sent for unverified contact');
          } catch (emailError) {
            console.error('❌ Status updated but failed to send verification email:', emailError);
            setSyncError('Contact status updated, but sending verification email failed.');
          }
        }

        console.log('✅ Contact status updated in email_address table');
      }
    } catch (error) {
      console.error('❌ Failed to update contact status in backend:', error);
      setSyncError('Failed to update contact status in database.');
    }
  };

  const handleSaveContact = async (contact: Contact) => {
    const normalizedContact: Contact = {
      ...contact,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      dateGraduated: contact.dateGraduated || '',
    };

    const editingId = editingContact?.id;

    setShowForm(false);
    setEditingContact(null);
    setIsSyncing(true);
    setSyncError(null);

    try {
      const savedContact = await persistContactToSupabase(normalizedContact);
      console.log('✅ Contact saved with alumniId:', savedContact.alumniId);

      const shouldSendVerification =
        savedContact.status === 'Unverified' &&
        Boolean(savedContact.email?.trim()) &&
        (!editingId || editingContact?.status !== 'Unverified');

      if (shouldSendVerification && savedContact.email) {
        try {
          await sendVerificationEmail({
            to: savedContact.email,
            firstName: savedContact.firstName,
            brandName: 'Marian Alumni Network',
          });
          console.log('✅ Verification email sent for newly unverified contact');
        } catch (emailError) {
          console.error('❌ Contact saved but failed to send verification email:', emailError);
          setSyncError('Contact saved, but sending verification email failed.');
        }
      }

      setContacts((prev) => {
        if (editingId) {
          return prev.map((c) => (c.id === editingId ? savedContact : c));
        }

        const hasSameEmail = prev.find((c) => c.email === savedContact.email);
        if (hasSameEmail) {
          return prev.map((c) => (c.email === savedContact.email ? savedContact : c));
        }

        return [...prev, savedContact];
      });
    } catch (error) {
      console.error('❌ Failed to save contact', error);
      setSyncError('Failed to save contact to Supabase.');
      // Still add with temporary ID for offline use
      setContacts((prev) =>
        editingId
          ? prev.map((c) => (c.id === editingId ? normalizedContact : c))
          : [...prev, normalizedContact]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingContact(null);
  };

  const handleCloseView = () => {
    setViewingContact(null);
  };

  const handleDelete = () => {
    if (selectedContacts.length > 0) {
      setShowDeleteConfirm(true);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    console.log('🗑️ Delete event requested:', eventId);
    const confirmed = await openConfirm({
      title: 'Delete event',
      message: 'Are you sure you want to delete this event?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });

    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      return;
    }

    console.log('✅ User confirmed deletion');

    const eventToArchive = events.find((e) => e.id === eventId);
    console.log('Event to archive:', eventToArchive);
    console.log('Current archived events:', archivedEvents.length);

    if (eventToArchive) {
      const updatedArchive = [...archivedEvents, eventToArchive];
      setArchivedEvents(updatedArchive);
      console.log('✅ Event added to archive. New archive count:', updatedArchive.length);
    } else {
      console.warn('⚠️ Event not found in events list');
    }

    const updatedEvents = events.filter((e) => e.id !== eventId);
    setEvents(updatedEvents);
    console.log('✅ Event removed from active list. Remaining events:', updatedEvents.length);

    deleteEventFromSupabase(eventId).catch((error) => {
      console.error('❌ Failed to mark event as inactive in database', error);
      setSyncError('Event archived locally but failed to update in database.');
    });
  };

  const handleImportContacts = (importedContacts: Contact[]) => {
    setContacts([...contacts, ...importedContacts]);
    setIsSyncing(true);

    persistContactsBatch(importedContacts)
      .then((saved) => {
        if (!saved.length) return;

        setContacts((prev) => {
          const filtered = prev.filter(
            (contact) => !saved.some((s) => s.id === contact.id || s.email === contact.email)
          );
          return [...filtered, ...saved];
        });
      })
      .catch((error) => {
        console.error('Supabase: failed to import contacts', error);
        setSyncError('Imported locally but failed to sync new contacts to Supabase.');
      })
      .finally(() => setIsSyncing(false));
  };

  const handleViewContact = (contact: Contact) => {
    setViewingContact(contact);
  };

  const handleCreateEvent = async (event: Event) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log('App - handleCreateEvent received event:', {
        id: event.id,
        title: event.title,
        attendeeCount: event.attendees.length,
        attendees: event.attendees.map(a => ({ id: a.id, name: a.name, alumniId: a.alumniId }))
      });

      // Event is already saved to database by createEvent()
      // Just add it to the local state
      setEvents((prev) => [...prev, event]);
      setShowCreateEvent(false);

      await triggerEventInvites(event, event.attendees, 'create');
    } catch (err) {
      console.error('Failed to add event', err);
      setSyncError('Failed to add event.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
  };

  const handleUpdateEvent = async (
    eventId: string,
    eventData: Omit<Event, 'id' | 'attendees'>,
    attendees: Contact[]
  ) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log('App - handleUpdateEvent called:', {
        eventId,
        title: eventData.title,
        attendeeCount: attendees.length,
      });

      // Update event in database
      const updatedEvent = await updateEvent(eventId, eventData, attendees);

      // Update local state
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? updatedEvent : e))
      );

      setEditingEvent(null);
      console.log('✅ Event updated successfully');
    } catch (err) {
      console.error('❌ Failed to update event', err);
      setSyncError('Failed to update event.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewEvent = (event: Event) => {
    setViewingEvent(event);
  };

  const handleAddAttendees = async (eventId: string, newAttendees: Contact[]) => {
    console.log('🎯 App - handleAddAttendees called:', {
      eventId,
      newAttendeesCount: newAttendees.length,
      newAttendees: newAttendees.map(a => ({ id: a.id, name: a.name, alumniId: a.alumniId }))
    });
    const normalizedAttendees = newAttendees.map((attendee) => ({
      ...attendee,
      rsvpStatus: attendee.rsvpStatus ?? 'pending',
    }));

    const updatedEvents = events.map((event) =>
      event.id === eventId
        ? { ...event, attendees: [...event.attendees, ...normalizedAttendees] }
        : event
    );
    const targetEvent = updatedEvents.find((event) => event.id === eventId);
    
    setEvents(updatedEvents);
    
    // Update viewing event if it's the one being modified
    if (viewingEvent && viewingEvent.id === eventId) {
      const updatedViewingEvent = updatedEvents.find(e => e.id === eventId);
      if (updatedViewingEvent) {
        setViewingEvent(updatedViewingEvent);
      }
    }

    await persistEventAttendees(eventId, normalizedAttendees).catch((error) => {
      console.error('Supabase: failed to add attendees', error);
      setSyncError('Added attendees locally but failed to sync with Supabase.');
    });

    if (targetEvent) {
      triggerEventInvites(targetEvent, normalizedAttendees, 'add-attendees');
    }
  };

  const handleRestoreContact = async (contact: Contact) => {
    // Update local state immediately
    setContacts([...contacts, contact]);
    setArchivedContacts(archivedContacts.filter((c) => c.id !== contact.id));
    
    // Update database
    setIsSyncing(true);
    try {
      await restoreContactInSupabase(contact.id);
      console.log('✅ Contact restored in database');
    } catch (error) {
      console.error('❌ Failed to restore contact in database:', error);
      setSyncError('Contact restored locally but failed to update in database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreEvent = async (event: Event) => {
    // Update local state immediately
    setEvents([...events, event]);
    setArchivedEvents(archivedEvents.filter((e) => e.id !== event.id));
    
    // Update database
    setIsSyncing(true);
    try {
      await restoreEventInSupabase(event.id);
      console.log('✅ Event restored in database');
    } catch (error) {
      console.error('❌ Failed to restore event in database:', error);
      setSyncError('Event restored locally but failed to update in database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePermanentDeleteContact = async (contactId: string) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await deleteContactPermanently(contactId);
      setArchivedContacts((prev) => prev.filter((c) => c.id !== contactId));
      console.log('✅ Contact permanently deleted from database');
    } catch (error) {
      console.error('❌ Failed to permanently delete contact', error);
      setSyncError('Failed to permanently delete contact from database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePermanentDeleteEvent = async (eventId: string) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await deleteEventPermanently(eventId);
      setArchivedEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (error) {
      console.error('❌ Failed to permanently delete event', error);
      setSyncError('Failed to permanently delete event from Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreTeamMember = async (member: TeamMember) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await restoreTeamMember(member.id);
      setArchivedTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
      setTeamRefreshToken((token) => token + 1);
    } catch (error) {
      console.error('❌ Failed to restore team member', error);
      setSyncError('Failed to restore team member from Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePermanentDeleteTeamMember = async (id: string) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await deleteTeamMemberPermanently(id);
      setArchivedTeamMembers((prev) => prev.filter((m) => m.id !== id));
      setTeamRefreshToken((token) => token + 1);
    } catch (error) {
      console.error('❌ Failed to permanently delete team member', error);
      setSyncError('Failed to permanently delete team member from Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleArchiveTeamMemberLocal = (member: TeamMember) => {
    setArchivedTeamMembers((prev) => {
      const exists = prev.some((m) => m.id === member.id);
      return exists ? prev : [...prev, member];
    });
    setTeamRefreshToken((token) => token + 1);
  };

  const handleSendEmailCampaign = () => {
    setActiveTab('events');
  };

  const handleEmailUnverifiedContacts = () => {
    setSearchQuery('');
    setGraduatedFrom('');
    setGraduatedTo('');
    setStatusFilter('Unverified');
    setSelectedContacts([]);
    setActiveTab('contacts');
  };



  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = query
      ? [
          contact.name,
          contact.college,
          contact.program,
          contact.email,
          contact.occupation,
          contact.company,
        ]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query))
      : true;

    const hasFrom = Boolean(graduatedFrom);
    const hasTo = Boolean(graduatedTo);
    const graduatedDate = contact.dateGraduated ? new Date(contact.dateGraduated) : null;

    const matchesDate = (() => {
      if (!hasFrom && !hasTo) return true;
      if (!graduatedDate) return false;

      const fromOk = hasFrom ? graduatedDate >= new Date(graduatedFrom) : true;
      const toOk = hasTo ? graduatedDate <= new Date(graduatedTo) : true;
      return fromOk && toOk;
    })();

    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;

    return matchesQuery && matchesDate && matchesStatus;
  });

  // Show login page if not logged in
  if (!isLoggedIn && !showClaimAccess) {
    // While Google OAuth code is being exchanged at /auth/callback, show a
    // spinner instead of flashing the Login form. onAuthStateChange will fire
    // SIGNED_IN once the exchange completes and setIsLoggedIn(true) will run.
    if (window.location.pathname === '/auth/callback') {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #F5F1ED, #FFF5F8, #FFE8EF)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid #FFB3C6',
              borderTopColor: '#FF2B5E',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ marginTop: 16, color: '#FF2B5E', fontWeight: 600, fontSize: 15 }}>
            Signing you in with Google…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }
    return <Login onLogin={handleLogin} />;
  }

  // Show claim access page if token is present
  if (showClaimAccess) {
    return <ClaimAccess onSuccess={() => {
      setShowClaimAccess(false);
      setIsLoggedIn(true);
      fetchCurrentUserRole();
      // Clear token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }} />;
  }

  if (isMemberPath) {
    if (isRoleLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F5F1ED]">
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-4 text-gray-700">
            Loading your access...
          </div>
        </div>
      );
    }

    if (currentUserRole !== 'Member') {
      return null;
    }

    return (
      <div className="min-h-screen bg-[#F5F1ED]">
        <main className="max-w-[1200px] mx-auto p-8">
          <Home
            contacts={contacts}
            onViewContact={handleViewContact}
            onSendEmailCampaign={handleSendEmailCampaign}
            onEmailUnverifiedContacts={handleEmailUnverifiedContacts}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F1ED]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        currentUserRole={currentUserRole}
        onOpenSettings={() => setShowPersonalSettings(true)}
        userName={currentUserName}
        userEmail={currentUserEmail}
      />
      
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-8">
          {isSyncing && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Syncing with Supabase...
            </div>
          )}

          {syncError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {syncError}
            </div>
          )}

          {activeTab === 'home' ? (
            <Home
              contacts={contacts}
              onViewContact={handleViewContact}
              onSendEmailCampaign={handleSendEmailCampaign}
              onEmailUnverifiedContacts={handleEmailUnverifiedContacts}
            />
          ) : activeTab === 'events' ? (
            <Events
              events={events}
              onCreateEvent={() => setShowCreateEvent(true)}
              onViewEvent={handleViewEvent}
              onDeleteEvent={handleDeleteEvent}
              onEditEvent={handleEditEvent}
            />
          ) : activeTab === 'archives' ? (
            <Archives
              archivedContacts={archivedContacts}
              archivedEvents={archivedEvents}
              archivedTeamMembers={archivedTeamMembers}
              onRestoreContact={handleRestoreContact}
              onRestoreEvent={handleRestoreEvent}
              onRestoreTeamMember={handleRestoreTeamMember}
              onPermanentDeleteContact={handlePermanentDeleteContact}
              onPermanentDeleteEvent={handlePermanentDeleteEvent}
              onPermanentDeleteTeamMember={handlePermanentDeleteTeamMember}
            />
          ) : activeTab === 'team' ? (
            <Team
              refreshToken={teamRefreshToken}
              onArchived={handleArchiveTeamMemberLocal}
              currentUserRole={currentUserRole}
              currentUserDepartment={currentUserDepartment}
              isRoleLoading={isRoleLoading}
            />
          ) : activeTab === 'incubatees' ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl mb-6">Manage Incubatees</h1>

                {/* Action Buttons + View Toggle */}
                <div className="flex items-center gap-3 mb-6">
                  {incubateeViewMode === 'Startup' ? (
                    <>
                      <button
                        onClick={handleNewIncubatee}
                        className="flex items-center gap-2 bg-[#FF2B5E] text-white px-5 py-2.5 rounded-lg hover:bg-[#E6275A] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        New Startup
                      </button>
                      <button
                        onClick={() => {
                          if (selectedIncubatees.length > 0) setShowDeleteIncubateeConfirm(true);
                        }}
                        disabled={selectedIncubatees.length === 0}
                        className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowAddFounderModal(true)}
                        className="flex items-center gap-2 bg-[#FF2B5E] text-white px-5 py-2.5 rounded-lg hover:bg-[#E6275A] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Founder
                      </button>
                      <button
                        onClick={() => {
                          if (selectedIncubatees.length > 0) setShowDeleteIncubateeConfirm(true);
                        }}
                        disabled={selectedIncubatees.length === 0}
                        className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}

                  {/* View Toggle */}
                  <div className="ml-auto flex items-center gap-0 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setIncubateeViewMode('Startup')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        incubateeViewMode === 'Startup'
                          ? 'bg-[#FF2B5E] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Startup
                    </button>
                    <button
                      onClick={() => setIncubateeViewMode('founders')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        incubateeViewMode === 'founders'
                          ? 'bg-[#FF2B5E] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      Founders
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              {incubateeViewMode === 'Startup' ? (
                incubatees.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No incubatees yet</h3>
                    <p className="text-gray-500 mb-4">Get started by adding your first incubatee startup.</p>
                    <button
                      onClick={handleNewIncubatee}
                      className="inline-flex items-center gap-2 bg-[#FF2B5E] text-white px-5 py-2.5 rounded-lg hover:bg-[#E6275A] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Incubatee
                    </button>
                  </div>
                ) : (
                  <IncubateeCards
                    incubatees={incubatees}
                    selectedIncubatees={selectedIncubatees}
                    setSelectedIncubatees={setSelectedIncubatees}
                    onViewIncubatee={handleViewIncubatee}
                  />
                )
              ) : (
                <FoundersTable
                  incubatees={incubatees}
                  unassignedFounders={unassignedFounders}
                  onViewFounder={(row) => {
                    const inc = incubatees.find((i) =>
                      i.founders.some((f) => f.id === row.founderId)
                    );
                    if (inc) {
                      const founder = inc.founders.find((f) => f.id === row.founderId);
                      if (founder) handleViewFounder(founder, inc);
                    }
                  }}
                />
              )}
            </>
          ) : activeTab === 'preview' ? (
            <FormPreview />
          ) : activeTab === 'contacts' ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl mb-6">Manage Contacts</h1>
                
                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                  <button 
                    onClick={handleNewContact}
                    className="flex items-center gap-2 bg-[#FF2B5E] text-white px-5 py-2.5 rounded-lg hover:bg-[#E6275A] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={selectedContacts.length === 0}
                    className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button 
                    onClick={() => setShowImport(true)}
                    className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  <button 
                    onClick={() => setShowExport(true)}
                    className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                {/* Search Bar with Filters */}
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onReset={handleReset}
                  graduatedFrom={graduatedFrom}
                  graduatedTo={graduatedTo}
                  setGraduatedFrom={setGraduatedFrom}
                  setGraduatedTo={setGraduatedTo}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                />
              </div>

              {/* Table */}
              <ContactsTable
                contacts={filteredContacts}
                selectedContacts={selectedContacts}
                setSelectedContacts={setSelectedContacts}
                onViewContact={handleViewContact}
              />

              {/* Pagination */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <button className="px-5 py-2.5 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Previous
                </button>
                <span className="text-gray-700 px-4">Page 1 of 1</span>
                <button className="px-5 py-2.5 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
                <p className="text-gray-600">This section is under development.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Contact Form Modal */}
      {showForm && (
        <ContactForm
          contact={editingContact}
          existingContacts={contacts}
          onClose={handleCloseForm}
          onSave={handleSaveContact}
        />
      )}

      {/* View Contact Modal */}
      {viewingContact && (
        <ViewContact
          contact={viewingContact}
          onClose={handleCloseView}
          onEdit={handleEditContact}
          onUpdateStatus={handleUpdateContactStatus}
        />
      )}

      {/* Create Event Modal */}
      {showCreateEvent && (
        <CreateEvent
          contacts={contacts}
          onClose={() => setShowCreateEvent(false)}
          onSave={handleCreateEvent}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEvent
          event={editingEvent}
          contacts={contacts}
          onClose={() => setEditingEvent(null)}
          onSave={handleUpdateEvent}
        />
      )}

      {/* View Event Modal */}
      {viewingEvent && (
        <ViewEvent
          event={viewingEvent}
          contacts={contacts}
          onClose={() => setViewingEvent(null)}
          onAddAttendees={handleAddAttendees}
          onArchiveEvent={handleDeleteEvent}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportContact
          onClose={() => setShowImport(false)}
          onImport={handleImportContacts}
        />
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportContact
          contacts={contacts}
          selectedContacts={selectedContacts}
          onClose={() => setShowExport(false)}
        />
      )}

      {showPersonalSettings && (
        <PersonalSettings
          onClose={() => setShowPersonalSettings(false)}
          userName={currentUserName}
          userEmail={currentUserEmail}
          hasExistingPassword={hasExistingPassword}
          onPasswordUpdated={() => {
            setHasExistingPassword(true);
            localStorage.setItem('auth_method', 'password');
          }}
        />
      )}

      {/* Incubatee Form Modal */}
      {showIncubateeForm && (
        <IncubateeForm
          incubatee={editingIncubatee}
          allFounders={allFounders}
          onSave={handleSaveIncubatee}
          onClose={() => {
            setShowIncubateeForm(false);
            setEditingIncubatee(null);
          }}
        />
      )}

      {/* View Incubatee Modal */}
      {viewingIncubatee && (
        <ViewIncubatee
          incubatee={viewingIncubatee}
          onClose={() => setViewingIncubatee(null)}
          onEdit={handleEditIncubatee}
        />
      )}

      {/* View Founder Modal */}
      {viewingFounder && (
        <ViewFounder
          founder={viewingFounder.founder}
          incubatee={viewingFounder.incubatee}
          onClose={() => setViewingFounder(null)}
          onSave={handleSaveFounder}
        />
      )}

      {/* Add Founder Modal */}
      {showAddFounderModal && (
        <AddFounderModal
          incubatees={incubatees}
          onClose={() => setShowAddFounderModal(false)}
          onSave={handleAddFounderToIncubatee}
        />
      )}

      {/* Delete Incubatee Confirmation */}
      {showDeleteIncubateeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900">Delete incubatees?</h3>
            <p className="text-gray-600">
              This will permanently delete {selectedIncubatees.length} incubatee(s) and their associated founders.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteIncubateeConfirm(false)}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteIncubatees}
                className="px-5 py-2.5 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900">Delete contacts?</h3>
            <p className="text-gray-600">
              This will move {selectedContacts.length} contact(s) to archives. You can restore them later.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const contactsToArchive = contacts.filter((c) => selectedContacts.includes(c.id));
                  
                  // Update local state immediately
                  setArchivedContacts((prev) => [...prev, ...contactsToArchive]);
                  setContacts((prev) => prev.filter((c) => !selectedContacts.includes(c.id)));
                  setSelectedContacts([]);
                  setShowDeleteConfirm(false);
                  
                  // Soft delete in database
                  setIsSyncing(true);
                  try {
                    for (const contact of contactsToArchive) {
                      await deleteContactFromSupabase(contact.id);
                    }
                    console.log(`✅ Successfully archived ${contactsToArchive.length} contact(s) in database`);
                  } catch (error) {
                    console.error('❌ Failed to archive contacts in database:', error);
                    setSyncError('Contacts archived locally but failed to update in database.');
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                className="px-5 py-2.5 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <PopupDialog
        open={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        tone={dialog?.tone}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />
    </div>
  );
}