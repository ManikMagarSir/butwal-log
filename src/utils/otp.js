const crypto = require('crypto');

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function isAllowedDomain(email) {
  const domain = (process.env.ALLOWED_DOMAIN || 'timesglobal.com.np').toLowerCase();
  return String(email || '').toLowerCase().endsWith('@' + domain);
}

module.exports = { generateOtp, hashOtp, isAllowedDomain };
