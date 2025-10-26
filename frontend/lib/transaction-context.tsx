"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Transaction } from "@/components/transaction-table";

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  setTransactions: (transactions: Transaction[]) => void;
  clearTransactions: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addTransaction = (transaction: Transaction) => {
    setTransactions((prev) => [transaction, ...prev]);
  };

  const clearTransactions = () => {
    setTransactions([]);
  };

  const value: TransactionContextType = {
    transactions,
    addTransaction,
    setTransactions,
    clearTransactions,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactionMemory() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error("useTransactionMemory must be used within TransactionProvider");
  }
  return context;
}
