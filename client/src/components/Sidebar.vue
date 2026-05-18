<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useI18n } from '../composables/useI18n'
import { useSidebarState } from '../composables/useSidebarState'

const emit = defineEmits(['show-profile-details', 'show-tasks'])

const route = useRoute()
const { currentUser, getInitials } = useAuth()
const { t, localeName, availableLocales, setLocale, currentLocale } = useI18n()
const { isCollapsed, toggle } = useSidebarState()

const initials = computed(() => getInitials(currentUser.value.name))

// Exact match for dashboard, prefix match for all others
const isActive = (path) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

// Cycle through available locales (en → ja → en)
const toggleLang = () => {
  const locales = availableLocales.value
  const currentIndex = locales.indexOf(currentLocale.value)
  const nextIndex = (currentIndex + 1) % locales.length
  setLocale(locales[nextIndex])
}

// Auto-collapse on narrow viewports (≤1024px), expand when wider
let mq
onMounted(() => {
  mq = window.matchMedia('(max-width: 1024px)')
  if (mq.matches) isCollapsed.value = true
  mq.addEventListener('change', handleMq)
})
onUnmounted(() => mq?.removeEventListener('change', handleMq))
const handleMq = (e) => { if (e.matches) isCollapsed.value = true }
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <!-- Brand section -->
    <div class="sidebar-brand">
      <div class="brand-content">
        <h1>{{ t('nav.companyName') }}</h1>
        <span>{{ t('nav.subtitle') }}</span>
      </div>
      <button
        class="toggle-btn"
        @click="toggle"
        :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M13 5L7 10L13 15" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Nav section -->
    <nav class="sidebar-nav">
      <router-link to="/" class="nav-item" :class="{ active: isActive('/') }" :title="isCollapsed ? t('nav.overview') : ''">
        <!-- Dashboard: grid of squares -->
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" class="nav-icon">
          <rect x="2" y="2" width="7" height="7" rx="1"/>
          <rect x="11" y="2" width="7" height="7" rx="1"/>
          <rect x="2" y="11" width="7" height="7" rx="1"/>
          <rect x="11" y="11" width="7" height="7" rx="1"/>
        </svg>
        <span v-show="!isCollapsed">{{ t('nav.overview') }}</span>
      </router-link>

      <router-link to="/inventory" class="nav-item" :class="{ active: isActive('/inventory') }" :title="isCollapsed ? t('nav.inventory') : ''">
        <!-- Inventory: package/box -->
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" class="nav-icon">
          <path d="M10 2L18 6v8l-8 4-8-4V6l8-4z"/>
          <path d="M10 2v12M2 6l8 4 8-4"/>
        </svg>
        <span v-show="!isCollapsed">{{ t('nav.inventory') }}</span>
      </router-link>

      <router-link to="/orders" class="nav-item" :class="{ active: isActive('/orders') }" :title="isCollapsed ? t('nav.orders') : ''">
        <!-- Orders: clipboard/list -->
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" class="nav-icon">
          <rect x="4" y="3" width="12" height="15" rx="1.5"/>
          <path d="M7 7h6M7 10h6M7 13h4"/>
          <path d="M7.5 3V2a.5.5 0 011 0v1h3V2a.5.5 0 011 0v1"/>
        </svg>
        <span v-show="!isCollapsed">{{ t('nav.orders') }}</span>
      </router-link>

      <router-link to="/spending" class="nav-item" :class="{ active: isActive('/spending') }" :title="isCollapsed ? t('nav.finance') : ''">
        <!-- Finance: bar chart -->
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" class="nav-icon">
          <path d="M3 16V10M7 16V6M11 16V9M15 16V4"/>
          <path d="M2 16h16"/>
        </svg>
        <span v-show="!isCollapsed">{{ t('nav.finance') }}</span>
      </router-link>

      <router-link to="/demand" class="nav-item" :class="{ active: isActive('/demand') }" :title="isCollapsed ? t('nav.demandForecast') : ''">
        <!-- Demand: trending up -->
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" class="nav-icon">
          <path d="M2 14l5-5 4 3 5-6"/>
          <path d="M14 6h4v4"/>
        </svg>
        <span v-show="!isCollapsed">{{ t('nav.demandForecast') }}</span>
      </router-link>

      <router-link
        to="/restocking"
        class="nav-item"
        :class="{ active: isActive('/restocking') }"
        :title="isCollapsed ? 'Restocking' : ''"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="nav-icon">
          <!-- Shopping cart icon -->
          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4"/>
          <circle cx="9" cy="17" r="1.5"/>
          <circle cx="17" cy="17" r="1.5"/>
        </svg>
        <span v-show="!isCollapsed">Restocking</span>
      </router-link>

      <router-link to="/reports" class="nav-item" :class="{ active: isActive('/reports') }" :title="isCollapsed ? 'Reports' : ''">
        <!-- Reports: document/file -->
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" class="nav-icon">
          <path d="M5 3h7l4 4v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/>
          <path d="M12 3v4h4"/>
          <path d="M7 10h6M7 13h4"/>
        </svg>
        <span v-show="!isCollapsed">Reports</span>
      </router-link>
    </nav>

    <!-- Footer: self-contained profile + language, no dropdown positioning issues -->
    <div class="sidebar-footer">
      <!-- Language switcher row -->
      <div class="footer-lang" v-show="!isCollapsed">
        <button class="lang-btn" @click="toggleLang">
          <!-- Globe icon -->
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
            <circle cx="10" cy="10" r="8"/>
            <path d="M10 2a14 14 0 010 16M10 2a14 14 0 000 16M2 10h16"/>
          </svg>
          <span>{{ localeName }}</span>
        </button>
      </div>

      <!-- Profile row -->
      <div class="footer-profile">
        <div class="footer-avatar">{{ initials }}</div>
        <div class="footer-user" v-show="!isCollapsed">
          <div class="footer-name">{{ currentUser.name }}</div>
          <div class="footer-email">{{ currentUser.email }}</div>
        </div>
        <div class="footer-actions" v-show="!isCollapsed">
          <button @click="$emit('show-profile-details')" title="Profile" class="action-btn">
            <!-- Person icon -->
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
              <circle cx="10" cy="6" r="3.5"/>
              <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7"/>
            </svg>
          </button>
          <button @click="$emit('show-tasks')" title="Tasks" class="action-btn">
            <!-- Task/checklist icon -->
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
              <path d="M3 5h14M3 10h14M3 15h8"/>
              <path d="M13 13l2 2 4-4"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  min-width: 240px;
  height: 100vh;
  background: #0f172a;
  overflow: hidden;
  /* Animate width transition */
  transition: width 250ms ease, min-width 250ms ease;
}

