
export type DentalCase = {
  id: string;
  patientName: string;
  dentistName: string;
  toothNumbers: string;
  prosthesisType: string;
  material: string;
  shade: string;
  createdAt: any; // Using 'any' for Firestore ServerTimestamp flexibility
  deliveryDate?: any; // Can be a Date object or a Firestore Timestamp
  notes?: string;
  source?: 'Mobile' | 'Desktop';
  patientNumber?: string;
};

export type InvoiceSummaryItem = {
    toothCount: number;
    price: number;
    total: number;
};

export type Invoice = {
    id: string;
    dentistName: string;
    fromDate?: any;
    toDate?: any;
    summary: Record<string, InvoiceSummaryItem>;
    grandTotal: number;
    createdAt: any;
    cases: DentalCase[]; // Add cases to the invoice type
};

export type Notification = {
    id: string;
    dentistName: string;
    message: string;
    read: boolean;
    createdAt: any;
};

export type LoginLog = {
    id: string;
    dentistName: string;
    timestamp: any;
};
