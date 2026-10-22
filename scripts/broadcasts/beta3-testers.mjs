// TagoClip Pro beta.3 to the closed beta testers only (not the list). Text is
// the vault draft "02 Projekte/TagoClip Pro beta.3 Mail.md". Replies go to
// info@tagobeats.com, because that is where Robin answered each tester from
// on 20.10., so the conversation stays in one inbox.
//
// Usage:
//   node scripts/broadcast.mjs scripts/broadcasts/beta3-testers.mjs --env .vercel/.env.production.local --test you@example.com
//   node scripts/broadcast.mjs scripts/broadcasts/beta3-testers.mjs --env .vercel/.env.production.local --to a@x.com,b@y.com --dry-run
//   node scripts/broadcast.mjs scripts/broadcasts/beta3-testers.mjs --env .vercel/.env.production.local --to a@x.com,b@y.com

const DOWNLOAD = 'https://www.dropbox.com/scl/fo/hfp61ryw9nfkjnjpwe8rj/AP2YKB0-GBRk0DhtYtHDyZg?rlkey=1zzhdwhrqjtuhd31ows1fs43m&st=x1xuwxch&dl=0'
const WEBVIEW2 = 'https://developer.microsoft.com/microsoft-edge/webview2/'
const REPLY = 'info@tagobeats.com'

const MONO = `'Martian Mono','Courier New',Courier,monospace`
const SANS = `Arial,Helvetica,sans-serif`

const steps = [
  ['Install and load.', 'Does it show up after the scan? Does it open without crashing? Does the window look right (nothing blank, cut off or blurry)?'],
  ['First five minutes.', "Just use it the way you'd use any clipper. Tell me what confused you, what you looked for and couldn't find, and anything that felt off. This is honestly the most useful part."],
  ['Drive, threshold and the curves.', "Push the drive until it's clearly too much, then back it off. Switch between FRUITY, BRICK and SILKY. FRUITY is the FL Studio soft clipper curve. Does the threshold readout (now in dB) match what you hear?"],
  ['Engine stages.', 'Compare 1:1 with ADAA 4x on something with a lot of top end (hi-hats, bright synths, a full master). 1:1 is the plain FL-style path, the ADAA stages are antialiased. Do you hear a difference? Which one would you leave on?'],
  ['Auto gain (the LINK button).', 'Turn it on, then sweep the drive. The level should stay roughly the same while the character changes. Does it? Where does it feel wrong?'],
  ['True peak ceiling.', "Leave it at -1.0, push the drive hard, then check the output with whatever true peak meter you trust (your DAW's own, Youlean, anything). Does it stay under the ceiling?"],
  ['Mono low plus mix.', "Turn on mono low and set the mix to around 50%. The low end should sound full and solid, not thin or hollow. There was a phase bug here in the earlier build and it's fixed now, so I'd love a second pair of ears on it."],
  ['Δ DELTA.', 'Click it and you only hear what the clipper cuts off. Is that useful to you?'],
  ['Save and reopen.', 'Set everything to something unusual, save the project, close the DAW, open it again. Is everything still where you left it?'],
  ['Automation and CPU.', 'Automate one knob, run a few instances at once. Any clicks, dropouts or CPU spikes?'],
]

const windows = [
  ['Space bar test.', "In the earlier build, the plugin window swallowed the keyboard, so the space bar didn't start or stop your DAW while TagoClip was open. I fixed this but couldn't test it on a real Windows DAW. Please: open the plugin window, click a knob, then press space. Does your DAW start and stop playback? Also try it with the window open and not clicked at all. A quick yes or no is enough."],
  ['Black window.', `The interface is drawn by Microsoft Edge WebView2. If the plugin loads but the window stays black, that runtime is missing. It comes with Windows 11 and through Windows Update on 10, otherwise it's a free download here: ${WEBVIEW2} . Tell me if this happened to you either way.`],
  ['Not loading at all?', 'Check whether your DAW put TagoClipPro on a blocklist or "disabled plugins" list and send me a screenshot of it.'],
]

