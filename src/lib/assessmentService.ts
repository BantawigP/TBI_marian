import { supabase } from './supabaseClient';
import {
  ASSESSMENT_AREAS,
  ASSESSMENT_COMPETENCY_KEYS,
  normalizeCompetencyRatings,
  totalCompetencyPoints,
  type AssessmentCompetencyKey,
} from './assessmentCompetencies';

export interface StartupAssessment {
  id: string;
  incubateeId: string;
  competencyRatings: Record<AssessmentCompetencyKey, number>;
  otherCriticalSkills: string[];
  totalPoints: number;
  updatedAt?: string;
}

export interface StartupAssessmentInput {
  competencyRatings: Record<AssessmentCompetencyKey, number>;
  otherCriticalSkills: string[];
}

interface StartupAssessmentRow {
  id: number;
  incubatee_id: number;
  competency_ratings?: Record<string, number | string | null | undefined> | null;
  strategy_business_model?: number;
  product_technology_development?: number;
  funding_financials?: number;
  legal_compliance?: number;
  soft_skill_management?: number;
  marketing_sales?: number;
  other_critical_skills: string[] | null;
  total_points?: number;
  updated_at?: string;
}

interface CompetencyDefinitionRow {
  id: number;
  competency_key: string;
}

interface StartupAssessmentScoreRow {
  rating: number;
  assessment_competencies?: {
    competency_key?: string;
  } | null;
}

function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 3;
  if (value < 1) return 1;
  if (value > 5) return 5;
  return Math.round(value);
}

function getLegacyAreaRating(row: StartupAssessmentRow, areaId: (typeof ASSESSMENT_AREAS)[number]['id']): number {
  switch (areaId) {
    case 'strategyBusinessModel':
      return clampRating(Number(row.strategy_business_model ?? 3));
    case 'productTechnologyDevelopment':
      return clampRating(Number(row.product_technology_development ?? 3));
    case 'fundingFinancials':
      return clampRating(Number(row.funding_financials ?? 3));
    case 'legalCompliance':
      return clampRating(Number(row.legal_compliance ?? 3));
    case 'softSkillManagement':
      return clampRating(Number(row.soft_skill_management ?? 3));
    case 'marketingSales':
      return clampRating(Number(row.marketing_sales ?? 3));
    default:
      return 3;
  }
}

function mapLegacyRatingsToCompetencies(row: StartupAssessmentRow): Record<AssessmentCompetencyKey, number> {
  const mapped: Record<string, number> = {};

  for (const area of ASSESSMENT_AREAS) {
    const areaRating = getLegacyAreaRating(row, area.id);
    for (const competency of area.competencies) {
      mapped[competency.key] = areaRating;
    }
  }

  return normalizeCompetencyRatings(mapped);
}

function isMissingColumnError(error: unknown, column: string): boolean {
  const message = JSON.stringify(error).toLowerCase();
  return (
    message.includes('column') &&
    message.includes(column.toLowerCase()) &&
    (message.includes('does not exist') || message.includes('schema cache'))
  );
}

function isMissingRelationOrColumnError(error: unknown): boolean {
  const message = JSON.stringify(error).toLowerCase();
  return (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find')
  );
}

function averageAreaRating(
  areaId: (typeof ASSESSMENT_AREAS)[number]['id'],
  ratings: Record<AssessmentCompetencyKey, number>
): number {
  const area = ASSESSMENT_AREAS.find((item) => item.id === areaId);
  if (!area) return 3;

  const sum = area.competencies.reduce((total, competency) => {
    return total + clampRating(Number(ratings[competency.key] ?? 3));
  }, 0);

  return clampRating(sum / area.competencies.length);
}

function mapAssessmentRow(row: StartupAssessmentRow): StartupAssessment {
  const competencyRatings = row.competency_ratings
    ? normalizeCompetencyRatings(row.competency_ratings)
    : mapLegacyRatingsToCompetencies(row);

  return {
    id: row.id.toString(),
    incubateeId: row.incubatee_id.toString(),
    competencyRatings,
    otherCriticalSkills: (row.other_critical_skills || []).slice(0, 5),
    totalPoints: Number(row.total_points ?? totalCompetencyPoints(competencyRatings)),
    updatedAt: row.updated_at,
  };
}

