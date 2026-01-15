import { ArrowLeft, X, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { Contact } from '../types';

interface ImportContactProps {
  onClose: () => void;
  onImport: (contacts: Contact[]) => void;
}

export function ImportContact({ onClose, onImport }: ImportContactProps) {
  const [previewData, setPreviewData] = useState<Contact[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Sample preview data for demonstration
  const sampleData: Contact[] = [
    {
      id: '201',
      firstName: 'Carlos',
      lastName: 'Mendoza',
      name: 'Carlos Mendoza',
      college: 'Engineering',
      program: 'Civil Engineering',
      email: 'carlos@example.com',
      status: 'Pending',
      contactNumber: '+63 945 678 9012',
      dateGraduated: '2023-04-15',
      occupation: 'Civil Engineer',
      company: 'BuildCo',
    },
    {
      id: '202',
      firstName: 'Lisa',
      lastName: 'Garcia',
      name: 'Lisa Garcia',
      college: 'Business',
      program: 'Finance',
      email: 'lisa@example.com',
      status: 'Contacted',
      contactNumber: '+63 956 789 0123',
      dateGraduated: '2022-05-20',
      occupation: 'Financial Analyst',
      company: 'FinanceHub',
    },
    {
      id: '203',
      firstName: 'Ramon',
      lastName: 'Diaz',
      name: 'Ramon Diaz',
      college: 'IT',
      program: 'Information Systems',
      email: 'ramon@example.com',
      status: 'Pending',
      contactNumber: '+63 967 890 1234',
      dateGraduated: '2023-06-10',
      occupation: 'Systems Analyst',
      company: 'TechSys',
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate file processing - in real app, parse CSV/Excel
      setTimeout(() => {
        setPreviewData(sampleData);
      }, 500);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Simulate file processing
    setTimeout(() => {
      setPreviewData(sampleData);
    }, 500);
  };

  const handleImport = () => {
    if (previewData.length > 0) {
      onImport(previewData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[#FF2B5E] hover:bg-pink-50 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Import Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Upload Section */}
            {previewData.length === 0 ? (
              <div>
                <h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
                  Upload File
                </h3>
                
                {/* Drag & Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                    isDragging
                      ? 'border-[#FF2B5E] bg-pink-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-[#FF2B5E]/10 rounded-full flex items-center justify-center">
                      <FileSpreadsheet className="w-8 h-8 text-[#FF2B5E]" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-1">
                        Drag and drop your file here
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        or click to browse
                      </p>
                      <label className="inline-flex items-center gap-2 bg-[#FF2B5E] text-white px-6 py-3 rounded-lg hover:bg-[#E6275A] transition-colors cursor-pointer">
                        <Upload className="w-4 h-4" />
                        Choose File
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-400">
                      Supported formats: CSV, Excel (.xlsx, .xls)
                    </p>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-2">File Format Requirements:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>First row should contain headers</li>
                        <li>Required columns: First Name, Last Name, Email, College, Program</li>
                        <li>Optional columns: Contact Number, Date Graduated, Occupation, Company, Status</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Preview Section */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#FF2B5E] text-sm uppercase tracking-wide">
                    Preview ({previewData.length} contacts)
                  </h3>
                  <button
                    onClick={() => setPreviewData([])}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Upload Different File
                  </button>
                </div>

                {/* Preview Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-3 text-xs text-gray-600 uppercase tracking-wide">
                            Name
                          </th>
                          <th className="text-left p-3 text-xs text-gray-600 uppercase tracking-wide">
                            Email
                          </th>
                          <th className="text-left p-3 text-xs text-gray-600 uppercase tracking-wide">
                            College
                          </th>
                          <th className="text-left p-3 text-xs text-gray-600 uppercase tracking-wide">
                            Program
                          </th>
                          <th className="text-left p-3 text-xs text-gray-600 uppercase tracking-wide">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((contact, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="p-3 text-sm text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {contact.email}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {contact.college}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {contact.program}
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  contact.status === 'Contacted'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {contact.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
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
            onClick={handleImport}
            disabled={previewData.length === 0}
            className="px-6 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {previewData.length > 0 && `(${previewData.length})`} Contacts
          </button>
        </div>
      </div>
    </div>
  );
}
