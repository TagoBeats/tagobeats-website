// Core of the licence layer: mint and verify signed licence files.
//
// Underscore prefix: Vercel does not turn api/_*.js into a route, so this file
// is a plain module that api/license.js and scripts/license-selftest.mjs share.
//
// WHY SIGNATURES AND NOT A KEY POOL
// DubCheck hands out pre-generated keys from an Upstash set. That breaks twice
// for a plugin: the pool runs dry unless somebody refills it by hand, and a
// plain key string can only be checked against a list, which means the plugin
// would have to reach a server. A plugin has to work with no network at all,
// because hosts scan plugins at startup and studios are routinely offline.
//
// So the server signs instead. The private key never leaves the server, the
// matching public key is compiled into the plugin, and the plugin verifies on
// its own. Nothing to refill, nothing to phone home to.
//
// FILE FORMAT
//   -----BEGIN TAGO LICENSE-----
//   <payload, base64url, wrapped at 64 chars>
//   .
//   <signature, base64url, wrapped at 64 chars>
//   -----END TAGO LICENSE-----
//
// The signature covers the ASCII bytes of the base64url payload string, NOT the
// decoded JSON. That is deliberate and it is the single most important decision
// in this file: it means the C++ side never has to reproduce our exact JSON
// formatting to get a matching signature. It verifies the text it read, then
// parses. Key order, spacing and unicode escaping become irrelevant.
//
// Parsing rule for any reader, including the plugin: cut out what sits between
// the two armour markers, throw away every character that is not in the
// base64url alphabet or a dot, then split on the dot. That survives line
// wrapping, CRLF, indentation and a mail client quoting the whole thing. See
// parseLicense() below for why the cutting has to happen before the filtering.
//
// KEY STORAGE
// Keys move around as raw bytes in base64, not as PEM. PEM carries newlines,
// and newlines in environment variables are a known way to lose an afternoon.
// The DER prefixes below turn 32 raw bytes back into something Node accepts.

const { createPrivateKey, createPublicKey, sign, verify, randomUUID, createHash } = require('node:crypto')

// Fixed DER headers for Ed25519. Everything after them is the raw key.
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

const FORMAT_VERSION = 1
const ARMOUR_BEGIN = '-----BEGIN TAGO LICENSE-----'
const ARMOUR_END = '-----END TAGO LICENSE-----'

