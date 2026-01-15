import type { Contact } from '../types';

interface ContactsTableProps {
  contacts: Contact[];
  selectedContacts: string[];
  setSelectedContacts: (contacts: string[]) => void;
  onViewContact: (contact: Contact) => void;
}

export function ContactsTable({
  contacts,
  selectedContacts,
  setSelectedContacts,
  onViewContact,
}: ContactsTableProps) {
  const toggleContact = (id: string) => {
    setSelectedContacts(
      selectedContacts.includes(id)
        ? selectedContacts.filter((c) => c !== id)
        : [...selectedContacts, id]
    );
  };

  const toggleAll = () => {
    setSelectedContacts(
      selectedContacts.length === contacts.length
        ? []
        : contacts.map((c) => c.id)
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-4 w-12">
                <input
                  type="checkbox"
                  checked={selectedContacts.length === contacts.length}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] focus:ring-[#FF2B5E]"
                />
              </th>
              <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">ID</th>
              <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">Name</th>
              <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">College</th>
              <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">Program</th>
              <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">Email</th>
              <th className="text-left p-4 text-sm text-gray-600 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact, index) => (
              <tr
                key={contact.id}
                onClick={() => onViewContact(contact)}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  index === contacts.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={() => toggleContact(contact.id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] focus:ring-[#FF2B5E]"
                  />
                </td>
                <td className="p-4 text-gray-600">{contact.id}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-sm">
                      {contact.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{contact.name}</span>
                  </div>
                </td>
                <td className="p-4 text-gray-600">{contact.college}</td>
                <td className="p-4 text-gray-600">{contact.program}</td>
                <td className="p-4 text-gray-600">{contact.email}</td>
                <td className="p-4">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
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
  );
}