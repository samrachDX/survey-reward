const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/logger');

// TOPUP response code descriptions
const RESPONSE_CODES = {
  '00': 'Transaction successful',
  '01': 'Provider maintenance',
  '03': 'Invalid IP',
  '05': 'Connection failure',
  '06': 'Invalid LocalDateTime',
  '08': 'Timeout',
  '09': 'Duplicate trace',
  '12': 'Invalid phone number',
  '13': 'Invalid amount',
  '14': 'Invalid amount',
  '20': 'Partner code invalid',
  '79': 'Signature invalid',
  '96': 'System error'
};

/**
 * Build SOAP 1.1 XML request for Cambopay .asmx endpoint
 */
function buildSoapRequest({ trace, phone, amount, bankCode, accountNo, channel, localDateTime, sign }) {
  const amountStr = parseFloat(amount).toFixed(2);
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <PinlessTopup xmlns="http://tempuri.org/">
      <Trace>${trace}</Trace>
      <MobileNo>${phone}</MobileNo>
      <Amount>${amountStr}</Amount>
      <BankCode>${bankCode}</BankCode>
      <AccountNo>${accountNo}</AccountNo>
      <Channel>${channel}</Channel>
      <LocalDateTime>${localDateTime}</LocalDateTime>
      <Sign>${sign}</Sign>
    </PinlessTopup>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Parse SOAP XML response - strips namespace prefixes for robust parsing
 */
async function parseSoapResponse(xmlString) {
  try {
    const parsed = await xml2js.parseStringPromise(xmlString, {
      explicitArray: false,
      ignoreAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix]
    });
    const body = parsed?.Envelope?.Body || {};
    const responseWrapper = body?.PinlessTopupResponse || body?.pinlessTopupResponse || {};
    const result = responseWrapper?.PinlessTopupResult || responseWrapper?.pinlessTopupResult || responseWrapper;
    const code = result?.Code || result?.code || '96';
    const description = result?.Description || result?.description || RESPONSE_CODES[code] || 'Unknown error';
    return { code: String(code).trim(), description: String(description).trim() };
  } catch (parseError) {
    logger.error('Failed to parse SOAP response XML:', parseError);
    logger.error('Raw XML was:', xmlString);
    return { code: '96', description: 'Failed to parse API response' };
  }
}

/**
 * Send PinlessTopup SOAP request to Cambopay
 */
async function sendTopup({ trace, phone, amount, bankCode, accountNo, channel, localDateTime, sign }) {
  const apiUrl = process.env.TOPUP_API_URL;
  if (!apiUrl) throw new Error('TOPUP_API_URL environment variable is not set');

  const soapBody = buildSoapRequest({ trace, phone, amount, bankCode, accountNo, channel, localDateTime, sign });

  logger.info(`Sending TOPUP | Trace: ${trace} | Phone: ${phone} | Amount: ${amount}`);

  const response = await axios.post(apiUrl, soapBody, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '"http://tempuri.org/PinlessTopup"'
    },
    timeout: 30000,
    validateStatus: () => true
  });

  logger.info(`TOPUP HTTP Status: ${response.status}`);
  const result = await parseSoapResponse(response.data);
  logger.info(`TOPUP Result | Trace: ${trace} | Code: ${result.code} | Desc: ${result.description}`);
  return result;
}

module.exports = { sendTopup, RESPONSE_CODES };
