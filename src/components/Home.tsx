import { Users, UserCheck, UserX, TrendingUp, Calendar, Mail, Phone } from 'lucide-react';
import type { Contact } from '../types';

interface HomeProps {
  contacts: Contact[];
  onViewContact: (contact: Contact) => void;
}

export function Home({ contacts, onViewContact }: HomeProps) {
  const totalContacts = contacts.length;
  const contactedCount = contacts.filter((c) => c.status === 'Contacted').length;
  const pendingCount = contacts.filter((c) => c.status === 'Pending').length;

  // Get recent contacts (last 5)
  const recentContacts = contacts.slice(-5).reverse();

  // Group by college
  const collegeStats = contacts.reduce((acc, contact) => {
    acc[contact.college] = (acc[contact.college] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topColleges = Object.entries(collegeStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl mb-2">Welcome back!</h1>
        <p className="text-gray-600">Here's what's happening with your contacts today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Contacts */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#FF2B5E]/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-[#FF2B5E]" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">{totalContacts}</h3>
          <p className="text-sm text-gray-600">Total Contacts</p>
        </div>

        {/* Contacted */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">{contactedCount}</h3>
          <p className="text-sm text-gray-600">Contacted</p>
          <div className="mt-2 text-xs text-gray-500">
            {totalContacts > 0 ? Math.round((contactedCount / totalContacts) * 100) : 0}% of total
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <UserX className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">{pendingCount}</h3>
          <p className="text-sm text-gray-600">Pending</p>
          <div className="mt-2 text-xs text-gray-500">
            {totalContacts > 0 ? Math.round((pendingCount / totalContacts) * 100) : 0}% of total
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">{totalContacts}</h3>
          <p className="text-sm text-gray-600">This Month</p>
          <div className="mt-2 text-xs text-green-600">+100% from last month</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Contacts */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Contacts</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => onViewContact(contact)}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white font-medium">
                    {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {contact.firstName} {contact.lastName}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-600 truncate">
                        {contact.program} - {contact.college}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        contact.status === 'Contacted'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {contact.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Colleges */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Colleges</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topColleges.map(([college, count]) => (
                <div key={college}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{college}</span>
                    <span className="text-sm text-gray-600">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#FF2B5E] h-2 rounded-full transition-all"
                      style={{
                        width: `${(count / totalContacts) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Ready to connect?</h2>
            <p className="text-white/90 mb-6">
              Reach out to your pending contacts and grow your network.
            </p>
            <div className="flex gap-3">
              <button className="bg-white text-[#FF2B5E] px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send Email Campaign
              </button>
              <button className="bg-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-colors flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Call Pending Contacts
              </button>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center">
              <Users className="w-24 h-24 text-white/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
