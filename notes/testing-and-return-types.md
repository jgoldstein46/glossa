# Testing Best Practices & Return Type Conventions

> Temporary reference document for the Glossa codebase.

---

## Testing Best Practices

### Structure

- **Co-locate tests** next to source: `lib/services/__tests__/moduleGeneration.test.ts` tests `lib/services/moduleGeneration.ts`
- One test file per module. Name it `<module>.test.ts`.
- Group related tests with `describe()` blocks matching the exported function name.

### Mocking Strategy

- **Always mock external services** — OpenAI, Supabase, ElevenLabs should never make real network calls in tests.
- Use `vi.mock()` at the top of the file for module-level mocks.
- Use `vi.clearAllMocks()` in `beforeEach` to prevent test pollution.
- Use dynamic `import()` inside tests when the module under test has side effects or you need fresh instances per test.

### Supabase Mock Pattern

Supabase's chainable query builder (`.from().insert().select().single()`) requires a proxy-based mock to handle arbitrary chaining:

```typescript
function chainable(finalResult: { data?: unknown; error?: unknown }) {
  const handler = () =>
    new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve) => resolve(finalResult);
        }
        return handler;
      },
    });
  return handler();
}
```

This makes the mock thenable (so `await` resolves to the final result) while allowing any chain of `.eq()`, `.select()`, `.single()`, etc.

Route different tables/operations by intercepting `.from(tableName)` and returning operation-specific results.

### What to Test

1. **Happy path** — Correct data shape returned on success
2. **External service failure** — OpenAI down, DB errors, TTS failures
3. **Error propagation** — Early failures prevent downstream calls (e.g., DB failure → no OpenAI call)
4. **Graceful degradation** — Audio failure shouldn't block module creation
5. **Call ordering** — Track call order with an array to verify the pipeline sequence

### Test Quality

- Assert on `result.success` first, then narrow the type before checking fields.
- Avoid testing implementation details (internal variable names, exact log messages).
- Test the contract: inputs → outputs + side effects (what was called, in what order).

---

## Return Type Conventions

### The Problem We Fixed

The original code had inconsistent return types across helper functions:

- Some returned `undefined` on success, an error object on failure
- Some returned nothing at all on success
- Callers checked `if (error)` on some, `if (!result.success)` on others
- This led to bugs: missing `await`, unchecked returns, undefined variable references

### The `ServiceResult<T>` Pattern

All internal helper functions now use a discriminated union:

```typescript
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: string };
```

**Rules:**

1. **Every helper returns `ServiceResult<T>`** — no implicit `undefined` returns
2. **Void operations return `ServiceResult<void>`** with `{ success: true, data: undefined }`
3. **Callers always check `if (!result.success)`** before accessing `.data`
4. **TypeScript narrows the type** — after the check, `result.data` is typed as `T`

### Layered Return Types

The codebase has two layers of return types:

| Layer | Type | Shape |
|-------|------|-------|
| Internal helpers | `ServiceResult<T>` | `{ success, data }` or `{ success, error, details? }` |
| Exported functions | `ModuleGenerationResult` | `{ success, module, sections, quizzes }` or `{ success, error, details? }` |
| API routes | JSON response | `{ success, data }` or `{ success, error, details? }` |

The internal `ServiceResult` uses a generic `data` wrapper. The exported result types use named fields for better ergonomics at the API boundary. Both share the `success` discriminant.

### Why This Matters

- **No silent failures** — Every code path explicitly returns success or error
- **Type safety** — TypeScript enforces that callers handle both cases
- **Consistent error shape** — `{ error: string, details?: string }` everywhere
- **Easy to extend** — Add new helpers following the same pattern without inventing new conventions
