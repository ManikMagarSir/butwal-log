const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateOtp, hashOtp, isAllowedDomain } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');
const { fail } = require('../utils/validate');

const router = express.Router();
const otpLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

function isAdminEmail(email) {
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(String(email).toLowerCase());
}

async function issueToken(user, res) {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  // httpOnly + sameSite'lax' always; Secure only behind HTTPS (COOKIE_SECURE=true),
  // since Secure cookies are never sent over plain-HTTP LAN.
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: 7 * 24 * 3600 * 1000,
  });
  return token;
}

async function sendOtp(email, purpose = 'login') {
  await Otp.deleteMany({ email: email.toLowerCase() });
  const otp = generateOtp();
  const ttlMin = Number(process.env.OTP_TTL_MIN || 10);
  await Otp.create({
    email: email.toLowerCase(),
    hash: hashOtp(otp),
    expiresAt: new Date(Date.now() + ttlMin * 60 * 1000),
  });
  await sendOtpEmail(email, otp, purpose);
}

// POST /api/auth/register {name,email} -> creates user + sends OTP
router.post('/register', otpLimiter, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });
    if (!isAllowedDomain(email)) return res.status(400).json({ error: 'Only @timesglobal.com.np emails allowed' });
    const lower = String(email).toLowerCase();
    let user = await User.findOne({ email: lower });
    if (user) return res.status(400).json({ error: 'Already registered. Use login OTP.' });
    const count = await User.countDocuments();
    const role = count === 0 || isAdminEmail(lower) ? 'admin' : 'user';
    user = await User.create({ name: String(name).trim(), email: lower, role, verified: false });
    await sendOtp(lower, 'registration');
    res.json({ ok: true, message: 'OTP sent to email', role });
  } catch (e) {
    fail(res, e, 'POST /api/auth/register');
  }
});

// POST /api/auth/request-otp {email}
router.post('/request-otp', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    if (!isAllowedDomain(email)) return res.status(400).json({ error: 'Only @timesglobal.com.np emails allowed' });
    const lower = String(email).toLowerCase();
    const user = await User.findOne({ email: lower });
    if (!user) return res.status(404).json({ error: 'Not registered. Register first.' });
    await sendOtp(lower, 'login');
    res.json({ ok: true, message: 'OTP sent' });
  } catch (e) {
    fail(res, e, 'POST /api/auth/request-otp');
  }
});

// POST /api/auth/verify-otp {email,otp}
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });
    const lower = String(email).toLowerCase();
    const rec = await Otp.findOne({ email: lower });
    if (!rec) {
      console.warn(`[audit] OTP verify with no record for ${lower}`);
      return res.status(400).json({ error: 'No OTP requested or expired. Request again.' });
    }
    if (rec.expiresAt < new Date()) {
      await Otp.deleteMany({ email: lower });
      console.warn(`[audit] OTP expired for ${lower}`);
      return res.status(400).json({ error: 'OTP expired' });
    }
    rec.attempts += 1;
    await rec.save();
    if (rec.attempts > 5) {
      await Otp.deleteMany({ email: lower });
      console.warn(`[audit] OTP attempts exceeded for ${lower}`);
      return res.status(429).json({ error: 'Too many attempts' });
    }
    if (rec.hash !== hashOtp(String(otp).trim())) {
      console.warn(`[audit] OTP mismatch for ${lower} (attempt ${rec.attempts})`);
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    await Otp.deleteMany({ email: lower });
    const user = await User.findOne({ email: lower });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (isAdminEmail(lower) && user.role !== 'admin') user.role = 'admin';
    user.verified = true;
    await user.save();
    const token = await issueToken(user, res);
    res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    fail(res, e, 'POST /api/auth/verify-otp');
  }
});

router.get('/me', require('../middleware/auth').auth, (req, res) => {
  const u = req.user;
  res.json({ id: u._id, name: u.name, email: u.email, role: u.role });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

module.exports = router;
