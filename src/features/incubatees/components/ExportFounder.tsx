import { ArrowLeft, X, Download, FileSpreadsheet, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Incubatee, Founder } from './IncubateeTable';

interface ExportFounderProps {
  incubatees: Incubatee[];
  unassignedFounders?: Founder[];
  selectedFounders: string[];
  onClose: () => void;
}

type ExportFormat = 'csv' | 'excel' | 'json';
type ExportScope = 'all' | 'selected' | 'single';
type FounderFieldKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'roles'
  | 'startupNames'
  | 'cohortLevels'
  | 'statuses'
  | 'startupCount';

interface FounderAssociation {
  founderId: string;
  startupName: string;
  cohortLevel: number[];
  status: string;
  roles: string[];
}

interface FounderMergedRow {
  primaryId: string;
  founderIds: string[];
  name: string;
  email: string;
  phone: string;
  associations: FounderAssociation[];
}

const availableFields: { key: FounderFieldKey; label: string }[] = [
  { key: 'name', label: 'Founder Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'roles', label: 'Roles' },
  { key: 'startupNames', label: 'Startup Names' },
  { key: 'cohortLevels', label: 'Cohort Levels' },
  { key: 'statuses', label: 'Statuses' },
  { key: 'startupCount', label: 'Startup Count' },
];

const normalizeValue = (value: string) => value.trim().toLowerCase();

export function ExportFounder({
  incubatees,
  unassignedFounders = [],
  selectedFounders,
  onClose,
}: ExportFounderProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>(selectedFounders.length > 0 ? 'selected' : 'all');
  const [singleFounderId, setSingleFounderId] = useState('');
  const [selectedFields, setSelectedFields] = useState<FounderFieldKey[]>([
    'name',
    'email',
    'phone',
    'startupNames',
    'roles',
    'statuses',
  ]);

  const founderRows = useMemo<FounderMergedRow[]>(() => {
    const associations: Array<{
      founderId: string;
      name: string;
      email: string;
      phone: string;
      startupName: string;
      cohortLevel: number[];
      status: string;
      roles: string[];
    }> = [
      ...incubatees.flatMap((incubatee) =>
        incubatee.founders.map((founder) => ({
          founderId: founder.id,
          name: founder.name,
          email: founder.email,
          phone: founder.phone,
          startupName: incubatee.startupName,
          cohortLevel: incubatee.cohortLevel,
          status: incubatee.status,
          roles: founder.roles,
        }))
      ),
      ...unassignedFounders.map((founder) => ({
        founderId: founder.id,
        name: founder.name,
        email: founder.email,
        phone: founder.phone,
        startupName: '—',
        cohortLevel: [],
        status: '—',
        roles: founder.roles,
      })),
    ];

    const merged: FounderMergedRow[] = [];
    const indexByKey = new Map<string, number>();

    associations.forEach((entry) => {
      const key = `${normalizeValue(entry.name)}||${normalizeValue(entry.email)}`;
      const existingIndex = indexByKey.get(key);

      if (existingIndex != null) {
        const existing = merged[existingIndex];
        existing.founderIds.push(entry.founderId);
        existing.associations.push({
          founderId: entry.founderId,
          startupName: entry.startupName,
          cohortLevel: entry.cohortLevel,
          status: entry.status,
          roles: entry.roles,
        });
        return;
      }

      indexByKey.set(key, merged.length);
      merged.push({
        primaryId: entry.founderId,
        founderIds: [entry.founderId],
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        associations: [
          {
            founderId: entry.founderId,
            startupName: entry.startupName,
            cohortLevel: entry.cohortLevel,
            status: entry.status,
            roles: entry.roles,
          },
        ],
      });
    });

    return merged;
  }, [incubatees, unassignedFounders]);

  useEffect(() => {
    if (!singleFounderId && founderRows.length > 0) {
      setSingleFounderId(founderRows[0].primaryId);
      return;
    }

    if (singleFounderId && !founderRows.some((row) => row.primaryId === singleFounderId)) {
      setSingleFounderId(founderRows[0]?.primaryId ?? '');
    }
  }, [founderRows, singleFounderId]);

  const exportRows = useMemo(() => {
    if (scope === 'selected') {
      return founderRows.filter((row) => row.founderIds.some((id) => selectedFounders.includes(id)));
    }

    if (scope === 'single') {
      return founderRows.filter((row) => row.primaryId === singleFounderId);
    }

    return founderRows;
  }, [founderRows, scope, selectedFounders, singleFounderId]);

  const exportScopeLabel =
    scope === 'selected'
      ? 'Exporting selected founders'
      : scope === 'single'
        ? 'Exporting one founder'
        : 'Exporting all founders';

  const fieldLabel = (field: FounderFieldKey) => {
    return availableFields.find((f) => f.key === field)?.label ?? field;
  };

  const mapFounderToRow = (row: FounderMergedRow): Record<FounderFieldKey, string> => {
    const roles = Array.from(
      new Set(
        row.associations.flatMap((association) => association.roles.map((role) => role.trim()).filter(Boolean))
      )
    );

    const startupNames = Array.from(new Set(row.associations.map((association) => association.startupName)));
    const statuses = Array.from(new Set(row.associations.map((association) => association.status)));
    const cohortLevels = Array.from(
      new Set(
        row.associations.flatMap((association) =>
          association.cohortLevel.map((level) => `Cohort ${level}`)
        )
      )
    );

    return {
      name: row.name,
      email: row.email,
      phone: row.phone,
      roles: roles.join('; '),
      startupNames: startupNames.join('; '),
      cohortLevels: cohortLevels.join('; '),
      statuses: statuses.join('; '),
      startupCount: startupNames.filter((startup) => startup !== '—').length.toString(),
    };
  };

  const buildDelimited = (delimiter: string, rows: Array<Record<FounderFieldKey, string>>) => {
    const header = selectedFields
      .map((field) => `"${fieldLabel(field).replace(/"/g, '""')}"`)
      .join(delimiter);

    const body = rows
      .map((row) =>
        selectedFields
          .map((field) => `"${(row[field] ?? '').replace(/"/g, '""')}"`)
          .join(delimiter)
      )
      .join('\n');

    return [header, body].filter(Boolean).join('\n');
  };

  const toggleField = (field: FounderFieldKey) => {
    setSelectedFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  const handleExport = () => {
    if (selectedFields.length === 0 || exportRows.length === 0) {
      return;
    }

    const rows = exportRows.map(mapFounderToRow);

    const formatConfig: Record<ExportFormat, { mime: string; extension: string; build: () => string }> = {
      csv: {
        mime: 'text/csv;charset=utf-8;',
        extension: 'csv',
        build: () => buildDelimited(',', rows),
      },
      excel: {
        mime: 'application/vnd.ms-excel',
        extension: 'xls',
        build: () => buildDelimited('\t', rows),
      },
      json: {
        mime: 'application/json;charset=utf-8;',
        extension: 'json',
        build: () => {
          const exportJsonRows = rows.map((row) => {
            const selected: Partial<Record<FounderFieldKey, string>> = {};
            selectedFields.forEach((field) => {
              selected[field] = row[field] ?? '';
            });
            return selected;
          });
          return JSON.stringify(exportJsonRows, null, 2);
        },
      },
    };

    const { mime, extension, build } = formatConfig[format];
    const content = build();
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `founders_export.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[#FF2B5E] hover:bg-pink-50 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Export Founders</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF2B5E] rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {exportRows.length} founder{exportRows.length !== 1 ? 's' : ''} ready for export
                  </p>
                  <p className="text-xs text-gray-600">{exportScopeLabel}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">Select Scope</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setScope('all')}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    scope === 'all' ? 'border-[#FF2B5E] bg-pink-50 text-[#FF2B5E]' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setScope('selected')}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    scope === 'selected' ? 'border-[#FF2B5E] bg-pink-50 text-[#FF2B5E]' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Selected
                </button>
                <button
                  onClick={() => setScope('single')}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    scope === 'single' ? 'border-[#FF2B5E] bg-pink-50 text-[#FF2B5E]' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Single Founder
                </button>
              </div>

              {scope === 'single' && (
                <div className="mt-3">
                  <select
                    value={singleFounderId}
                    onChange={(e) => setSingleFounderId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-[#FF2B5E]"
                  >
                    {founderRows.map((row) => (
                      <option key={row.primaryId} value={row.primaryId}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">Select Format</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setFormat('csv')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    format === 'csv' ? 'border-[#FF2B5E] bg-pink-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className={`w-6 h-6 ${format === 'csv' ? 'text-[#FF2B5E]' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${format === 'csv' ? 'text-[#FF2B5E]' : 'text-gray-700'}`}>
                      CSV
                    </span>
                    {format === 'csv' && <Check className="w-4 h-4 text-[#FF2B5E]" />}
                  </div>
                </button>

                <button
                  onClick={() => setFormat('excel')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    format === 'excel' ? 'border-[#FF2B5E] bg-pink-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className={`w-6 h-6 ${format === 'excel' ? 'text-[#FF2B5E]' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${format === 'excel' ? 'text-[#FF2B5E]' : 'text-gray-700'}`}>
                      Excel
                    </span>
                    {format === 'excel' && <Check className="w-4 h-4 text-[#FF2B5E]" />}
                  </div>
                </button>

                <button
                  onClick={() => setFormat('json')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    format === 'json' ? 'border-[#FF2B5E] bg-pink-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className={`w-6 h-6 ${format === 'json' ? 'text-[#FF2B5E]' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${format === 'json' ? 'text-[#FF2B5E]' : 'text-gray-700'}`}>
                      JSON
                    </span>
                    {format === 'json' && <Check className="w-4 h-4 text-[#FF2B5E]" />}
                  </div>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">Select Fields to Export</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3">
                  {availableFields.map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-[#FF2B5E] cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.key)}
                        onChange={() => toggleField(field.key)}
                        className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] focus:ring-[#FF2B5E]"
                      />
                      <span className="text-sm text-gray-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
              </p>
            </div>

            <div>
              <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">Preview</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-200">
                        {selectedFields.map((field) => (
                          <th
                            key={field}
                            className="text-left p-3 text-xs text-gray-600 uppercase tracking-wide"
                          >
                            {fieldLabel(field)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {exportRows.slice(0, 5).map((row) => {
                        const mappedRow = mapFounderToRow(row);
                        return (
                          <tr
                            key={row.primaryId}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            {selectedFields.map((field) => (
                              <td key={field} className="p-3 text-sm text-gray-600">
                                {mappedRow[field] || '-'}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {exportRows.length > 5 && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing first 5 of {exportRows.length} founders
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedFields.length === 0 || exportRows.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}