// AAX update mail (14.11.2026): TagoClip Pro 1.1.0, TagoClip 1.2.0 and
// TagoPitch 1.1.0 now run in Pro Tools on macOS. One version for the whole
// list. Copy source of truth: 02 Projekte/Pro Tools Update Mail und Reddit.md
// in the vault. Look and Gmail dark mode handling follow _pro-launch.mjs.
//
// Usage:
//   node scripts/broadcast.mjs scripts/broadcasts/aax-update.mjs --env .vercel/.env.production.local --test you@example.com
//   node scripts/broadcast.mjs scripts/broadcasts/aax-update.mjs --env .vercel/.env.production.local --dry-run
//   node scripts/broadcast.mjs scripts/broadcasts/aax-update.mjs --env .vercel/.env.production.local --limit 50
//   node scripts/broadcast.mjs scripts/broadcasts/aax-update.mjs --env .vercel/.env.production.local

// Robin's screenshot from a real Pro Tools session (14.11.2026).
const HERO = 'https://tagobeats.com/uploads_opt/TagoClipPro_mail_protools.jpg?v=1'
const HERO_ALT = 'TagoClip Pro running on the master track in a Pro Tools session'
const PRO = 'https://tagobeats.com/tagoclip-pro?utm_source=newsletter&utm_medium=email&utm_campaign=aax-update'
const CLIP = 'https://github.com/TagoBeats/TagoClip/releases/tag/v1.2.0'
const PITCH = 'https://github.com/TagoBeats/TagoPitch/releases/tag/v1.1.0'
const ACCOUNT = 'https://tagobeats.moonbase.sh'

const INTRO = 'all three Tago plugins now run in Pro Tools: TagoClip Pro, TagoClip and TagoPitch. They come as AAX on Mac, same plugins, same sound. The update is free, just grab the new installer and tick AAX.'
const PRO_PITCH = 'is the FL soft clip sound on a modern engine, with a live waveform that shows every peak it takes off, a true peak ceiling and auto gain.'
const PRICE = 'If you haven\'t tried it yet: launch price is $29 instead of $49 until December 4, or test it free for 7 days.'
const ALSO = [
  ['Preset menu.', 'Click the preset name and pick any preset directly (TagoClip and Pro).'],
  ['Output only trims the clipped signal (TagoClip).', 'Parallel clipping keeps the dry level now. Projects you saved before sound exactly the same.'],
]
const WINDOWS = 'On Windows? VST3 works as before, Pro Tools on Windows follows early 2027.'
const PS = 'P.S. Running Pro Tools? Hit reply and tell me if everything loads fine on your setup.'
// Mom Test block (Robin, 14.11.2026), wording from 02 Projekte/Tago Mom-Test
// Fragen.md in the vault. The warm-up 50 still got the single-question P.P.S.
const QUESTIONS_INTRO = 'Two quick questions before you go. Just hit reply, one line is plenty:'
const QUESTIONS = [
  'What\'s the last thing in a beat or mix that took you way longer than it should have?',
  'What\'s the last plugin you actually paid for, and what made you buy it?',
]
const QUESTIONS_OUTRO = 'I read every reply.'

