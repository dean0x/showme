import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { HTTPServer } from "./server/http-server.js";
import { ShowFileHandler, type ShowFileRequest } from "./handlers/show-file-handler.js";
import { ShowDiffHandler, type ShowDiffRequest } from "./handlers/show-diff-handler.js";
import { ConsoleLogger } from "./utils/logger.js";
import { ResourceManager } from "./utils/resource-manager.js";

const ShowFileArgsSchema = z.object({
  path: z.string().describe("File path relative to workspace"),
  line_highlight: z.number().optional().describe("Optional line number to highlight and jump to"),
});

const ShowDiffArgsSchema = z.object({
  base: z.string().optional().describe("Base commit/branch (default: HEAD)"),
  target: z.string().optional().describe("Target commit/branch (default: working)"),
  files: z.array(z.string()).optional().describe("Specific files to include in diff"),
});

// Global resource manager for application lifecycle
export const resourceManager = new ResourceManager(new ConsoleLogger());

export function createServer(): McpServer {
  const logger = new ConsoleLogger();
  const port = parseInt(process.env.SHOWME_HTTP_PORT || '0') || 3847; // 0 = dynamic port for tests
  const httpServer = resourceManager.register(new HTTPServer(port, logger));
  const showFileHandler = new ShowFileHandler(httpServer, logger);
  const showDiffHandler = new ShowDiffHandler(httpServer, logger);
  
  const server = new McpServer(
    {
      name: "showme-mcp",
      version: "1.0.0",
    }
  );
  
  // Start HTTP server
  httpServer.start().then((result) => {
    if (result.ok) {
      logger.info('ShowMe MCP server ready', { 
        httpPort: result.value.port,
        baseUrl: result.value.baseUrl 
      });
    } else {
      logger.error('Failed to start HTTP server', { 
        error: result.error.message,
        code: result.error.code 
      });
    }
  });
  
  // Register showme.file tool
  server.tool(
    "showme.file",
    "Display a file in browser with syntax highlighting", 
    ShowFileArgsSchema.shape,
    async (args) => {
      const request: ShowFileRequest = { path: args.path };
      if (args.line_highlight !== undefined) request.line_highlight = args.line_highlight;
      return await showFileHandler.handleFileRequest(request);
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
  
  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
}

// Graceful shutdown handler
async function gracefulShutdown(): Promise<void> {
  console.log('\nReceived shutdown signal. Cleaning up...');
  try {
    await resourceManager.disposeAll();
    console.log('All resources cleaned up successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Main entry point for CLI execution
async function main(): Promise<void> {
  try {
    // Register shutdown handlers
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await gracefulShutdown();
    });

    await startServer();
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