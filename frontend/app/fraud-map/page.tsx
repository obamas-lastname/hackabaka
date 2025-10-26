"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTransactionMemory } from "@/lib/transaction-context";
import { SSEClient } from "@/lib/sse-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Header from "@/components/ui/header";
import { Transaction } from "@/components/transaction-table";
import { StatsCard } from "@/components/stats-card";
import { MapPin, AlertCircle, TrendingUp, Activity, Filter } from "lucide-react";

// Dynamically import the map component to avoid SSR issues with leaflet
const FraudMap = dynamic(
  () => import("@/components/fraud-map").then((mod) => mod.FraudMap),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-pulse mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }
);

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

export default function FraudMapPage() {
  const { transactions, addTransaction } = useTransactionMemory();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showOnlyFraud, setShowOnlyFraud] = useState(false);

  const handleSelectTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  // Calculate displayed transactions once
  const displayedTransactions = transactions.slice(0, 100);
  const displayedFraudTransactions = displayedTransactions.filter((t: Transaction) => t.is_fraud === 1);
  const transactionsToShow = showOnlyFraud ? displayedFraudTransactions : displayedTransactions;
  const displayCount = transactionsToShow.length;
  const totalCount = showOnlyFraud ? transactions.filter((t: Transaction) => t.is_fraud === 1).length : transactions.length;

  // Calculate stats from all transactions (non-limited to 100)
  const stats = {
    total: transactions.length,
    fraud: transactions.filter((t: Transaction) => t.is_fraud === 1).length,
    legitimate: transactions.filter((t: Transaction) => t.is_fraud === 0).length,
    fraudRate: transactions.length > 0 ? (transactions.filter((t: Transaction) => t.is_fraud === 1).length / transactions.length) * 100 : 0,
  };

  useEffect(() => {
    const cleanup = SSEClient(
      (transaction: Transaction) => {
        addTransaction(transaction);
      },
      (err: any) => {
        console.error("SSE Error:", err);
      }
    );

    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="Fraud Detection Map" />

      <main className="flex-1 overflow-auto">
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">
          {/* Map Section */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Live Transaction Map
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time visualization of transactions with pulse effects • Showing {displayCount} of {totalCount} transactions
                </p>
              </div>
              <Button
                variant={showOnlyFraud ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyFraud(!showOnlyFraud)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {showOnlyFraud ? "Show All" : "Fraud Only"}
              </Button>
            </div>
            <div className="h-[600px] relative">
              <FraudMap 
                transactions={transactionsToShow} 
                className="h-full w-full" 
                showOnlyFraud={showOnlyFraud}
                onSelectTransaction={handleSelectTransaction}
              />
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Last 100 Transactions"
              value={stats.total.toLocaleString()}
              icon={Activity}
              description="Last 100 transactions processed"
              variant="default"
            />
            <StatsCard
              title="Legitimate"
              value={stats.legitimate.toLocaleString()}
              icon={TrendingUp}
              description="Verified transactions"
              variant="safe"
            />
            <StatsCard
              title="Fraudulent"
              value={stats.fraud.toLocaleString()}
              icon={AlertCircle}
              description="Detected fraud cases"
              variant="fraud"
            />
            <StatsCard
              title="Fraud Rate"
              value={`${stats.fraudRate.toFixed(1)}%`}
              icon={MapPin}
              description="Percentage of fraudulent"
              variant={stats.fraudRate > 5 ? "fraud" : "default"}
            />
          </div>
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-6 py-4 flex-shrink-0">
            <DialogTitle className="text-lg font-bold text-white">
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedTransaction && (
              <TransactionDetailPanelContent transaction={selectedTransaction} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
