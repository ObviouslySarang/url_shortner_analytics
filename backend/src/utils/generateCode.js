const crypto = require('crypto');

function generateShortCode(length = 7) {
  // Generates random bytes and converts to base64url-safe characters
  return crypto.randomBytes(length)
    .toString('base64url')
    .slice(0, length);
}

module.exports = generateShortCode;