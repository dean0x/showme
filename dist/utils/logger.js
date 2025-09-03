/**
 * Structured logging interface for the ShowMe MCP server
 * Follows engineering principle #8: Structured logging - JSON logs with context
 */
export class ConsoleLogger {
    info(message, context) {
        console.info(JSON.stringify({
            level: 'info',
            message,
            timestamp: new Date().toISOString(),
            ...context
        }));
    }
    error(message, context) {
        console.error(JSON.stringify({
            level: 'error',
            message,
            timestamp: new Date().toISOString(),
            ...context
        }));
    }
    warn(message, context) {
        console.warn(JSON.stringify({
            level: 'warn',
            message,
            timestamp: new Date().toISOString(),
            ...context
        }));
    }
    debug(message, context) {
        console.debug(JSON.stringify({
            level: 'debug',
            message,
            timestamp: new Date().toISOString(),
            ...context
        }));
    }
}
