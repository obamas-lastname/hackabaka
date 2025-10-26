import dynamic from "next/dynamic";
import { Activity } from "lucide-react";

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

export { TransactionDetailPanelContent };
