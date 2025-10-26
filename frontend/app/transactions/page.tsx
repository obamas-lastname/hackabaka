"use client";

import { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { SSEClient } from "@/lib/sse-client";
import { Card } from "@/components/ui/card";
import Header from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Pause, Play, TrendingUp } from "lucide-react";

type Tx = {
  transaction_id: string;
  unix_time: number;
  amt: number;
  is_fraud?: number;
};

export default function TransactionsChartPage() {
  // We'll maintain a sliding window (in seconds) of counts per second for fraud/legit.
  const WINDOW_SECONDS = 120; // show last 120 seconds
  const [chartData, setChartData] = useState<Array<{ time: string; ts: number; legit: number; fraud: number }>>([]);

  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // counts map: second -> { legit, fraud }
  const countsRef = useRef<Map<number, { legit: number; fraud: number }>>(new Map());

  // Helper to push an event into counts map
  function pushTxToCounts(d: any) {
    const unix = Number(d.unix_time || Math.floor(Date.now() / 1000));
    const ts = Math.floor(unix);
    const isFraud = d.is_fraud !== undefined ? Number(d.is_fraud) : d.fraud !== undefined ? Number(d.fraud) : 0;
    const map = countsRef.current;
    const cur = map.get(ts) || { legit: 0, fraud: 0 };
    if (isFraud === 1) cur.fraud += 1;
    else cur.legit += 1;
    map.set(ts, cur);
  }

  useEffect(() => {
    // SSE subscription
    const unsub = SSEClient(
      (d: any) => {
        try {
          pushTxToCounts(d);
        } catch (e) {
          console.error("Error processing tx for TPS", e);
        }
      },
      (err: any) => {
        console.error("SSE Error (chart):", err);
      }
    );

    function tickOnce() {
      const now = Math.floor(Date.now() / 1000);
      const map = countsRef.current;

      // ensure current second exists (so chart pulses even with zero activity)
      if (!map.has(now)) map.set(now, { legit: 0, fraud: 0 });

      // build data for last WINDOW_SECONDS seconds
      const entries: Array<{ ts: number; legit: number; fraud: number }> = [];
      for (let s = now - (WINDOW_SECONDS - 1); s <= now; s++) {
        const v = map.get(s) || { legit: 0, fraud: 0 };
        entries.push({ ts: s, legit: v.legit, fraud: v.fraud });
      }

      // trim map to only recent keys to avoid memory growth
      for (const key of Array.from(map.keys())) {
        if (key < now - WINDOW_SECONDS) map.delete(key);
      }

      // set chart data (ascending by time)
      setChartData(entries.map((e) => ({ time: new Date(e.ts * 1000).toLocaleTimeString(), ts: e.ts, legit: e.legit, fraud: e.fraud })));
    }

    // start ticker unless paused
    if (!paused) {
      intervalRef.current = window.setInterval(tickOnce, 1000) as unknown as number;
      // immediately tick once to populate
      tickOnce();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      try {
        unsub();
      } catch {}
    };
  }, [paused]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="Transaction Analytics" />

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current TPS</p>
                  <p className="text-3xl font-bold mt-2">
                    {chartData.length ? `${chartData[chartData.length - 1].legit + chartData[chartData.length - 1].fraud}` : "0"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">transactions per second</p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Legitimate Txs</p>
                  <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">
                    {chartData.length ? chartData[chartData.length - 1].legit : "0"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">last second</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200 dark:border-red-800/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fraudulent Txs</p>
                  <p className="text-3xl font-bold mt-2 text-red-600 dark:text-red-400">
                    {chartData.length ? chartData[chartData.length - 1].fraud : "0"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">last second</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Chart Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Transaction Rate (120s window)</h2>
                <p className="text-xs text-muted-foreground mt-1">Real-time stream of legitimate vs fraudulent transactions</p>
              </div>
              <Button
                variant={paused ? "secondary" : "outline"}
                size="sm"
                onClick={() => setPaused((p) => !p)}
                className="gap-2"
              >
                {paused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                )}
              </Button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Legitimate Transactions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Fraudulent Transactions</span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="time"
                    minTickGap={20}
                    stroke="var(--color-muted-foreground)"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.5rem",
                    }}
                    labelStyle={{ color: "var(--color-foreground)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="legit"
                    stroke="#22c55e"
                    dot={false}
                    isAnimationActive={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="fraud"
                    stroke="#ef4444"
                    dot={false}
                    isAnimationActive={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
