import { create } from "zustand";
import { Transaction } from "@/components/transaction-table";

interface TransactionStore {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  setTransactions: (transactions: Transaction[]) => void;
  clearTransactions: () => void;
  getTransactionCount: () => number;
  getFraudCount: () => number;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],

  addTransaction: (transaction: Transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    })),

  setTransactions: (transactions: Transaction[]) =>
    set({ transactions }),

  clearTransactions: () =>
    set({ transactions: [] }),

  getTransactionCount: () =>
    get().transactions.length,

  getFraudCount: () =>
    get().transactions.filter((t) => t.is_fraud === 1).length,
}));
