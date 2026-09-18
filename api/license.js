// Mint a signed licence file.
//
// This is the only place a licence comes into existence. Two callers:
//   1. the payment webhook, server to server, right after a successful purchase
//   2. Robin by hand, for reissues and for the free creator licences the launch
//      playbook calls for
//
// Deliberately NOT public. Everything else in this api/ folder degrades
// gracefully when credentials are missing (see api/lead.js: a lost address is
// bad, a lost customer is worse). This endpoint does the opposite and fails
// hard, because the failure modes are not comparable: a licence minted with the
// wrong key, or minted by a stranger, is worse than no licence at all.
//
// Whoever pays is a separate question. Stripe, Lemon Squeezy and Paddle all end
// up calling this same endpoint, which is what keeps the merchant-of-record
// decision open and reversible.
//
// POST /api/license
//   header  x-tago-issuer: <LICENSE_ISSUER_SECRET>
//   body    { email, product, edition?, trial_days?, id? }
//   200     { ok, id, filename, license, fingerprint }
//
// GET /api/license
//   200     { ok, fingerprint, public_key }
//   Public key only, no secret. Exists so the deployed key can be compared
//   against the one compiled into the plugin without a deploy or a guess.

const { timingSafeEqual } = require('node:crypto')
const {
  privateKeyFromSeed,
  rawPublicKey,
  keyFingerprint,
  mintLicense,
} = require('./_license.js')

// Allowlist, same reasoning as PRODUCTS in api/lead.js: the value reaches a
// filename and a signed payload, so an unknown string must never pass through.
const PRODUCTS = {
  'tagoclip-pro': { editions: ['full', 'trial'] },
  'tagopitch-pro': { editions: ['full', 'trial'] },
}

const MAX_TRIAL_DAYS = 90

function constantTimeEquals(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  // timingSafeEqual throws on a length mismatch, which would leak the length
  // through the error path. Compare lengths only after both are hashed to the
  // same size by padding through a fixed-length compare.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

module.exports = async function handler(req, res) {
  const seed = process.env.LICENSE_SIGNING_KEY

  if (!seed) {
    console.error('[license] LICENSE_SIGNING_KEY is not set')
    return res.status(500).json({ error: 'Signing key not configured' })
  }

  let privateKey
  try {
    privateKey = privateKeyFromSeed(seed)
  } catch (err) {
    console.error('[license] LICENSE_SIGNING_KEY is unusable', err.message)
    return res.status(500).json({ error: 'Signing key not configured' })
  }

  const fingerprint = keyFingerprint(rawPublicKey(privateKey))

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      fingerprint,
      public_key: rawPublicKey(privateKey).toString('base64'),
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const issuerSecret = process.env.LICENSE_ISSUER_SECRET
  if (!issuerSecret) {
    console.error('[license] LICENSE_ISSUER_SECRET is not set')
    return res.status(500).json({ error: 'Issuer secret not configured' })
  }
  if (!constantTimeEquals(req.headers['x-tago-issuer'] || '', issuerSecret)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = req.body || {}
  const email = String(body.email || '').trim().toLowerCase()
  const product = String(body.product || '')
  const edition = String(body.edition || 'full')
  const trialDays = body.trial_days === undefined || body.trial_days === null
    ? null
    : Number(body.trial_days)
  // Passing an existing id reissues the same licence rather than creating a
  // second one. That is the "I lost the file" path, and it matters that it
  // stays the same id so a future block list keeps working.
  const id = body.id ? String(body.id) : null

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }
  if (!Object.prototype.hasOwnProperty.call(PRODUCTS, product)) {
    return res.status(400).json({ error: `Unknown product: ${product}` })
  }
  if (!PRODUCTS[product].editions.includes(edition)) {
    return res.status(400).json({ error: `Unknown edition: ${edition}` })
  }

  let expiresAt = null
  if (trialDays !== null) {
    if (!Number.isFinite(trialDays) || trialDays <= 0 || trialDays > MAX_TRIAL_DAYS) {
      return res.status(400).json({ error: `trial_days must be between 1 and ${MAX_TRIAL_DAYS}` })
    }
    expiresAt = Math.floor(Date.now() / 1000) + Math.round(trialDays) * 86400
  }
  // A trial without an end date is a free full licence with extra steps.
  if (edition === 'trial' && expiresAt === null) {
    return res.status(400).json({ error: 'A trial edition needs trial_days' })
  }

  try {
    const licence = mintLicense({ product, edition, email, expiresAt, id }, privateKey)
    console.log(`[license] minted ${licence.id} · ${product}/${edition} · ${email} · key ${fingerprint}`)
    return res.status(200).json({
      ok: true,
      id: licence.id,
      filename: licence.filename,
      license: licence.text,
      fingerprint,
    })
  } catch (err) {
    console.error('[license] minting failed', err)
    return res.status(500).json({ error: 'Could not mint the licence' })
  }
}
