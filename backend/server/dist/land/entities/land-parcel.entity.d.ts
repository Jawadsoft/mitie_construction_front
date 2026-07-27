export declare class LandParcel {
    id: string;
    project_id: string | null;
    plot_number: string;
    owner_name: string;
    owner_cnic: string | null;
    owner_phone: string | null;
    location: string;
    area: string | null;
    area_sqft: string | null;
    purchase_agreement_no: string | null;
    purchase_agreement_date: string | null;
    purchase_agreement_file: string | null;
    sale_deed_no: string | null;
    sale_deed_date: string | null;
    sale_deed_registrar: string | null;
    sale_deed_file: string | null;
    purchase_price: string | null;
    purchase_date: string | null;
    status: string;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}
