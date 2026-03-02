import { Fragment, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  fetchStartupAssessment,
  saveStartupAssessment,
  type StartupAssessmentInput,
} from '../lib/assessmentService';
import {
  ASSESSMENT_AREAS,
  DEFAULT_COMPETENCY_RATINGS,
  normalizeCompetencyRatings,
  totalCompetencyPoints,
  type AssessmentCompetencyKey,
} from '../lib/assessmentCompetencies';

interface AssessmentModalProps {
  open: boolean;
  incubateeId: string;
  startupName: string;
  onClose: () => void;
}

const defaultFormState: StartupAssessmentInput = {
  competencyRatings: { ...DEFAULT_COMPETENCY_RATINGS },
  otherCriticalSkills: ['', '', '', '', ''],
};

export function AssessmentModal({ open, incubateeId, startupName, onClose }: AssessmentModalProps) {
  const [form, setForm] = useState<StartupAssessmentInput>(defaultFormState);
  const [savedForm, setSavedForm] = useState<StartupAssessmentInput>(defaultFormState);
  const [hasExistingAssessment, setHasExistingAssessment] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const loadAssessment = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existing = await fetchStartupAssessment(incubateeId);
        if (!isMounted) return;

        if (!existing) {
          const emptyState = {
            competencyRatings: { ...DEFAULT_COMPETENCY_RATINGS },
            otherCriticalSkills: ['', '', '', '', ''],
          };
          setForm(emptyState);
          setSavedForm(emptyState);
          setHasExistingAssessment(false);
          setIsEditing(true);
          return;
        }

        const paddedOtherSkills = [...existing.otherCriticalSkills];
        while (paddedOtherSkills.length < 5) {
          paddedOtherSkills.push('');
        }

        const loadedForm = {
          competencyRatings: normalizeCompetencyRatings(existing.competencyRatings),
          otherCriticalSkills: paddedOtherSkills.slice(0, 5),
        };

        setForm(loadedForm);
        setSavedForm(loadedForm);
        setHasExistingAssessment(true);
        setIsEditing(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load assessment.';
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAssessment();

    return () => {
      isMounted = false;
    };
  }, [open, incubateeId]);

  const totalPoints = useMemo(() => totalCompetencyPoints(form.competencyRatings), [form.competencyRatings]);

  if (!open) return null;

  const updateCompetency = (key: AssessmentCompetencyKey, value: number) => {
    setForm((prev) => ({
      ...prev,
      competencyRatings: {
        ...prev.competencyRatings,
        [key]: value,
      },
    }));
  };

  const updateOtherSkill = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.otherCriticalSkills];
      next[index] = value;
      return {
        ...prev,
        otherCriticalSkills: next,
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const saved = await saveStartupAssessment(incubateeId, form);
      const paddedOtherSkills = [...saved.otherCriticalSkills];
      while (paddedOtherSkills.length < 5) {
        paddedOtherSkills.push('');
      }

      const nextSavedForm = {
        competencyRatings: normalizeCompetencyRatings(saved.competencyRatings),
        otherCriticalSkills: paddedOtherSkills.slice(0, 5),
      };

      setForm(nextSavedForm);
      setSavedForm(nextSavedForm);
      setHasExistingAssessment(true);
      setIsEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save assessment.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setForm(savedForm);
    setError(null);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Startup Assessment Form</h2>
            <p className="text-sm text-gray-600 mt-1">{startupName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close assessment form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 space-y-1">
            <p className="font-medium text-gray-900">
              Instructions: Describe your level of experience in the following areas using the provided scale.
            </p>
            <p>5 - Excellent - Expert; can mentor others.</p>
            <p>4 - Satisfactory - Proficient; can perform task independently.</p>
            <p>3 - Good - Basic competence; need occasional guidance.</p>
            <p>2 - Moderate - Some exposure; needs significant guidance.</p>
            <p>1 - Poor - No experience or knowledge.</p>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-gray-200 p-8 text-center text-gray-600">Loading assessment...</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Future Training Areas / Competencies</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-44">Rating (1-5)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ASSESSMENT_AREAS.map((area) => (
                    <Fragment key={area.id}>
                      <tr key={`${area.id}-header`} className="bg-gray-50/70">
                        <td colSpan={2} className="px-4 py-3 font-semibold text-gray-900">
                          {area.title}
                        </td>
                      </tr>
                      {area.competencies.map((competency) => (
                        <tr key={competency.key} className="align-top">
                          <td className="px-4 py-4 text-sm text-gray-700">{competency.label}</td>
                          <td className="px-4 py-4">
                            <select
                              value={form.competencyRatings[competency.key]}
                              onChange={(event) => updateCompetency(competency.key, Number(event.target.value))}
                              disabled={!isEditing}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#FF2B5E] focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 disabled:bg-gray-100 disabled:text-gray-600"
                            >
                              <option value={5}>5 - Excellent</option>
                              <option value={4}>4 - Satisfactory</option>
                              <option value={3}>3 - Good</option>
                              <option value={2}>2 - Moderate</option>
                              <option value={1}>1 - Poor</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">Total Points</td>
                    <td className="px-4 py-3 font-semibold text-[#FF2B5E]">{totalPoints}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">
              List down other skills/training not mentioned that you believed are critical for your venture:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {form.otherCriticalSkills.map((value, index) => (
                <input
                  key={index}
                  type="text"
                  value={value}
                  onChange={(event) => updateOtherSkill(index, event.target.value)}
                  placeholder={`${index + 1}.`}
                  disabled={!isEditing}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-[#FF2B5E] focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 disabled:bg-gray-100 disabled:text-gray-600"
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 p-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            disabled={isSaving}
          >
            Close
          </button>
          {hasExistingAssessment && !isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="rounded-lg bg-[#FF2B5E] px-4 py-2 text-white hover:bg-[#E6275A]"
              disabled={isSaving || isLoading}
            >
              Edit Assessment
            </button>
          )}
          {isEditing && hasExistingAssessment && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              disabled={isSaving || isLoading}
            >
              Cancel Edit
            </button>
          )}
          {isEditing && (
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-[#FF2B5E] px-4 py-2 text-white hover:bg-[#E6275A] disabled:opacity-60"
              disabled={isSaving || isLoading}
            >
              {isSaving ? 'Saving...' : hasExistingAssessment ? 'Save Changes' : 'Save Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
