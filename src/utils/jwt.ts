import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

const PRIV = path.join(process.cwd(), "./keys/facilitator_priv.pem");
const PUB = path.join(process.cwd(), "./keys/facilitator_pub.pem");

export function signReceipt(payload: object, opts?: jwt.SignOptions) {
  const key = fs.readFileSync(PRIV, "utf8");
  return jwt.sign(payload, key, { algorithm: "RS256", ...(opts || {}) });
}

export function verifyReceipt(token: string) {
  const key = fs.readFileSync(PUB, "utf8");
  return jwt.verify(token, key, { algorithms: ["RS256"] });
}
