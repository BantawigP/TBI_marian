import { Dispatch, SetStateAction } from 'react';

type UseIncubateeConfirmActionsParams = {
  selectedFounders: string[];
  selectedIncubatees: string[];
  setShowDeleteFounderConfirm: Dispatch<SetStateAction<boolean>>;
  setShowDeleteIncubateeConfirm: Dispatch<SetStateAction<boolean>>;
};

export const useIncubateeConfirmActions = ({
  selectedFounders,
  selectedIncubatees,
  setShowDeleteFounderConfirm,
  setShowDeleteIncubateeConfirm,
}: UseIncubateeConfirmActionsParams) => {
  const handleOpenDeleteFounderConfirm = () => {
    if (selectedFounders.length > 0) {
      setShowDeleteFounderConfirm(true);
    }
  };

  const handleCancelDeleteFounderConfirm = () => {
    setShowDeleteFounderConfirm(false);
  };

  const handleOpenDeleteIncubateeConfirm = () => {
    if (selectedIncubatees.length > 0) {
      setShowDeleteIncubateeConfirm(true);
    }
  };

  const handleCancelDeleteIncubateeConfirm = () => {
    setShowDeleteIncubateeConfirm(false);
  };

  return {
    handleOpenDeleteFounderConfirm,
    handleCancelDeleteFounderConfirm,
    handleOpenDeleteIncubateeConfirm,
    handleCancelDeleteIncubateeConfirm,
  };
};
