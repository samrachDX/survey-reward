const express = require('express');
const router = express.Router();
const { RewardToken, TopupTransaction } = require('../database/mongo');
const { generateTrace, generateLocalDateTime } = require('../services/tokenService');
const { generateSignature } = require('../services/signatureService');
const { sendTopup } = require('../services/topupService');
const { logTransactionToSheets } = require('../services/sheetsService');
const logger = require('../utils/logger');

// POST /api/topup/redeem
router.post('/redeem', async (req, res) => {
  try {
    const { token, phone, captchaToken } = req.body;

    // ── 1. Validate inputs ──────────────────────────────────────
    if (!token || !phone) {
      return res.status(400).json({ success: false, error: 'Token and phone number are required.' });
    }

    const phoneRegex = /^(0[1-9][0-9]{7,8})$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format. Use format: 012345678' });
    }

    // ── 2. Validate CAPTCHA ─────────────────────────────────────
    if (process.env.TURNSTILE_SECRET_KEY) {
      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        return res.status(400).json({ success: false, error: 'CAPTCHA verification failed.' });
      }
    }

    // ── 3. Validate token ───────────────────────────────────────
    const rewardToken = await RewardToken.findOne({ token });

    if (!rewardToken) {
      return res.status(404).json({
        success: false,
        alreadyUsed: false,
        error: 'Invalid reward token. Please complete the survey first.'
      });
    }

    // Token already used — always show this message regardless of success/fail
    if (rewardToken.used) {
      return res.status(400).json({
        success: false,
        alreadyUsed: true,
        error: `This reward has already been claimed${rewardToken.phone ? ` for number ${rewardToken.phone}` : ''}.`,
        usedAt: rewardToken.usedAt
      });
    }

    // Token expired
    if (new Date() > rewardToken.expiresAt) {
      return res.status(400).json({
        success: false,
        alreadyUsed: false,
        error: 'This reward token has expired. Tokens are valid for 24 hours.'
      });
    }

    // ── 4. Check phone uniqueness ───────────────────────────────
    const existingTopup = await TopupTransaction.findOne({ phone, status: 'success' });
    if (existingTopup) {
      return res.status(400).json({
        success: false,
        alreadyUsed: false,
        error: 'This phone number has already received a reward.'
      });
    }

    // ── 5. Mark token as used IMMEDIATELY (before API call) ─────
    // This is the critical step — we lock it first so no second
    // request can slip through, regardless of what happens next.
    rewardToken.used = true;
    rewardToken.usedAt = new Date();
    rewardToken.phone = phone;
    await rewardToken.save();

    // ── 6. Build TOPUP parameters ───────────────────────────────
    const trace = generateTrace();
    const localDateTime = generateLocalDateTime();
    const amount = 1.58;
    const bankCode = process.env.TOPUP_BANK_CODE || '970000';
    const accountNo = process.env.TOPUP_ACCOUNT_NO || '123456789';
    const channel = '6014';

    const signaturePlaintext = `${trace}-${phone}-${amount}-${bankCode}-${accountNo}-${channel}-${localDateTime}`;
    const sign = generateSignature(signaturePlaintext);

    // ── 7. Save pending transaction ─────────────────────────────
    const transaction = new TopupTransaction({
      trace, token, phone, amount, bankCode, accountNo, channel, localDateTime, status: 'pending'
    });
    await transaction.save();

    // ── 8. Call TOPUP API ───────────────────────────────────────
    let responseCode = '96';
    let responseDescription = 'System error';

    try {
      const topupResult = await sendTopup({ trace, phone, amount, bankCode, accountNo, channel, localDateTime, sign });
      responseCode = topupResult.code;
      responseDescription = topupResult.description;
    } catch (apiError) {
      logger.error('TOPUP API call failed:', apiError);
      responseCode = '96';
      responseDescription = 'Connection to top-up service failed';
    }

    // ── 9. Update transaction result ────────────────────────────
    const isSuccess = responseCode === '00';
    transaction.responseCode = responseCode;
    transaction.responseDescription = responseDescription;
    transaction.status = isSuccess ? 'success' : 'failed';
    transaction.updatedAt = new Date();
    await transaction.save();

    // ── NOTE: Token stays marked as used even if API fails ──────
    // Token is single-use. The participant must contact support
    // if the top-up failed after the token was consumed.

    // ── 10. Log to Google Sheets ────────────────────────────────
    logTransactionToSheets({
      timestamp: new Date().toISOString(),
      trace, phone, amount, channel,
      code: responseCode,
      description: responseDescription
    }).catch(err => logger.error('Failed to log to Sheets:', err));

    logger.info(`TopUp ${isSuccess ? 'SUCCESS' : 'FAILED'} | Trace: ${trace} | Phone: ${phone} | Code: ${responseCode}`);

    // ── 11. Return result ───────────────────────────────────────
    res.json({
      success: isSuccess,
      code: responseCode,
      message: isSuccess
        ? `Successfully topped up ${phone} with $${amount}!`
        : `Top-up failed: ${responseDescription} (Code: ${responseCode}). Please contact support with your token.`
    });

  } catch (error) {
    logger.error('Redeem error:', error);
    res.status(500).json({ success: false, error: 'Internal server error. Please try again.' });
  }
});

async function verifyCaptcha(token) {
  try {
    const axios = require('axios');
    const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token
    });
    return response.data.success === true;
  } catch {
    return false;
  }
}

module.exports = router;
