import math
import sqlite3
from typing import Dict, Any, List, Tuple, Optional
from dateutil import parser as dtparser

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
    # trans_time like "09:50:10"
    try:
        h = int(trans_time[0:2])
        return max(0, min(23, h))
    except Exception:
        return -1

def dow_from_date(trans_date: str) -> int:
    # 0=Mon .. 6=Sun
    try:
        d = dtparser.parse(trans_date)
        return int(d.weekday())
    except Exception:
        return -1

def is_night_time(h: int) -> int:
    if h < 0: return 0
    return 1 if (h <= 6 or h >= 22) else 0

def safe_str(x) -> str:
    return "" if x is None else str(x)

# ===========
# DATABASE IO
# ===========

def ensure_schema(conn: sqlite3.Connection):
    with conn:
        conn.executescript(open("schema.sql", "r", encoding="utf-8").read())

def insert_tx(conn: sqlite3.Connection, tx: Dict[str, Any]):
    q = """
    INSERT OR IGNORE INTO tx (
      transaction_id, unix_time, trans_date, trans_time,
      ssn, cc_num, acct_num, first, last, gender, street, city, state, zip,
      lat, long, city_pop, job, dob,
      category, amt, merchant, merch_lat, merch_long
    ) VALUES (?,?,?,?, ?,?,?,?, ?,?,?,?, ?,?, ?,?,?,?, ?,?,?, ?,?,?)
    """
    params = (
        safe_str(tx.get("transaction_id")),
        to_int(tx.get("unix_time")) or 0,
        safe_str(tx.get("trans_date")),
        safe_str(tx.get("trans_time")),
        safe_str(tx.get("ssn")),
        safe_str(tx.get("cc_num")),
        safe_str(tx.get("acct_num")),
        safe_str(tx.get("first")),
        safe_str(tx.get("last")),
        safe_str(tx.get("gender")),
        safe_str(tx.get("street")),
        safe_str(tx.get("city")),
        safe_str(tx.get("state")),
        safe_str(tx.get("zip")),
        to_float(tx.get("lat")),
        to_float(tx.get("long")),
        to_int(tx.get("city_pop")),
        safe_str(tx.get("job")),
        safe_str(tx.get("dob")),
        safe_str(tx.get("category")),
        to_float(tx.get("amt")),
        safe_str(tx.get("merchant")),
        to_float(tx.get("merch_lat")),
        to_float(tx.get("merch_long")),
    )
    with conn:
        conn.execute(q, params)

def fetch_recent_by_cc(conn: sqlite3.Connection, cc_num: str, before_unix: int, window_secs: int) -> List[Tuple]:
    # returns rows in the window [before_unix - window_secs, before_unix)
    q = """
    SELECT unix_time, amt, lat, long, merch_lat, merch_long, merchant
    FROM tx
    WHERE cc_num = ? AND unix_time >= ? AND unix_time < ?
    ORDER BY unix_time DESC
    """
    cur = conn.execute(q, (safe_str(cc_num), int(before_unix) - int(window_secs), int(before_unix)))
    return list(cur.fetchall())

def fetch_last_by_cc(conn: sqlite3.Connection, cc_num: str, before_unix: int) -> Optional[Tuple]:
    q = """
    SELECT unix_time, amt, lat, long, merch_lat, merch_long, merchant
    FROM tx
    WHERE cc_num = ? AND unix_time < ?
    ORDER BY unix_time DESC
    LIMIT 1
    """
    cur = conn.execute(q, (safe_str(cc_num), int(before_unix)))
    return cur.fetchone()

def has_seen_merchant(conn: sqlite3.Connection, cc_num: str, merchant: str, before_unix: int) -> int:
    q = """
    SELECT 1 FROM tx
    WHERE cc_num=? AND merchant=? AND unix_time < ?
    LIMIT 1
    """
    cur = conn.execute(q, (safe_str(cc_num), safe_str(merchant), int(before_unix)))
    return 1 if cur.fetchone() else 0

def distinct_merchants_in_window(conn: sqlite3.Connection, cc_num: str, before_unix: int, window_secs: int) -> int:
    q = """
    SELECT COUNT(DISTINCT merchant) FROM tx
    WHERE cc_num=? AND unix_time >= ? AND unix_time < ?
    """
    cur = conn.execute(q, (safe_str(cc_num), int(before_unix) - int(window_secs), int(before_unix)))
    row = cur.fetchone()
    return int(row[0] or 0)

def distinct_categories_in_window(conn: sqlite3.Connection, cc_num: str, before_unix: int, window_secs: int) -> int:
    q = """
    SELECT COUNT(DISTINCT category) FROM tx
    WHERE cc_num=? AND unix_time >= ? AND unix_time < ?
    """
    cur = conn.execute(q, (safe_str(cc_num), int(before_unix) - int(window_secs), int(before_unix)))
    row = cur.fetchone()
    return int(row[0] or 0)

