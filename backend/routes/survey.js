const express = require('express');
const router = express.Router();
const { getSurveyQuestions } = require('../services/sheetsService');
const { SurveyResponse, RewardToken } = require('../database/mongo');
const { generateToken } = require('../services/tokenService');
const logger = require('../utils/logger');

// GET /api/survey/questions
router.get('/questions', async (req, res) => {
  try {
    const questions = await getSurveyQuestions();
    res.json({ success: true, questions });
  } catch (error) {
    logger.error('Failed to fetch survey questions:', error);
    res.status(500).json({ success: false, error: 'Failed to load survey questions. Please try again.' });
  }
});

// POST /api/survey/submit
router.post('/submit', async (req, res) => {
  try {
    const { answers, captchaToken } = req.body;

    // Validate CAPTCHA if enabled
    if (process.env.TURNSTILE_SECRET_KEY) {
      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        return res.status(400).json({ success: false, error: 'CAPTCHA verification failed.' });
      }
    }

    // Validate answers exist
    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
      return res.status(400).json({ success: false, error: 'Survey answers are required.' });
    }

    // Generate unique reward token
    const token = await generateToken();

    // Store survey response
    const surveyResponse = new SurveyResponse({
      answers,
      rewardToken: token,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    await surveyResponse.save();

    // ✅ Save RewardToken to database so /redeem can validate it
    const expiryHours = parseInt(process.env.TOKEN_EXPIRY_HOURS) || 24;
    const rewardToken = new RewardToken({
      token,
      surveyId: surveyResponse._id,
      used: false,
      expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000)
    });
    await rewardToken.save();

    // Generate redemption URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redemptionUrl = `${frontendUrl}/redeem?token=${token}`;

    logger.info(`Survey submitted. SurveyID: ${surveyResponse._id}, Token: ${token}`);

    res.json({
      success: true,
      message: 'Survey submitted successfully!',
      redemptionUrl
    });
  } catch (error) {
    logger.error('Survey submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit survey. Please try again.' });
  }
});

// Verify Cloudflare Turnstile CAPTCHA
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
