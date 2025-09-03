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
export declare class ConsoleLogger implements Logger {
    info(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    debug(message: string, context?: Record<string, unknown>): void;
}
