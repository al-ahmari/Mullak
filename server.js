const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { google } = require('googleapis');
const { z } = require('zod');

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const leadsFile = path.join(dataDir, 'leads.json');
const sheetId = process.env.GOOGLE_SHEET_ID || '';
const sheetName = process.env.GOOGLE_SHEET_NAME || 'Leads';
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const serviceAccountPrivateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const sheetsSyncEnabled = Boolean(sheetId && serviceAccountEmail && serviceAccountPrivateKey);

const leadSchema = z.object({
  name: z.string().trim().min(2, 'الاسم مطلوب').max(100, 'الاسم طويل جدًا'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+966|0)?5\d{8}$/, 'رقم الجوال غير صحيح'),
  units: z.enum(['3 - 5 وحدات', '6 - 10 وحدات', '11 - 20 وحدة', 'أكثر من 20 وحدة'], {
    errorMap: () => ({ message: 'اختر عدد الوحدات' })
  }),
  city: z.string().trim().max(80, 'اسم المدينة طويل جدًا').optional().or(z.literal('')),
  notes: z.string().trim().max(1000, 'الوصف طويل جدًا').optional().or(z.literal(''))
});

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'تم تجاوز عدد المحاولات المسموح بها مؤقتًا. حاول مرة أخرى بعد قليل.'
  }
});

app.disable('x-powered-by');
app.use(express.json({ limit: '25kb' }));
app.use(express.urlencoded({ extended: false, limit: '25kb' }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

async function ensureStorageReady() {
  await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });

  try {
    await fs.access(leadsFile);
  } catch {
    await fs.writeFile(leadsFile, '[]\n', { encoding: 'utf8', mode: 0o600 });
  }

  await fs.chmod(dataDir, 0o700);
  await fs.chmod(leadsFile, 0o600);
}

async function readLeads() {
  await ensureStorageReady();
  const raw = await fs.readFile(leadsFile, 'utf8');
  return JSON.parse(raw);
}

async function writeLeads(leads) {
  await ensureStorageReady();
  const tempFile = `${leadsFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(leads, null, 2) + '\n', {
    encoding: 'utf8',
    mode: 0o600
  });
  await fs.rename(tempFile, leadsFile);
  await fs.chmod(leadsFile, 0o600);
}

let sheetsClientPromise;

async function getSheetsClient() {
  if (!sheetsSyncEnabled) {
    return null;
  }

  if (!sheetsClientPromise) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: serviceAccountPrivateKey
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    sheetsClientPromise = auth.getClient().then((authClient) => google.sheets({ version: 'v4', auth: authClient }));
  }

  return sheetsClientPromise;
}

async function appendLeadToSheet(submission) {
  const sheets = await getSheetsClient();

  if (!sheets) {
    return;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:G`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        submission.submittedAt,
        submission.id,
        submission.name,
        submission.phone,
        submission.units,
        submission.city || '',
        submission.notes || ''
      ]]
    }
  });
}

app.get('/', (_req, res) => {
  res.sendFile(path.join(rootDir, 'landing-page-arabic.html'));
});

app.get('/landing-page-arabic.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(rootDir, 'landing-page-arabic.js'));
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/leads', leadLimiter, async (req, res) => {
  const parsed = leadSchema.safeParse(req.body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return res.status(400).json({
      ok: false,
      message: firstIssue ? firstIssue.message : 'البيانات غير مكتملة'
    });
  }

  try {
    const leads = await readLeads();
    const submission = {
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      ...parsed.data
    };

    leads.push(submission);
    await writeLeads(leads);
    await appendLeadToSheet(submission);

    return res.status(201).json({
      ok: true,
      message: 'تم حفظ بياناتك بنجاح. سنتواصل معك قريبًا.'
    });
  } catch (error) {
    console.error('Failed to store lead', error);
    return res.status(500).json({
      ok: false,
      message: 'حدث خطأ أثناء حفظ البيانات. حاول مرة أخرى.'
    });
  }
});

ensureStorageReady()
  .then(() => {
    app.listen(port, () => {
      console.log(`Mullak app running at http://localhost:${port}`);
      console.log(`Leads are stored in ${leadsFile}`);
      console.log(
        sheetsSyncEnabled
          ? `Google Sheets sync enabled for ${sheetName} in ${sheetId}`
          : 'Google Sheets sync disabled; set GOOGLE_SHEET_ID and service account env vars to enable it'
      );
    });
  })
  .catch((error) => {
    console.error('Failed to initialize storage', error);
    process.exit(1);
  });
