"use client";

import { Transaction } from "@/components/transaction-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, Clock, Store, User } from "lucide-react";

interface TransactionCardProps {
  transaction: Transaction;
  onClick?: () => void;
  threshold?: number;
}

export function TransactionCard({
  transaction,
  onClick,
  threshold = 0.5,
}: TransactionCardProps) {
  // Ensure amt is a number
  const amt = typeof transaction.amt === 'string' ? parseFloat(transaction.amt) : transaction.amt;
  const isFraud = transaction.is_fraud === 1;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "px-3 py-2 cursor-pointer transition-all duration-200 hover:shadow-md border",
        isFraud 
          ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/30" 
          : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 hover:bg-gray-100/50 dark:hover:bg-gray-900/50"
      )}
    >
      <div className="flex items-center gap-3 text-xs">
        {/* User Icon */}
        <div className="p-1 rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          <User className="h-3 w-3 text-gray-600 dark:text-gray-300" />
        </div>

        {/* Name and Location */}
        <div className="min-w-0 flex-shrink-0">
          <p className="font-semibold truncate text-gray-900 dark:text-white">
            {transaction.first} {transaction.last}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {transaction.city || 'N/A'}, {transaction.state || 'N/A'}
          </p>
        </div>

        {/* Merchant */}
        <div className="flex items-center gap-1 flex-1 min-w-0 text-gray-700 dark:text-gray-300">
          <Store className="h-3 w-3 flex-shrink-0 text-gray-500 dark:text-gray-400" />
          <span className="truncate font-medium">{transaction.merchant || 'N/A'}</span>
        </div>

        {/* Category */}
        <span className="truncate flex-shrink-0 text-gray-600 dark:text-gray-400">
          {transaction.category || 'N/A'}
        </span>

        {/* Amount */}
        <p className="font-bold whitespace-nowrap flex-shrink-0 text-gray-900 dark:text-white">
          ${(amt || 0).toFixed(2)}
        </p>

        {/* Time */}
        <div className="flex items-center gap-1 flex-shrink-0 text-gray-600 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span className="whitespace-nowrap font-medium">{transaction.trans_time || 'N/A'}</span>
        </div>

        {/* Date */}
        <span className="whitespace-nowrap flex-shrink-0 text-gray-500 dark:text-gray-400">
          {transaction.trans_date || 'N/A'}
        </span>

        {/* Status Badge */}
        {isFraud ? (
          <Badge className="gap-1 bg-red-600 hover:bg-red-700 text-white text-xs py-0.5 px-1.5 h-5 flex-shrink-0 whitespace-nowrap">
            <AlertCircle className="h-2.5 w-2.5" />
            Fraudulent
          </Badge>
        ) : (
          <Badge className="gap-1 bg-green-600 hover:bg-green-700 text-white text-xs py-0.5 px-1.5 h-5 flex-shrink-0 whitespace-nowrap">
            ✓ Legitimate
          </Badge>
        )}
      </div>
    </Card>
  );
}
