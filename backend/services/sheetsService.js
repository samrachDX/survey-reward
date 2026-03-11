const { google } = require('googleapis');
const logger = require('../utils/logger');

const SHEET_NAME_QUESTIONS = 'SurveyQuestions';
const SHEET_NAME_TRANSACTIONS = 'Transactions';

/**
 * Create authenticated Google Sheets client
 */
function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

/**
 * Fetch survey questions from Google Sheets
 * Expected columns: id, question, type, options, required
 */
async function getSurveyQuestions() {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME_QUESTIONS}!A2:E1000` // Skip header row
    });

    const rows = response.data.values || [];

    return rows.map(row => {
      const [id, question, type, options, required] = row;
      return {
        id: parseInt(id) || 0,
        question: question || '',
        type: type || 'text',
        options: options ? options.split(',').map(o => o.trim()) : [],
        required: (required || '').toLowerCase() === 'yes'
      };
    }).filter(q => q.question); // Filter out empty rows
  } catch (error) {
    logger.error('Failed to fetch survey questions from Google Sheets:', error);
    throw new Error('Failed to load survey questions');
  }
}

/**
 * Log a top-up transaction to Google Sheets
 */
async function logTransactionToSheets({ timestamp, trace, phone, amount, channel, code, description }) {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME_TRANSACTIONS}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, trace, phone, amount, channel, code, description]]
      }
    });

    logger.info(`Transaction logged to Google Sheets | Trace: ${trace}`);
  } catch (error) {
    logger.error('Failed to log transaction to Google Sheets:', error);
    // Don't throw — this is a non-critical background task
  }
}

module.exports = { getSurveyQuestions, logTransactionToSheets };
