export const PROJECT_TYPES = ['READY_PROPERTY', 'LAND'] as const;
export type ProjectTypeCode = (typeof PROJECT_TYPES)[number];

export const READY_PROPERTY_SUBTYPES = [
  'ALREADY_CONSTRUCTED_HOUSE',
  'APARTMENT',
  'COMMERCIAL_SHOP',
  'WAREHOUSE',
] as const;

export const LAND_SUBTYPES = [
  'EMPTY_PLOT',
  'RAW_LAND',
  'AGRICULTURAL_LAND',
  'COMMERCIAL_PLOT',
] as const;

export const PROJECT_SUBTYPES = [...READY_PROPERTY_SUBTYPES, ...LAND_SUBTYPES] as const;
export type ProjectSubtype = (typeof PROJECT_SUBTYPES)[number];

export const PROJECT_STRATEGIES = ['DIRECT_SALE', 'DEVELOPMENT'] as const;
export type ProjectStrategy = (typeof PROJECT_STRATEGIES)[number];

const SUBTYPES_BY_TYPE: Record<ProjectTypeCode, readonly ProjectSubtype[]> = {
  READY_PROPERTY: READY_PROPERTY_SUBTYPES,
  LAND: LAND_SUBTYPES,
};

/** Derived Residential / Commercial / Land for filters and older UI. */
export function deriveAssetClass(subtype: ProjectSubtype): string {
  switch (subtype) {
    case 'ALREADY_CONSTRUCTED_HOUSE':
    case 'APARTMENT':
      return 'Residential';
    case 'COMMERCIAL_SHOP':
    case 'WAREHOUSE':
    case 'COMMERCIAL_PLOT':
      return 'Commercial';
    default:
      return 'Land';
  }
}

/** Normalize legacy API payloads (project_category / project_purpose / LAND_ONLY / BUY_*). */
export function normalizeTaxonomyInput(input: {
  project_type?: string | null;
  project_category?: string | null;
  project_subtype?: string | null;
  project_strategy?: string | null;
  project_purpose?: string | null;
}): {
  project_type?: string;
  project_subtype?: string;
  project_strategy?: string;
} {
  let project_type = input.project_type ?? undefined;
  if (!project_type && input.project_category) {
    project_type =
      input.project_category === 'LAND_ONLY' || input.project_category === 'LAND'
        ? 'LAND'
        : input.project_category === 'READY_PROPERTY'
          ? 'READY_PROPERTY'
          : input.project_category;
  }

  let project_strategy = input.project_strategy ?? undefined;
  if (!project_strategy && input.project_purpose) {
    if (input.project_purpose === 'BUY_SELL') project_strategy = 'DIRECT_SALE';
    else if (input.project_purpose === 'BUY_DEVELOP') project_strategy = 'DEVELOPMENT';
    else project_strategy = input.project_purpose;
  }

  return {
    project_type,
    project_subtype: input.project_subtype ?? undefined,
    project_strategy,
  };
}

export function assertProjectTaxonomy(input: {
  project_type?: string | null;
  project_subtype?: string | null;
  project_strategy?: string | null;
  requireAll?: boolean;
}): { type: ProjectTypeCode; subtype: ProjectSubtype; strategy: ProjectStrategy } | null {
  const requireAll = input.requireAll !== false;
  const { project_type, project_subtype, project_strategy } = input;

  if (!project_type && !project_subtype && !project_strategy) {
    if (requireAll) {
      throw Object.assign(
        new Error('project_type, project_subtype, and project_strategy are required'),
        { status: 400 },
      );
    }
    return null;
  }

  if (!PROJECT_TYPES.includes(project_type as ProjectTypeCode)) {
    throw Object.assign(new Error('Invalid project_type'), { status: 400 });
  }
  const type = project_type as ProjectTypeCode;

  if (!PROJECT_SUBTYPES.includes(project_subtype as ProjectSubtype)) {
    throw Object.assign(new Error('Invalid project_subtype'), { status: 400 });
  }
  const subtype = project_subtype as ProjectSubtype;

  if (!SUBTYPES_BY_TYPE[type].includes(subtype)) {
    throw Object.assign(new Error('project_subtype does not belong to project_type'), { status: 400 });
  }

  if (!PROJECT_STRATEGIES.includes(project_strategy as ProjectStrategy)) {
    throw Object.assign(new Error('Invalid project_strategy'), { status: 400 });
  }
  const strategy = project_strategy as ProjectStrategy;

  if (type === 'READY_PROPERTY' && strategy === 'DEVELOPMENT') {
    throw Object.assign(
      new Error('READY_PROPERTY projects only allow DIRECT_SALE strategy'),
      { status: 400 },
    );
  }

  return { type, subtype, strategy };
}
