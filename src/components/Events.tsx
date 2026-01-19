import { Calendar, Users, MapPin, Clock, Plus, Eye, Trash2, Edit } from 'lucide-react';
import type { Event } from '../types';

interface EventsProps {
  events: Event[];
  onCreateEvent: () => void;
  onViewEvent: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
  onEditEvent?: (event: Event) => void;
}

export function Events({ events, onCreateEvent, onViewEvent, onDeleteEvent, onEditEvent }: EventsProps) {

  const upcomingEvents = events.filter(
    (event) => new Date(event.date) >= new Date()
  );
  const pastEvents = events.filter((event) => new Date(event.date) < new Date());

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Events</h1>
          <p className="text-gray-600">Manage your events and attendees</p>
        </div>
        <button
          onClick={onCreateEvent}
          className="flex items-center gap-2 bg-[#FF2B5E] text-white px-5 py-3 rounded-lg hover:bg-[#E6275A] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FF2B5E]/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#FF2B5E]" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {events.length}
            </h3>
          </div>
          <p className="text-sm text-gray-600">Total Events</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {upcomingEvents.length}
            </h3>
          </div>
          <p className="text-sm text-gray-600">Upcoming Events</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {events.reduce((sum, event) => sum + event.attendees.length, 0)}
            </h3>
          </div>
          <p className="text-sm text-gray-600">Total Attendees</p>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upcoming Events
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {event.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {onEditEvent && (
                        <button
                          type="button"
                          onClick={() => {
                            console.log('✏️ Edit button clicked for event:', event.id, event.title);
                            onEditEvent(event);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit event"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteEvent && (
                        <button
                          type="button"
                          onClick={() => {
                            console.log('🔴 Delete button clicked in Events.tsx for event:', event.id, event.title);
                            onDeleteEvent(event.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-[#FF2B5E]" />
                      {formatDate(event.date)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-[#FF2B5E]" />
                      {formatTime(event.time)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-[#FF2B5E]" />
                      {event.location}
                    </div>
                  </div>

                  {/* Attendees Preview */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">
                          {event.attendees.length} Attendee
                          {event.attendees.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => onViewEvent(event)}
                        className="text-sm text-[#FF2B5E] hover:text-[#E6275A] flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>

                    {event.attendees.length > 0 && (
                      <div className="flex -space-x-2">
                        {event.attendees.slice(0, 5).map((attendee) => (
                          <div
                            key={attendee.id}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-xs border-2 border-white"
                            title={attendee.name}
                          >
                            {attendee.firstName.charAt(0)}
                            {attendee.lastName.charAt(0)}
                          </div>
                        ))}
                        {event.attendees.length > 5 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs border-2 border-white">
                            +{event.attendees.length - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Past Events
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {pastEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => onViewEvent(event)}
                    >
                      <h4 className="font-medium text-gray-900 mb-1">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{formatDate(event.date)}</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.attendees.length} attendees
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onEditEvent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('✏️ Edit button clicked for past event:', event.id, event.title);
                            onEditEvent(event);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit event"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        Completed
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}