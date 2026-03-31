import type { FounderRow } from '../components/FoundersTable';
import type { Incubatee } from '../components/IncubateeTable';

type UseFounderTableActionsParams = {
  incubatees: Incubatee[];
  handleViewFounder: (founder: Incubatee['founders'][number], incubatee: Incubatee) => void;
};

export const useFounderTableActions = ({
  incubatees,
  handleViewFounder,
}: UseFounderTableActionsParams) => {
  const handleViewFounderRow = (row: FounderRow) => {
    const incubatee = incubatees.find((savedIncubatee) =>
      savedIncubatee.founders.some((founder) => founder.id === row.founderId)
    );
    if (!incubatee) return;

    const founder = incubatee.founders.find((savedFounder) => savedFounder.id === row.founderId);
    if (!founder) return;

    handleViewFounder(founder, incubatee);
  };

  return {
    handleViewFounderRow,
  };
};
