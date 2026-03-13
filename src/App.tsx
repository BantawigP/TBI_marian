import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Login, ClaimAccess, PersonalSettings, sendVerificationEmail } from './features/auth';
import { Sidebar, PopupDialog, FormPreview } from './features/shared';
import { Home } from './features/home';
import { Events } from './features/events/components/Events';
import { Archives } from './features/archives';
import { CreateEvent } from './features/events/components/CreateEvent';
import { EditEvent } from './features/events/components/EditEvent';
import { ViewEvent } from './features/events/components/ViewEvent';
import { ContactsTable } from './features/contacts/components/ContactsTable';
import { ContactForm } from './features/contacts/components/ContactForm';
import { ViewContact } from './features/contacts/components/ViewContact';
import { ImportContact } from './features/contacts/components/ImportContact';
import { ExportContact } from './features/contacts/components/ExportContact';
import { ExportIncubatee, ExportFounder, Incubatee, Founder, IncubateeCards, IncubateeForm, ViewIncubatee, ViewFounder, AddFounderModal, FoundersTable } from './features/incubatees';
import { SearchBar } from './features/contacts/components/SearchBar';
import { Team } from './features/team/components/Team';
import { Plus, Upload, Download, Trash2, LayoutGrid, List, Lightbulb, Building2, Layers3, Tags, Users, Search } from 'lucide-react';
import type { Contact, ContactStatus, Event, RsvpStatus, TeamMember, TeamRole } from './types';
import { supabase } from './lib/supabaseClient';
import { sendEventInvites } from './features/events/services/eventInviteService';
import { deleteEventPermanently } from './features/events/services/eventService';
import {
  fetchArchivedTeamMembers,
} from './features/team/services/teamService';
import { useAuthSessionSync } from './features/auth/hooks/useAuthSessionSync';
import { useAuthActions } from './features/auth/hooks/useAuthActions';
import { useAuthUiActions } from './features/auth/hooks/useAuthUiActions';
import { MemberRouteGuard } from './features/team/components/MemberRouteGuard';
import { useTeamArchiveActions } from './features/team/hooks/useTeamArchiveActions';
import { useArchiveActions } from './features/archives/hooks/useArchiveActions';
import { useEventActions } from './features/events/hooks/useEventActions';
import { useEventArchiveActions } from './features/events/hooks/useEventArchiveActions';
import { useContactFormActions } from './features/contacts/hooks/useContactFormActions';
import { useContactListActions } from './features/contacts/hooks/useContactListActions';
import { useContactStatusActions } from './features/contacts/hooks/useContactStatusActions';
import { useContactArchiveActions } from './features/contacts/hooks/useContactArchiveActions';
import { useFilteredContacts } from './features/contacts/hooks/useFilteredContacts';
import { useContactUiStateActions } from './features/contacts/hooks/useContactUiStateActions';
import { useContactModalActions } from './features/contacts/hooks/useContactModalActions';
import { useEventModalActions } from './features/events/hooks/useEventModalActions';
import { useIncubateeArchiveActions } from './features/incubatees/hooks/useIncubateeArchiveActions';
import { useFounderArchiveActions } from './features/incubatees/hooks/useFounderArchiveActions';
import { useIncubateeModalActions } from './features/incubatees/hooks/useIncubateeModalActions';
import { useIncubateeConfirmActions } from './features/incubatees/hooks/useIncubateeConfirmActions';
import { useIncubateeUiActions } from './features/incubatees/hooks/useIncubateeUiActions';
import { useFounderTableActions } from './features/incubatees/hooks/useFounderTableActions';
import { resolveCurrentUserRoleContext } from './features/team/services/currentUserRoleService';
import {
  fetchIncubatees as fetchIncubateesFromSupabase,
  fetchUnassignedFounders as fetchUnassignedFoundersFromSupabase,
  saveIncubatee as persistIncubateeToSupabase,
  deleteIncubatees as deleteIncubateesFromSupabase,
  addFounderToIncubatee as addFounderToIncubateeInDb,
  updateFounder as updateFounderInDb,
  fetchArchivedIncubatees as fetchArchivedIncubateesFromSupabase,
  restoreIncubatees as restoreIncubateesInDb,
  deleteIncubateePermanently as deleteIncubateePermanentlyInDb,
  fetchCohortLevels as fetchCohortLevelsFromDb,
  addCohortLevel as addCohortLevelToDb,
  fetchStatusOptions as fetchStatusOptionsFromDb,
  addStatusOption as addStatusOptionToDb,
  deleteFounders as deleteFoundersFromSupabase,
  unassignFounders as unassignFoundersInDb,
  linkFounderToIncubatee as linkFounderToIncubateeInDb,
} from './features/incubatees/services/incubateeService';
import type { CohortLevelOption, StatusOption } from './features/incubatees/services/incubateeService';
import { mapEventRowToEvent } from './features/events/mappers/eventMappers';
import { mapContactRowToContact } from './features/contacts/mappers/contactMappers';

