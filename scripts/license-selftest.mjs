// Prove the licence layer actually works before a single plugin depends on it.
//
// Every case here has to be able to FAIL on purpose. A test that only checks
// the happy path proves nothing: the whole point of a signature is that forged
// and expired files get rejected, so those are the cases that carry the weight.
//
// Uses a throwaway key pair generated in memory. Touches no environment, no
// network, and no stored key, so it is safe to run anywhere at any time.
//
// Usage:
//   node scripts/license-selftest.mjs
//
// Exit code 0 means every case passed. Do NOT pipe this into tail or head when
// checking the result: the shell reports the exit code of the LAST command in
// the pipe, so a failing selftest behind a pipe looks green.

import { generateKeyPairSync, createPublicKey } from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const lic = require('../api/_license.js')

const { privateKey } = generateKeyPairSync('ed25519')
const publicKey = createPublicKey(privateKey)
const otherPublicKey = generateKeyPairSync('ed25519').publicKey

const NOW = Math.floor(Date.now() / 1000)

let passed = 0
let failed = 0

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  ok   ${name}`)
  } else {
    failed += 1
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('')
console.log('Licence selftest')
console.log('')

// ---------------------------------------------------------------- happy path
console.log('A perpetual licence')
const full = lic.mintLicense(
  { product: 'tagoclip-pro', edition: 'full', email: 'buyer@example.com' },
  privateKey,
)
const fullResult = lic.verifyLicense(full.text, publicKey, NOW)
check('verifies', fullResult.ok, fullResult.reason)
check('carries the buyer address', fullResult.payload?.email === 'buyer@example.com')
check('has no expiry', fullResult.payload?.expires === null)
check('filename ends in .tagolicense', full.filename.endsWith('.tagolicense'))
check('is armoured', full.text.startsWith(lic.ARMOUR_BEGIN) && full.text.trim().endsWith(lic.ARMOUR_END))

// ------------------------------------------------------------------ forgery
console.log('')
console.log('Forgery must be rejected')

// Flip one character inside the payload. Picking a character that actually
// changes the decoded bytes matters, hence the explicit swap rather than a
// random pick that might land on padding.
const payloadB64 = full.compact.split('.')[0]
const sigB64 = full.compact.split('.')[1]
const flippedChar = payloadB64[10] === 'A' ? 'B' : 'A'
const tamperedPayload = `${payloadB64.slice(0, 10)}${flippedChar}${payloadB64.slice(11)}.${sigB64}`
const tamperedResult = lic.verifyLicense(lic.armour(tamperedPayload), publicKey, NOW)
check('edited payload fails', !tamperedResult.ok, tamperedResult.reason)
check('edited payload reports bad-signature', tamperedResult.reason === 'bad-signature', tamperedResult.reason)

const flippedSig = sigB64[10] === 'A' ? 'B' : 'A'
const tamperedSig = `${payloadB64}.${sigB64.slice(0, 10)}${flippedSig}${sigB64.slice(11)}`
const tamperedSigResult = lic.verifyLicense(lic.armour(tamperedSig), publicKey, NOW)
check('edited signature fails', !tamperedSigResult.ok, tamperedSigResult.reason)

// The one that would actually matter in the wild: somebody generates their own
// key pair and signs a licence that looks perfect in every other respect.
const forged = lic.mintLicense(
  { product: 'tagoclip-pro', edition: 'full', email: 'pirate@example.com' },
  generateKeyPairSync('ed25519').privateKey,
)
const forgedResult = lic.verifyLicense(forged.text, publicKey, NOW)
check('licence signed with a foreign key fails', !forgedResult.ok, forgedResult.reason)

const wrongKeyResult = lic.verifyLicense(full.text, otherPublicKey, NOW)
check('a real licence fails against the wrong public key', !wrongKeyResult.ok, wrongKeyResult.reason)

check('garbage input fails without throwing', lic.verifyLicense('not a licence at all', publicKey, NOW).reason === 'malformed')
check('empty input fails without throwing', lic.verifyLicense('', publicKey, NOW).reason === 'malformed')

// ------------------------------------------------------------------- trials
console.log('')
console.log('Trials expire')
const liveTrial = lic.mintLicense(
  { product: 'tagoclip-pro', edition: 'trial', email: 'trying@example.com', expiresAt: NOW + 14 * 86400 },
  privateKey,
)
const liveTrialResult = lic.verifyLicense(liveTrial.text, publicKey, NOW)
check('a running trial verifies', liveTrialResult.ok, liveTrialResult.reason)

// Same file, clock moved past the end date. Nothing about the file changed, so
// this proves the expiry branch and not some difference in how it was minted.
const afterExpiry = lic.verifyLicense(liveTrial.text, publicKey, NOW + 15 * 86400)
check('the same trial fails once the date passes', !afterExpiry.ok, afterExpiry.reason)
check('expiry reports expired, not bad-signature', afterExpiry.reason === 'expired', afterExpiry.reason)

// A user who sets the clock back gets their trial back. Known and accepted:
// the alternative is an online check, which is the cost we chose not to pay.
const beforeIssue = lic.verifyLicense(liveTrial.text, publicKey, NOW - 400 * 86400)
check('clock rollback still verifies (known, accepted)', beforeIssue.ok, beforeIssue.reason)

// ------------------------------------------------------- transport mangling
console.log('')
console.log('Surviving mail and copy-paste')
const crlf = full.text.replace(/\n/g, '\r\n')
check('CRLF line endings still verify', lic.verifyLicense(crlf, publicKey, NOW).ok)

const reflowed = full.text.replace(/\n/g, '\n \n')
check('extra blank lines still verify', lic.verifyLicense(reflowed, publicKey, NOW).ok)

const noArmour = full.compact
check('bare compact form still verifies', lic.verifyLicense(noArmour, publicKey, NOW).ok)

const indented = full.text.split('\n').map((l) => `> ${l}`).join('\n')
check('quoted in a mail reply still verifies', lic.verifyLicense(indented, publicKey, NOW).ok)

// ------------------------------------------------------------------ reissue
console.log('')
console.log('Reissue keeps the identity')
const reissued = lic.mintLicense(
  { product: 'tagoclip-pro', edition: 'full', email: 'buyer@example.com', id: full.id },
  privateKey,
)
check('reissued licence keeps the same id', reissued.id === full.id)
check('reissued licence verifies', lic.verifyLicense(reissued.text, publicKey, NOW).ok)
check('reissued licence carries the same address', lic.verifyLicense(reissued.text, publicKey, NOW).payload?.email === 'buyer@example.com')

// ------------------------------------------------------------- key handling
console.log('')
console.log('Keys survive the trip through base64')
const seedB64 = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(16).toString('base64')
const rebuiltPrivate = lic.privateKeyFromSeed(seedB64)
const rawPub = lic.rawPublicKey(rebuiltPrivate)
const rebuiltPublic = lic.publicKeyFromRaw(rawPub.toString('base64'))
const roundTrip = lic.mintLicense(
  { product: 'tagopitch-pro', edition: 'full', email: 'roundtrip@example.com' },
  rebuiltPrivate,
)
check('a key rebuilt from base64 signs', lic.verifyLicense(roundTrip.text, rebuiltPublic, NOW).ok)
check('and its licence verifies against the original key', lic.verifyLicense(roundTrip.text, publicKey, NOW).ok)
check('fingerprint is stable', lic.keyFingerprint(rawPub) === lic.keyFingerprint(lic.rawPublicKey(privateKey)))
check('fingerprint is 16 hex chars', /^[0-9a-f]{16}$/.test(lic.keyFingerprint(rawPub)))

// The newline trap, as an actual test rather than a comment.
const seedWithNewline = `${seedB64}\n`
let newlineSurvived = false
try {
  lic.privateKeyFromSeed(seedWithNewline)
  newlineSurvived = true
} catch (err) {
  newlineSurvived = false
}
check('a trailing newline on the stored key is tolerated', newlineSurvived)

console.log('')
console.log(`${passed} passed, ${failed} failed`)
console.log('')
process.exit(failed === 0 ? 0 : 1)
