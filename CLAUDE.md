# Claude.ai Development Guide

This file contains important conventions and rules for working with this codebase.

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite + Mantine UI
- **Backend**: Convex (serverless backend)
- **Testing**: Vitest + convex-test
- **Styling**: Mantine UI (dark mode default) + PostCSS

## Key Commands

- `npm run dev` - Start development (frontend + backend)
- `npm test` - Run all tests
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - ESLint + TypeScript linting

## File Naming & Structure

### Component Files

- **PascalCase** for React components: `MyEntriesPage.tsx`, `StatusBadge.tsx`
- **Default exports** for page components
- **Named exports** for reusable components

### Backend Files (Convex)

- `mutations.ts` / `queries.ts` for API endpoints
- `lib.ts` for shared utilities
- `schema.ts` for database schema

### Test Files

- Same name as implementation + `.test.ts`
- Comprehensive test coverage required

## Code Patterns

### Backend (Convex) Patterns

#### Authentication Wrappers

```typescript
// Always use userMutation/userQuery for authenticated endpoints
export const updateMyEntry = userMutation({
  args: { houseAddress: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // ctx.userId automatically available
    const entry = await getUserEntry(ctx, ctx.userId);
  },
});
```

#### Schema with Union Types

```typescript
// Use union types for entities with different states
export const entrySchema = v.union(
  v.object({ status: v.literal("draft") /* draft fields */ }),
  v.object({ status: v.literal("submitted") /* submitted fields */ }),
  // ...
);
```

### Frontend Patterns

#### Status-based Rendering

```typescript
// Handle all possible states with exhaustive checking
{iife(() => {
  if (isLoading) return <Loader />;
  if (!myEntry) return <NoEntryState />;
  if (myEntry.status === "draft") return <DraftEntryState entry={myEntry} />;
  if (myEntry.status === "submitted") return <SubmittedEntryState entry={myEntry} />;
  exhaustiveCheck(myEntry); // Ensures all cases handled
})}
```

#### Component Structure

```typescript
interface ComponentProps {
  status: Doc<"entries">["status"];
}

export default function Component({ status }: ComponentProps) {
  // Switch statements for status handling preferred
}
```

## Testing Requirements

### Backend Testing

- Use `createConvexTestWithUser()` for authenticated tests
- Use `moveEntryToStatus()` helper instead of direct db.patch for status changes
- Test all error conditions and edge cases

### Test Structure

```typescript
describe("functionName", () => {
  let t: AuthenticatedConvexTest;
  let user: Doc<"users">;

  beforeEach(async () => {
    const obj = await createConvexTestWithUser();
    t = obj.t;
    user = obj.user;
  });

  const exec = (overrides = {}) =>
    t.mutation(api.path.to.function, { ...overrides });

  it("should do something", async () => {
    await exec();
    // assertions
  });
});
```

## Important Utilities

### Helper Functions Location

- `convex/tests/testingHelpers.ts` - All testing utilities
- `shared/ensure.ts` - Null checking utilities
- `shared/validation.ts` - Shared validation logic

### Key Test Helpers

- `moveEntryToStatus(t, { entryId, status })` - Properly move entries between statuses
- `createTestEntry(t, overrides)` - Create test entries
- `getTheOnlyTestEntry(t)` - Get single test entry

## Rules to Follow

### Backend Development

1. **Always use userMutation/userQuery** for authenticated endpoints
2. **Validate all inputs** with Convex validators (v.object, v.string, etc.)
3. **Use union types** for entities with different states
4. **Throw descriptive errors** with entity IDs
5. **Use helper functions** like `getUserEntry()`, `getEntry()` consistently

### Frontend Development

1. **Use Mantine components** consistently (Stack, Container, Title, etc.)
2. **Handle all loading states** for async operations
3. **Implement exhaustive checking** for union types
4. **Use absolute imports** when available
5. **Provide proper TypeScript types** for all props

### Testing Rules

1. **Write tests for all mutations** and complex queries
2. **Use test helpers** instead of manual setup
3. **Test error conditions** not just happy paths
4. **Never directly patch status changes** - use `moveEntryToStatus()` helper
5. **Ensure all tests are independent** and can run in any order

## Schema Important Notes

- Entry status uses union types with different required fields per status
- "submitted" entries require `submittedAt` and structured `houseAddress` object
- "approved" entries need `entryNumber`, `approvedAt`, etc.
- Always use proper helpers when testing status transitions

## Common Mistakes to Avoid

1. **Don't patch entry status directly** in tests - use `moveEntryToStatus()`
2. **Don't forget loading states** in UI components
3. **Don't skip error handling** in mutations
4. **Don't use relative imports** where absolute imports are available
5. **Don't create new files unnecessarily** - prefer editing existing ones
