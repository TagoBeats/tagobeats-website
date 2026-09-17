// One-off migration: Resend audience -> our own Upstash contact store.
//
// Run this once before the first broadcast. It is idempotent, so running it
// again later (to pick up addresses that landed in Resend while the cap still
// had room) is safe.
//
// What it copies:
//   - every contact in every Resend audience          -> tago:contacts
//   - contacts flagged unsubscribed in Resend         -> tago:unsub
//   - product segments, derived from sent mail subjects
//       "Your TagoPitch download"                     -> tago:contacts:tagopitch
//       "Your TagoClip download"                      -> tago:contacts:tagoclip
//   - addresses whose last delivery event was a bounce -> tago:bounced
//
// Caveat on segments: Resend keeps sent-mail data for 30 days, so addresses
// older than that land in tago:contacts without a product segment. That is
// cosmetic, broadcasts to the full list still reach them.
//
// Usage:
//   node scripts/backfill-contacts.mjs --env ../path/to/.env.local [--dry-run]
//
// Required env: RESEND_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const envPath = args[args.indexOf('--env') + 1]

if (args.includes('--env') && envPath) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const RESEND_KEY = process.env.RESEND_API_KEY
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (!RESEND_KEY) throw new Error('RESEND_API_KEY missing')
if (!dryRun && (!UPSTASH_URL || !UPSTASH_TOKEN)) {
  throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing (or pass --dry-run)')
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Resend sits behind Cloudflare and rejects requests without a normal
// User-Agent, and it rate limits at roughly 2 requests per second.
async function resend(path) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`https://api.resend.com${path}`, {
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'User-Agent': 'tagobeats-backfill/1.0' },
    })
    if (res.ok) return res.json()
    if (res.status !== 429 && res.status !== 403) {
      throw new Error(`Resend ${path} failed: ${res.status} ${await res.text()}`)
    }
    await sleep(1500 * (attempt + 1))
  }
  throw new Error(`Resend ${path} failed after retries`)
}

async function upstash(commands) {
  if (dryRun) return []
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new Error(`Upstash failed: ${res.status} ${await res.text()}`)
  return res.json()
}

// Resend timestamps look like "2026-09-17 15:31:29.332254+00". Normalise them
// so they sort and compare as plain ISO strings.
const toIso = (stamp) => {
  const d = new Date(String(stamp || '').replace(' ', 'T').replace(/\+00$/, 'Z'))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// Keep the earliest signup we have seen for an address, across both sources.
const remember = (map, email, createdAt, unsubscribed = false) => {
  const prev = map.get(email)
  const iso = toIso(createdAt)
  map.set(email, {
    unsubscribed: Boolean(unsubscribed) || Boolean(prev?.unsubscribed),
    createdAt: !prev?.createdAt ? iso : !iso ? prev.createdAt : iso < prev.createdAt ? iso : prev.createdAt,
  })
}

// 1. All contacts across all audiences.
const contacts = new Map() // email -> { unsubscribed, createdAt }
const { data: audiences } = await resend('/audiences')
for (const audience of audiences) {
  const { data } = await resend(`/audiences/${audience.id}/contacts`)
  for (const c of data || []) {
    remember(contacts, c.email.toLowerCase(), c.created_at, c.unsubscribed)
  }
  await sleep(600)
}
console.log(`Resend audiences: ${audiences.length}, contacts: ${contacts.size}`)

// 2. Product segments and bounces, from the sent-mail log.
//
//    The log is also a second source of addresses, and that matters: once the
//    Resend audience hits its contact cap it stops accepting new contacts,
//    while the download mails keep going out and keep showing up here. Resend
//    retains sent-mail data for 30 days, so as long as this runs within that
//    window, no address from a capped period is actually lost.
//
//    Only download subjects count. Everything else in the log is outreach to
//    companies and must never end up on the plugin list.
const DOWNLOAD_SUBJECTS = {
  'Your TagoPitch download': 'tagopitch',
  'Your TagoClip download': 'tagoclip',
}
const segments = { tagopitch: new Set(), tagoclip: new Set() }
const bounced = new Set()
let recovered = 0
let after = null
let pages = 0
while (pages < 60) {
  const page = await resend(`/emails?limit=100${after ? `&after=${after}` : ''}`)
  for (const mail of page.data || []) {
    const product = DOWNLOAD_SUBJECTS[mail.subject]
    const isListMail = Boolean(product) || mail.subject?.includes('TagoBeats download')
    if (!isListMail) continue
    for (const raw of mail.to || []) {
      const email = raw.toLowerCase()
      if (product) segments[product].add(email)
      if (mail.last_event === 'bounced') bounced.add(email)
      if (!contacts.has(email)) recovered++
      // The mail's own timestamp doubles as a signup date for addresses the
      // audience no longer holds, and corrects any later one we already have.
      remember(contacts, email, mail.created_at)
    }
  }
  pages++
  if (!page.has_more || !page.data?.length) break
  after = page.data[page.data.length - 1].id
  await sleep(600)
}
if (recovered) console.log(`Recovered ${recovered} addresses that are not (or no longer) in any audience`)
console.log(
  `Mail log: ${pages} pages · TagoPitch ${segments.tagopitch.size} · TagoClip ${segments.tagoclip.size} · bounced ${bounced.size}`,
)

// 3. Write everything. SADD takes many members per call, the timestamps need
//    one command each, so both go out in chunks.
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))

const emails = [...contacts.keys()]
const unsubscribed = emails.filter((e) => contacts.get(e).unsubscribed)

for (const part of chunk(emails, 500)) await upstash([['SADD', 'tago:contacts', ...part]])
for (const [key, set] of Object.entries(segments)) {
  const members = [...set].filter((e) => contacts.has(e))
  for (const part of chunk(members, 500)) await upstash([['SADD', `tago:contacts:${key}`, ...part]])
}
if (unsubscribed.length) for (const part of chunk(unsubscribed, 500)) await upstash([['SADD', 'tago:unsub', ...part]])
if (bounced.size) for (const part of chunk([...bounced], 500)) await upstash([['SADD', 'tago:bounced', ...part]])

// first_seen carries the growth curve the dashboard draws, so it has to hold
// the real signup date, not the moment this script happened to run. Whatever is
// already stored wins only if it is earlier: the gate writes the exact moment a
// download was requested, Resend's created_at is a second or two later, and a
// previous run of this script may have stamped its own run time.
const now = new Date().toISOString()
// upstash() hands back the raw pipeline response, so unwrap the result field.
const stored = (await upstash([['HGETALL', 'tago:first_seen']]))[0]?.result ?? []
const known = new Map()
for (let i = 0; i < stored.length; i += 2) known.set(stored[i], stored[i + 1])

const timestamps = []
let corrected = 0
for (const email of emails) {
  const real = contacts.get(email).createdAt ?? now
  const current = known.get(email)
  if (current && current <= real) continue
  if (current) corrected++
  timestamps.push(['HSET', 'tago:first_seen', email, real])
}
for (const part of chunk(timestamps, 200)) await upstash(part)

console.log(
  dryRun
    ? `DRY RUN, nothing written. Would store ${emails.length} contacts, ${unsubscribed.length} unsubscribed, ${bounced.size} bounced.`
    : `Done. ${emails.length} contacts, ${unsubscribed.length} unsubscribed, ${bounced.size} bounced, ` +
        `${timestamps.length} timestamps written (${corrected} corrected).`,
)
