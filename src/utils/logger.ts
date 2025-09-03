/**
 * Structured logging interface for the ShowMe MCP server
 * Follows engineering principle #8: Structured logging - JSON logs with context
 */

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  info(message: string, context?: Record<string, unknown>): void {
    console.info(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(JSON.stringify({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }
}