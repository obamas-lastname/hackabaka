"use client";

import { useState, useMemo } from "react";
import { Transaction } from "@/components/transaction-table";
import { TransactionCard } from "@/components/transaction-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Search, Filter, ArrowUpDown, X } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  onSelectTransaction: (transaction: Transaction) => void;
  threshold?: number;
  isLive?: boolean;
}

type SortType = "recent" | "amount-high" | "amount-low" | "fraud";
type FilterType = "all" | "fraud" | "legitimate";

export function TransactionList({
  transactions,
  onSelectTransaction,
  threshold = 0.5,
  isLive = false,
}: TransactionListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<SortType>("recent");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Filter and sort transactions
  const filteredAndSorted = useMemo(() => {
    let result = transactions;

    // Apply filter
    if (filterType === "fraud") {
      result = result.filter((tx) => tx.is_fraud === 1);
    } else if (filterType === "legitimate") {
      result = result.filter((tx) => tx.is_fraud === 0);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.merchant?.toLowerCase().includes(query) ||
          tx.category?.toLowerCase().includes(query) ||
          tx.trans_num?.toLowerCase().includes(query) ||
          tx.first?.toLowerCase().includes(query) ||
          tx.last?.toLowerCase().includes(query) ||
          tx.city?.toLowerCase().includes(query)
      );
    }

    // Apply sort
    const sorted = [...result];
    if (sortType === "recent") {
      // Keep original order (most recent first)
    } else if (sortType === "amount-high") {
      sorted.sort((a, b) => {
        const aAmt = typeof a.amt === "string" ? parseFloat(a.amt) : a.amt;
        const bAmt = typeof b.amt === "string" ? parseFloat(b.amt) : b.amt;
        return (bAmt || 0) - (aAmt || 0);
      });
    } else if (sortType === "amount-low") {
      sorted.sort((a, b) => {
        const aAmt = typeof a.amt === "string" ? parseFloat(a.amt) : a.amt;
        const bAmt = typeof b.amt === "string" ? parseFloat(b.amt) : b.amt;
        return (aAmt || 0) - (bAmt || 0);
      });
    } else if (sortType === "fraud") {
      sorted.sort((a, b) => {
        return (b.is_fraud === 1 ? 1 : 0) - (a.is_fraud === 1 ? 1 : 0);
      });
    }

    return sorted;
  }, [transactions, searchQuery, filterType, sortType]);

  const fraudCount = filteredAndSorted.filter((tx) => tx.is_fraud === 1).length;
  const totalAmount = filteredAndSorted.reduce((sum, tx) => {
    const amt = typeof tx.amt === 'string' ? parseFloat(tx.amt) : tx.amt;
    return sum + (amt || 0);
  }, 0);

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground space-y-3">
        <Zap className="h-12 w-12 mx-auto opacity-20" />
        <p className="text-lg font-medium">Waiting for transactions...</p>
        <p className="text-sm">Transactions will appear here when data is sent to /api/stream</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col overflow-hidden">
      {/* Header with stats */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-2 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold">Transactions</h2>
          <p className="text-sm text-muted-foreground mt-1">
          </p>
        </div>
        {isLive && (
          <Badge className="animate-pulse gap-2 bg-green-500 hover:bg-green-600">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Live Stream
          </Badge>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-2 flex-shrink-0 flex-wrap items-center">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search merchant, category, name, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdown with better UX */}
        <div className="relative">
          <button
            onClick={() => {
              setFilterMenuOpen(!filterMenuOpen);
              setSortMenuOpen(false);
            }}
            className={`px-4 py-2.5 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${
              filterType !== "all"
                ? "bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600/30"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600"
            }`}
            title="Filter transactions"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
            {filterType !== "all" && (
              <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full ml-1">
                {filterType === "fraud" ? "Fraud" : "Legit"}
              </span>
            )}
          </button>

          {/* Filter Dropdown Menu */}
          {filterMenuOpen && (
            <div className="absolute left-0 mt-2 w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
              <div className="p-2 border-b border-slate-700">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Filter by status</p>
              </div>
              <button
                onClick={() => {
                  setFilterType("all");
                  setFilterMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  filterType === "all"
                    ? "bg-blue-700 text-white"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
                title="Show all transactions"
              >
                <span className="w-4">✓</span>
                All Transactions
              </button>
              <button
                onClick={() => {
                  setFilterType("fraud");
                  setFilterMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  filterType === "fraud"
                    ? "bg-red-700 text-white"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
                title="Show only fraudulent transactions"
              >
                <span className="w-4">⚠️</span>
                Fraud Only
              </button>
              <button
                onClick={() => {
                  setFilterType("legitimate");
                  setFilterMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  filterType === "legitimate"
                    ? "bg-green-700 text-white"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
                title="Show only legitimate transactions"
              >
                <span className="w-4">✓</span>
                Legitimate Only
              </button>
            </div>
          )}
        </div>

        {/* Sort Dropdown with better UX */}
        <div className="relative">
          <button
            onClick={() => {
              setSortMenuOpen(!sortMenuOpen);
              setFilterMenuOpen(false);
            }}
            className={`px-4 py-2.5 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${
              sortType !== "recent"
                ? "bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-700"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600"
            }`}
            title="Sort transactions"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Sort</span>
            {sortType !== "recent" && (
              <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full ml-1">
                {sortType === "fraud" ? "Fraud" : sortType === "amount-high" ? "↓ Amount" : "↑ Amount"}
              </span>
            )}
          </button>

          {/* Sort Dropdown Menu */}
          {sortMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
              <div className="p-2 border-b border-slate-700">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Sort by</p>
              </div>
              <button
                onClick={() => {
                  setSortType("recent");
                  setSortMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  sortType === "recent"
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
                title="Most recent transactions first"
              >
                <span className="w-4">📅</span>
                Most Recent
              </button>
              <button
                onClick={() => {
                  setSortType("fraud");
                  setSortMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  sortType === "fraud"
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
                title="Fraudulent transactions first"
              >
                <span className="w-4">⚠️</span>
                Fraud First
              </button>
              <button
                onClick={() => {
                  setSortType("amount-high");
                  setSortMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  sortType === "amount-high"
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
                title="Highest amounts first"
              >
                <span className="w-4">↓</span>
                Highest Amount
              </button>
              <button
                onClick={() => {
                  setSortType("amount-low");
                  setSortMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  sortType === "amount-low"
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
                title="Lowest amounts first"
              >
                <span className="w-4">↑</span>
                Lowest Amount
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transaction List */}
      {filteredAndSorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center space-y-2">
            <p className="font-medium">No transactions found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto flex-1 pr-2">
          {filteredAndSorted.map((transaction, index) => (
            <TransactionCard
              key={`${transaction.transaction_id}-${index}`}
              transaction={transaction}
              onClick={() => onSelectTransaction(transaction)}
              threshold={threshold}
            />
          ))}
        </div>
      )}
    </div>
  );
}
