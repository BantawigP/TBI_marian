import { Dispatch, SetStateAction } from 'react';

type UseIncubateeUiActionsParams = {
  setShowIncubateeExport: Dispatch<SetStateAction<boolean>>;
  setShowFounderExport: Dispatch<SetStateAction<boolean>>;
  setActiveSummaryOverlay: Dispatch<SetStateAction<'cohort' | 'status' | null>>;
};

export const useIncubateeUiActions = ({
  setShowIncubateeExport,
  setShowFounderExport,
  setActiveSummaryOverlay,
}: UseIncubateeUiActionsParams) => {
  const handleOpenIncubateeExport = () => {
    setShowIncubateeExport(true);
  };

  const handleCloseIncubateeExport = () => {
    setShowIncubateeExport(false);
  };

  const handleOpenFounderExport = () => {
    setShowFounderExport(true);
  };

  const handleCloseFounderExport = () => {
    setShowFounderExport(false);
  };

  const handleOpenCohortSummaryOverlay = () => {
    setActiveSummaryOverlay('cohort');
  };

  const handleOpenStatusSummaryOverlay = () => {
    setActiveSummaryOverlay('status');
  };

  const handleCloseSummaryOverlay = () => {
    setActiveSummaryOverlay(null);
  };

  return {
    handleOpenIncubateeExport,
    handleCloseIncubateeExport,
    handleOpenFounderExport,
    handleCloseFounderExport,
    handleOpenCohortSummaryOverlay,
    handleOpenStatusSummaryOverlay,
    handleCloseSummaryOverlay,
  };
};
