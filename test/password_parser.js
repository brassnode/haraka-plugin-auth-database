const assert = require('node:assert')
const { describe, it, beforeEach } = require('node:test')
const crypto = require('crypto')
const { promisify } = require('util')
const scrypt = promisify(crypto.scrypt)
const {
  parse_password_hash,
  verify_password_hash,
} = require('../lib/password_parser')

describe('parse_password_hash', () => {
  it('parses valid scrypt hash', () => {
    const validHash = '$scrypt$n=16384,r=8,p=1$c2FsdHlzYWx0$dGVzdGhhc2g='
    const result = parse_password_hash(validHash)

    assert.ok(result.params, 'should have params')
    assert.equal(result.params.n, 16384, 'should parse N parameter')
    assert.equal(result.params.r, 8, 'should parse r parameter')
    assert.equal(result.params.p, 1, 'should parse p parameter')
    assert.ok(Buffer.isBuffer(result.salt), 'salt should be buffer')
    assert.ok(Buffer.isBuffer(result.hash), 'hash should be buffer')
    assert.equal(
      result.salt.toString('base64'),
      'c2FsdHlzYWx0',
      'salt should decode correctly'
    )
    assert.equal(
      result.hash.toString('base64'),
      'dGVzdGhhc2g=',
      'hash should decode correctly'
    )
  })

  it('parses hash with different parameters', () => {
    const hash = '$scrypt$n=32768,r=16,p=2$YW5vdGhlcnNhbHQ=$YW5vdGhlcmhhc2g='
    const result = parse_password_hash(hash)

    assert.equal(result.params.n, 32768)
    assert.equal(result.params.r, 16)
    assert.equal(result.params.p, 2)
  })

  it('throws on invalid format - too few parts', () => {
    assert.throws(() => parse_password_hash('invalid'), {
      message: 'Invalid PHC scrypt format',
    })
  })

  it('throws on invalid format - too many parts', () => {
    assert.throws(
      () => parse_password_hash('$scrypt$n=16384$salt$hash$extra'),
      {
        message: 'Invalid PHC scrypt format',
      }
    )
  })

  it('throws on wrong algorithm', () => {
    assert.throws(
      () => parse_password_hash('$argon2$n=16384,r=8,p=1$salt$hash'),
      {
        message: 'Invalid PHC scrypt format',
      }
    )
  })

  it('throws on empty string', () => {
    assert.throws(() => parse_password_hash(''), {
      message: 'Invalid PHC scrypt format',
    })
  })
})

describe('verify_password_hash', () => {
  // Generate a real scrypt hash for testing
  const password = 'testpassword123'
  const salt = Buffer.from('mysaltvalue12345')
  const n = 16384
  const r = 8
  const p = 1
  const keylen = 32

  let validHash

  // Create a valid hash before each test
  beforeEach(async () => {
    const hash = await scrypt(password, salt, keylen, { N: n, r, p })
    validHash = `$scrypt$n=${n},r=${r},p=${p}$${salt.toString(
      'base64'
    )}$${hash.toString('base64')}`
  })

  it('verifies correct password', async () => {
    const result = await verify_password_hash(password, validHash)
    assert.equal(result, true, 'should verify valid password')
  })

  it('rejects incorrect password', async () => {
    const result = await verify_password_hash('wrongpassword', validHash)
    assert.equal(result, false, 'should reject invalid password')
  })

  it('handles invalid hash format', async () => {
    const result = await verify_password_hash(password, 'invalid')
    assert.equal(result, false, 'should handle invalid hash format')
  })

  it('handles undefined password', async () => {
    const result = await verify_password_hash(undefined, validHash)
    assert.equal(result, false, 'should handle undefined password')
  })

  it('handles undefined hash', async () => {
    const result = await verify_password_hash(password, undefined)
    assert.equal(result, false, 'should handle undefined hash')
  })

  it('handles empty string password', async () => {
    const result = await verify_password_hash('', validHash)
    assert.equal(result, false, 'should handle empty password')
  })

  it('handles malformed PHC string', async () => {
    const result = await verify_password_hash(password, '$scrypt$invalid')
    assert.equal(result, false, 'should handle malformed PHC string')
  })

  it('handles hash with invalid base64', async () => {
    const result = await verify_password_hash(
      password,
      '$scrypt$n=16384,r=8,p=1$!!!invalid$base64'
    )
    assert.equal(result, false, 'should handle invalid base64')
  })

  it('verifies with different valid parameters', async () => {
    const salt2 = Buffer.from('differentsalt123')
    const hash2 = await scrypt(password, salt2, 16, { N: 8192, r: 4, p: 2 })
    const phcHash2 = `$scrypt$n=8192,r=4,p=2$${salt2.toString(
      'base64'
    )}$${hash2.toString('base64')}`

    const result = await verify_password_hash(password, phcHash2)
    assert.equal(result, true, 'should verify with different parameters')
  })
})
