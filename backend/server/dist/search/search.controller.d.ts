import { SearchService } from './search.service';
export declare class SearchController {
    private readonly search;
    constructor(search: SearchService);
    searchAll(q?: string): Promise<{
        projects: {
            id: string;
            label: string;
            sub: string;
        }[];
        land: {
            id: string;
            label: string;
            sub: string;
        }[];
        customers: {
            id: string;
            label: string;
            sub: string;
        }[];
        sales: {
            id: string;
            label: string;
            sub: string;
        }[];
        expenses: {
            id: string;
            label: string;
            sub: string;
        }[];
        suppliers: {
            id: string;
            label: string;
            sub: string;
        }[];
    }>;
}
