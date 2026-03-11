const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const moment = require('moment-timezone');
const { RewardToken, SurveyResponse } = require('../database/mongo');

/**
 * Generate a cryptographically secure unique reward token
 */
async function generateToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return token;
}

/**
 * Create and save reward token linked to a survey response
 */
async function createRewardToken(surveyId) {
  const token = await generateToken();
  const expiryHours = parseInt(process.env.TOKEN_EXPIRY_HOURS) || 24;

  const rewardToken = new RewardToken({
    token,
    surveyId,
    expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000)
  });
  await rewardToken.save();
  return token;
}

/**
 * Generate a unique trace ID for TOPUP API
 * Format: YYYYMMDDHHmmss + 3-digit sequence
 */
function generateTrace() {
  const now = moment().tz('Asia/Phnom_Penh');
  const timestamp = now.format('YYYYMMDDHHmmss');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${timestamp}${random}`;
}

/**
 * Generate LocalDateTime in Cambodia timezone
 * Format: yyyyMMddHHmmss
 */
function generateLocalDateTime() {
  return moment().tz('Asia/Phnom_Penh').format('YYYYMMDDHHmmss');
}

module.exports = { generateToken, createRewardToken, generateTrace, generateLocalDateTime };
