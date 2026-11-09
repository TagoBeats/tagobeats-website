// Shared body of the TagoClip Pro launch mail (10.11.2026). Two variants use
// it: pro-launch-tagoclip.mjs (TagoClip users) and pro-launch-tagopitch.mjs
// (TagoPitch only). Only the opening lines and the last line differ.
// Copy finalized in chat, source of truth: 02 Projekte/TagoClip Pro Listen-Mail
// Launch.md in the vault.

const GIF = 'https://tagobeats.com/uploads_opt/TagoClipPro_mail_launch.gif?v=1'
const PAGE = 'https://tagobeats.com/tagoclip-pro'

const FEATURES = [
  ['See what you\'re cutting.', 'A live waveform shows your signal and marks every peak the clipper takes off in red. You see the clipping instead of guessing it from a curve.'],
  ['Cleaner when you push it.', 'Anti-aliased clipping up to 4x keeps the top end clean, even with the drive way up.'],
  ['A true peak ceiling.', 'It\'s the very last stage, so nothing gets past it, whatever you do before.'],
  ['Auto gain.', 'It takes back the level the drive adds, so you hear the clipping and not just louder.'],
]
const PLUS = 'Plus three curves (Fruity, Brick and Silky) and mono low end. AU and VST3 on Mac, VST3 on Windows.'
const PRICE = 'Launch price is $29 instead of $49, until December 4. Or try it free for 7 days first, every feature, no account.'

export function render({ intro, staysFree, ps }, unsubUrl) {
  const text = [
    'Hey,',
    '',
    ...intro,
    '',
    ...FEATURES.flatMap(([h, b]) => [`${h} ${b}`, '']),
    PLUS,
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

  const features = FEATURES.map(([h, b]) =>
    `<div style="padding-bottom:14px;"><span style="color:#ECE7DE;font-weight:bold;">${h}</span> ${b}</div>`
  ).join('')

  // Same dark-mode-proof pattern as the earlier broadcasts and api/lead.js:
  // forced color-scheme plus doubled linear-gradient backgrounds so Gmail's
  // dark theme does not invert flat background-colors.
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
              <a href="${PAGE}"><img src="${GIF}" alt="TagoClip Pro: drive turning up, the waveform showing clipped peaks in red" width="558" style="width:100%;max-width:558px;height:auto;display:block;border:0;border-radius:9px 9px 0 0;"></a>
            </td></tr>
            <tr><td style="padding:28px 32px 30px;">
              <div style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:2px;color:#00FDDC;padding-bottom:10px;">NEW &middot; TAGOCLIP PRO 1.0</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#F2EEE6;padding-bottom:16px;line-height:1.3;">The FL clipper, everywhere.</div>

              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#B5AFA4;padding-bottom:22px;">
                Hey,<br><br>${intro.join(' ')}
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr><td style="border-top:1px solid #2A2723;border-bottom:1px solid #2A2723;padding:18px 0 6px;">
                  <div style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:2px;color:#8A857C;padding-bottom:12px;">WHAT'S NEW</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#B5AFA4;">${features}</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8A857C;padding-bottom:12px;">${PLUS}</div>
                </td></tr>
              </table>

              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#ECE7DE;padding-bottom:18px;">
                <span style="display:inline-block;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:bold;letter-spacing:1px;color:#00FDDC;border:1px solid #00FDDC;padding:3px 7px;border-radius:3px;">&minus;40%</span>&nbsp;
                Launch price is <b>$29</b> instead of <s style="color:#8A857C;">$49</s>, until December 4. Or try it free for 7 days first, every feature, no account.
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr><td>
                  <a href="${PAGE}" style="display:block;background-color:#00FDDC;background-image:linear-gradient(#00FDDC,#00FDDC);color:#0A0908;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1.5px;text-decoration:none;text-align:center;padding:17px 20px;border-radius:3px;">SEE TAGOCLIP PRO &nbsp;&rarr;</a>
                </td></tr>
              </table>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#8A857C;padding-top:12px;text-align:center;">${staysFree}</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:22px 4px 0;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8A857C;">
            Robin<br>TagoBeats<br><br>${ps}
          </div>
        </td></tr>

        <tr><td style="padding:18px 4px 0;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6A655C;">
            <a href="https://tagobeats.com" style="color:#00FDDC;text-decoration:none;">tagobeats.com</a> &middot; <a href="${unsubUrl}" style="color:#6A655C;text-decoration:underline;">Unsubscribe</a> from future plugin drops.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
  </body>
  </html>`

  return { text, html }
}
