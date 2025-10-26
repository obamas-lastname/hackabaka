import math
from typing import Dict, Any, List, Optional
from dateutil import parser as dtparser
from collections import defaultdict
import bisect
import numpy as np

# =======
# HELPERS
# =======

def to_float(x) -> Optional[float]:
    try:
        if x is None or x == "":
            return None
        return float(x)
    except Exception:
        return None

def to_int(x) -> Optional[int]:
    try:
        if x is None or x == "":
            return None
        return int(float(x))
    except Exception:
        return None

def parse_date(s: str):
    try:
        return dtparser.parse(s)
    except Exception:
        return None

def compute_age(dob: str, at_unix: int) -> int:
    try:
        dob_dt = dtparser.parse(dob)
        from datetime import datetime, timezone
        t = datetime.fromtimestamp(int(at_unix), tz=timezone.utc)
        years = t.year - dob_dt.year - ((t.month, t.day) < (dob_dt.month, dob_dt.day))
        return max(0, years)
    except Exception:
        return -1

def haversine_km(lat1, lon1, lat2, lon2) -> float:
    try:
        R = 6371.0
        phi1 = math.radians(float(lat1)); phi2 = math.radians(float(lat2))
        dphi = math.radians(float(lat2) - float(lat1))
        dlmb = math.radians(float(lon2) - float(lon1))
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlmb/2)**2
        return 2 * R * math.asin(math.sqrt(a))
    except Exception:
        return float("nan")

def hour_of_day(trans_time: str) -> int:
    try:
        return max(0, min(23, int(trans_time[0:2])))
    except Exception:
        return -1

def dow_from_date(trans_date: str) -> int:
    try:
        return dtparser.parse(trans_date).weekday()
    except Exception:
        return -1

def is_night_time(h: int) -> int:
    return 1 if (0 <= h <= 6 or h >= 22) else 0

def safe_str(x) -> str:
    return "" if x is None else str(x)

# ==================
# IN-MEMORY HISTORY
# ==================

def build_history():
    return defaultdict(list)

def add_to_history(history, tx, counter=[0]):
    """
    Adds a transaction to history. counter is a tie-breaker to prevent bisect
    from trying to compare dicts when timestamps are equal.
    """
    cc = safe_str(tx.get("cc_num"))
    t = to_int(tx.get("unix_time")) or 0
    counter[0] += 1
    bisect.insort(history[cc], (t, counter[0], tx))

def get_recent(history, cc, before_unix, window_secs):
    lo = before_unix - window_secs
    return [tx for t, _, tx in history.get(cc, []) if lo <= t < before_unix]

def get_last(history, cc, before_unix):
    h = history.get(cc, [])
    for t, _, tx in reversed(h):
        if t < before_unix:
            return tx
    return None

def has_seen_merchant(history, cc, merchant, before_unix):
    h = history.get(cc, [])
    for t, _, tx in reversed(h):
        if t < before_unix and safe_str(tx.get("merchant")) == merchant:
            return 1
    return 0

def distinct_merchants(history, cc, before_unix, window_secs):
    lo = before_unix - window_secs
    return len({safe_str(tx.get("merchant")) for t, _, tx in history.get(cc, []) if lo <= t < before_unix})

def distinct_categories(history, cc, before_unix, window_secs):
    lo = before_unix - window_secs
    return len({safe_str(tx.get("category")) for t, _, tx in history.get(cc, []) if lo <= t < before_unix})

def user_amount_stats(history, cc, before_unix, window_secs):
    lo = before_unix - window_secs
    vals = [to_float(tx.get("amt")) for t, _, tx in history.get(cc, []) if lo <= t < before_unix]
    vals = [v for v in vals if v is not None]
    if not vals:
        return 0.0, 0.0
    arr = np.array(vals)
    return float(np.mean(arr)), float(np.std(arr))

# ==================
# FEATURE EXTRACTION
# ==================

