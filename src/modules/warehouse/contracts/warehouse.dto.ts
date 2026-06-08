export interface WarehouseItemSummary {
  id: string;
  name: string;
  amount: number;
  unit: string;
  kcalPerGram: number | null;
  pricePerUnit: number | null;
  priceUnit: string;
  updatedAt: string;
}

export interface ShoppingListItem {
  name: string;
  amount: number;
  unit: string;
}
