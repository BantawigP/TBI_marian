import { ArrowLeft, X, Download, FileSpreadsheet, Check } from 'lucide-react';
import { useState } from 'react';
import type { Contact } from '../types';

interface ExportContactProps {
  contacts: Contact[];
  selectedContacts: string[];
  onClose: () => void;
}

type ExportFormat = 'csv' | 'excel' | 'json';

export function ExportContact({ contacts, selectedContacts, onClose }: ExportContactProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'firstName',
    'lastName',
    'email',
    'college',
    'program',
    'contactNumber',
    'status',
  ]);

  const availableFields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'college', label: 'College' },
    { key: 'program', label: 'Program' },
    { key: 'contactNumber', label: 'Contact Number' },
    { key: 'dateGraduated', label: 'Date Graduated' },
    { key: 'occupation', label: 'Occupation' },
    { key: 'company', label: 'Company' },
    { key: 'status', label: 'Status' },
  ];

  const exportContacts = selectedContacts.length > 0
    ? contacts.filter((c) => selectedContacts.includes(c.id))
    : contacts;

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  const handleExport = () => {
    // Simulate export functionality
    const dataToExport = exportContacts.map((contact) => {
      const exportData: any = {};
      selectedFields.forEach((field) => {
        exportData[field] = (contact as any)[field] || '';
      });
      return exportData;
    });

    console.log('Exporting data:', dataToExport);
    console.log('Format:', format);
    
    // In a real implementation, you would generate the file here
    alert(`Exporting ${dataToExport.length} contacts as ${format.toUpperCase()}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[#FF2B5E] hover:bg-pink-50 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Export Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Export Summary */}
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF2B5E] rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {exportContacts.length} contact{exportContacts.length !== 1 ? 's' : ''} ready for export
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedContacts.length > 0
                      ? 'Exporting selected contacts'
                      : 'Exporting all contacts'}
                  </p>
                </div>
              </div>
            </div>

            {/* File Format Selection */}
            <div>
              <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                Select Format
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setFormat('csv')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    format === 'csv'
                      ? 'border-[#FF2B5E] bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className={`w-6 h-6 ${format === 'csv' ? 'text-[#FF2B5E]' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${format === 'csv' ? 'text-[#FF2B5E]' : 'text-gray-700'}`}>
                      CSV
                    </span>
                    {format === 'csv' && (
                      <Check className="w-4 h-4 text-[#FF2B5E]" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setFormat('excel')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    format === 'excel'
                      ? 'border-[#FF2B5E] bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className={`w-6 h-6 ${format === 'excel' ? 'text-[#FF2B5E]' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${format === 'excel' ? 'text-[#FF2B5E]' : 'text-gray-700'}`}>
                      Excel
                    </span>
                    {format === 'excel' && (
                      <Check className="w-4 h-4 text-[#FF2B5E]" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setFormat('json')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    format === 'json'
                      ? 'border-[#FF2B5E] bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className={`w-6 h-6 ${format === 'json' ? 'text-[#FF2B5E]' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${format === 'json' ? 'text-[#FF2B5E]' : 'text-gray-700'}`}>
                      JSON
                    </span>
                    {format === 'json' && (
                      <Check className="w-4 h-4 text-[#FF2B5E]" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Field Selection */}
            <div>
              <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                Select Fields to Export
              </h3>
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

            {/* Preview */}
            <div>
              <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                Preview
              </h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-200">
                        {selectedFields.map((field) => {
                          const fieldLabel = availableFields.find((f) => f.key === field)?.label;
                          return (
                            <th
                              key={field}
                              className="text-left p-3 text-xs text-gray-600 uppercase tracking-wide"
                            >
                              {fieldLabel}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {exportContacts.slice(0, 5).map((contact, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          {selectedFields.map((field) => (
                            <td key={field} className="p-3 text-sm text-gray-600">
                              {(contact as any)[field] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {exportContacts.length > 5 && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing first 5 of {exportContacts.length} contacts
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedFields.length === 0}
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
