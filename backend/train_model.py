#!/usr/bin/env python3
import argparse, csv, json, os, sys
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
import joblib

from features import (
    build_history, add_to_history,
    tx_to_features_mem, ordered_feature_row, FEATURE_ORDER,
)

def coerce_label(v):
    if v is None or str(v).strip() == "":
        return None
    try:
        return int(float(v))
    except Exception:
        s = str(v).strip().lower()
        if s in ("true", "yes", "y", "t"): return 1
        if s in ("false", "no", "n", "f"): return 0
    return None

def main():
    ap = argparse.ArgumentParser(description="Fast in-memory model trainer")
    ap.add_argument("--input", required=True, help="Pipe-delimited CSV with header")
    ap.add_argument("--db", default="history.db", help="(ignored, kept for compatibility)")
    ap.add_argument("--output-model", default="model.pkl")
    ap.add_argument("--features", default="features.json")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    # Ignore --db but print note for clarity
    if os.path.exists(args.db):
        print(f"[INFO] Ignoring SQLite DB '{args.db}' (in-memory mode)", file=sys.stderr)

    # Load input
    with open(args.input, "r", encoding="utf-8") as f:
        rdr = csv.DictReader(f, delimiter="|")
        rows = list(rdr)

    if "is_fraud" not in (rdr.fieldnames or []):
        print("ERROR: Column 'is_fraud' not found in input CSV.", file=sys.stderr)
        sys.exit(1)

    # Sort chronologically so each row only sees past data
    rows.sort(key=lambda r: int(float(r.get("unix_time", "0"))) if r.get("unix_time") else 0)
    if args.limit > 0:
        rows = rows[:args.limit]

    history = build_history()
    X_rows, y_rows = [], []

    for i, r in enumerate(rows, 1):
        y = coerce_label(r.get("is_fraud"))
        if y is not None:
            feat = tx_to_features_mem(r, history)
            X_rows.append(ordered_feature_row(feat, FEATURE_ORDER))
            y_rows.append(y)
        add_to_history(history, r)
        if i % 10000 == 0:
            print(f"...processed {i}", file=sys.stderr)

    if not X_rows:
        print("No labeled rows found.", file=sys.stderr)
        sys.exit(1)

    X = np.array(X_rows, dtype=float)
    y = np.array(y_rows, dtype=int)

    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)

    model = RandomForestClassifier(
        n_estimators=360,        
        max_depth=48,         
        min_samples_leaf=2,        
        max_features="sqrt",       
        n_jobs=-1,                
        random_state=42,
        class_weight="balanced_subsample", 
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("=== Evaluation (80/20 split) ===")
    print(classification_report(y_test, y_pred, digits=4))

    joblib.dump(model, args.output_model)
    with open(args.features, "w", encoding="utf-8") as f:
        json.dump(FEATURE_ORDER, f, indent=2)

    print(f"Saved model -> {args.output_model}")
    print(f"Saved feature names -> {args.features}")
    print(f"Train size: {len(y_train)} | Test size: {len(y_test)}")

if __name__ == "__main__":
    main()
