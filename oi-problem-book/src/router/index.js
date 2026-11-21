import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

// Hash 模式路由：构建后可直接用 file:// 或任意静态服务器打开，无需后端重写规则
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '题库首页' },
  },
  {
    path: '/problem/:id',
    name: 'detail',
    component: () => import('../views/DetailView.vue'),
    meta: { title: '题目详情' },
  },
  {
    path: '/edit/:id?',
    name: 'edit',
    component: () => import('../views/EditView.vue'),
    meta: { title: '新增 / 编辑题目' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.afterEach((to) => {
  document.title = `${to.meta.title || ''} - OI 刷题本`
})

export default router
