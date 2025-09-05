/**
 * Unified error handling system for ShowMe MCP
 * Following engineering principle #1: Always use Result types
 * Following engineering principle #5: Type everything
 */
/**
 * Base error code categories for consistent classification
 */
export var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["VALIDATION"] = "VALIDATION";
    ErrorCategory["FILE_SYSTEM"] = "FILE_SYSTEM";
    ErrorCategory["GIT_OPERATION"] = "GIT_OPERATION";
    ErrorCategory["HTML_GENERATION"] = "HTML_GENERATION";
    ErrorCategory["HTTP_SERVER"] = "HTTP_SERVER";
    ErrorCategory["RESOURCE_MANAGEMENT"] = "RESOURCE_MANAGEMENT";
})(ErrorCategory || (ErrorCategory = {}));
/**
 * Base error class following consistent pattern
 */
export class ShowMeError extends Error {
    code;
    category;
    context;
    cause;
    constructor(data) {
        super(data.message);
        this.name = this.constructor.name;
        this.code = data.code;
        this.category = data.category;
        this.context = data.context;
        this.cause = data.cause;
    }
    /**
     * Serialize error for structured logging
     */
    toLogFormat() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            category: this.category,
            context: this.context,
            cause: this.cause?.message,
            stack: this.stack
        };
    }
}
/**
 * Validation errors - input validation, path validation, etc.
 */
export class ValidationError extends ShowMeError {
    constructor(message, code, context, cause) {
        super({
            message,
            code,
            category: ErrorCategory.VALIDATION,
            context,
            cause
        });
    }
}
/**
 * File system operation errors
 */
export class FileSystemError extends ShowMeError {
    constructor(message, code, context, cause) {
        super({
            message,
            code,
            category: ErrorCategory.FILE_SYSTEM,
            context,
            cause
        });
    }
}
/**
 * Git operation errors
 */
export class GitOperationError extends ShowMeError {
    constructor(message, code, context, cause) {
        super({
            message,
            code,
            category: ErrorCategory.GIT_OPERATION,
            context,
            cause
        });
    }
}
/**
 * HTML generation errors
 */
export class HTMLGenerationError extends ShowMeError {
    constructor(message, code, context, cause) {
        super({
            message,
            code,
            category: ErrorCategory.HTML_GENERATION,
            context,
            cause
        });
    }
}
/**
 * HTTP server errors
 */
export class HTTPServerError extends ShowMeError {
    constructor(message, code, context, cause) {
        super({
            message,
            code,
            category: ErrorCategory.HTTP_SERVER,
            context,
            cause
        });
    }
}
/**
 * Resource management errors
 */
export class ResourceManagementError extends ShowMeError {
    constructor(message, code, context, cause) {
        super({
            message,
            code,
            category: ErrorCategory.RESOURCE_MANAGEMENT,
            context,
            cause
        });
    }
}
/**
 * Error factory for consistent error creation
 */
export class ErrorFactory {
    static validation(message, code, context, cause) {
        return new ValidationError(message, code, context, cause);
    }
    static fileSystem(message, code, context, cause) {
        return new FileSystemError(message, code, context, cause);
    }
    static gitOperation(message, code, context, cause) {
        return new GitOperationError(message, code, context, cause);
    }
    static htmlGeneration(message, code, context, cause) {
        return new HTMLGenerationError(message, code, context, cause);
    }
    static httpServer(message, code, context, cause) {
        return new HTTPServerError(message, code, context, cause);
    }
    static resourceManagement(message, code, context, cause) {
        return new ResourceManagementError(message, code, context, cause);
    }
    /**
     * Convert generic error to appropriate ShowMe error
     */
    static fromGenericError(error, category, code, context) {
        switch (category) {
            case ErrorCategory.VALIDATION:
                return new ValidationError(error.message, code, context, error);
            case ErrorCategory.FILE_SYSTEM:
                return new FileSystemError(error.message, code, context, error);
            case ErrorCategory.GIT_OPERATION:
                return new GitOperationError(error.message, code, context, error);
            case ErrorCategory.HTML_GENERATION:
                return new HTMLGenerationError(error.message, code, context, error);
            case ErrorCategory.HTTP_SERVER:
                return new HTTPServerError(error.message, code, context, error);
            case ErrorCategory.RESOURCE_MANAGEMENT:
                return new ResourceManagementError(error.message, code, context, error);
        }
    }
}
/**
 * Helper function to wrap potentially throwing operations
 */
export function wrapResult(operation, errorFactory) {
    try {
        const value = operation();
        return { ok: true, value };
    }
    catch (error) {
        const showMeError = errorFactory(error instanceof Error ? error : new Error(String(error)));
        return { ok: false, error: showMeError };
    }
}
/**
 * Helper function to wrap async operations
 */
export async function wrapAsyncResult(operation, errorFactory) {
    try {
        const value = await operation();
        return { ok: true, value };
    }
    catch (error) {
        const showMeError = errorFactory(error instanceof Error ? error : new Error(String(error)));
        return { ok: false, error: showMeError };
    }
}
