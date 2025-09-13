// quick node script to generate RSA keys (dev only). Requires Node's crypto
const fs = require('fs');
const { generateKeyPairSync } = require('crypto');
const path = require('path');

const basedir = path.join(process.cwd(), 'keys');
if (!fs.existsSync(basedir)) {
  fs.mkdirSync(basedir, { recursive: true });
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

fs.writeFileSync(path.join(basedir, 'facilitator_priv.pem'), privateKey);
fs.writeFileSync(path.join(basedir, 'facilitator_pub.pem'), publicKey);

console.log('✅ RSA keypair generated successfully!');
console.log('   Private key: ./keys/facilitator_priv.pem');
console.log('   Public key:  ./keys/facilitator_pub.pem');
console.log('   Note: These are development keys only. Do NOT use in production!');
