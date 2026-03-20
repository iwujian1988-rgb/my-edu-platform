# /wizard Patterns and Anti-Patterns

## Core Patterns

### 1. Verification Before Implementation

**Pattern**: Always verify code exists before using it.
**Why**: AI commonly hallucinates method chains and relationships.

```typescript
// BEFORE implementing, grep for:
// - Model existence
// - Method signatures
// - Relationship chains
// - Column names in schema
```

### 2. Mutation-Resistant Testing

**Pattern**: Write assertions that would fail if the code were broken.
**Why**: `assert(true)` passes even when nothing works.

```typescript
// ANTI-PATTERN
assert(result !== null)  // Passes even if result is wrong

// PATTERN
assertEqual('completed', result.status)
assertEqual(150, result.totalAmount)
assertEqual(2, result.items.length)
```

### 3. Adversarial Self-Review

**Pattern**: Review your code as if you were trying to break it.
**Why**: Authors are blind to their own assumptions.

**Questions to ask**:
- How would I crash this?
- What input would break this?
- What if everything is slow/null/empty?

### 4. Minimum Viable Implementation

**Pattern**: Write only what's needed to pass tests.
**Why**: Scope creep looks like progress but is actually debt.

```typescript
// ANTI-PATTERN: Building for the future
class UserValidator {
  validateEmail(email: string) { /* ... */ }
  validatePhone(phone: string) { /* not needed yet */ }
  validateAddress(address: string) { /* not needed yet */ }
}

// PATTERN: Only what's needed
class UserValidator {
  validateEmail(email: string) { /* ... */ }
}
```

---

## Anti-Patterns

### 1. Hallucinated Method Chains

```typescript
// ANTI-PATTERN
// AI assumes this chain exists without verifying
const accounts = user.clientProfile.accounts.active()

// PATTERN
// Verify in Phase 2 that:
// 1. User has clientProfile relationship
// 2. ClientProfile has accounts relationship
// 3. Accounts has active() scope
```

### 2. Assumption Blindness

```typescript
// ANTI-PATTERN
// Assumes timestamp is never null
const formatted = createdAt.format('YYYY-MM-DD')

// PATTERN
// Ask: What if it's null?
const formatted = createdAt?.format('YYYY-MM-DD') ?? 'N/A'
```

### 3. Race Condition Ignorance

```typescript
// ANTI-PATTERN
async function transferFunds(from: number, to: number, amount: number) {
  const sender = await getBalance(from)
  const receiver = await getBalance(to)
  // Two concurrent calls could both read same balance
  await updateBalance(from, sender - amount)
  await updateBalance(to, receiver + amount)
}

// PATTERN
async function transferFunds(from: number, to: number, amount: number) {
  // Use database transaction with locking
  await db.transaction(async (trx) => {
    const sender = await trx.select('balance').from('accounts')
      .where('id', from).forUpdate().first()
    const receiver = await trx.select('balance').from('accounts')
      .where('id', to).forUpdate().first()
    // ... rest of logic
  })
}
```

### 4. Hard-Coded Magic Values

```typescript
// ANTI-PATTERN
if (order.status === 'completed') { }

// PATTERN
// Define in types/constants
enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
if (order.status === OrderStatus.COMPLETED) { }
```

### 5. Test That Can't Fail

```typescript
// ANTI-PATTERN
describe('processOrder', () => {
  it('works', async () => {
    const result = await processOrder(mockOrder)
    expect(result).toBeDefined()  // Too weak!
  })
})

// PATTERN
describe('processOrder', () => {
  it('returns completed status and sets processedAt', async () => {
    const result = await processOrder(mockOrder)
    expect(result.status).toBe('completed')
    expect(result.processedAt).toBeInstanceOf(Date)
    expect(result.total).toBe(mockOrder.items.reduce(sum, 0))
  })

  it('sends notification to customer', async () => {
    await processOrder(mockOrder)
    expect(notificationService.send).toHaveBeenCalledWith(
      mockOrder.customerId,
      expect.stringContaining('order completed')
    )
  })
})
```

### 6. Forgotten Edge Cases

```typescript
// ANTI-PATTERN: Only happy path
function calculateDiscount(price: number) {
  return price * 0.9
}

// PATTERN: Handle edge cases
function calculateDiscount(price: number): number {
  if (price === null || price === undefined) {
    throw new Error('Price is required')
  }
  if (price < 0) {
    throw new Error('Price cannot be negative')
  }
  if (price === 0) {
    return 0
  }
  return price * 0.9
}
```

---

## Code Review Patterns

### The "What If" Questions

Before committing, ask:

1. **Concurrency**: What if two users do this simultaneously?
2. **Scale**: What if there are 10,000 items instead of 10?
3. **Failure**: What if the database/network/external API fails?
4. **Security**: What if someone tries to abuse this?
5. **Null**: What if every field is null?

### The Embarrassment Test

> "Would I be embarrassed if this broke in production?"

If yes, fix it now, not later.

---

## Process Patterns

### The Phase Order Matters

```
Plan → Explore → TDD → Implement → Verify → Document → Review → Ship
```

Skipping phases creates bugs:
- Skip Plan → Wrong direction
- Skip Explore → Hallucinated code
- Skip TDD → Untested assumptions
- Skip Implement → Over-engineered
- Skip Verify → Regressions
- Skip Document → Future confusion
- Skip Review → Production bugs
- Skip Ship → Work never lands

### The One Phase at a Time Rule

Complete each phase before starting the next:
- Don't implement while exploring
- Don't document while implementing
- Don't ship while reviewing

---

## Quick Reference

| Anti-Pattern | Pattern |
|-------------|---------|
| Hallucinated chains | Verify before use |
| `assert(true)` | Specific assertions |
| No locking | Transactions + locks |
| Hard-coded values | Constants/enums |
| Happy path only | Edge case tests |
| Skip phases | Complete all 8 |
