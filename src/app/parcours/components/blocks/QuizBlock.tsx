'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Block, Question } from '@/data/parcours-mock'

interface AnswerState {
  selected: string | null
  multiSelected: string[]
  blankAnswer: string
}

function emptyAnswer(): AnswerState {
  return { selected: null, multiSelected: [], blankAnswer: '' }
}

function normalize(text: string): string {
  return String(text || '').trim().toLowerCase()
}

function hasAnswer(question: Question | undefined, ans: AnswerState | undefined): boolean {
  if (!question || !ans) return false
  if (question.type === 'single-choice') return !!ans.selected
  if (question.type === 'multiple-choice') return ans.multiSelected.length > 0
  if (question.type === 'fill-blank') return ans.blankAnswer.trim().length > 0
  return false
}

function isQuestionCorrect(
  question: Question | undefined,
  ans: AnswerState | undefined,
  submitted: boolean,
): boolean {
  if (!submitted || !question || !ans) return false
  if (question.type === 'single-choice') return ans.selected === question.answer
  if (question.type === 'multiple-choice') {
    const selected = [...(ans.multiSelected || [])].sort()
    const answer = [...(Array.isArray(question.answer) ? question.answer : [])].sort()
    return (
      selected.length === answer.length &&
      selected.every((value, i) => value === answer[i])
    )
  }
  if (question.type === 'fill-blank') {
    return normalize(ans.blankAnswer) === normalize(String(question.answer))
  }
  return false
}

function optionClass(
  question: Question,
  ans: AnswerState | undefined,
  option: string,
  submitted: boolean,
): string {
  if (!submitted) {
    return ans?.selected === option
      ? 'border-primary-300 bg-primary-50'
      : 'border-gray-200 hover:border-gray-300'
  }
  if (option === question.answer) return 'border-green-300 bg-green-50'
  if (ans?.selected === option) return 'border-red-300 bg-red-50'
  return 'border-gray-200'
}

function multiOptionClass(
  question: Question,
  ans: AnswerState | undefined,
  option: string,
  submitted: boolean,
): string {
  if (!submitted) {
    return ans?.multiSelected?.includes(option)
      ? 'border-primary-300 bg-primary-50'
      : 'border-gray-200 hover:border-gray-300'
  }
  if (Array.isArray(question.answer) && question.answer.includes(option))
    return 'border-green-300 bg-green-50'
  if (ans?.multiSelected?.includes(option)) return 'border-red-300 bg-red-50'
  return 'border-gray-200'
}

function blankInputClass(
  question: Question,
  ans: AnswerState | undefined,
  submitted: boolean,
): string {
  if (!submitted) {
    return 'border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500'
  }
  return isQuestionCorrect(question, ans, submitted)
    ? 'border-green-300 bg-green-50'
    : 'border-red-300 bg-red-50'
}

