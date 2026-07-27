"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_STRATEGIES = exports.PROJECT_SUBTYPES = exports.LAND_SUBTYPES = exports.READY_PROPERTY_SUBTYPES = exports.PROJECT_TYPES = void 0;
exports.deriveAssetClass = deriveAssetClass;
exports.normalizeTaxonomyInput = normalizeTaxonomyInput;
exports.assertProjectTaxonomy = assertProjectTaxonomy;
exports.PROJECT_TYPES = ['READY_PROPERTY', 'LAND'];
exports.READY_PROPERTY_SUBTYPES = [
    'ALREADY_CONSTRUCTED_HOUSE',
    'APARTMENT',
    'COMMERCIAL_SHOP',
    'WAREHOUSE',
];
exports.LAND_SUBTYPES = [
    'EMPTY_PLOT',
    'RAW_LAND',
    'AGRICULTURAL_LAND',
    'COMMERCIAL_PLOT',
];
exports.PROJECT_SUBTYPES = [...exports.READY_PROPERTY_SUBTYPES, ...exports.LAND_SUBTYPES];
exports.PROJECT_STRATEGIES = ['DIRECT_SALE', 'DEVELOPMENT'];
const SUBTYPES_BY_TYPE = {
    READY_PROPERTY: exports.READY_PROPERTY_SUBTYPES,
    LAND: exports.LAND_SUBTYPES,
};
function deriveAssetClass(subtype) {
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
function normalizeTaxonomyInput(input) {
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
        if (input.project_purpose === 'BUY_SELL')
            project_strategy = 'DIRECT_SALE';
        else if (input.project_purpose === 'BUY_DEVELOP')
            project_strategy = 'DEVELOPMENT';
        else
            project_strategy = input.project_purpose;
    }
    return {
        project_type,
        project_subtype: input.project_subtype ?? undefined,
        project_strategy,
    };
}
function assertProjectTaxonomy(input) {
    const requireAll = input.requireAll !== false;
    const { project_type, project_subtype, project_strategy } = input;
    if (!project_type && !project_subtype && !project_strategy) {
        if (requireAll) {
            throw Object.assign(new Error('project_type, project_subtype, and project_strategy are required'), { status: 400 });
        }
        return null;
    }
    if (!exports.PROJECT_TYPES.includes(project_type)) {
        throw Object.assign(new Error('Invalid project_type'), { status: 400 });
    }
    const type = project_type;
    if (!exports.PROJECT_SUBTYPES.includes(project_subtype)) {
        throw Object.assign(new Error('Invalid project_subtype'), { status: 400 });
    }
    const subtype = project_subtype;
    if (!SUBTYPES_BY_TYPE[type].includes(subtype)) {
        throw Object.assign(new Error('project_subtype does not belong to project_type'), { status: 400 });
    }
    if (!exports.PROJECT_STRATEGIES.includes(project_strategy)) {
        throw Object.assign(new Error('Invalid project_strategy'), { status: 400 });
    }
    const strategy = project_strategy;
    if (type === 'READY_PROPERTY' && strategy === 'DEVELOPMENT') {
        throw Object.assign(new Error('READY_PROPERTY projects only allow DIRECT_SALE strategy'), { status: 400 });
    }
    return { type, subtype, strategy };
}
//# sourceMappingURL=project-taxonomy.js.map