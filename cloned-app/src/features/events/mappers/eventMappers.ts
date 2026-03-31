import type { Contact, Event, RsvpStatus } from '../../../types';

export const mapEventRowToEvent = (
  row: Record<string, any>,
  mapContactRowToContact: (row: Record<string, any>) => Contact
): Event => {
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
    location: locationName || '',
    locationId: row.location_id ?? row.locations?.location_id ?? undefined,
    attendees,
  };
};