FEATURE_ORDER = [
    "age", "log_amt", "hour", "dow", "is_night",
    "city_pop", "lat", "long", "merch_lat", "merch_long",
    "velocity_60s", "velocity_5m", "velocity_15m", "velocity_1h",
    "unique_merchants_15m", "unique_categories_15m",
    "seen_merchant_before", "user_merchant_dist_km",
    "time_since_last_s", "time_since_last_merchant_s",
    "user_mean_amt_24h", "user_std_amt_24h", "user_amt_delta", "amt_z_user",
    "gender_M", "gender_F",
]

def tx_to_features_mem(tx: Dict[str, Any], history) -> Dict[str, float]:
    ux = to_int(tx.get("unix_time")) or 0
    amt = to_float(tx.get("amt")) or 0.0
    lat = to_float(tx.get("lat"))
    lon = to_float(tx.get("long"))
    mlat = to_float(tx.get("merch_lat"))
    mlon = to_float(tx.get("merch_long"))
    cc = safe_str(tx.get("cc_num"))
    merchant = safe_str(tx.get("merchant"))

    age = compute_age(safe_str(tx.get("dob")), ux)
    hour = hour_of_day(safe_str(tx.get("trans_time")))
    dow = dow_from_date(safe_str(tx.get("trans_date")))
    is_night = is_night_time(hour)
    city_pop = to_int(tx.get("city_pop")) or 0

    v60  = len(get_recent(history, cc, ux, 60))
    v5m  = len(get_recent(history, cc, ux, 5*60))
    v15m = len(get_recent(history, cc, ux, 15*60))
    v1h  = len(get_recent(history, cc, ux, 60*60))

    last = get_last(history, cc, ux)
    if last:
        last_time = to_int(last.get("unix_time")) or 0
        time_since_last = max(0, ux - last_time)
        last_lat = to_float(last.get("lat"))
        last_lon = to_float(last.get("long"))
        last_mlat = to_float(last.get("merch_lat"))
        last_mlon = to_float(last.get("merch_long"))
        dist_km = haversine_km(last_mlat or last_lat, last_mlon or last_lon, mlat or lat, mlon or lon)
        # time since last same merchant
        time_since_last_merchant = 10**9
        for t, _, tx2 in reversed(history.get(cc, [])):
            if t < ux and safe_str(tx2.get("merchant")) == merchant:
                time_since_last_merchant = max(0, ux - t)
                break
    else:
        time_since_last = 10**9
        dist_km = float("nan")
        time_since_last_merchant = 10**9

    seen_before = has_seen_merchant(history, cc, merchant, ux)
    uniq_merch_15 = distinct_merchants(history, cc, ux, 15*60)
    uniq_cat_15 = distinct_categories(history, cc, ux, 15*60)
    mean24, std24 = user_amount_stats(history, cc, ux, 24*60*60)
    amt_delta = amt - mean24
    z = amt_delta / std24 if std24 > 0 else 0.0

    gender = safe_str(tx.get("gender")).upper()
    gM = 1 if gender == "M" else 0
    gF = 1 if gender == "F" else 0
    log_amt = math.log1p(amt)
    user_merchant_dist_km = haversine_km(lat, lon, mlat, mlon) if None not in (lat, lon, mlat, mlon) else 0.0

    return {
        "age": age, "log_amt": log_amt, "hour": hour, "dow": dow, "is_night": is_night,
        "city_pop": city_pop, "lat": lat or 0.0, "long": lon or 0.0,
        "merch_lat": mlat or 0.0, "merch_long": mlon or 0.0,
        "velocity_60s": v60, "velocity_5m": v5m, "velocity_15m": v15m, "velocity_1h": v1h,
        "unique_merchants_15m": uniq_merch_15, "unique_categories_15m": uniq_cat_15,
        "seen_merchant_before": seen_before,
        "user_merchant_dist_km": user_merchant_dist_km,
        "time_since_last_s": time_since_last,
        "time_since_last_merchant_s": time_since_last_merchant,
        "user_mean_amt_24h": mean24, "user_std_amt_24h": std24,
        "user_amt_delta": amt_delta, "amt_z_user": z,
        "gender_M": gM, "gender_F": gF,
    }

def ordered_feature_row(feat: Dict[str, float], order: List[str]) -> List[float]:
    return [float(feat.get(name, 0.0) or 0.0) for name in order]
