const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB Atlas connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Survey Response Schema
const surveyResponseSchema = new mongoose.Schema({
  answers: { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
  rewardToken: { type: String, required: true, unique: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now }
});
surveyResponseSchema.index({ rewardToken: 1 });

// Reward Token Schema
const rewardTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'SurveyResponse', required: true },
  used: { type: Boolean, default: false },
  usedAt: { type: Date },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + (parseInt(process.env.TOKEN_EXPIRY_HOURS) || 24) * 60 * 60 * 1000)
  }
});

// TopUp Transaction Schema
const topupTransactionSchema = new mongoose.Schema({
  trace: { type: String, required: true, unique: true },
  token: { type: String, required: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  bankCode: { type: String, required: true },
  accountNo: { type: String, required: true },
  channel: { type: String, required: true },
  localDateTime: { type: String, required: true },
  responseCode: { type: String },
  responseDescription: { type: String },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
topupTransactionSchema.index({ phone: 1 });
topupTransactionSchema.index({ token: 1 });

const SurveyResponse = mongoose.model('SurveyResponse', surveyResponseSchema);
const RewardToken = mongoose.model('RewardToken', rewardTokenSchema);
const TopupTransaction = mongoose.model('TopupTransaction', topupTransactionSchema);

module.exports = { connectDB, SurveyResponse, RewardToken, TopupTransaction };
