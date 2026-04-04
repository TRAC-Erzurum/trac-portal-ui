/**
 * Drops late HTTP responses when a newer list/search request was started.
 * Typical race: `onMounted` full list vs debounced search, or rapid filter changes.
 *
 * @example
 * const listGuard = useAsyncStaleGuard()
 * const fetchList = async (append = false) => {
 *   const token = append ? listGuard.beginAppend() : listGuard.beginReplace()
 *   try {
 *     const res = await api.get(...)
 *     if (!listGuard.isCurrent(token)) return
 *     items.value = res.data
 *   } catch (e) {
 *     if (!listGuard.isCurrent(token)) return
 *     // handle error for this request only
 *   } finally {
 *     if (listGuard.isCurrent(token)) isLoading.value = false
 *   }
 * }
 */
export function useAsyncStaleGuard() {
  let generation = 0

  return {
    /** Call before a request that replaces the list (search, filter, page 1). */
    beginReplace(): number {
      generation += 1
      return generation
    },

    /** Call before “load more”; does not bump so concurrent replace invalidates this token. */
    beginAppend(): number {
      return generation
    },

    isCurrent(token: number): boolean {
      return token === generation
    },
  }
}
