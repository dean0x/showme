import { describe, it, expect } from 'vitest';
import {
  ErrorCategory,
  ShowMeError,
  ValidationError,
  FileSystemError,
  GitOperationError,
  HTMLGenerationError,
  HTTPServerError,
  ResourceManagementError,
  ErrorFactory,
  wrapResult,
  wrapAsyncResult
} from '../utils/error-handling.js';

describe('Unified Error Handling System', () => {
  describe('ShowMeError base class', () => {
    it('should create error with all required properties', () => {
      class TestError extends ShowMeError {}
      const context = { userId: '123', operation: 'test' };
      const cause = new Error('Original error');
      
      const error = new TestError({
        message: 'Test error message',
        code: 'TEST_ERROR',
        category: ErrorCategory.VALIDATION,
        context,
        cause
      });

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.context).toBe(context);
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('TestError');
    });

    it('should serialize to structured log format', () => {
      class TestError extends ShowMeError {}
      const context = { operation: 'test' };
      const cause = new Error('Root cause');
      
      const error = new TestError({
        message: 'Test message',
        code: 'TEST_CODE',
        category: ErrorCategory.FILE_SYSTEM,
        context,
        cause
      });

      const logFormat = error.toLogFormat();
      
      expect(logFormat).toEqual({
        name: 'TestError',
        message: 'Test message',
        code: 'TEST_CODE',
        category: ErrorCategory.FILE_SYSTEM,
        context,
        cause: 'Root cause',
        stack: expect.any(String)
      });
    });
  });

  describe('Specific error classes', () => {
    it('should create ValidationError with correct category', () => {
      const error = new ValidationError('Invalid input', 'INVALID_INPUT');
      
      expect(error).toBeInstanceOf(ShowMeError);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.code).toBe('INVALID_INPUT');
      expect(error.message).toBe('Invalid input');
    });

    it('should create FileSystemError with correct category', () => {
      const error = new FileSystemError('File not found', 'FILE_NOT_FOUND');
      
      expect(error).toBeInstanceOf(ShowMeError);
      expect(error.category).toBe(ErrorCategory.FILE_SYSTEM);
      expect(error.code).toBe('FILE_NOT_FOUND');
    });

    it('should create GitOperationError with correct category', () => {
      const error = new GitOperationError('Not a git repository', 'NOT_GIT_REPO');
      
      expect(error).toBeInstanceOf(ShowMeError);
      expect(error.category).toBe(ErrorCategory.GIT_OPERATION);
      expect(error.code).toBe('NOT_GIT_REPO');
    });

    it('should create HTMLGenerationError with correct category', () => {
      const error = new HTMLGenerationError('Template failed', 'TEMPLATE_ERROR');
      
      expect(error).toBeInstanceOf(ShowMeError);
      expect(error.category).toBe(ErrorCategory.HTML_GENERATION);
      expect(error.code).toBe('TEMPLATE_ERROR');
    });

    it('should create HTTPServerError with correct category', () => {
      const error = new HTTPServerError('Port in use', 'PORT_IN_USE');
      
      expect(error).toBeInstanceOf(ShowMeError);
      expect(error.category).toBe(ErrorCategory.HTTP_SERVER);
      expect(error.code).toBe('PORT_IN_USE');
    });

    it('should create ResourceManagementError with correct category', () => {
      const error = new ResourceManagementError('Resource leak', 'RESOURCE_LEAK');
      
      expect(error).toBeInstanceOf(ShowMeError);
      expect(error.category).toBe(ErrorCategory.RESOURCE_MANAGEMENT);
      expect(error.code).toBe('RESOURCE_LEAK');
    });
  });

  describe('ErrorFactory', () => {
    it('should create validation errors', () => {
      const context = { field: 'email' };
      const cause = new Error('Invalid format');
      
      const error = ErrorFactory.validation('Email validation failed', 'EMAIL_INVALID', context, cause);
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe('EMAIL_INVALID');
      expect(error.context).toBe(context);
      expect(error.cause).toBe(cause);
    });

    it('should create file system errors', () => {
      const error = ErrorFactory.fileSystem('File not found', 'FILE_NOT_FOUND');
      
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.category).toBe(ErrorCategory.FILE_SYSTEM);
    });

    it('should create git operation errors', () => {
      const error = ErrorFactory.gitOperation('Branch not found', 'BRANCH_NOT_FOUND');
      
      expect(error).toBeInstanceOf(GitOperationError);
      expect(error.category).toBe(ErrorCategory.GIT_OPERATION);
    });

    it('should convert generic errors to ShowMe errors', () => {
      const genericError = new Error('Something went wrong');
      const context = { operation: 'file-read' };
      
      const showMeError = ErrorFactory.fromGenericError(
        genericError,
        ErrorCategory.FILE_SYSTEM,
        'GENERIC_ERROR',
        context
      );
      
      expect(showMeError).toBeInstanceOf(FileSystemError);
      expect(showMeError.message).toBe('Something went wrong');
      expect(showMeError.code).toBe('GENERIC_ERROR');
      expect(showMeError.context).toBe(context);
      expect(showMeError.cause).toBe(genericError);
    });
  });

  describe('wrapResult helper', () => {
    it('should wrap successful operation', () => {
      const operation = (): string => 'success';
      const errorFactory = (error: Error): ValidationError => ErrorFactory.validation(error.message, 'WRAP_ERROR');
      
      const result = wrapResult(operation, errorFactory);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });

    it('should wrap throwing operation', () => {
      const operation = (): never => {
        throw new Error('Operation failed');
      };
      const errorFactory = (error: Error): ValidationError => ErrorFactory.validation(error.message, 'WRAP_ERROR');
      
      const result = wrapResult(operation, errorFactory);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Operation failed');
        expect(result.error.code).toBe('WRAP_ERROR');
      }
    });

    it('should handle non-Error throws', () => {
      const operation = (): never => {
        throw 'String error';
      };
      const errorFactory = (error: Error): ValidationError => ErrorFactory.validation(error.message, 'WRAP_ERROR');
      
      const result = wrapResult(operation, errorFactory);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('String error');
      }
    });
  });

  describe('wrapAsyncResult helper', () => {
    it('should wrap successful async operation', async () => {
      const operation = async (): Promise<string> => 'async success';
      const errorFactory = (error: Error): FileSystemError => ErrorFactory.fileSystem(error.message, 'ASYNC_ERROR');
      
      const result = await wrapAsyncResult(operation, errorFactory);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('async success');
      }
    });

    it('should wrap rejecting async operation', async () => {
      const operation = async (): Promise<never> => {
        throw new Error('Async operation failed');
      };
      const errorFactory = (error: Error): FileSystemError => ErrorFactory.fileSystem(error.message, 'ASYNC_ERROR');
      
      const result = await wrapAsyncResult(operation, errorFactory);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(FileSystemError);
        expect(result.error.message).toBe('Async operation failed');
        expect(result.error.code).toBe('ASYNC_ERROR');
      }
    });
  });

  describe('Error hierarchy consistency', () => {
    it('should maintain consistent inheritance chain', () => {
      const validationError = new ValidationError('Test', 'TEST');
      const fileSystemError = new FileSystemError('Test', 'TEST');
      
      expect(validationError).toBeInstanceOf(ShowMeError);
      expect(validationError).toBeInstanceOf(Error);
      expect(fileSystemError).toBeInstanceOf(ShowMeError);
      expect(fileSystemError).toBeInstanceOf(Error);
    });

    it('should have consistent toLogFormat across error types', () => {
      const errors = [
        new ValidationError('Validation failed', 'VALIDATION_ERROR'),
        new FileSystemError('File error', 'FILE_ERROR'),
        new GitOperationError('Git error', 'GIT_ERROR'),
        new HTMLGenerationError('HTML error', 'HTML_ERROR'),
        new HTTPServerError('Server error', 'SERVER_ERROR'),
        new ResourceManagementError('Resource error', 'RESOURCE_ERROR')
      ];

      errors.forEach(error => {
        const logFormat = error.toLogFormat();
        expect(logFormat).toHaveProperty('name');
        expect(logFormat).toHaveProperty('message');
        expect(logFormat).toHaveProperty('code');
        expect(logFormat).toHaveProperty('category');
        expect(logFormat).toHaveProperty('stack');
      });
    });
  });
});