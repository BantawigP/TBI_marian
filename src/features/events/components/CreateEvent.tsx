import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Contact, Event } from '../../../types';
import type { Incubatee } from '../../incubatees/components/IncubateeTable';
import { createEvent } from '../services/eventService';

interface CreateEventProps {
	contacts: Contact[];
	incubatees: Incubatee[];
	onClose: () => void;
	onSave: (event: Event) => void;
}

const PREDEFINED_EVENT_TITLES = [
	'Official Commencement & Enrollment',
	'Legal Execution (NDA & Incubation)',
	'Initial Needs & Baseline Assessment',
	'Info Session on Pitching',
	'Pitching Simulation',
	'Acceptance & Orientation',
	'BMC Workshop',
	'Mentorship & Technical Assistance',
	'Capacity-Building Workshops',
	'Business Planning Workshop',
	'Financial Management Workshop',
	'Digital Marketing',
	'Effective Communication & Negotiation on Startups Workshop',
	'Info Session on DTI/Sec Registration/Business Registration',
	'IP Orientation/ Reorientation',
	'IP Patent Search Seminar & Workshop',
	'IP Drafting Workshop and Workshop - 2 days',
	'IP Evaluation Sessions (max of 3)',
	'Monthly Progress Reporting',
	'Market Testing, Validation & Stakeholder Engagement',
	'Market Validation & Stakeholder Engagement',
	'Refinement of MVP & Business Model',
	'Final Milestone Review & Evaluation',
	'Final Pitch to Evaluators & Mentors',
	'Official Graduation & Certification',
];

