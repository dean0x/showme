import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { HTTPServer } from "./server/http-server.js";
import { ShowFileHandler } from "./handlers/show-file-handler.js";
import { ShowDiffHandler } from "./handlers/show-diff-handler.js";
import { ConsoleLogger } from "./utils/logger.js";

const ShowFileArgsSchema = z.object({
  path: z.string().describe("File path relative to workspace"),
  line_highlight: z.number().optional().describe("Optional line number to highlight and jump to"),
});

const ShowDiffArgsSchema = z.object({
  base: z.string().optional().describe("Base commit/branch (default: HEAD)"),
  target: z.string().optional().describe("Target commit/branch (default: working)"),
  files: z.array(z.string()).optional().describe("Specific files to include in diff"),
});

export function createServer(): McpServer {
  const logger = new ConsoleLogger();
  const httpServer = new HTTPServer(3847, logger);
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
      return await showFileHandler.handleFileRequest(args);
    }
  );
  
  // Register showme.diff tool
  server.tool(
    "showme.diff", 
    "Display git diff in browser with rich visualization",
    ShowDiffArgsSchema.shape,
    async (args) => {
      return await showDiffHandler.handleDiffRequest(args);
    }
  );
  
  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
}

// Main entry point for CLI execution
async function main(): Promise<void> {
  try {
    await startServer();
    console.log("ShowMe MCP server running...");
  } catch (error) {
    console.error("Server error:", error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}