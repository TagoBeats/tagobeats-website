const RESEND_API = 'https://api.resend.com'

// One entry per plugin; the page posts its key as `source`.
const PRODUCTS = {
  tagopitch: {
    name: 'TagoPitch',
    metaLine: 'V1.0.0 &middot; MACOS AU/VST3 &middot; WINDOWS VST3 &middot; FREE',
    image: 'https://tagobeats.com/uploads_opt/TagoPitch_800.jpg',
    mac: 'https://github.com/TagoBeats/TagoPitch/releases/download/v1.0.0/TagoPitch-1.0.0.pkg',
    win: 'https://github.com/TagoBeats/TagoPitch/releases/download/v1.0.0/TagoPitch-v1.0.0-Windows-VST3.zip',
    macInstallText: 'run the .pkg and pick the formats you want',
    macInstallHtml: 'run the .pkg and pick the formats you want (AU + VST3, notarized).',
  },
  tagoclip: {
    name: 'TagoClip',
    metaLine: 'V1.0.0 &middot; MACOS AU/VST3 &middot; WINDOWS VST3 &middot; FREE',
    image: 'https://tagobeats.com/uploads_opt/TagoClip_800.jpg?v=3',
    mac: 'https://github.com/TagoBeats/TagoClip/releases/download/v1.0.0/TagoClip-1.0.0.dmg',
    win: 'https://github.com/TagoBeats/TagoClip/releases/download/v1.0.0/TagoClip-v1.0.0-Windows-VST3.zip',
    macInstallText: 'open the .dmg, then run the .pkg inside and pick the formats you want',
    macInstallHtml: 'open the .dmg, then run the .pkg inside and pick the formats you want (AU + VST3, notarized).',
  },
}

function downloadEmail(product, unsubUrl) {
  const text = [
    `Hey, thanks for grabbing ${product.name}.`,
    '',
    `macOS installer (AU + VST3, notarized): ${product.mac}`,
    `Windows VST3 (zip): ${product.win}`,
    '',
    `macOS: ${product.macInstallText}. Windows: unzip and drop ${product.name}.vst3 into C:\\Program Files\\Common Files\\VST3.`,
    '',
    'If anything acts up, just reply to this mail.',
    '',
    'Robin (TagoBeats)',
    'https://tagobeats.com',
    '',
    `Only want the download and no future plugin drops? Unsubscribe: ${unsubUrl}`,
  ].join('\n')

  // Dark-mode-proof: color-scheme meta pins Apple Mail/Outlook, and every
  // background is doubled as a single-color linear-gradient because Gmail's
  // dark theme inverts plain background-colors but leaves gradients alone.
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
            <tr><td style="padding:0;line-height:0;">
              <img src="${product.image}" alt="${product.name} plugin UI" width="558" style="width:100%;max-width:558px;height:auto;display:block;border:0;border-radius:9px 9px 0 0;">
            </td></tr>
            <tr><td style="padding:28px 32px 32px;">
              <div style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:2px;color:#8A857C;padding-bottom:10px;">${product.metaLine}</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#F2EEE6;padding-bottom:14px;">${product.name}</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#B5AFA4;padding-bottom:24px;">Hey, thanks for grabbing ${product.name}. Here are your downloads:</div>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr><td style="padding-bottom:12px;">
                  <a href="${product.mac}" style="display:block;background-color:#00FDDC;background-image:linear-gradient(#00FDDC,#00FDDC);color:#0A0908;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1.5px;text-decoration:none;text-align:center;padding:16px 20px;border-radius:3px;">DOWNLOAD FOR MACOS &nbsp;&rarr;</a>
                </td></tr>
                <tr><td style="padding-bottom:6px;">
                  <a href="${product.win}" style="display:block;background-color:#26231F;background-image:linear-gradient(#26231F,#26231F);color:#ECE7DE;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1.5px;text-decoration:none;text-align:center;padding:16px 20px;border-radius:3px;border:1px solid #3A362F;">DOWNLOAD FOR WINDOWS &nbsp;&rarr;</a>
                </td></tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                <tr><td style="border-top:1px solid #2A2723;padding-top:20px;">
                  <div style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:2px;color:#8A857C;padding-bottom:8px;">INSTALL</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#B5AFA4;">
                    <span style="color:#ECE7DE;">macOS:</span> ${product.macInstallHtml}<br>
                    <span style="color:#ECE7DE;">Windows:</span> unzip and drop ${product.name}.vst3 into <span style="font-family:'Courier New',Courier,monospace;color:#ECE7DE;">C:\\Program Files\\Common Files\\VST3</span>.
                  </div>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:22px 4px 0;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8A857C;">
            If anything acts up, just reply to this mail.<br>
            Robin (TagoBeats) &middot; <a href="https://tagobeats.com" style="color:#00FDDC;text-decoration:none;">tagobeats.com</a><br>
            <span style="color:#6A655C;">Just here for the download? <a href="${unsubUrl}" style="color:#8A857C;text-decoration:underline;">Unsubscribe</a> from future plugin drops.</span>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
  </body>
  </html>`

  return { subject: `Your ${product.name} download`, text, html }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = String((req.body && req.body.email) || '').trim().toLowerCase()
  const source = String((req.body && req.body.source) || 'tagopitch')
  const product = PRODUCTS[source] || PRODUCTS.tagopitch

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
    // 1. Add contact to the plugins audience (shared across Tago plugins).
    //    409 / already exists is fine, repeat downloaders still get their mail.
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
    //    List-Unsubscribe (RFC 2369/8058) is the single biggest inbox-placement
    //    lever for a mail that also enrolls the address into a list: Gmail and
    //    Apple surface a one-click unsubscribe and reward its presence.
    const unsubUrl = `https://tagobeats.com/api/unsubscribe?e=${encodeURIComponent(email)}`
    const { subject, text, html } = downloadEmail(product, unsubUrl)
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
      console.error('[lead] Resend send error', sendRes.status, data)
      return res.status(502).json({ error: 'Could not send the download mail' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[lead] Resend request failed', err)
    return res.status(502).json({ error: 'Network error' })
  }
}
