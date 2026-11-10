// Shared body of the TagoClip Pro launch mail (10.11.2026). Two variants use
// it: pro-launch-tagoclip.mjs (TagoClip users) and pro-launch-tagopitch.mjs
// (TagoPitch only). Only the opening lines and the last line differ.
// Copy finalized in chat, source of truth: 02 Projekte/TagoClip Pro Listen-Mail
// Launch.md in the vault.

const GIF = 'https://tagobeats.com/uploads_opt/TagoClipPro_mail_launch.gif?v=2'
const PAGE_BASE = 'https://tagobeats.com/tagoclip-pro'
const STILL = 'https://tagobeats.com/uploads_opt/TagoClipPro_mail_still.jpg?v=1'
const QUOTE = ['...captures that FL Studio Fruity Clipper sound and feel, which is exactly the kind of clipping I\'m after.', 'Marcos, beta tester, Ableton Live 12']

const FEATURES = [
  ['See what you\'re cutting.', 'A live waveform shows your signal and marks every peak the clipper takes off in red. You see the clipping instead of guessing it from a curve.'],
  ['Cleaner when you push it.', 'Anti-aliased clipping keeps the top end clean, even with the drive way up.'],
  ['A true peak ceiling.', 'It\'s the very last stage, so nothing gets past it, whatever you do before.'],
  ['Auto gain.', 'It takes back the level the drive adds, so you hear the clipping and not just louder.'],
]
const PLUS = 'Plus three curves (Fruity, Brick and Silky) and mono low end. AU and VST3 on Mac, VST3 on Windows.'
const PRICE = 'Launch price is $29 instead of $49, until December 4. Or try it free for 7 days first, every feature, no account.'

