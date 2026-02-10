export type SchemeType = 'Gold Savings' | 'Diamond Scheme' | 'Platinum Scheme';
export type SchemeStatus = 'Active' | 'Matured' | 'Closed' | 'Defaulted';

export interface Scheme {
  id: string;
  schemeNo: string;
  customerName: string;
  customerPhone: string;
  schemeType: SchemeType;
  monthlyInstallment: number;
  totalMonths: number;
  paidMonths: number;
  startDate: Date;
  maturityDate: Date;
  totalPaid: number;
  bonusPercentage: number;
  status: SchemeStatus;
}
