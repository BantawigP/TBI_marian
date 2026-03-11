import { Dispatch, SetStateAction } from 'react';
import type { ContactStatus } from '../../../types';

type UseContactUiStateActionsParams = {
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setGraduatedFrom: Dispatch<SetStateAction<string>>;
  setGraduatedTo: Dispatch<SetStateAction<string>>;
  setStatusFilter: Dispatch<SetStateAction<'all' | ContactStatus>>;
  setSelectedContacts: Dispatch<SetStateAction<string[]>>;
  setActiveTab: Dispatch<SetStateAction<string>>;
};

export const useContactUiStateActions = ({
  setSearchQuery,
  setGraduatedFrom,
  setGraduatedTo,
  setStatusFilter,
  setSelectedContacts,
  setActiveTab,
}: UseContactUiStateActionsParams) => {
  const handleSendEmailCampaign = () => {
    setActiveTab('events');
  };

  const handleReset = () => {
    setSearchQuery('');
    setGraduatedFrom('');
    setGraduatedTo('');
    setStatusFilter('all');
    setSelectedContacts([]);
  };

  const handleEmailUnverifiedContacts = () => {
    setSearchQuery('');
    setGraduatedFrom('');
    setGraduatedTo('');
    setStatusFilter('Unverified');
    setSelectedContacts([]);
    setActiveTab('contacts');
  };

  return {
    handleSendEmailCampaign,
    handleReset,
    handleEmailUnverifiedContacts,
  };
};
