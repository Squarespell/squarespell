import crypto from 'crypto';

/**
 * AES-256-GCM encryption for sensitive config fields (API keys, tokens).
 *
 * The ENCRYPTION_KEY env var must be a 64-char hex string (32 bytes).
 * Generate one with:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Format of encrypted value:  iv:authTag:ciphertext  (all hex-encoded)
 */

var ALGORITHM = 'aes-256-gcm';
var IV_LENGTH = 12; // 96-bit IV recommended for GCM
var AUTH_TAG_LENGTH = 16; // 128-bit auth tag

function getEncryptionKey(): Buffer {
  var keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY env var must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a string in the format: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  var key = getEncryptionKey();
  var iv = crypto.randomBytes(IV_LENGTH);
  var cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
  var encrypted = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
  var authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Expects format: iv:authTag:ciphertext
 */
export function decrypt(encryptedValue: string): string {
  var key = getEncryptionKey();
  var parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }
  var iv = Buffer.from(parts[0], 'hex');
  var authTag = Buffer.from(parts[1], 'hex');
  var ciphertext = parts[2];
  var decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(authTag);
  var decrypted = decipher.update(ciphertext, 'hex', 'utf8') + decipher.final('utf8');
  return decrypted;
}

/**
 * Fields within integration config objects that contain secrets and must be encrypted.
 */
var SENSITIVE_FIELDS = ['apiKey', 'accessToken', 'api_key', 'access_token', 'service_account_json'];

/**
 * Check if a value looks like it's already encrypted (iv:authTag:ciphertext hex format).
 */
function isEncrypted(value: string): boolean {
  if (typeof value !== 'string') return false;
  var parts = value.split(':');
  if (parts.length !== 3) return false;
  // IV should be 24 hex chars (12 bytes), authTag 32 hex chars (16 bytes)
  return parts[0].length === 24 && parts[1].length === 32 && /^[0-9a-f]+$/.test(parts[0] + parts[1] + parts[2]);
}

/**
 * Encrypt sensitive fields in an integration config object.
 * Non-sensitive fields are left as-is.
 */
export function encryptConfig(config: Record<string, any>): Record<string, any> {
  if (!process.env.ENCRYPTION_KEY) return config; // graceful fallback during migration
  var result: Record<string, any> = {};
  for (var key in config) {
    if (!config.hasOwnProperty(key)) continue;
    var value = config[key];
    if (SENSITIVE_FIELDS.includes(key) && typeof value === 'string' && value.length > 0 && !isEncrypted(value)) {
      result[key] = encrypt(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Decrypt sensitive fields in an integration config object.
 * Non-sensitive fields and non-encrypted values are left as-is.
 */
export function decryptConfig(config: Record<string, any>): Record<string, any> {
  if (!process.env.ENCRYPTION_KEY) return config; // graceful fallback during migration
  var result: Record<string, any> = {};
  for (var key in config) {
    if (!config.hasOwnProperty(key)) continue;
    var value = config[key];
    if (SENSITIVE_FIELDS.includes(key) && typeof value === 'string' && isEncrypted(value)) {
      try {
        result[key] = decrypt(value);
      } catch (e) {
        // If decryption fails, pass through raw value (may be plaintext during migration)
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}
