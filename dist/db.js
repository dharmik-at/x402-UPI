"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DB_FILE = path_1.default.join(process.cwd(), "./data/x402-upi.db");
const MIGRATION = path_1.default.join(process.cwd(), "./migrations/init.sql");
if (!fs_1.default.existsSync(path_1.default.dirname(DB_FILE))) {
    fs_1.default.mkdirSync(path_1.default.dirname(DB_FILE), { recursive: true });
}
const db = new better_sqlite3_1.default(DB_FILE);
// Run migration if needed
if (fs_1.default.existsSync(MIGRATION)) {
    const sql = fs_1.default.readFileSync(MIGRATION, "utf8");
    db.exec(sql);
}
exports.default = db;
