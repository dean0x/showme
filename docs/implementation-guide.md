# ShowMe MCP Server - Implementation Guide

## Project Setup

### Initialize Project Structure

```bash
mkdir showme-mcp
cd showme-mcp
npm init -y
```

### Required Dependencies

```bash
# Core MCP dependencies
npm install @modelcontextprotocol/sdk

# HTTP server and utilities (Express 5.x)
npm install express@^5.1.0 mime-types

# Syntax highlighting and rendering (2025 latest)
npm install shiki@^1.24.0 diff2html@^3.4.52 marked@^14.2.0

# Development dependencies  
npm install -D typescript@^5.8.0 @types/node@^22.18.0 @types/express@^5.0.0
npm install -D tsx@^4.20.0

# Testing framework
npm install -D vitest@^2.2.0
```

### TypeScript Configuration

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2025",
    "module": "Node18",
    "moduleResolution": "Node18",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Package Scripts

**`package.json`** additions:
```json
{
  "engines": {
    "node": ">=22.18.0"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:run": "vitest run",
    "clean": "rm -rf dist"
  },
  "bin": {
    "showme-mcp": "./dist/index.js"
  }
}
```

## Core Implementation

### 1. Main Server Entry Point

**`src/index.ts`**:
```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { FileHandler } from './handlers/file-handler.js';
import { DiffHandler } from './handlers/diff-handler.js';
import { HTTPServer } from './server/http-server.js';

const server = new Server(
  {
    name: 'showme-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize HTTP server for serving files
const httpServer = new HTTPServer(3847);
const fileHandler = new FileHandler(httpServer);
const diffHandler = new DiffHandler(httpServer);

// Register MCP tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'showme.file',
        description: 'Display a file in browser with syntax highlighting',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path relative to workspace',
            },
            line_highlight: {
              type: 'number',
              description: 'Optional line number to highlight and jump to',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'showme.diff',
        description: 'Display git diff in browser with rich visualization',
        inputSchema: {
          type: 'object',
          properties: {
            base: {
              type: 'string',
              description: 'Base commit/branch (default: HEAD)',
            },
            target: {
              type: 'string', 
              description: 'Target commit/branch (default: working)',
            },
            files: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific files to include in diff',
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'showme.file':
        return await fileHandler.handleFileRequest(args);
      
      case 'showme.diff':
        return await diffHandler.handleDiffRequest(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ShowMe MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

### 2. HTTP Server Component

**`src/server/http-server.ts`**:
```typescript
import express from 'express';
import path from 'path';
import fs from 'fs/promises';

export class HTTPServer {
  private app: express.Application;
  private server: any;
  private port: number;
  private tempFiles: Map<string, { path: string; created: Date }> = new Map();

  constructor(port: number = 3847) {
    this.port = port;
    this.app = express();
    this.setupRoutes();
    this.startCleanupTimer();
  }

