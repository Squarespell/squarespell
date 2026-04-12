import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

interface GoogleSheetsConfig {
  spreadsheet_id: string;
  service_account_json: string; // JSON string of service account credentials
  sheet_name?: string; // Defaults to 'Sheet1'
}

interface LeadData {
  timestamp: string;
  email: string;
  name?: string;
  quiz_name: string;
  mode: string;
  outcome: string;
  score?: number;
  calculated_price?: number;
  answers: Record<number, number>;
}

/**
 * Parse and validate service account credentials
 */
function parseServiceAccountCredentials(
  jsonString: string
): { type: string; project_id: string; private_key: string; client_email: string } | null {
  try {
    const creds = JSON.parse(jsonString);
    if (!creds.private_key || !creds.client_email || !creds.project_id) {
      console.error('[GoogleSheets] Missing required fields in service account');
      return null;
    }
    return creds;
  } catch (err) {
    console.error('[GoogleSheets] Failed to parse service account JSON:', err);
    return null;
  }
}

/**
 * Initialize Google Sheets API client using service account
 */
function getAuthClient(
  creds: { type: string; project_id: string; private_key: string; client_email: string }
): JWT {
  return new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Append a row to Google Sheet with lead data
 */
export async function appendLeadToSheet(
  config: GoogleSheetsConfig,
  leadData: LeadData
): Promise<boolean> {
  try {
    const creds = parseServiceAccountCredentials(config.service_account_json);
    if (!creds) {
      return false;
    }

    const auth = getAuthClient(creds);
    const sheets = google.sheets({ version: 'v4', auth });

    const sheetName = config.sheet_name || 'Sheet1';
    const spreadsheetId = config.spreadsheet_id;

    // Prepare row data: timestamp, email, name, quiz_name, mode, outcome, score, calculated_price, answers_json
    const answersJson = JSON.stringify(leadData.answers);
    const values = [
      [
        leadData.timestamp,
        leadData.email,
        leadData.name || '',
        leadData.quiz_name,
        leadData.mode,
        leadData.outcome,
        leadData.score || '',
        leadData.calculated_price || '',
        answersJson,
      ],
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:I`,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    if (response.status === 200) {
      console.log(`[GoogleSheets] Appended row to ${spreadsheetId}`);
      return true;
    }

    console.error('[GoogleSheets] Unexpected response status:', response.status);
    return false;
  } catch (err: any) {
    console.error('[GoogleSheets] Error appending to sheet:', err.message);
    return false;
  }
}

/**
 * Create headers in the sheet if they don't exist
 */
export async function initializeSheetHeaders(config: GoogleSheetsConfig): Promise<boolean> {
  try {
    const creds = parseServiceAccountCredentials(config.service_account_json);
    if (!creds) {
      return false;
    }

    const auth = getAuthClient(creds);
    const sheets = google.sheets({ version: 'v4', auth });

    const sheetName = config.sheet_name || 'Sheet1';
    const spreadsheetId = config.spreadsheet_id;

    // Check if headers exist
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:I1`,
    });

    if (existingData.data.values && existingData.data.values[0] && existingData.data.values[0].length > 0) {
      // Headers already exist
      return true;
    }

    // Insert headers
    const headers = [['Timestamp', 'Email', 'Name', 'Quiz Name', 'Mode', 'Outcome', 'Score', 'Calculated Price', 'Answers']];

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:I1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: headers,
      },
    });

    if (response.status === 200) {
      console.log(`[GoogleSheets] Initialized headers in ${spreadsheetId}`);
      return true;
    }

    return false;
  } catch (err: any) {
    console.error('[GoogleSheets] Error initializing headers:', err.message);
    return false;
  }
}