function privateKeyFromSeed(seedB64) {
  const seed = Buffer.from(String(seedB64).trim(), 'base64')
  if (seed.length !== 32) {
    throw new Error(`Signing key must decode to 32 bytes, got ${seed.length}`)
  }
  return createPrivateKey({
    key: Buffer.concat([PKCS8_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  })
}

function publicKeyFromRaw(rawB64) {
  const raw = Buffer.from(String(rawB64).trim(), 'base64')
  if (raw.length !== 32) {
    throw new Error(`Public key must decode to 32 bytes, got ${raw.length}`)
  }
  return createPublicKey({
    key: Buffer.concat([SPKI_PREFIX, raw]),
    format: 'der',
    type: 'spki',
  })
}

// Raw 32 public bytes belonging to a private key, which is what the plugin gets
// compiled in and what publicKeyFromRaw() expects back.
function rawPublicKey(privateKey) {
  const spki = createPublicKey(privateKey).export({ format: 'der', type: 'spki' })
  return spki.subarray(SPKI_PREFIX.length)
}

// Short human-comparable id for a public key. Printed by the keygen script, by
// GET /api/license, and meant to be printed by the plugin too: if those three
// do not match, the deployed key and the shipped key have drifted apart, and
// that is otherwise a miserable bug to find.
function keyFingerprint(rawPublic) {
  return createHash('sha256').update(rawPublic).digest('hex').slice(0, 16)
}

function wrap(str, width = 64) {
  const lines = []
  for (let i = 0; i < str.length; i += width) lines.push(str.slice(i, i + width))
  return lines.join('\n')
}

// Build the payload every licence carries.
//
// expiresAt is a unix timestamp in seconds or null. null means perpetual, which
// is what a purchase gets. Trials get a timestamp, and they travel through this
// exact same path so there is only ever one signing mechanism to get right.
function buildPayload({ product, edition, email, expiresAt = null, id = null }) {
  return {
    v: FORMAT_VERSION,
    id: id || randomUUID(),
    product,
    edition,
    email,
    issued: Math.floor(Date.now() / 1000),
    expires: expiresAt,
  }
}

function signPayload(payload, privateKey) {
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = sign(null, Buffer.from(payloadB64, 'ascii'), privateKey)
  return `${payloadB64}.${signature.toString('base64url')}`
}

function armour(compact) {
  const [payloadB64, sigB64] = compact.split('.')
  return [ARMOUR_BEGIN, wrap(payloadB64), '.', wrap(sigB64), ARMOUR_END, ''].join('\n')
}

// Mint a complete licence file. Returns the text plus the metadata the caller
// needs for the mail and the sales log.
function mintLicense({ product, edition, email, expiresAt = null, id = null }, privateKey) {
  const payload = buildPayload({ product, edition, email, expiresAt, id })
  const compact = signPayload(payload, privateKey)
  return {
    id: payload.id,
    payload,
    compact,
    text: armour(compact),
    filename: `${product}-${payload.id.slice(0, 8)}.tagolicense`,
  }
}

// Tolerant parse, mirrored by the plugin.
//
// Cut between the armour markers FIRST, then drop everything outside the
// base64url alphabet and the separator. The order matters and the selftest
// caught it the hard way: base64url contains letters and hyphens, so
// "-----BEGIN TAGO LICENSE-----" survives a naive character filter and gets
// concatenated straight into the payload. Every armoured licence then failed
// while the bare compact form passed, which is exactly the kind of bug that
// looks like broken crypto and is really broken string handling.
//
// Only when no markers are found do we fall back to dropping armour-looking
// lines. That fallback stays off the normal path on purpose: a payload can
// legitimately contain a run of hyphens, and throwing away a line for looking
// like a marker would corrupt roughly one licence in ten million.
function parseLicense(text) {
  let body = String(text)
  const begin = body.indexOf(ARMOUR_BEGIN)
  const end = body.indexOf(ARMOUR_END)

  if (begin !== -1 && end > begin) {
    body = body.slice(begin + ARMOUR_BEGIN.length, end)
  } else {
    body = body
      .split(/\r?\n/)
      .filter((line) => !line.includes('-----'))
      .join('')
  }

  const cleaned = body.replace(/[^A-Za-z0-9\-_.]/g, '')
  const parts = cleaned.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Not a licence file: expected one payload and one signature')
  }
  return { payloadB64: parts[0], sigB64: parts[1] }
}

// Verify a licence the way the plugin will.
//
// Returns { ok, reason, payload }. Never throws on bad input, because "the user
// dropped in the wrong file" is a normal Tuesday and has to end in a readable
// message instead of a crash inside a DAW.
//
// now is injectable so the expiry branch is testable without waiting a fortnight.
function verifyLicense(text, publicKey, now = Math.floor(Date.now() / 1000)) {
  let parsed
  try {
    parsed = parseLicense(text)
  } catch (err) {
    return { ok: false, reason: 'malformed', payload: null }
  }

  const signatureValid = verify(
    null,
    Buffer.from(parsed.payloadB64, 'ascii'),
    publicKey,
    Buffer.from(parsed.sigB64, 'base64url'),
  )
  if (!signatureValid) return { ok: false, reason: 'bad-signature', payload: null }

  let payload
  try {
    payload = JSON.parse(Buffer.from(parsed.payloadB64, 'base64url').toString('utf8'))
  } catch (err) {
    return { ok: false, reason: 'malformed', payload: null }
  }

  // Version check comes after the signature check on purpose. An unknown
  // version in a *signed* payload means we issued it and this build is older
  // than the licence, which is a different problem from a forged file.
  if (payload.v !== FORMAT_VERSION) {
    return { ok: false, reason: 'unsupported-version', payload }
  }
  if (payload.expires !== null && payload.expires !== undefined && now > payload.expires) {
    return { ok: false, reason: 'expired', payload }
  }

  return { ok: true, reason: 'valid', payload }
}

module.exports = {
  FORMAT_VERSION,
  ARMOUR_BEGIN,
  ARMOUR_END,
  privateKeyFromSeed,
  publicKeyFromRaw,
  rawPublicKey,
  keyFingerprint,
  buildPayload,
  signPayload,
  armour,
  mintLicense,
  parseLicense,
  verifyLicense,
}
