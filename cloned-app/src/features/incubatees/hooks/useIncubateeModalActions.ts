import { Dispatch, SetStateAction } from 'react';
import type { Founder, Incubatee } from '../components/IncubateeTable';

type UseIncubateeModalActionsParams = {
  setEditingIncubatee: Dispatch<SetStateAction<Incubatee | null>>;
  setShowIncubateeForm: Dispatch<SetStateAction<boolean>>;
  setViewingIncubatee: Dispatch<SetStateAction<Incubatee | null>>;
  setViewingFounder: Dispatch<SetStateAction<{ founder: Founder; incubatee: Incubatee } | null>>;
  setShowAddFounderModal: Dispatch<SetStateAction<boolean>>;
};

export const useIncubateeModalActions = ({
  setEditingIncubatee,
  setShowIncubateeForm,
  setViewingIncubatee,
  setViewingFounder,
  setShowAddFounderModal,
}: UseIncubateeModalActionsParams) => {
  const handleNewIncubatee = () => {
    setEditingIncubatee(null);
    setShowIncubateeForm(true);
  };

  const handleEditIncubatee = (incubatee: Incubatee) => {
    setViewingIncubatee(null);
    setEditingIncubatee(incubatee);
    setShowIncubateeForm(true);
  };

  const handleCloseIncubateeForm = () => {
    setShowIncubateeForm(false);
    setEditingIncubatee(null);
  };

  const handleViewIncubatee = (incubatee: Incubatee) => {
    setViewingIncubatee(incubatee);
  };

  const handleCloseViewIncubatee = () => {
    setViewingIncubatee(null);
  };

  const handleViewFounder = (founder: Founder, incubatee: Incubatee) => {
    setViewingFounder({ founder, incubatee });
  };

  const handleCloseViewFounder = () => {
    setViewingFounder(null);
  };

  const handleOpenAddFounderModal = () => {
    setShowAddFounderModal(true);
  };

  const handleCloseAddFounderModal = () => {
    setShowAddFounderModal(false);
  };

  return {
    handleNewIncubatee,
    handleEditIncubatee,
    handleCloseIncubateeForm,
    handleViewIncubatee,
    handleCloseViewIncubatee,
    handleViewFounder,
    handleCloseViewFounder,
    handleOpenAddFounderModal,
    handleCloseAddFounderModal,
  };
};
