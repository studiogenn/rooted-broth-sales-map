/**
 * Zoho CRM Proxy Server
 * ---------------------
 * Lightweight Express server that proxies requests to the Zoho CRM v2 API.
 * Stores the OAuth token in memory so the browser-based sales map can
 * push leads into Zoho without exposing the token in client-side code.
 *
 * Usage:
 *   1. Start the server:  node zoho-proxy.js
 *   2. POST your Zoho OAuth token to /api/zoho/auth
 *   3. Use the other endpoints to create records in Zoho CRM
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;
// Support both US and EU Zoho domains via env var
const ZOHO_BASE = process.env.ZOHO_API_BASE || 'https://www.zohoapis.eu/crm/v2';

// Serve static files (map HTML + data JSON) from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
// Inline CORS (no cors package needed)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '5mb' }));

// ---------------------------------------------------------------------------
// In-memory token store
// ---------------------------------------------------------------------------
let zohoToken = null;

/**
 * Build the Authorization header value for Zoho API calls.
 */
function authHeader() {
  return `Zoho-oauthtoken ${zohoToken}`;
}

/**
 * Middleware that rejects requests when no token has been stored yet.
 */
function requireToken(req, res, next) {
  if (!zohoToken) {
    return res.status(401).json({
      success: false,
      error: 'No Zoho token configured. POST to /api/zoho/auth first.',
    });
  }
  next();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generic wrapper around fetch for Zoho CRM API calls.
 * Returns { ok, status, data } where `data` is the parsed JSON body.
 */
async function zohoRequest(method, path, body) {
  const url = `${ZOHO_BASE}${path}`;
  const options = {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { ok: response.ok, status: response.status, data };
}

/**
 * Wrap an async route handler so that thrown errors are caught and forwarded
 * as a 500 JSON response.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(`[zoho-proxy] ${req.method} ${req.path} error:`, err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    });
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * Health check
 */
app.get('/api/zoho/health', (_req, res) => {
  res.json({
    success: true,
    tokenConfigured: !!zohoToken,
    uptime: process.uptime(),
  });
});

// ---- AUTH -----------------------------------------------------------------

/**
 * POST /api/zoho/auth
 * Store the Zoho OAuth token in memory.
 * Body: { "token": "1000.xxxxx.yyyyy" }
 */
app.post(
  '/api/zoho/auth',
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "token" in request body.',
      });
    }

    zohoToken = token.trim();
    console.log('[zoho-proxy] Token stored successfully.');
    res.json({ success: true, message: 'Token stored.' });
  })
);

// ---- CREATE COMPANY (Account) ---------------------------------------------

/**
 * POST /api/zoho/company
 * Create an Account record in Zoho CRM.
 * Body: { "Account_Name": "...", "Phone": "...", "Website": "...", ...extraFields }
 */
app.post(
  '/api/zoho/company',
  requireToken,
  asyncHandler(async (req, res) => {
    const payload = req.body;
    if (!payload || !payload.Account_Name) {
      return res.status(400).json({
        success: false,
        error: '"Account_Name" is required.',
      });
    }

    const result = await zohoRequest('POST', '/Accounts', {
      data: [payload],
    });

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        error: 'Zoho API error',
        zoho: result.data,
      });
    }

    const record = result.data?.data?.[0];
    res.json({
      success: true,
      id: record?.details?.id || null,
      zoho: result.data,
    });
  })
);

// ---- CREATE CONTACT -------------------------------------------------------

/**
 * POST /api/zoho/contact
 * Create a Contact record in Zoho CRM.
 * Body: { "First_Name": "...", "Last_Name": "...", "Email": "...", ...extraFields }
 */
app.post(
  '/api/zoho/contact',
  requireToken,
  asyncHandler(async (req, res) => {
    const payload = req.body;
    if (!payload || !payload.Last_Name) {
      return res.status(400).json({
        success: false,
        error: '"Last_Name" is required.',
      });
    }

    const result = await zohoRequest('POST', '/Contacts', {
      data: [payload],
    });

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        error: 'Zoho API error',
        zoho: result.data,
      });
    }

    const record = result.data?.data?.[0];
    res.json({
      success: true,
      id: record?.details?.id || null,
      zoho: result.data,
    });
  })
);

// ---- CREATE NOTE ----------------------------------------------------------

/**
 * POST /api/zoho/note
 * Create a Note attached to a record in Zoho CRM.
 * Body: {
 *   "Note_Title": "...",
 *   "Note_Content": "...",
 *   "parent_module": "Accounts",   // or "Contacts", "Leads", etc.
 *   "parent_id": "000000000000"
 * }
 */
