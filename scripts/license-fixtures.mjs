// Build and apply the licence-folder states Z1 to Z14 from the unlicensed-state
// test plan, so a test run is repeatable instead of assembled by hand.
//
// WHY A SCRIPT AND NOT A CHECKLIST
// The states that actually break a plugin during a host scan are the awkward
// ones: a 50 MB file, a directory where a file belongs, a dangling symlink, a
// file the process may not read. Nobody rebuilds those correctly by hand on the
// third pass, and a state that was silently skipped looks exactly like a state
// that passed.
//
// TWO PHASES ON PURPOSE
//   build   needs the crypto and, for real licences, the signing key. Runs once
//           on the Mac inside this repo. Produces a self-contained folder.
//   apply   needs nothing but Node built-ins and that folder. Runs on whatever
//           machine is under test, including Windows.
//
// That split exists so the production signing key never has to travel to a test
// machine. Copy the fixtures folder and this file, leave the key at home.
//
// WHICH KEY TO BUILD WITH
//   --key prod (default)  Signs with the real key from .env.license.local. The
//                         fixtures then work against a normal shipping build,
//                         which is what you actually want to certify. Build on
//                         the Mac, copy the folder to the test machine.
//   --key fixture         Signs with a throwaway pair stored next to the
//                         fixtures. Nothing secret is involved, but a plugin
//                         carrying the production public key will reject every
//                         signed fixture, so Z3/Z12/Z13 become indistinguishable
//                         from Z5. Only useful against a build that has the
//                         fixture public key compiled in; the script prints the
//                         C++ array for exactly that case.
//
// Z5 always needs a second, foreign pair. That one is generated on the fly and
// is never the production key.
//
// Usage:
//   node scripts/license-fixtures.mjs build --out ../fixtures --email you@example.com
//       Generate every artefact plus a manifest, then verify each one really is
//       what it claims to be.
//
//   node scripts/license-fixtures.mjs apply Z7 --fixtures ../fixtures
//       Put the licence folder into state Z7. Backs the folder up first.
//
//   node scripts/license-fixtures.mjs status   --fixtures ../fixtures
//   node scripts/license-fixtures.mjs restore  --fixtures ../fixtures
//   node scripts/license-fixtures.mjs list
//
// Common flags:
//   --dir <path>      Licence folder to operate on. Defaults per platform.
//   --product <name>  Product the licences are issued for. Default TagoClipPro.

import { createRequire } from 'node:module'
import { generateKeyPairSync } from 'node:crypto'
import {
  mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, cpSync,
  readdirSync, statSync, lstatSync, symlinkSync, chmodSync, openSync,
  writeSync, closeSync,
} from 'node:fs'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir, platform } from 'node:os'
import { execFileSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))

// One format, one implementation. Reproducing the armour and the signing rules
// in a second file is how the two quietly drift apart, and a fixture that is
// subtly wrong invalidates every run that used it.
const {
  mintLicense, verifyLicense, privateKeyFromSeed, publicKeyFromRaw,
  rawPublicKey, keyFingerprint, ARMOUR_BEGIN,
} = require(join(here, '..', 'api', '_license.js'))

const args = process.argv.slice(2)
const command = args[0]
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

const PRODUCT = flag('product', 'TagoClipPro')
const EDITION = flag('edition', 'pro')
const IS_WINDOWS = platform() === 'win32'

function die(message) {
  console.error(message)
  process.exit(1)
}

// Where the plugin will look for its licence. NOT decided yet (strand B still
// has "pick the licence path per platform" open), so it stays a default that
// --dir overrides rather than something this script gets to settle.
function defaultLicenseDir() {
  if (IS_WINDOWS) {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    return join(appData, 'TagoBeats', PRODUCT)
  }
  if (platform() === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'TagoBeats', PRODUCT)
  }
  return join(homedir(), '.config', 'TagoBeats', PRODUCT)
}

