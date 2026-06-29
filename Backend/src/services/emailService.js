const nodemailer = require('nodemailer');

let transporter = null;

function isEmailConfigured() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function getTransporter() {
  if (!isEmailConfigured()) {
    throw new Error('Email service is not configured. Set EMAIL_USER and EMAIL_PASS.');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return transporter;
}

async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments = [],
  fromName = 'Industraders',
}) {
  if (!to) {
    throw new Error('Recipient email is required');
  }

  if (!subject) {
    throw new Error('Email subject is required');
  }

  if (!text && !html) {
    throw new Error('Email content is required');
  }

  await getTransporter().sendMail({
    from: `"${fromName}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
    attachments,
  });
}

async function sendPasswordResetEmail(to, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center; }
      .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: 1px; }
      .header p { color: #a0aec0; margin: 6px 0 0; font-size: 13px; }
      .body { padding: 36px 32px; }
      .body p { color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
      .btn-wrap { text-align: center; margin: 28px 0; }
      .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.5px; }
      .note { background: #f7fafc; border-left: 4px solid #e2e8f0; padding: 12px 16px; border-radius: 4px; margin-top: 20px; }
      .note p { color: #718096; font-size: 13px; margin: 0; }
      .footer { text-align: center; padding: 20px 32px; background: #f7fafc; }
      .footer p { color: #a0aec0; font-size: 12px; margin: 0; }
      .url-fallback { word-break: break-all; color: #667eea; font-size: 12px; margin-top: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Industraders</h1>
        <p>Password Reset Request</p>
      </div>
      <div class="body">
        <p>Hello Admin,</p>
        <p>We received a request to reset the password for your account. Click the button below to set a new password:</p>
        <div class="btn-wrap">
          <a href="${resetUrl}" class="btn">Reset My Password</a>
        </div>
        <div class="note">
          <p>This link will expire in <strong>1 hour</strong>.</p>
          <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
        <p class="url-fallback">If the button does not work, copy and paste this link into your browser:<br>${resetUrl}</p>
      </div>
      <div class="footer">
        <p>Copyright ${new Date().getFullYear()} Industraders. This is an automated message, do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  await sendEmail({
    to,
    subject: 'Password Reset Request - Industraders',
    html,
  });

}

async function sendPasswordResetOTP(to, otp) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center; }
      .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: 1px; }
      .header p { color: #a0aec0; margin: 6px 0 0; font-size: 13px; }
      .body { padding: 36px 32px; }
      .body p { color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
      .otp-wrap { text-align: center; margin: 28px 0; }
      .otp { display: inline-block; padding: 14px 36px; background: #f7fafc; border: 2px dashed #667eea; color: #1a1a2e; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 8px; }
      .note { background: #f7fafc; border-left: 4px solid #e2e8f0; padding: 12px 16px; border-radius: 4px; margin-top: 20px; }
      .note p { color: #718096; font-size: 13px; margin: 0; }
      .footer { text-align: center; padding: 20px 32px; background: #f7fafc; }
      .footer p { color: #a0aec0; font-size: 12px; margin: 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Industraders</h1>
        <p>Verification Code</p>
      </div>
      <div class="body">
        <p>Hello Admin,</p>
        <p>We received a request to reset the password for your account. Use the verification code below to continue:</p>
        <div class="otp-wrap">
          <div class="otp">${otp}</div>
        </div>
        <div class="note">
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
      </div>
      <div class="footer">
        <p>Copyright ${new Date().getFullYear()} Industraders. This is an automated message, do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  await sendEmail({
    to,
    subject: 'Your Verification Code - Industraders',
    html,
  });

}

module.exports = {
  getTransporter,
  isEmailConfigured,
  sendEmail,
  sendPasswordResetEmail,
  sendPasswordResetOTP,
};
