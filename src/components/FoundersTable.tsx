import { Mail, Phone, Briefcase } from 'lucide-react';
import { Incubatee } from './IncubateeTable';

interface FounderRow {
  founderId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  startupName: string;
  cohortLevel: number;
  status: Incubatee['status'];
}

interface FoundersTableProps {
  incubatees: Incubatee[];
  onViewFounder?: (founder: FounderRow) => void;
}

export function FoundersTable({ incubatees, onViewFounder }: FoundersTableProps) {
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

  // Flatten all founders from all incubatees into rows
  const founderRows: FounderRow[] = incubatees.flatMap((incubatee) =>
    incubatee.founders.map((founder) => ({
      founderId: founder.id,
      name: founder.name,
      email: founder.email,
      phone: founder.phone,
      role: founder.role,
      startupName: incubatee.startupName,
      cohortLevel: incubatee.cohortLevel,
      status: incubatee.status,
    }))
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Founder Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Startup
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {founderRows.map((row) => (
              <tr
                key={row.founderId}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onViewFounder?.(row)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {row.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{row.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{row.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{row.phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{row.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{row.startupName}</div>
                    <div className="text-xs text-gray-500">Cohort {row.cohortLevel}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      row.status
                    )}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {founderRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
