import { Dispatch, SetStateAction } from 'react';
import type { Event } from '../../../types';

type UseEventModalActionsParams = {
  setShowCreateEvent: Dispatch<SetStateAction<boolean>>;
  setEditingEvent: Dispatch<SetStateAction<Event | null>>;
  setViewingEvent: Dispatch<SetStateAction<Event | null>>;
};

export const useEventModalActions = ({
  setShowCreateEvent,
  setEditingEvent,
  setViewingEvent,
}: UseEventModalActionsParams) => {
  const handleOpenCreateEvent = () => setShowCreateEvent(true);
  const handleCloseCreateEvent = () => setShowCreateEvent(false);

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
  };

  const handleCloseEditEvent = () => {
    setEditingEvent(null);
  };

  const handleViewEvent = (event: Event) => {
    setViewingEvent(event);
  };

  const handleCloseViewEvent = () => {
    setViewingEvent(null);
  };

  return {
    handleOpenCreateEvent,
    handleCloseCreateEvent,
    handleEditEvent,
    handleCloseEditEvent,
    handleViewEvent,
    handleCloseViewEvent,
  };
};
