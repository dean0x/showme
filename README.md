# ShowMe MCP Server

A Model Context Protocol (MCP) server that enables coding agents to open files and git diffs directly in VS Code. Provides two MCP tools that require no summary - the user sees the results directly in their editor.

## Why ShowMe?

The rise of CLI-based coding agents has fundamentally changed how we write code. We're no longer working *in* our IDEs—we're working *with* AI agents through conversational interfaces. This shift creates a new challenge: how do we quickly review the code our agents are writing?

ShowMe bridges this gap. Instead of keeping your IDE open and constantly switching contexts, you can stay focused on your conversation with the agent. When you need to see something, just ask:

- **"Show me index.js"** - Instantly opens the file in VS Code
- **"Show me what you just changed"** - Displays a rich diff view
- **"Show me the main components"** - Opens multiple files as tabs

Review what you need, close the window, and continue the conversation. It's ephemeral, on-demand code viewing designed for the age of AI-assisted development.

## Features

- 🎯 **Direct VS Code Integration** - Opens files and diffs directly in your editor
- 🎨 **Syntax Highlighting** - Full language support through VS Code
- 📂 **Multi-file Support** - Open multiple files as tabs in a single command
- 🔍 **Git Diff Visualization** - Side-by-side diff comparisons with multi-tab support
- 📍 **Line Navigation** - Jump to specific line numbers
- ⚡ **Fast & Lightweight** - Minimal dependencies, instant response

## Quick Reference

| Tool | Purpose | Example |
|------|---------|---------|
| `ShowFile` | Opens file(s) in VS Code | `ShowFile({ files: ["README.md"] })` |
| `ShowDiff` | Shows changes since last commit | `ShowDiff({ files: ["src/index.ts"] })` |

## Installation

```bash
npm install -g @dean0x/showme
```

Or install locally in your project:

```bash
npm install @dean0x/showme
```

## MCP Configuration

### Using npx (recommended)
```json
{
  "mcpServers": {
    "showme": {
      "command": "npx",
      "args": ["-y", "@dean0x/showme", "mcp", "start"]
    }
  }
}
```

### Local development
```json
{
  "mcpServers": {
    "showme": {
      "command": "node",
      "args": ["/path/to/showme-mcp/dist/index.js"]
    }
  }
}
```

**Note:** The server uses the current working directory and will run in your project folder.

## MCP Tools

### `ShowFile`
Open one or multiple files in VS Code.

**Parameters:**
- `files` (string[], required) - Files to open in VS Code
- `line` (number, optional) - Line number to jump to (only applies to first file)

**Examples:**
```typescript
// Single file
await ShowFile({ files: ["src/index.ts"] })

// Single file with line number
await ShowFile({ files: ["src/utils.ts"], line: 42 })

// Multiple files as tabs
await ShowFile({ files: ["src/index.ts", "package.json", "README.md"] })
```

### `ShowDiff`
Display git diffs showing all changes since the last commit (HEAD vs working directory).

**Parameters:**
- `files` (string[], optional) - Specific files to show diff for. If not provided, shows all changed files.

**Examples:**
```typescript
// Show all changes since last commit
await ShowDiff({})

// Show changes for specific file
await ShowDiff({ files: ["src/index.ts"] })

// Show changes for multiple files (opens each in separate tab)
await ShowDiff({
  files: ["src/index.ts", "package.json", "README.md"]
})
```

**Note:** ShowDiff always compares HEAD to the working directory, showing all uncommitted changes (both staged and unstaged).

## CLI Usage (Testing)

The package includes a CLI tool for testing the functionality:

### File Commands
```bash
# Open single file
showme file README.md

# Open file at specific line
showme file src/index.ts --line 42
showme file src/main.ts -l 100

# Open multiple files as tabs
showme file src/index.ts src/utils.ts README.md
showme file src/*.ts  # Using shell expansion
```

### Diff Commands
```bash
# Show all changes since last commit
showme diff

# Show diff for specific files
showme diff --files src/index.ts src/utils.ts
showme diff -f package.json

# Show diff for multiple files
showme diff -f src/index.ts README.md package.json
```

### Other Commands
```bash
# Show help
showme --help
showme -h

# Show version
showme --version
showme -v
```

## Architecture

The server follows clean architecture principles:

- **Result Types** - All operations return `Result<T, E>` for explicit error handling
- **Dependency Injection** - Testable, modular design  
- **Pipe Composition** - Functional programming patterns for data flow
- **Resource Management** - Proper cleanup with try/finally patterns
- **Type Safety** - Full TypeScript with no `any` types

### Project Structure
```
showme/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── cli.ts            # CLI tool entry point
│   ├── handlers/         # MCP tool handlers
│   │   ├── show-file-handler.ts
│   │   └── show-diff-handler.ts
│   ├── utils/            # Utilities and services
│   │   ├── vscode-executor.ts
│   │   ├── git-detector.ts
│   │   ├── git-diff-generator.ts
│   │   └── ...
│   └── __tests__/        # Test files
└── dist/                # Compiled output (generated)
```

## Requirements

- Node.js >= 20.0.0
- VS Code installed and accessible via `code` command
- Git (for diff functionality)

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Development mode
npm run dev

# Lint code
npm run lint

# Type check
npm run type-check
```

## Testing

The project uses Vitest for testing with a focus on integration tests:

```bash
# Run all tests
npm test

# Run in watch mode
npm run test

# Run once
npm run test:run

# Coverage report
npm run test:coverage
```

## Publishing

```bash
# Build the project
npm run build

# Test locally
npm link
showme-mcp

# Publish to npm
npm publish --access public
```

## Troubleshooting

### VS Code command not found
If you get an error about `code` command not being found:
1. Open VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Shell Command: Install 'code' command in PATH"
4. Restart your terminal

### MCP server not connecting
1. Check your MCP client configuration file
2. Ensure the command is correctly spelled
3. Restart your MCP client after configuration changes

## License

MIT - See [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please follow the project's engineering principles and code style.

## Support

For issues and feature requests, please visit our [GitHub Issues](https://github.com/dean0x/showme/issues) page.

## Acknowledgments

Built using the [Model Context Protocol](https://modelcontextprotocol.io) specification.