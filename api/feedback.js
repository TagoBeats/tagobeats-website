const RESEND_API = 'https://api.resend.com'

// Feedback from the floating button on the plugin pages (js/tago-feedback.js).
// Every message is kept in Upstash and mailed to info@tagobeats.com. An email
// address given here is only for a reply: it never enters tago:contacts,
// because leaving feedback is not consent to the plugin mails.
//
// Layout (Upstash Redis, REST API):
//   tago:feedback          LIST    newest first, JSON per entry, capped at 2,000
//   tago:feedback:rl:<ip>  STRING  submissions per IP in the current hour

const PRODUCTS = {
  'tagoclip-pro': 'TagoClip Pro',
  tagoclip: 'TagoClip',
  tagopitch: 'TagoPitch',
  other: 'Other',
}
const MAX_PER_HOUR = 5
const MAX_LEN = 2000

async function redis(commands) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new Error(`Upstash ${res.status}`)
  return res.json()
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body || {}
  // Honeypot: a field people never see. Bots fill it, get a normal answer,
  // and nothing is stored or sent.
  if (String(body.website || '').trim()) {
    return res.status(200).json({ ok: true })
  }

  const message = String(body.message || '').trim().slice(0, MAX_LEN)
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200)
  const productKey = Object.prototype.hasOwnProperty.call(PRODUCTS, body.product) ? body.product : 'other'
  const page = String(body.page || '').slice(0, 200)
  const ua = String(req.headers['user-agent'] || '').slice(0, 300)

  if (message.length < 3) {
    return res.status(400).json({ error: 'Please write a few words.' })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'That email address looks off.' })
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const entry = { at: new Date().toISOString(), product: productKey, message, email, page, ua }

  try {
    const rl = await redis([
      ['INCR', `tago:feedback:rl:${ip}`],
      ['EXPIRE', `tago:feedback:rl:${ip}`, 3600, 'NX'],
    ])
    if (rl && rl[0] && rl[0].result > MAX_PER_HOUR) {
      return res.status(429).json({ error: 'Thanks, that is plenty for now. Try again in an hour.' })
    }
    await redis([
      ['LPUSH', 'tago:feedback', JSON.stringify(entry)],
      ['LTRIM', 'tago:feedback', 0, 1999],
    ])
  } catch (err) {
    // The mail below still carries the message, so a store hiccup loses nothing.
    console.error('[feedback] Upstash failed', err)
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[feedback] (no Resend key)', JSON.stringify(entry))
    return res.status(200).json({ ok: true })
  }

  const product = PRODUCTS[productKey]
  const text = [
    `Product: ${product}`,
    `From: ${email || '(no email)'}`,
    `Page: ${page || '-'}`,
    `Browser: ${ua || '-'}`,
    `Time: ${entry.at}`,
    '',
    message,
  ].join('\n')

  try {
    const send = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'TagoBeats Feedback <plugins@robinbusse.dev>',
        to: ['info@tagobeats.com'],
        // Answering the mail goes straight to the sender when they left an address.
        ...(email ? { reply_to: email } : {}),
        subject: `[Feedback] ${product}: ${message.replace(/\s+/g, ' ').slice(0, 60)}`,
        text,
      }),
    })
    if (!send.ok) {
      console.error('[feedback] Resend error', send.status, await send.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[feedback] Resend request failed', err)
  }

  return res.status(200).json({ ok: true })
}
