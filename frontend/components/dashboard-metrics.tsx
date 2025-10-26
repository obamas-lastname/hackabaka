"use client";

import { Card } from "@/components/ui/card";
import { Transaction } from "@/components/transaction-table";
import { useMemo } from "react";

interface MetricsProps {
  transactions: Transaction[];
}

export function DashboardMetrics({ transactions }: MetricsProps) {
  const metrics = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        avgTransactionAmount: 0,
        maxTransactionAmount: 0,
        minTransactionAmount: 0,
        fraudPercentage: 0,
        averageFraudAmount: 0,
      };
    }

    const amounts = transactions
      .map((tx) => (typeof tx.amt === "string" ? parseFloat(tx.amt) : tx.amt))
      .filter((amt) => amt && amt > 0);

    const fraudTransactions = transactions.filter((tx) => tx.is_fraud === 1);
    const fraudAmounts = fraudTransactions
      .map((tx) => (typeof tx.amt === "string" ? parseFloat(tx.amt) : tx.amt))
      .filter((amt) => amt && amt > 0);

    return {
      avgTransactionAmount: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
      maxTransactionAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
      minTransactionAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
      fraudPercentage: ((fraudTransactions.length / transactions.length) * 100) || 0,
      averageFraudAmount: fraudAmounts.length > 0 ? fraudAmounts.reduce((a, b) => a + b, 0) / fraudAmounts.length : 0,
    };
  }, [transactions]);

  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold mb-4">Transaction Metrics</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-muted-foreground">Avg Amount</span>
          <span className="font-semibold">${metrics.avgTransactionAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-muted-foreground">Max Amount</span>
          <span className="font-semibold">${metrics.maxTransactionAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-muted-foreground">Min Amount</span>
          <span className="font-semibold">${metrics.minTransactionAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-muted-foreground">Fraud %</span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            {metrics.fraudPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-muted-foreground">Avg Fraud Amount</span>
          <span className="font-semibold">${metrics.averageFraudAmount.toFixed(2)}</span>
        </div>
      </div>
    </Card>
  );
}
