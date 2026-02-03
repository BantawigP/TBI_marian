import { Home, Users, Calendar, Archive, FileText, LogOut, UserCog } from 'lucide-react';
import logo from '../assets/marian tbi.jpg';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
  const navItems = [
    { icon: Home, label: 'Home', value: 'home' },
    { icon: Users, label: 'Contacts', value: 'contacts' },
    { icon: UserCog, label: 'Team', value: 'team' },
    { icon: Calendar, label: 'Events', value: 'events' },
    { icon: Archive, label: 'Archives', value: 'archives' },
    { icon: FileText, label: 'Form Preview', value: 'preview' },
  ];

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
          {navItems.map((item) => (
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
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-white truncate">Admin User</p>
            <p className="text-xs text-white/70 truncate">admin@mariantbi.edu</p>
          </div>
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