"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "fraud" | "safe" | "warning";
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = "default",
}: StatsCardProps) {
  const variantStyles = {
    default: "bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800/30",
    fraud: "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200 dark:border-red-800/30",
    safe: "bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800/30",
    warning: "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-800/30",
  };

  const iconStyles = {
    default: "text-blue-600 dark:text-blue-400",
    fraud: "text-red-600 dark:text-red-400",
    safe: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
  };

  return (
    <Card className={cn("p-6 border-2 transition-all hover:shadow-lg", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-bold">{value}</p>
            {trend && (
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.isPositive
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                )}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {description && (
            <p className="mt-2 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={cn("rounded-lg p-3 bg-white/50 dark:bg-black/20", iconStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
