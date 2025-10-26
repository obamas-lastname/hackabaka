"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Transaction } from "@/components/transaction-table";
import { SSEClient } from "./sse-client";

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

  // Initialize SSE connection ONCE when provider mounts
  useEffect(() => {
    console.log("[TransactionProvider] Connecting to SSE stream...");
    
    const cleanup = SSEClient(
      (transaction: Transaction) => {
        console.log("[TransactionProvider] Received transaction:", transaction.trans_num);
        addTransaction(transaction);
      },
      (error: any) => {
        console.error("[TransactionProvider] SSE error:", error);
      }
    );

    // Cleanup function closes the SSE connection when provider unmounts
    return () => {
      console.log("[TransactionProvider] Closing SSE stream");
      cleanup();
    };
  }, []); // Empty dependency array - only run once

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
