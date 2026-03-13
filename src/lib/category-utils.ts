/**
 * Flattens a category tree into a list with depth level for indented display (e.g. in dropdowns).
 * All categories are included regardless of equipment count.
 */
export interface CategoryWithLevel<T extends { id: string; name: string; children?: T[] }> {
  category: T
  level: number
}

export function flattenCategoriesWithLevel<T extends { id: string; name: string; children?: T[] }>(
  categories: T[],
  level = 0,
): CategoryWithLevel<T>[] {
  const result: CategoryWithLevel<T>[] = []
  for (const cat of categories) {
    result.push({ category: cat, level })
    const children = (cat.children as T[] | undefined) ?? []
    if (children.length > 0) {
      result.push(...flattenCategoriesWithLevel(children, level + 1))
    }
  }
  return result
}
