import {reorderArray} from './board-functions'

describe('reorderArray', () => {
  it('returns an empty array when given a falsy array', () => {
    expect(reorderArray({array: undefined as any, startIndex: 0, endIndex: 1})).toEqual([])
  })

  it('moves an item forward in the array', () => {
    const result = reorderArray({array: ['a', 'b', 'c', 'd'], startIndex: 0, endIndex: 2})
    expect(result).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item backward in the array', () => {
    const result = reorderArray({array: ['a', 'b', 'c', 'd'], startIndex: 3, endIndex: 1})
    expect(result).toEqual(['a', 'd', 'b', 'c'])
  })

  it('is a no-op when startIndex equals endIndex', () => {
    const result = reorderArray({array: ['a', 'b', 'c'], startIndex: 1, endIndex: 1})
    expect(result).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the original array', () => {
    const original = ['a', 'b', 'c']
    reorderArray({array: original, startIndex: 0, endIndex: 2})
    expect(original).toEqual(['a', 'b', 'c'])
  })

  // reorderArray trusts its caller (react-beautiful-dnd's drag indices) to
  // stay in bounds and does no validation of its own. This test documents
  // today's behavior for an out-of-range startIndex so a future change
  // doesn't silently alter it without anyone noticing.
  it('inserts undefined when startIndex is out of range', () => {
    const result = reorderArray({array: ['a', 'b', 'c'], startIndex: 5, endIndex: 1})
    expect(result).toEqual(['a', undefined, 'b', 'c'])
  })
})
