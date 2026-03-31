import { Dispatch, SetStateAction } from 'react';

type UseContactModalActionsParams = {
  setShowImport: Dispatch<SetStateAction<boolean>>;
  setShowExport: Dispatch<SetStateAction<boolean>>;
};

export const useContactModalActions = ({
  setShowImport,
  setShowExport,
}: UseContactModalActionsParams) => {
  const handleOpenImport = () => setShowImport(true);
  const handleCloseImport = () => setShowImport(false);

  const handleOpenExport = () => setShowExport(true);
  const handleCloseExport = () => setShowExport(false);

  return {
    handleOpenImport,
    handleCloseImport,
    handleOpenExport,
    handleCloseExport,
  };
};
