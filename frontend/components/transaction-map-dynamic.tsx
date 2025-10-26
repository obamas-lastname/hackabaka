import dynamic from "next/dynamic";
import { Activity } from "lucide-react";
import { Transaction } from "@/components/transaction-table";

const TransactionMapContent = dynamic(
  () => import("@/components/transaction-map").then((mod) => ({
    default: mod.TransactionMap,
  })),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 w-full flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-pulse mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface TransactionMapDynamicProps {
  transaction: Transaction;
  height?: string;
}

export function TransactionMapDynamic({ transaction, height }: TransactionMapDynamicProps) {
  return <TransactionMapContent transaction={transaction} height={height} />;
}
