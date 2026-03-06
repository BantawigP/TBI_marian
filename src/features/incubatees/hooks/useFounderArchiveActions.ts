import { Dispatch, SetStateAction } from 'react';
import type { Founder, Incubatee } from '../components/IncubateeTable';

type UseFounderArchiveActionsParams = {
  setArchivedFounders: Dispatch<SetStateAction<(Founder & { startupName: string })[]>>;
  setArchivedIncubatees: Dispatch<SetStateAction<Incubatee[]>>;
  setUnassignedFounders: Dispatch<SetStateAction<Founder[]>>;
  deleteFoundersFromSupabase: (founderIds: string[]) => Promise<void>;
};

export const useFounderArchiveActions = ({
  setArchivedFounders,
  setArchivedIncubatees,
  setUnassignedFounders,
  deleteFoundersFromSupabase,
}: UseFounderArchiveActionsParams) => {
  const handleDeleteArchivedFounder = async (founderId: string) => {
    setArchivedFounders((prev) => prev.filter((founder) => founder.id !== founderId));
    try {
      await deleteFoundersFromSupabase([founderId]);
    } catch (error) {
      console.error('❌ Failed to permanently delete founder from database:', error);
    }
  };

  const handleRemoveFounderFromArchivedIncubatee = async (incubateeId: string, founderId: string) => {
    setArchivedIncubatees((prev) =>
      prev.map((incubatee) =>
        incubatee.id === incubateeId
          ? { ...incubatee, founders: incubatee.founders.filter((founder) => founder.id !== founderId) }
          : incubatee
      )
    );
    try {
      await deleteFoundersFromSupabase([founderId]);
    } catch (error) {
      console.error('❌ Failed to permanently delete founder from database:', error);
    }
  };

  const handleRestoreFounder = (founder: Founder, incubateeId: string | null) => {
    setUnassignedFounders((prev) => [...prev, founder]);
    if (incubateeId) {
      setArchivedIncubatees((prev) =>
        prev.map((incubatee) =>
          incubatee.id === incubateeId
            ? { ...incubatee, founders: incubatee.founders.filter((savedFounder) => savedFounder.id !== founder.id) }
            : incubatee
        )
      );
    }
  };

  return {
    handleDeleteArchivedFounder,
    handleRemoveFounderFromArchivedIncubatee,
    handleRestoreFounder,
  };
};