export function CreateEvent({ contacts, incubatees, onClose, onSave }: CreateEventProps) {
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		date: '',
		time: '',
		location: '',
	});
	const [isMassEmailOnly, setIsMassEmailOnly] = useState(false);

	const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showTitleDropdown, setShowTitleDropdown] = useState(false);
	const [expandedStartups, setExpandedStartups] = useState<Record<string, boolean>>({});
	const titleDropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (titleDropdownRef.current && !titleDropdownRef.current.contains(event.target as Node)) {
				setShowTitleDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const availableContacts = contacts;

	const founderAttendees: Contact[] = incubatees.flatMap((incubatee) =>
		incubatee.founders.map((founder) => {
			const matchedContact = availableContacts.find(
				(contact) => contact.email.toLowerCase() === founder.email.toLowerCase()
			);
			const nameParts = founder.name.trim().split(/\s+/).filter(Boolean);
			const firstName = matchedContact?.firstName ?? nameParts[0] ?? founder.name;
			const lastName = matchedContact?.lastName ?? nameParts.slice(1).join(' ');

			return {
				id: `founder-${incubatee.id}-${founder.id}`,
				alumniId: matchedContact?.alumniId,
				firstName,
				lastName,
				name: founder.name,
				email: founder.email,
				contactNumber: founder.phone,
				college: '',
				program: '',
				company: incubatee.startupName,
				status: matchedContact?.status ?? 'Verified',
			};
		})
	);

	const allAttendees = [...availableContacts, ...founderAttendees];
	const attendeeMap = new Map(allAttendees.map((attendee) => [attendee.id, attendee]));

	const filteredContacts = availableContacts.filter((contact) =>
		contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		contact.email.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const filteredIncubatees = incubatees
		.map((incubatee) => {
			const startupMatch = incubatee.startupName
				.toLowerCase()
				.includes(searchQuery.toLowerCase());

			const matchingFounders = startupMatch
				? incubatee.founders
				: incubatee.founders.filter(
						(founder) =>
							founder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
							founder.email.toLowerCase().includes(searchQuery.toLowerCase())
					);

			return {
				...incubatee,
				founders: matchingFounders,
			};
		})
		.filter((incubatee) => incubatee.founders.length > 0);

	const renderVerificationBadge = (status: Contact['status']) => {
		const isVerified = status === 'Verified';
		return (
			<span
				className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
					isVerified
						? 'bg-green-100 text-green-700 border-green-200'
						: 'bg-yellow-100 text-yellow-700 border-yellow-200'
				}`}
			>
				{status}
			</span>
		);
	};

	const formatCreateEventError = (err: unknown) => {
		const message = err instanceof Error ? err.message : 'Failed to create event';

		if (
			message.includes('event_title_key') ||
			message.includes('Duplicate event title is currently blocked by an old database constraint')
		) {
			return 'This workspace still has the old unique title rule in the database. Apply the latest migration, then try creating the event again.';
		}

		return message;
	};

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const toggleAttendee = (contactId: string) => {
		setSelectedAttendees((prev) =>
			prev.includes(contactId)
				? prev.filter((id) => id !== contactId)
				: [...prev, contactId]
		);
	};

	const getFounderIdsForStartup = (incubateeId: string, founders: Incubatee['founders']) =>
		founders.map((founder) => `founder-${incubateeId}-${founder.id}`);

	const toggleStartupFounders = (incubateeId: string, founders: Incubatee['founders']) => {
		const founderIds = getFounderIdsForStartup(incubateeId, founders);

		setSelectedAttendees((prev) => {
			const allSelected = founderIds.every((founderId) => prev.includes(founderId));

			if (allSelected) {
				return prev.filter((id) => !founderIds.includes(id));
			}

			const existingIds = new Set(prev);
			const missingFounderIds = founderIds.filter((founderId) => !existingIds.has(founderId));
			return [...prev, ...missingFounderIds];
		});

		setExpandedStartups((prev) => ({ ...prev, [incubateeId]: true }));
	};

	const toggleStartupExpanded = (incubateeId: string) => {
		setExpandedStartups((prev) => ({
			...prev,
			[incubateeId]: !prev[incubateeId],
		}));
	};

	const toggleExclusiveSelection = (targetIds: string[]) => {
		const uniqueTargetIds = Array.from(new Set(targetIds));
		const isSameSelection =
			selectedAttendees.length === uniqueTargetIds.length &&
			uniqueTargetIds.every((id) => selectedAttendees.includes(id));

		setSelectedAttendees(isSameSelection ? [] : uniqueTargetIds);
	};

	const selectAllAttendees = () => {
		toggleExclusiveSelection(allAttendees.map((attendee) => attendee.id));
	};

	const selectVerifiedAttendees = () => {
		toggleExclusiveSelection(
			availableContacts
				.filter((contact) => contact.status === 'Verified')
				.map((contact) => contact.id)
		);
	};

	const selectUnverifiedAttendees = () => {
		toggleExclusiveSelection(
			availableContacts
				.filter((contact) => contact.status === 'Unverified')
				.map((contact) => contact.id)
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const attendees = selectedAttendees
				.map((id) => attendeeMap.get(id))
				.filter((attendee): attendee is Contact => Boolean(attendee))
				.map((c) => ({ ...c, rsvpStatus: 'pending' as const }));

			const uniqueAttendees = Array.from(
				new Map(
					attendees.map((attendee) => {
						const key = attendee.alumniId
							? `alumni-${attendee.alumniId}`
							: `email-${attendee.email.toLowerCase()}`;
						return [key, attendee] as const;
					})
				).values()
			);

			const eventPayload = isMassEmailOnly
				? {
						...formData,
						date: '',
						time: '',
						location: '',
					}
				: formData;

			const createdEvent = await createEvent(eventPayload, uniqueAttendees);
			onSave(createdEvent);
			onClose();
		} catch (err) {
			const errorMessage = formatCreateEventError(err);
			setError(errorMessage);
			console.error('Event creation error:', err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<div />
					<h2 className="text-xl font-semibold text-gray-900">Create Event</h2>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2" aria-label="Close">
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto">
					{error && (
						<div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded">
							<p className="text-red-700 text-sm">{error}</p>
						</div>
					)}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
						<div className="space-y-6">
							<div>
								<h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
									Event Details
								</h3>

								<div className="space-y-4">
									<div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
										<label className="flex items-start gap-3 cursor-pointer">
											<input
												type="checkbox"
												checked={isMassEmailOnly}
												onChange={(e) => {
													const checked = e.target.checked;
													setIsMassEmailOnly(checked);
													if (checked) {
														setFormData((prev) => ({
															...prev,
															date: '',
															time: '',
															location: '',
														}));
													}
												}}
												className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#FF2B5E] focus:ring-[#FF2B5E]"
											/>
											<div>
												<p className="text-sm font-medium text-gray-900">Mass Email Only</p>
												<p className="text-xs text-gray-500">
													Send a broadcast email without requiring date, time, and location.
												</p>
											</div>
										</label>
									</div>

									<div ref={titleDropdownRef} className="relative">
										<label className="block text-sm text-[#FF2B5E] mb-2">
											Event Title
										</label>
										<p className="text-xs text-gray-500 mb-2">
											Duplicate titles are allowed for different schedules.
										</p>
										<div className="relative">
											<input
												type="text"
												value={formData.title}
												onChange={(e) => handleChange('title', e.target.value)}
												className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
												required
												placeholder="e.g., Alumni Networking Night"
											/>
											<button
												type="button"
												onClick={() => setShowTitleDropdown(!showTitleDropdown)}
												className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#FF2B5E] hover:bg-gray-100 rounded transition-colors"
												title="Select from predefined titles"
											>
												<ChevronDown className="w-5 h-5" />
											</button>
										</div>

										{showTitleDropdown && (
											<div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
												{PREDEFINED_EVENT_TITLES.map((title, index) => (
													<button
														key={index}
														type="button"
														onClick={() => {
															handleChange('title', title);
															setShowTitleDropdown(false);
														}}
														className="w-full text-left px-4 py-3 hover:bg-[#FF2B5E]/10 transition-colors border-b border-gray-100 last:border-b-0 text-sm text-gray-700 hover:text-[#FF2B5E]"
													>
														{title}
													</button>
												))}
											</div>
										)}
									</div>

									<div>
										<label className="block text-sm text-[#FF2B5E] mb-2">
											Description
										</label>
										<textarea
											value={formData.description}
											onChange={(e) => handleChange('description', e.target.value)}
											rows={4}
											className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent resize-none"
											required
											placeholder="Brief description of the event..."
										/>
									</div>

									<div>
										<label className="block text-sm text-[#FF2B5E] mb-2">
											Date
										</label>
										<input
											type="date"
											value={formData.date}
											onChange={(e) => handleChange('date', e.target.value)}
											className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
											required={!isMassEmailOnly}
										/>
									</div>

									<div>
										<label className="block text-sm text-[#FF2B5E] mb-2">
											Time
										</label>
										<input
											type="time"
											value={formData.time}
											onChange={(e) => handleChange('time', e.target.value)}
											className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
											required={!isMassEmailOnly}
										/>
									</div>

									<div>
										<label className="block text-sm text-[#FF2B5E] mb-2">
											Location
										</label>
										<input
											type="text"
											value={formData.location}
											onChange={(e) => handleChange('location', e.target.value)}
											className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent"
											required={!isMassEmailOnly}
											placeholder="e.g., Grand Ballroom, Marian Hall"
										/>
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-6">
							<div>
								<h3 className="text-[#FF2B5E] text-sm mb-4 uppercase tracking-wide">
									Add Attendees ({selectedAttendees.length} selected)
								</h3>

								<input
									type="text"
									placeholder="Search contacts, incubatees, founders..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E] focus:border-transparent mb-4"
								/>

								<div className="flex flex-wrap gap-2 mb-4">
									<button
										type="button"
										onClick={selectAllAttendees}
										className="px-3 py-1.5 text-xs bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
									>
										Select All
									</button>
									<button
										type="button"
										onClick={selectVerifiedAttendees}
										className="px-3 py-1.5 text-xs bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
									>
										Select Verified Only
									</button>
									<button
										type="button"
										onClick={selectUnverifiedAttendees}
										className="px-3 py-1.5 text-xs bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
									>
										Select Unverified Only
									</button>
								</div>

								<div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto overflow-x-hidden space-y-4">
									<div>
										<h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
											Contacts
										</h4>
										{filteredContacts.length > 0 ? (
											<div className="space-y-2">
												{filteredContacts.map((contact) => (
													<label
														key={contact.id}
														className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-[#FF2B5E] cursor-pointer transition-colors min-w-0"
													>
														<input
															type="checkbox"
															checked={selectedAttendees.includes(contact.id)}
															onChange={() => toggleAttendee(contact.id)}
															className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] focus:ring-[#FF2B5E]"
														/>
														<div className="flex items-center gap-3 flex-1 min-w-0">
															<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-sm">
																{contact.firstName.charAt(0)}
																{contact.lastName.charAt(0)}
															</div>
															<div className="flex-1 min-w-0">
																<p className="text-sm font-medium text-gray-900 truncate">
																	{contact.name}
																</p>
																<p className="text-xs text-gray-600 break-all leading-4">
																	{contact.email}
																</p>
															</div>
															<div className="shrink-0 self-start">
																{renderVerificationBadge(contact.status)}
															</div>
														</div>
													</label>
												))}
											</div>
										) : (
											<div className="text-center py-4 text-gray-500 text-sm bg-white rounded-lg border border-gray-200">
												{availableContacts.length === 0 ? 'No contacts available' : 'No contacts found'}
											</div>
										)}
									</div>

									<div>
										<h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
											Incubatees
										</h4>
										{filteredIncubatees.length > 0 ? (
											<div className="space-y-3">
												{filteredIncubatees.map((incubatee) => (
													<div key={incubatee.id} className="bg-white rounded-lg border border-gray-200 p-3">
														{(() => {
															const founderIds = getFounderIdsForStartup(incubatee.id, incubatee.founders);
															const allFoundersSelected =
																founderIds.length > 0 &&
																founderIds.every((founderId) => selectedAttendees.includes(founderId));
															const isExpanded = searchQuery.trim().length > 0 || Boolean(expandedStartups[incubatee.id]);

															return (
																<>
																	<div className="flex items-center gap-2 mb-2">
																		<button
																			type="button"
																			onClick={() => toggleStartupFounders(incubatee.id, incubatee.founders)}
																			className="flex items-center gap-3 flex-1 min-w-0 p-2 rounded-lg border border-gray-200 hover:border-[#FF2B5E] text-left transition-colors"
																			title="Select all founders in this startup"
																		>
																			<input
																				type="checkbox"
																				checked={allFoundersSelected}
																				readOnly
																				className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] focus:ring-[#FF2B5E] pointer-events-none"
																			/>
																			<div className="min-w-0">
																				<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
																					{incubatee.startupName}
																				</p>
																				<p className="text-[11px] text-gray-500">
																					{incubatee.founders.length} founder{incubatee.founders.length === 1 ? '' : 's'}
																				</p>
																			</div>
																		</button>

																		<button
																			type="button"
																			onClick={() => toggleStartupExpanded(incubatee.id)}
																			className="p-2 rounded-lg border border-gray-200 hover:border-[#FF2B5E] hover:text-[#FF2B5E] transition-colors"
																			aria-label={isExpanded ? 'Collapse founders' : 'Expand founders'}
																		>
																			{isExpanded ? (
																				<ChevronDown className="w-4 h-4" />
																			) : (
																				<ChevronRight className="w-4 h-4" />
																			)}
																		</button>
																	</div>

																	{isExpanded && (
																		<div className="space-y-2">
																			{incubatee.founders.map((founder) => {
																				const founderId = `founder-${incubatee.id}-${founder.id}`;
																				const nameParts = founder.name.trim().split(/\s+/).filter(Boolean);
																				const firstInitial = nameParts[0]?.charAt(0) ?? '?';
																				const lastInitial = nameParts[1]?.charAt(0) ?? '';

																				return (
																					<label
																						key={founderId}
																						className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#FF2B5E] cursor-pointer transition-colors min-w-0"
																					>
																						<input
																							type="checkbox"
																							checked={selectedAttendees.includes(founderId)}
																							onChange={() => toggleAttendee(founderId)}
																							className="w-4 h-4 rounded border-gray-300 text-[#FF2B5E] focus:ring-[#FF2B5E]"
																						/>
																						<div className="flex items-center gap-3 flex-1 min-w-0">
																							<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center text-white text-sm">
																								{firstInitial}
																								{lastInitial}
																							</div>
																							<div className="flex-1 min-w-0">
																								<p className="text-sm font-medium text-gray-900 truncate">
																									{founder.name}
																								</p>
																								<p className="text-xs text-gray-600 break-all leading-4">
																									{founder.email}
																								</p>
																							</div>
																							<div className="shrink-0 self-start">
																								<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-blue-100 text-blue-700 border-blue-200 whitespace-nowrap">
																									Founder
																								</span>
																							</div>
																						</div>
																					</label>
																				);
																			})}
																		</div>
																	)}
																</>
															);
														})()}
													</div>
												))}
											</div>
										) : (
											<div className="text-center py-4 text-gray-500 text-sm bg-white rounded-lg border border-gray-200">
												{incubatees.length === 0
													? 'No incubatees available'
													: 'No founders found'}
											</div>
										)}
									</div>
								</div>

								<p className="text-xs text-gray-500 mt-2">
									Contacts and incubatee founders can be added to events
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
					<button
						type="button"
						onClick={onClose}
						disabled={loading}
						className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={loading}
						className="px-6 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{loading ? (
							<>
								<span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
								Creating...
							</>
						) : (
							'Create Event'
						)}
					</button>
				</div>
			</form>
		</div>
	);
}
