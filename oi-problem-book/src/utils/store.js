// 题库数据统一入口：所有页面都从这里读写，方便后续扩展 localStorage 草稿缓存
import raw from '../data/problems.json'

/**
 * 获取全部题目（返回深拷贝，避免调用方误改原始模块数据）
 */
export function getProblems() {
  return JSON.parse(JSON.stringify(raw))
}

/**
 * 按题号查找一道题（id 不区分大小写）
 */
export function findProblem(id) {
  if (!id) return undefined
  const key = decodeURIComponent(String(id)).toLowerCase()
  return getProblems().find((p) => p.id.toLowerCase() === key)
}

/**
 * 生成完整的 problems.json 文本（2 空格缩进，UTF-8 中文不转义）
 * 供编辑页 / 油猴脚本产出后手动覆盖本地文件
 */
export function dumpJson(problems) {
  return JSON.stringify(problems, null, 2) + '\n'
}

/**
 * 将新/改的题目合并进全量题库：
 * - id 已存在 → 替换
 * - id 不存在 → 追加到头部
 */
export function mergeProblem(problems, problem) {
  const list = JSON.parse(JSON.stringify(problems))
  const idx = list.findIndex((p) => p.id.toLowerCase() === problem.id.toLowerCase())
  if (idx >= 0) list[idx] = problem
  else list.unshift(problem)
  return list
}

// 常用枚举，表单与展示共用
export const SOURCES = ['洛谷', 'Codeforces']
export const STATUSES = ['AC', 'WA', 'TLE', '未做']

export const STATUS_TYPE = {
  AC: 'success',
  WA: 'danger',
  TLE: 'warning',
  未做: 'info',
}
