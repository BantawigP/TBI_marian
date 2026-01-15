import { Search, RotateCcw, Filter } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onReset: () => void;
  selectedStatus: string[];
  setSelectedStatus: (status: string[]) => void;
  selectedExpertise: string[];
  setSelectedExpertise: (expertise: string[]) => void;
}

export function SearchBar({ 
  searchQuery, 
  setSearchQuery, 
  onReset,
  selectedStatus,
  setSelectedStatus,
  selectedExpertise,
  setSelectedExpertise
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const statusOptions = ['Pending', 'Contacted'];
  const expertiseOptions = ['Marketing', 'Sales', 'Design', 'Software', 'AI'];

  const toggleStatus = (status: string) => {
    setSelectedStatus(
      selectedStatus.includes(status)
        ? selectedStatus.filter((s) => s !== status)
        : [...selectedStatus, status]
    );
  };

  const toggleExpertise = (expertise: string) => {
    setSelectedExpertise(
      selectedExpertise.includes(expertise)
        ? selectedExpertise.filter((e) => e !== expertise)
        : [...selectedExpertise, expertise]
    );
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFilterCount = selectedStatus.length + selectedExpertise.length;

  return (
    <div className="flex gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search contacts"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
        />
      </div>
      
      {/* Filter Button */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="relative flex items-center gap-2 px-5 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF2B5E] text-white text-xs rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Filter Dropdown */}
        {showFilters && (
          <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-5 z-10">
            {/* Status Filter */}
            <div className="mb-5">
              <h3 className="text-sm text-[#FF2B5E] mb-3 uppercase tracking-wide">Status</h3>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      selectedStatus.includes(status)
                        ? 'bg-[#FF2B5E] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Expertise Filter */}
            <div>
              <h3 className="text-sm text-[#FF2B5E] mb-3 uppercase tracking-wide">Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {expertiseOptions.map((expertise) => (
                  <button
                    key={expertise}
                    onClick={() => toggleExpertise(expertise)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      selectedExpertise.includes(expertise)
                        ? 'bg-[#FF2B5E] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {expertise}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onReset}
        className="flex items-center gap-2 px-5 py-3 bg-white text-[#FF2B5E] border border-[#FF2B5E] rounded-lg hover:bg-pink-50 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Reset
      </button>
    </div>
  );
}