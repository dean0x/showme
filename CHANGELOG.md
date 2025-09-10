# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-10

### Added
- Initial release of ShowMe MCP Server
- Direct VS Code integration for opening files and diffs
- Multi-file support - open multiple files as tabs in a single command
- Git diff visualization with side-by-side comparison for single files
- Line number navigation for jumping to specific lines
- Support for multiple editors (VS Code, Cursor, VSCodium)
- CLI tool for testing functionality
- MCP tools: `showme.file` and `showme.diff`
- Clean architecture with Result types and dependency injection
- Comprehensive error handling with structured logging

### Features
- Open single or multiple files directly in VS Code
- View git diffs with rich visualization
- Jump to specific line numbers in files
- Compare branches, commits, or working directory changes
- Automatic editor detection (VS Code, Cursor, VSCodium)

### Technical
- Built with TypeScript and ES modules
- Follows Model Context Protocol (MCP) specification
- Minimal dependencies for fast performance
- Resource cleanup with proper lifecycle management
- Full type safety with no `any` types