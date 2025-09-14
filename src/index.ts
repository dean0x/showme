#!/usr/bin/env node

/**
 * ShowMe MCP Server - VS Code Integration
 * Following engineering principles: DI, Result types, resource cleanup
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ShowFileHandler, type ShowFileRequest } from "./handlers/show-file-handler.js";
import { ShowDiffHandler, type ShowDiffRequest } from "./handlers/show-diff-handler.js";
import { ConsoleLogger } from "./utils/logger.js";
import { ResourceManager } from "./utils/resource-manager.js";
import { type Result } from "./utils/path-validator.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get package version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));
const VERSION = packageJson.version;

/**
 * Server creation error
 */
export class ServerCreationError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ServerCreationError';
  }
}

export async function createServer(resourceManager?: ResourceManager): Promise<Result<Server, ServerCreationError>> {
  const logger = new ConsoleLogger();
  const resources = resourceManager || new ResourceManager(logger);
  
  try {
    // Create handlers - no HTTP server needed for VS Code integration
    const showFileHandler = ShowFileHandler.create(logger);
    const showDiffHandler = ShowDiffHandler.create(logger);
    
    // Register handlers for cleanup
    resources.register({
      async dispose() {
        await showDiffHandler.dispose();
        logger.debug('Handlers disposed');
      }
    });
    
    const server = new Server(
      {
        name: "showme-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Register MCP tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'ShowFile',
            description: 'Opens file(s) in VS Code. Only call this function if you were explicitly and immediately asked to show a file by the user in their last message to you. Don\'t provide any summary or additional commentary after calling the tool - the user will see the file directly.',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Single file path relative to workspace root (use this OR paths, not both)',
                },
                paths: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Multiple file paths to open as tabs in VS Code',
                },
                line_highlight: {
                  type: 'number',
                  description: 'Optional line number to highlight and jump to (only works with single path)',
                  minimum: 1,
                },
                reuseWindow: {
                  type: 'boolean',
                  description: 'Open in current VS Code window instead of new window (default: false)',
                },
              },
            },
          },
          {
            name: 'ShowDiff',
            description: 'Opens git diff in VS Code. Only call this function if you were explicitly and immediately asked to show a changes by the user in their last message to you. Don\'t provide any summary or additional commentary after calling the tool - the user will see the file directly.',
            inputSchema: {
              type: 'object',
              properties: {
                base: {
                  type: 'string',
                  description: 'Base commit, branch, or tag for comparison (omit for working directory changes)',
                },
                target: {
                  type: 'string', 
                  description: 'Target commit or branch (omit for working directory)',
                },
                files: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Specific files to include in diff (optional)',
                },
                staged: {
                  type: 'boolean',
                  description: 'Show only staged changes (default: false). Only use this param if explicitly asked by user to show staged only changes.',
                },
                unstaged: {
                  type: 'boolean',
                  description: 'Show only unstaged changes (default: false). Only use this param if explicitly asked by user to show unstaged only changes.',
                },
                reuseWindow: {
                  type: 'boolean',
                  description: 'Open in current VS Code window instead of new window (default: false)',
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args || typeof args !== 'object') {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Missing or invalid arguments',
            },
          ],
        };
      }

      try {
        switch (name) {
          case 'ShowFile': {
            const request: ShowFileRequest = {};
            
            // Handle single path or multiple paths
            if (typeof args.path === 'string') {
              request.path = args.path;
            } else if (Array.isArray(args.paths) && args.paths.every(p => typeof p === 'string')) {
              request.paths = args.paths as string[];
            }
            
            if (typeof args.line_highlight === 'number') {
              request.line_highlight = args.line_highlight;
            }
            return await showFileHandler.handleFileRequest(request);
          }
          
          case 'ShowDiff': {
            const request: ShowDiffRequest = {};
            if (typeof args.base === 'string') request.base = args.base;
            if (typeof args.target === 'string') request.target = args.target;
            if (Array.isArray(args.files) && args.files.every(f => typeof f === 'string')) {
              request.files = args.files as string[];
            }
            if (typeof args.staged === 'boolean') request.staged = args.staged;
            if (typeof args.unstaged === 'boolean') request.unstaged = args.unstaged;
            return await showDiffHandler.handleDiffRequest(request);
          }
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Tool ${name} failed: ${errorMessage}`);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });

    logger.info('ShowMe MCP server ready', { 
      integration: 'VS Code',
      tools: ['ShowFile', 'ShowDiff']
    });
    
    return {
      ok: true,
      value: server
    };
  } catch (error) {
    return {
      ok: false,
      error: new ServerCreationError(
        error instanceof Error ? error.message : String(error),
        'SERVER_CREATION_ERROR'
      )
    };
  }
}

export async function startServer(resourceManager?: ResourceManager): Promise<void> {
  const serverResult = await createServer(resourceManager);
  if (!serverResult.ok) {
    throw new Error(`Failed to create server: ${serverResult.error.message}`);
  }

  const server = serverResult.value;
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
}

// Main entry point for CLI execution
async function main(): Promise<void> {
  // Handle version flag
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log(`showme-mcp version ${VERSION}`);
    process.exit(0);
  }
  
  const logger = new ConsoleLogger();
  const resourceManager = new ResourceManager(logger);
  
  // Graceful shutdown handler
  const gracefulShutdown = async (): Promise<void> => {
    logger.info('Received shutdown signal. Cleaning up...');
    try {
      await resourceManager.disposeAll();
      logger.info('All resources cleaned up successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during cleanup', { error });
      process.exit(1);
    }
  };

  try {
    // Register shutdown handlers
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception', { error });
      await gracefulShutdown();
    });

    await startServer(resourceManager);
    logger.info("ShowMe MCP server running with VS Code integration...");
  } catch (error) {
    logger.error("Server error", { error });
    await gracefulShutdown();
  }
}

// Only run main if this is the entry point (not imported as module)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}