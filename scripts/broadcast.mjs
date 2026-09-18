// Send a broadcast to the own contact store, over the transactional Resend API.
//
// Why not Resend Broadcasts: those need Marketing contacts, which are capped at
// 1,000 on the free tier and cost 40 $/mo beyond that. The transactional plan we
// already pay for allows 50,000 mails a month with no contact cap, and
// /emails/batch sends 100 per request. The list itself lives in Upstash (see
// api/lead.js) so nothing here depends on a Resend audience.
//
// Safety rails, in order of how much they matter:
//   1. tago:unsub and tago:bounced are always subtracted. No exceptions.
//   2. Every recipient gets List-Unsubscribe + one-click POST, same as the
//      download mail. Without it Gmail treats a bulk send as suspicious.
//   3. Every delivered address is recorded in tago:sent:<id>, and addresses
//      already in that set are skipped. A crash mid-send never double-mails.
//
// Usage:
//   node scripts/broadcast.mjs <template.mjs> --env <path> [options]
//
// Options:
//   --segment <all|tagopitch|tagoclip>   default: all
//   --exclude <segment>                  e.g. --segment tagopitch --exclude tagoclip
//   --test <email>                       send only to this address, ignore the list
//   --limit <n>                          send to the first n recipients (warm-up wave)
//   --dry-run                            resolve the audience and print it, send nothing
//
// A template is an .mjs file with a default export:
//   export default {
//     id: 'tagoclip-v11',                      // unique, keys the sent log
//     subject: 'TagoClip 1.1 is out',
//     render(email, unsubUrl) { return { text, html } },
//   }

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const has = (name) => args.includes(`--${name}`)

const templatePath = args[0]
if (!templatePath || templatePath.startsWith('--')) {
  throw new Error('First argument must be the template file, e.g. scripts/broadcasts/tagoclip-v11.mjs')
}

const envPath = flag('env')
if (envPath) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const RESEND_KEY = process.env.RESEND_API_KEY
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
if (!RESEND_KEY) throw new Error('RESEND_API_KEY missing')
if (!UPSTASH_URL || !UPSTASH_TOKEN) throw new Error('UPSTASH_REDIS_REST_URL / _TOKEN missing')

const template = (await import(resolve(process.cwd(), templatePath))).default
for (const field of ['id', 'subject', 'render']) {
  if (!template?.[field]) throw new Error(`Template is missing "${field}"`)
}

const dryRun = has('dry-run')
const segment = flag('segment', 'all')
const exclude = flag('exclude')
const testTo = flag('test')
const limit = flag('limit') ? Number(flag('limit')) : null

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function upstash(commands) {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new Error(`Upstash failed: ${res.status} ${await res.text()}`)
  return (await res.json()).map((r) => r.result)
}

// 1. Resolve the audience.
let recipients
if (testTo) {
  recipients = [testTo.toLowerCase()]
} else {
  const sourceKey = segment === 'all' ? 'tago:contacts' : `tago:contacts:${segment}`
  const [source, unsub, bounced, alreadySent, excluded] = await upstash([
    ['SMEMBERS', sourceKey],
    ['SMEMBERS', 'tago:unsub'],
    ['SMEMBERS', 'tago:bounced'],
    ['SMEMBERS', `tago:sent:${template.id}`],
    ['SMEMBERS', exclude ? `tago:contacts:${exclude}` : 'tago:__none__'],
  ])
  const skip = new Set([...unsub, ...bounced, ...alreadySent, ...excluded])
  recipients = source.filter((e) => !skip.has(e)).sort()
  console.log(
    `Segment "${segment}": ${source.length} · unsub ${unsub.length} · bounced ${bounced.length} · ` +
      `already sent ${alreadySent.length}${exclude ? ` · excluded "${exclude}" ${excluded.length}` : ''} ` +
      `-> ${recipients.length} recipients`,
  )
  if (limit) {
    recipients = recipients.slice(0, limit)
    console.log(`Limited to first ${recipients.length}`)
  }
}

if (!recipients.length) {
  console.log('Nothing to send.')
  process.exit(0)
}

if (dryRun) {
  console.log(`\nDRY RUN, nothing sent. Subject: "${template.subject}"`)
  console.log(recipients.slice(0, 20).join('\n'))
  if (recipients.length > 20) console.log(`... and ${recipients.length - 20} more`)
  process.exit(0)
}

// 2. Send in batches of 100, the maximum /emails/batch accepts.
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))
let sent = 0
let failed = 0

for (const [index, batch] of chunk(recipients, 100).entries()) {
  const payload = batch.map((email) => {
    const unsubUrl = `https://tagobeats.com/api/unsubscribe?e=${encodeURIComponent(email)}`
    const { text, html } = template.render(email, unsubUrl)
    return {
      from: 'TagoBeats <plugins@robinbusse.dev>',
      to: [email],
      reply_to: 'plugins@robinbusse.dev',
      subject: template.subject,
      text,
      html,
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>, <mailto:plugins@robinbusse.dev?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }
  })

  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'tagobeats-broadcast/1.0',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    failed += batch.length
    console.error(`Batch ${index + 1} failed: ${res.status} ${await res.text()}`)
    // Stop rather than hammer on: a failing batch usually means a bad key,
    // a rate limit, or a malformed payload, and all three repeat.
    break
  }

  // Record the batch as sent before moving on, so an abort here cannot
  // resend it on the next run.
  if (!testTo) {
    for (const part of chunk(batch, 500)) await upstash([['SADD', `tago:sent:${template.id}`, ...part]])
  }
  sent += batch.length
  console.log(`Batch ${index + 1}: ${sent}/${recipients.length} sent`)
  await sleep(700)
}

console.log(`\nDone. Sent ${sent}, failed ${failed}.`)
if (!testTo) console.log(`Sent log: tago:sent:${template.id}`)