const STATES = {
  Z1:  'no licence file, folder exists',
  Z2:  'licence folder does not exist at all',
  Z3:  'valid licence',
  Z4:  'valid licence with one byte flipped in the signature',
  Z5:  'licence signed by a foreign key pair',
  Z6:  'zero-byte file',
  Z7:  'binary junk, no armour markers',
  Z8:  '50 MB file',
  Z9:  'a directory where the licence file belongs',
  Z10: 'symlink pointing nowhere',
  Z11: 'file that cannot be read',
  Z12: 'expired trial licence',
  Z13: 'valid licence for a different product',
  Z14: 'two files, one valid and one broken',
}

// States whose artefact is generated at apply time rather than carried in the
// fixtures folder: 50 MB does not need to cross a USB stick, and the filesystem
// oddities have to be created on the machine under test to mean anything.
const GENERATED_AT_APPLY = new Set(['Z1', 'Z2', 'Z6', 'Z8', 'Z9', 'Z10', 'Z11'])

const LICENSE_EXT = '.tagolicense'

// ---------------------------------------------------------------- build phase

function loadProdKey() {
  const envPath = flag('env', join(here, '..', '.env.license.local'))
  if (!existsSync(envPath)) {
    die(`No key file at ${envPath}. Pass --env <path>, or use --key fixture.`)
  }
  const line = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('LICENSE_SIGNING_KEY='))
  if (!line) die(`${envPath} has no LICENSE_SIGNING_KEY`)
  const seed = line.slice('LICENSE_SIGNING_KEY='.length).trim().replace(/^["']|["']$/g, '')
  return privateKeyFromSeed(seed)
}

// A throwaway pair, stored in the clear next to the fixtures. Safe precisely
// because it is worthless: it signs nothing anyone paid for.
function loadOrCreateFixtureKey(outDir) {
  const keyPath = join(outDir, 'fixture-key.json')
  if (existsSync(keyPath)) {
    const stored = JSON.parse(readFileSync(keyPath, 'utf8'))
    return privateKeyFromSeed(stored.seed)
  }
  const { privateKey } = generateKeyPairSync('ed25519')
  const seed = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(16).toString('base64')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(keyPath, `${JSON.stringify({ seed, note: 'throwaway test key, not a secret' }, null, 2)}\n`)
  return privateKeyFromSeed(seed)
}

function cppArray(raw) {
  const bytes = [...raw].map((b) => `0x${b.toString(16).padStart(2, '0')}`)
  const rows = []
  for (let i = 0; i < bytes.length; i += 8) rows.push(`    ${bytes.slice(i, i + 8).join(', ')},`)
  return `static constexpr unsigned char kLicensePublicKey[32] = {\n${rows.join('\n')}\n};`
}

// Flip one bit inside the signature, leaving the payload and the armour intact.
// A whole-file corruption would also be caught by the parser, which would prove
// nothing about signature checking; this has to fail at the verify step and
// nowhere earlier.
function flipSignatureBit(text) {
  const lines = text.split('\n')
  const dot = lines.findIndex((l) => l.trim() === '.')
  if (dot === -1) die('Cannot locate the payload/signature separator')
  for (let i = dot + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.startsWith('-----')) continue
    const ch = line[0]
    const swapped = ch === 'A' ? 'B' : 'A'
    lines[i] = swapped + line.slice(1)
    return lines.join('\n')
  }
  die('Signature block looks empty')
}

