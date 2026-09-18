// Generate the Ed25519 key pair that the licence layer runs on.
//
// Run this ONCE. The private half goes into Vercel and never moves again; the
// public half gets compiled into every plugin build. Rotating the key later
// invalidates every licence already in the wild, so treat the output as
// something to back up rather than something to regenerate.
//
// The private key is never printed. It goes straight into a local file that
// .gitignore already covers (.env*.local), written with owner-only permissions,
// and the script refuses to overwrite an existing one. Printing a signing key
// puts it in shell history, scrollback, terminal logs and anything reading the
// terminal, and there is no reason to ever look at it.
//
// Usage:
//   node scripts/license-keygen.mjs --write .env.license.local
//       Generate a new pair plus an issuer secret. Writes the secrets to the
//       file, prints only the public key, the fingerprint and the C++ array.
//
//   node scripts/license-keygen.mjs --public-only --from .env.license.local
//       Reprint the public material from a key you already have. Also accepts
//       LICENSE_SIGNING_KEY from the environment instead of --from.

import { generateKeyPairSync, createPrivateKey, createPublicKey, createHash, randomBytes } from 'node:crypto'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')
const SPKI_PREFIX_LEN = 12
const PKCS8_PREFIX_LEN = 16

const args = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const has = (name) => args.includes(`--${name}`)

const publicOnly = has('public-only')
const writePath = flag('write')
const fromPath = flag('from')

function die(message) {
  console.error(message)
  process.exit(1)
}

function seedFromFile(path) {
  const match = readFileSync(path, 'utf8').match(/^LICENSE_SIGNING_KEY=(.*)$/m)
  if (!match) die(`No LICENSE_SIGNING_KEY line in ${path}`)
  return match[1].trim()
}

function publicFromSeed(seed) {
  if (seed.length !== 32) die(`Signing key must be 32 bytes, got ${seed.length}`)
  const priv = createPrivateKey({
    key: Buffer.concat([PKCS8_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  })
  return createPublicKey(priv).export({ format: 'der', type: 'spki' }).subarray(SPKI_PREFIX_LEN)
}

let rawPublic

if (publicOnly) {
  const stored = fromPath
    ? seedFromFile(fromPath)
    : process.env.LICENSE_SIGNING_KEY
  if (!stored) die('--public-only needs --from <file> or LICENSE_SIGNING_KEY in the environment.')
  rawPublic = publicFromSeed(Buffer.from(stored.trim(), 'base64'))
} else {
  if (!writePath) {
    die([
      'Refusing to generate a key with nowhere safe to put it.',
      '',
      '  node scripts/license-keygen.mjs --write .env.license.local',
      '',
      'The private key is never printed, so it needs a destination file.',
      'Already have a key and just want the public half again?',
      '',
      '  node scripts/license-keygen.mjs --public-only --from .env.license.local',
    ].join('\n'))
  }

  // The guard that matters most in this file. Overwriting a live signing key
  // silently invalidates every licence ever issued, and there is no way back.
  if (existsSync(writePath)) {
    die([
      `${writePath} already exists. Refusing to overwrite it.`,
      '',
      'If that file holds the live signing key, overwriting it would invalidate',
      'every licence already sold, with no way to recover them. Move it aside',
      'deliberately if you really mean to start over.',
    ].join('\n'))
  }

  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const seed = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(PKCS8_PREFIX_LEN)
  rawPublic = publicKey.export({ format: 'der', type: 'spki' }).subarray(SPKI_PREFIX_LEN)

  // The issuer secret rides along: it is needed at the same moment, and having
  // both in one file means one backup instead of two things to forget.
  const issuerSecret = randomBytes(32).toString('base64')

  const contents = [
    '# Licence layer secrets. Never commit. .gitignore covers .env*.local.',
    '# Back this up somewhere durable: losing the signing key means every',
    '# licence already issued can no longer be reissued or extended.',
    `LICENSE_SIGNING_KEY=${seed.toString('base64')}`,
    `LICENSE_ISSUER_SECRET=${issuerSecret}`,
    '',
  ].join('\n')

  writeFileSync(writePath, contents, { mode: 0o600 })

  console.log('')
  console.log(`Secrets written to ${writePath} (owner read/write only).`)
  console.log('Back that file up now. It cannot be regenerated.')
  console.log('')
  console.log('Push both into Vercel without ever putting them on screen.')
  console.log('tr -d is doing the real work here: a trailing newline silently')
  console.log('becomes part of the secret, and the failure looks like a bad key.')
  console.log('')
  console.log(`  sed -n 's/^LICENSE_SIGNING_KEY=//p' ${writePath} | tr -d '\\n' \\`)
  console.log('    | vercel env add LICENSE_SIGNING_KEY production')
  console.log('')
  console.log(`  sed -n 's/^LICENSE_ISSUER_SECRET=//p' ${writePath} | tr -d '\\n' \\`)
  console.log('    | vercel env add LICENSE_ISSUER_SECRET production')
  console.log('')
  console.log('─'.repeat(72))
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

console.log('')
console.log('PUBLIC KEY — safe to publish, belongs in the plugin')
console.log('')
console.log(rawPublic.toString('base64'))
console.log('')
console.log(`Fingerprint: ${fingerprint}`)
console.log('')
console.log('Print this fingerprint in the plugin too. If it ever disagrees with')
console.log('GET /api/license, the shipped key and the deployed key have drifted')
console.log('apart, which is otherwise a horrible bug to chase.')
console.log('')
console.log(`// Ed25519 licence verification key, fingerprint ${fingerprint}`)
console.log('static constexpr unsigned char kLicensePublicKey[32] = {')
console.log(cppArray)
console.log('};')
console.log('')
