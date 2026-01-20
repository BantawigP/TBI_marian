import { supabase } from './supabaseClient'
import type { Event, Contact } from '../types'

const numberOrNull = (value: string | number | undefined | null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}


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
    throw error;
  }

  return (data as Record<string, any> | null)?.[idColumn] ?? null;
};

/**
 * Creates an event and saves it to the database
 * @param eventData - Event details (title, description, date, time, location)
 * @param attendees - Array of Contact objects attending the event
 * @returns The created event with database ID
 */
export async function createEvent(
  eventData: Omit<Event, 'id' | 'attendees'>,
  attendees: Contact[]
): Promise<Event> {
  try {
    // Get or create location ID
    const locationId = await ensureIdByName('locations', 'name', 'location_id', eventData.location);

    // Insert event into the events table
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: eventData.title,
        description: eventData.description,
        event_date: eventData.date,
        event_time: eventData.time,
        location_id: locationId,
      })
      .select('event_id,title,description,event_date,event_time,location_id,locations(location_id,name,city,country)')
      .single()

    if (eventError) throw eventError

    const eventId = event?.event_id ?? null;

    // Create event attendees records
    if (eventId && attendees.length > 0) {
      const attendeeRows = attendees
        .filter((attendee) => attendee.alumniId != null)
        .map((attendee) => ({ event_id: eventId, alumni_id: attendee.alumniId }));

      if (attendeeRows.length > 0) {
        const { error: attendeeError } = await supabase
          .from('event_participants')
          .insert(attendeeRows)

        if (attendeeError) throw attendeeError
      }
    }

    // Return the event with attendees
    let locationName = eventData.location;
    
    if (event.locations) {
      if (Array.isArray(event.locations) && event.locations.length > 0) {
        locationName = (event.locations[0] as any)?.name ?? eventData.location;
      } else if (!Array.isArray(event.locations) && typeof event.locations === 'object') {
        locationName = (event.locations as any)?.name ?? eventData.location;
      }
    }

    const createdEvent: Event = {
      id: event.event_id.toString(),
      title: event.title,
      description: event.description,
      date: event.event_date,
      time: event.event_time,
      location: locationName,
      locationId: event.location_id,
      attendees,
    }

    console.log('Created event with attendees:', {
      eventId: eventId,
      attendeeCount: attendees.length,
      attendees: attendees.map(a => ({ id: a.id, name: a.name, alumniId: a.alumniId }))
    });

    return createdEvent
  } catch (error) {
    console.error('Error creating event:', error)
    throw error
  }
}

/**
 * Updates an existing event in the database
 * @param eventId - The ID of the event to update
 * @param eventData - Updated event details
 * @param attendees - Updated array of Contact objects attending the event
 * @returns The updated event
 */
export async function updateEvent(
  eventId: string,
  eventData: Omit<Event, 'id' | 'attendees'>,
  attendees: Contact[]
): Promise<Event> {
  try {
    // Get or create location ID
    const locationId = await ensureIdByName('locations', 'name', 'location_id', eventData.location);

    // Update event in the events table
    const { data: event, error: eventError } = await supabase
      .from('events')
      .update({
        title: eventData.title,
        description: eventData.description,
        event_date: eventData.date,
        event_time: eventData.time,
        location_id: locationId,
      })
      .eq('event_id', parseInt(eventId))
      .select('event_id,title,description,event_date,event_time,location_id,locations(location_id,name,city,country)')
      .single()

    if (eventError) throw eventError

    // Delete existing attendees
    const { error: deleteError } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', parseInt(eventId))

    if (deleteError) throw deleteError

    // Add new attendees
    if (attendees.length > 0) {
      const attendeeRows = attendees
        .filter((attendee) => attendee.alumniId != null)
        .map((attendee) => ({ event_id: parseInt(eventId), alumni_id: attendee.alumniId }));

      if (attendeeRows.length > 0) {
        const { error: attendeeError } = await supabase
          .from('event_participants')
          .insert(attendeeRows)

        if (attendeeError) throw attendeeError
      }
    }

    // Return the updated event with attendees
    let locationName = eventData.location;
    
    if (event.locations) {
      if (Array.isArray(event.locations) && event.locations.length > 0) {
        locationName = (event.locations[0] as any)?.name ?? eventData.location;
      } else if (!Array.isArray(event.locations) && typeof event.locations === 'object') {
        locationName = (event.locations as any)?.name ?? eventData.location;
      }
    }

    const updatedEvent: Event = {
      id: event.event_id.toString(),
      title: event.title,
      description: event.description,
      date: event.event_date,
      time: event.event_time,
      location: locationName,
      locationId: event.location_id,
      attendees,
    }

    console.log('Updated event with attendees:', {
      eventId: eventId,
      attendeeCount: attendees.length,
      attendees: attendees.map(a => ({ id: a.id, name: a.name, alumniId: a.alumniId }))
    });

    return updatedEvent
  } catch (error) {
    console.error('Error updating event:', error)
    throw error
  }
}

/**
 * Permanently deletes an event and any linked event_participants rows.
 * Call this when removing an archived event.
 */
export async function deleteEventPermanently(eventId: string): Promise<void> {
  const numericEventId = numberOrNull(eventId)

  if (!numericEventId) {
    throw new Error('Invalid event ID; cannot delete')
  }

  const { error: participantsError } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', numericEventId)

  if (participantsError) {
    throw participantsError
  }

  const { error: eventError } = await supabase
    .from('events')
    .delete()
    .eq('event_id', numericEventId)

  if (eventError) {
    throw eventError
  }
}
