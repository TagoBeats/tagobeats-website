const RESEND_API = 'https://api.resend.com'

const DOWNLOADS = {
  mac: 'https://github.com/TagoBeats/TagoPitch/releases/download/v1.0.0/TagoPitch-1.0.0.pkg',
  win: 'https://github.com/TagoBeats/TagoPitch/releases/download/v1.0.0/TagoPitch-v1.0.0-Windows-VST3.zip',
}

function downloadEmail() {
  const text = [
    'Hey, thanks for grabbing TagoPitch.',
    '',
    `macOS installer (AU + VST3, notarized): ${DOWNLOADS.mac}`,
    `Windows VST3 (zip): ${DOWNLOADS.win}`,
    '',
    'macOS: run the .pkg and pick the formats you want. Windows: unzip and drop TagoPitch.vst3 into C:\\Program Files\\Common Files\\VST3.',
    '',
    'If anything acts up, just reply to this mail.',
    '',
    'Robin (TagoBeats)',
    'https://tagobeats.com',
  ].join('\n')

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;">
    <p>Hey, thanks for grabbing TagoPitch.</p>
    <p>
      <a href="${DOWNLOADS.mac}">Download for macOS</a> (AU + VST3 installer, notarized)<br>
      <a href="${DOWNLOADS.win}">Download for Windows</a> (VST3 zip)
    </p>
    <p>macOS: run the .pkg and pick the formats you want.<br>
    Windows: unzip and drop TagoPitch.vst3 into <code>C:\\Program Files\\Common Files\\VST3</code>.</p>
    <p>If anything acts up, just reply to this mail.</p>
    <p>Robin (TagoBeats)<br><a href="https://tagobeats.com">tagobeats.com</a></p>
  </div>`

  return { subject: 'Your TagoPitch download', text, html }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = String((req.body && req.body.email) || '').trim().toLowerCase()
  const source = String((req.body && req.body.source) || 'tagopitch')

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID

  // No Resend creds (e.g. preview deploys) → log and accept so nothing breaks.
  if (!apiKey || !audienceId) {
    console.log(`[lead] (no Resend creds) ${email} · source=${source} · ${new Date().toISOString()}`)
    return res.status(200).json({ ok: true, stored: 'log-only' })
  }

  const auth = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  try {
    // 1. Add contact to the TagoPitch audience. 409 / already exists is fine,
    //    repeat downloaders still get their mail.
    const contactRes = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ email, unsubscribed: false }),
    })
    if (!contactRes.ok && contactRes.status !== 409) {
      const data = await contactRes.json().catch(() => ({}))
      if (!/already/i.test(data?.message || '')) {
        console.error('[lead] Resend contact error', contactRes.status, data)
      }
    }

    // 2. Send the download mail. This is the actual gate: a fake address
    //    never sees the links.
    const { subject, text, html } = downloadEmail()
    const sendRes = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        from: 'TagoBeats <plugins@robinbusse.dev>',
        to: [email],
        subject,
        text,
        html,
      }),
    })

    if (!sendRes.ok) {
      const data = await sendRes.json().catch(() => ({}))
      console.error('[lead] Resend send error', sendRes.status, data)
      return res.status(502).json({ error: 'Could not send the download mail' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[lead] Resend request failed', err)
    return res.status(502).json({ error: 'Network error' })
  }
}
