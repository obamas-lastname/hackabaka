#!/usr/bin/env python3
"""
sse_to_predict.py — Final version (Frontend + Backend Integration)

For each transaction:
  1. Reads from hackathon stream
  2. Predicts fraud locally via FastAPI (/predict?store=1)
  3. Flags to hackathon FLAG_URL
  4. Also POSTs full transaction (with model results) to your Next.js frontend

Frontend URL: http://localhost:3000/api/transactions
"""

import os
import json
import time
import threading
import urllib3
import requests
from sseclient import SSEClient
from concurrent.futures import ThreadPoolExecutor

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ============================================================
# CONFIGURATION
# ============================================================

API_KEY = "85693b078643664d7ed495788f867daccc4121df8a7a71958647a64be942df47"

STREAM_URL = "https://95.217.75.14:8443/stream"
FLAG_URL = "https://95.217.75.14:8443/api/flag"
LOCAL_PREDICT_URL = "http://127.0.0.1:8000/predict?store=1"
FRONTEND_POST_URL = "https://hackabaka.vercel.app/api/stream"

VERIFY_TLS = False
CONNECT_TIMEOUT = 5
READ_TIMEOUT = None
REQ_TIMEOUT = 10
MAX_WORKERS = 4
THRESHOLD = 0.35  # lower threshold → higher recall
PRINT_FEATURES = False

stream_headers = {
    "X-API-Key": API_KEY,
    "Accept": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
}
flag_headers_json = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json",
}
flag_headers_form = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json",
}

_seen = set()
_seen_lock = threading.Lock()

# Reuse sessions for efficiency
sess_stream = requests.Session()
sess_flag = requests.Session()
sess_predict = requests.Session()
sess_frontend = requests.Session()

# ============================================================
# HELPERS
# ============================================================

def pretty(o):
    try:
        return json.dumps(o, indent=2, sort_keys=True, ensure_ascii=False)
    except Exception:
        return str(o)

def predict_local(tx: dict) -> dict:
    """Call local FastAPI predictor."""
    r = sess_predict.post(LOCAL_PREDICT_URL, json=tx, timeout=REQ_TIMEOUT)
    r.raise_for_status()
    return r.json()

def decide_flag(is_fraud_pred: bool, proba):
    """Decide whether to flag based on threshold."""
    if proba is not None:
        try:
            return 1 if float(proba) >= THRESHOLD else 0
        except Exception:
            pass
    return 1 if is_fraud_pred else 0

def post_flag(trans_num: str, flag_value: int, retries=3):
    """Send flag to hackathon API and print response."""
    payload = {"trans_num": trans_num, "flag_value": int(flag_value)}
    for attempt in range(1, retries + 1):
        try:
            resp = sess_flag.post(
                FLAG_URL,
                headers=flag_headers_json,
                json=payload,
                verify=VERIFY_TLS,
                timeout=REQ_TIMEOUT,
            )
            if resp.status_code in (400, 415):
                resp = sess_flag.post(
                    FLAG_URL,
                    headers=flag_headers_form,
                    data=payload,
                    verify=VERIFY_TLS,
                    timeout=REQ_TIMEOUT,
                )

            print(f"--- FLAG Response for {trans_num} ---")
            print(f"HTTP {resp.status_code}")
            print(resp.text.strip())
            try:
                print(pretty(resp.json()))
            except Exception:
                pass
            print("-------------------------------------")

            if 200 <= resp.status_code < 300:
                return resp
            else:
                print(f"[WARN] Non-200 ({resp.status_code}), retrying {attempt}/{retries}")
                time.sleep(1.5 * attempt)
        except Exception as e:
            print(f"[ERROR] Flagging {trans_num}: {e} (attempt {attempt}/{retries})")
            time.sleep(1.5 * attempt)
    print(f"[FAIL] Giving up on {trans_num}")
    return None

