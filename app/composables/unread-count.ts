export function useUnreadCount() {
  return useState<number>('unreadCount', () => 0)
}
