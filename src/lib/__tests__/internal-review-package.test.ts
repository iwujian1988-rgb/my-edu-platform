import { describe, expect, it } from 'vitest'
import { canAccessInternalReviewVideo, isInternalReviewPackageName } from '../video-permissions'

describe('isInternalReviewPackageName', () => {
  it('recognizes the dedicated internal-review entitlement', () => {
    expect(isInternalReviewPackageName('内部审核：临床英语沟通')).toBe(true)
  })

  it('does not classify ordinary learning packages as restricted', () => {
    expect(isInternalReviewPackageName('临床英语视频学习永久会员')).toBe(false)
    expect(isInternalReviewPackageName(null)).toBe(false)
    expect(isInternalReviewPackageName(undefined)).toBe(false)
  })
})

describe('canAccessInternalReviewVideo', () => {
  it('requires the exact review package attached to a video', () => {
    expect(canAccessInternalReviewVideo(['review-a'], ['review-a'], ['review-a', 'review-b'])).toBe(true)
    expect(canAccessInternalReviewVideo(['review-b'], ['review-a'], ['review-a', 'review-b'])).toBe(false)
  })

  it('keeps ordinary videos available and fails closed for a mixed restricted package', () => {
    expect(canAccessInternalReviewVideo(['ordinary'], [], ['review-a'])).toBe(true)
    expect(canAccessInternalReviewVideo(['ordinary', 'review-a'], [], ['review-a'])).toBe(false)
  })
})
