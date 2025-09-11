# ShowMe MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to open files and display git diffs directly in VS Code with syntax highlighting. Provides two MCP tools: `ShowFile` for opening files and `ShowDiff` for visualizing git differences.

## Features

- 🎯 **Direct VS Code Integration** - Opens files and diffs directly in your editor
- 🎨 **Syntax Highlighting** - Full language support through VS Code
- 📂 **Multi-file Support** - Open multiple files as tabs in a single command
- 🔍 **Git Diff Visualization** - Side-by-side diff comparisons for single files
- 📍 **Line Navigation** - Jump to specific line numbers
- ⚡ **Fast & Lightweight** - Minimal dependencies, instant response

## Quick Reference

| Tool | Purpose | Example |
|------|---------|---------|
| `ShowFile` | Open files in VS Code | `ShowFile({ path: "README.md" })` |
| `ShowDiff` | Display git diffs | `ShowDiff({ base: "main" })` |

## Installation

```bash
npm install -g showme
```

Or install locally in your project:

```bash
npm install showme
```

## MCP Configuration

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "showme": {
      "command": "npx",
      "args": ["showme"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "showme": {
      "command": "showme-mcp"
    }
  }
}
```

**Note:** The server uses the current working directory. Claude will automatically run it in your project folder when you open a project.

## MCP Tools

### `ShowFile`
Open one or multiple files in VS Code.

**Parameters:**
- `path` (string, optional) - Single file path relative to workspace
- `paths` (string[], optional) - Multiple file paths to open as tabs
- `line_highlight` (number, optional) - Line number to jump to (single file only)

**Examples:**
```typescript
// Single file
await ShowFile({ path: "src/index.ts" })

// Single file with line highlight
await ShowFile({ path: "src/utils.ts", line_highlight: 42 })

// Multiple files
await ShowFile({ paths: ["src/index.ts", "package.json", "README.md"] })
```

### `ShowDiff`
Display git diffs with rich visualization.

**Parameters:**
- `base` (string, optional) - Base commit, branch, or tag
- `target` (string, optional) - Target commit, branch, or tag
- `files` (string[], optional) - Specific files to include in diff

**Examples:**
```typescript
// Working directory changes
await ShowDiff({})

// Compare with branch
await ShowDiff({ base: "main" })

// Compare commits
await ShowDiff({ base: "HEAD~2", target: "HEAD" })

// Specific file diff (side-by-side view)
await ShowDiff({ 
  base: "HEAD~1", 
  target: "HEAD",
  files: ["src/index.ts"]
})
```

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
# Show working directory changes
showme diff

# Show diff from specific branch
showme diff --base main
showme diff -b feature-branch

# Compare two commits/branches
showme diff --base HEAD~1 --target HEAD
showme diff -b v1.0.0 -t v1.1.0

# Show diff for specific files
showme diff --files src/index.ts src/utils.ts
showme diff -f package.json
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

## Supported Editors

The server automatically detects and supports:
- VS Code
- VS Code Insiders  
- Cursor
- VSCodium
- Any editor accessible via `code` command

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

### Permission denied
If you get permission errors when installing globally:
```bash
sudo npm install -g showme
```

### MCP server not connecting
1. Check your Claude Desktop configuration file
2. Ensure the command is correctly spelled
3. Restart Claude Desktop after configuration changes

## License

MIT - See [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please follow the engineering principles outlined in [CLAUDE.md](CLAUDE.md).

## Support

For issues and feature requests, please visit our [GitHub Issues](https://github.com/dean0x/showme/issues) page.

## Acknowledgments

Built for use with [Claude Desktop](https://claude.ai) and the [Model Context Protocol](https://modelcontextprotocol.io).