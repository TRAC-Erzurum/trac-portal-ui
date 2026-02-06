export type UserRole = 'super_admin' | 'president' | 'admin' | 'member' | 'volunteer' | 'guest'

export function getRoleBadgeClass(role?: string): string {
  switch (role) {
    case 'super_admin':
    case 'president':
    case 'admin':
      return 'bg-red-500/10 text-red-600 dark:text-red-400'
    case 'member':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    case 'volunteer':
      return 'bg-green-500/10 text-green-600 dark:text-green-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function getAvatarFallback(text: string, length: number = 2): string {
  return text.slice(0, length).toUpperCase()
}
