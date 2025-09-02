import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
interface ServerConfig {
    name: string;
    version: string;
    capabilities: {
        tools?: Record<string, never>;
        resources?: Record<string, never>;
        prompts?: Record<string, never>;
    };
    [key: string]: unknown;
}
export declare function createServer(): McpServer & {
    capabilities: ServerConfig['capabilities'];
};
export declare function startServer(): Promise<void>;
export {};
