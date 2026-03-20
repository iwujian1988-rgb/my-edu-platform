# /wizard Quick Reference Checklists

## Phase 1: Plan Checklist

- [ ] Read CLAUDE.md for project conventions
- [ ] Found/created GitHub issue
- [ ] Assessed complexity (Simple/Medium/Complex)
- [ ] Created detailed todo list
- [ ] Identified likely file changes
- [ ] No code written yet

## Phase 2: Explore Checklist

- [ ] Grepped for all models to be used
- [ ] Verified all methods exist
- [ ] Checked method signatures match expectations
- [ ] Verified relationship chains exist
- [ ] Confirmed database column names
- [ ] No hallucinated method chains

## Phase 3: TDD Checklist

- [ ] Tests written BEFORE implementation
- [ ] Tests confirmed FAILING (run them!)
- [ ] Assertions are specific (not `assert(true)`)
- [ ] All side effects tested
- [ ] Edge cases covered:
  - [ ] Null input
  - [ ] Empty input
  - [ ] Negative numbers
  - [ ] Concurrent access
  - [ ] Network failures

## Phase 4: Implement Checklist

- [ ] Only minimum code to pass tests
- [ ] No scope creep
- [ ] No clever abstractions (yet)
- [ ] No "nice to have" features
- [ ] All Phase 3 tests now pass

## Phase 5: Verify Checklist

- [ ] Broader test suite run (not just new tests)
- [ ] Zero regressions
- [ ] Any failures investigated and fixed
- [ ] Test updates documented

## Phase 6: Document Checklist

- [ ] Inline comments added for non-obvious code
- [ ] Changelog updated (if applicable)
- [ ] API docs updated (if applicable)
- [ ] Type annotations complete
- [ ] README updated (if behavior changed)

## Phase 7: Adversarial Review Checklist

### Concurrency
- [ ] What if this runs twice at once?
- [ ] Is database locking needed?
- [ ] Are there race conditions?

### Input Validation
- [ ] What if input is null?
- [ ] What if input is empty?
- [ ] What if input is negative?
- [ ] What if input is malformed?

### Error Handling
- [ ] What if network fails?
- [ ] What if database is slow/down?
- [ ] Are errors handled gracefully?

### Code Quality
- [ ] Any hard-coded values that should be constants?
- [ ] Are nullable fields handled with null checks?
- [ ] Are status transitions validated?
- [ ] Would I be embarrassed if this broke in production?

## Phase 8: Ship Checklist

- [ ] PR created
- [ ] Automated review bot findings addressed
- [ ] All valid issues fixed
- [ ] False positives explained
- [ ] CI passing
- [ ] Ready for human review

---

## Common Bug Patterns to Check

### Race Conditions
```typescript
// BAD: No locking
const user = await db.users.find(id)
user.balance += amount
await db.users.update(user)

// GOOD: With locking
const user = await db.users.find(id).forUpdate()
user.balance += amount
await db.users.update(user)
```

### Nullable Fields
```typescript
// BAD: Crashes on null
user.createdAt.format('YYYY-MM-DD')

// GOOD: Handle null
user.createdAt?.format('YYYY-MM-DD')
```

### Hard-coded Values
```typescript
// BAD
if (status === 'completed') { }

// GOOD
if (status === Status.COMPLETED) { }
```

### Weak Assertions
```typescript
// BAD: Passes even if broken
assert(result !== null)

// GOOD: Verifies actual value
assertEqual('completed', result.status)
assertEqual(100, result.amount)
```

---

## Quick Complexity Assessment

| Criteria | Simple | Medium | Complex |
|----------|--------|--------|---------|
| Files changed | 1-3 | 4-6 | 7+ |
| Architectural impact | No | Localized | Yes |
| Concurrency concerns | No | Maybe | Yes |
| External dependencies | No | Maybe | Yes |
| Test complexity | Unit only | Integration | E2E |
