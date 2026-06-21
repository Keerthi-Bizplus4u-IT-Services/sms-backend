const nodemailer = require('nodemailer');
const logger = require('../logger');

const normalizeRecipients = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry || '').split(','))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const filterValidEmails = (emails = []) => {
  const unique = new Set();
  const valid = [];

  emails.forEach((email) => {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || unique.has(normalized)) {
      return;
    }
    if (!EMAIL_REGEX.test(normalized)) {
      return;
    }
    unique.add(normalized);
    valid.push(normalized);
  });

  return valid;
};

const createSmtpTransport = (smtpSettings = {}) => {
  return nodemailer.createTransport({
    host: smtpSettings.host,
    port: Number(smtpSettings.port || 587),
    secure: Boolean(smtpSettings.secure),
    auth: smtpSettings.user
      ? {
          user: smtpSettings.user,
          pass: smtpSettings.password
        }
      : undefined,
    tls: {
      rejectUnauthorized: false
    }
  });
};

const sendSmtpMail = async ({ smtpSettings, to, subject, text, html, attachments = [] }) => {
  const recipients = filterValidEmails(normalizeRecipients(to));

  if (!recipients.length) {
    return {
      sentTo: [],
      accepted: [],
      rejected: [],
      skipped: true
    };
  }

  const transport = createSmtpTransport(smtpSettings);

  try {
    const fromAddress = smtpSettings.fromEmail || smtpSettings.user;
    const fromName = smtpSettings.fromName || 'School ERP';

    if (!fromAddress) {
      throw new Error('SMTP sender email is missing');
    }

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: recipients,
      subject,
      text,
      html,
      attachments
    });

    return {
      sentTo: recipients,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      messageId: info.messageId,
      skipped: false
    };
  } catch (error) {
    logger.error('SMTP send failure', {
      message: error.message,
      code: error.code
    });
    throw error;
  } finally {
    if (typeof transport.close === 'function') {
      transport.close();
    }
  }
};

module.exports = {
  normalizeRecipients,
  filterValidEmails,
  sendSmtpMail
};
