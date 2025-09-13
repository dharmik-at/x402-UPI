CREATE TABLE IF NOT EXISTS payment_challenges (
  id TEXT PRIMARY KEY,
  amount REAL,
  currency TEXT,
  metadata TEXT,
  expires_at INTEGER,
  status TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payreq_id TEXT,
  psp_txn_id TEXT,
  psp_provider TEXT,
  amount REAL,
  payer_vpa TEXT,
  raw_payload TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS issued_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payreq_id TEXT,
  receipt TEXT,
  issued_at INTEGER
);

CREATE TABLE IF NOT EXISTS consumed_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt TEXT,
  payreq_id TEXT,
  consumed_at INTEGER
);
