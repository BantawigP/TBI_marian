import { Eye } from 'lucide-react';

export interface Founder {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface Incubatee {
  id: string;
  startupName: string;
  cohortLevel: number[];
  startupDescription: string;
  googleDriveLink?: string;
  notes?: string;
  founders: Founder[];
  status: 'Graduate' | 'Incubatee' | 'Undergraduate' | 'Parked';
}

interface IncubateeTableProps {
  incubatees: Incubatee[];
  selectedIncubatees: string[];
  setSelectedIncubatees: (ids: string[]) => void;
  onViewIncubatee: (incubatee: Incubatee) => void;
}

export function IncubateeTable({
  incubatees,
  selectedIncubatees,
  setSelectedIncubatees,
  onViewIncubatee,
}: IncubateeTableProps) {
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIncubatees(incubatees.map((i) => i.id));
    } else {
      setSelectedIncubatees([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIncubatees.includes(id)) {
      setSelectedIncubatees(selectedIncubatees.filter((i) => i !== id));
    } else {
      setSelectedIncubatees([...selectedIncubatees, id]);
    }
  };

  const getStatusColor = (status: Incubatee['status']) => {
    switch (status) {
      case 'Graduate':
        return 'bg-green-100 text-green-700';
      case 'Incubatee':
        return 'bg-blue-100 text-blue-700';
      case 'Undergraduate':
        return 'bg-yellow-100 text-yellow-700';
      case 'Parked':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-4 text-left">
                <input
                  type="checkbox"
                  checked={
                    incubatees.length > 0 &&
                    selectedIncubatees.length === incubatees.length
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-[#FF2B5E] bg-white border-gray-300 rounded focus:ring-[#FF2B5E] focus:ring-2"
                />
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Startup Name
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Cohort Level
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Founders
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {incubatees.map((incubatee) => (
              <tr
                key={incubatee.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIncubatees.includes(incubatee.id)}
                    onChange={() => handleSelectOne(incubatee.id)}
                    className="w-4 h-4 text-[#FF2B5E] bg-white border-gray-300 rounded focus:ring-[#FF2B5E] focus:ring-2"
                  />
                </td>
                <td className="px-4 py-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      {incubatee.startupName}
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {incubatee.startupDescription}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#FF2B5E]/10 text-[#FF2B5E]">
                    {incubatee.cohortLevel.map((l) => `Cohort ${l}`).join(', ')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900">
                    {incubatee.founders.slice(0, 2).map(f => f.name).join(', ')}
                    {incubatee.founders.length > 2 && (
                      <span className="text-gray-500">
                        {' '}
                        +{incubatee.founders.length - 2} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      incubatee.status
                    )}`}
                  >
                    {incubatee.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => onViewIncubatee(incubatee)}
                    className="text-[#FF2B5E] hover:text-[#E6275A] transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
