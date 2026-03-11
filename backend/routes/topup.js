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

    // Validate inputs
    if (!token || !phone) {
      return res.status(400).json({ success: false, error: 'Token and phone number are required.' });
    }

    // Validate phone format (Cambodia: starts with 0, 9-10 digits)
    const phoneRegex = /^(0[1-9][0-9]{7,8})$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format. Use format: 012345678' });
    }

    // Validate CAPTCHA
    if (process.env.TURNSTILE_SECRET_KEY) {
      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        return res.status(400).json({ success: false, error: 'CAPTCHA verification failed.' });
      }
    }

    // Validate token
    const rewardToken = await RewardToken.findOne({ token });
    if (!rewardToken) {
      return res.status(404).json({ success: false, error: 'Invalid reward token.' });
    }
    if (rewardToken.used) {
      return res.status(400).json({ success: false, error: 'This reward has already been claimed.' });
    }
    if (new Date() > rewardToken.expiresAt) {
      return res.status(400).json({ success: false, error: 'This reward token has expired.' });
    }

    // Check if this phone has already received a top-up
    const existingTopup = await TopupTransaction.findOne({ phone, status: 'success' });
    if (existingTopup) {
      return res.status(400).json({ success: false, error: 'This phone number has already received a reward.' });
    }

    // Build TOPUP parameters
    const trace = generateTrace();
    const localDateTime = generateLocalDateTime();
    const amount = 1.58; // configurable reward amount
    const bankCode = process.env.TOPUP_BANK_CODE || '970000';
    const accountNo = process.env.TOPUP_ACCOUNT_NO || '123456789';
    const channel = '6014';

    // Generate RSA signature
    const signaturePlaintext = `${trace}-${phone}-${amount}-${bankCode}-${accountNo}-${channel}-${localDateTime}`;
    const sign = generateSignature(signaturePlaintext);

    // Create pending transaction record
    const transaction = new TopupTransaction({
      trace,
      token,
      phone,
      amount,
      bankCode,
      accountNo,
      channel,
      localDateTime,
      status: 'pending'
    });
    await transaction.save();

    // Mark token as used (prevent double-redemption)
    rewardToken.used = true;
    rewardToken.usedAt = new Date();
    rewardToken.phone = phone;
    await rewardToken.save();

    // Send TOPUP API request
    let responseCode = '96';
    let responseDescription = 'System error';

    try {
      const topupResult = await sendTopup({ trace, phone, amount, bankCode, accountNo, channel, localDateTime, sign });
      responseCode = topupResult.code;
      responseDescription = topupResult.description;
    } catch (apiError) {
      logger.error('TOPUP API call failed:', apiError);
    }

    // Update transaction with result
    const isSuccess = responseCode === '00';
    transaction.responseCode = responseCode;
    transaction.responseDescription = responseDescription;
    transaction.status = isSuccess ? 'success' : 'failed';
    transaction.updatedAt = new Date();
    await transaction.save();

    // If API failed, un-mark token so user can retry
    if (!isSuccess) {
      rewardToken.used = false;
      rewardToken.usedAt = undefined;
      await rewardToken.save();
    }

    // Log to Google Sheets asynchronously
    logTransactionToSheets({
      timestamp: new Date().toISOString(),
      trace,
      phone,
      amount,
      channel,
      code: responseCode,
      description: responseDescription
    }).catch(err => logger.error('Failed to log to Sheets:', err));

    logger.info(`TopUp ${isSuccess ? 'SUCCESS' : 'FAILED'} | Trace: ${trace} | Phone: ${phone} | Code: ${responseCode}`);

    res.json({
      success: isSuccess,
      code: responseCode,
      message: isSuccess
        ? `Successfully topped up ${phone} with ${amount} USD!`
        : `Top-up failed: ${responseDescription} (Code: ${responseCode})`
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
