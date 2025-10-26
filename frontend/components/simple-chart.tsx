"use client";

import { Card } from "@/components/ui/card";

interface AnalyticsChartProps {
  title: string;
  data: number[];
  labels?: string[];
  height?: number;
  variant?: "line" | "bar";
}

export function SimpleChart({
  title,
  data,
  labels = [],
  height = 100,
  variant = "bar",
}: AnalyticsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          No data available
        </div>
      </Card>
    );
  }

  const maxValue = Math.max(...data, 1);
  const normalized = data.map((v) => (v / maxValue) * 100);

  return (
    <Card className="p-4">
      <p className="text-sm font-medium mb-4">{title}</p>
      <div
        style={{ height: `${height}px` }}
        className="flex items-flex-end justify-between gap-1"
      >
        {normalized.map((value, i) => (
          <div
            key={i}
            className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t opacity-80 hover:opacity-100 transition-opacity"
            style={{ height: `${value}%`, minHeight: "4px" }}
            title={`${labels[i] || i}: ${data[i]}`}
          />
        ))}
      </div>
      {labels.length > 0 && (
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{labels[0]}</span>
          <span>{labels[Math.floor(labels.length / 2)]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </Card>
  );
}
