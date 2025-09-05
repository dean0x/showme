import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { HTTPServer } from "./server/http-server.js";
import { ShowFileHandler, type ShowFileRequest } from "./handlers/show-file-handler.js";
import { ShowDiffHandler, type ShowDiffRequest } from "./handlers/show-diff-handler.js";
import { ConsoleLogger } from "./utils/logger.js";
import { ResourceManager } from "./utils/resource-manager.js";
import { type Result } from "./utils/path-validator.js";

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

const ShowFileArgsSchema = z.object({
  path: z.string().describe("File path relative to workspace"),
  line_highlight: z.number().optional().describe("Optional line number to highlight and jump to"),
});

const ShowDiffArgsSchema = z.object({
  base: z.string().optional().describe("Base commit/branch (default: HEAD)"),
  target: z.string().optional().describe("Target commit/branch (default: working)"),
  files: z.array(z.string()).optional().describe("Specific files to include in diff"),
});

export async function createServer(resourceManager?: ResourceManager): Promise<Result<McpServer, ServerCreationError>> {
  const logger = new ConsoleLogger();
  const resources = resourceManager || new ResourceManager(logger);
  
  try {
    // Use dynamic port allocation (0) in tests, fallback to 3847 only if explicitly set
    const envPort = process.env.SHOWME_HTTP_PORT;
    const port = envPort ? parseInt(envPort) : 0; // 0 = dynamic port allocation
    const httpServer = resources.register(new HTTPServer(port, logger));
    
    // Start HTTP server and wait for it to be ready
    const httpResult = await httpServer.start();
    if (!httpResult.ok) {
      return {
        ok: false,
        error: new ServerCreationError(
          `Failed to start HTTP server: ${httpResult.error.message}`,
          httpResult.error.code
        )
      };
    }

    logger.info('HTTP server started successfully', { 
      httpPort: httpResult.value.port,
      baseUrl: httpResult.value.baseUrl 
    });

    // Create handlers after HTTP server is ready
    const showFileHandlerResult = await ShowFileHandler.create(httpServer, logger);
    if (!showFileHandlerResult.ok) {
      return {
        ok: false,
        error: new ServerCreationError(
          `Failed to create ShowFileHandler: ${showFileHandlerResult.error.message}`,
          'HANDLER_CREATION_FAILED'
        )
      };
    }
    
    const showDiffHandler = ShowDiffHandler.create(httpServer, logger);
    
    const server = new McpServer(
      {
        name: "showme-mcp",
        version: "1.0.0",
      }
    );
    
    // Register showme.file tool
    server.tool(
      "showme.file",
      "Display a file in browser with syntax highlighting", 
      ShowFileArgsSchema.shape,
      async (args) => {
        const request: ShowFileRequest = { path: args.path };
        if (args.line_highlight !== undefined) request.line_highlight = args.line_highlight;
        return await showFileHandlerResult.value.handleFileRequest(request);
      }
    );
    
    // Register showme.diff tool
    server.tool(
      "showme.diff", 
      "Display git diff in browser with rich visualization",
      ShowDiffArgsSchema.shape,
      async (args) => {
        const request: ShowDiffRequest = {};
        if (args.base !== undefined) request.base = args.base;
        if (args.target !== undefined) request.target = args.target;
        if (args.files !== undefined) request.files = args.files;
        return await showDiffHandler.handleDiffRequest(request);
      }
    );

    logger.info('ShowMe MCP server ready', { 
      httpPort: httpResult.value.port,
      baseUrl: httpResult.value.baseUrl 
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
  const logger = new ConsoleLogger();
  const resourceManager = new ResourceManager(logger);
  
  // Graceful shutdown handler
  const gracefulShutdown = async (): Promise<void> => {
    console.log('\nReceived shutdown signal. Cleaning up...');
    try {
      await resourceManager.disposeAll();
      console.log('All resources cleaned up successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during cleanup:', error);
      process.exit(1);
    }
  };

  try {
    // Register shutdown handlers
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await gracefulShutdown();
    });

    await startServer(resourceManager);
    console.log("ShowMe MCP server running...");
  } catch (error) {
    console.error("Server error:", error);
    await gracefulShutdown();
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}