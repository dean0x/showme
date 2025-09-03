import path from 'path';
import fs from 'fs/promises';
export class PathValidationError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'PathValidationError';
    }
}
export class PathValidator {
    workspaceRoot;
    static WINDOWS_DEVICE_NAMES = new Set([
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ]);
    constructor(workspaceRoot) {
        this.workspaceRoot = path.resolve(workspaceRoot || process.cwd());
    }
    validatePathSync(inputPath) {
        try {
            // Check for null byte attack
            if (inputPath.includes('\0')) {
                return {
                    ok: false,
                    error: new PathValidationError(`Path contains null byte attack: ${inputPath.replace(/\0/g, '\\0')}`, 'NULL_BYTE_ATTACK')
                };
            }
            // Check for Windows device names (CVE-2025-27210)
            const fileName = path.basename(inputPath);
            const dotIndex = fileName.indexOf('.');
            const nameWithoutExt = (dotIndex === -1 ? fileName : fileName.substring(0, dotIndex)).toUpperCase();
            if (PathValidator.WINDOWS_DEVICE_NAMES.has(nameWithoutExt)) {
                return {
                    ok: false,
                    error: new PathValidationError(`Path contains Windows device name: ${fileName}`, 'WINDOWS_DEVICE_NAME')
                };
            }
            const resolved = path.resolve(this.workspaceRoot, inputPath);
            // Ensure resolved path is within workspace boundaries
            if (!resolved.startsWith(this.workspaceRoot)) {
                // Check if it's due to directory traversal
                if (inputPath.includes('..')) {
                    return {
                        ok: false,
                        error: new PathValidationError(`Path contains directory traversal attempt: ${inputPath}`, 'DIRECTORY_TRAVERSAL')
                    };
                }
                return {
                    ok: false,
                    error: new PathValidationError(`Path resolves outside workspace: ${inputPath}`, 'OUTSIDE_WORKSPACE')
                };
            }
            // Additional check for directory traversal patterns
            if (inputPath.includes('..')) {
                return {
                    ok: false,
                    error: new PathValidationError(`Path contains directory traversal attempt: ${inputPath}`, 'DIRECTORY_TRAVERSAL')
                };
            }
            return { ok: true, value: resolved };
        }
        catch (error) {
            return {
                ok: false,
                error: new PathValidationError(error instanceof Error ? error.message : String(error), 'VALIDATION_ERROR')
            };
        }
    }
    async validatePath(inputPath, options = {}) {
        const result = this.validatePathSync(inputPath);
        if (!result.ok) {
            return result;
        }
        if (options.checkAccess) {
            try {
                await fs.access(result.value, fs.constants.R_OK);
            }
            catch {
                return {
                    ok: false,
                    error: new PathValidationError(`File not accessible: ${inputPath}`, 'FILE_NOT_ACCESSIBLE')
                };
            }
        }
        return result;
    }
    validateMultiplePaths(inputPaths) {
        const validatedPaths = [];
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
