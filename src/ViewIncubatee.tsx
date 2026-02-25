import { X, Lightbulb, Users, FileText, Award, Mail, Phone } from 'lucide-react';
import { Incubatee } from './components/IncubateeTable';

interface ViewIncubateeProps {
  incubatee: Incubatee;
  onClose: () => void;
  onEdit: (incubatee: Incubatee) => void;
}

export function ViewIncubatee({ incubatee, onClose, onEdit }: ViewIncubateeProps) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#FF2B5E]/10 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-[#FF2B5E]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {incubatee.startupName}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  incubatee.status
                )}`}
              >
                {incubatee.status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Cohort Level */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF2B5E]/10 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-[#FF2B5E]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cohort Level</p>
                  <p className="font-semibold text-gray-900">
                    Cohort {incubatee.cohortLevel}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-[#FF2B5E]" />
                <h3 className="font-semibold text-gray-900">
                  Startup Description
                </h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-gray-700 leading-relaxed">
                  {incubatee.startupDescription}
                </p>
              </div>
            </div>

            {/* Founders */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-[#FF2B5E]" />
                <h3 className="font-semibold text-gray-900">
                  Founders ({incubatee.founders.length})
                </h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="space-y-3">
                  {incubatee.founders.map((founder, index) => (
                    <div
                      key={founder.id}
                      className="p-4 bg-white rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white font-medium flex-shrink-0">
                          {founder.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{founder.name}</p>
                          <p className="text-sm text-gray-600">{founder.role}</p>
                        </div>
                      </div>
                      <div className="space-y-2 pl-15">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-[#FF2B5E]" />
                          <span>{founder.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-[#FF2B5E]" />
                          <span>{founder.phone}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => onEdit(incubatee)}
              className="flex-1 px-6 py-3 bg-[#FF2B5E] text-white rounded-xl hover:bg-[#E6275A] transition-colors"
            >
              Edit Incubatee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}