function build() {
  const outDir = resolve(flag('out', join(here, '..', '..', 'license-fixtures')))
  const email = flag('email', 'fixture@tagobeats.com')
  const keyMode = flag('key', 'prod')
  if (keyMode !== 'prod' && keyMode !== 'fixture') die(`--key must be prod or fixture, got ${keyMode}`)

  mkdirSync(outDir, { recursive: true })
  const signingKey = keyMode === 'prod' ? loadProdKey() : loadOrCreateFixtureKey(outDir)
  const raw = rawPublicKey(signingKey)
  const fingerprint = keyFingerprint(raw)

  // Z5 needs a pair that is not ours and must never be the production one.
  const { privateKey: foreignKey } = generateKeyPairSync('ed25519')

  const now = Math.floor(Date.now() / 1000)
  const valid = mintLicense({ product: PRODUCT, edition: EDITION, email }, signingKey)
  const foreign = mintLicense({ product: PRODUCT, edition: EDITION, email }, foreignKey)
  const expired = mintLicense(
    { product: PRODUCT, edition: 'trial', email, expiresAt: now - 60 * 60 * 24 * 7 },
    signingKey,
  )
  const otherProduct = mintLicense(
    { product: 'TagoPitch', edition: EDITION, email },
    signingKey,
  )

  const files = {
    Z3: [[valid.filename, valid.text]],
    Z4: [[valid.filename, flipSignatureBit(valid.text)]],
    Z5: [[foreign.filename, foreign.text]],
    Z7: [[`${PRODUCT}-junk${LICENSE_EXT}`, null]],
    Z12: [[expired.filename, expired.text]],
    Z13: [[otherProduct.filename, otherProduct.text]],
    Z14: [[valid.filename, valid.text], [`${PRODUCT}-broken${LICENSE_EXT}`, flipSignatureBit(valid.text)]],
  }

  for (const [state, entries] of Object.entries(files)) {
    const stateDir = join(outDir, state)
    rmSync(stateDir, { recursive: true, force: true })
    mkdirSync(stateDir, { recursive: true })
    for (const [name, text] of entries) {
      if (text === null) {
        // Deliberately unprintable bytes with no armour anywhere, including a
        // stray run of hyphens so the parser's marker fallback gets exercised.
        //
        // Every 0x2e is replaced, and that is the whole point of this fixture.
        // With dots left in, the junk splits into a payload and a signature by
        // accident, parses fine and only fails at the signature check. Z7 would
        // then be testing the same path as Z4 and Z5, and which path it hit
        // would depend on the bytes. The first draft did exactly that and the
        // verifier below caught it. No dots means it reliably dies in the
        // parser, which is the path Z7 exists for.
        const junk = Buffer.concat([
          Buffer.from([0x00, 0xff, 0xfe, 0x0d, 0x0a, 0x1b]),
          Buffer.from('----- not a licence -----', 'utf8'),
          Buffer.from(Array.from({ length: 512 }, (_, i) => {
            const byte = (i * 37) % 256
            return byte === 0x2e ? 0x2f : byte
          })),
        ])
        writeFileSync(join(stateDir, name), junk)
      } else {
        writeFileSync(join(stateDir, name), text)
      }
    }
  }

  const manifest = {
    created: new Date().toISOString(),
    product: PRODUCT,
    edition: EDITION,
    email,
    keyMode,
    fingerprint,
    publicKey: raw.toString('base64'),
    states: STATES,
    generatedAtApply: [...GENERATED_AT_APPLY],
  }
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(`Fixtures written to ${outDir}`)
  console.log(`Key mode:    ${keyMode}`)
  console.log(`Fingerprint: ${fingerprint}`)
  console.log('')

  const failures = verifyFixtures(outDir, raw)
  if (failures.length) {
    console.error('')
    console.error('Fixtures are NOT trustworthy, do not run the test plan with them:')
    for (const f of failures) console.error(`  ${f}`)
    process.exit(1)
  }

  if (keyMode === 'fixture') {
    console.log('')
    console.log('These fixtures are signed with a throwaway key. A build carrying the')
    console.log('production public key will reject all of them. Compile this in instead:')
    console.log('')
    console.log(cppArray(raw))
  }
}

