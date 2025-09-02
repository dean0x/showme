# ShowMe MCP Server - Technical Specification

## Overview

The ShowMe MCP server enables ephemeral file viewing through browser display, providing rich visualization for code files, git diffs, and various file types that benefit from browser rendering capabilities.

## Core Architecture

### Server Components

1. **HTTP Server**: Single persistent server on fixed port (3847)
2. **File Handler**: Secure file reading with workspace validation
3. **Git Integration**: Git diff generation and formatting
4. **HTML Generator**: Template-based HTML generation with syntax highlighting
5. **Cleanup Service**: Automatic purging of files older than 1 hour

### Security Model

- **Path Validation**: All file paths must be within workspace bounds
- **No Directory Traversal**: Strict validation prevents `../../../etc/passwd` attacks
- **Read-Only Operations**: Server only reads files, never writes
- **Temporary Files**: All generated HTML files are ephemeral and auto-cleaned

## MCP Tool Definitions

### `showme.file`

**Purpose**: Display a file in browser with syntax highlighting

**Parameters**:
```typescript
{
  "path": "string",           // Required: File path relative to workspace
  "line_highlight": "number"  // Optional: Jump to specific line number
}
```

**Behavior**:
- Validates file path is within workspace
- Reads file content
- Detects file type via extension + magic bytes
- Generates HTML with syntax highlighting using Shiki
- Opens in browser via system `open` command
- Returns success/failure status

### `showme.diff` 

**Purpose**: Display git diff in browser with rich visualization

**Parameters**:
```typescript
{
  "base": "string",     // Optional: Base commit/branch (default: HEAD)
  "target": "string",   // Optional: Target commit/branch (default: working)
  "files": "string[]"   // Optional: Specific files to diff
}
```

**Behavior**:
- Validates git repository exists in workspace
- Executes appropriate git diff command
- Formats diff output using diff2html library
- Generates HTML with side-by-side or unified view
- Opens in browser
- Returns diff statistics and status

## File Type Support Matrix

| Extension | Library | Features |
|-----------|---------|----------|
| .js, .ts, .jsx, .tsx | Shiki | VS Code-quality syntax highlighting, line numbers |
| .py, .java, .cpp, .c | Shiki | VS Code-quality syntax highlighting, line numbers |
| .html, .css, .scss | Shiki | VS Code-quality syntax highlighting, line numbers |
| .json, .yaml, .toml | Shiki | VS Code-quality syntax highlighting, validation |
| .md | Marked.js | Markdown rendering, syntax highlight |
| .svg | Native | SVG display with zoom controls |
| .png, .jpg, .gif | Native | Image display with metadata |
| .pdf | PDF.js | PDF viewer with navigation |

## HTML Template Structure

### File Viewer Template

```html
<!DOCTYPE html>
<html>
<head>
    <title>ShowMe: {filename}</title>
    <!-- Shiki generates inline styles and classes, no external CDN needed -->
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI'; }
        .line-highlight { background-color: #3e4451; }
        .metadata { padding: 16px; background: #f6f8fa; }
    </style>
</head>
<body>
    <div class="metadata">
        <h2>{filename}</h2>
        <p>Path: {filepath} | Size: {filesize} | Modified: {mtime}</p>
    </div>
    <pre><code class="language-{lang}">{content}</code></pre>
</body>
</html>
```

### Diff Viewer Template

Uses diff2html library for rich diff visualization:
- Side-by-side and unified diff views
- Line-by-line change highlighting  
- File tree navigation for multi-file diffs
- Add/delete/modify statistics
- Syntax highlighting within diff context

## Error Handling

### File Access Errors
- **FileNotFound**: Return clear error message with suggested alternatives
- **PermissionDenied**: Log security attempt, return generic error
- **InvalidPath**: Path outside workspace bounds, reject immediately

### Git Errors  
- **NotAGitRepo**: Check if workspace has `.git` directory
- **InvalidCommit**: Validate commit hashes exist before diff
- **MergeConflicts**: Handle dirty working directory gracefully

### Browser Integration
- **BrowserNotFound**: Fallback to system default application
- **PortInUse**: Increment port number or return error
- **HTMLGeneration**: Template errors should not crash server

## Performance Considerations

### File Size Limits
- **Text Files**: Max 10MB for syntax highlighting
- **Binary Files**: Max 50MB for display
- **Git Diffs**: Max 1000 files per diff request

### Caching Strategy
- **Template Cache**: Pre-compile HTML templates at startup  
- **File Type Detection**: Cache mime type results
- **No Content Caching**: Files always read fresh for accuracy

### Resource Management
- **Connection Pooling**: Single HTTP server handles all requests
- **Memory Usage**: Stream large files instead of loading into memory
- **Cleanup Frequency**: Purge temp files every 30 minutes

## Implementation Dependencies

### Required NPM Packages
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "shiki": "^1.24.0",
    "diff2html": "^3.4.52",
    "marked": "^14.2.0",
    "mime-types": "^2.1.35",
    "express": "^5.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.18.0",
    "typescript": "^5.8.0"
  }
}
```

### System Requirements
- Node.js 22.18+ LTS (or Node.js 24.x Current)
- Git CLI available in PATH
- System browser capable of opening URLs
- File system read permissions for workspace

## Integration Points

### Claude Code Integration
The server expects Claude to pass:
1. **Working Directory Context**: Server runs from project root
2. **Relative File Paths**: All paths relative to workspace root  
3. **Git Repository Context**: Server assumes git repo exists

### Browser Integration
- Uses system `open` command (macOS), `start` (Windows), `xdg-open` (Linux)
- Generates unique URLs per request to avoid caching issues
- Auto-cleanup prevents accumulation of temporary HTML files

### Error Reporting
All tools return structured responses:
```typescript
{
  "success": boolean,
  "message": string,
  "url"?: string,        // For successful file displays
  "stats"?: DiffStats    // For git diff operations
}
```