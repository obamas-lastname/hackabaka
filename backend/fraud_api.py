#!/usr/bin/env python3
# fraud_api.py — FastAPI service for history-aware fraud predictions

import os
import json
import sqlite3
from typing import Dict, Any, Optional

import joblib
import numpy as np
from fastapi import FastAPI, Query, HTTPException

from features import ensure_schema, insert_tx, tx_to_features, ordered_feature_row, FEATURE_ORDER

DB_PATH = os.environ.get("FRAUD_DB", "../history.db")
MODEL_PATH = os.environ.get("FRAUD_MODEL", "../model.pkl")
FEATURES_PATH = os.environ.get("FRAUD_FEATURES", "features.json")

# >>> THIS must exist at top-level <<<
app = FastAPI(title="Fraud API", version="1.0.2")

# Globals
conn: Optional[sqlite3.Connection] = None
model = None
feature_order = FEATURE_ORDER

@app.on_event("startup")
def startup():
    """Initialize DB and load model on server start."""
    global conn, model, feature_order
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    ensure_schema(conn)

    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(
            f"Model file not found at '{MODEL_PATH}'. Train first, e.g.: "
            f"python train_model.py --input transactions.csv --db {DB_PATH} --output-model {MODEL_PATH}"
        )
    model = joblib.load(MODEL_PATH)

    if os.path.exists(FEATURES_PATH):
        try:
            with open(FEATURES_PATH, "r", encoding="utf-8") as f:
                feature_order = json.load(f)
        except Exception:
            feature_order = FEATURE_ORDER

@app.get("/health")
def health():
    return {
        "ok": True,
        "model_loaded": model is not None,
        "db": DB_PATH,
        "feature_count": len(feature_order),
    }

@app.get("/feature-names")
def feature_names():
    return {"features": feature_order}

@app.post("/predict")
def predict(
    tx: Dict[str, Any],
    store: int = Query(0, description="If 1, store tx in DB after prediction"),
):
    """History-aware prediction endpoint."""
    if model is None or conn is None:
        raise HTTPException(status_code=503, detail="Model or DB not initialized.")

    # Build features (using only past relative to tx['unix_time'])
    feat_map = tx_to_features(tx, conn)
    X = np.array([ordered_feature_row(feat_map, feature_order)], dtype=float)

    # Predict
    is_fraud = int(model.predict(X)[0])
    try:
        proba = float(model.predict_proba(X)[0, 1])
    except Exception:
        proba = None

    # Optionally store this tx as history AFTER prediction
    if store:
        insert_tx(conn, tx)

    return {
        "is_fraud": bool(is_fraud),
        "proba": proba,
        "features": {
            k: float(feat_map.get(k, 0.0) if feat_map.get(k) is not None else 0.0)
            for k in feature_order
        },
    }
