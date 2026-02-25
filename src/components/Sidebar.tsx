import { Home, Users, Calendar, Archive, FileText, LogOut, UserCog, Lightbulb } from 'lucide-react';
import type { TeamRole } from '../types';
import logo from '../assets/marian tbi.jpg';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  currentUserRole?: TeamRole | null;
  onOpenSettings?: () => void;
  userName?: string;
  userEmail?: string;
}

export function Sidebar({
  activeTab,
  onTabChange,
  onLogout,
  currentUserRole,
  onOpenSettings,
  userName,
  userEmail,
}: SidebarProps) {
  const displayName = userName?.trim() || 'User';
  const displayEmail = userEmail?.trim() || 'user@example.com';
  const navItems = [
    { icon: Home, label: 'Home', value: 'home' },
    { icon: Users, label: 'Contacts', value: 'contacts' },
    { icon: Lightbulb, label: 'Incubatee', value: 'incubatees' },
    { icon: Calendar, label: 'Events', value: 'events' },
    { icon: UserCog, label: 'Team', value: 'team' },
    { icon: FileText, label: 'Form Preview', value: 'preview' },
    { icon: Archive, label: 'Archives', value: 'archives' },
  ];

  const visibleNavItems =
    currentUserRole === 'Member'
      ? navItems.filter((item) => item.value !== 'team')
      : navItems;

  return (
    <aside className="w-64 bg-[#FF2B5E] text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <img src={logo} alt="MARIAN TBI Connect" className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-sm">MARIAN TBI Connect</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {visibleNavItems.map((item) => (
            <li key={item.value}>
              <button
                onClick={() => onTabChange(item.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.value
                    ? 'bg-white/20 font-medium'
                    : 'hover:bg-white/10'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile Preview */}
      <div className="p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-white/70 truncate">{displayEmail}</p>
            </div>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Open personal settings"
              >
                <UserCog className="w-4 h-4" />
              </button>
            )}
          </div>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-3 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white/90 hover:bg-white/20 transition-colors"
            >
              Personal Settings
            </button>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}