  private setupRoutes() {
    // Serve temporary HTML files
    this.app.get('/file/:id', async (req, res) => {
      const fileInfo = this.tempFiles.get(req.params.id);
      if (!fileInfo) {
        return res.status(404).send('File not found or expired');
      }

      try {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        res.type('html').send(content);
      } catch (error) {
        res.status(500).send('Error reading file');
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', tempFiles: this.tempFiles.size });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          console.error(`HTTP server listening on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  async registerTempFile(content: string, filename: string): Promise<string> {
    const id = Math.random().toString(36).substring(2);
    const tempPath = path.join(process.cwd(), '.showme-temp', `${id}.html`);
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    
    // Write HTML content
    await fs.writeFile(tempPath, content);
    
    // Register for cleanup
    this.tempFiles.set(id, { path: tempPath, created: new Date() });
    
    return `http://localhost:${this.port}/file/${id}`;
  }

  private startCleanupTimer() {
    setInterval(async () => {
      const now = new Date();
      const expiredFiles: string[] = [];

      for (const [id, info] of this.tempFiles.entries()) {
        const ageMinutes = (now.getTime() - info.created.getTime()) / (1000 * 60);
        if (ageMinutes > 60) { // 1 hour expiry
          expiredFiles.push(id);
        }
      }

      for (const id of expiredFiles) {
        const info = this.tempFiles.get(id);
        if (info) {
          try {
            await fs.unlink(info.path);
          } catch (error) {
            // File might already be deleted, ignore
          }
          this.tempFiles.delete(id);
        }
      }

      if (expiredFiles.length > 0) {
        console.error(`Cleaned up ${expiredFiles.length} expired temp files`);
      }
    }, 30 * 60 * 1000); // Check every 30 minutes
  }
}
```

### 3. File Handler Implementation

**`src/handlers/file-handler.ts`**:
```typescript
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import mimeTypes from 'mime-types';

import { HTTPServer } from '../server/http-server.js';
import { HTMLGenerator } from '../utils/html-generator.js';
import { PathValidator } from '../utils/path-validator.js';

const execAsync = promisify(exec);

export class FileHandler {
  constructor(
    private httpServer: HTTPServer,
    private htmlGenerator = new HTMLGenerator(),
    private pathValidator = new PathValidator()
  ) {}

  async handleFileRequest(args: any) {
    const { path: filePath, line_highlight: lineHighlight } = args;

    try {
      // Validate file path
      const absolutePath = this.pathValidator.validateAndResolve(filePath);
      
      // Check if file exists and is readable
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      // Check file size (10MB limit for text files)
      if (stats.size > 10 * 1024 * 1024) {
        throw new Error(`File too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB (max 10MB)`);
      }

      // Read file content
      const content = await fs.readFile(absolutePath, 'utf-8');
      
      // Generate HTML
      const html = await this.htmlGenerator.generateFileView({
        filename: path.basename(absolutePath),
        filepath: filePath,
        content,
        language: this.detectLanguage(absolutePath),
        lineHighlight,
        fileSize: stats.size,
        lastModified: stats.mtime,
      });

      // Register with HTTP server
      const url = await this.httpServer.registerTempFile(html, path.basename(absolutePath));
      
      // Open in browser
      await this.openInBrowser(url);

      return {
        content: [
          {
            type: 'text',
            text: `File opened in browser: ${filePath}`,
          },
        ],
      };

    } catch (error) {
      throw new Error(`Failed to display file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
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
      '.md': 'markdown',
      '.xml': 'xml',
      '.sql': 'sql',
      '.sh': 'bash',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
    };

    return languageMap[ext] || 'text';
  }

  private async openInBrowser(url: string): Promise<void> {
    const platform = process.platform;
    let command: string;

    switch (platform) {
      case 'darwin':
        command = `open "${url}"`;
        break;
      case 'win32':
        command = `start "${url}"`;
        break;
      default:
        command = `xdg-open "${url}"`;
    }

    try {
      await execAsync(command);
    } catch (error) {
      console.error(`Failed to open browser: ${error}`);
      // Don't throw - file is still available at URL
    }
  }
}
```

### 4. Git Diff Handler

**`src/handlers/diff-handler.ts`**:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

import { HTTPServer } from '../server/http-server.js';
import { DiffRenderer } from '../utils/diff-renderer.js';
import { PathValidator } from '../utils/path-validator.js';

const execAsync = promisify(exec);

interface DiffStats {
  files: number;
  insertions: number;
  deletions: number;
}

export class DiffHandler {
  constructor(
    private httpServer: HTTPServer,
    private diffRenderer = new DiffRenderer(),
    private pathValidator = new PathValidator()
  ) {}

  async handleDiffRequest(args: any) {
    const { base = 'HEAD', target, files } = args;

    try {
      // Validate we're in a git repository
      await this.validateGitRepo();

      // Build git diff command
      const diffCommand = this.buildDiffCommand(base, target, files);
      
      // Execute git diff
      const { stdout: diffOutput } = await execAsync(diffCommand);
      
      if (!diffOutput.trim()) {
        return {
          content: [
            {
              type: 'text',
              text: 'No differences found',
            },
          ],
        };
      }

      // Generate HTML from diff
      const html = await this.diffRenderer.renderDiff(diffOutput, {
        base,
        target: target || 'working directory',
        files: files || [],
      });

      // Register with HTTP server
      const url = await this.httpServer.registerTempFile(html, 'git-diff.html');
      
      // Open in browser
      await this.openInBrowser(url);

      // Parse stats from diff
      const stats = this.parseDiffStats(diffOutput);

      return {
        content: [
          {
            type: 'text',
            text: `Git diff opened in browser. Changed files: ${stats.files}, +${stats.insertions}/-${stats.deletions}`,
          },
        ],
      };

    } catch (error) {
      throw new Error(`Failed to generate diff: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async validateGitRepo(): Promise<void> {
    try {
      await execAsync('git rev-parse --git-dir');
    } catch {
      throw new Error('Not in a git repository');
    }
  }

  private buildDiffCommand(base: string, target?: string, files?: string[]): string {
    let command = 'git diff';
    
    if (target) {
      command += ` ${base}..${target}`;
    } else {
      command += ` ${base}`;
    }

    if (files && files.length > 0) {
      const validatedFiles = files.map(f => this.pathValidator.validateAndResolve(f, false));
      command += ` -- ${validatedFiles.join(' ')}`;
    }

    return command;
  }

  private parseDiffStats(diffOutput: string): DiffStats {
    const lines = diffOutput.split('\n');
    let files = 0;
    let insertions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        files++;
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        insertions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      }
    }

    return { files, insertions, deletions };
  }

  private async openInBrowser(url: string): Promise<void> {
    // Same implementation as FileHandler.openInBrowser
    const platform = process.platform;
    let command: string;

    switch (platform) {
      case 'darwin':
        command = `open "${url}"`;
        break;
      case 'win32':
        command = `start "${url}"`;
        break;
      default:
        command = `xdg-open "${url}"`;
    }

    try {
      await execAsync(command);
    } catch (error) {
      console.error(`Failed to open browser: ${error}`);
    }
  }
}
```

### 5. Security Validation

**`src/utils/path-validator.ts`**:
```typescript
import path from 'path';
import fs from 'fs/promises';

export class PathValidator {
  private workspaceRoot: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || process.cwd();
  }

  /**
   * Validates and resolves a file path, ensuring it's within workspace bounds
   */
  validateAndResolve(inputPath: string, mustExist: boolean = true): string {
    // Convert to absolute path
    const absolutePath = path.resolve(this.workspaceRoot, inputPath);
    
    // Ensure path is within workspace (prevent directory traversal)
    if (!absolutePath.startsWith(this.workspaceRoot)) {
      throw new Error(`Path outside workspace: ${inputPath}`);
    }

    // Additional security checks
    if (inputPath.includes('..')) {
      throw new Error(`Invalid path containing '..': ${inputPath}`);
    }

    return absolutePath;
  }

  /**
   * Check if a file exists and is accessible
   */
  async validateFileAccess(filePath: string): Promise<void> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch {
      throw new Error(`File not accessible: ${filePath}`);
    }
  }
}
```

## Build and Testing

### Build Process

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing Strategy

**`src/__tests__/file-handler.test.ts`**:
```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { FileHandler } from '../handlers/file-handler.js';
import { HTTPServer } from '../server/http-server.js';

describe('FileHandler', () => {
  let httpServer: HTTPServer;
  let fileHandler: FileHandler;

  beforeEach(() => {
    httpServer = new HTTPServer(3848); // Different port for tests
    fileHandler = new FileHandler(httpServer);
  });

  test('should handle valid file request', async () => {
    const result = await fileHandler.handleFileRequest({
      path: './package.json'
    });

    expect(result.content[0].text).toContain('File opened in browser');
  });

  test('should reject path outside workspace', async () => {
    await expect(
      fileHandler.handleFileRequest({ path: '../../../etc/passwd' })
    ).rejects.toThrow('Path outside workspace');
  });
});
```

## Integration with Claude Code

### Configuration

Add to Claude Code's MCP configuration:

```json
{
  "mcpServers": {
    "showme": {
      "command": "npx",
      "args": ["showme-mcp"]
    }
  }
}
```

### Usage Examples

Claude can now use:
```
Show me the contents of src/main.ts
```
```
Show me the git diff for the last commit
```
```
Display the README.md file with line 25 highlighted
```

This implementation provides a secure, performant, and feature-rich foundation for the ShowMe MCP server.