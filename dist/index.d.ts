import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceManager } from "./utils/resource-manager.js";
import { type Result } from "./utils/path-validator.js";
/**
 * Server creation error
 */
export declare class ServerCreationError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export declare function createServer(resourceManager?: ResourceManager): Promise<Result<McpServer, ServerCreationError>>;
export declare function startServer(resourceManager?: ResourceManager): Promise<void>;