/* Brand section */
.sidebar-brand {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.sidebar-brand h1 {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.sidebar-brand span {
  display: block;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.2rem;
}

.brand-content {
  flex: 1;
  min-width: 0;
  /* Prevent text from overflowing during animation */
  overflow: hidden;
}

.toggle-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 150ms ease;
  margin-top: 0.2rem;
}

.toggle-btn:hover {
  color: #94a3b8;
}

/* Rotate chevron 180° when collapsed to point right */
.toggle-btn svg {
  transition: transform 250ms ease;
}

.sidebar.collapsed .toggle-btn svg {
  transform: rotate(180deg);
}

/* Nav section */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.25rem;
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  border-left: 3px solid transparent;
  transition: all 150ms ease;
}

.nav-item:hover:not(.active) {
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
}

.nav-item.active {
  border-left-color: #2563eb;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-item.active .nav-icon {
  opacity: 1;
}

/* Footer section */
.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1rem 1.25rem;
}

.footer-lang {
  margin-bottom: 0.75rem;
}

.lang-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
  width: 100%;
  transition: color 150ms ease;
}

.lang-btn:hover {
  color: #cbd5e1;
}

.footer-profile {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.footer-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.footer-user {
  flex: 1;
  min-width: 0;
}

.footer-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.footer-email {
  font-size: 0.625rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.footer-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.action-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 150ms ease;
}

.action-btn:hover {
  color: #94a3b8;
}

/* Collapsed: icon-only rail */
.sidebar.collapsed {
  width: 60px;
  min-width: 60px;
}

/* Hide brand text, keep toggle button accessible */
.sidebar.collapsed .brand-content {
  display: none;
}

/* Center toggle button when collapsed */
.sidebar.collapsed .sidebar-brand {
  justify-content: center;
}

/* Center icons in collapsed nav items */
.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0.625rem 0;
  border-left: none;
  border-radius: 6px;
  margin: 0 6px;
}

/* Active state in collapsed mode — use background only (no left border) */
.sidebar.collapsed .nav-item.active {
  background: rgba(255, 255, 255, 0.12);
}

/* Center footer avatar when collapsed */
.sidebar.collapsed .sidebar-footer {
  padding: 0.75rem 0;
}

.sidebar.collapsed .footer-profile {
  justify-content: center;
}
</style>
