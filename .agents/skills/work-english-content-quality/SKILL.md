---
name: work-english-content-quality
description: Create or revise lessons in the Work English library. Use when designing source-based workplace English lessons, aligning lesson modules, improving exercises, or reviewing lesson quality.
---

# Work English lesson quality

Use lesson 001 as the product and teaching reference. Match its clarity and usefulness, not its exact topic or wording. A learner should see why the source matters, know what to practice, and leave with an expression they can use at work.

## Build one connected lesson

- Start from a verified company source and one concrete workplace communication task. Keep original material, source translation, and newly written practice scenarios clearly distinct.
- Set one observable outcome. A first-time learner should understand the situation, what they need to say, and what a successful response includes before revealing the sample.
- Make the first attempt, reference answer, core expressions, grammar focus, cloze, translation, choice question, audio exercise, and final transfer reinforce that outcome. The final transfer must use a new but related workplace situation, not repeat the opening prompt or answer.
- Teach a small set of useful expressions first. Prefer language that helps complete the task; put source-only vocabulary in optional reading when it does not help the learner speak or write for this task.
- Pair every translation prompt with its exact core-expression answer. Use natural English and Chinese that match in meaning. Keep examples and explanations specific to the lesson.
- Do a semantic spine check, not only a field/count check: the opening prompt and sample, three core work expressions, cloze and translation items, choice question, and final transfer must teach the same observable skill. The final transfer may change the workplace situation, but it must still use the core expressions or a clear, useful variation of them. If a module changes the task or the speaker’s role, update the prompt and answer together.
- Compare the learner’s first attempt directly with the sample: the sample must answer the actual prompt, and the learner should be able to see what to improve. Do not leave a complete-looking phrase list or exercise set that belongs to a neighboring lesson.
- Before approving a multi-part task, turn its prompt into a short checklist of required facts or actions (for example: decision + reason + owner + deadline). Check every model answer against that list. A fluent answer that omits a requested part, changes the speaker’s role, answers a neighboring scenario, or introduces unsupported facts is a mismatch and must be rewritten.
- Read each answer beside its own prompt, not only beside the lesson topic. Specifically compare `firstAttempt.prompt` with `firstAttempt.sample` and `rewrite.good`; then compare `output.prompt` with `output.sample` and `output.check`. Confirm that the first model makes the requested response visible and that the final model covers every requested element in the new scenario.
- In the rewrite section, demonstrate the same work task the learner just attempted. If the lesson needs a second example, keep the same communication goal and change only the details; do not replace it with a generic example from another work situation.
- Give every listening or dictation item a clear learning purpose connected to the lesson. The recorded audio and displayed answer must match exactly. Do not silently alter or replace audio assets; if an audio mismatch cannot be resolved within the authorized scope, record the limitation and keep the issue open.
- If a listening clip practices an adjacent situation rather than the lesson's exact task, add one short “听后试说” prompt after it. The prompt must make the learner reuse a target expression in this lesson's task, with a concise, collapsible reference answer. Do not use an editor-facing explanation as a substitute for learner practice.
- Preserve factual accuracy for named companies and dated events. Do not invent historical figures, reasons, policies, or quotations; separate fictional role-play details from source facts.
- Mark a fictional practice scenario clearly in its heading; do not repeat a generic disclaimer below it.

## Write for learners

- Use plain, direct Chinese. Explain a phrase only when the explanation helps the learner understand, remember, or use it.
- Avoid repeating the lesson's goal, narrating the teaching design, filler vocabulary, unrelated examples, AI-style self-commentary, legal boilerplate, and internal workflow notes.
- Prefer a short contrast or a corrected example over a paragraph that describes an abstract rule.
- Make controls and instructions obvious: learners should know what to listen to, what to type, how to check an answer, and what to do next.

## Review and verify

Inspect the full rendered lesson, not just its JSON. Check the reading-to-practice sequence, exact answer correspondence, vocabulary usefulness, source fidelity, audio/text match, mobile layout, and learner-facing copy. Run the lesson validator and browser regression for the affected lessons; run the full-library checks for library-wide changes. Do not mark a lesson complete or publish the library while a known learner-facing defect remains.
