const crypto = require('crypto')
const { promisify } = require('util')
const scrypt = promisify(crypto.scrypt)

exports.parse_password_hash = function (phcString) {
  const parts = phcString.split('$')
  if (parts.length !== 5 || parts[1] !== 'scrypt') {
    throw new Error('Invalid PHC scrypt format')
  }

  const paramString = parts[2]
  const params = {}
  paramString.split(',').forEach((param) => {
    const [key, value] = param.split('=')
    params[key] = parseInt(value)
  })

  const salt = Buffer.from(parts[3], 'base64')
  const hash = Buffer.from(parts[4], 'base64')

  return { params, salt, hash }
}

exports.verify_password_hash = async function (password, phcHash) {
  try {
    const {
      params,
      salt,
      hash: originalHash,
    } = exports.parse_password_hash(phcHash)

    const scryptOptions = {
      N: params.n,
      r: params.r,
      p: params.p,
    }

    const inputHash = await scrypt(
      password,
      salt,
      originalHash.length,
      scryptOptions
    )

    return crypto.timingSafeEqual(originalHash, inputHash)
  } catch (error) {
    console.error('PHC verification error:', error.message)
    return false
  }
}