export function QuizBlock({
  block,
  onCompleted,
}: {
  block: Block
  onCompleted?: () => void
}) {
  const isMultiQuiz = Array.isArray(block.questions) && block.questions.length > 0
  const questions = useMemo(
    () => (isMultiQuiz ? block.questions || [] : []),
    [isMultiQuiz, block.questions],
  )
  const singleQuiz = block.quiz

  const [answers, setAnswers] = useState<AnswerState[]>([])
  const [submitted, setSubmitted] = useState(false)

  const source = isMultiQuiz ? questions : singleQuiz ? [singleQuiz] : []

  useEffect(() => {
    setAnswers(source.map(() => emptyAnswer()))
    setSubmitted(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id, block.questions, block.quiz])

  const allAnswered =
    source.length > 0 && source.every((q, i) => hasAnswer(q, answers[i]))

  const score = questions.reduce(
    (total, q, i) => total + (isQuestionCorrect(q, answers[i], submitted) ? 1 : 0),
    0,
  )

  const singleIsCorrect = singleQuiz
    ? isQuestionCorrect(singleQuiz, answers[0], submitted)
    : false

  function inputName(index: number): string {
    return `quiz-${block.id || 'block'}-${index}`
  }

  function submitQuiz(): void {
    if (!allAnswered) return
    setSubmitted(true)
    onCompleted?.()
  }

  function resetQuiz(): void {
    setAnswers(source.map(() => emptyAnswer()))
    setSubmitted(false)
  }

  function updateAnswer(index: number, updater: (a: AnswerState) => AnswerState): void {
    setAnswers((prev) => {
      const next = [...prev]
      if (!next[index]) next[index] = emptyAnswer()
      next[index] = updater(next[index])
      return next
    })
    if (submitted) setSubmitted(false)
  }

  if (!isMultiQuiz && !singleQuiz) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <p className="text-sm text-gray-400">本测验暂无题目</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-bold text-gray-800 mb-4">{block.title || '小测验'}</h3>

      {isMultiQuiz ? (
        <>
          <div className="space-y-6">
            {questions.map((question, index) => {
              const ans = answers[index] || emptyAnswer()
              const correct = isQuestionCorrect(question, ans, submitted)
              return (
                <section
                  key={question.id || index}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-sm font-medium text-gray-800">
                      {index + 1}. {question.question}
                    </p>
                    {submitted && (
                      <span
                        className={`shrink-0 text-xs font-medium ${
                          correct ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {correct ? '正确' : '错误'}
                      </span>
                    )}
                  </div>

                  {question.type === 'single-choice' && (
                    <div className="space-y-2">
                      {(question.options || []).map((opt, oi) => (
                        <label
                          key={oi}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${optionClass(
                            question,
                            ans,
                            opt,
                            submitted,
                          )}`}
                        >
                          <input
                            type="radio"
                            name={inputName(index)}
                            value={opt}
                            checked={ans.selected === opt}
                            onChange={() =>
                              updateAnswer(index, (a) => ({ ...a, selected: opt }))
                            }
                            className="accent-primary-600"
                          />
                          <span className="text-sm">{opt}</span>
                          {submitted && opt === question.answer && (
                            <svg
                              className="w-4 h-4 text-green-500 ml-auto shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          {submitted &&
                            ans.selected === opt &&
                            opt !== question.answer && (
                              <svg
                                className="w-4 h-4 text-red-400 ml-auto shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                aria-hidden
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'multiple-choice' && (
                    <div className="space-y-2">
                      {(question.options || []).map((opt, oi) => (
                        <label
                          key={oi}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${multiOptionClass(
                            question,
                            ans,
                            opt,
                            submitted,
                          )}`}
                        >
                          <input
                            type="checkbox"
                            value={opt}
                            checked={ans.multiSelected.includes(opt)}
                            onChange={() =>
                              updateAnswer(index, (a) => {
                                const has = a.multiSelected.includes(opt)
                                return {
                                  ...a,
                                  multiSelected: has
                                    ? a.multiSelected.filter((x) => x !== opt)
                                    : [...a.multiSelected, opt],
                                }
                              })
                            }
                            className="accent-primary-600"
                          />
                          <span className="text-sm">{opt}</span>
                          {submitted &&
                            Array.isArray(question.answer) &&
                            question.answer.includes(opt) && (
                              <svg
                                className="w-4 h-4 text-green-500 ml-auto shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                aria-hidden
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          {submitted &&
                            ans.multiSelected.includes(opt) &&
                            !(
                              Array.isArray(question.answer) &&
                              question.answer.includes(opt)
                            ) && (
                              <svg
                                className="w-4 h-4 text-red-400 ml-auto shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                aria-hidden
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'fill-blank' && (
                    <div>
                      <input
                        type="text"
                        value={ans.blankAnswer}
                        placeholder={question.placeholder || '输入你的答案...'}
                        onChange={(e) =>
                          updateAnswer(index, (a) => ({
                            ...a,
                            blankAnswer: e.target.value,
                          }))
                        }
                        onKeyUp={(e) => {
                          if (e.key === 'Enter') submitQuiz()
                        }}
                        className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors ${blankInputClass(
                          question,
                          ans,
                          submitted,
                        )}`}
                      />
                      {submitted && !correct && (
                        <p className="text-sm text-green-600 mt-2">
                          正确答案：<strong>{String(question.answer)}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {submitted && question.explanation && (
                    <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="text-sm text-blue-800">{question.explanation}</p>
                    </div>
                  )}
                </section>
              )
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            {!submitted ? (
              <button
                onClick={submitQuiz}
                disabled={!allAnswered}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  allAnswered
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                提交测验
              </button>
            ) : (
              <button
                onClick={resetQuiz}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                重新作答
              </button>
            )}
          </div>

          {submitted && (
            <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
              <p className="text-sm font-semibold text-primary-800">
                得分 {score} / {questions.length}
              </p>
              <p className="text-xs text-primary-700 mt-1">
                已显示每题结果，你可以直接复盘，或修改答案后重新提交。
              </p>
            </div>
          )}
        </>
      ) : singleQuiz ? (
        <>
          <p className="text-sm text-gray-700 mb-4">{singleQuiz.question}</p>

          {singleQuiz.type === 'single-choice' && (
            <div className="space-y-2 mb-4">
              {(singleQuiz.options || []).map((opt, i) => {
                const ans = answers[0] || emptyAnswer()
                return (
                  <label
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${optionClass(
                      singleQuiz,
                      ans,
                      opt,
                      submitted,
                    )}`}
                  >
                    <input
                      type="radio"
                      name={inputName(0)}
                      value={opt}
                      checked={ans.selected === opt}
                      onChange={() =>
                        updateAnswer(0, (a) => ({ ...a, selected: opt }))
                      }
                      className="accent-primary-600"
                    />
                    <span className="text-sm">{opt}</span>
                    {submitted && opt === singleQuiz.answer && (
                      <svg
                        className="w-4 h-4 text-green-500 ml-auto shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {submitted &&
                      ans.selected === opt &&
                      opt !== singleQuiz.answer && (
                        <svg
                          className="w-4 h-4 text-red-400 ml-auto shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                  </label>
                )
              })}
            </div>
          )}

          {singleQuiz.type === 'multiple-choice' && (
            <div className="space-y-2 mb-4">
              {(singleQuiz.options || []).map((opt, i) => {
                const ans = answers[0] || emptyAnswer()
                return (
                  <label
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${multiOptionClass(
                      singleQuiz,
                      ans,
                      opt,
                      submitted,
                    )}`}
                  >
                    <input
                      type="checkbox"
                      value={opt}
                      checked={ans.multiSelected.includes(opt)}
                      onChange={() =>
                        updateAnswer(0, (a) => {
                          const has = a.multiSelected.includes(opt)
                          return {
                            ...a,
                            multiSelected: has
                              ? a.multiSelected.filter((x) => x !== opt)
                              : [...a.multiSelected, opt],
                          }
                        })
                      }
                      className="accent-primary-600"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                )
              })}
            </div>
          )}

          {singleQuiz.type === 'fill-blank' && (
            <div className="mb-4">
              <input
                type="text"
                value={(answers[0] || emptyAnswer()).blankAnswer}
                placeholder={singleQuiz.placeholder || '输入你的答案...'}
                onChange={(e) =>
                  updateAnswer(0, (a) => ({ ...a, blankAnswer: e.target.value }))
                }
                onKeyUp={(e) => {
                  if (e.key === 'Enter') submitQuiz()
                }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors ${blankInputClass(
                  singleQuiz,
                  answers[0],
                  submitted,
                )}`}
              />
              {submitted && !singleIsCorrect && (
                <p className="text-sm text-green-600 mt-2">
                  正确答案：<strong>{String(singleQuiz.answer)}</strong>
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {!submitted ? (
              <button
                onClick={submitQuiz}
                disabled={!allAnswered}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  allAnswered
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                检查答案
              </button>
            ) : (
              <button
                onClick={resetQuiz}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                重试
              </button>
            )}

            {submitted && (
              <span
                className={`text-sm font-medium ${
                  singleIsCorrect ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {singleIsCorrect ? '正确!' : '不正确'}
              </span>
            )}
          </div>

          {submitted && singleQuiz.explanation && (
            <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-sm text-blue-800">{singleQuiz.explanation}</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
