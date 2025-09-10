import path from 'path';
import fs from 'fs/promises';
import { ValidationError, ErrorFactory } from './error-handling.js';

export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };


export class PathValidator {
  private workspaceRoot: string;
  private static readonly WINDOWS_DEVICE_NAMES = new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ]);
  
  constructor(workspaceRoot?: string) {
    this.workspaceRoot = path.resolve(workspaceRoot || process.cwd());
  }

  validatePathSync(inputPath: string): Result<string, ValidationError> {
    try {
      // Check for null byte attack
      if (inputPath.includes('\0')) {
        return {
          ok: false,
          error: ErrorFactory.validation(
            `Path contains null byte attack: ${inputPath.replace(/\0/g, '\\0')}`,
            'NULL_BYTE_ATTACK'
          )
        };
      }

      // Check for Windows device names (CVE-2025-27210)
      const fileName = path.basename(inputPath);
      const dotIndex = fileName.indexOf('.');
      const nameWithoutExt = (dotIndex === -1 ? fileName : fileName.substring(0, dotIndex)).toUpperCase();
      if (PathValidator.WINDOWS_DEVICE_NAMES.has(nameWithoutExt)) {
        return {
          ok: false,
          error: ErrorFactory.validation(
            `Path contains Windows device name: ${fileName}`,
            'WINDOWS_DEVICE_NAME'
          )
        };
      }

      // Resolve the path - if it's absolute, use it directly; otherwise resolve relative to workspace
      const resolved = path.isAbsolute(inputPath) 
        ? inputPath 
        : path.resolve(this.workspaceRoot, inputPath);
      
      // Check for directory traversal attempts in relative paths
      if (!path.isAbsolute(inputPath) && inputPath.includes('..')) {
        // For relative paths, ensure they don't escape the workspace
        if (!resolved.startsWith(this.workspaceRoot)) {
          return {
            ok: false,
            error: ErrorFactory.validation(
              `Path contains directory traversal attempt: ${inputPath}`,
              'DIRECTORY_TRAVERSAL'
            )
          };
        }
      }

      return { ok: true, value: resolved };
    } catch (error) {
      return { 
        ok: false, 
        error: ErrorFactory.validation(
          error instanceof Error ? error.message : String(error),
          'VALIDATION_ERROR',
          undefined,
          error instanceof Error ? error : new Error(String(error))
        )
      };
    }
  }

  async validatePath(
    inputPath: string, 
    options: { checkAccess?: boolean } = {}
  ): Promise<Result<string, ValidationError>> {
    const result = this.validatePathSync(inputPath);
    
    if (!result.ok) {
      return result;
    }

    if (options.checkAccess) {
      try {
        await fs.access(result.value, fs.constants.R_OK);
      } catch {
        return {
          ok: false,
          error: ErrorFactory.validation(
            `File not accessible: ${inputPath}`,
            'FILE_NOT_ACCESSIBLE'
          )
        };
      }
    }

    return result;
  }

  validateMultiplePaths(inputPaths: string[]): Result<string[], ValidationError> {
    const validatedPaths: string[] = [];
    
    for (const inputPath of inputPaths) {
      const result = this.validatePathSync(inputPath);
      if (!result.ok) {
        return result;
      }
      validatedPaths.push(result.value);
    }
    
    return { ok: true, value: validatedPaths };
  }
}