import React from 'react';
import { Mail, Phone, Briefcase } from 'lucide-react';
import { Incubatee, Founder } from './IncubateeTable';

export interface FounderRow {
  founderId: string;
  name: string;
  email: string;
  phone: string;
  roles: string[];
  startupName: string;
  cohortLevel: number[];
  status: Incubatee['status'] | '—';
}

/** One display row — one person with all their startup associations merged */
interface MergedRow {
  founderIds: string[];
  name: string;
  email: string;
  phone: string;
  associations: {
    founderId: string;
    startupName: string;
    cohortLevel: number[];
    status: Incubatee['status'] | '—';
    roles: string[];
  }[];
}

interface FoundersTableProps {
  incubatees: Incubatee[];
  unassignedFounders?: Founder[];
  onViewFounder?: (founder: FounderRow) => void;
  selectedFounders?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function FoundersTable({
  incubatees,
  unassignedFounders = [],
  onViewFounder,
  selectedFounders = [],
  onSelectionChange,
}: FoundersTableProps) {
  const getStatusColor = (status: Incubatee['status']) => {
    switch (status) {
      case 'Graduate':       return 'bg-green-100 text-green-700';
      case 'Incubatee':      return 'bg-blue-100 text-blue-700';
      case 'Undergraduate':  return 'bg-yellow-100 text-yellow-700';
      case 'Parked':         return 'bg-gray-100 text-gray-700';
      default:               return 'bg-gray-100 text-gray-700';
    }
  };

  // Flatten all founder appearances
  const founderRows: FounderRow[] = [
    ...incubatees.flatMap((inc) =>
      inc.founders.map((f) => ({
        founderId: f.id,
        name: f.name,
        email: f.email,
        phone: f.phone,
        roles: f.roles,
        startupName: inc.startupName,
        cohortLevel: inc.cohortLevel,
        status: inc.status,
      }))
    ),
    ...unassignedFounders.map((f) => ({
      founderId: f.id,
      name: f.name,
      email: f.email,
      phone: f.phone,
      roles: f.roles,
      startupName: '—',
      cohortLevel: [],
      status: '—' as const,
    })),
  ];

  // Group by name + email so the same person appears as one row
  const mergedRows: MergedRow[] = [];
  const keyIndex = new Map<string, number>();

  for (const row of founderRows) {
    const key = `${row.name.trim().toLowerCase()}||${row.email.trim().toLowerCase()}`;
    if (keyIndex.has(key)) {
      const existing = mergedRows[keyIndex.get(key)!];
      existing.founderIds.push(row.founderId);
      existing.associations.push({
        founderId: row.founderId,
        startupName: row.startupName,
        cohortLevel: row.cohortLevel,
        status: row.status,
        roles: row.roles,
      });
    } else {
      keyIndex.set(key, mergedRows.length);
      mergedRows.push({
        founderIds: [row.founderId],
        name: row.name,
        email: row.email,
        phone: row.phone,
        associations: [{
          founderId: row.founderId,
          startupName: row.startupName,
          cohortLevel: row.cohortLevel,
          status: row.status,
          roles: row.roles,
        }],
      });
    }
  }

  const allIds = mergedRows.flatMap((r) => r.founderIds);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedFounders.includes(id));
  const someSelected = allIds.some((id) => selectedFounders.includes(id)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : allIds);
  };

  const toggleRow = (ids: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    const allRowSelected = ids.every((id) => selectedFounders.includes(id));
    if (allRowSelected) {
      onSelectionChange(selectedFounders.filter((id) => !ids.includes(id)));
    } else {
      const toAdd = ids.filter((id) => !selectedFounders.includes(id));
      onSelectionChange([...selectedFounders, ...toAdd]);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] cursor-pointer"
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Founder Name</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Roles</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Startup</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mergedRows.map((row) => {
              const isRowSelected = row.founderIds.every((id) => selectedFounders.includes(id));
              const isSomeSelected = row.founderIds.some((id) => selectedFounders.includes(id)) && !isRowSelected;
              const isMulti = row.associations.length > 1;

              const primaryRow: FounderRow = {
                founderId: row.founderIds[0],
                name: row.name,
                email: row.email,
                phone: row.phone,
                roles: row.associations[0].roles,
                startupName: row.associations[0].startupName,
                cohortLevel: row.associations[0].cohortLevel,
                status: row.associations[0].status,
              };

              return (
                <tr
                  key={row.founderIds.join('-')}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${isRowSelected ? 'bg-red-50' : ''}`}
                  onClick={() => onViewFounder?.(primaryRow)}
                >
                  <td className="px-4 py-4 align-top" onClick={(e) => toggleRow(row.founderIds, e)}>
                    <input
                      type="checkbox"
                      checked={isRowSelected}
                      ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] cursor-pointer mt-1"
                    />
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{row.name}</span>
                        {isMulti && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                              {row.associations.length} startups
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{row.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{row.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-1.5">
                      {row.associations.map((assoc) => (
                        <div key={assoc.founderId} className="flex flex-wrap gap-1">
                          {assoc.roles.length > 0 ? (
                            assoc.roles.map((r) => (
                              <span
                                key={r}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FF2B5E]/10 text-[#FF2B5E] whitespace-nowrap"
                              >
                                <Briefcase className="w-3 h-3" />
                                {r}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-1.5">
                      {row.associations.map((assoc) => (
                        <div key={assoc.founderId}>
                          <div className="font-medium text-gray-900 text-sm">{assoc.startupName}</div>
                          {assoc.cohortLevel.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {assoc.cohortLevel.map((l) => `Cohort ${l}`).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-1.5">
                      {row.associations.map((assoc) => (
                        <div key={assoc.founderId}>
                          {assoc.status !== '—' ? (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assoc.status as Incubatee['status'])}`}>
                              {assoc.status}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {mergedRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No founders found. Add founders to your incubatees.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