const logic = 'Logic uses the AU version. Check that TagoClipPro passes in the Plugin Manager (Logic Pro > Settings > Plugin Manager) and shows up under Audio Units > Tago. If it says failed, a screenshot of that row is perfect.'

const questions = [
  'The last track you actually finished: what was on your master bus, in order?',
  'Before you uploaded or sent it, did you check anything? If yes, with what?',
  'When you push a clipper harder, what makes you stop? What tells you it\'s too much?',
  'When did you last pay for a plugin that only does one small job in your chain, and what made you buy it?',
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function render(email, unsubUrl) {
  const text = [
    'Hey,',
    '',
    'thanks again for signing up. The beta build of TagoClip Pro is ready for you:',
    '',
    DOWNLOAD,
    '',
    "In the folder there's a .dmg for Mac and a .zip for Windows, just grab the one for your system. This build runs until November 21. After that it still loads and your projects still open, it just passes audio through unchanged. Nothing gets deleted.",
    '',
    'INSTALL',
    '',
    'Mac (macOS 11 or newer): open the .dmg, double-click the .pkg inside, pick VST3 and/or AU, finish the installer, rescan plugins in your DAW.',
    '',
    "Windows (10 or 11, 64-bit, VST3 only): unzip, copy TagoClipPro.vst3 into C:\\Program Files\\Common Files\\VST3, rescan. The build isn't code-signed yet, so Windows or your browser might warn you about it. That's expected.",
    '',
    "The plugin shows up as TagoClipPro. It's a separate plugin from the free TagoClip, so you can have both installed side by side.",
    '',
    'WHAT TO TEST',
    '',
    "You don't have to do all of this. Even just step 1 and 2 already help a lot. Put it where you'd normally put a clipper, on a real project you're working on, not a test tone.",
    '',
    ...steps.flatMap(([h, b], i) => [`${i + 1}. ${h} ${b}`, '']),
    'ONLY IF YOU ARE ON WINDOWS',
    '',
    ...windows.flatMap(([h, b]) => [`- ${h} ${b}`, '']),
    'ONLY IF YOU ARE IN LOGIC',
    '',
    logic,
    '',
    'FOUR QUICK QUESTIONS ABOUT HOW YOU WORK',
    '',
    "These have nothing to do with this build, but they help me more than you'd think. Short answers are totally fine.",
    '',
    ...questions.flatMap((q, i) => [`${i + 1}. ${q}`, '']),
    'HOW TO SEND FEEDBACK',
    '',
    `Just reply to this mail, it goes straight to me at ${REPLY}. Please put your OS version and your DAW with its version at the top, even if you already told me. Screenshots and short screen recordings help a lot when something looks or sounds wrong. If something breaks, tell me what you did right before it happened.`,
    '',
    'No need to write an essay. "Step 1 fine, step 6 went over, here\'s a screenshot" is already great.',
    '',
    'Thanks for helping me out with this, it really means a lot.',
    '',
    'Cheers,',
    'Robin',
    'TagoBeats',
    '',
    `Unsubscribe from future plugin drops: ${unsubUrl}`,
  ].join('\n')

  // Same Gmail-dark-mode-proof building blocks as update-112-pro-beta.mjs:
  // gradient backgrounds instead of flat colours, 1px gradient frames instead
  // of borders, and the screen/difference wrapper around every text.
  const g = (inner) => `<div class="gs"><div class="gd">${inner}</div></div>`
  const bg = (c) => `background-color:${c};background-image:linear-gradient(${c},${c});`
  const frame = (border, fill, radius, pad, inner) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${bg(border)}border-radius:${radius}px;padding:1px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="tb-card" style="${bg(fill)}border-radius:${radius - 1}px;padding:${pad};">${inner}</td></tr></table>
          </td></tr></table>`
  const btn = (href, label) => `<a href="${href}" style="display:inline-block;${bg('#00B7A0')}border-radius:4px;padding:1px;text-decoration:none;"><span style="display:block;${bg('#0F2623')}border-radius:3px;padding:11px 18px;font-family:${SANS};font-size:12px;font-weight:bold;letter-spacing:1.4px;color:#00FDDC;">${g(label)}</span></a>`
  const eyebrow = (label, color = '#8A857C') => `<div style="font-family:${MONO};font-size:10.5px;letter-spacing:2px;color:${color};padding-bottom:10px;">${g(label)}</div>`
  const head = (s) => `<div style="font-family:${SANS};font-size:22px;font-weight:800;letter-spacing:-0.4px;color:#F2EEE6;padding-bottom:12px;line-height:1.3;">${g(s)}</div>`
  const para = (s, pb = 12, color = '#B5AFA4') => `<div style="font-family:${SANS};font-size:14px;line-height:1.7;color:${color};padding-bottom:${pb}px;">${g(s)}</div>`
  const sub = (s) => `<div style="font-family:${SANS};font-size:12px;font-weight:bold;letter-spacing:1.4px;color:#ECE7DE;padding:6px 0 6px;">${g(s)}</div>`
  const row = (mark, h, b) => `
                <tr>
                  <td valign="top" style="width:26px;padding:0 0 12px;font-family:${MONO};font-size:12px;line-height:1.7;color:#00FDDC;">${g(mark)}</td>
                  <td valign="top" style="padding:0 0 12px;font-family:${SANS};font-size:14px;line-height:1.7;color:#B5AFA4;">${g(`${h ? `<span style="color:#ECE7DE;font-weight:bold;">${esc(h)}</span> ` : ''}${b}`)}</td>
                </tr>`
  const list = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`
  const pad2 = (n) => String(n).padStart(2, '0')
  const card = (inner) => `<tr><td>${frame('#2A2723', '#1A1815', 10, '26px 28px 16px', inner)}</td></tr>
        <tr><td style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>`

  const download = `
          ${eyebrow('CLOSED BETA &middot; TAGOCLIP PRO 1.0.0-BETA.3', '#00FDDC')}
          ${head('Your beta build is ready')}
          ${para("In the folder there's a .dmg for Mac and a .zip for Windows, just grab the one for your system.", 18)}
          <div style="padding-bottom:20px;">${btn(DOWNLOAD, 'DOWNLOAD BETA.3')}</div>
          ${para('This build runs until <span style="color:#ECE7DE;font-weight:bold;">November 21</span>. After that it still loads and your projects still open, it just passes audio through unchanged. Nothing gets deleted.')}
          ${sub('INSTALL')}
          ${para('<span style="color:#ECE7DE;">Mac</span> (macOS 11 or newer): open the .dmg, double-click the .pkg inside, pick VST3 and/or AU, finish the installer, rescan plugins in your DAW.')}
          ${para("<span style=\"color:#ECE7DE;\">Windows</span> (10 or 11, 64-bit, VST3 only): unzip, copy TagoClipPro.vst3 into C:\\Program Files\\Common Files\\VST3, rescan. The build isn't code-signed yet, so Windows or your browser might warn you about it. That's expected.")}
          ${para("The plugin shows up as <span style=\"color:#ECE7DE;\">TagoClipPro</span>. It's a separate plugin from the free TagoClip, so you can have both installed side by side.")}`

  const tests = `
          ${eyebrow('WHAT TO TEST')}
          ${head('Steps 1 and 2 already help a lot')}
          ${para("You don't have to do all of this. Put it where you'd normally put a clipper, on a real project you're working on, not a test tone.", 18)}
          ${list(steps.map(([h, b], i) => row(pad2(i + 1), h, esc(b))).join(''))}`

  const special = `
          ${eyebrow('ONLY IF YOU ARE ON WINDOWS')}
          ${list(windows.map(([h, b]) => row('&#9642;', h, esc(b).replace(WEBVIEW2, `<a href="${WEBVIEW2}" style="color:#00FDDC;text-decoration:none;">WebView2 download</a>`))).join(''))}
          <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
          ${eyebrow('ONLY IF YOU ARE IN LOGIC')}
          ${para(esc(logic))}`

  const ask = `
          ${eyebrow('FOUR QUICK QUESTIONS ABOUT HOW YOU WORK', '#00FDDC')}
          ${para("These have nothing to do with this build, but they help me more than you'd think. Short answers are totally fine.", 16, '#ECE7DE')}
          ${list(questions.map((q, i) => row(pad2(i + 1), '', esc(q))).join(''))}`

  const feedback = `
          ${eyebrow('HOW TO SEND FEEDBACK')}
          ${para(`Just hit reply, it goes straight to me at <a href="mailto:${REPLY}" style="color:#00FDDC;text-decoration:none;">${REPLY}</a>. Please put your <span style="color:#ECE7DE;">OS version and your DAW with its version</span> at the top, even if you already told me. Screenshots and short screen recordings help a lot when something looks or sounds wrong. If something breaks, tell me what you did right before it happened.`)}
          ${para('No need to write an essay. "Step 1 fine, step 6 went over, here\'s a screenshot" is already great.')}`

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <link href="https://fonts.googleapis.com/css2?family=Martian+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
      :root { color-scheme: dark; supported-color-schemes: dark; }
      @media (prefers-color-scheme: dark) {
        body, .tb-bg { background-color: #0A0908 !important; }
        .tb-card { background-color: #1A1815 !important; }
      }
      u + .body .gs { background: #000; mix-blend-mode: screen; }
      u + .body .gd { background: #000; mix-blend-mode: difference; }
    </style>
  </head>
  <body class="tb-bg" style="margin:0;padding:0;${bg('#0A0908')}">
  <u></u><div class="body">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Download link, install steps and what to test. Even just steps 1 and 2 help a lot.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tb-bg" bgcolor="#0A0908" style="${bg('#0A0908')}">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <tr><td style="padding:0 4px 18px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;${bg('#00FDDC')}"></span>
          <span style="font-family:${SANS};font-size:14px;font-weight:bold;letter-spacing:3px;color:#ECE7DE;">&nbsp;TAGOBEATS</span>
        </td></tr>

        <tr><td style="padding:0 4px 20px;font-family:${SANS};font-size:15px;line-height:1.65;color:#B5AFA4;">
          ${g('Hey,<br><br>thanks again for signing up. The beta build of TagoClip Pro is ready for you.')}
        </td></tr>

        ${card(download)}
        ${card(tests)}
        ${card(special)}
        <tr><td>${frame('#00A892', '#14120E', 10, '26px 28px 16px', ask)}</td></tr>
        <tr><td style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        ${card(feedback)}

        <tr><td style="padding:4px 4px 0;font-family:${SANS};font-size:14px;line-height:1.65;color:#B5AFA4;">
          ${g('Thanks for helping me out with this, it really means a lot.<br><br>Cheers,<br>Robin<br>TagoBeats')}
        </td></tr>

        <tr><td style="padding:22px 4px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:#6A655C;">
          ${g(`<a href="https://tagobeats.com" style="color:#00FDDC;text-decoration:none;">tagobeats.com</a> &middot; <a href="${unsubUrl}" style="color:#6A655C;text-decoration:underline;">Unsubscribe</a> from future plugin drops.`)}
        </td></tr>

      </table>
    </td></tr>
  </table>
  </div>
  </body>
  </html>`

  return { text, html }
}

export default {
  id: 'beta3-testers',
  subject: "TagoClip Pro beta.3 is ready, here's what to test",
  replyTo: REPLY,
  render,
}