function render(unsubUrl) {
  const text = [
    'Hey,',
    '',
    INTRO,
    '',
    'Also new:',
    ...ALSO.map(([h, b]) => `${h} ${b}`),
    '',
    `TagoClip Pro ${PRO_PITCH} ${PRICE}`,
    '',
    `See TagoClip Pro: ${PRO}`,
    '',
    'Get the update:',
    `TagoClip 1.2: ${CLIP}`,
    `TagoPitch 1.1: ${PITCH}`,
    `TagoClip Pro owners: ${ACCOUNT}`,
    '',
    WINDOWS,
    '',
    'Robin',
    '',
    PS,
    '',
    QUESTIONS_INTRO,
    ...QUESTIONS.map((q, i) => `${i + 1}. ${q}`),
    QUESTIONS_OUTRO,
    '',
    `Unsubscribe from future plugin drops: ${unsubUrl}`,
  ].join('\n')

  // Same Gmail iOS dark mode handling as _pro-launch.mjs: gradients instead of
  // plain colours and borders, text inside g() blend wrappers.
  const g = (inner) => `<div class="gm-screen"><div class="gm-diff">${inner}</div></div>`
  const bg = (c) => `background-color:${c};background-image:linear-gradient(${c},${c});`
  const line = (c = '#2A2723') => `<div style="height:1px;line-height:1px;font-size:1px;${bg(c)}">&nbsp;</div>`
  const font = 'font-family:Arial,Helvetica,sans-serif;'
  const mono = "font-family:'Courier New',Courier,monospace;"
  const link = (href, label) => `<a href="${href}" style="color:#00FDDC;text-decoration:none;">${label}</a>`

  const alsoRows = ALSO.map(([h, b]) =>
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
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#0A0908;opacity:0;">TagoClip Pro, TagoClip and TagoPitch, all three.${'&#847;&zwnj;&nbsp;'.repeat(60)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tb-bg" bgcolor="#0A0908" style="${bg('#0A0908')}">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <tr><td style="padding:0 4px 18px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;${bg('#00FDDC')}"></span>
          ${g(`<span style="${font}font-size:14px;font-weight:bold;letter-spacing:3px;color:#ECE7DE;">&nbsp;TAGOBEATS</span>`).replace('<div class="gm-screen">', '<div class="gm-screen" style="display:inline-block;">').replace('<div class="gm-diff">', '<div class="gm-diff" style="display:inline-block;">')}
        </td></tr>

        <tr><td style="${bg('#2A2723')}padding:1px;border-radius:10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tb-card" bgcolor="#1A1815" style="${bg('#1A1815')}border-radius:9px;">
            <tr><td style="padding:0;line-height:0;">
              <a href="${PRO}"><img src="${HERO}" alt="${HERO_ALT}" width="558" style="width:100%;max-width:558px;height:auto;display:block;border:0;border-radius:9px 9px 0 0;"></a>
            </td></tr>
            <tr><td style="padding:28px 32px 30px;">
              ${g(`<div style="${mono}font-size:11px;letter-spacing:2px;color:#00FDDC;padding-bottom:10px;">NEW &middot; AAX FOR PRO TOOLS (MAC)</div>
              <div style="${font}font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#F2EEE6;padding-bottom:16px;line-height:1.3;">Now in Pro Tools.</div>
              <div style="${font}font-size:15px;line-height:1.65;color:#C9C3B8;padding-bottom:22px;">Hey,<br><br>${INTRO}</div>`)}

              ${line()}
              <div style="padding:18px 0 4px;">
                ${g(`<div style="${mono}font-size:11px;letter-spacing:2px;color:#9A958C;padding-bottom:12px;">ALSO NEW</div>
                <div style="${font}font-size:14px;line-height:1.7;color:#C9C3B8;">${alsoRows}</div>`)}
              </div>
              ${line()}

              <div style="padding:20px 0 6px;">
                ${g(`<div style="${font}font-size:15px;line-height:1.65;color:#C9C3B8;"><span style="color:#F2EEE6;font-weight:bold;">TagoClip Pro</span> ${PRO_PITCH}</div>`)}
              </div>
              <div style="padding:12px 0 18px;">
                ${g(`<div style="${font}font-size:15px;line-height:1.6;color:#ECE7DE;"><span style="${mono}font-size:12px;font-weight:bold;letter-spacing:1px;color:#00FDDC;">&minus;40%</span>&nbsp; If you haven't tried it yet: launch price is <b>$29</b> instead of <s style="color:#9A958C;">$49</s> until December 4, or test it free for 7 days.</div>`)}
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr><td style="${bg('#00FDDC')}border-radius:3px;">
                  <a href="${PRO}" style="display:block;color:#0A0908;${font}font-size:14px;font-weight:bold;letter-spacing:1.5px;text-decoration:none;text-align:center;padding:17px 20px;">SEE TAGOCLIP PRO &nbsp;&rarr;</a>
                </td></tr>
              </table>

              <div style="padding:24px 0 0;">${line()}</div>

              <div style="padding:18px 0 4px;">
                ${g(`<div style="${mono}font-size:11px;letter-spacing:2px;color:#9A958C;padding-bottom:12px;">GET THE UPDATE</div>
                <div style="${font}font-size:14px;line-height:1.9;color:#C9C3B8;">
                  ${link(CLIP, 'TagoClip 1.2 &rarr;')}<br>
                  ${link(PITCH, 'TagoPitch 1.1 &rarr;')}<br>
                  ${link(ACCOUNT, 'TagoClip Pro owners: your account &rarr;')}
                </div>
                <div style="${font}font-size:12.5px;line-height:1.6;color:#9A958C;padding-top:14px;">${WINDOWS}</div>`)}
              </div>
            </td></tr>
        </table>
        </td></tr>

        <tr><td style="padding:22px 4px 0;">
          ${g(`<div style="${font}font-size:13px;line-height:1.6;color:#9A958C;">Robin<br>TagoBeats<br><br>${PS}</div>`)}
        </td></tr>

        <tr><td style="padding:18px 4px 0;">
          ${g(`<div style="${font}font-size:14px;line-height:1.65;color:#C9C3B8;">${QUESTIONS_INTRO}</div>
          <div style="${font}font-size:14px;line-height:1.65;color:#F2EEE6;padding:10px 0 0 2px;">${QUESTIONS.map((q, i) => `<div style="padding-bottom:8px;"><span style="${mono}color:#00FDDC;">${i + 1}.</span>&nbsp; ${q}</div>`).join('')}</div>
          <div style="${font}font-size:13px;line-height:1.6;color:#9A958C;padding-top:4px;">${QUESTIONS_OUTRO}</div>`)}
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

export default {
  id: 'aax-update',
  subject: 'Now in Pro Tools',
  replyTo: 'info@tagobeats.com',
  from: 'Robin from TagoBeats <plugins@robinbusse.dev>',
  render: (email, unsubUrl) => render(unsubUrl),
}
