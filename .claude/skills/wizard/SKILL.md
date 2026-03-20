# /wizard - 8-Phase Development Methodology

> Transform Claude Code from a fast coder into a methodical software architect.

## Overview

This skill enforces senior engineering habits through a structured 8-phase process. It prevents common AI coding problems:
- Hallucinated method chains
- Missing null checks
- Race conditions
- Hard-coded values
- Weak assertions
- Forgotten edge cases

---

## Phase 1: Plan Before You Touch Anything

**Goal**: Build a structured todo list before writing any code.

### Actions
1. Read `CLAUDE.md` for project conventions
2. Find and read the linked GitHub issue (or help create one)
3. Assess complexity:
   - **Simple**: 1-3 files, no architectural impact
   - **Medium**: 4-6 files, localized changes
   - **Complex**: 7+ files, architectural impact, concurrency concerns
4. Build a todo list with specific, actionable items
5. Identify all files that will likely need changes

### Output
- Complexity assessment
- Detailed todo list
- Estimated file changes

---

## Phase 2: Explore Before You Assume

**Goal**: Verify everything exists before referencing it.

### Actions
1. Grep for every model, method, relationship, and constant you intend to use
2. Verify they exist AND work the way you assume
3. Check method signatures, not just names
4. Verify relationship chains (no `user.clientProfile.accounts` hallucinations)
5. Check database column names against schema

### Key Questions
- Does this method exist?
- Does it take the parameters I'm passing?
- Is the return type what I expect?
- Was this renamed recently?

### Output
- Verification log of all referenced code
- List of any assumptions that need clarification

---

## Phase 3: Write the Tests First (TDD)

**Goal**: Failing tests that catch real bugs.

### Actions
1. Write failing tests FIRST
2. Run tests to confirm they FAIL (not pass, not error)
3. Use **mutation testing mindset**:
   - NOT: `assert(result)`
   - YES: `assertEquals('completed', result.status)`
4. Check ALL side effects:
   - Timestamps set correctly
   - Notifications sent
   - Counters incremented
   - Status transitions valid
5. Test edge cases: null, empty, negative, concurrent

### Anti-Patterns to Avoid
- `assert(true)` - passes even if code does nothing
- Testing only happy path
- Mocking everything so test can't fail
- Skipping error case tests

### Output
- All tests written and confirmed failing
- Test coverage plan

---

## Phase 4: Implement the Minimum

**Goal**: Write only what's needed to pass tests.

### Actions
1. Implement the minimum code to make tests pass
2. NOT the full vision
3. NOT the clever abstraction
4. NOT the "nice to have" features
5. Scope creep is a bug

### Principles
- YAGNI (You Aren't Gonna Need It)
- Simple > Clever
- Working > Perfect

### Output
- Implementation complete
- All Phase 3 tests passing

---

## Phase 5: Verify Nothing Regressed

**Goal**: Zero regressions in existing functionality.

### Actions
1. Run the BROADER test suite, not just new tests
2. Fix any regressions immediately
3. If unrelated tests fail, investigate why
4. Document any test updates needed

### Output
- Full test suite passing
- Regression report (even if empty)

---

## Phase 6: Document While Context is Fresh

**Goal**: Future-you (or teammate) can understand this code.

### Actions
1. Add inline comments for non-obvious decisions
2. Update changelog if applicable
3. Update API documentation
4. Add/update type annotations
5. Update README if behavior changed

### Comment Guidelines
- Explain WHY, not WHAT
- Reference issue numbers
- Note any gotchas or edge cases

### Output
- Documentation updated
- Changelog entry

---

## Phase 7: The Adversarial Review

**Goal**: Review as an attacker, not the author.

### Checklist
- [ ] What happens if this runs twice concurrently?
- [ ] What if input is null? Empty? Negative?
- [ ] What if the network fails?
- [ ] What if the database is slow?
- [ ] What assumptions am I making that could be wrong?
- [ ] Would I be embarrassed if this broke in production?
- [ ] Are there any hard-coded values that should be constants?
- [ ] Are all nullable fields handled?
- [ ] Are all status transitions valid?
- [ ] Is there proper database locking where needed?

### Common Bugs Caught
- Race conditions (missing `lockForUpdate()`)
- Nullable datetime crashes (`->format()` on null)
- Hard-coded strings instead of enums
- Missing transaction handling
- Unvalidated input

### Output
- Self-review checklist completed
- All issues fixed

---

## Phase 8: The Quality Gate Cycle

**Goal**: Clean PR ready for human review.

### Actions
1. Open the PR
2. Monitor automated review bot status
3. Read EVERY finding
4. Fix valid issues
5. Reply to false positives with explanation
6. Repeat until status is clean
7. Ensure CI passes

### Bot Interaction
- Don't dismiss findings without explanation
- Fix the root cause, not just the warning
- Document any intentional decisions

### Output
- PR with clean automated review
- CI passing
- Ready for human review

---

## Summary

| Phase | Goal | Key Output |
|-------|------|------------|
| 1. Plan | Understand before coding | Todo list, complexity assessment |
| 2. Explore | Verify before assuming | Verification log |
| 3. TDD | Test first, test well | Failing tests |
| 4. Implement | Minimum viable code | Tests passing |
| 5. Verify | No regressions | Full suite passing |
| 6. Document | Future comprehension | Updated docs |
| 7. Review | Attack your own code | Issues fixed |
| 8. Ship | Clean PR | Ready for review |

---

## Usage

Type `/wizard` in Claude Code to activate this methodology for any task.

Works best with:
- A `CLAUDE.md` defining project conventions
- A GitHub issue describing what to build
- A clean feature branch per task
- Commitment to TDD
- CI/CD with automated review

---

*Based on [vlad-ko/claude-wizard](https://github.com/vlad-ko/claude-wizard)*
