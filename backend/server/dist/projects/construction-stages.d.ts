export declare const DEVELOPMENT_STAGE_TEMPLATE: ReadonlyArray<{
    name: string;
    description: string;
}>;
export declare const PROJECT_STATUSES: readonly ["Planning", "Active", "On Hold", "Completed", "Sold", "Sold During Construction", "Cancelled"];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export declare const STAGE_LOCKED_STATUSES: ReadonlySet<string>;
