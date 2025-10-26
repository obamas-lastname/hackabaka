"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Transaction } from "./transaction-table";

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom icons for transaction detail
const customerIcon = new L.DivIcon({
  className: "custom-icon customer-icon",
  html: `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="2"/>
    </svg>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const merchantLegitIcon = new L.DivIcon({
  className: "custom-icon merchant-legit-icon",
  html: `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <circle cx="12" cy="12" r="10" fill="#22c55e" stroke="white" stroke-width="2"/>
    </svg>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const fraudIcon = new L.DivIcon({
  className: "custom-icon fraud-icon",
  html: `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">
      <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
    </svg>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface TransactionMapProps {
  transaction: Transaction;
  height?: string;
}

export function TransactionMap({ transaction, height = "h-80" }: TransactionMapProps) {
  const customerPos: [number, number] = [transaction.lat, transaction.long];
  const merchantPos: [number, number] = [
    (transaction as any).merch_lat,
    (transaction as any).merch_long,
  ];

  // Calculate center between customer and merchant
  const centerLat = (customerPos[0] + merchantPos[0]) / 2;
  const centerLon = (customerPos[1] + merchantPos[1]) / 2;
  const center: [number, number] = [centerLat, centerLon];

  const isFraud = transaction.is_fraud === 1;

  return (
    <div className={`relative ${height} rounded-lg overflow-hidden border border-slate-700`}>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={8}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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

        {/* Customer marker */}
        <Marker position={customerPos} icon={customerIcon}>
          <Popup>
            <div className="text-sm">
              <strong>👤 Customer</strong>
              <br />
              📍 {transaction.city}, {transaction.state}
              <br />
              💼 {transaction.job}
            </div>
          </Popup>
        </Marker>

        {/* Merchant marker */}
        <Marker
          position={merchantPos}
          icon={isFraud ? fraudIcon : merchantLegitIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>🏪 {transaction.merchant}</strong>
              <br />
              📦 {transaction.category}
              <br />
              💳 ${transaction.amt.toFixed(2)}
              <br />
              {isFraud ? (
                <span className="text-red-600 font-semibold">🚨 FRAUDULENT</span>
              ) : (
                <span className="text-green-600 font-semibold">✅ LEGITIMATE</span>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
