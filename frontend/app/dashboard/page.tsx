"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Transaction } from "@/components/transaction-table";
import { TransactionList } from "@/components/transaction-list";
import { useTransactionMemory } from "@/lib/transaction-context";
import { Card } from "@/components/ui/card";
import Header from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Dynamically import the transaction detail panel to avoid SSR issues with leaflet
const TransactionDetailPanelContent = dynamic(
  () => import("@/components/transaction-detail-panel").then((mod) => ({
    default: mod.TransactionDetailPanel,
  })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-pulse mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading transaction details...</p>
        </div>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const { transactions, isFrozen, setIsFrozen } = useTransactionMemory();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="h-screen bg-background flex flex-col">
        <Header />
      
        <main className="w-full flex-1 flex gap-4 overflow-hidden p-4">
        {/* Left: Transaction List */}
        <div className="flex-1 flex flex-col overflow-hidden space-y-3">
          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex-shrink-0">
              {error}
            </div>
          )}

          {/* Transaction List */}
          <Card className="p-3 flex-1 flex flex-col overflow-hidden">
            <TransactionList
              transactions={transactions}
              onSelectTransaction={handleSelectTransaction}
            />
          </Card>
        </div>

        {/* Right Sidebar: Statistics */}
        <Card className="p-4 flex-shrink-0 w-80">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Live KPI</h3>
              <Button
                onClick={() => setIsFrozen(!isFrozen)}
                variant={isFrozen ? "default" : "outline"}
                size="sm"
                className="text-xs"
              >
                {isFrozen ? "Feed frozen" : "Freeze feed"}
              </Button>
            </div>
            
            <div className="space-y-3">
              {/* Total Transactions */}
              <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg border border-border/50 hover:border-border transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Total Transactions</span>
                  <Activity className="h-4 w-4 text-blue-500/60" />
                </div>
                <span className="font-bold text-2xl">{transactions.length}</span>
                <span className="text-xs text-muted-foreground">All processed</span>
              </div>

              {/* Fraud Rate */}
              <div className="flex flex-col gap-1 p-3 bg-destructive/10 rounded-lg border border-destructive/30 hover:border-destructive/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Fraud Rate</span>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <span className="font-bold text-2xl">
                  {transactions.length > 0 
                    ? ((transactions.filter((tx) => tx.is_fraud === 1).length / transactions.length) * 100).toFixed(1)
                    : "0"
                  }%
                </span>
                <span className="text-xs text-muted-foreground">
                  {transactions.filter((tx) => tx.is_fraud === 1).length} fraud cases
                </span>
              </div>

              {/* Average Transaction Amount */}
              <div className="flex flex-col gap-1 p-3 bg-blue-100/50 dark:bg-blue-950/20 rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Avg Amount</span>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-bold text-2xl">
                  ${
                    transactions.length > 0
                      ? (transactions.reduce((sum, tx) => {
                          const amt = typeof tx.amt === 'string' ? parseFloat(tx.amt) : tx.amt;
                          return sum + (amt || 0);
                        }, 0) / transactions.length).toFixed(2)
                      : "0.00"
                  }
                </span>
                <span className="text-xs text-muted-foreground">
                  Total: ${
                    transactions.reduce((sum, tx) => {
                      const amt = typeof tx.amt === 'string' ? parseFloat(tx.amt) : tx.amt;
                      return sum + (amt || 0);
                    }, 0).toFixed(2)
                  }
                </span>
              </div>

              {/* Legitimate vs Fraudulent */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 p-2 bg-green-100/30 dark:bg-green-950/20 rounded-lg border border-green-500/30 hover:border-green-500/50 transition ease-in-out duration-200">
                  <span className="text-xs text-muted-foreground font-medium">Legitimate</span>
                  <span className="font-bold text-lg text-green-600">
                    {transactions.filter((tx) => tx.is_fraud === 0).length}
                  </span>
                </div>
                <div className="flex flex-col gap-1 p-2 bg-red-100/30 dark:bg-red-950/20 rounded-lg border border-red-500/30 hover:border-red-500/50 transition ease-in-out duration-200">
                  <span className="text-xs text-muted-foreground font-medium">Fraudulent</span>
                  <span className="font-bold text-lg text-red-600">
                    {transactions.filter((tx) => tx.is_fraud === 1).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="p-0 border-0">
          <DialogHeader className="bg-slate-900 border-b border-slate-700 px-6 py-4">
            <DialogTitle className="text-lg font-bold text-white">
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 px-6 py-5">
            {selectedTransaction && (
              <TransactionDetailPanelContent transaction={selectedTransaction} />
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