def user_amount_stats(conn: sqlite3.Connection, cc_num: str, before_unix: int, window_secs: int) -> Tuple[float, float]:
    q = """
    SELECT amt FROM tx
    WHERE cc_num=? AND unix_time >= ? AND unix_time < ?
    """
    vals = [to_float(r[0]) for r in conn.execute(q, (safe_str(cc_num), int(before_unix) - int(window_secs), int(before_unix)))]
    vals = [v for v in vals if v is not None]
    if not vals:
        return 0.0, 0.0
    import statistics as S
    mean = S.fmean(vals)
    std = 0.0
    try:
        std = S.pstdev(vals)
    except Exception:
        std = 0.0
    return mean, std

# ==================
# FEATURE EXTRACTION
# ==================

FEATURE_ORDER = [
    # raw-ish numeric
    "age", "log_amt", "hour", "dow", "is_night",
    "city_pop", "lat", "long", "merch_lat", "merch_long",
    # context
    "velocity_60s", "velocity_5m", "velocity_15m", "velocity_1h",
    "unique_merchants_15m", "unique_categories_15m",
    "seen_merchant_before", "user_merchant_dist_km",
    "time_since_last_s", "time_since_last_merchant_s",
    # user amount profile
    "user_mean_amt_24h", "user_std_amt_24h", "user_amt_delta", "amt_z_user",
    # gender (simple encoding)
    "gender_M", "gender_F",
]

def tx_to_features(tx: Dict[str, Any], conn: sqlite3.Connection) -> Dict[str, float]:
    """
    Convert one tx dict into a dict of model features.
    Uses DB conn for history-aware features (only past relative to tx['unix_time']).
    """
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

    # velocities
    v60  = len(fetch_recent_by_cc(conn, cc, ux, 60))
    v5m  = len(fetch_recent_by_cc(conn, cc, ux, 5*60))
    v15m = len(fetch_recent_by_cc(conn, cc, ux, 15*60))
    v1h  = len(fetch_recent_by_cc(conn, cc, ux, 60*60))

    # last tx deltas
    last = fetch_last_by_cc(conn, cc, ux)
    if last:
        last_time, last_amt, last_lat, last_lon, last_mlat, last_mlon, last_merch = last
        time_since_last = max(0, ux - int(last_time))
        dist_km = haversine_km(last_mlat if last_mlat is not None else last_lat,
                               last_mlon if last_mlon is not None else last_lon,
                               mlat if mlat is not None else lat,
                               mlon if mlon is not None else lon)
        # last by same merchant
        # time since last same merchant:
        q = """
        SELECT unix_time FROM tx
        WHERE cc_num=? AND merchant=? AND unix_time < ?
        ORDER BY unix_time DESC LIMIT 1
        """
        row = conn.execute(q, (cc, merchant, ux)).fetchone()
        time_since_last_merchant = max(0, ux - int(row[0])) if row else 10**9
    else:
        time_since_last = 10**9
        dist_km = float("nan")
        time_since_last_merchant = 10**9

    seen_before = has_seen_merchant(conn, cc, merchant, ux)
    uniq_merch_15 = distinct_merchants_in_window(conn, cc, ux, 15*60)
    uniq_cat_15 = distinct_categories_in_window(conn, cc, ux, 15*60)

    mean24, std24 = user_amount_stats(conn, cc, ux, 24*60*60)
    amt_delta = amt - mean24
    z = 0.0
    if std24 and std24 > 0:
        z = amt_delta / std24

    gender = safe_str(tx.get("gender")).upper()
    gM = 1 if gender == "M" else 0
    gF = 1 if gender == "F" else 0

    import math as _m
    log_amt = _m.log1p(amt)

    # if both merchant and user coordinates exist, compute user_merchant_dist_km now
    user_merchant_dist_km = haversine_km(lat, lon, mlat, mlon) if None not in (lat, lon, mlat, mlon) else float("nan")

    feat = {
        "age": age,
        "log_amt": log_amt,
        "hour": hour,
        "dow": dow,
        "is_night": is_night,
        "city_pop": city_pop,
        "lat": lat or 0.0,
        "long": lon or 0.0,
        "merch_lat": mlat or 0.0,
        "merch_long": mlon or 0.0,
        "velocity_60s": v60,
        "velocity_5m": v5m,
        "velocity_15m": v15m,
        "velocity_1h": v1h,
        "unique_merchants_15m": uniq_merch_15,
        "unique_categories_15m": uniq_cat_15,
        "seen_merchant_before": seen_before,
        "user_merchant_dist_km": user_merchant_dist_km if not math.isnan(user_merchant_dist_km) else 0.0,
        "time_since_last_s": time_since_last,
        "time_since_last_merchant_s": time_since_last_merchant,
        "user_mean_amt_24h": mean24,
        "user_std_amt_24h": std24,
        "user_amt_delta": amt_delta,
        "amt_z_user": z,
        "gender_M": gM,
        "gender_F": gF,
    }
    return feat

def ordered_feature_row(feat: Dict[str, float], order: List[str]) -> List[float]:
    return [float(feat.get(name, 0.0) if feat.get(name, 0.0) is not None else 0.0) for name in order]
