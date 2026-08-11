require('dotenv').config();
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT || 3001);
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

let qrDataUrl = null;
let state = 'starting';
let account = null;
let lastError = null;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: process.env.WA_SESSION_PATH || './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
});

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').replace(/^0+/, '');
}

async function findOrCreateLead(msg) {
  if (!supabase) return null;
  const phone = normalizePhone(msg.from.split('@')[0]);
  if (!phone) return null;

  const { data: existing, error: findError } = await supabase
    .from('leads').select('*').eq('phone', phone).limit(1).maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  let name = phone;
  try {
    const contact = await msg.getContact();
    name = contact.pushname || contact.name || contact.shortName || phone;
  } catch (_) {}

  const { data: created, error } = await supabase.from('leads').insert({
    name,
    phone,
    source: 'WhatsApp',
    status: 'New',
    score: 50,
    value: 0,
    last_message: msg.body || ''
  }).select('*').single();
  if (error) throw error;
  return created;
}

async function saveInbound(msg) {
  if (!supabase || msg.fromMe || msg.from === 'status@broadcast') return;
  const lead = await findOrCreateLead(msg);
  if (!lead) return;
  await supabase.from('messages').upsert({
    lead_id: lead.id,
    wa_message_id: msg.id?._serialized || null,
    direction: 'inbound',
    body: msg.body || '[media]',
    status: 'received'
  }, { onConflict: 'wa_message_id' });
  await supabase.from('leads').update({ last_message: msg.body || '[media]', updated_at: new Date().toISOString() }).eq('id', lead.id);
}

client.on('qr', async qr => {
  state = 'qr';
  account = null;
  qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
});
client.on('authenticated', () => { state = 'authenticated'; qrDataUrl = null; });
client.on('ready', () => {
  state = 'connected';
  lastError = null;
  account = client.info ? {
    wid: client.info.wid?._serialized || null,
    pushname: client.info.pushname || null,
    platform: client.info.platform || null
  } : null;
});
client.on('auth_failure', message => { state = 'auth_failure'; lastError = message; });
client.on('disconnected', reason => { state = 'disconnected'; lastError = reason; account = null; });
client.on('message', msg => saveInbound(msg).catch(err => { lastError = err.message; console.error(err); }));

app.get('/health', (req, res) => res.json({ ok: true, state, account, lastError }));
app.get('/qr', (req, res) => res.json({ state, qr: qrDataUrl, account, lastError }));

app.post('/send', async (req, res) => {
  try {
    if (state !== 'connected') return res.status(409).json({ error: 'WhatsApp is not connected', state });
    const phone = normalizePhone(req.body.phone);
    const body = String(req.body.body || '').trim();
    if (!phone || !body) return res.status(400).json({ error: 'phone and body are required' });
    const chatId = `${phone}@c.us`;
    const sent = await client.sendMessage(chatId, body);

    if (supabase) {
      const { data: lead } = await supabase.from('leads').select('id').eq('phone', phone).limit(1).maybeSingle();
      if (lead) {
        await supabase.from('messages').insert({ lead_id: lead.id, wa_message_id: sent.id?._serialized || null, direction: 'outbound', body, status: 'sent' });
        await supabase.from('leads').update({ last_message: body, updated_at: new Date().toISOString() }).eq('id', lead.id);
      }
    }
    res.json({ ok: true, id: sent.id?._serialized || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/logout', async (req, res) => {
  try { await client.logout(); state = 'disconnected'; account = null; qrDataUrl = null; res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`LeadFlow WhatsApp connector listening on :${PORT}`));
client.initialize().catch(err => { state = 'error'; lastError = err.message; console.error(err); });
