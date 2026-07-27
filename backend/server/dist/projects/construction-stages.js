"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAGE_LOCKED_STATUSES = exports.PROJECT_STATUSES = exports.DEVELOPMENT_STAGE_TEMPLATE = void 0;
exports.DEVELOPMENT_STAGE_TEMPLATE = [
    { name: 'Land Purchase', description: 'Plot purchase, registration and stamp duty' },
    { name: 'Design', description: 'Architectural drawings and design packages' },
    { name: 'Approval', description: 'NOC, permits and regulatory approvals' },
    { name: 'Excavation', description: 'Site clearing and excavation work' },
    { name: 'Foundation', description: 'Footings and foundation slab' },
    { name: 'Structure', description: 'Columns, beams, slabs and grey structure' },
    { name: 'Masonry', description: 'Brick walls, block work and filling' },
    { name: 'Electrical', description: 'Wiring, conduit and DB installation' },
    { name: 'Plumbing', description: 'Underground and above-ground plumbing' },
    { name: 'Finishing', description: 'Plaster, flooring, fixtures and finishes' },
    { name: 'Ready For Sale', description: 'Handover-ready, listing and marketing' },
];
exports.PROJECT_STATUSES = [
    'Planning',
    'Active',
    'On Hold',
    'Completed',
    'Sold',
    'Sold During Construction',
    'Cancelled',
];
exports.STAGE_LOCKED_STATUSES = new Set([
    'Sold',
    'Sold During Construction',
    'Cancelled',
    'Completed',
]);
//# sourceMappingURL=construction-stages.js.map