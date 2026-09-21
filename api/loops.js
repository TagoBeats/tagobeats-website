const RESEND_API = 'https://api.resend.com'

// Single source of truth for the loop catalog: this GET response feeds the
// /loops page, and the same list validates what POST is allowed to mail out.
// Never trust a loop id or URL from the client, always resolve through this
// list, otherwise the gate becomes a way to mail arbitrary links through our
// Resend account.
const LOOPS = require('./_loops-data.js')

const RELATIVE_BASE = '/uploads_opt/loops/'

// Full files live in a GitHub release, not in this repo: the catalog is well
// over a gigabyte of audio, which has no business in git or in a deployment,
// and GitHub carries the download traffic for free. The repo must stay
// public, a private one answers 404 to anonymous downloads.
const DOWNLOAD_BASE = 'https://github.com/TagoBeats/loops/releases/download/v1/'

// Relative path for the page's own <audio> preview: the CSP is default-src
// 'self', and an absolute https://tagobeats.com/... URL fails that same-origin
// check on any host that isn't literally tagobeats.com (local dev, preview
// deploys). The mailed links need an absolute URL instead, since they're
// opened outside the page.
function previewUrl(loop) {
  return `${RELATIVE_BASE}${loop.preview}`
}
function downloadUrl(loop) {
  return `${DOWNLOAD_BASE}${encodeURIComponent(loop.download)}`
}
function coverUrl(loop) {
  return `${RELATIVE_BASE}covers/${loop.id}.jpg`
}
// Same artwork with the burned-in wordmark cropped off, for the hero strip
// where six of them sit side by side and the wordmarks would line up into a
// row of letter mush.
function heroUrl(loop) {
  return `${RELATIVE_BASE}covers/hero/${loop.id}.jpg`
}
function metaLine(loop) {
  return loop.key ? `${loop.bpm} BPM, ${loop.key}` : `${loop.bpm} BPM`
}