def post_frontend_transaction(tx: dict, verdict: dict, flag_value: int):
    """
    Send full transaction (with model verdict) to your Next.js frontend.
    """
    enriched = dict(tx)
    enriched["fraud"] = int(flag_value)
    enriched["is_fraud"] = int(flag_value)
    enriched["model_is_fraud_pred"] = bool(verdict.get("is_fraud", False))
    enriched["model_proba"] = verdict.get("proba", None)
    enriched["model_threshold"] = THRESHOLD
    enriched["source"] = "hackathon-stream"

    payload = {"transaction": enriched}

    try:
        resp = sess_frontend.post(FRONTEND_POST_URL, json=payload, timeout=REQ_TIMEOUT)
        print(f"--- FRONTEND POST for {tx.get('trans_num')} ---")
        print(f"HTTP {resp.status_code}")
        print(resp.text.strip())
        print("-----------------------------------------------")
        return resp
    except Exception as e:
        print(f"[FRONTEND] Error posting to {FRONTEND_POST_URL}: {e}")
        return None

# ============================================================
# MAIN WORKER
# ============================================================

def process_transaction(tx: dict):
    trans_num = tx.get("trans_num")
    if not trans_num:
        print("[WARN] Missing trans_num; skipping.")
        return

    with _seen_lock:
        if trans_num in _seen:
            print(f"[SKIP] Already processed {trans_num}")
            return
        _seen.add(trans_num)

    amt = float(tx.get("amt", 0) or 0)
    category = tx.get("category")
    merchant = tx.get("merchant")
    print(f"→ TX {trans_num}: ${amt:.2f} | {category} | {merchant}")

    # Predict
    try:
        verdict = predict_local(tx)
    except Exception as e:
        print(f"[PREDICT] Error for {trans_num}: {e}")
        return

    is_fraud_pred = bool(verdict.get("is_fraud", False))
    proba = verdict.get("proba", None)

    if PRINT_FEATURES:
        print("Features:", pretty(verdict.get("features", {})))

    flag_value = decide_flag(is_fraud_pred, proba)
    print(f"   Model: is_fraud={is_fraud_pred}  proba={proba}  → flag_value={flag_value}")

    # 1. Send flag to hackathon backend
    post_flag(trans_num, flag_value)

    # 2. Send enriched transaction to local frontend
    post_frontend_transaction(tx, verdict, flag_value)

    print("-" * 80)

# ============================================================
# STREAM LOOP
# ============================================================

def run_stream():
    backoff = 1.0
    while True:
        try:
            print("Connecting to stream...")
            resp = sess_stream.get(
                STREAM_URL,
                headers=stream_headers,
                stream=True,
                verify=VERIFY_TLS,
                timeout=(CONNECT_TIMEOUT, READ_TIMEOUT),
            )
            resp.raise_for_status()
            client = SSEClient(resp)
            print("Connected. Waiting for transactions...\n")

            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
                for event in client.events():
                    if not event or not getattr(event, "data", None):
                        continue
                    try:
                        tx = json.loads(event.data)
                    except json.JSONDecodeError as e:
                        print(f"[STREAM] JSON parse error: {e}")
                        continue

                    trans_num = tx.get("trans_num", "<unknown>")
                    print(f"Event: {trans_num}")
                    pool.submit(process_transaction, tx)
        except KeyboardInterrupt:
            print("\nStopped by user.")
            return
        except requests.exceptions.RequestException as e:
            print(f"[STREAM] Connection error: {e}. Reconnecting in {backoff:.1f}s...")
            time.sleep(backoff)
            backoff = min(backoff * 2, 15)
        except Exception as e:
            print(f"[STREAM] Unexpected error: {e}. Reconnecting in {backoff:.1f}s...")
            time.sleep(backoff)
            backoff = min(backoff * 2, 15)

# ============================================================
# ENTRYPOINT
# ============================================================

if __name__ == "__main__":
    print(f"Frontend POST URL: {FRONTEND_POST_URL}")
    print(f"FastAPI predictor: {LOCAL_PREDICT_URL}")
    run_stream()
