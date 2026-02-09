import { Search, RotateCcw, CalendarRange, Filter } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onReset: () => void;
  graduatedFrom: string;
  graduatedTo: string;
  setGraduatedFrom: (value: string) => void;
  setGraduatedTo: (value: string) => void;
  statusFilter: 'all' | 'Verified' | 'Unverified';
  setStatusFilter: (value: 'all' | 'Verified' | 'Unverified') => void;
}

export function SearchBar({
  searchQuery,
  setSearchQuery,
  onReset,
  graduatedFrom,
  graduatedTo,
  setGraduatedFrom,
  setGraduatedTo,
  statusFilter,
  setStatusFilter,
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFilters =
    Number(Boolean(graduatedFrom)) +
    Number(Boolean(graduatedTo)) +
    Number(statusFilter !== 'all');

  return (
    <div className="flex gap-3 flex-wrap lg:flex-nowrap items-center">
      <div className="flex-1 min-w-[220px] relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search contacts (name, college, program, email, occupation, company)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
        />
      </div>

      <div className="relative" ref={filterRef}>
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className="relative flex items-center gap-2 px-5 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF2B5E] text-white text-xs rounded-full flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>

        {showFilters && (
          <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-5 z-10">
            <div className="flex items-center gap-2 text-gray-700 mb-4">
              <CalendarRange className="w-4 h-4" />
              <span className="text-sm font-semibold">Graduated date range</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Verified' | 'Unverified')}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="Verified">Verified</option>
                  <option value="Unverified">Unverified</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">From</label>
                <input
                  type="date"
                  value={graduatedFrom}
                  onChange={(e) => setGraduatedFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">To</label>
                <input
                  type="date"
                  value={graduatedTo}
                  onChange={(e) => setGraduatedTo(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
                />
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