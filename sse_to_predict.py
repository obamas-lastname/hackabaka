#!/usr/bin/env python3
"""
sse_to_predict.py — Final version

For each transaction from the hackathon stream:
  • Calls local FastAPI predictor (/predict?store=1)
  • Maps probability to flag_value (>= THRESHOLD → 1)
  • Sends to FLAG_URL (tries JSON first, fallback to form)
  • Prints *full response* (HTTP status + body + parsed JSON if possible)
  • Retries with exponential backoff on network/5xx errors
"""

import os
import json
import time
import threading
import urllib3
import requests
from sseclient import SSEClient
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
import os

load_dotenv()

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# =========================
# Config
# =========================
API_KEY = os.getenv("API_KEY")

STREAM_URL = "https://95.217.75.14:8443/stream"
FLAG_URL = "https://95.217.75.14:8443/api/flag"
LOCAL_PREDICT_URL = os.getenv("FASTAPI_URL")

VERIFY_TLS = False
CONNECT_TIMEOUT = 5
READ_TIMEOUT = None
REQ_TIMEOUT = 10

MAX_WORKERS = 4
THRESHOLD = 0.5
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

def pretty(o):
    try:
        return json.dumps(o, indent=2, sort_keys=True, ensure_ascii=False)
    except Exception:
        return str(o)

# -------------------------
# Helpers
# -------------------------
def predict_local(tx: dict) -> dict:
    """Call local FastAPI predictor."""
    r = requests.post(LOCAL_PREDICT_URL, json=tx, timeout=REQ_TIMEOUT)
    r.raise_for_status()
    return r.json()

def decide_flag(is_fraud_pred: bool, proba):
    """Decide whether to flag based on threshold."""
    if proba is not None:
        try:
            p = float(proba)
            return 1 if p >= THRESHOLD else 0
        except Exception:
            pass
    return 1 if is_fraud_pred else 0

def post_flag(trans_num: str, flag_value: int, retries=3):
    """
    Send flag to server, show full response.
    Tries JSON first, then form encoding if JSON not accepted.
    """
    payload = {"trans_num": trans_num, "flag_value": int(flag_value)}
    for attempt in range(1, retries + 1):
        try:
            # Try JSON first
            resp = requests.post(
                FLAG_URL,
                headers=flag_headers_json,
                json=payload,
                verify=VERIFY_TLS,
                timeout=REQ_TIMEOUT,
            )
            if resp.status_code in (400, 415):
                # Some servers only accept form data
                resp = requests.post(
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
                j = resp.json()
                print(pretty(j))
            except Exception:
                pass
            print("-------------------------------------")

            if 200 <= resp.status_code < 300:
                return resp
            else:
                print(f"[WARN] Non-200 status ({resp.status_code}) — retrying {attempt}/{retries}")
                time.sleep(1.5 * attempt)
        except Exception as e:
            print(f"[ERROR] Flagging {trans_num}: {e} (attempt {attempt}/{retries})")
            time.sleep(1.5 * attempt)
    print(f"[FAIL] Giving up on {trans_num}")
    return None

# -------------------------
# Worker
# -------------------------
def process_transaction(tx: dict):
    trans_num = tx.get("trans_num")
    if not trans_num:
        print("[WARN] Missing trans_num; skipping.")
        return

    # Deduplicate
    with _seen_lock:
        if trans_num in _seen:
            print(f"[SKIP] Already processed {trans_num}")
            return
        _seen.add(trans_num)

    try:
        amt = float(tx.get("amt", 0))
    except Exception:
        amt = 0.0
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

    # Send flag and show response
    post_flag(trans_num, flag_value)
    print("-" * 80)

# -------------------------
# Streaming loop
# -------------------------
def run_stream():
    backoff = 1.0
    while True:
        try:
            print("Connecting to stream...")
            resp = requests.get(
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

# -------------------------
if __name__ == "__main__":
    run_stream()
