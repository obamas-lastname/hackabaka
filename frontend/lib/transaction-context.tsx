"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Transaction } from "@/components/transaction-table";
import { SSEClient } from "./sse-client";

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  setTransactions: (transactions: Transaction[]) => void;
  clearTransactions: () => void;
  isFrozen: boolean;
  setIsFrozen: (frozen: boolean) => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFrozen, setIsFrozen] = useState(false);

  const addTransaction = (transaction: Transaction) => {
    // Only add transaction if not frozen
    if (!isFrozen) {
      setTransactions((prev) => [transaction, ...prev]);
    }
  };

  const clearTransactions = () => {
    setTransactions([]);
  };

  // Initialize SSE connection ONCE when provider mounts
  useEffect(() => {
    const cleanup = SSEClient(
      (transaction: Transaction) => {
        addTransaction(transaction);
      },
      (error: any) => {
        console.error("[TransactionProvider] SSE error:", error);
      },
      () => {
        // SSE disconnected - clear transactions
        clearTransactions();
      }
    );

    // Cleanup function closes the SSE connection when provider unmounts
    return () => {
      cleanup();
    };
  }, []); // Empty dependency array - only run once

  const value: TransactionContextType = {
    transactions,
    addTransaction,
    setTransactions,
    clearTransactions,
    isFrozen,
    setIsFrozen,
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
