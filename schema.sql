-- Minimal schema for transaction history
CREATE TABLE IF NOT EXISTS tx (
  transaction_id TEXT PRIMARY KEY,
  unix_time      INTEGER NOT NULL,
  trans_date     TEXT,
  trans_time     TEXT,

  ssn            TEXT,
  cc_num         TEXT,
  acct_num       TEXT,

  first          TEXT,
  last           TEXT,
  gender         TEXT,

  street         TEXT,
  city           TEXT,
  state          TEXT,
  zip            TEXT,
  lat            REAL,
  long           REAL,

  city_pop       INTEGER,
  job            TEXT,
  dob            TEXT,

  category       TEXT,
  amt            REAL,
  merchant       TEXT,
  merch_lat      REAL,
  merch_long     REAL
);

CREATE INDEX IF NOT EXISTS idx_tx_ccnum_time ON tx (cc_num, unix_time);
CREATE INDEX IF NOT EXISTS idx_tx_time ON tx (unix_time);
CREATE INDEX IF NOT EXISTS idx_tx_merchant ON tx (merchant);
