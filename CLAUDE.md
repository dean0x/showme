# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Engineering Principles

**IMPORTANT**: Follow these principles strictly when implementing features:

1. **Always use Result types** - Never throw errors in business logic
2. **Inject dependencies** - Makes testing trivial
3. **Compose with pipes** - Readable, maintainable chains
4. **Immutable by default** - No mutations, return new objects
5. **Type everything** - No any types, explicit returns
6. **Test behaviors, not implementation** - Focus on integration tests
7. **Resource cleanup** - Always use try/finally or "using" pattern
8. **Structured logging** - JSON logs with context
9. **Validate at boundaries** - Parse, don't validate (Zod schemas)
10. **Performance matters** - Measure, benchmark, optimize

### Code Example (Good)
```typescript
// Result type instead of throwing
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// Dependency injection
class FooManager {
  constructor(
    private readonly process: Process,
    private readonly resource: Resource,
    private readonly logger: Logger
  ) {}
}

// Composable functions with pipes
const processFoo = pipe(
  validateInput,
  checkResources,
  spawnFoo,
  captureOutput,
  handleResult
);

// Immutable updates
const updateBar = (bar: Bar, update: Partial<Bar>): Bar => ({
  ...bar,
  ...update,
  updatedAt: Date.now()
});
```

## Important Considerations

1. **Dedicated Server Focus**: Claudine is designed for dedicated servers with ample resources, not constrained cloud environments
2. **Autoscaling by Default**: No configuration needed - automatically uses all available system resources
3. **Resource Management**: Maintains 20% CPU headroom and 1GB RAM reserve for system stability
4. **Error Handling**: Use Result types, never throw in business logic
5. **Queue Persistence**: ✅ **IMPLEMENTED** - SQLite-based persistent task queue with recovery
6. **Security**: Validate all task inputs at boundaries using Zod
7. **Logging**: Structured JSON logging with context
8. **No Worker Limits**: Unlike traditional approaches, we spawn as many workers as the system can handle
9. **Testing**: Focus on integration tests that verify behaviors
10. **Performance**: Measure and optimize critical paths

## Important Guidelines

When working on this codebase:

1. **NO FAKE SOLUTIONS** - Never hardcode responses or data to simulate working
functionality
2. **BE TRANSPARENT** - Always explain when something is a workaround, mock, or temporary
fix
3. **FAIL HONESTLY** - If something can't work, say so clearly instead of hiding it
4. **LABEL EVERYTHING** - Use clear comments: HACK:, MOCK:, TEMPORARY:, NOT-PRODUCTION:
5. **PRODUCTION ONLY** - Unless specifically asked for mocks/demos, only implement real
solutions

When encountering limitations:
- State the blocker clearly
- Provide real alternatives
- Don't paper over problems with fake data

Preferred response format:
- "❌ This won't work because [reason]"
- "⚠️ I could work around it by [approach], but this isn't production-ready"
- "✅ Here's a real solution: [approach]"