# 🔑 Keys Directory

## 🚨 IMPORTANT SECURITY NOTICE

This directory contains cryptographic keys for JWT receipt signing and verification.

### 📁 Expected Files:
- `facilitator_priv.pem` - RSA private key for signing receipts
- `facilitator_pub.pem` - RSA public key for verifying receipts

### 🔧 Setup Instructions:

#### First-time setup:
```bash
# Generate development keys
npm run setup-keys
```

This will create:
- `facilitator_priv.pem` (KEEP SECURE - signs payment receipts)
- `facilitator_pub.pem` (public key for verification)

### 🛡️ Security Guidelines:

#### ✅ Development:
- Use the generated test keys for development
- Keys are gitignored for security

#### 🚨 Production:
- **NEVER** use development keys in production
- Use Hardware Security Module (HSM) or Key Management Service (KMS)
- Rotate keys regularly
- Use different keys for different environments

### 🔄 Key Rotation:
```bash
# Backup old keys
mv keys/facilitator_*.pem keys/backup/

# Generate new keys
npm run setup-keys
```

### 📋 Key Properties:
- **Algorithm**: RSA with SHA-256 (RS256)
- **Key Size**: 2048 bits
- **Purpose**: JWT receipt signing/verification
- **Format**: PEM encoded

---

**⚠️  NEVER commit actual keys to version control!**
