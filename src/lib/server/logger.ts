import pino from 'pino';
import { env } from '$env/dynamic/private';

// Configurazione logger basata sull'ambiente
const isDevelopment = env.NODE_ENV === 'development';

export const logger = pino({
  level: env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: env.NODE_ENV || 'development',
    service: 'sintesi'
  }
});

// Helper functions per logging strutturato
export const loggers = {
  // Auth & User Management
  auth: logger.child({ module: 'auth' }),

  // Credit System
  credits: logger.child({ module: 'credits' }),

  // Payment Processing
  payments: logger.child({ module: 'payments' }),

  // Email System
  email: logger.child({ module: 'email' }),

  // Video Processing
  video: logger.child({ module: 'video' }),

  // API Requests
  api: logger.child({ module: 'api' }),

  // Database Operations
  db: logger.child({ module: 'database' }),

  // S3 Operations
  s3: logger.child({ module: 's3' }),

  // General Application
  app: logger.child({ module: 'app' })
};

// Utility functions per logging eventi specifici
export const logEvent = {
  userRegistration: (email: string, method: 'magic-link' | 'purchase') => {
    loggers.auth.info(
      {
        event: 'user_registration',
        email,
        method,
        timestamp: new Date().toISOString()
      },
      'New user registered'
    );
  },

  magicLinkSent: (email: string, success: boolean) => {
    loggers.auth.info(
      {
        event: 'magic_link_sent',
        email,
        success,
        timestamp: new Date().toISOString()
      },
      `Magic link ${success ? 'sent successfully' : 'failed'} to ${email}`
    );
  },

  loginAttempt: (email: string, success: boolean, reason?: string) => {
    loggers.auth.info(
      {
        event: 'login_attempt',
        email,
        success,
        reason,
        timestamp: new Date().toISOString()
      },
      `Login attempt for ${email}: ${success ? 'success' : 'failed'}`
    );
  },

  creditConsumption: (
    userId: string | null,
    sessionId: string | null,
    creditsRemaining: number
  ) => {
    loggers.credits.info(
      {
        event: 'credit_consumed',
        userId,
        sessionId,
        creditsRemaining,
        timestamp: new Date().toISOString()
      },
      'Credit consumed'
    );
  },

  creditsPurchased: (email: string, credits: number, amount: string, packageId: string) => {
    loggers.payments.info(
      {
        event: 'credits_purchased',
        email,
        credits,
        amount,
        packageId,
        timestamp: new Date().toISOString()
      },
      `${credits} credits purchased by ${email} for €${amount}`
    );
  },

  paymentWebhook: (eventType: string, success: boolean, details?: Record<string, unknown>) => {
    loggers.payments.info(
      {
        event: 'payment_webhook',
        eventType,
        success,
        details,
        timestamp: new Date().toISOString()
      },
      `Stripe webhook: ${eventType} - ${success ? 'processed' : 'failed'}`
    );
  },

  videoProcessing: (
    url: string,
    language: string,
    duration?: number,
    success?: boolean,
    error?: string
  ) => {
    loggers.video.info(
      {
        event: 'video_processing',
        url,
        language,
        duration,
        success,
        error,
        timestamp: new Date().toISOString()
      },
      `Video processing: ${success ? 'completed' : 'failed'}`
    );
  },

  emailSent: (to: string, type: 'magic-link' | 'purchase-confirmation', success: boolean) => {
    loggers.email.info(
      {
        event: 'email_sent',
        to,
        type,
        success,
        timestamp: new Date().toISOString()
      },
      `Email ${type} ${success ? 'sent' : 'failed'} to ${to}`
    );
  },

  s3Upload: (key: string, success: boolean, error?: string) => {
    loggers.s3.info(
      {
        event: 's3_upload',
        key,
        success,
        error,
        timestamp: new Date().toISOString()
      },
      `S3 upload: ${success ? 'success' : 'failed'}`
    );
  },

  apiRequest: (
    method: string,
    path: string,
    statusCode: number,
    duration?: number,
    userId?: string
  ) => {
    loggers.api.info(
      {
        event: 'api_request',
        method,
        path,
        statusCode,
        duration,
        userId,
        timestamp: new Date().toISOString()
      },
      `${method} ${path} - ${statusCode}`
    );
  }
};

export default logger;
