import { Dispatch, SetStateAction } from 'react';
import type { Founder, Incubatee } from '../components/IncubateeTable';

type UseIncubateeArchiveActionsParams = {
  archivedIncubatees: Incubatee[];
  setArchivedIncubatees: Dispatch<SetStateAction<Incubatee[]>>;
  setIncubatees: Dispatch<SetStateAction<Incubatee[]>>;
  setArchivedFounders: Dispatch<SetStateAction<(Founder & { startupName: string })[]>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  restoreIncubateesInDb: (ids: string[]) => Promise<void>;
  deleteIncubateePermanentlyInDb: (id: string) => Promise<void>;
};

export const useIncubateeArchiveActions = ({
  archivedIncubatees,
  setArchivedIncubatees,
  setIncubatees,
  setArchivedFounders,
  setIsSyncing,
  setSyncError,
  restoreIncubateesInDb,
  deleteIncubateePermanentlyInDb,
}: UseIncubateeArchiveActionsParams) => {
  const handleRestoreIncubatee = async (incubatee: Incubatee) => {
    setArchivedIncubatees((prev) => prev.filter((saved) => saved.id !== incubatee.id));
    setIncubatees((prev) => [...prev, incubatee]);

    setIsSyncing(true);
    try {
      await restoreIncubateesInDb([incubatee.id]);
      console.log('✅ Incubatee restored in database');
    } catch (error) {
      console.error('❌ Failed to restore incubatee:', error);
      setSyncError('Incubatee restored locally but failed to sync with database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePermanentDeleteIncubatee = async (id: string) => {
    setIsSyncing(true);
    setSyncError(null);

    const deletedIncubatee = archivedIncubatees.find((incubatee) => incubatee.id === id);
    if (deletedIncubatee && deletedIncubatee.founders.length > 0) {
      const orphanedFounders = deletedIncubatee.founders.map((founder) => ({
        ...founder,
        startupName: deletedIncubatee.startupName,
      }));
      setArchivedFounders((prev) => [...prev, ...orphanedFounders]);
    }

    try {
      await deleteIncubateePermanentlyInDb(id);
      setArchivedIncubatees((prev) => prev.filter((incubatee) => incubatee.id !== id));
      console.log('✅ Incubatee permanently deleted, founders preserved');
    } catch (error) {
      console.error('❌ Failed to permanently delete incubatee:', error);
      setSyncError('Failed to permanently delete incubatee from database.');
      if (deletedIncubatee) {
        const founderIds = new Set(deletedIncubatee.founders.map((founder) => founder.id));
        setArchivedFounders((prev) => prev.filter((founder) => !founderIds.has(founder.id)));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    handleRestoreIncubatee,
    handlePermanentDeleteIncubatee,
  };
};
