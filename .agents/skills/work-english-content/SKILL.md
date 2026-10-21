---
name: work-english-content
description: Create, revise, and quality-check one lesson in the work English library so the source, work task, core expressions, exercises, and transfer practice teach one coherent skill.
---

# Work English lesson production

Use this skill when creating or revising a lesson in `src/content/work-english/NNN/`.

Read `docs/work-english/内容质量验收表.md` before drafting. Use lesson 001 as the learner-experience reference: a first-time learner should understand what to do at each step and leave able to use a specific expression at work. Keep the topic and company material authentic to the source; do not copy lesson 001's subject into unrelated lessons.

## Build one coherent lesson

Start from a concrete work situation and one useful English outcome. Select a source passage that can illuminate that outcome. Keep the complete original text readable, with a clear indication of the passage most relevant to the lesson. Check the source cache and translation paragraph by paragraph.

Write the opening task and a complete reference response before building the modules. The response must directly answer the prompt. Then select three core work expressions that serve different purposes in the same situation. Each expression's label, Chinese meaning, collocation, example, and translation must agree. Practice the expressions in the lesson's exercises; move source vocabulary that does not help with the work task into optional study or remove it.

Keep the learner path clear: try the task first, read the source, notice useful language, study a small set of core words and structures, practise, apply the language in a new but related situation, then review. Each exercise must test something taught in this lesson and give a useful correction cue. The transfer prompt must require a new response, not a copied opening answer.

Remove repeated teaching points, generic examples, filler explanations, and text that describes how the lesson was produced. Do not show internal review status, editorial notes, AI-process commentary, or legal copy that the learner does not need. Do not alter existing audio unless the task explicitly includes audio work.

## Verify before finishing

Build the page with `node tools/work-english-build-lesson.mjs src/content/work-english/NNN/lesson.json`, then run `node tools/work-english-validate-lesson.mjs src/content/work-english/NNN/lesson.json`. Fix every failure. Read the rendered page as a first-time learner and complete the exercises against their answer keys; a passing schema check alone does not establish teaching quality.

Use the quality table to score the lesson before changing its editorial status. Do not mark a lesson approved when a required review item is incomplete. Keep review metadata out of the learner-facing page.
