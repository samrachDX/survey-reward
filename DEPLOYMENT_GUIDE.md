# Survey Reward Phone Top-Up System — Deployment Guide

## Prerequisites

- GitHub account
- MongoDB Atlas account (free tier)
- Google Cloud account (for Sheets API)
- Render account (free tier)
- Your Cambopay / VNPay TOPUP API credentials

---

## STEP 1 — Set Up MongoDB Atlas

1. Go to **https://cloud.mongodb.com** → Sign up / Log in
2. Create a new **Free Cluster** (M0 Sandbox)
3. Choose region closest to Cambodia (e.g. Singapore)
4. Create a **Database User**:
   - Go to **Security → Database Access → Add New Database User**
   - Username: `surveyapp`
   - Password: generate a strong password (save it!)
   - Role: **Read and write to any database**
5. Allow network access:
   - Go to **Security → Network Access → Add IP Address**
   - Click **Allow Access from Anywhere** → `0.0.0.0/0`
6. Get your connection string:
   - Click **Connect → Drivers**
   - Copy the URI, replace `<password>` with your password
   - Example: `mongodb+srv://surveyapp:yourpassword@cluster0.abc12.mongodb.net/survey_reward?retryWrites=true&w=majority`

---

## STEP 2 — Set Up Google Sheets API

### 2A. Create the Google Spreadsheet

1. Go to **https://sheets.google.com** → Create a new spreadsheet
2. Name it: `Survey Reward System`
3. Create **Sheet 1** named `SurveyQuestions` with headers:

   | id | question | type | options | required |
   |----|----------|------|---------|----------|
   | 1 | What is your age group? | dropdown | 18-25,26-35,36-50,50+ | yes |
   | 2 | Do you use mobile banking? | radio | Yes,No | yes |
   | 3 | Which bank do you use? | text | | no |
   | 4 | Rate your satisfaction | scale | 1,2,3,4,5 | yes |

4. Create **Sheet 2** named `Transactions` with headers:

   | Timestamp | Trace | Phone | Amount | Channel | Code | Description |
   |-----------|-------|-------|--------|---------|------|-------------|

5. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`

### 2B. Create a Service Account

1. Go to **https://console.cloud.google.com**
2. Create a new project or select existing
3. Enable **Google Sheets API**:
   - Search "Google Sheets API" → Enable
4. Create Service Account:
   - Go to **APIs & Services → Credentials → Create Credentials → Service Account**
   - Name: `survey-sheets-service`
   - Click **Done**
5. Create a Key:
   - Click your service account → **Keys tab → Add Key → JSON**
   - Download the JSON file
6. Share the Spreadsheet with the service account:
   - Open your Google Sheet
   - Click **Share** → paste the service account email (e.g. `survey-sheets-service@your-project.iam.gserviceaccount.com`)
   - Give **Editor** access

### 2C. Extract credentials from JSON key

From the downloaded JSON file, you need:
- `client_email` → This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → This is your `GOOGLE_PRIVATE_KEY` (the full `-----BEGIN RSA PRIVATE KEY-----...` block)

---

## STEP 3 — Prepare Your TOPUP Private Key (Already Done ✅)

Your RSA private key has already been processed and converted. The ready-to-use Base64 value is pre-filled in `.env.example` as `TOPUP_PRIVATE_KEY`.

> ⚠️ **This is a TEST environment key** (`topuptestcam.vnpaytest.vn`). When you switch to production, you will need to get a new key from VNPay and repeat the Base64 encoding.

**One remaining step — get your `TOPUP_ACCOUNT_NO`:**
Contact VNPay/Cambopay to get your assigned `AccountNo` for the test environment. This is required for the signature and SOAP request.

---

## STEP 4 — Push Code to GitHub

```bash
# Navigate to project root
cd survey-system

# Initialize git
git init
git add .
git commit -m "Initial commit: Survey Reward Phone Top-Up System"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/survey-reward.git
git branch -M main
git push -u origin main
```

---

## STEP 5 — Deploy Backend on Render

1. Go to **https://render.com** → Log in
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `survey-reward-backend` |
   | **Root Directory** | `backend` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
   | **Plan** | Free |

5. Click **Advanced → Add Environment Variables** and add all of these:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Your MongoDB connection string |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
   | `GOOGLE_PRIVATE_KEY` | Full private key PEM string (with `\n` newlines) |
   | `GOOGLE_SPREADSHEET_ID` | Your spreadsheet ID |
   | `TOPUP_API_URL` | `https://topuptestcam.vnpaytest.vn/CambopayBank_T/CambopaySrv.asmx` |
   | `TOPUP_BANK_CODE` | `970000` |
   | `TOPUP_ACCOUNT_NO` | Your assigned account number from VNPay |
   | `TOPUP_PRIVATE_KEY` | *(copy the long Base64 value from `.env.example`)* |
   | `TOKEN_EXPIRY_HOURS` | `24` |
   | `FRONTEND_URL` | Leave blank for now, update after frontend deploy |

