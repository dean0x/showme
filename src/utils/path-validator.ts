import { z } from 'zod';
import path from 'path';

export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export class PathValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PathValidationError';
  }
}

export class PathValidator {
  private workspaceRoot: string;
  
  constructor(workspaceRoot?: string) {
    this.workspaceRoot = path.resolve(workspaceRoot || process.cwd());
  }

  validatePath(inputPath: string): Result<string, PathValidationError> {
    try {
      // Check for null byte attack
      if (inputPath.includes('\0')) {
        return {
          ok: false,
          error: new PathValidationError(
            `Path contains null byte attack: ${inputPath.replace(/\0/g, '\\0')}`,
            'NULL_BYTE_ATTACK'
          )
        };
      }

      const resolved = path.resolve(this.workspaceRoot, inputPath);
      
      // Ensure resolved path is within workspace boundaries
      if (!resolved.startsWith(this.workspaceRoot)) {
        // Check if it's due to directory traversal
        if (inputPath.includes('..')) {
          return {
            ok: false,
            error: new PathValidationError(
              `Path contains directory traversal attempt: ${inputPath}`,
              'DIRECTORY_TRAVERSAL'
            )
          };
        }
        
        return {
          ok: false,
          error: new PathValidationError(
            `Path resolves outside workspace: ${inputPath}`,
            'OUTSIDE_WORKSPACE'
          )
        };
      }

      // Additional check for directory traversal patterns
      if (inputPath.includes('..')) {
        return {
          ok: false,
          error: new PathValidationError(
            `Path contains directory traversal attempt: ${inputPath}`,
            'DIRECTORY_TRAVERSAL'
          )
        };
      }

      return { ok: true, value: resolved };
    } catch (error) {
      return { 
        ok: false, 
        error: new PathValidationError(
          error instanceof Error ? error.message : String(error),
          'VALIDATION_ERROR'
        )
      };
    }
  }
}