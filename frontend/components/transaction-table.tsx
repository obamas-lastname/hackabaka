"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

export type Transaction = {
  transaction_id: string;
  ssn: string;
  cc_num: string;
  first: string;
  last: string;
  gender: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  long: number;
  city_pop: number;
  job: string;
  dob: string;
  acct_num: string;
  profile: string;
  trans_num: string;
  trans_date: string;
  trans_time: string;
  unix_time: number;
  category: string;
  amt: number;
  merchant: string;
  merch_lat: number;
  merch_long: number;
  is_fraud: number;
};

interface TransactionsTableProps {
  data: Transaction[];
  threshold?: number;
}

export function TransactionsTable({ data, threshold = 0.2 }: TransactionsTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No transaction available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Hour</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Risk (in %)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((tx, i) => {
            const isFraud = tx.is_fraud >= threshold;
            return (
              <TableRow
                key={tx.trans_num || i}
                className={cn(
                  "hover:bg-muted/50 transition-colors",
                  isFraud && "bg-destructive/10"
                )}
              >
                <TableCell>
                  <div className="font-medium">
                    {tx.first} {tx.last}
                  </div>
                  <div className="text-xs text-muted-foreground">{tx.gender}</div>
                </TableCell>

                <TableCell>
                  <div>{tx.city}</div>
                  <div className="text-xs text-muted-foreground">{tx.state}</div>
                </TableCell>

                <TableCell>{tx.merchant}</TableCell>
                <TableCell>{tx.category}</TableCell>
                <TableCell>{tx.trans_date}</TableCell>
                <TableCell>{tx.trans_time}</TableCell>

                <TableCell className="text-right font-mono">
                  $ {tx.amt.toFixed(2)}
                </TableCell>

                <TableCell className="text-right">
                  {isFraud ? (
                    <Badge variant="destructive" className="gap-1">
                      <TriangleAlert className="h-3.5 w-3.5" />
                      Fraud
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      OK
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
