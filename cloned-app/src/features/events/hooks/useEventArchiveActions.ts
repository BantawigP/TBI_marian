import { Dispatch, SetStateAction } from 'react';
import type { Event } from '../../../types';

type ConfirmConfig = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger' | 'neutral' | 'success';
};

type UseEventArchiveActionsParams = {
  events: Event[];
  archivedEvents: Event[];
  setEvents: Dispatch<SetStateAction<Event[]>>;
  setArchivedEvents: Dispatch<SetStateAction<Event[]>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  openConfirm: (config: ConfirmConfig) => Promise<boolean>;
  deleteEventFromSupabase: (eventId: string) => Promise<void>;
};

export const useEventArchiveActions = ({
  events,
  archivedEvents,
  setEvents,
  setArchivedEvents,
  setSyncError,
  openConfirm,
  deleteEventFromSupabase,
}: UseEventArchiveActionsParams) => {
  const handleDeleteEvent = async (eventId: string) => {
    console.log('🗑️ Delete event requested:', eventId);
    const confirmed = await openConfirm({
      title: 'Delete event',
      message: 'Are you sure you want to delete this event?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });

    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      return;
    }

    console.log('✅ User confirmed deletion');

    const eventToArchive = events.find((event) => event.id === eventId);
    console.log('Event to archive:', eventToArchive);
    console.log('Current archived events:', archivedEvents.length);

    if (eventToArchive) {
      const updatedArchive = [...archivedEvents, eventToArchive];
      setArchivedEvents(updatedArchive);
      console.log('✅ Event added to archive. New archive count:', updatedArchive.length);
    } else {
      console.warn('⚠️ Event not found in events list');
    }

    const updatedEvents = events.filter((event) => event.id !== eventId);
    setEvents(updatedEvents);
    console.log('✅ Event removed from active list. Remaining events:', updatedEvents.length);

    deleteEventFromSupabase(eventId).catch((error) => {
      console.error('❌ Failed to mark event as inactive in database', error);
      setSyncError('Event archived locally but failed to update in database.');
    });
  };

  return {
    handleDeleteEvent,
  };
};
