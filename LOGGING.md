# Logging System Documentation

## Overview

Sintesi uses **Pino** for structured, high-performance logging. The logging system is designed for both development and production environments with different configurations.

## Configuration

### Environment Variables

- `LOG_LEVEL`: Controls the minimum log level (default: `debug` in development, `info` in production)
- `NODE_ENV`: Determines the logging format (`development` uses pretty printing, `production` uses JSON)

### Log Levels

1. `fatal` - Application crashes
2. `error` - Error conditions
3. `warn` - Warning conditions
4. `info` - Informational messages
5. `debug` - Debug information
6. `trace` - Very detailed debug information

## Modules

The logging system is organized by modules:

- **auth** - Authentication and user management
- **credits** - Credit system operations
- **payments** - Payment processing and Stripe webhooks
- **email** - Email sending operations
- **video** - YouTube video processing
- **api** - API request/response logging
- **database** - Database operations
- **s3** - S3 upload operations
- **app** - General application logs

## Usage Examples

### Basic Logging

```typescript
import { loggers } from '$lib/server/logger';

// Module-specific logging
loggers.auth.info({ email: 'user@example.com' }, 'User login attempt');
loggers.payments.error({ error: err }, 'Payment processing failed');
```

### Event Logging

```typescript
import { logEvent } from '$lib/server/logger';

// Structured event logging
logEvent.userRegistration('user@example.com', 'magic-link');
logEvent.creditConsumption('user-id', null, 5);
logEvent.videoProcessing('https://youtube.com/watch?v=123', 'en', 5000, true);
```

## Log Structure

All logs include:

- `timestamp` - ISO 8601 timestamp
- `level` - Log level
- `service` - Always "sintesi"
- `env` - Environment (development/production)
- `module` - The module that generated the log
- `msg` - Human-readable message
- Additional contextual data

### Example Log Entry

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "service": "sintesi",
  "env": "production",
  "module": "auth",
  "email": "user@example.com",
  "event": "magic_link_sent",
  "success": true,
  "msg": "Magic link sent successfully to user@example.com"
}
```

## Development vs Production

### Development

- Pretty-printed, colorized output
- Debug level enabled
- Console output with timestamps

### Production

- JSON format for log aggregation
- Info level and above
- Structured for parsing by log management systems

## Key Events Tracked

### Authentication

- `user_registration` - New user registrations
- `magic_link_sent` - Magic link email attempts
- `login_attempt` - Login success/failure

### Credits

- `credit_consumed` - Credit usage tracking
- Credit balance checks

### Payments

- `credits_purchased` - Successful purchases
- `payment_webhook` - Stripe webhook processing

### Video Processing

- `video_processing` - YouTube video processing attempts
- Processing duration and success/failure

### Email

- `email_sent` - Email delivery tracking
- Email type classification

### API

- `api_request` - All API requests with timing

## Monitoring in Production

For production monitoring, consider:

1. **Log Aggregation**: Use services like Datadog, New Relic, or ELK stack
2. **Alerting**: Set up alerts for error rates and specific events
3. **Dashboards**: Create dashboards for key metrics
4. **Log Retention**: Configure appropriate retention policies

## Privacy Considerations

- Email addresses are logged for debugging but should be masked in production logs if required
- Sensitive data (tokens, passwords) are never logged
- User IDs are used instead of personal information where possible

## Performance

Pino is designed for high performance:

- Asynchronous logging
- Minimal overhead
- Structured JSON output
- Child logger optimization
