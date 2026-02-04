import type { Contact, Event } from '../types';
import { supabase } from './supabaseClient';

export const sendEventInvites = async (event: Event, attendees: Contact[]) => {
  if (!attendees.length) return { skipped: true } as const;

  const payload = {
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
    },
    attendees: attendees.map((attendee) => ({
      email: attendee.email,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      name: attendee.name,
      alumniId: attendee.alumniId ? Number(attendee.alumniId) : undefined,
      rsvpStatus: attendee.rsvpStatus,
    })),
  };

  const { data, error } = await supabase.functions.invoke('send-event-invite', {
    body: payload,
  });

  if (error) {
    throw error;
  }

  return data;
};
