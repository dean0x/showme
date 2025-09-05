/**
 * Unified error handling system for ShowMe MCP
 * Following engineering principle #1: Always use Result types
 * Following engineering principle #5: Type everything
 */

/**
 * Base error code categories for consistent classification
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  FILE_SYSTEM = 'FILE_SYSTEM',
  GIT_OPERATION = 'GIT_OPERATION',
  HTML_GENERATION = 'HTML_GENERATION',
  HTTP_SERVER = 'HTTP_SERVER',
  RESOURCE_MANAGEMENT = 'RESOURCE_MANAGEMENT'
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
export abstract class ShowMeError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly context?: Record<string, unknown>;
  public readonly cause?: Error;

  constructor(data: ShowMeErrorData) {
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
  toLogFormat(): Record<string, unknown> {
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
  constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error) {
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
  constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error) {
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
  constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error) {
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
  constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error) {
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
  constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error) {
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
  constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error) {
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
  static validation(message: string, code: string, context?: Record<string, unknown>, cause?: Error): ValidationError {
    return new ValidationError(message, code, context, cause);
  }

  static fileSystem(message: string, code: string, context?: Record<string, unknown>, cause?: Error): FileSystemError {
    return new FileSystemError(message, code, context, cause);
  }

  static gitOperation(message: string, code: string, context?: Record<string, unknown>, cause?: Error): GitOperationError {
    return new GitOperationError(message, code, context, cause);
  }

  static htmlGeneration(message: string, code: string, context?: Record<string, unknown>, cause?: Error): HTMLGenerationError {
    return new HTMLGenerationError(message, code, context, cause);
  }

  static httpServer(message: string, code: string, context?: Record<string, unknown>, cause?: Error): HTTPServerError {
    return new HTTPServerError(message, code, context, cause);
  }

  static resourceManagement(message: string, code: string, context?: Record<string, unknown>, cause?: Error): ResourceManagementError {
    return new ResourceManagementError(message, code, context, cause);
  }

  /**
   * Convert generic error to appropriate ShowMe error
   */
  static fromGenericError(error: Error, category: ErrorCategory, code: string, context?: Record<string, unknown>): ShowMeError {
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
export function wrapResult<T>(
  operation: () => T,
  errorFactory: (error: Error) => ShowMeError
): { ok: true; value: T } | { ok: false; error: ShowMeError } {
  try {
    const value = operation();
    return { ok: true, value };
  } catch (error) {
    const showMeError = errorFactory(error instanceof Error ? error : new Error(String(error)));
    return { ok: false, error: showMeError };
  }
}

/**
 * Helper function to wrap async operations  
 */
export async function wrapAsyncResult<T>(
  operation: () => Promise<T>,
  errorFactory: (error: Error) => ShowMeError
): Promise<{ ok: true; value: T } | { ok: false; error: ShowMeError }> {
  try {
    const value = await operation();
    return { ok: true, value };
  } catch (error) {
    const showMeError = errorFactory(error instanceof Error ? error : new Error(String(error)));
    return { ok: false, error: showMeError };
  }
}