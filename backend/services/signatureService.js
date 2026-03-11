const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Generate RSA-SHA1 digital signature for TOPUP API
 * Algorithm: SHA1withRSA, PKCS#1 v1.5, Base64 output
 * Uses Node.js built-in crypto — no extra dependencies needed.
 *
 * The TOPUP_PRIVATE_KEY env var must be a Base64-encoded PKCS#8 PEM:
 *   base64 -w 0 private_key.pem > private_key_base64.txt
 *
 * @param {string} plaintext - The data to sign
 * @returns {string} - Base64-encoded signature
 */
function generateSignature(plaintext) {
  try {
    const privateKeyBase64 = process.env.TOPUP_PRIVATE_KEY;
    if (!privateKeyBase64) {
      throw new Error('TOPUP_PRIVATE_KEY environment variable is not set');
    }

    // Decode Base64 → PEM string
    const privateKeyPem = Buffer.from(privateKeyBase64, 'base64').toString('utf8');

    // Sign with SHA1withRSA (PKCS#1 v1.5 is Node's default for RSA)
    const signer = crypto.createSign('SHA1');
    signer.update(plaintext, 'utf8');
    return signer.sign(privateKeyPem, 'base64');
  } catch (error) {
    logger.error('Signature generation failed:', error);
    throw new Error('Failed to generate digital signature');
  }
}

/**
 * Build signature plaintext from TOPUP parameters
 * Format: Trace-MobileNo-Amount-BankCode-AccountNo-Channel-LocalDateTime
 */
function buildSignaturePlaintext({ trace, phone, amount, bankCode, accountNo, channel, localDateTime }) {
  return `${trace}-${phone}-${amount}-${bankCode}-${accountNo}-${channel}-${localDateTime}`;
}

module.exports = { generateSignature, buildSignaturePlaintext };
