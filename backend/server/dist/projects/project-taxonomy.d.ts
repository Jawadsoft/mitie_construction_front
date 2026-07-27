export declare const PROJECT_TYPES: readonly ["READY_PROPERTY", "LAND"];
export type ProjectTypeCode = (typeof PROJECT_TYPES)[number];
export declare const READY_PROPERTY_SUBTYPES: readonly ["ALREADY_CONSTRUCTED_HOUSE", "APARTMENT", "COMMERCIAL_SHOP", "WAREHOUSE"];
export declare const LAND_SUBTYPES: readonly ["EMPTY_PLOT", "RAW_LAND", "AGRICULTURAL_LAND", "COMMERCIAL_PLOT"];
export declare const PROJECT_SUBTYPES: readonly ["ALREADY_CONSTRUCTED_HOUSE", "APARTMENT", "COMMERCIAL_SHOP", "WAREHOUSE", "EMPTY_PLOT", "RAW_LAND", "AGRICULTURAL_LAND", "COMMERCIAL_PLOT"];
export type ProjectSubtype = (typeof PROJECT_SUBTYPES)[number];
export declare const PROJECT_STRATEGIES: readonly ["DIRECT_SALE", "DEVELOPMENT"];
export type ProjectStrategy = (typeof PROJECT_STRATEGIES)[number];
export declare function deriveAssetClass(subtype: ProjectSubtype): string;
export declare function normalizeTaxonomyInput(input: {
    project_type?: string | null;
    project_category?: string | null;
    project_subtype?: string | null;
    project_strategy?: string | null;
    project_purpose?: string | null;
}): {
    project_type?: string;
    project_subtype?: string;
    project_strategy?: string;
};
export declare function assertProjectTaxonomy(input: {
    project_type?: string | null;
    project_subtype?: string | null;
    project_strategy?: string | null;
    requireAll?: boolean;
}): {
    type: ProjectTypeCode;
    subtype: ProjectSubtype;
    strategy: ProjectStrategy;
} | null;