app.post(
  '/api/zoho/note',
  requireToken,
  asyncHandler(async (req, res) => {
    const { Note_Title, Note_Content, parent_module, parent_id } = req.body;

    if (!Note_Content) {
      return res.status(400).json({
        success: false,
        error: '"Note_Content" is required.',
      });
    }
    if (!parent_id) {
      return res.status(400).json({
        success: false,
        error: '"parent_id" is required.',
      });
    }

    const notePayload = {
      Note_Title: Note_Title || 'Note',
      Note_Content,
      $se_module: parent_module || 'Accounts',
      Parent_Id: { id: parent_id },
    };

    const result = await zohoRequest('POST', '/Notes', {
      data: [notePayload],
    });

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        error: 'Zoho API error',
        zoho: result.data,
      });
    }

    const record = result.data?.data?.[0];
    res.json({
      success: true,
      id: record?.details?.id || null,
      zoho: result.data,
    });
  })
);

// ---- BULK IMPORT ----------------------------------------------------------

/**
 * POST /api/zoho/bulk-import
 * Create multiple Account records in Zoho CRM.
 * Zoho allows up to 100 records per request, so we batch automatically.
 *
 * Body: {
 *   "companies": [
 *     { "Account_Name": "...", "Phone": "...", ... },
 *     ...
 *   ]
 * }
 */
app.post(
  '/api/zoho/bulk-import',
  requireToken,
  asyncHandler(async (req, res) => {
    const { companies } = req.body;

    if (!Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({
        success: false,
        error: '"companies" must be a non-empty array.',
      });
    }

    // Validate every entry has at least an Account_Name
    const invalid = companies.filter((c) => !c.Account_Name);
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        error: `${invalid.length} record(s) missing "Account_Name".`,
      });
    }

    const BATCH_SIZE = 100; // Zoho CRM limit per request
    const batches = [];
    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      batches.push(companies.slice(i, i + BATCH_SIZE));
    }

    const results = [];
    let created = 0;
    let failed = 0;

    for (const batch of batches) {
      const result = await zohoRequest('POST', '/Accounts', {
        data: batch,
      });

      if (result.ok && result.data?.data) {
        for (const record of result.data.data) {
          if (record.status === 'success') {
            created++;
          } else {
            failed++;
          }
        }
      } else {
        // Entire batch failed
        failed += batch.length;
      }

      results.push({
        batchSize: batch.length,
        ok: result.ok,
        status: result.status,
        zoho: result.data,
      });
    }

    res.json({
      success: failed === 0,
      summary: {
        total: companies.length,
        created,
        failed,
        batches: batches.length,
      },
      results,
    });
  })
);

// ---------------------------------------------------------------------------
// POST /api/zoho/send-email — Send email via Zoho Mail/CRM
// ---------------------------------------------------------------------------
app.post('/api/zoho/send-email', asyncHandler(async (req, res) => {
  requireToken(res);
  const { to, subject, body } = req.body;
  if (!to || !subject) {
    return res.status(400).json({ success: false, error: 'to and subject are required' });
  }

  // Use Zoho CRM's send mail API
  const result = await zohoFetch('/crm/v2/functions/send_mail/actions/execute?auth_type=apikey', {
    method: 'POST',
    body: JSON.stringify({
      arguments: {
        to_email: to,
        subject: subject,
        body_content: body || '',
      }
    }),
  });

  // Fallback: If CRM send_mail function doesn't work, try creating an email activity
  if (!result.ok) {
    // Log as a note instead
    const noteResult = await zohoFetch('/crm/v2/Notes', {
      method: 'POST',
      body: JSON.stringify({
        data: [{
          Note_Title: 'Email sent to ' + to,
          Note_Content: 'Subject: ' + subject + '\n\n' + (body || ''),
        }]
      }),
    });
    return res.json({
      success: true,
      method: 'logged_as_note',
      note: noteResult.data,
      message: 'Email logged as a note. Open your mail client to actually send the email.'
    });
  }

  res.json({ success: true, zoho: result.data });
}));

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[zoho-proxy] Running on http://localhost:${PORT}`);
  console.log(`[zoho-proxy] POST /api/zoho/auth   — store OAuth token`);
  console.log(`[zoho-proxy] POST /api/zoho/company — create Account`);
  console.log(`[zoho-proxy] POST /api/zoho/contact — create Contact`);
  console.log(`[zoho-proxy] POST /api/zoho/note    — create Note`);
  console.log(`[zoho-proxy] POST /api/zoho/bulk-import — bulk create Accounts`);
  console.log(`[zoho-proxy] GET  /api/zoho/health   — health check`);
});
