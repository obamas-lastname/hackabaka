"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Transaction } from "./transaction-table";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

interface FraudMapProps {
  transactions: Transaction[];
  className?: string;
  showOnlyFraud?: boolean;
  onSelectTransaction?: (transaction: Transaction) => void;
  maxMarkers?: number;
}

// Custom icons using SVG for better rendering
const customerIcon = new L.DivIcon({
  className: "custom-icon customer-icon",
  html: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="2"/>
    </svg>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const customerFraudIcon = new L.DivIcon({
  className: "custom-icon customer-fraud-icon",
  html: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">
      <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
    </svg>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const merchantFraudIcon = new L.DivIcon({
  className: "custom-icon merchant-fraud-icon",
  html: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">
      <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
    </svg>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const merchantLegitIcon = new L.DivIcon({
  className: "custom-icon merchant-legit-icon",
  html: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <circle cx="12" cy="12" r="10" fill="#22c55e" stroke="white" stroke-width="2"/>
    </svg>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function FraudMap({ transactions, className = "", showOnlyFraud = false, onSelectTransaction, maxMarkers = 100 }: FraudMapProps) {
  // Center of USA
  const center: [number, number] = [39.8283, -98.5795];

  // Filter transactions if needed
  const filteredTransactions = useMemo(() => {
    const filtered = showOnlyFraud 
      ? transactions.filter(t => t.is_fraud === 1)
      : transactions;
    
    // Keep only latest maxMarkers
    return filtered.slice(0, maxMarkers);
  }, [transactions, showOnlyFraud, maxMarkers]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: "100%" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes fadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0.2;
          }
        }
        
        .marker-fade-out {
          animation: fadeOut 30s ease-out forwards;
        }
      `}</style>
      
      <div style={{ width: "100%", height: "100%" }}>
        <MapContainer
          center={center}
          zoom={4}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          className="rounded-lg"
        >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render all transactions */}
        {filteredTransactions.map((transaction, index) => {
          // Customer position
          const customerPos: [number, number] = [transaction.lat, transaction.long];
          
          // Merchant position
          const merchantPos: [number, number] = [
            (transaction as any).merch_lat,
            (transaction as any).merch_long,
          ];

          const isFraud = transaction.is_fraud === 1;
          
          // Calculate fade-out delay based on position (oldest markers fade out first)
          const progressFromEnd = index / filteredTransactions.length;
          const fadeDelay = progressFromEnd * 30; // Max 30 seconds

          return (
            <div 
              key={`transaction-${transaction.trans_num}-${index}`}
              className={index >= filteredTransactions.length - 10 ? "" : "marker-fade-out"}
              style={index >= filteredTransactions.length - 10 ? {} : {
                animation: `fadeOut 30s ease-out forwards`,
                animationDelay: `${fadeDelay}s`,
              }}
            >
              {/* Line connecting customer and merchant */}
              <Polyline
                positions={[customerPos, merchantPos]}
                pathOptions={{
                  color: isFraud ? "#ef4444" : "#22c55e",
                  weight: isFraud ? 4 : 3,
                  opacity: isFraud ? 0.9 : 0.8,
                  dashArray: isFraud ? "8, 8" : "",
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              {/* Customer marker - red if fraud, blue if legitimate */}
              <Marker position={customerPos} icon={isFraud ? customerFraudIcon : customerIcon}>
                <Popup>
                  <div className="text-sm space-y-2">
                    <div>
                      <strong>👤 Customer</strong>
                      <br />
                      📍 {transaction.city}, {transaction.state}
                      <br />
                      💼 {transaction.job}
                      <br />
                      {isFraud && <span className="text-red-600 font-semibold">🚨 FRAUDULENT TRANSACTION</span>}
                    </div>
                    {onSelectTransaction && (
                      <Button
                        onClick={() => onSelectTransaction(transaction)}
                        size="sm"
                        className="w-full"
                        variant="default"
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* Merchant marker (rosso/verde) */}
              <Marker
                position={merchantPos}
                icon={isFraud ? merchantFraudIcon : merchantLegitIcon}
              >
                <Popup>
                  <div className="text-sm space-y-2">
                    <div>
                      <strong>🏪 {transaction.merchant}</strong>
                      <br />
                      📦 {transaction.category}
                      <br />
                      💳 ${transaction.amt.toFixed(2)}
                      <br />
                      🕐 {transaction.trans_time}
                      <br />
                      {isFraud ? (
                        <span className="text-red-600 font-semibold">🚨 FRAUDULENT</span>
                      ) : (
                        <span className="text-green-600 font-semibold">✅ LEGITIMATE</span>
                      )}
                    </div>
                    {onSelectTransaction && (
                      <Button
                        onClick={() => onSelectTransaction(transaction)}
                        size="sm"
                        className="w-full"
                        variant="default"
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg z-[1000]">
        <h3 className="text-sm font-semibold mb-3">Legend</h3>
        <div className="mb-3 pb-3 border-b border-border text-xs text-slate-400">
          <div className="font-semibold text-foreground">Showing {filteredTransactions.length} / {maxMarkers} markers</div>
          <div className="text-xs mt-1">Fade out over 30 seconds</div>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400 border border-white"></div>
            <span>Customer (Legit)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border border-white"></div>
            <span>Merchant (Legit)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-white animate-pulse"></div>
            <span>Customer (Fraud)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-white animate-pulse"></div>
            <span>Merchant (Fraud)</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-red-500"></div>
              <div className="w-1.5 h-1.5 bg-red-500"></div>
              <div className="w-1.5 h-1.5 bg-red-500"></div>
            </div>
            <span>Fraudulent Line</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span>Legitimate Line</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
