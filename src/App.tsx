import { useEffect, useState } from 'react';
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
import { Plus, Upload, Download, Trash2 } from 'lucide-react';
import type { Contact, ContactStatus, Event, RsvpStatus, TeamMember } from './types';
import { sendVerificationEmail } from './components/email/sendVerificationEmail';
import { supabase } from './lib/supabaseClient';
import { sendEventInvites } from './lib/eventInviteService';
import { updateEvent, deleteEventPermanently } from './lib/eventService';
import {
  fetchArchivedTeamMembers,
  restoreTeamMember,
  deleteTeamMemberPermanently,
} from './lib/teamService';

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

const CONTACT_SELECT_BASE =
  'alumni_id,f_name,l_name,date_graduated,email_id,contact_number,college_id,program_id,company_id,occupation_id,colleges(college_id,college_name),programs(program_id,program_name),companies(company_id,company_name),occupations(occupation_id,occupation_title),email_address(email_id,email,status)';
const CONTACT_SELECT_WITH_ADDRESS = `${CONTACT_SELECT_BASE},alumniaddress_id`;

let supportsAlumniAddressColumn = true;
let loggedMissingAlumniAddressColumn = false;
let supportsEventRsvpStatus = true;
let loggedMissingEventRsvpStatus = false;

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

const getContactSelect = () =>
  supportsAlumniAddressColumn ? CONTACT_SELECT_WITH_ADDRESS : CONTACT_SELECT_BASE;

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
  const [teamRefreshToken, setTeamRefreshToken] = useState(0);

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

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setIsLoggedIn(!!data.session);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsLoggedIn(!!session);
      }
    });

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const fetchContactsFromSupabase = async (): Promise<Contact[]> => {
    let { data, error } = await supabase.from('alumni').select(getContactSelect()).or('is_active.eq.true,is_active.is.null');

    if (error && error.code === '42703') {
      noteMissingAlumniAddressColumn();
      supportsAlumniAddressColumn = false;
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

    if (error && error.code === '42703') {
      noteMissingAlumniAddressColumn();
      supportsAlumniAddressColumn = false;
      ({ data, error } = await supabase.from('alumni').select(getContactSelect()).eq('is_active', false));
    }

    if (error) {
      throw error;
    }

    const contacts = (data ?? []).map(mapContactRowToContact);
    return hydrateContactsWithAddresses(contacts);
  };

  function eventAlumniFields() {
    return supportsAlumniAddressColumn
      ? 'alumni_id,alumniaddress_id,f_name,l_name,email_id,date_graduated,contact_number,college_id,program_id,company_id,occupation_id,colleges(college_id,college_name),programs(program_id,program_name),companies(company_id,company_name),occupations(occupation_id,occupation_title),email_address(email_id,email,status)'
      : 'alumni_id,f_name,l_name,email_id,date_graduated,contact_number,college_id,program_id,company_id,occupation_id,colleges(college_id,college_name),programs(program_id,program_name),companies(company_id,company_name),occupations(occupation_id,occupation_title),email_address(email_id,email,status)';
  }

  function eventParticipantsSelect() {
    return supportsEventRsvpStatus
      ? `event_participants(rsvp_status,alumni:alumni_id(${eventAlumniFields()}))`
      : `event_participants(alumni:alumni_id(${eventAlumniFields()}))`;
  }

  const fetchEventsFromSupabase = async (): Promise<Event[]> => {
    const selectClause = `event_id,title,description,event_date,event_time,location_id,is_active,locations(location_id,name,city,country),${eventParticipantsSelect()}`;
    let { data, error } = await supabase.from('events').select(selectClause).or('is_active.eq.true,is_active.is.null');

    if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('rsvp_status'))) {
      if (error.message?.includes('rsvp_status')) {
        noteMissingEventRsvpStatus();
        supportsEventRsvpStatus = false;
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

    if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('rsvp_status'))) {
      if (error.message?.includes('rsvp_status')) {
        noteMissingEventRsvpStatus();
        supportsEventRsvpStatus = false;
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
        
        const [loadedContacts, loadedEvents, loadedArchivedContacts, loadedArchivedEvents, loadedArchivedTeams] = await Promise.all([
          fetchContactsFromSupabase(),
          fetchEventsFromSupabase(),
          fetchArchivedContactsFromSupabase(),
          fetchArchivedEventsFromSupabase(),
          fetchArchivedTeamMembersFromSupabase(),
        ]);

        console.log('✅ Data fetched successfully!');
        console.log('  - Contacts:', loadedContacts.length);
        console.log('  - Events:', loadedEvents.length);
        console.log('  - Archived Contacts:', loadedArchivedContacts.length);
        console.log('  - Archived Events:', loadedArchivedEvents.length);
        console.log('  - Archived Team Members:', loadedArchivedTeams.length);

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

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Supabase: failed to sign out', error);
    }

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
  };

  const handleReset = () => {
    setSearchQuery('');
    setGraduatedFrom('');
    setGraduatedTo('');
    setSelectedContacts([]);
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

  const handleDeleteEvent = (eventId: string) => {
    console.log('🗑️ Delete event requested:', eventId);
    
    if (confirm(`Are you sure you want to delete this event?`)) {
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
    } else {
      console.log('❌ User cancelled deletion');
    }
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

    return matchesQuery && matchesDate;
  });

  // Show login page if not logged in
  if (!isLoggedIn && !showClaimAccess) {
    return <Login onLogin={handleLogin} />;
  }

  // Show claim access page if token is present
  if (showClaimAccess) {
    return <ClaimAccess onSuccess={() => {
      setShowClaimAccess(false);
      setIsLoggedIn(true);
      // Clear token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }} />;
  }

  return (
    <div className="flex h-screen bg-[#F5F1ED]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
      
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
            <Home contacts={contacts} onViewContact={handleViewContact} />
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
            />
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
    </div>
  );
}