// Check every fixture really is the thing it claims to be, using the same
// verifier the plugin mirrors. A fixture that quietly became something else
// turns the whole test run into a measurement of nothing: Z4 that fails as
// "malformed" instead of "bad-signature" never touched the signature path.
function verifyFixtures(outDir, rawPublic) {
  const pub = publicKeyFromRaw(rawPublic.toString('base64'))
  const expected = {
    Z3:  { ok: true,  reason: 'valid' },
    Z4:  { ok: false, reason: 'bad-signature' },
    Z5:  { ok: false, reason: 'bad-signature' },
    Z7:  { ok: false, reason: 'malformed' },
    Z12: { ok: false, reason: 'expired' },
    Z13: { ok: true,  reason: 'valid' },
  }
  const failures = []

  for (const [state, want] of Object.entries(expected)) {
    const dir = join(outDir, state)
    const file = readdirSync(dir)[0]
    const text = readFileSync(join(dir, file), 'utf8')
    const got = verifyLicense(text, pub)
    const mark = got.ok === want.ok && got.reason === want.reason ? 'ok  ' : 'FAIL'
    if (mark === 'FAIL') {
      failures.push(`${state}: expected ${want.reason}, got ${got.reason}`)
    }
    console.log(`  ${mark} ${state}  ${STATES[state]}  ->  ${got.reason}`)
  }

  // Z13 is the one that needs saying out loud. verifyLicense() knows nothing
  // about products, so a TagoPitch licence verifies perfectly here. Rejecting it
  // is the plugin's job, and if the plugin forgets, one licence unlocks the
  // whole product line.
  console.log('')
  console.log('  note  Z13 verifies as valid on purpose: the signature IS ours.')
  console.log('        The plugin must compare payload.product itself, otherwise')
  console.log('        any licence of the line unlocks any product of the line.')

  const armoured = readFileSync(join(outDir, 'Z3', readdirSync(join(outDir, 'Z3'))[0]), 'utf8')
  if (!armoured.includes(ARMOUR_BEGIN)) failures.push('Z3: armour markers missing')

  return failures
}

// ---------------------------------------------------------------- apply phase

function loadManifest(fixturesDir) {
  const path = join(fixturesDir, 'manifest.json')
  if (!existsSync(path)) die(`No manifest.json in ${fixturesDir}. Run build first.`)
  return JSON.parse(readFileSync(path, 'utf8'))
}

// Back up whatever is in the licence folder before the first apply, and record
// whether the folder existed at all so restore can put Z2 back properly.
//
// Written once and never overwritten: a second backup would capture Z7 as the
// "original" and quietly destroy a real licence the user had sitting there.
function ensureBackup(fixturesDir, licenseDir) {
  const backupDir = join(fixturesDir, '_backup')
  const statePath = join(backupDir, 'state.json')
  if (existsSync(statePath)) return

  mkdirSync(backupDir, { recursive: true })
  const existed = existsSync(licenseDir)
  if (existed) {
    try {
      cpSync(licenseDir, join(backupDir, 'contents'), { recursive: true, force: true })
    } catch (err) {
      // Refuse to continue rather than press on with a half-written backup.
      // Everything after this point deletes the folder's contents, and the only
      // thing standing between that and a real licence is this copy.
      die(`Could not back up ${licenseDir}: ${err.message}\n` +
          `Something in there is unreadable. Fix its permissions, or point --dir\n` +
          `somewhere else. Nothing has been changed.`)
    }
  }
  writeFileSync(statePath, `${JSON.stringify({ licenseDir, existed, saved: new Date().toISOString() }, null, 2)}\n`)
  console.log(`Backed up ${existed ? 'existing folder' : 'the fact that no folder existed'} to ${backupDir}`)
}

// Make a path removable again, then remove it.
//
// Two leftovers fight back. Z11 is a file with no permissions at all, and Z9 is
// a directory. Handing a directory 0o600 the way a file gets it strips the
// execute bit, and without execute nothing can descend into it, so rmSync comes
// back with ENOTEMPTY on a directory that is right there. That is a bug this
// script had and it took out every state after Z9.
function forceRemove(target) {
  let st
  try { st = lstatSync(target) } catch { return }

  if (!st.isSymbolicLink()) {
    // Directories need 0o700, files 0o600. Same idea, one bit apart, and the
    // missing bit is the whole difference between removable and not.
    try { chmodSync(target, st.isDirectory() ? 0o700 : 0o600) } catch {}
    if (st.isDirectory()) {
      for (const entry of readdirSync(target)) forceRemove(join(target, entry))
    }
  }
  if (IS_WINDOWS) {
    try { execFileSync('icacls', [target, '/reset', '/t', '/q'], { stdio: 'ignore' }) } catch {}
  }

  rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 })
  if (existsSync(target) || lstatSyncSafe(target)) {
    die(`Could not remove ${target}. Fix the permissions by hand before continuing.`)
  }
}

