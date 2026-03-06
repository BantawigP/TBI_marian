import { Dispatch, SetStateAction } from 'react';

type UseAuthUiActionsParams = {
  setShowPersonalSettings: Dispatch<SetStateAction<boolean>>;
  setHasExistingPassword: Dispatch<SetStateAction<boolean>>;
};

export const useAuthUiActions = ({
  setShowPersonalSettings,
  setHasExistingPassword,
}: UseAuthUiActionsParams) => {
  const handleOpenPersonalSettings = () => {
    setShowPersonalSettings(true);
  };

  const handleClosePersonalSettings = () => {
    setShowPersonalSettings(false);
  };

  const handlePasswordUpdated = () => {
    setHasExistingPassword(true);
    localStorage.setItem('auth_method', 'password');
  };

  return {
    handleOpenPersonalSettings,
    handleClosePersonalSettings,
    handlePasswordUpdated,
  };
};
