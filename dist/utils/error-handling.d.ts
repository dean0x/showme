/**
 * Unified error handling system for ShowMe MCP
 * Following engineering principle #1: Always use Result types
 * Following engineering principle #5: Type everything
 */
/**
 * Base error code categories for consistent classification
 */
export declare enum ErrorCategory {
    VALIDATION = "VALIDATION",
    FILE_SYSTEM = "FILE_SYSTEM",
    GIT_OPERATION = "GIT_OPERATION",
    HTML_GENERATION = "HTML_GENERATION",
    HTTP_SERVER = "HTTP_SERVER",
    RESOURCE_MANAGEMENT = "RESOURCE_MANAGEMENT"
}
/**
 * Standard error interface for all ShowMe errors
 */
export interface ShowMeErrorData {
    readonly message: string;
    readonly code: string;
    readonly category: ErrorCategory;
    readonly context?: Record<string, unknown>;
    readonly cause?: Error;
}
/**
 * Base error class following consistent pattern
 */
export declare abstract class ShowMeError extends Error {
    readonly code: string;
    readonly category: ErrorCategory;
    readonly context?: Record<string, unknown>;
    readonly cause?: Error;
    constructor(data: ShowMeErrorData);
    /**
     * Serialize error for structured logging
     */
    toLogFormat(): Record<string, unknown>;
}
/**
 * Validation errors - input validation, path validation, etc.
 */
export declare class ValidationError extends ShowMeError {
    constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error);
}
/**
 * File system operation errors
 */
export declare class FileSystemError extends ShowMeError {
    constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error);
}
/**
 * Git operation errors
 */
export declare class GitOperationError extends ShowMeError {
    constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error);
}
/**
 * HTML generation errors
 */
export declare class HTMLGenerationError extends ShowMeError {
    constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error);
}
/**
 * HTTP server errors
 */
export declare class HTTPServerError extends ShowMeError {
    constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error);
}
/**
 * Resource management errors
 */
export declare class ResourceManagementError extends ShowMeError {
    constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error);
}
/**
 * Error factory for consistent error creation
 */
export declare class ErrorFactory {
    static validation(message: string, code: string, context?: Record<string, unknown>, cause?: Error): ValidationError;
    static fileSystem(message: string, code: string, context?: Record<string, unknown>, cause?: Error): FileSystemError;
    static gitOperation(message: string, code: string, context?: Record<string, unknown>, cause?: Error): GitOperationError;
    static htmlGeneration(message: string, code: string, context?: Record<string, unknown>, cause?: Error): HTMLGenerationError;
    static httpServer(message: string, code: string, context?: Record<string, unknown>, cause?: Error): HTTPServerError;
    static resourceManagement(message: string, code: string, context?: Record<string, unknown>, cause?: Error): ResourceManagementError;
    /**
     * Convert generic error to appropriate ShowMe error
     */
    static fromGenericError(error: Error, category: ErrorCategory, code: string, context?: Record<string, unknown>): ShowMeError;
}
/**
 * Helper function to wrap potentially throwing operations
 */
export declare function wrapResult<T>(operation: () => T, errorFactory: (error: Error) => ShowMeError): {
    ok: true;
    value: T;
} | {
    ok: false;
    error: ShowMeError;
};
/**
 * Helper function to wrap async operations
 */
export declare function wrapAsyncResult<T>(operation: () => Promise<T>, errorFactory: (error: Error) => ShowMeError): Promise<{
    ok: true;
    value: T;
} | {
    ok: false;
    error: ShowMeError;
}>;
