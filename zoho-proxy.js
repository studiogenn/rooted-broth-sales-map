/**
 * Rooted Broth — Zoho CRM Proxy Server
 * Auto-refreshing OAuth, real-time sync, email sending
 */

const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3456;

// Zoho config — set via env vars on Render, or defaults to your EU credentials
const ZOHO_API_BASE = process.env.ZOHO_API_BASE || 'https://www.zohoapis.eu/crm/v2';
const ZOHO_ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.eu';
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '1000.15Y71QF5FP5TD20RHGPJSUHMPFR1UJ';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '78fad5abdc6f8510d01b4a3ff0ca0a808fe8ffe757';
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || '1000.827e4bf96255bbfc27fa8f77848b0734.009cf556ae7f04e763657339f6a35be1';

let zohoToken = process.env.ZOHO_ACCESS_TOKEN || null;
let tokenExpiresAt = 0;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '5mb' }));

// ---------------------------------------------------------------------------
// AUTO TOKEN REFRESH
// ---------------------------------------------------------------------------
async function refreshToken() {
  console.log('[zoho] Refreshing access token...');
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    refresh_token: ZOHO_REFRESH_TOKEN,
  });

  const resp = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    body: params,
  });
  const data = await resp.json();

  if (data.access_token) {
    zohoToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // refresh 60s before expiry
    console.log('[zoho] Token refreshed, expires in', data.expires_in, 'seconds');
    return true;
  } else {
    console.error('[zoho] Token refresh failed:', data);
    return false;
  }
}

async function ensureToken() {
  if (!zohoToken || Date.now() > tokenExpiresAt) {
    await refreshToken();
  }
  return zohoToken;
}

// Refresh on startup
refreshToken().catch(e => console.error('[zoho] Initial refresh failed:', e.message));

// Refresh every 50 minutes
setInterval(() => refreshToken().catch(e => console.error('[zoho] Scheduled refresh failed:', e.message)), 50 * 60 * 1000);

// ---------------------------------------------------------------------------
// ZOHO API HELPER
// ---------------------------------------------------------------------------
async function zohoRequest(method, apiPath, body) {
  const token = await ensureToken();
  if (!token) throw new Error('No Zoho token available');

  const url = `${ZOHO_API_BASE}${apiPath}`;
  const options = {
    method,
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  let data;
  try { data = await response.json(); } catch { data = null; }

  // If token expired mid-request, refresh and retry once
  if (response.status === 401) {
    console.log('[zoho] 401 received, refreshing token and retrying...');
    await refreshToken();
    options.headers['Authorization'] = `Zoho-oauthtoken ${zohoToken}`;
    const retry = await fetch(url, options);
    try { data = await retry.json(); } catch { data = null; }
    return { ok: retry.ok, status: retry.status, data };
  }

  return { ok: response.ok, status: response.status, data };
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => {
      console.error(`[zoho-proxy] ${req.method} ${req.path} error:`, err.message);
      res.status(500).json({ success: false, error: err.message });
    });
  };
}

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------

// Health check
app.get('/api/zoho/health', async (_req, res) => {
  res.json({ success: true, tokenConfigured: !!zohoToken, tokenExpired: Date.now() > tokenExpiresAt, uptime: process.uptime() });
});

// Manual auth (override)
app.post('/api/zoho/auth', asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (token) {
    zohoToken = token.trim();
    tokenExpiresAt = Date.now() + 3500 * 1000;
    console.log('[zoho] Manual token stored.');
  }
  res.json({ success: true, message: 'Token stored.' });
}));

// ---------------------------------------------------------------------------
// SEARCH ACCOUNTS — find a Zoho Account by name to get its ID
// ---------------------------------------------------------------------------
app.get('/api/zoho/search-account', asyncHandler(async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ success: false, error: 'name query param required' });

  const result = await zohoRequest('GET', `/Accounts/search?criteria=(Account_Name:equals:${encodeURIComponent(name)})`);
  if (result.ok && result.data?.data?.length > 0) {
    const acct = result.data.data[0];
    res.json({ success: true, id: acct.id, name: acct.Account_Name, data: acct });
  } else {
    res.json({ success: false, id: null, message: 'Account not found' });
  }
}));

// ---------------------------------------------------------------------------
// CREATE ACCOUNT
// ---------------------------------------------------------------------------
app.post('/api/zoho/company', asyncHandler(async (req, res) => {
  const payload = req.body;
  if (!payload?.Account_Name) return res.status(400).json({ success: false, error: 'Account_Name required' });

  const result = await zohoRequest('POST', '/Accounts', { data: [payload] });
  const record = result.data?.data?.[0];
  res.json({ success: result.ok, id: record?.details?.id || null, zoho: result.data });
}));

