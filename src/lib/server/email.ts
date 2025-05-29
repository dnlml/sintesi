import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { logEvent, loggers } from './logger';

if (!env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not found. Email sending will be mocked.');
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// Configurazione email
const EMAIL_CONFIG = {
  from: env.EMAIL_FROM || 'Sintesi <noreply@yourdomain.com>',
  replyTo: env.EMAIL_REPLY_TO || 'support@yourdomain.com'
};

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Invia email generica
export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  try {
    loggers.email.info({ to: template.to, subject: template.subject }, 'Attempting to send email');

    if (!resend) {
      // Mock per sviluppo locale
      loggers.email.warn({ to: template.to }, 'RESEND_API_KEY not configured, using mock email');
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📧 ===== EMAIL MOCK =====');
        console.log(`To: ${template.to}`);
        console.log(`Subject: ${template.subject}`);
        console.log(`HTML: ${template.html}`);
        console.log('========================\n');
      }
      return true;
    }

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: EMAIL_CONFIG.replyTo
    });

    if (result.error) {
      loggers.email.error({ to: template.to, error: result.error }, 'Resend API error');
      return false;
    }

    loggers.email.info(
      {
        to: template.to,
        emailId: result.data?.id
      },
      'Email sent successfully via Resend'
    );

    // Log specific email types
    if (template.subject.includes('login link')) {
      logEvent.emailSent(template.to, 'magic-link', true);
    } else if (template.subject.includes('Purchase confirmed')) {
      logEvent.emailSent(template.to, 'purchase-confirmation', true);
    }

    return true;
  } catch (error) {
    loggers.email.error({ to: template.to, error }, 'Error sending email');
    return false;
  }
}

// Template per Magic Link
export function createMagicLinkEmail(email: string, magicLink: string): EmailTemplate {
  loggers.email.debug({ email }, 'Creating magic link email template');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login to Sintesi</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px; }
        .content { padding: 40px 20px; }
        .button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        .warning { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0; color: #92400e; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SINTESI</h1>
        </div>
        <div class="content">
          <h2>Login to your account</h2>
          <p>Hi there!</p>
          <p>You requested to login to your Sintesi account. Click the button below to access your account:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" class="button">🔗 Login to Sintesi</a>
          </div>

          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>This link expires in 15 minutes</li>
              <li>Only use this link if you requested it</li>
              <li>Never share this link with anyone</li>
            </ul>
          </div>

          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f1f5f9; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
            ${magicLink}
          </p>

          <p>If you didn't request this login, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>© 2024 Sintesi - Transform YouTube Videos into Key Insights</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Login to Sintesi

Hi there!

You requested to login to your Sintesi account. Click the link below to access your account:

${magicLink}

⚠️ Security Notice:
- This link expires in 15 minutes
- Only use this link if you requested it
- Never share this link with anyone

If you didn't request this login, you can safely ignore this email.

© 2024 Sintesi - Transform YouTube Videos into Key Insights
  `;

  return {
    to: email,
    subject: '🔗 Your Sintesi login link',
    html,
    text
  };
}

// Template per conferma acquisto
export function createPurchaseConfirmationEmail(
  email: string,
  credits: number,
  amount: string
): EmailTemplate {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Confirmation - Sintesi</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px; }
        .content { padding: 40px 20px; }
        .success-box { background-color: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .credits-box { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SINTESI</h1>
        </div>
        <div class="content">
          <div class="success-box">
            <h2 style="color: #065f46; margin: 0;">🎉 Purchase Successful!</h2>
          </div>

          <p>Thank you for your purchase! Your payment has been processed successfully.</p>

          <div class="credits-box">
            <h3 style="margin: 0 0 10px 0;">Credits Added</h3>
            <div style="font-size: 36px; font-weight: bold; margin: 10px 0;">${credits}</div>
            <p style="margin: 0; opacity: 0.9;">video summaries</p>
          </div>

          <h3>What's next?</h3>
          <ul>
            <li>✅ Your credits are already available in your account</li>
            <li>✅ Start creating video summaries immediately</li>
            <li>✅ Your credits never expire</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://yourdomain.com" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">
              Start Creating Summaries
            </a>
          </div>

          <p><strong>Purchase Details:</strong></p>
          <ul>
            <li>Amount: €${amount}</li>
            <li>Credits: ${credits}</li>
            <li>Account: ${email}</li>
          </ul>
        </div>
        <div class="footer">
          <p>© 2024 Sintesi - Transform YouTube Videos into Key Insights</p>
          <p>Need help? Contact us at support@yourdomain.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    to: email,
    subject: `🎉 Purchase confirmed - ${credits} credits added to your account`,
    html
  };
}
