import { ArrowLeft, X, Download, FileSpreadsheet, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Incubatee } from './IncubateeTable';

interface ExportIncubateeProps {
  incubatees: Incubatee[];
  selectedIncubatees: string[];
  onClose: () => void;
}

type ExportFormat = 'csv' | 'excel' | 'json';
type ExportScope = 'all' | 'selected' | 'single';
type IncubateeFieldKey =
  | 'startupName'
  | 'cohortLevel'
  | 'status'
  | 'startupDescription'
  | 'googleDriveLink'
  | 'notes'
  | 'founderCount'
  | 'founderNames'
  | 'founderEmails'
  | 'founderPhones'
  | 'founderRoles';

const availableFields: { key: IncubateeFieldKey; label: string }[] = [
  { key: 'startupName', label: 'Startup Name' },
  { key: 'cohortLevel', label: 'Cohort Level' },
  { key: 'status', label: 'Status' },
  { key: 'startupDescription', label: 'Startup Description' },
  { key: 'googleDriveLink', label: 'Google Drive Link' },
  { key: 'notes', label: 'Notes' },
  { key: 'founderCount', label: 'Founder Count' },
  { key: 'founderNames', label: 'Founder Names' },
  { key: 'founderEmails', label: 'Founder Emails' },
  { key: 'founderPhones', label: 'Founder Phones' },
  { key: 'founderRoles', label: 'Founder Roles' },
];

export function ExportIncubatee({ incubatees, selectedIncubatees, onClose }: ExportIncubateeProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>(selectedIncubatees.length > 0 ? 'selected' : 'all');
  const [singleStartupId, setSingleStartupId] = useState<string>(incubatees[0]?.id ?? '');
  const [selectedFields, setSelectedFields] = useState<IncubateeFieldKey[]>([
    'startupName',
    'cohortLevel',
    'status',
    'founderNames',
    'founderEmails',
    'founderPhones',
    'founderRoles',
  ]);

  useEffect(() => {
    if (!singleStartupId && incubatees.length > 0) {
      setSingleStartupId(incubatees[0].id);
      return;
    }

    if (singleStartupId && !incubatees.some((incubatee) => incubatee.id === singleStartupId)) {
      setSingleStartupId(incubatees[0]?.id ?? '');
    }
  }, [incubatees, singleStartupId]);

  const exportIncubatees = useMemo(() => {
    if (scope === 'selected') {
      return incubatees.filter((incubatee) => selectedIncubatees.includes(incubatee.id));
    }

    if (scope === 'single') {
      return incubatees.filter((incubatee) => incubatee.id === singleStartupId);
    }

    return incubatees;
  }, [incubatees, scope, selectedIncubatees, singleStartupId]);

  const exportScopeLabel =
    scope === 'selected'
      ? 'Exporting selected startups'
      : scope === 'single'
        ? 'Exporting one startup'
        : 'Exporting all startups';

  const fieldLabel = (field: IncubateeFieldKey) => {
    return availableFields.find((f) => f.key === field)?.label ?? field;
  };

  const mapIncubateeToRow = (incubatee: Incubatee): Record<IncubateeFieldKey, string> => {
    const founderNames = incubatee.founders.map((founder) => founder.name).join('; ');
    const founderEmails = incubatee.founders.map((founder) => founder.email).join('; ');
    const founderPhones = incubatee.founders.map((founder) => founder.phone).join('; ');
    const founderRoles = incubatee.founders
      .map((founder) => `${founder.name}: ${founder.roles.join(', ')}`)
      .join('; ');

    return {
      startupName: incubatee.startupName,
      cohortLevel: incubatee.cohortLevel.map((level) => `Cohort ${level}`).join(', '),
      status: incubatee.status,
      startupDescription: incubatee.startupDescription,
      googleDriveLink: incubatee.googleDriveLink ?? '',
      notes: incubatee.notes ?? '',
      founderCount: incubatee.founders.length.toString(),
      founderNames,
      founderEmails,
      founderPhones,
      founderRoles,
    };
  };

  const buildDelimited = (delimiter: string, rows: Array<Record<IncubateeFieldKey, string>>) => {
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

  const toggleField = (field: IncubateeFieldKey) => {
    setSelectedFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  const handleExport = () => {
    if (selectedFields.length === 0 || exportIncubatees.length === 0) {
      return;
    }

    const rows = exportIncubatees.map(mapIncubateeToRow);

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
          const exportRows = rows.map((row) => {
            const selected: Partial<Record<IncubateeFieldKey, string>> = {};
            selectedFields.forEach((field) => {
              selected[field] = row[field] ?? '';
            });
            return selected;
          });
          return JSON.stringify(exportRows, null, 2);
        },
      },
    };

    const { mime, extension, build } = formatConfig[format];
    const content = build();
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `incubatees_export.${extension}`;
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
          <h2 className="text-xl font-semibold text-gray-900">Export Startups</h2>
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
                    {exportIncubatees.length} startup{exportIncubatees.length !== 1 ? 's' : ''} ready for export
                  </p>
                  <p className="text-xs text-gray-600">
                    {exportScopeLabel}
                  </p>
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
                  Single Startup
                </button>
              </div>

              {scope === 'single' && (
                <div className="mt-3">
                  <select
                    value={singleStartupId}
                    onChange={(e) => setSingleStartupId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-[#FF2B5E]"
                  >
                    {incubatees.map((incubatee) => (
                      <option key={incubatee.id} value={incubatee.id}>
                        {incubatee.startupName}
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
                      {exportIncubatees.slice(0, 5).map((incubatee) => {
                        const row = mapIncubateeToRow(incubatee);
                        return (
                          <tr
                            key={incubatee.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            {selectedFields.map((field) => (
                              <td key={field} className="p-3 text-sm text-gray-600">
                                {row[field] || '-'}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {exportIncubatees.length > 5 && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing first 5 of {exportIncubatees.length} startups
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
            disabled={selectedFields.length === 0 || exportIncubatees.length === 0}
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