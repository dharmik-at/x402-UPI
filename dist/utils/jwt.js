"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signReceipt = signReceipt;
exports.verifyReceipt = verifyReceipt;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const PRIV = path_1.default.join(process.cwd(), "./keys/facilitator_priv.pem");
const PUB = path_1.default.join(process.cwd(), "./keys/facilitator_pub.pem");
function signReceipt(payload, opts) {
    const key = fs_1.default.readFileSync(PRIV, "utf8");
    return jsonwebtoken_1.default.sign(payload, key, { algorithm: "RS256", ...(opts || {}) });
}
function verifyReceipt(token) {
    const key = fs_1.default.readFileSync(PUB, "utf8");
    return jsonwebtoken_1.default.verify(token, key, { algorithms: ["RS256"] });
}
