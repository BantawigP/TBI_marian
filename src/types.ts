export type ContactStatus = 'Contacted' | 'Pending';

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
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendees: Contact[];
}
