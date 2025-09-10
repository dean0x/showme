#!/usr/bin/env node

/**
 * ShowMe CLI - Test interface for ShowMe MCP functionality
 * Usage: showme file <path> [--line <number>]
 *        showme diff [--base <ref>] [--target <ref>] [--files <files...>]
 */

import { ShowFileHandler } from "./handlers/show-file-handler.js";
import { ShowDiffHandler } from "./handlers/show-diff-handler.js";
import { ConsoleLogger } from "./utils/logger.js";

interface CliArgs {
  command?: string;
  path?: string;
  line?: number;
  base?: string;
  target?: string;
  files?: string[];
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--line' || arg === '-l') {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        parsed.line = parseInt(next, 10);
        i++;
      }
    } else if (arg === '--base' || arg === '-b') {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        parsed.base = next;
        i++;
      }
    } else if (arg === '--target' || arg === '-t') {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        parsed.target = next;
        i++;
      }
    } else if (arg === '--files' || arg === '-f') {
      parsed.files = [];
      i++;
      while (i < args.length && !args[i].startsWith('-')) {
        parsed.files.push(args[i]);
        i++;
      }
      i--; // Adjust for outer loop increment
    } else if (!arg.startsWith('-')) {
      if (!parsed.command) {
        parsed.command = arg;
      } else if (!parsed.path && parsed.command === 'file') {
        parsed.path = arg;
      }
    }
  }
  
  return parsed;
}

function showHelp(): void {
  console.log(`
ShowMe CLI - Test interface for VS Code integration

Usage:
  showme file <path> [options]     Open file in VS Code
  showme diff [options]            Open git diff in VS Code

File command:
  showme file src/index.ts         Open file in VS Code
  showme file src/index.ts -l 42   Open file and jump to line 42

  Options:
    -l, --line <number>            Line number to highlight and jump to

Diff command:
  showme diff                      Show working directory changes
  showme diff -b main              Show diff from main branch
  showme diff -b HEAD~1 -t HEAD    Show diff between commits
  showme diff -f src/index.ts      Show diff for specific files

  Options:
    -b, --base <ref>               Base commit, branch, or tag
    -t, --target <ref>             Target commit, branch, or working directory
    -f, --files <files...>         Specific files to include in diff

Global options:
  -h, --help                       Show this help message

Environment variables:
  SHOWME_EDITOR                    Editor command (default: code)

Examples:
  showme file README.md
  showme file src/main.ts --line 100
  showme diff
  showme diff --base main --target feature-branch
  showme diff --files src/utils.ts src/main.ts
`);
}

async function handleFileCommand(args: CliArgs, logger: ConsoleLogger): Promise<void> {
  if (!args.path) {
    console.error('Error: File path is required');
    console.error('Usage: showme file <path> [--line <number>]');
    process.exit(1);
  }

  const handler = ShowFileHandler.create(logger);
  const result = await handler.handleFileRequest({
    path: args.path,
    line_highlight: args.line
  });

  console.log(result.content[0].text);
}

async function handleDiffCommand(args: CliArgs, logger: ConsoleLogger): Promise<void> {
  const handler = ShowDiffHandler.create(logger);
  const result = await handler.handleDiffRequest({
    base: args.base,
    target: args.target,
    files: args.files
  });

  console.log(result.content[0].text);
}

async function main(): Promise<void> {
  const args = parseArgs();
  const logger = new ConsoleLogger();

  if (args.help || !args.command) {
    showHelp();
    process.exit(0);
  }

  try {
    switch (args.command) {
      case 'file':
        await handleFileCommand(args, logger);
        break;
      
      case 'diff':
        await handleDiffCommand(args, logger);
        break;
      
      default:
        console.error(`Error: Unknown command '${args.command}'`);
        console.error("Use 'showme --help' for usage information");
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}