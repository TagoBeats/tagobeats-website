// Generate the Ed25519 key pair that the licence layer runs on.
//
// Run this ONCE. The private half goes into Vercel and never moves again; the
// public half gets compiled into every plugin build. Rotating the key later
// invalidates every licence already in the wild, so treat the output as
// something to back up rather than something to regenerate.
//
// The private key is printed to stdout and written nowhere. Pipe it into a
// password manager, not into a file in this repo.
//
// Usage:
//   node scripts/license-keygen.mjs
//   node scripts/license-keygen.mjs --public-only   # reprint from a stored seed
//                                                   # via LICENSE_SIGNING_KEY

import { generateKeyPairSync, createPublicKey, createHash } from 'node:crypto'

const SPKI_PREFIX_LEN = 12
const PKCS8_PREFIX_LEN = 16

const args = process.argv.slice(2)
const publicOnly = args.includes('--public-only')

let seed
let rawPublic

if (publicOnly) {
  const stored = process.env.LICENSE_SIGNING_KEY
  if (!stored) {
    console.error('--public-only needs LICENSE_SIGNING_KEY in the environment.')
    process.exit(1)
  }
  seed = Buffer.from(stored.trim(), 'base64')
  if (seed.length !== 32) {
    console.error(`LICENSE_SIGNING_KEY must decode to 32 bytes, got ${seed.length}.`)
    process.exit(1)
  }
  const { createPrivateKey } = await import('node:crypto')
  const priv = createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
    format: 'der',
    type: 'pkcs8',
  })
  rawPublic = createPublicKey(priv).export({ format: 'der', type: 'spki' }).subarray(SPKI_PREFIX_LEN)
} else {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  seed = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(PKCS8_PREFIX_LEN)
  rawPublic = publicKey.export({ format: 'der', type: 'spki' }).subarray(SPKI_PREFIX_LEN)
}

const fingerprint = createHash('sha256').update(rawPublic).digest('hex').slice(0, 16)

const cppArray = Array.from(rawPublic)
  .map((b) => `0x${b.toString(16).padStart(2, '0')}`)
  .reduce((rows, byte, i) => {
    if (i % 8 === 0) rows.push([])
    rows[rows.length - 1].push(byte)
    return rows
  }, [])
  .map((row) => `    ${row.join(', ')},`)
  .join('\n')

if (!publicOnly) {
  console.log('PRIVATE KEY — server only, never in the repo, never in a plugin')
  console.log('')
  console.log(seed.toString('base64'))
  console.log('')
  console.log('Store it in Vercel with printf, NOT echo. echo appends a newline and')
  console.log('the newline silently becomes part of the secret:')
  console.log('')
  console.log("  printf '%s' '<the line above>' | vercel env add LICENSE_SIGNING_KEY production")
  console.log('')
  console.log('Also generate a separate issuer secret for the endpoint auth:')
  console.log('')
  console.log("  printf '%s' \"$(openssl rand -base64 32)\" | vercel env add LICENSE_ISSUER_SECRET production")
  console.log('')
  console.log('─'.repeat(72))
  console.log('')
}

console.log('PUBLIC KEY — safe to publish, belongs in the plugin')
console.log('')
console.log(rawPublic.toString('base64'))
console.log('')
console.log(`Fingerprint: ${fingerprint}`)
console.log('')
console.log('Paste into the plugin. Print the fingerprint in the plugin too: if it')
console.log('ever disagrees with GET /api/license, the shipped key and the deployed')
console.log('key have drifted apart, which is otherwise a horrible bug to chase.')
console.log('')
console.log('// Ed25519 licence verification key, fingerprint ' + fingerprint)
console.log('static constexpr unsigned char kLicensePublicKey[32] = {')
console.log(cppArray)
console.log('};')
console.log('')
