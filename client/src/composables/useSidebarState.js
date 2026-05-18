import { ref, watchEffect } from 'vue'

const isCollapsed = ref(localStorage.getItem('sidebar-collapsed') === 'true')

// Persist collapsed state across page reloads
watchEffect(() => {
  localStorage.setItem('sidebar-collapsed', isCollapsed.value)
})

export function useSidebarState() {
  const toggle = () => { isCollapsed.value = !isCollapsed.value }
  const collapse = () => { isCollapsed.value = true }
  const expand = () => { isCollapsed.value = false }
  return { isCollapsed, toggle, collapse, expand }
}
