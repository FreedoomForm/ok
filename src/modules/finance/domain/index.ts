/**
 * Finance Domain — barrel export.
 */

export {
  TransactionEntity,
} from './transaction.entity'

export {
  FinancePolicy,
  type FinancePolicyUser,
} from './finance.policy'

export {
  InvalidTransactionAmountError,
  TransactionNotReversibleError,
  InsufficientBalanceError,
  FinanceValidationError,
} from './finance.errors'

export {
  type TransactionCreatedEvent,
  type SalaryPaidEvent,
  type IngredientsPurchasedEvent,
  type TransactionCreatedPayload,
  type SalaryPaidPayload,
  type IngredientsPurchasedPayload,
  createTransactionCreatedEvent,
  createSalaryPaidEvent,
  createIngredientsPurchasedEvent,
} from './finance.events'
