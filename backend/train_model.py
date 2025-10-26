#!/usr/bin/env python3

import argparse, csv, json, sqlite3, os, sys
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
import joblib

from features import ensure_schema, insert_tx, tx_to_features, ordered_feature_row, FEATURE_ORDER

def coerce_label(v):
    if v is None or str(v).strip() == "":
        return None
    try:
        return int(float(v))
    except Exception:
        s = str(v).strip().lower()
        if s in ("true", "yes", "y", "t"):
            return 1
        if s in ("false", "no", "n", "f"):
            return 0
    return None

def main():
    ap = argparse.ArgumentParser(description="Fast trainer with 80/20 split on is_fraud")
    ap.add_argument("--input", required=True, help="Pipe-delimited CSV with header")
    ap.add_argument("--db", default="history.db", help="SQLite DB used during feature building")
    ap.add_argument("--output-model", default="model.pkl")
    ap.add_argument("--features", default="features.json", help="Where to save feature order JSON")
    ap.add_argument("--limit", type=int, default=0, help="Optional: cap number of rows for quick runs")
    args = ap.parse_args()

    # Fresh DB for clean, past-only history during feature construction
    if os.path.exists(args.db):
        os.remove(args.db)
    conn = sqlite3.connect(args.db)
    ensure_schema(conn)

    # Load CSV rows
    with open(args.input, "r", encoding="utf-8") as f:
        rdr = csv.DictReader(f, delimiter="|")
        rows = list(rdr)

    # Verify target column exists
    if "is_fraud" not in (rdr.fieldnames or []):
        print("ERROR: Column 'is_fraud' not found in input CSV.", file=sys.stderr)
        sys.exit(1)

    # Sort by time so each row only sees true past
    try:
        rows.sort(key=lambda r: int(float(r.get("unix_time", "0"))))
    except Exception:
        pass

    if args.limit and args.limit > 0:
        rows = rows[:args.limit]

    X_rows = []
    y_rows = []

    # Build features (past-only), then insert current row into DB for future rows
    for i, r in enumerate(rows, 1):
        y = coerce_label(r.get("is_fraud"))
        if y is None:
            # If you want to skip unlabeled rows entirely, continue; otherwise you can still insert them
            # so they count as history for next rows.
            insert_tx(conn, r)
            continue

        feat = tx_to_features(r, conn)
        x = ordered_feature_row(feat, FEATURE_ORDER)

        X_rows.append(x)
        y_rows.append(y)

        # Insert AFTER feature build so it's "past" for later rows
        insert_tx(conn, r)

        if i % 10000 == 0:
            print(f"...processed {i} rows", file=sys.stderr)

    if not X_rows:
        print("No labeled rows found (is_fraud).", file=sys.stderr)
        sys.exit(1)

    X = np.array(X_rows, dtype=float)
    y = np.array(y_rows, dtype=int)

    # 80/20 split, stratified if possible
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )
    except ValueError:
        # In case of single-class or too-few samples, fall back to non-stratified
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42
        )

    # Faster RandomForest (good baseline)
    model = RandomForestClassifier(
        n_estimators=120,      # fewer trees = faster
        max_depth=16,          # constrain depth for speed/generalization
        min_samples_leaf=2,    # small regularization + speed
        n_jobs=-1,
        random_state=42,
        class_weight="balanced_subsample"
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    try:
        y_prob = model.predict_proba(X_test)[:, 1]
    except Exception:
        y_prob = None

    print("=== Evaluation (80/20 on is_fraud) ===")
    print(classification_report(y_test, y_pred, digits=4))

    joblib.dump(model, args.output_model)
    with open(args.features, "w", encoding="utf-8") as f:
        json.dump(FEATURE_ORDER, f, indent=2)

    print(f"Saved model -> {args.output_model}")
    print(f"Saved feature names -> {args.features}")
    print(f"Train size: {len(y_train)} | Test size: {len(y_test)}")

if __name__ == "__main__":
    main()