function downloadEmail(loops, unsubUrl) {
  const links = loops.map((l) => `${l.title} (${metaLine(l)}): ${downloadUrl(l)}`).join('\n')
  const text = [
    `Hey, here are the ${loops.length} loop${loops.length === 1 ? '' : 's'} you picked:`,
    '',
    links,
    '',
    'All royalty-free, use them in whatever you build.',
    'If one of them turns into a real record, hit reply and tell me, I want to hear it.',
    '',
    'Robin (TagoBeats)',
    'https://tagobeats.com',
    '',
    `Only want this and no future plugin drops? Unsubscribe: ${unsubUrl}`,
  ].join('\n')

  const rows = loops
    .map(
      (l) => `
                <tr><td style="padding-bottom:10px;">
                  <a href="${downloadUrl(l)}" style="display:block;background-color:#26231F;background-image:linear-gradient(#26231F,#26231F);color:#ECE7DE;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.5px;text-decoration:none;text-align:left;padding:14px 18px;border-radius:3px;border:1px solid #3A362F;">${l.title} <span style="font-weight:normal;color:#8A857C;">&middot; ${metaLine(l)}</span> &nbsp;&rarr;</a>
                </td></tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <style>
      :root { color-scheme: dark; supported-color-schemes: dark; }
      @media (prefers-color-scheme: dark) {
        body, .tb-bg { background-color: #0A0908 !important; }
        .tb-card { background-color: #1A1815 !important; }
      }
    </style>
  </head>
  <body class="tb-bg" style="margin:0;padding:0;background-color:#0A0908;background-image:linear-gradient(#0A0908,#0A0908);">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tb-bg" bgcolor="#0A0908" style="background-color:#0A0908;background-image:linear-gradient(#0A0908,#0A0908);">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <tr><td style="padding:0 4px 18px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#00FDDC;background-image:linear-gradient(#00FDDC,#00FDDC);"></span>
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:3px;color:#ECE7DE;">&nbsp;TAGOBEATS</span>
        </td></tr>

        <tr><td class="tb-card" bgcolor="#1A1815" style="background-color:#1A1815;background-image:linear-gradient(#1A1815,#1A1815);border:1px solid #2A2723;border-radius:10px;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:28px 32px 32px;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#F2EEE6;padding-bottom:14px;">Your loops</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#B5AFA4;padding-bottom:20px;">Here ${loops.length === 1 ? 'is the loop' : `are the ${loops.length} loops`} you picked:</div>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">${rows}
              </table>

              <div style="margin-top:18px;padding-top:16px;border-top:1px solid #2A2723;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#8A857C;">All royalty-free, use them in whatever you build. If one of them turns into a real record, hit reply and tell me, I want to hear it.</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:22px 4px 0;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8A857C;">
            Robin (TagoBeats) &middot; <a href="https://tagobeats.com" style="color:#00FDDC;text-decoration:none;">tagobeats.com</a><br>
            <span style="color:#6A655C;">Just here for the loops? <a href="${unsubUrl}" style="color:#8A857C;text-decoration:underline;">Unsubscribe</a> from future plugin drops.</span>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
  </body>
  </html>`

  return { subject: `Your ${loops.length} TagoBeats loop${loops.length === 1 ? '' : 's'}`, text, html }
}

// Same store as api/lead.js, new segment "loops". SADD is idempotent, so an
// address already on the list is never duplicated, it just also joins the
// loops segment. That covers Robin's "don't re-enter someone already on the
// list" requirement without any extra lookup.
async function storeContact(email) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.log(`[loops] (no Upstash creds) ${email}`)
    return
  }
  const now = new Date().toISOString()
  try {
    const store = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SADD', 'tago:contacts', email],
        ['SADD', 'tago:contacts:loops', email],
        ['HSETNX', 'tago:first_seen', email, now],
        ['HSET', 'tago:last_seen', email, now],
      ]),
    })
    if (!store.ok) {
      console.error('[loops] Upstash store error', store.status, await store.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[loops] Upstash request failed', err)
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    // Preview is free, no gate: the page needs titles + URLs to let people
    // play loops before picking any, same as the audio already public on the
    // demo pages.
    return res.status(200).json({
      loops: LOOPS.map((l) => ({
        id: l.id,
        title: l.title,
        url: previewUrl(l),
        cover: coverUrl(l),
        hero: heroUrl(l),
        bpm: l.bpm,
        key: l.key || null,
      })),
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = String((req.body && req.body.email) || '').trim().toLowerCase()
  const requestedIds = Array.isArray(req.body && req.body.ids) ? req.body.ids : []

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  // Resolve against the server-side catalog only. The cap is the catalog
  // itself, so "select all" works but a client cannot inflate the mail.
  const selected = LOOPS.filter((l) => requestedIds.includes(l.id))
  if (selected.length === 0) {
    return res.status(400).json({ error: 'No valid loops selected' })
  }

  // Refuse rather than mail links that go nowhere.
  if (!DOWNLOAD_BASE) {
    console.error('[loops] DOWNLOAD_BASE is not set, refusing to send')
    return res.status(503).json({ error: 'Downloads are not live yet, try again later' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID

  if (!apiKey || !audienceId) {
    console.log(`[loops] (no Resend creds) ${email} · ${selected.length} loop(s) · ${new Date().toISOString()}`)
    return res.status(200).json({ ok: true, stored: 'log-only' })
  }

  const auth = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  try {
    const [contactRes] = await Promise.all([
      fetch(`${RESEND_API}/audiences/${audienceId}/contacts`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ email, unsubscribed: false }),
      }),
      storeContact(email),
    ])
    if (!contactRes.ok && contactRes.status !== 409) {
      const data = await contactRes.json().catch(() => ({}))
      if (!/already/i.test(data?.message || '')) {
        console.error('[loops] Resend contact error', contactRes.status, data)
      }
    }

    const unsubUrl = `https://tagobeats.com/api/unsubscribe?e=${encodeURIComponent(email)}`
    const { subject, text, html } = downloadEmail(selected, unsubUrl)
    const sendRes = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        from: 'TagoBeats <plugins@robinbusse.dev>',
        to: [email],
        reply_to: 'plugins@robinbusse.dev',
        subject,
        text,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>, <mailto:plugins@robinbusse.dev?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })

    if (!sendRes.ok) {
      const data = await sendRes.json().catch(() => ({}))
      console.error('[loops] Resend send error', sendRes.status, data)
      return res.status(502).json({ error: 'Could not send the loops mail' })
    }

    return res.status(200).json({ ok: true, count: selected.length })
  } catch (err) {
    console.error('[loops] Resend request failed', err)
    return res.status(502).json({ error: 'Network error' })
  }
}
