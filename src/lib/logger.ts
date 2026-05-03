/**
 * Structured Logging & Error Tracking System
 * 
 * This service provides a centralized way to log events and track errors.
 * In a real-world production environment, this would integrate with
 * services like Sentry, LogRocket, or Datadog.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  tenantId?: string;
  userId?: string;
}

class Logger {
  private static instance: Logger;
  private isProduction = process.env.NODE_ENV === 'production';

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLog(level: LogLevel, message: string, context?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      // These would be populated from AuthContext if we were in a hook,
      // but here we allow passing them via context if needed.
    };
  }

  public info(message: string, context?: any) {
    const entry = this.formatLog('info', message, context);
    console.info(`[INFO] ${entry.timestamp}: ${message}`, context || '');
  }

  public warn(message: string, context?: any) {
    const entry = this.formatLog('warn', message, context);
    console.warn(`[WARN] ${entry.timestamp}: ${message}`, context || '');
  }

  public error(message: string, context?: any, error?: Error) {
    const entry = this.formatLog('error', message, {
      ...context,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });

    console.error(`[ERROR] ${entry.timestamp}: ${message}`, {
      context: entry.context,
      error,
    });

    // In production, we might send this to an external tool
    if (this.isProduction) {
      this.sendToErrorTracker(entry);
    }
  }

  public debug(message: string, context?: any) {
    if (!this.isProduction) {
      const entry = this.formatLog('debug', message, context);
      console.debug(`[DEBUG] ${entry.timestamp}: ${message}`, context || '');
    }
  }

  private sendToErrorTracker(entry: LogEntry) {
    // Placeholder for Sentry/Datadog integration
    // Example: Sentry.captureMessage(entry.message, { extra: entry.context });
  }
}

export const logger = Logger.getInstance();
