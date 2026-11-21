import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// highlight.js：核心 + 需要的语言注册（tree-shaking 友好）
import hljs from 'highlight.js/lib/core'
import cpp from 'highlight.js/lib/languages/cpp'
import 'highlight.js/styles/atom-one-dark.css'

hljs.registerLanguage('cpp', cpp)

import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

// 注册 Element Plus 全部图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.config.globalProperties.$hljs = hljs

app.use(ElementPlus, { locale: zhCn })
app.use(router)
app.mount('#app')