6. Click **Create Web Service**
7. Wait for deployment → copy your backend URL (e.g. `https://survey-reward-backend.onrender.com`)

> ⚠️ **Free Render services sleep after 15 minutes of inactivity.** The first request after sleep takes ~30 seconds. Upgrade to Starter plan ($7/month) to avoid this for production.

---

## STEP 6 — Deploy Frontend on Render

1. Click **New → Static Site**
2. Connect the same GitHub repo
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Name** | `survey-reward-frontend` |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `build` |

4. Add Environment Variables:

   | Key | Value |
   |-----|-------|
   | `REACT_APP_API_URL` | Your backend URL from Step 5 |

5. Add Redirect/Rewrite Rule:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: Rewrite

6. Click **Create Static Site**
7. Copy your frontend URL (e.g. `https://survey-reward-frontend.onrender.com`)

---

## STEP 7 — Update Backend FRONTEND_URL

1. Go back to your **backend service** on Render
2. Click **Environment** → find `FRONTEND_URL`
3. Set it to your frontend URL from Step 6
4. Click **Save Changes** → backend will redeploy

---

## STEP 8 — Test the Full Flow

### 8A. Health Check
Visit: `https://survey-reward-backend.onrender.com/health`
Expected: `{"status":"ok","timestamp":"..."}`

### 8B. Questions API
Visit: `https://survey-reward-backend.onrender.com/api/survey/questions`
Expected: JSON array of your survey questions

### 8C. Full User Flow
1. Open your frontend URL
2. Click **Start Survey**
3. Answer all questions → **Submit**
4. Copy the redemption URL shown
5. Open the redemption URL
6. Enter a test phone number
7. Check Google Sheets `Transactions` tab for the log entry

---

## STEP 9 — Set Up Google Sheets Structure

Make sure your `Transactions` sheet has the correct header row:

**Row 1 (Headers):**
```
Timestamp | Trace | Phone | Amount | Channel | Code | Description
```

The system will auto-append rows below the header.

---

## Environment Variables Quick Reference

### Backend (.env or Render Dashboard)
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/survey_reward
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend.onrender.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
TOPUP_API_URL=https://topuptestcam.vnpaytest.vn/CambopayBank_T/CambopaySrv.asmx
TOPUP_BANK_CODE=970000
TOPUP_ACCOUNT_NO=your_account_number
TOPUP_PRIVATE_KEY=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...  (full value from .env.example)
TOKEN_EXPIRY_HOURS=24
```

### Frontend (.env or Render Dashboard)
```
REACT_APP_API_URL=https://survey-reward-backend.onrender.com
```

---

## Project File Structure

```
survey-system/
├── render.yaml                    ← Render deployment config
├── .gitignore
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── server.js                  ← Express app entry point
│   ├── database/
│   │   └── mongo.js               ← MongoDB schemas & connection
│   ├── routes/
│   │   ├── survey.js              ← GET /questions, POST /submit
│   │   ├── reward.js              ← GET /validate
│   │   └── topup.js               ← POST /redeem
│   ├── services/
│   │   ├── tokenService.js        ← Token + trace generation
│   │   ├── signatureService.js    ← RSA SHA1 signing
│   │   ├── topupService.js        ← SOAP API call
│   │   └── sheetsService.js       ← Google Sheets read/write
│   └── utils/
│       └── logger.js              ← Winston logger
└── frontend/
    ├── package.json
    ├── .env.example
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js                 ← Router setup
        ├── index.js
        └── pages/
            ├── Home.js            ← Landing page
            ├── Survey.js          ← Dynamic survey form
            ├── Redeem.js          ← Phone number input
            └── Result.js          ← Top-up result
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/survey/questions` | Fetch questions from Google Sheets |
| POST | `/api/survey/submit` | Submit survey, get redemption URL |
| GET | `/api/reward/validate?token=xxx` | Validate a reward token |
| POST | `/api/topup/redeem` | Redeem reward with phone number |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Questions not loading | Check `GOOGLE_SPREADSHEET_ID` and sheet is shared with service account |
| Signature invalid (code 79) | Verify `TOPUP_PRIVATE_KEY` is Base64 of PEM, and public key registered with Cambopay |
| MongoDB connection error | Check `MONGODB_URI`, whitelist `0.0.0.0/0` in Atlas Network Access |
| CORS error in browser | Ensure `FRONTEND_URL` in backend env matches exact frontend URL |
| Token already used | Expected behavior — each token is single-use by design |
| Cold start delay | Free Render tier sleeps; upgrade to Starter or use a cron ping service |
