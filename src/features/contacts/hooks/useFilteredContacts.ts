import { useMemo } from 'react';
import type { Contact, ContactStatus } from '../../../types';

type UseFilteredContactsParams = {
  contacts: Contact[];
  searchQuery: string;
  graduatedFrom: string;
  graduatedTo: string;
  statusFilter: 'all' | ContactStatus;
};

export const useFilteredContacts = ({
  contacts,
  searchQuery,
  graduatedFrom,
  graduatedTo,
  statusFilter,
}: UseFilteredContactsParams) =>
  useMemo(() => {
    return contacts.filter((contact) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery = query
        ? [
            contact.name,
            contact.college,
            contact.program,
            contact.email,
            contact.occupation,
            contact.company,
          ]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(query))
        : true;

      const hasFrom = Boolean(graduatedFrom);
      const hasTo = Boolean(graduatedTo);
      const graduatedDate = contact.dateGraduated ? new Date(contact.dateGraduated) : null;

      const matchesDate = (() => {
        if (!hasFrom && !hasTo) return true;
        if (!graduatedDate) return false;

        const fromOk = hasFrom ? graduatedDate >= new Date(graduatedFrom) : true;
        const toOk = hasTo ? graduatedDate <= new Date(graduatedTo) : true;
        return fromOk && toOk;
      })();

      const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;

      return matchesQuery && matchesDate && matchesStatus;
    });
  }, [contacts, searchQuery, graduatedFrom, graduatedTo, statusFilter]);
