const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || ROOT;
const DATA_FILE = path.join(DATA_DIR, 'patients-data.json');
const PAGE_FILE = path.join(ROOT, 'clinic-patient-manager.html');
const APP_USER = process.env.APP_USER || 'admin';
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const MEMORY_ONLY = process.env.MEMORY_ONLY === 'true' || process.env.MEMORY_ONLY === '1';
const AUTO_CLEAR_DAILY = process.env.AUTO_CLEAR_DAILY !== 'false';
const TZ_OFFSET_MINUTES = Number(process.env.TZ_OFFSET_MINUTES || 480);
let memoryStore = { date: todayKey(), patients: [] };

if (!MEMORY_ONLY) fs.mkdirSync(DATA_DIR, { recursive: true });

function todayKey() {
  const now = new Date();
  const shifted = new Date(now.getTime() + TZ_OFFSET_MINUTES * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function normalizeStore(value) {
  if (Array.isArray(value)) return { date: todayKey(), patients: value };
  if (value && Array.isArray(value.patients)) {
    return {
      date: value.date || todayKey(),
      patients: value.patients
    };
  }
  return { date: todayKey(), patients: [] };
}

function freshStore(store) {
  const normalized = normalizeStore(store);
  if (AUTO_CLEAR_DAILY && normalized.date !== todayKey()) {
    return { date: todayKey(), patients: [] };
  }
  return normalized;
}

function isAuthorized(req) {
  if (!APP_PASSWORD) return true;

  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;

  try {
    const token = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const index = token.indexOf(':');
    const user = token.slice(0, index);
    const password = token.slice(index + 1);
    return user === APP_USER && password === APP_PASSWORD;
  } catch {
    return false;
  }
}

function requestLogin(res) {
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Clinic Patient Manager"',
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end('需要登录后访问');
}

function readStore() {
  if (MEMORY_ONLY) {
    memoryStore = freshStore(memoryStore);
    return memoryStore;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const store = freshStore(JSON.parse(raw));
    if (AUTO_CLEAR_DAILY && store.date === todayKey()) writeStore(store.patients);
    return store;
  } catch {
    return { date: todayKey(), patients: [] };
  }
}

function writeStore(patients) {
  const store = { date: todayKey(), patients };
  if (MEMORY_ONLY) {
    memoryStore = store;
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end(body);
}

function localAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) addresses.push(net.address);
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  if (!isAuthorized(req)) {
    requestLogin(res);
    return;
  }

  if (req.url === '/api/patients' && req.method === 'GET') {
    send(res, 200, JSON.stringify(readStore().patients), 'application/json; charset=utf-8');
    return;
  }

  if (req.url === '/api/patients' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) req.socket.destroy();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '[]');
        if (!Array.isArray(data)) throw new Error('patients must be an array');
        writeStore(data);
        send(res, 200, JSON.stringify({ ok: true, date: todayKey() }), 'application/json; charset=utf-8');
      } catch {
        send(res, 400, JSON.stringify({ ok: false }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (req.url === '/' || req.url === '/clinic-patient-manager.html') {
    fs.readFile(PAGE_FILE, (err, data) => {
      if (err) send(res, 404, '页面文件不存在');
      else send(res, 200, data, 'text/html; charset=utf-8');
    });
    return;
  }

  send(res, 404, 'Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`门诊患者管理已启动：http://localhost:${PORT}`);
  if (MEMORY_ONLY) console.log('数据保存模式：临时内存，不持久保存');
  else console.log(`数据保存位置：${DATA_FILE}`);
  if (AUTO_CLEAR_DAILY) console.log(`每日自动清空：开启，日期时区 UTC+${TZ_OFFSET_MINUTES / 60}`);
  if (APP_PASSWORD) console.log(`登录用户名：${APP_USER}`);
  for (const address of localAddresses()) {
    console.log(`手机访问地址：http://${address}:${PORT}`);
  }
});
