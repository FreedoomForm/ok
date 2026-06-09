export interface TransactionSummary {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string | null;
  category: string | null;
  createdAt: string;
}

export interface TransactionListItem extends TransactionSummary {
  adminId: string | null;
  customerId: string | null;
  salaryRecipientAdminId: string | null;
}
