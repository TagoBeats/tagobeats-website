const RESEND_API = 'https://api.resend.com'

// Trial gate for /tagoclip-pro. The trial itself runs without an account in
// the plugin, so without this the page never learns who is trying Pro and the
// trial mails below would have no one to go to.
//
// On submit: store the address like api/lead.js does (own list in Upstash),
// then schedule two mails with Resend's scheduled_at (up to 30 days ahead,
// no cron needed): tips on day 1, "trial ends soon" on day 5. The page starts
// the Moonbase download right after this answers.
//
// Layout (Upstash Redis):
//   tago:contacts                     SET   every address that ever opted in
//   tago:contacts:tagoclip-pro-trial  SET   trial segment
//   tago:first_seen / tago:last_seen  HASH  email -> ISO timestamp
//   tago:trials                       LIST  JSON per trial signup, newest first
//   tago:trial:rl:<ip>                STRING signups per IP in the current hour

const FROM = 'Robin from TagoBeats <plugins@robinbusse.dev>'
const PAGE = 'https://tagobeats.com/tagoclip-pro'
// End of the Moonbase "Launch price" discount, same date as js/tagoclip-pro-cta.js.
const INTRO_END = Date.parse('2026-12-05T08:00:00Z')
const DAY = 86400000
const MAX_PER_HOUR = 5

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

function wrapHtml(paragraphs, unsubUrl) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#B5AFA4;">${p}</p>`)
    .join('')
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
  <body style="margin:0;padding:0;background-color:#0A0908;background-image:linear-gradient(#0A0908,#0A0908);">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A0908" style="background-color:#0A0908;background-image:linear-gradient(#0A0908,#0A0908);">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 4px 18px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#00FDDC;background-image:linear-gradient(#00FDDC,#00FDDC);"></span>
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:3px;color:#ECE7DE;">&nbsp;TAGOBEATS</span>
        </td></tr>
        <tr><td bgcolor="#1A1815" style="background-color:#1A1815;background-image:linear-gradient(#1A1815,#1A1815);border:1px solid #2A2723;border-radius:10px;padding:28px 32px 14px;">${body}</td></tr>
        <tr><td style="padding:18px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6A655C;">
          Robin (TagoBeats) &middot; <a href="https://tagobeats.com" style="color:#00FDDC;text-decoration:none;">tagobeats.com</a><br>
          <a href="${unsubUrl}" style="color:#8A857C;text-decoration:underline;">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}

function link(href, label) {
  return `<a href="${href}" style="color:#00FDDC;text-decoration:none;font-weight:bold;">${label}</a>`
}

function tipsMail(unsubUrl) {
  const lines = [
    'Hey, Robin here. You grabbed the TagoClip Pro trial yesterday.',
    'In case it isn\'t running yet: open the plugin, click Activate and pick the free trial, that starts the 7 days. On Windows the installer isn\'t signed yet, so SmartScreen asks once. Click More info, then Run anyway.',
    'Three things worth trying first:',
    '1. Put it on your 808 or drum bus, pick FRUITY and push the drive. Then hit LINK, so you compare the clipping and not just the extra loudness.',
    '2. Set the true peak ceiling to -1.0 on your master and push hard. Whatever you do before it, nothing gets past.',
    '3. Click DELTA to hear only what the clipper takes off. If you hear the kick or the vocal in there, back off.',
    'If something looks off or doesn\'t load, just reply to this mail. It reaches me directly.',
  ]
  return {
    subject: '3 things to try in TagoClip Pro',
    text: [...lines, '', `Robin (TagoBeats)`, PAGE, '', `Unsubscribe: ${unsubUrl}`].join('\n\n'),
    html: wrapHtml(lines, unsubUrl),
  }
}

function endingMail(unsubUrl, saleOn) {
  const lines = [
    'Hey, your TagoClip Pro trial runs out in about two days. After that the plugin passes audio through untouched, your projects stay as they are.',
    saleOn
      ? `If it earned its spot in your chain, the launch price is still on: $29 instead of $49, until December 4. ${link(PAGE, 'Get TagoClip Pro')}`
      : `If it earned its spot in your chain, you can keep it here: ${link(PAGE, 'Get TagoClip Pro')}`,
    'One payment, no subscription, 3 activations. Already bought it? Then ignore this one, and thanks.',
    'And if it didn\'t click for you, I\'d really like to know why. Just hit reply.',
  ]
  const textLines = lines.map((l) => l.replace(/<a [^>]*>([^<]*)<\/a>/g, `$1: ${PAGE}`))
  return {
    subject: 'Your TagoClip Pro trial ends soon',
    text: [...textLines, '', 'Robin (TagoBeats)', '', `Unsubscribe: ${unsubUrl}`].join('\n\n'),
    html: wrapHtml(lines, unsubUrl),
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const body = req.body || {}
  if (String(body.website || '').trim()) {
    return res.status(200).json({ ok: true })
  }

  const email = String(body.email || '').trim().toLowerCase().slice(0, 200)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'That email address looks off.' })
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const now = new Date()
  const iso = now.toISOString()

  let unsubscribed = false
  try {
    const rl = await redis([
      ['INCR', `tago:trial:rl:${ip}`],
      ['EXPIRE', `tago:trial:rl:${ip}`, 3600, 'NX'],
      ['SISMEMBER', 'tago:unsub', email],
    ])
    if (rl && rl[0] && rl[0].result > MAX_PER_HOUR) {
      return res.status(429).json({ error: 'Too many tries, give it an hour.' })
    }
    unsubscribed = !!(rl && rl[2] && rl[2].result === 1)
    await redis([
      ['SADD', 'tago:contacts', email],
      ['SADD', 'tago:contacts:tagoclip-pro-trial', email],
      ['HSETNX', 'tago:first_seen', email, iso],
      ['HSET', 'tago:last_seen', email, iso],
      ['LPUSH', 'tago:trials', JSON.stringify({ at: iso, email })],
      ['LTRIM', 'tago:trials', 0, 4999],
    ])
  } catch (err) {
    // Never block the download over the store.
    console.error('[trial] Upstash failed', err)
  }

  const apiKey = process.env.RESEND_API_KEY
  // Someone who unsubscribed earlier still gets the download, but no mails.
  if (!apiKey || unsubscribed) {
    if (!apiKey) console.log(`[trial] (no Resend key) ${email}`)
    return res.status(200).json({ ok: true })
  }

  const unsubUrl = `https://tagobeats.com/api/unsubscribe?e=${encodeURIComponent(email)}`
  const day5 = new Date(now.getTime() + 5 * DAY)
  const mails = [
    { at: new Date(now.getTime() + 1 * DAY), ...tipsMail(unsubUrl) },
    { at: day5, ...endingMail(unsubUrl, day5.getTime() < INTRO_END) },
  ]

  await Promise.all(
    mails.map((m) =>
      fetch(`${RESEND_API}/emails`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          reply_to: 'info@tagobeats.com',
          subject: m.subject,
          text: m.text,
          html: m.html,
          scheduled_at: m.at.toISOString(),
          headers: {
            'List-Unsubscribe': `<${unsubUrl}>, <mailto:plugins@robinbusse.dev?subject=unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      })
        .then(async (r) => {
          if (!r.ok) console.error('[trial] Resend schedule error', r.status, await r.text().catch(() => ''))
        })
        .catch((err) => console.error('[trial] Resend request failed', err))
    )
  )

  return res.status(200).json({ ok: true })
}
