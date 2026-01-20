export type ContactStatus = 'Contacted' | 'Pending';

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
