export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  balance: number;
  assignedSetId: string | null;
}

export interface CustomerListItem extends CustomerSummary {
  calories: number;
  planType: string;
  dailyPrice: number;
  address: string;
  defaultCourierId: string | null;
}

export interface CustomerDetail extends CustomerListItem {
  notes: string | null;
  deliveryDays: string | null;
  autoOrdersEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
