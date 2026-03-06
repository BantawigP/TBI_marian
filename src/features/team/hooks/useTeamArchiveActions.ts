import { Dispatch, SetStateAction } from 'react';
import type { TeamMember } from '../../../types';
import { restoreTeamMember, deleteTeamMemberPermanently } from '../services/teamService';

type UseTeamArchiveActionsParams = {
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  setArchivedTeamMembers: Dispatch<SetStateAction<TeamMember[]>>;
  setTeamRefreshToken: Dispatch<SetStateAction<number>>;
};

export const useTeamArchiveActions = ({
  setIsSyncing,
  setSyncError,
  setArchivedTeamMembers,
  setTeamRefreshToken,
}: UseTeamArchiveActionsParams) => {
  const handleRestoreTeamMember = async (member: TeamMember) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await restoreTeamMember(member.id);
      setArchivedTeamMembers((prev) => prev.filter((savedMember) => savedMember.id !== member.id));
      setTeamRefreshToken((token) => token + 1);
    } catch (error) {
      console.error('❌ Failed to restore team member', error);
      setSyncError('Failed to restore team member from Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePermanentDeleteTeamMember = async (id: string) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await deleteTeamMemberPermanently(id);
      setArchivedTeamMembers((prev) => prev.filter((member) => member.id !== id));
      setTeamRefreshToken((token) => token + 1);
    } catch (error) {
      console.error('❌ Failed to permanently delete team member', error);
      setSyncError('Failed to permanently delete team member from Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleArchiveTeamMemberLocal = (member: TeamMember) => {
    setArchivedTeamMembers((prev) => {
      const exists = prev.some((savedMember) => savedMember.id === member.id);
      return exists ? prev : [...prev, member];
    });
    setTeamRefreshToken((token) => token + 1);
  };

  return {
    handleRestoreTeamMember,
    handlePermanentDeleteTeamMember,
    handleArchiveTeamMemberLocal,
  };
};
