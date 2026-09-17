const RESEND_API = 'https://api.resend.com'

// One-click + manual unsubscribe for the Tago plugins mailing list.
//
// The download mail carries two List-Unsubscribe targets (RFC 2369/8058):
//   - a mailto: fallback for older clients
//   - this https endpoint for Gmail/Apple one-click
// Gmail sends a background POST (List-Unsubscribe-Post: List-Unsubscribe=One-Click)
// with the recipient's address in ?e=. A human clicking the link hits GET and
// sees a small confirmation page. Both mark the contact unsubscribed in our
// own store (tago:unsub) and, as long as it still holds the address, in the
// Resend audience.
//
// The own store is the one that counts: past Resend's 1,000-contact free tier
// cap, new addresses only exist in Upstash, so a Resend-only opt-out would be
// lost and the person would keep getting mail. scripts/broadcast.mjs subtracts
// tago:unsub from every send.

async function markUnsubscribedOwnStore(email) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.log(`[unsubscribe] (no Upstash creds) ${email}`)
    return true
  }
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SADD', 'tago:unsub', email],
        ['HSET', 'tago:unsub_at', email, new Date().toISOString()],
      ]),
    })
    if (!res.ok) {
      console.error('[unsubscribe] Upstash error', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (err) {
    console.error('[unsubscribe] Upstash request failed', err)
    return false
  }
}

async function markUnsubscribedResend(email) {
  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID
  if (!apiKey || !audienceId) {
    console.log(`[unsubscribe] (no Resend creds) ${email}`)
    return true
  }
  // Resend lets you address a contact by email in the path.
  // 404 means the address never made it into the audience (cap reached), which
  // is fine: the own store above already has the opt-out.
  const res = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ unsubscribed: true }),
  })
  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}))
    console.error('[unsubscribe] Resend error', res.status, data)
    return false
  }
  return true
}

async function markUnsubscribed(email) {
  const [own, resend] = await Promise.all([
    markUnsubscribedOwnStore(email),
    markUnsubscribedResend(email),
  ])
  // Only report failure if the opt-out landed nowhere. One store being down
  // must not tell someone their unsubscribe did not work when it did.
  return own || resend
}

function page(body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TagoBeats mailing list</title>
<style>
  html,body{margin:0;height:100%;background:#0A0908;color:#ECE7DE;
    font-family:-apple-system,Segoe UI,Arial,sans-serif;display:grid;place-items:center}
  .card{max-width:420px;padding:40px 32px;text-align:center;line-height:1.6}
  h1{font-size:20px;margin:0 0 10px} p{color:#B5AFA4;font-size:15px;margin:0}
  a{color:#00FDDC;text-decoration:none}
</style></head><body><div class="card">${body}</div></body></html>`
}

module.exports = async function handler(req, res) {
  const email = String((req.query && req.query.e) || '').trim().toLowerCase()
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // Gmail/Apple one-click: POST, no UI expected. Always 200 so the client
  // never reports the unsubscribe as failed.
  if (req.method === 'POST') {
    if (valid) await markUnsubscribed(email).catch(() => {})
    return res.status(200).json({ ok: true })
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed')
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (!valid) {
    return res.status(400).send(page('<h1>Invalid link</h1><p>This unsubscribe link is malformed.</p>'))
  }
  const ok = await markUnsubscribed(email).catch(() => false)
  if (!ok) {
    return res.status(502).send(page(`<h1>Something went wrong</h1><p>Couldn't unsubscribe right now. Reply to any mail and I'll remove you by hand. &mdash; Robin</p>`))
  }
  return res.status(200).send(page(`<h1>You're unsubscribed</h1><p>${email} won't get any more Tago plugin mails. Changed your mind? Just grab a plugin again on <a href="https://tagobeats.com">tagobeats.com</a>.</p>`))
}
