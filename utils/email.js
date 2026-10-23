const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

/**
 * Website emails, sent with Resend (https://resend.com).
 *
 * .env:
 *   RESEND_API_KEY=re_xxxxxxxx
 *   EMAIL_FROM=HUJ Consulting <info@hujconsulting.com>   (domain must be verified in Resend)
 *   CONTACT_INBOX=info@hujconsulting.com                  (where form messages are delivered)
 *   SITE_URL=https://hujconsulting.com                   (used for the logo and links)
 */

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const EMAIL_FROM = process.env.EMAIL_FROM || 'HUJ Consulting <info@hujconsulting.com>';
const CONTACT_INBOX = process.env.CONTACT_INBOX || 'info@hujconsulting.com';
const SITE_URL = (process.env.SITE_URL || 'https://hujconsulting.com').replace(/\/$/, '');
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

const SOURCE_LABELS = {
  contact: 'Contact page',
  services: 'Services page',
  home: 'Home page',
};

/* ---------- Template helpers ---------- */

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
const templateCache = {};

/*
 * Logo: attached inside every email (shown with src="cid:huj-logo"), so it always
 * displays, without depending on the website URL or "show images" in the inbox.
 * File: templates/images/hujj-logo.png
 */
const LOGO_CID = 'huj-logo';
let logoAttachment = null;
try {
  logoAttachment = {
    filename: 'hujj-logo.png',
    content: fs
      .readFileSync(path.join(__dirname, '..', '..', 'hujj-frontend', 'public', 'images', 'hujj-logo.png'))
      .toString('base64'),
    contentType: 'image/png',
    contentId: LOGO_CID,
  };
} catch {
  console.warn('templates/images/hujj-logo.png not found, emails will load the logo from the website instead');
}
const LOGO_SRC = logoAttachment ? `cid:${LOGO_CID}` : `${SITE_URL}/images/hujj-logo.png`;

function loadTemplate(fileName) {
  if (!templateCache[fileName]) {
    templateCache[fileName] = fs.readFileSync(path.join(TEMPLATE_DIR, fileName), 'utf8');
  }
  return templateCache[fileName];
}

/** Makes user-typed text safe to put inside HTML. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes text and keeps the line breaks the person typed. */
function textToHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

/**
 * Fills {{placeholders}} in a template.
 * `values` must already be safe HTML (use escapeHtml / textToHtml first).
 */
function render(fileName, values) {
  let html = loadTemplate(fileName);

  // Remove the optional "original message" block when there is nothing to show
  if (!values.originalMessage) {
    html = html.replace(/<!--ORIGINAL_START-->[\s\S]*?<!--ORIGINAL_END-->/, '');
  }

  const all = { logoSrc: LOGO_SRC, ...values };
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => (all[key] !== undefined ? all[key] : ''));
}

function formatDate(date) {
  return new Date(date || Date.now()).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  }) + ' ET';
}

/** Sends one email. Never throws: returns { ok, error }. */
async function send({ to, subject, html, text, replyTo }) {
  if (!resend) {
    console.warn(`RESEND_API_KEY not set, email not sent: "${subject}" to ${to}`);
    return { ok: false, error: 'Email is not configured.' };
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
      replyTo,
      attachments: logoAttachment ? [logoAttachment] : undefined, // inline logo
    });
    if (error) {
      console.error('Resend error:', error.message || error);
      return { ok: false, error: error.message || 'Email could not be sent.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { ok: false, error: 'Email could not be sent.' };
  }
}

/* ---------- 1. New form message -> info@hujconsulting.com ---------- */

/**
 * Tells the HUJ inbox about a new message.
 * Reply-To is the visitor, so pressing "Reply" in the inbox answers them directly.
 */
function sendContactNotification(contact) {
  const sourceLabel = SOURCE_LABELS[contact.source] || 'Website';
  const displayName = contact.name || contact.email;
  const message = contact.message || '(No message was written.)';

  const html = render('sendingemail.html', {
    name: escapeHtml(displayName),
    email: escapeHtml(contact.email),
    sourceLabel: escapeHtml(sourceLabel),
    submittedAt: escapeHtml(formatDate(contact.created_at)),
    message: textToHtml(message),
    siteUrl: SITE_URL,
    siteHost: SITE_HOST,
  });

  const text = [
    `New message from the ${sourceLabel}`,
    '',
    `Name: ${contact.name || '-'}`,
    `Email: ${contact.email}`,
    `Received: ${formatDate(contact.created_at)}`,
    '',
    message,
  ].join('\n');

  return send({
    to: CONTACT_INBOX,
    subject: `New message from ${displayName} (${sourceLabel})`,
    html,
    text,
    replyTo: contact.email,
  });
}

/* ---------- Visitor emails (both use receivingemail.html) ---------- */

function sendToVisitor(contact, { subject, heading, preview, bodyText }) {
  const greetingName = contact.name || 'there';

  const html = render('receivingemail.html', {
    heading: escapeHtml(heading),
    preview: escapeHtml(preview),
    name: escapeHtml(greetingName),
    body: textToHtml(bodyText),
    originalMessage: contact.message ? textToHtml(contact.message) : '',
    submittedAt: escapeHtml(formatDate(contact.created_at)),
    contactEmail: escapeHtml(CONTACT_INBOX),
    siteUrl: SITE_URL,
    siteHost: SITE_HOST,
  });

  const text = [
    `Hi ${greetingName},`,
    '',
    bodyText,
    '',
    'Best regards,',
    'HUJ Consulting',
    ...(contact.message ? ['', '--- Your message ---', contact.message] : []),
  ].join('\n');

  return send({
    to: contact.email,
    subject,
    html,
    text,
    replyTo: CONTACT_INBOX, // visitor's replies come back to the HUJ inbox
  });
}

/** 2. Instant "we received your message" email to the visitor. */
function sendContactConfirmation(contact) {
  return sendToVisitor(contact, {
    subject: 'We received your message | HUJ Consulting',
    heading: 'Thank you for contacting us',
    preview: 'We have received your message and will get back to you shortly.',
    bodyText:
      'Thank you for reaching out to HUJ Consulting. We have received your message and a member of our team will get back to you within 1-2 business days.\n\nIf your request is urgent, simply reply to this email.',
  });
}

/** 3. Reply written in the admin panel, sent to the visitor. */
function sendContactReply(contact, replyText) {
  return sendToVisitor(contact, {
    subject: 'Re: Your message to HUJ Consulting',
    heading: 'A reply from HUJ Consulting',
    preview: replyText.slice(0, 120),
    bodyText: replyText,
  });
}

module.exports = {
  sendContactNotification,
  sendContactConfirmation,
  sendContactReply,
};