// ---------------------------------------------------------------------------
// UPDATE ACCOUNT — update an existing Account by Zoho ID
// ---------------------------------------------------------------------------
app.put('/api/zoho/company/:id', asyncHandler(async (req, res) => {
  const zohoId = req.params.id;
  const payload = req.body;

  const result = await zohoRequest('PUT', '/Accounts', {
    data: [{ id: zohoId, ...payload }],
  });
  const record = result.data?.data?.[0];
  res.json({ success: result.ok, id: record?.details?.id || zohoId, zoho: result.data });
}));

// ---------------------------------------------------------------------------
// UPSERT ACCOUNT — create or update by Account_Name
// ---------------------------------------------------------------------------
app.post('/api/zoho/upsert-account', asyncHandler(async (req, res) => {
  const payload = req.body;
  if (!payload?.Account_Name) return res.status(400).json({ success: false, error: 'Account_Name required' });

  const result = await zohoRequest('POST', '/Accounts/upsert', {
    data: [payload],
    duplicate_check_fields: ['Account_Name'],
  });
  const record = result.data?.data?.[0];
  res.json({
    success: result.ok,
    id: record?.details?.id || null,
    action: record?.action || 'unknown',
    zoho: result.data,
  });
}));

// ---------------------------------------------------------------------------
// CREATE NOTE on Account
// ---------------------------------------------------------------------------
app.post('/api/zoho/note', asyncHandler(async (req, res) => {
  const { Note_Title, Note_Content, parent_module, parent_id } = req.body;
  if (!Note_Content) return res.status(400).json({ success: false, error: 'Note_Content required' });
  if (!parent_id) return res.status(400).json({ success: false, error: 'parent_id required' });

  const result = await zohoRequest('POST', '/Notes', {
    data: [{
      Note_Title: Note_Title || 'Note',
      Note_Content,
      $se_module: parent_module || 'Accounts',
      Parent_Id: { id: parent_id },
    }]
  });
  const record = result.data?.data?.[0];
  res.json({ success: result.ok, id: record?.details?.id || null, zoho: result.data });
}));

// ---------------------------------------------------------------------------
// SEND EMAIL via Zoho CRM
// ---------------------------------------------------------------------------
app.post('/api/zoho/send-email', asyncHandler(async (req, res) => {
  const { to, subject, body, accountName } = req.body;
  if (!to || !subject) return res.status(400).json({ success: false, error: 'to and subject required' });

  // Try Zoho CRM email sending via /Accounts/{id}/actions/send_mail
  // First find the account
  let zohoId = null;
  if (accountName) {
    const search = await zohoRequest('GET', `/Accounts/search?criteria=(Account_Name:equals:${encodeURIComponent(accountName)})`);
    if (search.ok && search.data?.data?.length > 0) {
      zohoId = search.data.data[0].id;
    }
  }

  // Try sending via CRM send_mail endpoint
  if (zohoId) {
    const emailResult = await zohoRequest('POST', `/Accounts/${zohoId}/actions/send_mail`, {
      data: [{
        from: { user_name: "Danielle", email: "danielle@rootedbroth.com" },
        to: [{ user_name: to.split('@')[0], email: to }],
        subject: subject,
        content: `<p>${(body || '').replace(/\n/g, '<br>')}</p>`,
        mail_format: "html",
      }]
    });

    if (emailResult.ok) {
      return res.json({ success: true, method: 'zoho_crm', zoho: emailResult.data });
    }
  }

  // Fallback: log as note on the account
  if (zohoId) {
    await zohoRequest('POST', '/Notes', {
      data: [{
        Note_Title: 'Email sent to ' + to,
        Note_Content: 'Subject: ' + subject + '\n\nTo: ' + to + '\n\n' + (body || ''),
        $se_module: 'Accounts',
        Parent_Id: { id: zohoId },
      }]
    });
  }

  res.json({
    success: true,
    method: 'mailto_with_note',
    zohoAccountId: zohoId,
    message: 'Email logged as note in Zoho. Use your mail client to send the actual email.',
  });
}));

// ---------------------------------------------------------------------------
// BULK IMPORT
// ---------------------------------------------------------------------------
app.post('/api/zoho/bulk-import', asyncHandler(async (req, res) => {
  const { companies } = req.body;
  if (!Array.isArray(companies) || companies.length === 0) {
    return res.status(400).json({ success: false, error: 'companies array required' });
  }

  const BATCH = 100;
  let created = 0, failed = 0;
  for (let i = 0; i < companies.length; i += BATCH) {
    const batch = companies.slice(i, i + BATCH);
    const result = await zohoRequest('POST', '/Accounts', { data: batch });
    if (result.ok && result.data?.data) {
      result.data.data.forEach(r => r.status === 'success' ? created++ : failed++);
    } else {
      failed += batch.length;
    }
  }
  res.json({ success: failed === 0, created, failed, total: companies.length });
}));

