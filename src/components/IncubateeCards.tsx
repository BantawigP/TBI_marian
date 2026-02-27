import { Lightbulb, Users, Eye, Award } from 'lucide-react';
import { Incubatee } from './IncubateeTable';
import { useState, useRef, useEffect } from 'react';

interface IncubateeCardsProps {
  incubatees: Incubatee[];
  selectedIncubatees: string[];
  setSelectedIncubatees: (ids: string[]) => void;
  onViewIncubatee: (incubatee: Incubatee) => void;
}

export function IncubateeCards({ incubatees, selectedIncubatees, setSelectedIncubatees, onViewIncubatee }: IncubateeCardsProps) {
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [truncatedDescriptions, setTruncatedDescriptions] = useState<Set<string>>(new Set());
  const descriptionRefs = useRef<{ [key: string]: HTMLParagraphElement | null }>({});

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Graduate':
        return 'bg-green-100 text-green-700';
      case 'Incubatee':
        return 'bg-blue-100 text-blue-700';
      case 'Incubatee Extended':
        return 'bg-purple-100 text-purple-700';
      case 'Applicant':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleToggleSelect = (incubateeId: string) => {
    if (selectedIncubatees.includes(incubateeId)) {
      setSelectedIncubatees(selectedIncubatees.filter((id) => id !== incubateeId));
    } else {
      setSelectedIncubatees([...selectedIncubatees, incubateeId]);
    }
  };

  const toggleDescription = (incubateeId: string) => {
    const newSet = new Set(expandedDescriptions);
    if (newSet.has(incubateeId)) {
      newSet.delete(incubateeId);
    } else {
      newSet.add(incubateeId);
    }
    setExpandedDescriptions(newSet);
  };

  useEffect(() => {
    const currentRefs = descriptionRefs.current;
    for (const incubateeId in currentRefs) {
      const ref = currentRefs[incubateeId];
      if (ref) {
        const isTruncated = ref.scrollHeight > ref.clientHeight;
        const currentTruncatedSet = new Set(truncatedDescriptions);
        if (isTruncated) {
          currentTruncatedSet.add(incubateeId);
        } else {
          currentTruncatedSet.delete(incubateeId);
        }
        setTruncatedDescriptions(currentTruncatedSet);
      }
    }
  }, [incubatees]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {incubatees.map((incubatee) => (
        <div
          key={incubatee.id}
          className={`bg-white rounded-xl border-2 overflow-hidden hover:shadow-lg transition-all flex flex-col ${
            selectedIncubatees.includes(incubatee.id)
              ? 'border-[#FF2B5E] shadow-md'
              : 'border-gray-200'
          }`}
        >
          <div className="p-6 flex flex-col flex-1">
            {/* Header with Checkbox */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedIncubatees.includes(incubatee.id)}
                  onChange={() => handleToggleSelect(incubatee.id)}
                  className="mt-1 w-4 h-4 text-[#FF2B5E] bg-white border-gray-300 rounded focus:ring-[#FF2B5E] focus:ring-2"
                />
                <div className="w-12 h-12 bg-[#FF2B5E]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-[#FF2B5E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">
                    {incubatee.startupName}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FF2B5E]/10 text-[#FF2B5E]">
                      <Award className="w-3 h-3 mr-1" />
                      {incubatee.cohortLevel.map((l) => `Cohort ${l}`).join(', ')}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        incubatee.status
                      )}`}
                    >
                      {incubatee.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <p
                ref={(el) => (descriptionRefs.current[incubatee.id] = el)}
                className={`text-sm text-gray-600 line-clamp-3 ${
                  expandedDescriptions.has(incubatee.id) ? 'line-clamp-none' : ''
                }`}
              >
                {incubatee.startupDescription}
              </p>
              {truncatedDescriptions.has(incubatee.id) && (
                <button
                  onClick={() => toggleDescription(incubatee.id)}
                  className="text-[#FF2B5E] text-xs font-medium mt-1"
                >
                  {expandedDescriptions.has(incubatee.id) ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>

            {/* Separator Line */}
            <div className="border-t border-gray-200 mb-4 mt-auto"></div>

            {/* Founders Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {incubatee.founders.length} Founder{incubatee.founders.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Founders Preview */}
              {incubatee.founders.length > 0 && (
                <div className="space-y-2 mb-4">
                  {incubatee.founders.slice(0, 2).map((founder) => (
                    <div
                      key={founder.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {founder.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium truncate">
                          {founder.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {founder.roles.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {incubatee.founders.length > 2 && (
                    <p className="text-xs text-gray-500">
                      +{incubatee.founders.length - 2} more founder{incubatee.founders.length - 2 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              {/* View Button */}
              <button
                onClick={() => onViewIncubatee(incubatee)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF2B5E]/10 text-[#FF2B5E] rounded-lg hover:bg-[#FF2B5E]/20 transition-colors font-medium"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}