import { NextRequest, NextResponse } from "next/server";

let transactionQueue: any[] = [];
let activeConnections: Set<ReadableStreamDefaultController<Uint8Array>> = new Set();

export async function GET(request: NextRequest) {
  // Create a readable stream for Server-Sent Events
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    start(controller) {
      try {
        activeConnections.add(controller);

        while (transactionQueue.length > 0) {
          const tx = transactionQueue.shift();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(tx)}\n\n`)
          );
        }

        // Clean up when connection closes
        request.signal.addEventListener("abort", () => {
          activeConnections.delete(controller);
          controller.close();
        });
      } catch (error) {
        console.error("Stream error:", error);
        activeConnections.delete(controller);
        controller.close();
      }
    },
  });

  return new NextResponse(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    let payload = await request.json();

    // Handle wrapped transaction object
    if (payload.transaction && typeof payload.transaction === 'object') {
      payload = payload.transaction;
    }

    // Generate missing fields with defaults
    // Handle fraud field - can be boolean, number, or string
    let fraudValue = 0;
    if (payload.fraud !== undefined && payload.fraud !== null) {
      if (typeof payload.fraud === 'boolean') {
        fraudValue = payload.fraud ? 1 : 0;
      } else if (typeof payload.fraud === 'string') {
        fraudValue = payload.fraud.toLowerCase() === 'true' ? 1 : 0;
      } else {
        fraudValue = payload.fraud ? 1 : 0;
      }
    } else if (payload.is_fraud !== undefined && payload.is_fraud !== null) {
      fraudValue = payload.is_fraud ? 1 : 0;
    }

    const transaction = {
      transaction_id: payload.transaction_id || `TXN-${Date.now()}`,
      ssn: payload.ssn || 'XXX-XX-XXXX',
      cc_num: payload.cc_num || 'XXXX-XXXX-XXXX-XXXX',
      first: payload.first || 'Unknown',
      last: payload.last || 'Unknown',
      gender: payload.gender || 'U',
      street: payload.street || '',
      city: payload.city || 'Unknown',
      state: payload.state || 'XX',
      zip: payload.zip || '00000',
      lat: typeof payload.lat === 'string' ? parseFloat(payload.lat) : (payload.lat || 40.7128),
      long: typeof payload.long === 'string' ? parseFloat(payload.long) : (payload.long || -74.0060),
      city_pop: typeof payload.city_pop === 'string' ? parseInt(payload.city_pop) : (payload.city_pop || 0),
      job: payload.job || 'Unknown',
      dob: payload.dob || '1990-01-01',
      acct_num: payload.acct_num || '',
      trans_num: payload.trans_num || `TRANS-${Date.now()}`,
      trans_date: payload.trans_date || new Date().toISOString().split('T')[0],
      trans_time: payload.trans_time || new Date().toISOString().split('T')[1].substring(0, 8),
      unix_time: typeof payload.unix_time === 'string' ? parseInt(payload.unix_time) : (payload.unix_time || Math.floor(Date.now() / 1000)),
      category: payload.category || 'misc',
      amt: typeof payload.amt === 'string' ? parseFloat(payload.amt) : (payload.amt || 0),
      merchant: payload.merchant || 'Unknown Merchant',
      merch_lat: typeof payload.merch_lat === 'string' ? parseFloat(payload.merch_lat) : (payload.merch_lat || 40.7128),
      merch_long: typeof payload.merch_long === 'string' ? parseFloat(payload.merch_long) : (payload.merch_long || -74.0060),
      is_fraud: fraudValue,
    };

    // Add transaction to queue
    transactionQueue.push(transaction);

    // Broadcast to all active connections
    const encoder = new TextEncoder();
    activeConnections.forEach((controller) => {
      try {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(transaction)}\n\n`)
        );
      } catch (error) {
        console.error("Error broadcasting to connection:", error);
        activeConnections.delete(controller);
      }
    });

    return NextResponse.json(
      { success: true, message: "Transaction received and broadcasted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing transaction:", error);
    return NextResponse.json(
      { success: false, error: "Invalid transaction data" },
      { status: 400 }
    );
  }
}
