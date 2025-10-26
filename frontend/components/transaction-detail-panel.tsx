"use client";

import { useState, lazy, Suspense } from "react";
import { Transaction } from "@/components/transaction-table";
import { Badge } from "@/components/ui/badge";
import { TriangleAlert, AlertCircle, MapPin, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { TransactionMapDynamic } from "@/components/transaction-map-dynamic";

interface TransactionDetailPanelProps {
  transaction?: Transaction;
  threshold?: number;
}

export function TransactionDetailPanel({
  transaction,
}: TransactionDetailPanelProps) {
  const [showRawData, setShowRawData] = useState(false);

  if (!transaction) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Select a transaction to view details</p>
      </div>
    );
  }

  // Ensure numeric fields are numbers
  const amt = typeof transaction.amt === 'string' ? parseFloat(transaction.amt) : transaction.amt;
  const lat = typeof transaction.lat === 'string' ? parseFloat(transaction.lat) : transaction.lat;
  const long = typeof transaction.long === 'string' ? parseFloat(transaction.long) : transaction.long;
  const merch_lat = typeof transaction.merch_lat === 'string' ? parseFloat(transaction.merch_lat) : transaction.merch_lat;
  const merch_long = typeof transaction.merch_long === 'string' ? parseFloat(transaction.merch_long) : transaction.merch_long;
  const is_fraud = typeof transaction.is_fraud === 'string' ? parseInt(transaction.is_fraud) : transaction.is_fraud;
  const city_pop = typeof transaction.city_pop === 'string' ? parseInt(transaction.city_pop) : transaction.city_pop;

  const isFraud = transaction.is_fraud === 1;

  const InfoField = ({ label, value }: { label: string; value: string | number }) => (
    <div>
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-100 font-medium">{value}</p>
    </div>
  );

  const CoordinateField = ({ label, lat: latitude, long: longitude }: { label: string; lat: number; long: number }) => {
    const mapsUrl = `https://www.google.com/maps/place/${latitude},${longitude}`;
    return (
      <div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-100 font-medium">{latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center p-1.5 rounded bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white"
            title="View on Google Maps"
          >
            <MapPin className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Primary Info - Amount, Status, Time (Most Important) */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-r from-slate-800/60 to-slate-900/60 rounded-lg border border-slate-700">
        <div className="text-center">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Amount</p>
          <p className="text-2xl font-bold text-slate-100">${(amt || 0).toFixed(2)}</p>
        </div>
        <div className="text-center flex flex-col items-center justify-center">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Status</p>
          {isFraud ? (
            <Badge variant="destructive" className="bg-red-600/90 hover:bg-red-700 gap-1 text-xs">
              <TriangleAlert className="h-3 w-3" />
              Fraudulent
            </Badge>
          ) : (
            <Badge className="bg-green-600/90 hover:bg-green-700 text-white gap-1 text-xs">
              <AlertCircle className="h-3 w-3" />
              Legitimate
            </Badge>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Date & Time</p>
          <p className="text-sm text-slate-100 font-medium">{transaction.trans_date || 'N/A'}</p>
          <p className="text-xs text-slate-300">{transaction.trans_time || 'N/A'}</p>
        </div>
      </div>

      {/* Customer & Merchant Info */}
      <div className="grid grid-cols-2 gap-4">
        {/* Customer Section */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide mb-3 pb-2 border-b border-slate-700">Customer</h3>
          <div className="space-y-2.5">
            <InfoField label="Name" value={`${transaction.first || ''} ${transaction.last || ''}`} />
            <InfoField label="Date of Birth" value={transaction.dob || 'N/A'} />
            <InfoField label="Gender" value={transaction.gender || 'N/A'} />
            <InfoField label="Job" value={transaction.job || 'N/A'} />
            <InfoField label="SSN" value={transaction.ssn || 'N/A'} />
            <div className="pt-1">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Address</p>
              <p className="text-sm text-slate-100 font-medium">{transaction.street || 'N/A'}</p>
              <p className="text-sm text-slate-100 font-medium">{transaction.city || ''}, {transaction.state || ''} {transaction.zip || ''}</p>
              <p className="text-xs text-slate-400 mt-1">Population: {(city_pop || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Transaction & Card Section */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide mb-3 pb-2 border-b border-slate-700">Transaction</h3>
          <div className="space-y-2.5">
            <InfoField label="Merchant" value={transaction.merchant || 'N/A'} />
            <InfoField label="Category" value={transaction.category || 'N/A'} />
            <InfoField label="Card Number" value={`${transaction.cc_num ? String(transaction.cc_num) : 'N/A'}`} />
            <InfoField label="Account" value={transaction.acct_num || 'N/A'} />
            <InfoField label="Transaction ID" value={transaction.trans_num || 'N/A'} />
            <InfoField label="Profile" value={transaction.profile || 'N/A'} />
          </div>
        </div>
      </div>

      {/* Location Info - Coordinates */}
      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide mb-3 pb-2 border-b border-slate-700">Location Coordinates</h3>
        <div className="grid grid-cols-2 gap-4">
          <CoordinateField label="Cardholder Coords" lat={lat || 0} long={long || 0} />
          <CoordinateField label="Merchant Coords" lat={merch_lat || 0} long={merch_long || 0} />
        </div>
      </div>

      {/* Transaction Map - Interactive Leaflet */}
      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide mb-3 pb-2 border-b border-slate-700">Transaction Route</h3>
        <TransactionMapDynamic transaction={transaction} height="h-96" />
      </div>

      {/* Advanced - Raw Data */}
      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
        <button
          onClick={() => setShowRawData(!showRawData)}
          className="w-full flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors"
        >
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Advanced: Raw Data</h3>
          {showRawData ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        
        {showRawData && (
          <div className="mt-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700 overflow-x-auto">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(transaction, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
