"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useTransactionMemory } from "@/lib/transaction-context";
import { SSEClient } from "@/lib/sse-client";
import { Card } from "@/components/ui/card";
import Header from "@/components/ui/header";
import { Transaction } from "@/components/transaction-table";
import { StatsCard } from "@/components/stats-card";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { AlertCircle, TrendingUp, CreditCard, BarChart3 } from "lucide-react";

type TimeSeriesData = {
  timestamp: number;
  time: string;
  fraudCount: number;
  legitimateCount: number;
  totalAmount: number;
  fraudAmount: number;
};

type CategoryStats = {
  category: string;
  fraudCount: number;
  legitimateCount: number;
};

// Helper function to format amounts dynamically
function formatAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  } else if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  } else if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`;
  } else {
    return `$${amount.toFixed(2)}`;
  }
}

export default function StatisticsPage() {
  const { transactions, addTransaction } = useTransactionMemory();
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  // Keep a map of the last 5-second windows for efficient updates
  const windowsRef = useRef<Map<number, TimeSeriesData>>(new Map());

  // Connect to SSE
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

  // Update time series data on transaction change (instead of polling)
  useEffect(() => {
    if (transactions.length === 0) {
      setTimeSeriesData([]);
      windowsRef.current.clear();
      return;
    }

    // Get the latest transaction
    const latestTx = transactions[0];
    const unix = latestTx.unix_time || Math.floor(Date.now() / 1000);
    const windowSize = 5;
    const windowKey = Math.floor(unix / windowSize) * windowSize;

    // Update or create window for this transaction
    if (!windowsRef.current.has(windowKey)) {
      windowsRef.current.set(windowKey, {
        timestamp: windowKey,
        time: new Date(windowKey * 1000).toLocaleTimeString(),
        fraudCount: 0,
        legitimateCount: 0,
        totalAmount: 0,
        fraudAmount: 0,
      });
    }

    const window = windowsRef.current.get(windowKey)!;
    const amount = typeof latestTx.amt === "string" ? parseFloat(latestTx.amt) : latestTx.amt || 0;
    
    // Update the window
    window.totalAmount += amount;
    if (latestTx.is_fraud === 1) {
      window.fraudCount += 1;
      window.fraudAmount += amount;
    } else {
      window.legitimateCount += 1;
    }

    // Keep only last 24 windows (2 minutes)
    const now = Math.floor(Date.now() / 1000);
    for (const [key] of windowsRef.current) {
      if (key < now - 120) {
        windowsRef.current.delete(key);
      }
    }

    // Convert to sorted array
    const sortedData = Array.from(windowsRef.current.values())
      .sort((a: TimeSeriesData, b: TimeSeriesData) => a.timestamp - b.timestamp)
      .slice(-24);

    setTimeSeriesData(sortedData);
  }, [transactions.length > 0 ? transactions[0].transaction_id : null]);

  // Update category stats
  useEffect(() => {
    const categories: Record<string, CategoryStats> = {};

    transactions.forEach((tx) => {
      const cat = tx.category || "Unknown";
      if (!categories[cat]) {
        categories[cat] = {
          category: cat,
          fraudCount: 0,
          legitimateCount: 0,
        };
      }

      if (tx.is_fraud === 1) {
        categories[cat].fraudCount += 1;
      } else {
        categories[cat].legitimateCount += 1;
      }
    });

    setCategoryStats(Object.values(categories).sort((a, b) => 
      (b.fraudCount + b.legitimateCount) - (a.fraudCount + a.legitimateCount)
    ).slice(0, 10)); // Top 10 categories
  }, [transactions]);

  useEffect(() => {
    const unsubscribe = SSEClient(
      (data: Transaction) => {
        setTransactions((prev) => [data, ...prev].slice(0, 10000));
      },
      (error: any) => {
        console.error("SSE Error:", error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        total: 0,
        fraud: 0,
        legitimate: 0,
        fraudRate: 0,
        totalAmount: 0,
        fraudAmount: 0,
        avgFraudAmount: "0.00",
      };
    }

    const fraudCount = transactions.filter((tx) => tx.is_fraud === 1).length;
    const legitimateCount = transactions.filter((tx) => tx.is_fraud === 0).length;
    const fraudRate = transactions.length > 0 ? ((fraudCount / transactions.length) * 100) : 0;

    let totalAmount = 0;
    let fraudAmount = 0;
    let validTransactions = 0;
    let validFraudTransactions = 0;

    for (const tx of transactions) {
      const amount = typeof tx.amt === "string" ? parseFloat(tx.amt) : tx.amt;
      
      if (amount && isFinite(amount) && amount > 0) {
        totalAmount += amount;
        validTransactions += 1;
        
        if (tx.is_fraud === 1) {
          fraudAmount += amount;
          validFraudTransactions += 1;
        }
      }
    }

    const avgFraudAmount = validFraudTransactions > 0 ? (fraudAmount / validFraudTransactions).toFixed(2) : "0.00";

    return {
      total: transactions.length,
      fraud: fraudCount,
      legitimate: legitimateCount,
      fraudRate: parseFloat(fraudRate.toFixed(1)),
      totalAmount: isFinite(totalAmount) ? totalAmount : 0,
      fraudAmount: isFinite(fraudAmount) ? fraudAmount : 0,
      avgFraudAmount,
    };
  }, [transactions]);

  // Prepare pie chart data
  const pieData = [
    { name: "Legitimate", value: stats.legitimate, fill: "#22c55e" },
    { name: "Fraudulent", value: stats.fraud, fill: "#ef4444" },
  ];

  const categoryChartConfig = {
    legitimateCount: {
      label: "Legitimate",
      color: "#22c55e",
    },
    fraudCount: {
      label: "Fraudulent",
      color: "#ef4444",
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="Statistics & Analytics" />

      <main className="flex-1 overflow-auto">
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Transactions"
              value={stats.total}
              icon={CreditCard}
              description="Monitored transactions"
              variant="default"
            />
            <StatsCard
              title="Fraud Detected"
              value={stats.fraud}
              icon={AlertCircle}
              description={`${stats.fraudRate}% fraud rate`}
              variant="fraud"
            />
            <StatsCard
              title="Total Amount"
              value={formatAmount(stats.totalAmount)}
              icon={TrendingUp}
              description="All transactions"
              variant="default"
            />
            <StatsCard
              title="Avg Fraud Amount"
              value={`$${stats.avgFraudAmount}`}
              icon={BarChart3}
              description="Per fraudulent transaction"
              variant="fraud"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fraud vs Legitimate Pie Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Transaction Distribution</h3>
              <div className="h-80 w-full flex items-center justify-center">
                {pieData.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) =>
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground">No data yet</p>
                )}
              </div>
            </Card>

            {/* Category Distribution Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Top Categories by Transaction</h3>
              <ChartContainer config={categoryChartConfig} className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryStats}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="category" type="category" width={140} tick={{ fontSize: 11 }} />
                    <ChartTooltip />
                    <ChartLegend />
                    <Bar dataKey="legitimateCount" fill="#22c55e" name="Legitimate" stackId="a" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="fraudCount" fill="#ef4444" name="Fraudulent" stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Card>
          </div>

          {/* Detailed Stats Table */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Category Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Category</th>
                    <th className="text-right py-3 px-4 font-semibold">Legitimate</th>
                    <th className="text-right py-3 px-4 font-semibold">Fraudulent</th>
                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                    <th className="text-right py-3 px-4 font-semibold">Fraud %</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((cat) => {
                    const total = cat.legitimateCount + cat.fraudCount;
                    const fraudPercent = total > 0 ? ((cat.fraudCount / total) * 100).toFixed(1) : "0";
                    return (
                      <tr key={cat.category} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium">{cat.category}</td>
                        <td className="text-right py-3 px-4 text-green-600 dark:text-green-400">
                          {cat.legitimateCount}
                        </td>
                        <td className="text-right py-3 px-4 text-red-600 dark:text-red-400">
                          {cat.fraudCount}
                        </td>
                        <td className="text-right py-3 px-4 font-semibold">{total}</td>
                        <td className="text-right py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              parseFloat(fraudPercent) > 5
                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                            }`}
                          >
                            {fraudPercent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
