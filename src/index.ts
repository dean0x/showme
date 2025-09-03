import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

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
      // Tool handler implementation
      return {
        content: [
          {
            type: "text" as const,
            text: `File display not yet implemented: ${args.path}`
          }
        ]
      };
    }
  );
  
  // Register showme.diff tool
  server.tool(
    "showme.diff", 
    "Display git diff in browser with rich visualization",
    ShowDiffArgsSchema.shape,
    async (args) => {
      // Tool handler implementation
      const filesText = args.files ? ` for files: ${args.files.join(', ')}` : '';
      return {
        content: [
          {
            type: "text" as const,
            text: `Git diff display not yet implemented${filesText}`
          }
        ]
      };
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