const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

let transporter = null;

// Company logo shipped with the app. Attached to OTP mails by content-id so it
// renders without any public image URL (this server is LAN-only).
const LOGO_PATH = path.join(__dirname, '..', '..', 'public', 'img', 'timeslogo.png');
const LOGO_OK = fs.existsSync(LOGO_PATH);

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_USER, SMTP_APP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_APP_PASS) return null;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_APP_PASS },
  });
  return transporter;
}

function buildOtpMail({ to, otp, purpose }) {
  const isRegister = purpose === 'registration';
  const ttlMin = process.env.OTP_TTL_MIN || 10;
  const subject = isRegister
    ? 'Registration OTP - Butwal DC Logbook'
    : 'Login OTP - Butwal DC Logbook';
  const title = isRegister ? 'Registration code' : 'Login code';
  const intro = isRegister
    ? 'Use this code to finish creating your Butwal DC Logbook account.'
    : 'Use this code to log in to Butwal DC Logbook.';
  const text =
    `${title} - Times Global Butwal DC Logbook\n\n` +
    `${intro}\n\nYour code: ${otp}\nIt expires in ${ttlMin} minutes.\n\n` +
    `Didn't request this? Simply ignore this mail.\n` +
    `NEVER share your code with anyone, including Times Global staff.`;

  // Table layout + inline styles only: renders in Gmail, Outlook, Apple Mail.
  const logoRow = LOGO_OK
    ? `<tr><td style="background-color:#ffffff;padding:18px 28px;text-align:center;">` +
      `<img src="cid:timeslogo" alt="Times Global" width="180" style="display:inline-block;border:0;max-width:100%;height:auto;">` +
      `</td></tr>`
    : '';
  const html =
    `<div style="background-color:#060607;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background-color:#131316;border:1px solid #2a2a32;border-radius:12px;overflow:hidden;">` +
    logoRow +
    `<tr><td style="background-color:#7f1d1d;padding:18px 28px;">` +
    `<div style="color:#ffffff;font-size:13px;letter-spacing:2px;font-weight:bold;">TIMES GLOBAL &middot; BUTWAL DC LOGBOOK</div>` +
    `</td></tr>` +
    `<tr><td style="padding:28px;">` +
    `<div style="color:#f5f3f2;font-size:22px;font-weight:bold;margin:0 0 8px;">${title}</div>` +
    `<div style="color:#b3aca7;font-size:14px;line-height:21px;margin:0 0 20px;">${intro}</div>` +
    `<div style="background-color:#0a0a0d;border:1px dashed #991b1b;border-radius:10px;text-align:center;padding:20px;margin:0 0 8px;">` +
    `<div style="color:#b3aca7;font-size:12px;letter-spacing:2px;margin-bottom:8px;">YOUR CODE</div>` +
    `<div style="color:#ffffff;font-size:36px;font-weight:bold;letter-spacing:10px;">${otp}</div>` +
    `</div>` +
    `<div style="color:#b3aca7;font-size:13px;text-align:center;margin:0 0 20px;">Expires in ${ttlMin} minutes.</div>` +
    `<div style="background-color:#1c0a0d;border-left:4px solid #b91c1c;border-radius:6px;padding:12px 14px;">` +
    `<div style="color:#fca5a5;font-size:13px;line-height:20px;">Didn&rsquo;t request this? Simply ignore this mail.<br>` +
    `<strong>NEVER share your code with anyone, including Times Global staff.</strong></div>` +
    `</div>` +
    `</td></tr>` +
    `<tr><td style="padding:16px 28px;border-top:1px solid #2a2a32;">` +
    `<div style="color:#6b6560;font-size:12px;">Automated message from Butwal DC Logbook. Do not reply to this mail.</div>` +
    `</td></tr>` +
    `</table></div>`;
  return { subject, text, html };
}

async function sendOtpEmail(to, otp, purpose = 'login') {
  const tx = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'Butwal DC Logbook';
  const { subject, text, html } = buildOtpMail({ to, otp, purpose });
  if (!tx) {
    console.log(`[DEV] No SMTP configured. ${subject} for ${to}: ${otp}`);
    return { dev: true };
  }
  try {
    await tx.sendMail({
      from, to, subject, text, html,
      attachments: LOGO_OK ? [{ filename: 'timeslogo.png', path: LOGO_PATH, cid: 'timeslogo' }] : [],
    });
  } catch (e) {
    console.log(`[MAIL-FAIL] SMTP send failed for ${to}: ${e.message}. ${subject}: ${otp}`);
  }
  return { sent: true };
}

module.exports = { sendOtpEmail, buildOtpMail };
