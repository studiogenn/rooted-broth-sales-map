# Rooted Broth — NYC Sales Territory Map

Interactive sales territory map for Rooted Broth's B2B outreach across NYC.

**990 businesses** across 44 neighborhoods in Manhattan, Brooklyn, and Queens.

## Features

- Interactive map with color-coded pins across 44 NYC neighborhoods
- Territory assignments — Danielle vs Yasmeen
- Multi-select outreach tracking (DM, Email, Call, Visit, Meeting, Proposal, Won)
- Pipeline dashboard — all contacted leads in one table
- Email sending via Zoho CRM or mail client
- Zoho CRM sync for accounts
- CSV export with full outreach data

## Quick Start

```bash
npm install
npm start
# Open http://localhost:3456
```

## Deploy

**Railway:** `railway init && railway up`

**Render:** Connect GitHub repo, set start command to `npm start`

## Zoho CRM Setup

1. Go to api-console.zoho.com → Self Client
2. Generate code with scope: `ZohoCRM.modules.ALL,ZohoCRM.settings.ALL`
3. Exchange code for access token (see app instructions)
4. Click "Sync to Zoho" in the app and paste token
