import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "./data/x402-upi.db");
const MIGRATION = path.join(process.cwd(), "./migrations/init.sql");

if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

const db = new Database(DB_FILE);

// Run migration if needed
if (fs.existsSync(MIGRATION)) {
  const sql = fs.readFileSync(MIGRATION, "utf8");
  db.exec(sql);
}

export default db;
