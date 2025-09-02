import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
export function createServer() {
    const config = {
        name: "showme-mcp",
        version: "1.0.0",
        capabilities: {
            tools: {},
        },
    };
    const server = new McpServer(config);
    // Expose capabilities for testing
    return Object.assign(server, { capabilities: config.capabilities });
}
export async function startServer() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
// Main entry point for CLI execution
async function main() {
    try {
        await startServer();
        console.log("ShowMe MCP server running...");
    }
    catch (error) {
        console.error("Server error:", error);
        process.exit(1);
    }
}
// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