// ---------------------------------------------------------------------------
// SYNC SINGLE LEAD — upsert account + update description with latest outreach data
// ---------------------------------------------------------------------------
app.post('/api/zoho/sync-lead', asyncHandler(async (req, res) => {
  const { name, phone, website, address, category, neighborhood, borough, statuses, channels, notes, assigned, email, instagram, rating, reviewCount } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });

  const description = [
    'Category: ' + (category || ''),
    'Neighborhood: ' + (neighborhood || ''),
    'Borough: ' + (borough || ''),
    'Assigned: ' + (assigned || ''),
    'Outreach Status: ' + (statuses || []).join(', '),
    'Channels: ' + (channels || []).join(', '),
    email ? 'Email: ' + email : '',
    instagram ? 'Instagram: ' + instagram : '',
    rating ? 'Rating: ' + rating + '/5' : '',
    reviewCount ? 'Reviews: ' + reviewCount : '',
    notes ? 'Notes: ' + notes : '',
  ].filter(Boolean).join('\n');

  const result = await zohoRequest('POST', '/Accounts/upsert', {
    data: [{
      Account_Name: name,
      Phone: phone || '',
      Website: website || '',
      Billing_Street: address || '',
      Billing_City: 'New York',
      Billing_State: 'NY',
      Billing_Country: 'United States',
      Industry: 'Food & Beverage',
      Description: description,
    }],
    duplicate_check_fields: ['Account_Name'],
  });

  const record = result.data?.data?.[0];
  res.json({
    success: result.ok,
    id: record?.details?.id || null,
    action: record?.action || 'unknown',
  });
}));

// ---------------------------------------------------------------------------
// API FOR VERCEL COMMAND CENTER — provides live outreach data
// ---------------------------------------------------------------------------
app.get('/api/dashboard/pipeline', asyncHandler(async (req, res) => {
  const fs = require('fs');
  const dataPath = path.join(__dirname, 'public', 'all-targets.json');
  let businesses = [];
  try { businesses = JSON.parse(fs.readFileSync(dataPath, 'utf-8')); } catch(e) {}

  // Pull latest accounts from Zoho to get outreach statuses
  const token = await ensureToken();
  let zohoAccounts = [];
  if (token) {
    try {
      const result = await zohoRequest('GET', '/Accounts?fields=Account_Name,Phone,Website,Billing_Street,Description,Industry&per_page=200&page=1');
      if (result.ok && result.data?.data) zohoAccounts = result.data.data;
    } catch(e) {}
  }

  // Build pipeline summary
  const statusCounts = { prospect: 0, contacted: 0, dm_sent: 0, emailed: 0, called: 0, visited: 0, meeting_set: 0, proposal_sent: 0, won: 0, not_interested: 0 };
  const recentActivity = [];

  zohoAccounts.forEach(a => {
    const desc = a.Description || '';
    const statusMatch = desc.match(/Outreach Status: ([^\n]*)/);
    if (statusMatch) {
      const statuses = statusMatch[1].split(', ').map(s => s.trim().toLowerCase().replace(/ /g, '_'));
      statuses.forEach(s => { if (statusCounts[s] !== undefined) statusCounts[s]++; });
      if (statuses.length > 0) {
        statusCounts.contacted++;
        recentActivity.push({
          name: a.Account_Name,
          statuses: statuses,
          phone: a.Phone || '',
          address: a.Billing_Street || '',
          modified: a.Modified_Time || '',
        });
      }
    } else {
      statusCounts.prospect++;
    }
  });

  res.json({
    success: true,
    generated: new Date().toISOString(),
    total_accounts: businesses.length,
    zoho_accounts: zohoAccounts.length,
    pipeline: statusCounts,
    this_week: {
      total_contacted: statusCounts.contacted,
      dms_sent: statusCounts.dm_sent,
      emails_sent: statusCounts.emailed,
      calls_made: statusCounts.called,
      visits_made: statusCounts.visited,
      meetings_set: statusCounts.meeting_set,
      proposals_sent: statusCounts.proposal_sent,
      accounts_won: statusCounts.won,
    },
    recent_activity: recentActivity.slice(0, 20),
  });
}));

// ---------------------------------------------------------------------------
// START
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[rooted-broth] Server running on http://localhost:${PORT}`);
  console.log(`[rooted-broth] Zoho auto-refresh: enabled`);
  console.log(`[rooted-broth] Static files: ./public`);
  console.log(`[rooted-broth] Dashboard API: GET /api/dashboard/pipeline`);
});
