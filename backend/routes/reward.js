const express = require('express');
const router = express.Router();
const { RewardToken } = require('../database/mongo');
const logger = require('../utils/logger');

// GET /api/reward/validate?token=xxx
router.get('/validate', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required.' });
    }

    const rewardToken = await RewardToken.findOne({ token });

    if (!rewardToken) {
      return res.status(404).json({ valid: false, error: 'Invalid reward token.' });
    }

    if (rewardToken.used) {
      return res.status(400).json({ valid: false, error: 'This reward has already been claimed.' });
    }

    if (new Date() > rewardToken.expiresAt) {
      return res.status(400).json({ valid: false, error: 'This reward token has expired.' });
    }

    res.json({ valid: true, message: 'Token is valid. You can claim your reward!' });
  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed. Please try again.' });
  }
});

module.exports = router;
