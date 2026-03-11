import { Dispatch, SetStateAction } from 'react';
import type { Contact, Event } from '../../../types';
import { updateEvent } from '../services/eventService';

type UseEventActionsParams = {
  events: Event[];
  viewingEvent: Event | null;
  setEvents: Dispatch<SetStateAction<Event[]>>;
  setViewingEvent: Dispatch<SetStateAction<Event | null>>;
  setEditingEvent: Dispatch<SetStateAction<Event | null>>;
  setShowCreateEvent: Dispatch<SetStateAction<boolean>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  triggerEventInvites: (event: Event, attendees: Contact[], context: string) => Promise<void>;
  persistEventAttendees: (eventId: string, attendees: Contact[]) => Promise<void>;
};

export const useEventActions = ({
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
}: UseEventActionsParams) => {
  const handleCreateEvent = async (event: Event) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log('App - handleCreateEvent received event:', {
        id: event.id,
        title: event.title,
        attendeeCount: event.attendees.length,
        attendees: event.attendees.map((attendee) => ({ id: attendee.id, name: attendee.name, alumniId: attendee.alumniId })),
      });

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

      const updatedEvent = await updateEvent(eventId, eventData, attendees);

      setEvents((prev) =>
        prev.map((event) => (event.id === eventId ? updatedEvent : event))
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

  const handleAddAttendees = async (eventId: string, newAttendees: Contact[]) => {
    console.log('🎯 App - handleAddAttendees called:', {
      eventId,
      newAttendeesCount: newAttendees.length,
      newAttendees: newAttendees.map((attendee) => ({ id: attendee.id, name: attendee.name, alumniId: attendee.alumniId })),
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

    if (viewingEvent && viewingEvent.id === eventId) {
      const updatedViewingEvent = updatedEvents.find((event) => event.id === eventId);
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

  return {
    handleCreateEvent,
    handleUpdateEvent,
    handleAddAttendees,
  };
};