// Mock contacts - these will be replaced by database contacts after login
const initialContacts: Contact[] = [];

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
  const [archivedIncubatees, setArchivedIncubatees] = useState<Incubatee[]>([]);
  const [archivedFounders, setArchivedFounders] = useState<(Founder & { startupName: string })[]>([]);
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
  const [cohortLevelOptions, setCohortLevelOptions] = useState<CohortLevelOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [selectedIncubatees, setSelectedIncubatees] = useState<string[]>([]);
  const [selectedFounders, setSelectedFounders] = useState<string[]>([]);
  const [showIncubateeForm, setShowIncubateeForm] = useState(false);
  const [editingIncubatee, setEditingIncubatee] = useState<Incubatee | null>(null);
  const [viewingIncubatee, setViewingIncubatee] = useState<Incubatee | null>(null);
  const [viewingFounder, setViewingFounder] = useState<{ founder: Founder; incubatee: Incubatee } | null>(null);
  const [showAddFounderModal, setShowAddFounderModal] = useState(false);
  const [incubateeViewMode, setIncubateeViewMode] = useState<'Startup' | 'founders'>('Startup');
  const [showDeleteIncubateeConfirm, setShowDeleteIncubateeConfirm] = useState(false);
  const [showIncubateeExport, setShowIncubateeExport] = useState(false);
  const [showFounderExport, setShowFounderExport] = useState(false);
  const [showDeleteFounderConfirm, setShowDeleteFounderConfirm] = useState(false);
  const [startupSortBy, setStartupSortBy] = useState<'cohort' | 'status' | 'alphabetical'>('cohort');
  const [founderSortBy, setFounderSortBy] = useState<'roles' | 'name' | 'startup'>('name');
  const [incubateeSearchQuery, setIncubateeSearchQuery] = useState('');
  const [activeSummaryOverlay, setActiveSummaryOverlay] = useState<'cohort' | 'status' | null>(null);
  const [hasExistingPassword, setHasExistingPassword] = useState(false);

  useAuthSessionSync({
    setShowClaimAccess,
    setIsLoggedIn,
    setCurrentUserName,
    setCurrentUserEmail,
    setSyncError,
    cachedSessionRef,
  });

  const { handleLogin, handleLogout } = useAuthActions({
    cachedSessionRef,
    setIsLoggedIn,
    setActiveTab,
    setShowForm,
    setEditingContact,
    setViewingContact,
    setShowImport,
    setShowExport,
    setSelectedContacts,
    setShowCreateEvent,
    setViewingEvent,
    setShowDeleteConfirm,
    setShowPersonalSettings,
    setCurrentUserName,
    setCurrentUserEmail,
    setHasExistingPassword,
    setIncubatees,
    setUnassignedFounders,
    setSelectedIncubatees,
    setShowIncubateeForm,
    setEditingIncubatee,
    setViewingIncubatee,
    setViewingFounder,
    setShowAddFounderModal,
    setShowDeleteIncubateeConfirm,
    setShowIncubateeExport,
    setShowFounderExport,
    setSearchQuery,
    setGraduatedFrom,
    setGraduatedTo,
    setStatusFilter,
  });

  const {
    handleRestoreTeamMember,
    handlePermanentDeleteTeamMember,
    handleArchiveTeamMemberLocal,
  } = useTeamArchiveActions({
    setIsSyncing,
    setSyncError,
    setArchivedTeamMembers,
    setTeamRefreshToken,
  });

  const fetchCurrentUserRole = async () => {
    setIsRoleLoading(true);
    try {
      const resolved = await resolveCurrentUserRoleContext({
        cachedSession: cachedSessionRef.current,
        fallbackName: currentUserName,
        fallbackEmail: currentUserEmail,
      });

      setCurrentUserRole(resolved.role);
      setCurrentUserDepartment(resolved.department);
      setCurrentUserName(resolved.userName);
      setCurrentUserEmail(resolved.userEmail);
      setHasExistingPassword(resolved.hasExistingPassword);
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

    return (data ?? []).map((row) => mapEventRowToEvent(row, mapContactRowToContact));
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

    return (data ?? []).map((row) => mapEventRowToEvent(row, mapContactRowToContact));
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
        
        const [loadedContacts, loadedEvents, loadedArchivedContacts, loadedArchivedEvents, loadedArchivedTeams, loadedIncubatees, loadedUnassignedFounders, loadedArchivedIncubatees, loadedCohortLevels, loadedStatusOptions] = await Promise.all([
          fetchContactsFromSupabase(),
          fetchEventsFromSupabase(),
          fetchArchivedContactsFromSupabase(),
          fetchArchivedEventsFromSupabase(),
          fetchArchivedTeamMembersFromSupabase(),
          fetchIncubateesFromSupabase(),
          fetchUnassignedFoundersFromSupabase(),
          fetchArchivedIncubateesFromSupabase(),
          fetchCohortLevelsFromDb(),
          fetchStatusOptionsFromDb(),
        ]);

        console.log('✅ Data fetched successfully!');
        console.log('  - Contacts:', loadedContacts.length);
        console.log('  - Events:', loadedEvents.length);
        console.log('  - Archived Contacts:', loadedArchivedContacts.length);
        console.log('  - Archived Events:', loadedArchivedEvents.length);
        console.log('  - Archived Team Members:', loadedArchivedTeams.length);
        console.log('  - Incubatees:', loadedIncubatees.length);
        console.log('  - Unassigned Founders:', loadedUnassignedFounders.length);
        console.log('  - Archived Incubatees:', loadedArchivedIncubatees.length);

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

        setArchivedIncubatees(loadedArchivedIncubatees);
        console.log('✅ Archived incubatees state updated');

        setCohortLevelOptions(loadedCohortLevels);
        console.log('✅ Cohort level options loaded:', loadedCohortLevels.length);

        setStatusOptions(loadedStatusOptions);
        console.log('✅ Status options loaded:', loadedStatusOptions.length);
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

  const { handleSendEmailCampaign, handleReset, handleEmailUnverifiedContacts } = useContactUiStateActions({
    setSearchQuery,
    setGraduatedFrom,
    setGraduatedTo,
    setStatusFilter,
    setSelectedContacts,
    setActiveTab,
  });

  const {
    handleOpenPersonalSettings,
    handleClosePersonalSettings,
    handlePasswordUpdated,
  } = useAuthUiActions({
    setShowPersonalSettings,
    setHasExistingPassword,
  });

  // ─── Incubatee Handlers ───

  const allFounders = [...incubatees.flatMap((inc) => inc.founders), ...unassignedFounders];

  const cohortBuckets = incubatees.reduce((acc, incubatee) => {
    if (!incubatee.cohortLevel || incubatee.cohortLevel.length === 0) {
      if (!acc['No Cohort']) {
        acc['No Cohort'] = [];
      }
      acc['No Cohort'].push(incubatee);
      return acc;
    }

    incubatee.cohortLevel.forEach((level) => {
      const key = `Cohort ${level}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(incubatee);
    });

    return acc;
  }, {} as Record<string, Incubatee[]>);

  const cohortSummary = [
    ...new Set([
      ...cohortLevelOptions.map((option) => `Cohort ${option.level}`),
      ...Object.keys(cohortBuckets),
    ]),
  ]
    .map((label) => ({
      label,
      count: cohortBuckets[label]?.length ?? 0,
    }))
    .sort((a, b) => {
      if (a.label === 'No Cohort') return 1;
      if (b.label === 'No Cohort') return -1;
      const aLevel = Number(a.label.replace('Cohort ', ''));
      const bLevel = Number(b.label.replace('Cohort ', ''));
      if (Number.isFinite(aLevel) && Number.isFinite(bLevel)) {
        return aLevel - bLevel;
      }
      return a.label.localeCompare(b.label);
    });

  const statusBuckets = incubatees.reduce((acc, incubatee) => {
    const key = incubatee.status || 'Unspecified';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(incubatee);
    return acc;
  }, {} as Record<string, Incubatee[]>);

  const statusSummary = [
    ...new Set([
      ...statusOptions.map((option) => option.name),
      ...Object.keys(statusBuckets),
    ]),
  ]
    .map((status) => ({
      label: status,
      count: statusBuckets[status]?.length ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const sortedIncubatees = [...incubatees].sort((a, b) => {
    if (startupSortBy === 'alphabetical') {
      return a.startupName.localeCompare(b.startupName);
    }

    if (startupSortBy === 'status') {
      const statusCompare = a.status.localeCompare(b.status);
      if (statusCompare !== 0) return statusCompare;
      return a.startupName.localeCompare(b.startupName);
    }

    const minA = a.cohortLevel.length ? Math.min(...a.cohortLevel) : Number.MAX_SAFE_INTEGER;
    const minB = b.cohortLevel.length ? Math.min(...b.cohortLevel) : Number.MAX_SAFE_INTEGER;
    if (minA !== minB) {
      return minA - minB;
    }
    return a.startupName.localeCompare(b.startupName);
  });

  const normalizedIncubateeSearchQuery = incubateeSearchQuery.trim().toLowerCase();
  const filteredStartupIncubatees = sortedIncubatees.filter((incubatee) => {
    if (!normalizedIncubateeSearchQuery) return true;

    const startupMatch = incubatee.startupName
      .toLowerCase()
      .includes(normalizedIncubateeSearchQuery);
    const founderMatch = incubatee.founders.some((founder) =>
      founder.name.toLowerCase().includes(normalizedIncubateeSearchQuery)
    );

    return startupMatch || founderMatch;
  });

  const handleSwitchToStartupView = () => {
    setIncubateeViewMode('Startup');
  };

  const handleSwitchToFounderView = () => {
    setIncubateeViewMode('founders');
  };

  const handleStartupSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setStartupSortBy(event.target.value as 'cohort' | 'status' | 'alphabetical');
  };

  const handleFounderSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFounderSortBy(event.target.value as 'roles' | 'name' | 'startup');
  };

  const handleIncubateeSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIncubateeSearchQuery(event.target.value);
  };

  const {
    handleNewIncubatee,
    handleEditIncubatee,
    handleCloseIncubateeForm,
    handleViewIncubatee,
    handleCloseViewIncubatee,
    handleViewFounder,
    handleCloseViewFounder,
    handleOpenAddFounderModal,
    handleCloseAddFounderModal,
  } = useIncubateeModalActions({
    setEditingIncubatee,
    setShowIncubateeForm,
    setViewingIncubatee,
    setViewingFounder,
    setShowAddFounderModal,
  });

  const {
    handleOpenDeleteFounderConfirm,
    handleCancelDeleteFounderConfirm,
    handleOpenDeleteIncubateeConfirm,
    handleCancelDeleteIncubateeConfirm,
  } = useIncubateeConfirmActions({
    selectedFounders,
    selectedIncubatees,
    setShowDeleteFounderConfirm,
    setShowDeleteIncubateeConfirm,
  });

  const {
    handleOpenIncubateeExport,
    handleCloseIncubateeExport,
    handleOpenFounderExport,
    handleCloseFounderExport,
    handleOpenCohortSummaryOverlay,
    handleOpenStatusSummaryOverlay,
    handleCloseSummaryOverlay,
  } = useIncubateeUiActions({
    setShowIncubateeExport,
    setShowFounderExport,
    setActiveSummaryOverlay,
  });

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

  const handleDeleteIncubatees = async () => {
    const idsToDelete = [...selectedIncubatees];
    // Move to archived state
    const deletedItems = incubatees.filter((i) => idsToDelete.includes(i.id));
    setIncubatees((prev) => prev.filter((i) => !idsToDelete.includes(i.id)));
    setArchivedIncubatees((prev) => [...prev, ...deletedItems]);
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

  const handleDeleteFounders = () => {
    const idsToDelete = new Set(selectedFounders);

    // Collect the founders being removed, annotated with their startup name
    const toArchive: (Founder & { startupName: string })[] = [
      ...incubatees.flatMap((inc) =>
        inc.founders
          .filter((f) => idsToDelete.has(f.id))
          .map((f) => ({ ...f, startupName: inc.startupName }))
      ),
      ...unassignedFounders
        .filter((f) => idsToDelete.has(f.id))
        .map((f) => ({ ...f, startupName: '—' })),
    ];

    // Move to archived state
    setArchivedFounders((prev) => [...prev, ...toArchive]);

    // Remove from active state
    setIncubatees((prev) =>
      prev.map((inc) => ({
        ...inc,
        founders: inc.founders.filter((f) => !idsToDelete.has(f.id)),
      }))
    );
    setUnassignedFounders((prev) => prev.filter((f) => !idsToDelete.has(f.id)));
    setSelectedFounders([]);
    setShowDeleteFounderConfirm(false);

    // Detach founders from incubatees in DB (keeps them as unassigned, not permanently deleted)
    unassignFoundersInDb([...idsToDelete]).catch((error) => {
      console.error('❌ Failed to unassign founders in database:', error);
      setSyncError('Founders archived locally but failed to sync with database.');
    });
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

  const handleLinkFounderToIncubatee = async (incubateeId: string, existingFounder: Founder) => {
    // Move the founder from its current location to the target incubatee in local state
    setUnassignedFounders((prev) => prev.filter((f) => f.id !== existingFounder.id));
    setIncubatees((prev) =>
      prev.map((inc) => {
        // Remove from any existing incubatee
        const without = inc.founders.filter((f) => f.id !== existingFounder.id);
        if (inc.id === incubateeId) {
          return { ...inc, founders: [...without, existingFounder] };
        }
        return { ...inc, founders: without };
      })
    );
    setShowAddFounderModal(false);

    // Persist to DB
    try {
      await linkFounderToIncubateeInDb(existingFounder.id, incubateeId);
      console.log('✅ Founder linked to incubatee in database');
    } catch (error) {
      console.error('❌ Failed to link founder:', error);
      setSyncError('Founder linked locally but failed to sync with database.');
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

  const { handleUpdateContactStatus } = useContactStatusActions({
    contacts,
    setContacts,
    setViewingContact,
    setSyncError,
    ensureEmailId,
    sendVerificationEmail,
  });

  const {
    handleCancelDeleteConfirm,
    handleConfirmArchiveContacts,
  } = useContactArchiveActions({
    contacts,
    selectedContacts,
    setContacts,
    setArchivedContacts,
    setSelectedContacts,
    setShowDeleteConfirm,
    setIsSyncing,
    setSyncError,
    deleteContactFromSupabase,
  });

  const {
    handleSaveContact,
    handleCloseForm,
    handleCloseView,
  } = useContactFormActions({
    editingContact,
    setContacts,
    setShowForm,
    setEditingContact,
    setViewingContact,
    setIsSyncing,
    setSyncError,
    persistContactToSupabase,
    sendVerificationEmail,
  });

  const { handleDeleteEvent } = useEventArchiveActions({
    events,
    archivedEvents,
    setEvents,
    setArchivedEvents,
    setSyncError,
    openConfirm,
    deleteEventFromSupabase,
  });

  const {
    handleDelete,
    handleImportContacts,
    handleViewContact,
  } = useContactListActions({
    selectedContacts,
    setContacts,
    setViewingContact,
    setShowDeleteConfirm,
    setIsSyncing,
    setSyncError,
    persistContactsBatch,
  });

  const {
    handleOpenCreateEvent,
    handleCloseCreateEvent,
    handleEditEvent,
    handleCloseEditEvent,
    handleViewEvent,
    handleCloseViewEvent,
  } = useEventModalActions({
    setShowCreateEvent,
    setEditingEvent,
    setViewingEvent,
  });

  const {
    handleOpenImport,
    handleCloseImport,
    handleOpenExport,
    handleCloseExport,
  } = useContactModalActions({
    setShowImport,
    setShowExport,
  });

  const {
    handleCreateEvent,
    handleUpdateEvent,
    handleAddAttendees,
  } = useEventActions({
    events,
    viewingEvent,
    setEvents,
    setViewingEvent,
    setEditingEvent,
    setShowCreateEvent,
    setIsSyncing,
    setSyncError,
    triggerEventInvites,
    persistEventAttendees,
  });

  const {
    handleRestoreContact,
    handleRestoreEvent,
    handlePermanentDeleteContact,
    handlePermanentDeleteEvent,
  } = useArchiveActions({
    setContacts,
    setArchivedContacts,
    setEvents,
    setArchivedEvents,
    setIsSyncing,
    setSyncError,
    restoreContactInSupabase,
    restoreEventInSupabase,
    deleteContactPermanently,
    deleteEventPermanently,
  });

  const {
    handleRestoreIncubatee,
    handlePermanentDeleteIncubatee,
  } = useIncubateeArchiveActions({
    archivedIncubatees,
    setArchivedIncubatees,
    setIncubatees,
    setArchivedFounders,
    setIsSyncing,
    setSyncError,
    restoreIncubateesInDb,
    deleteIncubateePermanentlyInDb,
  });

  const {
    handleDeleteArchivedFounder,
    handleRemoveFounderFromArchivedIncubatee,
    handleRestoreFounder,
  } = useFounderArchiveActions({
    setArchivedFounders,
    setArchivedIncubatees,
    setUnassignedFounders,
    deleteFoundersFromSupabase,
  });

  const { handleViewFounderRow } = useFounderTableActions({
    incubatees,
    handleViewFounder,
  });

  const handleCloseDialog = () => setDialog(null);

  const filteredContacts = useFilteredContacts({
    contacts,
    searchQuery,
    graduatedFrom,
    graduatedTo,
    statusFilter,
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
    return (
      <MemberRouteGuard
        isLoggedIn={isLoggedIn}
        isRoleLoading={isRoleLoading}
        currentUserRole={currentUserRole}
      >
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
      </MemberRouteGuard>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F1ED]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        currentUserRole={currentUserRole}
        onOpenSettings={handleOpenPersonalSettings}
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
              onCreateEvent={handleOpenCreateEvent}
              onViewEvent={handleViewEvent}
              onDeleteEvent={handleDeleteEvent}
              onEditEvent={handleEditEvent}
            />
          ) : activeTab === 'archives' ? (
            <Archives
              archivedContacts={archivedContacts}
              archivedEvents={archivedEvents}
              archivedTeamMembers={archivedTeamMembers}
              archivedIncubatees={archivedIncubatees}
              archivedFounders={archivedFounders}
              onRestoreContact={handleRestoreContact}
              onRestoreEvent={handleRestoreEvent}
              onRestoreTeamMember={handleRestoreTeamMember}
              onRestoreIncubatee={handleRestoreIncubatee}
              onPermanentDeleteContact={handlePermanentDeleteContact}
              onPermanentDeleteEvent={handlePermanentDeleteEvent}
              onPermanentDeleteTeamMember={handlePermanentDeleteTeamMember}
              onPermanentDeleteIncubatee={handlePermanentDeleteIncubatee}
              onDeleteArchivedFounder={handleDeleteArchivedFounder}
              onRemoveFounderFromIncubatee={handleRemoveFounderFromArchivedIncubatee}
              onRestoreFounder={handleRestoreFounder}
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

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-[#FF2B5E]/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-[#FF2B5E]" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900">{incubatees.length}</h3>
                    </div>
                    <p className="text-sm text-gray-600">Total Startups</p>
                  </div>

                  <button
                    onClick={handleOpenCohortSummaryOverlay}
                    className="bg-white rounded-xl p-6 border border-gray-200 text-left hover:border-[#FF2B5E] hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Layers3 className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900">{cohortSummary.length}</h3>
                    </div>
                    <p className="text-sm text-gray-600">Cohort</p>
                  </button>

                  <button
                    onClick={handleOpenStatusSummaryOverlay}
                    className="bg-white rounded-xl p-6 border border-gray-200 text-left hover:border-[#FF2B5E] hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Tags className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900">{statusSummary.length}</h3>
                    </div>
                    <p className="text-sm text-gray-600">Status</p>
                  </button>

                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900">{allFounders.length}</h3>
                    </div>
                    <p className="text-sm text-gray-600">Total Founders</p>
                  </div>
                </div>

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
                        onClick={handleOpenDeleteIncubateeConfirm}
                        disabled={selectedIncubatees.length === 0}
                        className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                      <button
                        onClick={handleOpenIncubateeExport}
                        disabled={incubatees.length === 0}
                        className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleOpenAddFounderModal}
                        className="flex items-center gap-2 bg-[#FF2B5E] text-white px-5 py-2.5 rounded-lg hover:bg-[#E6275A] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Founder
                      </button>
                      <button
                        onClick={handleOpenDeleteFounderConfirm}
                        disabled={selectedFounders.length === 0}
                        className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                      <button
                        onClick={handleOpenFounderExport}
                        disabled={allFounders.length === 0}
                        className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </button>
                    </>
                  )}

                  {/* View Toggle */}
                  <div className="ml-auto flex items-center gap-0 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={handleSwitchToStartupView}
                      className={`w-28 flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        incubateeViewMode === 'Startup'
                          ? 'bg-[#FF2B5E] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Startup
                    </button>
                    <button
                      onClick={handleSwitchToFounderView}
                      className={`w-28 flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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

                <div className="flex items-center gap-3 mb-6">
                  <label className="text-sm text-gray-600">Sort by</label>
                  {incubateeViewMode === 'Startup' ? (
                    <select
                      value={startupSortBy}
                      onChange={handleStartupSortChange}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/30"
                    >
                      <option value="cohort">Cohort</option>
                      <option value="status">Status</option>
                      <option value="alphabetical">Alphabetical order</option>
                    </select>
                  ) : (
                    <select
                      value={founderSortBy}
                      onChange={handleFounderSortChange}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/30"
                    >
                      <option value="roles">Roles</option>
                      <option value="name">Alphabetical order name</option>
                      <option value="startup">Startup</option>
                    </select>
                  )}
                  <div className="relative min-w-[240px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={incubateeSearchQuery}
                      onChange={handleIncubateeSearchChange}
                      placeholder={incubateeViewMode === 'Startup' ? 'Search startup' : 'Search founder'}
                      className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/30"
                    />
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
                ) : filteredStartupIncubatees.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No matching startups found</h3>
                    <p className="text-gray-500">Try a different startup or founder name.</p>
                  </div>
                ) : (
                  <IncubateeCards
                    incubatees={filteredStartupIncubatees}
                    selectedIncubatees={selectedIncubatees}
                    setSelectedIncubatees={setSelectedIncubatees}
                    onViewIncubatee={handleViewIncubatee}
                  />
                )
              ) : (
                <FoundersTable
                  incubatees={sortedIncubatees}
                  unassignedFounders={unassignedFounders}
                  sortBy={founderSortBy}
                  searchQuery={incubateeSearchQuery}
                  onViewFounder={handleViewFounderRow}
                  selectedFounders={selectedFounders}
                  onSelectionChange={setSelectedFounders}
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
                    onClick={handleOpenImport}
                    className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  <button 
                    onClick={handleOpenExport}
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
          incubatees={incubatees}
          onClose={handleCloseCreateEvent}
          onSave={handleCreateEvent}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEvent
          event={editingEvent}
          contacts={contacts}
          onClose={handleCloseEditEvent}
          onSave={handleUpdateEvent}
        />
      )}

      {/* View Event Modal */}
      {viewingEvent && (
        <ViewEvent
          event={viewingEvent}
          contacts={contacts}
          onClose={handleCloseViewEvent}
          onAddAttendees={handleAddAttendees}
          onArchiveEvent={handleDeleteEvent}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportContact
          onClose={handleCloseImport}
          onImport={handleImportContacts}
        />
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportContact
          contacts={contacts}
          selectedContacts={selectedContacts}
          onClose={handleCloseExport}
        />
      )}

      {showIncubateeExport && (
        <ExportIncubatee
          incubatees={incubatees}
          selectedIncubatees={selectedIncubatees}
          onClose={handleCloseIncubateeExport}
        />
      )}

      {showFounderExport && (
        <ExportFounder
          incubatees={incubatees}
          unassignedFounders={unassignedFounders}
          selectedFounders={selectedFounders}
          onClose={handleCloseFounderExport}
        />
      )}

      {showPersonalSettings && (
        <PersonalSettings
          onClose={handleClosePersonalSettings}
          userName={currentUserName}
          userEmail={currentUserEmail}
          hasExistingPassword={hasExistingPassword}
          onPasswordUpdated={handlePasswordUpdated}
        />
      )}

      {/* Incubatee Form Modal */}
      {showIncubateeForm && (
        <IncubateeForm
          incubatee={editingIncubatee}
          allFounders={allFounders}
          cohortLevelOptions={cohortLevelOptions}
          onAddCohortLevel={async (level: number) => {
            const saved = await addCohortLevelToDb(level);
            setCohortLevelOptions((prev) =>
              [...prev.filter((o) => o.level !== saved.level), saved].sort((a, b) => a.level - b.level)
            );
            return saved;
          }}
          statusOptions={statusOptions}
          onAddStatus={async (name: string) => {
            const saved = await addStatusOptionToDb(name);
            setStatusOptions((prev) =>
              [...prev.filter((o) => o.name !== saved.name), saved]
            );
            return saved;
          }}
          onSave={handleSaveIncubatee}
          onClose={handleCloseIncubateeForm}
        />
      )}

      {/* View Incubatee Modal */}
      {viewingIncubatee && (
        <ViewIncubatee
          incubatee={viewingIncubatee}
          onClose={handleCloseViewIncubatee}
          onEdit={handleEditIncubatee}
        />
      )}

      {/* View Founder Modal */}
      {viewingFounder && (
        <ViewFounder
          founder={viewingFounder.founder}
          incubatee={viewingFounder.incubatee}
          onClose={handleCloseViewFounder}
          onSave={handleSaveFounder}
        />
      )}

      {/* Add Founder Modal */}
      {showAddFounderModal && (
        <AddFounderModal
          incubatees={incubatees}
          allFounders={[
            ...incubatees.flatMap((inc) => inc.founders.map((f) => ({ ...f, startupName: inc.startupName }))),
            ...unassignedFounders.map((f) => ({ ...f, startupName: '—' })),
          ]}
          onClose={handleCloseAddFounderModal}
          onSave={handleAddFounderToIncubatee}
          onLinkExisting={handleLinkFounderToIncubatee}
        />
      )}

      {/* Delete Founder Confirmation */}
      {showDeleteFounderConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900">Archive founders?</h3>
            <p className="text-gray-600">
              {selectedFounders.length} founder(s) will be moved to archives. You can restore them later.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDeleteFounderConfirm}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFounders}
                className="px-5 py-2.5 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
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
                onClick={handleCancelDeleteIncubateeConfirm}
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

      {activeSummaryOverlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {activeSummaryOverlay === 'cohort' ? 'Cohort Summary' : 'Status Summary'}
                </h3>
                <p className="text-gray-600">
                  {activeSummaryOverlay === 'cohort'
                    ? `Total cohort levels: ${cohortSummary.length}`
                    : `Total statuses: ${statusSummary.length}`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseSummaryOverlay}
                className="px-3 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>

            {(activeSummaryOverlay === 'cohort' ? cohortSummary : statusSummary).length === 0 ? (
              <p className="text-sm text-gray-500">
                {activeSummaryOverlay === 'cohort'
                  ? 'No cohort data available.'
                  : 'No status data available.'}
              </p>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {(activeSummaryOverlay === 'cohort' ? cohortSummary : statusSummary).map((item) => (
                  <div key={item.label} className="px-4 py-3 flex items-center justify-between gap-4">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600">
                      {item.count} startup{item.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
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
                onClick={handleCancelDeleteConfirm}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchiveContacts}
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
        onConfirm={dialog?.onConfirm ?? handleCloseDialog}
        onCancel={dialog?.onCancel}
      />
    </div>
  );
}