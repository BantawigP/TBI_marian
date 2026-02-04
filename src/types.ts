export type ContactStatus = 'Verified' | 'Unverified';
export type RsvpStatus = 'going' | 'not_going' | 'pending';

// Frontend contact model mapped from the Supabase alumni schema
// plus resolved dimension names for college/program/company/occupation.
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  college: string;
  program: string;
  email: string;
  status: ContactStatus;
  contactNumber?: string;
  dateGraduated?: string;
  occupation?: string;
  company?: string;
  address?: string;
  collegeId?: number;
  programId?: number;
  companyId?: number;
  occupationId?: number;
  locationId?: number;
  alumniId?: number;
  alumniAddressId?: number;
  rsvpStatus?: RsvpStatus;
}

// Frontend event model mapped from the Supabase events schema.
export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  locationId?: number;
  attendees: Contact[];
}

// Team member roles
export type TeamRole = 'Admin' | 'Manager' | 'Member';

// Team member model
export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: TeamRole;
  department?: string;
  avatarColor?: string;
  phone?: string;
  joinedDate?: string;
  hasAccess?: boolean;
}