function parseIncubateeId(incubateeId: string): number {
  const parsed = parseInt(incubateeId, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid incubatee id: ${incubateeId}`);
  }
  return parsed;
}

async function fetchCompetencyDefinitions(): Promise<CompetencyDefinitionRow[] | null> {
  const { data, error } = await supabase
    .from('assessment_competencies')
    .select('id, competency_key');

  if (error) {
    if (isMissingRelationOrColumnError(error)) {
      return null;
    }
    throw error;
  }

  return (data as CompetencyDefinitionRow[]) || [];
}

async function fetchCompetencyRatingsFromScores(
  startupAssessmentId: number
): Promise<Record<AssessmentCompetencyKey, number> | null> {
  const { data, error } = await supabase
    .from('startup_assessment_scores')
    .select('rating, assessment_competencies!inner(competency_key)')
    .eq('startup_assessment_id', startupAssessmentId);

  if (error) {
    if (isMissingRelationOrColumnError(error)) {
      return null;
    }
    throw error;
  }

  const rows = (data || []) as StartupAssessmentScoreRow[];
  if (rows.length === 0) {
    return null;
  }

  const map: Record<string, number> = {};
  for (const row of rows) {
    const key = row.assessment_competencies?.competency_key;
    if (!key) continue;
    map[key] = clampRating(Number(row.rating));
  }

  return normalizeCompetencyRatings(map);
}

export async function fetchStartupAssessment(incubateeId: string): Promise<StartupAssessment | null> {
  const numericId = parseIncubateeId(incubateeId);

  const { data, error } = await supabase
    .from('startup_assessments')
    .select('*')
    .eq('incubatee_id', numericId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const base = mapAssessmentRow(data as StartupAssessmentRow);
  const scoresRatings = await fetchCompetencyRatingsFromScores(Number((data as StartupAssessmentRow).id));

  if (!scoresRatings) {
    return base;
  }

  return {
    ...base,
    competencyRatings: scoresRatings,
    totalPoints: totalCompetencyPoints(scoresRatings),
  };
}

export async function saveStartupAssessment(
  incubateeId: string,
  assessment: StartupAssessmentInput
): Promise<StartupAssessment> {
  const numericId = parseIncubateeId(incubateeId);
  const normalizedRatings = normalizeCompetencyRatings(assessment.competencyRatings);

  const basePayload = {
    incubatee_id: numericId,
    strategy_business_model: averageAreaRating('strategyBusinessModel', normalizedRatings),
    product_technology_development: averageAreaRating('productTechnologyDevelopment', normalizedRatings),
    funding_financials: averageAreaRating('fundingFinancials', normalizedRatings),
    legal_compliance: averageAreaRating('legalCompliance', normalizedRatings),
    soft_skill_management: averageAreaRating('softSkillManagement', normalizedRatings),
    marketing_sales: averageAreaRating('marketingSales', normalizedRatings),
    other_critical_skills: assessment.otherCriticalSkills.filter((item) => item.trim().length > 0),
  };

  const payloadWithJson = {
    ...basePayload,
    competency_ratings: normalizedRatings,
  };

  const { data, error } = await supabase
    .from('startup_assessments')
    .upsert(payloadWithJson, { onConflict: 'incubatee_id' })
    .select('*')
    .single();

  const parentRow = (() => {
    if (!error) return data as StartupAssessmentRow;
    return null;
  })();

  let persistedParent = parentRow;

  if (error) {
    if (!isMissingColumnError(error, 'competency_ratings')) {
      throw error;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from('startup_assessments')
      .upsert(basePayload, { onConflict: 'incubatee_id' })
      .select('*')
      .single();

    if (legacyError) {
      throw legacyError;
    }

    persistedParent = legacyData as StartupAssessmentRow;
  }

  if (!persistedParent) {
    throw new Error('Unable to persist startup assessment.');
  }

  const competencyDefs = await fetchCompetencyDefinitions();
  if (competencyDefs && competencyDefs.length > 0) {
    const defsByKey = new Map(competencyDefs.map((item) => [item.competency_key, item.id]));

    const scoreRows = ASSESSMENT_COMPETENCY_KEYS
      .map((key) => {
        const competencyId = defsByKey.get(key);
        if (!competencyId) return null;
        return {
          startup_assessment_id: persistedParent.id,
          competency_id: competencyId,
          rating: clampRating(normalizedRatings[key]),
        };
      })
      .filter((row): row is { startup_assessment_id: number; competency_id: number; rating: number } => row !== null);

    if (scoreRows.length > 0) {
      const { error: scoreError } = await supabase
        .from('startup_assessment_scores')
        .upsert(scoreRows, { onConflict: 'startup_assessment_id,competency_id' });

      if (scoreError && !isMissingRelationOrColumnError(scoreError)) {
        throw scoreError;
      }
    }
  }

  const refreshed = await fetchStartupAssessment(incubateeId);
  if (refreshed) {
    return refreshed;
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from('startup_assessments')
    .upsert(basePayload, { onConflict: 'incubatee_id' })
    .select('*')
    .single();

  if (legacyError) {
    throw legacyError;
  }

  return mapAssessmentRow(legacyData as StartupAssessmentRow);
}