// existsSync follows symlinks, so a dangling Z10 link reports false while still
// sitting in the directory. lstat is the one that sees it.
function lstatSyncSafe(target) {
  try { return lstatSync(target) } catch { return null }
}

function clearLicenseDir(licenseDir) {
  if (!existsSync(licenseDir)) return
  for (const entry of readdirSync(licenseDir)) forceRemove(join(licenseDir, entry))
}

function apply(state, fixturesDir, licenseDir) {
  if (!STATES[state]) die(`Unknown state ${state}. Run "list" to see Z1 to Z14.`)
  const manifest = loadManifest(fixturesDir)

  ensureBackup(fixturesDir, licenseDir)
  clearLicenseDir(licenseDir)

  const licenseName = `${manifest.product}-fixture${LICENSE_EXT}`
  let note = ''

  if (state === 'Z2') {
    rmSync(licenseDir, { recursive: true, force: true })
    console.log(`${state}  ${STATES[state]}  ->  ${licenseDir} removed`)
    writeCurrent(fixturesDir, state)
    return
  }

  mkdirSync(licenseDir, { recursive: true })

  switch (state) {
    case 'Z1':
      break

    case 'Z6':
      writeFileSync(join(licenseDir, licenseName), '')
      break

    case 'Z8': {
      // Written in chunks rather than as one 50 MB buffer, so the script does
      // not itself become the thing that runs out of memory.
      const chunk = Buffer.alloc(1024 * 1024, 0x41)
      const fd = openSync(join(licenseDir, licenseName), 'w')
      try { for (let i = 0; i < 50; i++) writeSync(fd, chunk) } finally { closeSync(fd) }
      break
    }

    case 'Z9':
      mkdirSync(join(licenseDir, licenseName), { recursive: true })
      writeFileSync(join(licenseDir, licenseName, 'decoy.txt'), 'this is a directory\n')
      break

    case 'Z10':
      try {
        symlinkSync(join(licenseDir, 'target-that-does-not-exist'), join(licenseDir, licenseName))
      } catch (err) {
        // Windows refuses symlinks without Developer Mode or elevation. Saying
        // so beats a fixture that silently did not happen.
        die(`Z10 could not be created: ${err.message}\n` +
            'On Windows enable Developer Mode, or mark Z10 as not run.')
      }
      break

    case 'Z11': {
      const target = join(licenseDir, licenseName)
      writeFileSync(target, 'unreadable\n')
      if (IS_WINDOWS) {
        try {
          execFileSync('icacls', [target, '/inheritance:r', '/deny', `${process.env.USERNAME}:(R)`], { stdio: 'ignore' })
        } catch (err) {
          die(`Z11 could not be created: ${err.message}`)
        }
      } else {
        chmodSync(target, 0o000)
        if (process.getuid && process.getuid() === 0) {
          note = 'running as root, which can read a 000 file anyway: rerun as a normal user'
        }
      }
      break
    }

    default: {
      // Everything else is a prepared file, copied verbatim.
      const stateDir = join(fixturesDir, state)
      if (!existsSync(stateDir)) die(`${state} is missing from ${fixturesDir}. Rebuild the fixtures.`)
      for (const entry of readdirSync(stateDir)) {
        cpSync(join(stateDir, entry), join(licenseDir, entry))
      }
      break
    }
  }

  const listing = existsSync(licenseDir) ? readdirSync(licenseDir) : []
  console.log(`${state}  ${STATES[state]}`)
  console.log(`  folder:  ${licenseDir}`)
  console.log(`  entries: ${listing.length ? listing.join(', ') : '(empty)'}`)
  if (note) console.log(`  note:    ${note}`)
  writeCurrent(fixturesDir, state)
}

