<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => (route.path.startsWith('/edit') ? '/edit' : '/'))
</script>

<template>
  <el-config-provider>
    <div class="app-shell">
      <header class="app-header">
        <div class="header-inner">
          <router-link to="/" class="brand">
            <span class="brand-icon">📚</span>
            <span class="brand-text">OI 刷题本</span>
            <el-tag size="small" type="info" effect="plain" round>纯本地 · 无后端</el-tag>
          </router-link>

          <el-menu
            :default-active="activeMenu"
            mode="horizontal"
            router
            :ellipsis="false"
            class="nav-menu"
          >
            <el-menu-item index="/">题库首页</el-menu-item>
            <el-menu-item index="/edit">✏️ 新增题目</el-menu-item>
          </el-menu>
        </div>
      </header>

      <main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <footer class="app-footer">
        数据源：<code>src/data/problems.json</code> —— 编辑后请复制 JSON 手动覆盖该文件
      </footer>
    </div>
  </el-config-provider>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--el-text-color-primary);
  font-weight: 700;
  font-size: 18px;
  white-space: nowrap;
}

.brand-icon {
  font-size: 22px;
}

.nav-menu {
  flex: 1;
  border-bottom: none !important;
}

.app-main {
  flex: 1;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 20px 16px 40px;
}

.app-footer {
  text-align: center;
  padding: 14px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color-lighter);
}

.app-footer code {
  background: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
