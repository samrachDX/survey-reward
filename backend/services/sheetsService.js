const { google } = require('googleapis');
const logger = require('../utils/logger');

const SHEET_NAME_QUESTIONS = 'SurveyQuestions';
const SHEET_NAME_TRANSACTIONS = 'Transactions';
const SHEET_NAME_RESPONSES = 'SurveyResponses';

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
 */
async function getSurveyQuestions() {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME_QUESTIONS}!A2:E1000`
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
    }).filter(q => q.question);
  } catch (error) {
    logger.error('Failed to fetch survey questions from Google Sheets:', error);
    throw new Error('Failed to load survey questions');
  }
}

/**
 * Log survey response answers to SurveyResponses sheet.
 * Dynamically reads question headers from SurveyQuestions sheet
 * so each column matches the actual question text.
 */
async function logSurveyResponseToSheets({ answers, token, timestamp }) {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    // 1. Fetch question list to build headers
    const qRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME_QUESTIONS}!A2:B1000`
    });
    const questionRows = qRes.data.values || [];
    // questionRows = [[id, question_text], ...]

    // 2. Check if SurveyResponses sheet has a header row already
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME_RESPONSES}!A1:ZZ1`
    });
    const existingHeaders = (headerRes.data.values || [[]])[0] || [];

    // 3. Build header row if sheet is empty
    if (existingHeaders.length === 0) {
      const headers = ['Timestamp', 'Token', ...questionRows.map(r => r[1] || `Q${r[0]}`)];
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME_RESPONSES}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] }
      });
    }

    // 4. Build answer row in same column order as questions
    const answerValues = questionRows.map((r, idx) => {
      const qId = r[0];
      const answer = answers[`q${qId}`];
      if (Array.isArray(answer)) return answer.join(', ');
      return answer !== undefined ? String(answer) : '';
    });

    const row = [timestamp || new Date().toISOString(), token || '', ...answerValues];

    // 5. Append the row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME_RESPONSES}!A:ZZ`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    logger.info(`Survey response logged to Google Sheets | Token: ${token}`);
  } catch (error) {
    logger.error('Failed to log survey response to Google Sheets:', error);
    // Non-critical — don't throw
  }
}

/**
 * Log a top-up transaction to Transactions sheet
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
  }
}

module.exports = { getSurveyQuestions, logSurveyResponseToSheets, logTransactionToSheets };