// preheader: shown next to the subject in the inbox list instead of the first
// body line. Kept personal on purpose, a price there reads like an ad.
export function render({ intro, staysFree, ps, variant, preheader }, unsubUrl) {
  // UTM tags so visits from this mail, per variant, show up in the analytics.
  const PAGE = `${PAGE_BASE}?utm_source=newsletter&utm_medium=email&utm_campaign=pro-launch&utm_content=${variant}`
  const text = [
    'Hey,',
    '',
    ...intro,
    '',
    ...FEATURES.flatMap(([h, b]) => [`${h} ${b}`, '']),
    PLUS,
    '',
    `"${QUOTE[0]}" (${QUOTE[1]})`,
    '',
    PRICE,
    '',
    `See TagoClip Pro: ${PAGE}`,
    '',
    staysFree,
    '',
    'Robin',
    '',
    ps,
    '',
    `Unsubscribe from future plugin drops: ${unsubUrl}`,
  ].join('\n')

  // Gmail's iOS app inverts text and border colours in dark mode but leaves
  // gradient backgrounds alone. So: every background and every line is a
  // gradient (never a plain colour or a border), and every text block sits in
  // g(), two wrappers whose blend modes invert Gmail's inversion back. The
  // "u + .body" selector only matches inside Gmail, other clients ignore it.
  const g = (inner) => `<div class="gm-screen"><div class="gm-diff">${inner}</div></div>`
  const bg = (c) => `background-color:${c};background-image:linear-gradient(${c},${c});`
  const line = (c = '#2A2723') => `<div style="height:1px;line-height:1px;font-size:1px;${bg(c)}">&nbsp;</div>`
  const font = 'font-family:Arial,Helvetica,sans-serif;'
  const mono = "font-family:'Courier New',Courier,monospace;"

  const features = FEATURES.map(([h, b]) =>
    `<div style="padding-bottom:14px;"><span style="color:#F2EEE6;font-weight:bold;">${h}</span> ${b}</div>`
  ).join('')

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <style>
      :root { color-scheme: dark; supported-color-schemes: dark; }
      @media (prefers-color-scheme: dark) {
        body, .tb-bg { background-color: #0A0908 !important; }
        .tb-card { background-color: #1A1815 !important; }
      }
      u + .body .gm-screen { background: #000; mix-blend-mode: screen; }
      u + .body .gm-diff { background: #000; mix-blend-mode: difference; }
    </style>
  </head>
  <body class="body tb-bg" style="margin:0;padding:0;${bg('#0A0908')}">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#0A0908;opacity:0;">${preheader}${'&#847;&zwnj;&nbsp;'.repeat(60)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tb-bg" bgcolor="#0A0908" style="${bg('#0A0908')}">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <tr><td style="padding:0 4px 18px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;${bg('#00FDDC')}"></span>
          ${g(`<span style="${font}font-size:14px;font-weight:bold;letter-spacing:3px;color:#ECE7DE;">&nbsp;TAGOBEATS</span>`).replace('<div class="gm-screen">', '<div class="gm-screen" style="display:inline-block;">').replace('<div class="gm-diff">', '<div class="gm-diff" style="display:inline-block;">')}
        </td></tr>

        <!-- Card. The 1px frame is the outer cell's gradient, not a border. -->
        <tr><td style="${bg('#2A2723')}padding:1px;border-radius:10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tb-card" bgcolor="#1A1815" style="${bg('#1A1815')}border-radius:9px;">
            <tr><td style="padding:0;line-height:0;">
              <a href="${PAGE}"><img src="${GIF}" alt="TagoClip Pro: drive turning up, the waveform showing clipped peaks in red" width="558" style="width:100%;max-width:558px;height:auto;display:block;border:0;border-radius:9px 9px 0 0;"></a>
            </td></tr>
            <tr><td style="padding:28px 32px 30px;">
              ${g(`<div style="${mono}font-size:11px;letter-spacing:2px;color:#00FDDC;padding-bottom:10px;">NEW &middot; TAGOCLIP PRO 1.0</div>
              <div style="${font}font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#F2EEE6;padding-bottom:16px;line-height:1.3;">The FL clipper, everywhere.</div>
              <div style="${font}font-size:15px;line-height:1.65;color:#C9C3B8;padding-bottom:22px;">Hey,<br><br>${intro.join(' ')}</div>`)}

              ${line()}
              <div style="padding:18px 0 6px;">
                ${g(`<div style="${mono}font-size:11px;letter-spacing:2px;color:#9A958C;padding-bottom:12px;">WHAT'S NEW</div>
                <div style="${font}font-size:14px;line-height:1.7;color:#C9C3B8;">${features}</div>
                <div style="${font}font-size:13px;line-height:1.6;color:#9A958C;padding-bottom:12px;">${PLUS}</div>`)}
              </div>
              ${line()}

              <div style="padding:20px 0 4px;">
                ${g(`<div style="${font}font-size:15px;line-height:1.6;color:#F2EEE6;font-style:italic;">&ldquo;${QUOTE[0]}&rdquo;</div>
                <div style="${mono}font-size:11px;letter-spacing:1px;color:#9A958C;padding-top:8px;">${QUOTE[1].toUpperCase()}</div>`)}
              </div>

              <div style="padding:18px 0 18px;">
                ${g(`<div style="${font}font-size:15px;line-height:1.6;color:#ECE7DE;"><span style="${mono}font-size:12px;font-weight:bold;letter-spacing:1px;color:#00FDDC;">&minus;40%</span>&nbsp; Launch price is <b>$29</b> instead of <s style="color:#9A958C;">$49</s>, until December 4. Or try it free for 7 days first, every feature, no account.</div>`)}
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr><td style="${bg('#00FDDC')}border-radius:3px;">
                  <a href="${PAGE}" style="display:block;color:#0A0908;${font}font-size:14px;font-weight:bold;letter-spacing:1.5px;text-decoration:none;text-align:center;padding:17px 20px;">SEE TAGOCLIP PRO &nbsp;&rarr;</a>
                </td></tr>
              </table>
              <div style="padding-top:12px;">${g(`<div style="${font}font-size:12.5px;color:#9A958C;text-align:center;">${staysFree}</div>`)}</div>
            </td></tr>
            <!-- Static shot at the end, for everyone whose client is still loading the GIF. -->
            <tr><td style="padding:0 32px 30px;line-height:0;">
              <a href="${PAGE}"><img src="${STILL}" alt="TagoClip Pro interface: Fruity curve, drive at +8 dB, true peak ceiling at -1.0 dBTP" width="494" style="width:100%;max-width:494px;height:auto;display:block;border:0;border-radius:6px;"></a>
            </td></tr>
        </table>
        </td></tr>

        <tr><td style="padding:22px 4px 0;">
          ${g(`<div style="${font}font-size:13px;line-height:1.6;color:#9A958C;">Robin<br>TagoBeats<br><br>${ps}</div>`)}
        </td></tr>

        <tr><td style="padding:18px 4px 0;">
          ${g(`<div style="${font}font-size:12px;line-height:1.6;color:#7A756C;"><a href="https://tagobeats.com" style="color:#00FDDC;text-decoration:none;">tagobeats.com</a> &middot; <a href="${unsubUrl}" style="color:#7A756C;text-decoration:underline;">Unsubscribe</a> from future plugin drops.</div>`)}
        </td></tr>

      </table>
    </td></tr>
  </table>
  </body>
  </html>`

  return { text, html }
}
