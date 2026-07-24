/** Canonical construction stages for DEVELOPMENT projects (sequence_order 1..n). */
export const DEVELOPMENT_STAGE_TEMPLATE: ReadonlyArray<{
  name: string;
  description: string;
}> = [
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

export const PROJECT_STATUSES = [
  'Planning',
  'Active',
  'On Hold',
  'Completed',
  'Sold',
  'Sold During Construction',
  'Cancelled',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STAGE_LOCKED_STATUSES: ReadonlySet<string> = new Set([
  'Sold',
  'Sold During Construction',
  'Cancelled',
  'Completed',
]);
