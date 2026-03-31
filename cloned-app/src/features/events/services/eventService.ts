import { supabase } from '../../../lib/supabaseClient'
import type { Event, Contact, RsvpStatus } from '../../../types'

const numberOrNull = (value: string | number | undefined | null) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

const normalizeOptionalText = (value?: string | null) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length ? trimmed : null;
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

const insertEventParticipants = async (
	rows: Array<{ event_id: number; alumni_id: number; rsvp_status?: RsvpStatus }>
) => {
	if (!rows.length) return;

	const { error } = await supabase.from('event_participants').insert(rows);

	if (error && (error.code === '42703' || error.code === 'PGRST204')) {
		console.warn('event_participants.rsvp_status missing; inserting without status');
		const fallbackRows = rows.map(({ event_id, alumni_id }) => ({ event_id, alumni_id }));
		const { error: fallbackError } = await supabase.from('event_participants').insert(fallbackRows);
		if (fallbackError) throw fallbackError;
		return;
	}

	if (error) throw error;
};

export async function createEvent(
	eventData: Omit<Event, 'id' | 'attendees'>,
	attendees: Contact[]
): Promise<Event> {
	try {
		const normalizedDate = normalizeOptionalText(eventData.date);
		const normalizedTime = normalizeOptionalText(eventData.time);
		const normalizedLocation = normalizeOptionalText(eventData.location);

		const locationId = await ensureIdByName('locations', 'name', 'location_id', normalizedLocation);

		const { data: event, error: eventError } = await supabase
			.from('events')
			.insert({
				title: eventData.title,
				description: eventData.description,
				event_date: normalizedDate,
				event_time: normalizedTime,
				location_id: locationId,
			})
			.select('event_id,title,description,event_date,event_time,location_id,locations(location_id,name,city,country)')
			.single()

		const eventErrorMessage = (eventError as { message?: string } | null)?.message ?? '';

		if (
			eventError &&
			eventError.code === '23505' &&
			(
				eventErrorMessage.includes('event_title_key') ||
				eventErrorMessage.includes('events_title_key') ||
				eventErrorMessage.includes('Key (title)=')
			)
		) {
			throw new Error('Duplicate event title is currently blocked by an old database constraint. Apply the latest migration and try again.');
		}

		if (eventError) throw eventError

		const eventId = event?.event_id ?? null;

		if (eventId && attendees.length > 0) {
			const attendeeRows = attendees
				.filter((attendee) => attendee.alumniId != null)
				.map((attendee) => ({
					event_id: eventId,
					alumni_id: attendee.alumniId as number,
					rsvp_status: attendee.rsvpStatus ?? 'pending',
				}));

			await insertEventParticipants(attendeeRows);
		}

		let locationName = normalizedLocation ?? '';

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
			date: event.event_date ?? '',
			time: event.event_time ?? '',
			location: locationName,
			locationId: event.location_id,
			attendees,
		}

		return createdEvent
	} catch (error) {
		console.error('Error creating event:', error)
		throw error
	}
}

export async function updateEvent(
	eventId: string,
	eventData: Omit<Event, 'id' | 'attendees'>,
	attendees: Contact[]
): Promise<Event> {
	try {
		const normalizedDate = normalizeOptionalText(eventData.date);
		const normalizedTime = normalizeOptionalText(eventData.time);
		const normalizedLocation = normalizeOptionalText(eventData.location);

		const locationId = await ensureIdByName('locations', 'name', 'location_id', normalizedLocation);

		const { data: event, error: eventError } = await supabase
			.from('events')
			.update({
				title: eventData.title,
				description: eventData.description,
				event_date: normalizedDate,
				event_time: normalizedTime,
				location_id: locationId,
			})
			.eq('event_id', parseInt(eventId))
			.select('event_id,title,description,event_date,event_time,location_id,locations(location_id,name,city,country)')
			.single()

		const eventErrorMessage = (eventError as { message?: string } | null)?.message ?? '';

		if (
			eventError &&
			eventError.code === '23505' &&
			(
				eventErrorMessage.includes('event_title_key') ||
				eventErrorMessage.includes('events_title_key') ||
				eventErrorMessage.includes('Key (title)=')
			)
		) {
			throw new Error('Duplicate event title is currently blocked by an old database constraint. Apply the latest migration and try again.');
		}

		if (eventError) throw eventError

		const { error: deleteError } = await supabase
			.from('event_participants')
			.delete()
			.eq('event_id', parseInt(eventId))

		if (deleteError) throw deleteError

		if (attendees.length > 0) {
			const attendeeRows = attendees
				.filter((attendee) => attendee.alumniId != null)
				.map((attendee) => ({
					event_id: parseInt(eventId),
					alumni_id: attendee.alumniId as number,
					rsvp_status: attendee.rsvpStatus ?? 'pending',
				}));

			await insertEventParticipants(attendeeRows);
		}

		let locationName = normalizedLocation ?? '';

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
			date: event.event_date ?? '',
			time: event.event_time ?? '',
			location: locationName,
			locationId: event.location_id,
			attendees,
		}

		return updatedEvent
	} catch (error) {
		console.error('Error updating event:', error)
		throw error
	}
}

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