function writeCurrent(fixturesDir, state) {
  writeFileSync(
    join(fixturesDir, '_backup', 'current.json'),
    `${JSON.stringify({ state, applied: new Date().toISOString() }, null, 2)}\n`,
  )
}

function status(fixturesDir, licenseDir) {
  const currentPath = join(fixturesDir, '_backup', 'current.json')
  const current = existsSync(currentPath) ? JSON.parse(readFileSync(currentPath, 'utf8')) : null

  console.log(`Licence folder: ${licenseDir}`)
  console.log(`Exists:         ${existsSync(licenseDir)}`)
  if (existsSync(licenseDir)) {
    for (const entry of readdirSync(licenseDir)) {
      const target = join(licenseDir, entry)
      const st = lstatSync(target)
      const kind = st.isSymbolicLink() ? 'symlink' : st.isDirectory() ? 'dir' : 'file'
      const size = st.isFile() ? `${st.size} B` : ''
      console.log(`  ${entry}  [${kind}] ${size}`)
    }
  }
  console.log(`Applied state:  ${current ? `${current.state} at ${current.applied}` : 'none recorded'}`)
  const backup = join(fixturesDir, '_backup', 'state.json')
  console.log(`Backup:         ${existsSync(backup) ? backup : 'none yet'}`)
}

function restore(fixturesDir) {
  const statePath = join(fixturesDir, '_backup', 'state.json')
  if (!existsSync(statePath)) die('Nothing to restore: no backup was ever taken.')
  const saved = JSON.parse(readFileSync(statePath, 'utf8'))

  clearLicenseDir(saved.licenseDir)
  forceRemove(saved.licenseDir)

  if (saved.existed) {
    const source = join(fixturesDir, '_backup', 'contents')
    cpSync(source, saved.licenseDir, { recursive: true })

    // Check the restore actually happened instead of announcing that it did.
    //
    // An earlier version printed its success line unconditionally. When the
    // clear step failed, it said "restored" over a folder that had just lost a
    // real licence. A restore that can lie is worse than no restore at all,
    // because it is the one command that runs after everything else is broken.
    const want = readdirSync(source).sort()
    const got = existsSync(saved.licenseDir) ? readdirSync(saved.licenseDir).sort() : []
    if (want.join('\u0000') !== got.join('\u0000')) {
      die(`Restore did not take. Expected [${want}], found [${got}].\n` +
          `The backup is still intact at ${source}, copy it back by hand.`)
    }
    console.log(`Restored ${want.length} entr${want.length === 1 ? 'y' : 'ies'} to ${saved.licenseDir}`)
  } else {
    if (existsSync(saved.licenseDir)) {
      die(`${saved.licenseDir} should be gone but is still there.`)
    }
    console.log(`${saved.licenseDir} did not exist before, and does not now.`)
  }
  rmSync(join(fixturesDir, '_backup', 'current.json'), { force: true })
}

// --------------------------------------------------------------------- driver

const fixturesDir = resolve(flag('fixtures', join(here, '..', '..', 'license-fixtures')))
const licenseDir = resolve(flag('dir', defaultLicenseDir()))

switch (command) {
  case 'build':
    build()
    break
  case 'apply':
    if (!args[1] || args[1].startsWith('--')) die('apply needs a state, e.g. apply Z7')
    apply(args[1].toUpperCase(), fixturesDir, licenseDir)
    break
  case 'status':
    status(fixturesDir, licenseDir)
    break
  case 'restore':
    restore(fixturesDir)
    break
  case 'list':
    for (const [state, desc] of Object.entries(STATES)) {
      const where = GENERATED_AT_APPLY.has(state) ? 'built on apply' : 'prepared file'
      console.log(`  ${state.padEnd(4)} ${desc.padEnd(48)} ${where}`)
    }
    break
  default:
    die('Usage: build | apply <Z1..Z14> | status | restore | list  (see the header of this file)')
}
