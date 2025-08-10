
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
};
