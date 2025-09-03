import fs from 'fs/promises';
import path from 'path';
import { PathValidator, type Result, PathValidationError } from './path-validator.js';

export interface FileContent {
  content: string;
  filepath: string;
  filename: string;
  fileSize: number;
  lastModified: Date;
  language: string;
}

export class FileManagerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FileManagerError';
  }
}

export class FileManager {
  private pathValidator: PathValidator;

  constructor(workspaceRoot?: string) {
    this.pathValidator = new PathValidator(workspaceRoot);
  }

  async readFile(inputPath: string): Promise<Result<FileContent, FileManagerError | PathValidationError>> {
    // Validate path first
    const pathResult = await this.pathValidator.validatePath(inputPath, { checkAccess: true });
    if (!pathResult.ok) {
      return { ok: false, error: pathResult.error };
    }

    try {
      const resolvedPath = pathResult.value;
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const stats = await fs.stat(resolvedPath);
      
      return {
        ok: true,
        value: {
          content,
          filepath: resolvedPath,
          filename: path.basename(resolvedPath),
          fileSize: stats.size,
          lastModified: stats.mtime,
          language: this.detectLanguage(resolvedPath)
        }
      };
    } catch (error) {
      return {
        ok: false,
        error: new FileManagerError(
          `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
          'FILE_READ_ERROR'
        )
      };
    }
  }

  private detectLanguage(filepath: string): string {
    const ext = path.extname(filepath).toLowerCase();
    
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'jsx',
      '.tsx': 'tsx',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.xml': 'xml',
      '.md': 'markdown',
      '.sql': 'sql',
      '.sh': 'bash',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby'
    };

    return languageMap[ext] || 'text';
  }
}