/* script.js - 完全修复版 */

// 本地存储键名定义
const LS = { 
  tasks: 'stu_tasks_v3', 
  flows: 'stu_flows_v1', 
  flashcards: 'stu_flashcards_v1', 
  tomato_log: 'stu_tomato_log_v1', 
  notebook_pages: 'stu_notebook_pages_v3', 
  settings: 'stu_settings_v1', 
  search_history: 'stu_search_history_v1',
  drawing_pages: 'stu_drawing_pages_v1'
};

// DOM工具函数
function $(id) { 
  return document.getElementById(id); 
}

function save(k, v) { 
  try { 
    localStorage.setItem(k, JSON.stringify(v)); 
  } catch(e) {
    console.error('保存失败:', e);
  } 
}

function load(k, fb) { 
  try { 
    const s = localStorage.getItem(k); 
    return s ? JSON.parse(s) : fb; 
  } catch(e) { 
    return fb; 
  } 
}

function escapeHtml(s) { 
  return String(s || '').replace(/[&<>]/g, c => c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'); 
}

// 通知和特效
function showNotification(msg) { 
  const t = document.createElement('div'); 
  t.className = 'toast'; 
  t.innerText = msg; 
  document.body.appendChild(t); 
  setTimeout(() => t.classList.add('show'), 10); 
  setTimeout(() => t.remove(), 2500); 
}

function triggerConfetti() { 
  for(let i = 0; i < 40; i++) { 
    const c = document.createElement('div'); 
    c.className = 'confetti'; 
    c.style.left = Math.random() * 100 + '%'; 
    c.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 60%)`; 
    c.style.animation = `fall ${1 + Math.random() * 2}s linear forwards`; 
    $('#confettiContainer').appendChild(c); 
    setTimeout(() => c.remove(), 2200); 
  } 
}

// 全局数据变量
let tasks = load(LS.tasks, []);
let flows = load(LS.flows, []);
let flashcards = load(LS.flashcards, []);
let tomatoLog = load(LS.tomato_log, []);
let notebookPages = load(LS.notebook_pages, [{ 
  id: Date.now().toString(), 
  name: '我的笔记', 
  html: '<p>欢迎开始记录学习～</p>', 
  text: '欢迎开始记录学习～' 
}]);
let settings = load(LS.settings, { theme: 'light', autoStartBreak: false });
let searchHistory = load(LS.search_history, []);
let currentNoteId = notebookPages[0]?.id || '';

/* ========== 番茄钟功能 ========== */
let tomatoInterval = null;
let tomatoRemaining = 25 * 60;
let isTomatoRunning = false;
let isWorkMode = true;
let workMins = 25, workSecs = 0, breakMins = 5, breakSecs = 0;

function updateTimerDisplay() { 
  let m = Math.floor(tomatoRemaining / 60);
  let s = tomatoRemaining % 60; 
  if ($('minutes')) $('minutes').textContent = m.toString(); 
  if ($('seconds')) $('seconds').textContent = s < 10 ? '0' + s : s.toString(); 
  if ($('tomatoStatus')) {
    $('tomatoStatus').textContent = isTomatoRunning ? 
      (isWorkMode ? '专注中...' : '休息中...') : 
      (isWorkMode ? '准备专注' : '准备休息');
  }
}

function startTomato() { 
  if (tomatoInterval) clearInterval(tomatoInterval); 
  isTomatoRunning = true; 
  tomatoInterval = setInterval(() => { 
    if (tomatoRemaining <= 0) { 
      clearInterval(tomatoInterval); 
      isTomatoRunning = false; 
      if (isWorkMode) { 
        let cnt = parseInt($('completedSessions')?.textContent || 0) || 0; 
        if ($('completedSessions')) $('completedSessions').textContent = (cnt + 1).toString(); 
        let total = parseInt($('totalFocusTime')?.textContent || 0) || 0; 
        if ($('totalFocusTime')) $('totalFocusTime').textContent = (total + workMins).toString(); 
        tomatoLog.push({type: 'work', duration: workMins, date: new Date().toISOString()}); 
        save(LS.tomato_log, tomatoLog); 
        showNotification('🍅 专注完成！'); 
        triggerConfetti(); 
        if (settings.autoStartBreak) { 
          isWorkMode = false; 
          tomatoRemaining = breakMins * 60 + breakSecs; 
          startTomato(); 
        } else { 
          isWorkMode = false; 
          tomatoRemaining = breakMins * 60 + breakSecs; 
          updateTimerDisplay(); 
        } 
      } else { 
        showNotification('☕ 休息结束，开始新专注！'); 
        isWorkMode = true; 
        tomatoRemaining = workMins * 60 + workSecs; 
        updateTimerDisplay(); 
      } 
    } else { 
      tomatoRemaining--; 
      updateTimerDisplay(); 
    } 
  }, 1000); 
}

function pauseTomato() { 
  if (tomatoInterval) { 
    clearInterval(tomatoInterval); 
    tomatoInterval = null; 
    isTomatoRunning = false; 
    updateTimerDisplay();
  } 
}

function resetTomato() { 
  pauseTomato(); 
  isWorkMode = true; 
  tomatoRemaining = workMins * 60 + workSecs; 
  updateTimerDisplay(); 
}

/* ========== 计算器功能 ========== */
function initCalculator() {
  const calcButtonsGrid = $('calcButtonsGrid');
  const calcExpression = $('calcExpression');
  const calcResult = $('calcResult');
  
  if (!calcButtonsGrid || !calcExpression || !calcResult) {
    console.warn("计算器元素未找到");
    return;
  }

  const buttonDefs = [
    ['7', '7'], ['8', '8'], ['9', '9'], ['/', '÷', 'operator'], ['√', '√', 'operator'], ['C', 'C', 'clear'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['*', '×', 'operator'], ['^', '^', 'operator'], ['(', '(', 'operator'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['-', '−', 'operator'], ['%', '%', 'operator'], [')', ')', 'operator'],
    ['0', '0'], ['.', '.'], ['=', '=', 'equal'], ['+', '+', 'operator'], ['π', 'π', 'operator'], ['AC', 'AC', 'clear']
  ];

  let currentExpression = '';

  const safeEval = (expr) => {
    if (!expr) return null;
    expr = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, Math.PI)
      .replace(/\^/g, '**')
      .replace(/(\d+(\.\d+)?)%/g, '($1/100)');
    try {
      return Function('"use strict"; return (' + expr + ')')();
    } catch (error) {
      console.error("计算错误:", expr, error);
      return null;
    }
  };

  const updateDisplay = () => {
    calcExpression.textContent = currentExpression || '输入表达式...';
    const result = safeEval(currentExpression);
    if (result !== null && currentExpression !== '') {
      calcResult.textContent = String(result);
    } else {
      calcResult.textContent = currentExpression ? '错误' : '0';
    }
  };

  const handleButtonClick = (buttonValue) => {
    switch (buttonValue) {
      case 'AC':
        currentExpression = '';
        break;
      case 'C':
        currentExpression = currentExpression.slice(0, -1);
        break;
      case '=':
        const result = safeEval(currentExpression);
        if (result !== null) {
          currentExpression = String(result);
        } else {
          calcResult.style.color = '#ff6b6b';
          setTimeout(() => calcResult.style.color = '', 300);
        }
        break;
      case '√':
        if (currentExpression) {
          const val = safeEval(currentExpression);
          if (val !== null && val >= 0) {
            currentExpression = `Math.sqrt(${val})`;
            const sqrtResult = safeEval(currentExpression);
            if (sqrtResult !== null) {
              currentExpression = String(sqrtResult);
            }
          } else {
            calcResult.textContent = '无效输入';
            calcResult.style.color = '#ff6b6b';
            setTimeout(() => { calcResult.style.color = ''; updateDisplay(); }, 1000);
            return;
          }
        }
        break;
      case '^':
        currentExpression += '^';
        break;
      case 'π':
        currentExpression += Math.PI;
        break;
      default:
        currentExpression += buttonValue;
        break;
    }
    updateDisplay();
  };

  calcButtonsGrid.innerHTML = '';
  buttonDefs.forEach(([value, displayText, cssClass = '']) => {
    const button = document.createElement('button');
    button.textContent = displayText;
    button.className = 'calc-btn';
    if (cssClass) button.classList.add(cssClass);
    
    button.addEventListener('click', () => handleButtonClick(value));
    button.addEventListener('mousedown', (e) => e.currentTarget.style.transform = 'scale(0.95)');
    button.addEventListener('mouseup', (e) => e.currentTarget.style.transform = '');
    button.addEventListener('mouseleave', (e) => e.currentTarget.style.transform = '');
    
    calcButtonsGrid.appendChild(button);
  });

  updateDisplay();
}

/* ========== 画板功能 ========== */
let drawingPages = [''];
let currentPage = 0;
let isDrawing = false;
let isErasing = false;
let penSize = 3;
let eraserSize = 20;
let color = '#000000';
let ctx = null;
let canvas = null;
let lastX = 0, lastY = 0;

function initDrawing() {
  canvas = $('drawingCanvas');
  if (!canvas) {
    console.error("画板canvas元素未找到！");
    return;
  }
  
  ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error("无法获取canvas 2D上下文！");
    return;
  }
  
  const attrW = parseInt(canvas.getAttribute('width') || 800, 10);
  const attrH = parseInt(canvas.getAttribute('height') || 500, 10);
  canvas.width = attrW;
  canvas.height = attrH;
  canvas.style.touchAction = 'none';
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = penSize;
  ctx.strokeStyle = color;

  function getPosFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function startDrawing(x, y) {
    isDrawing = true;
    [lastX, lastY] = [x, y];
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(x, y) {
    if (!isDrawing) return;
    
    ctx.lineWidth = isErasing ? eraserSize : penSize;
    ctx.strokeStyle = isErasing ? '#ffffff' : color;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    [lastX, lastY] = [x, y];
  }

  function stopDrawing() {
    if (isDrawing) {
      ctx.closePath();
      isDrawing = false;
      saveDrawing();
    }
  }

  // 鼠标事件
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const pos = getPosFromClient(e.clientX, e.clientY);
    startDrawing(pos.x, pos.y);
  });

  canvas.addEventListener('mousemove', (e) => {
    e.preventDefault();
    const pos = getPosFromClient(e.clientX, e.clientY);
    draw(pos.x, pos.y);
  });

  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  // 触摸事件
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const pos = getPosFromClient(touch.clientX, touch.clientY);
      startDrawing(pos.x, pos.y);
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDrawing) {
      const touch = e.touches[0];
      const pos = getPosFromClient(touch.clientX, touch.clientY);
      draw(pos.x, pos.y);
    }
  });

  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);

  // 工具按钮事件
  $('drawPen')?.addEventListener('click', () => {
    isErasing = false;
    $('drawPen').classList.add('active');
    $('drawEraser').classList.remove('active');
  });

  $('drawEraser')?.addEventListener('click', () => {
    isErasing = true;
    $('drawEraser').classList.add('active');
    $('drawPen').classList.remove('active');
  });

  $('penSize')?.addEventListener('input', (e) => {
    penSize = parseInt(e.target.value) || 3;
    if (!isErasing) ctx.lineWidth = penSize;
  });

  $('eraserSize')?.addEventListener('input', (e) => {
    eraserSize = parseInt(e.target.value) || 20;
    if (isErasing) ctx.lineWidth = eraserSize;
  });

  $('customColor')?.addEventListener('input', (e) => {
    color = e.target.value;
    isErasing = false;
    $('drawPen').classList.add('active');
    $('drawEraser').classList.remove('active');
    if (!isErasing) ctx.strokeStyle = color;
  });

  $('clearCanvas')?.addEventListener('click', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    saveDrawing();
  });

  // 页面管理
  $('prevPage')?.addEventListener('click', () => {
    saveDrawing();
    if (currentPage > 0) {
      currentPage--;
      loadDrawingPage();
    } else {
      showNotification('已经是第一页了');
    }
  });

  $('nextPage')?.addEventListener('click', () => {
    saveDrawing();
    if (currentPage + 1 < drawingPages.length) {
      currentPage++;
      loadDrawingPage();
    } else {
      showNotification('已经是最后一页了');
    }
  });

  $('addPage')?.addEventListener('click', () => {
    saveDrawing();
    drawingPages.push('');
    currentPage = drawingPages.length - 1;
    loadDrawingPage();
    updatePageIndicator();
    showNotification(`已添加第 ${currentPage + 1} 页`);
  });

  $('deletePage')?.addEventListener('click', () => {
    if (drawingPages.length > 1) {
      drawingPages.splice(currentPage, 1);
      if (currentPage >= drawingPages.length) {
        currentPage = drawingPages.length - 1;
      }
      loadDrawingPage();
      updatePageIndicator();
      showNotification('页面已删除');
    } else {
      showNotification('至少保留一页');
    }
  });

  $('exportPNG')?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `drawing_${currentPage + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  function saveDrawing() {
    try {
      drawingPages[currentPage] = canvas.toDataURL();
      localStorage.setItem(LS.drawing_pages, JSON.stringify({
        pages: drawingPages,
        current: currentPage
      }));
    } catch (e) {
      console.error('保存画板数据失败:', e);
    }
  }

  function loadDrawingPage() {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = isErasing ? '#ffffff' : color;
      ctx.lineWidth = isErasing ? eraserSize : penSize;
    };
    
    if (drawingPages[currentPage] && drawingPages[currentPage].startsWith('data:image')) {
      img.src = drawingPages[currentPage];
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = penSize;
    }
    updatePageIndicator();
  }

  function updatePageIndicator() {
    const indicator = $('pageIndicator');
    if (indicator) {
      indicator.textContent = `第${currentPage + 1}/${drawingPages.length}页`;
    }
  }

  // 加载保存的画板数据
  try {
    const raw = localStorage.getItem(LS.drawing_pages);
    if (raw) {
      const data = JSON.parse(raw);
      drawingPages = data.pages || [''];
      currentPage = data.current || 0;
    }
  } catch (e) {
    console.error('加载画板数据失败:', e);
    drawingPages = [''];
    currentPage = 0;
  }

  loadDrawingPage();
  updatePageIndicator();
  
  $('drawPen').classList.add('active');
  $('drawEraser').classList.remove('active');
}

/* ========== 任务管理功能 ========== */
function renderAllTaskLists() {
  for (let i = 1; i <= 4; i++) {
    const list = $(`quadrant${i}`);
    if (!list) continue;
    list.innerHTML = '';
    const quadrantTasks = tasks.filter(t => t.quadrant === i);
    quadrantTasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'task-card';
      card.draggable = true;
      card.dataset.id = task.id;
      card.innerHTML = `
        <div class="task-header">
          <span class="task-tag ${task.priority}">${
            task.priority === 'urgent' ? '紧急' : 
            task.priority === 'important' ? '重要' : '低'
          }</span>
          <span style="font-weight:bold;">${escapeHtml(task.title)}</span>
        </div>
        <p style="font-size:0.9rem;margin:8px 0;color:#666;">${escapeHtml(task.desc || '')}</p>
        <div class="task-progress-bar">
          <div class="task-progress-fill" style="width:${task.progress || 0}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <div class="task-timer">
            <button class="progress-btn" data-id="${task.id}" data-change="10">+10%</button>
            <button class="progress-btn" data-id="${task.id}" data-change="-10">-10%</button>
            <span style="font-size:0.8rem;margin-left:8px;">${task.progress || 0}%</span>
          </div>
          <div>
            <button class="delete-task-btn" data-id="${task.id}" style="background:#ff6b6b;color:white;border:none;padding:4px 12px;border-radius:12px;font-size:0.8rem;cursor:pointer;">删除</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  }
  // 更新统计数据
  $('todayTasks').textContent = tasks.filter(t => t.progress >= 100).length.toString();
  $('totalTasks').textContent = tasks.length.toString();
}

function addTask() {
  const title = $('taskTitle')?.value.trim();
  const desc = $('taskDesc')?.value.trim();
  const duration = parseInt($('taskDuration')?.value) || 25;
  const quadrant = parseInt($('taskQuadrant')?.value) || 1;
  
  if (!title) {
    showNotification('请输入任务名称');
    return;
  }
  
  const task = {
    id: Date.now().toString(),
    title,
    desc,
    duration,
    quadrant,
    priority: quadrant === 1 ? 'urgent' : quadrant === 2 ? 'important' : 'low',
    progress: 0,
    createdAt: new Date().toISOString()
  };
  
  tasks.push(task);
  save(LS.tasks, tasks);
  renderAllTaskLists();
  
  $('taskTitle').value = '';
  $('taskDesc').value = '';
  showNotification('任务添加成功');
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save(LS.tasks, tasks);
  renderAllTaskLists();
  showNotification('任务已删除');
}

function updateTaskProgress(id, delta) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.progress = Math.max(0, Math.min(100, (task.progress || 0) + delta));
    save(LS.tasks, tasks);
    renderAllTaskLists();
  }
}

/* ========== 笔记本功能 ========== */
function initNotebook() {
  const editor = $('noteEditor');
  if (!editor) return;
  
  renderNotebookCatalog();
  
  if (notebookPages.length > 0 && currentNoteId) {
    const currentNote = notebookPages.find(n => n.id === currentNoteId) || notebookPages[0];
    $('noteTitle').value = currentNote.name;
    editor.innerHTML = currentNote.html;
  }
  
  let saveTimeout;
  editor.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveNote, 1000);
  });
  
  $('noteTitle').addEventListener('change', saveNote);
  $('newNote').addEventListener('click', newNote);
  $('saveNote').addEventListener('click', saveNote);
  $('exportNote').addEventListener('click', exportNote);
  
  // 格式按钮
  $('noteBold')?.addEventListener('click', () => document.execCommand('bold'));
  $('noteItalic')?.addEventListener('click', () => document.execCommand('italic'));
  $('noteUnderline')?.addEventListener('click', () => document.execCommand('underline'));
  $('noteList')?.addEventListener('click', () => document.execCommand('insertUnorderedList'));
  $('noteLink')?.addEventListener('click', () => {
    const url = prompt('输入链接地址:');
    if (url) document.execCommand('createLink', false, url);
  });
  $('noteCode')?.addEventListener('click', () => {
    document.execCommand('formatBlock', false, '<pre>');
  });
  
  $('searchNoteBtn').addEventListener('click', searchNote);
  $('noteSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchNote();
  });
}

function renderNotebookCatalog() {
  const catalogList = $('catalogList');
  if (!catalogList) return;
  
  catalogList.innerHTML = '';
  notebookPages.forEach(note => {
    const li = document.createElement('li');
    li.textContent = note.name;
    li.dataset.id = note.id;
    if (note.id === currentNoteId) {
      li.style.background = '#2c6b9e';
      li.style.color = 'white';
    }
    li.addEventListener('click', () => {
      currentNoteId = note.id;
      $('noteTitle').value = note.name;
      $('noteEditor').innerHTML = note.html;
      renderNotebookCatalog();
    });
    catalogList.appendChild(li);
  });
}

function newNote() {
  const name = prompt('请输入笔记名称:', '新笔记');
  if (!name) return;
  
  const newNote = {
    id: Date.now().toString(),
    name,
    html: '<p>开始记录...</p>',
    text: '开始记录...',
    createdAt: new Date().toISOString()
  };
  
  notebookPages.push(newNote);
  currentNoteId = newNote.id;
  save(LS.notebook_pages, notebookPages);
  
  $('noteTitle').value = newNote.name;
  $('noteEditor').innerHTML = newNote.html;
  renderNotebookCatalog();
  showNotification('笔记创建成功');
}

function saveNote() {
  const title = $('noteTitle').value || '未命名笔记';
  const editor = $('noteEditor');
  
  const noteIndex = notebookPages.findIndex(n => n.id === currentNoteId);
  if (noteIndex !== -1) {
    notebookPages[noteIndex] = {
      ...notebookPages[noteIndex],
      name: title,
      html: editor.innerHTML,
      text: editor.innerText,
      updatedAt: new Date().toISOString()
    };
  } else {
    const newNote = {
      id: Date.now().toString(),
      name: title,
      html: editor.innerHTML,
      text: editor.innerText,
      createdAt: new Date().toISOString()
    };
    notebookPages.push(newNote);
    currentNoteId = newNote.id;
  }
  
  save(LS.notebook_pages, notebookPages);
  renderNotebookCatalog();
  showNotification('笔记已保存');
}

function exportNote() {
  const title = $('noteTitle').value || 'note';
  const editor = $('noteEditor');
  const content = `标题: ${title}\n\n${editor.innerText}`;
  
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
  a.download = title + '.txt';
  a.click();
}

function searchNote() {
  const query = $('noteSearch').value.trim().toLowerCase();
  if (!query) return;
  
  const results = notebookPages.filter(note => 
    note.text.toLowerCase().includes(query) || 
    note.name.toLowerCase().includes(query)
  );
  
  if (results.length > 0) {
    const firstResult = results[0];
    currentNoteId = firstResult.id;
    $('noteTitle').value = firstResult.name;
    $('noteEditor').innerHTML = firstResult.html;
    renderNotebookCatalog();
    showNotification(`找到${results.length}个相关笔记`);
  } else {
    showNotification('未找到相关笔记');
  }
}

/* ========== 学习流功能 ========== */
function renderFlowList() {
  const container = $('flowList');
  if (!container) return;
  
  container.innerHTML = '';
  flows.forEach(flow => {
    const div = document.createElement('div');
    div.className = 'flow-step';
    div.innerHTML = `
      <div>
        <strong style="font-size:1.1rem;">${escapeHtml(flow.title)}</strong>
        <p style="margin-top:4px;font-size:0.9rem;color:#666;">${flow.steps?.length || 0} 个步骤</p>
        <p style="font-size:0.8rem;color:#999;margin-top:4px;">
          创建于: ${new Date(flow.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="start-flow-btn" data-id="${flow.id}" style="padding:6px 12px;background:#e2e8f0;color:#2d3e50;border:none;border-radius:12px;cursor:pointer;">开始</button>
        <button class="delete-flow-btn" data-id="${flow.id}" style="background:#ff6b6b;color:white;border:none;padding:6px 12px;border-radius:12px;cursor:pointer;">删除</button>
      </div>
    `;
    container.appendChild(div);
  });
  
  $('completedFlows').textContent = flows.filter(f => f.completed).length.toString();
}

function addFlow() {
  const title = $('flowTitle').value.trim();
  if (!title) {
    showNotification('请输入学习流名称');
    return;
  }
  
  const flow = {
    id: Date.now().toString(),
    title,
    steps: [],
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  flows.push(flow);
  save(LS.flows, flows);
  renderFlowList();
  $('flowTitle').value = '';
  showNotification('学习流已创建');
}

function startFlow(id) {
  const flow = flows.find(f => f.id === id);
  if (flow) {
    showNotification(`开始学习流: ${flow.title}`);
  }
}

function deleteFlow(id) {
  flows = flows.filter(f => f.id !== id);
  save(LS.flows, flows);
  renderFlowList();
  showNotification('学习流已删除');
}

/* ========== 数据图表功能 ========== */
function initDataCharts() {
  setTimeout(() => {
    // 任务分布图表
    const taskCtx = $('taskChart')?.getContext('2d');
    if (taskCtx) {
      new Chart(taskCtx, {
        type: 'doughnut',
        data: {
          labels: ['重要且紧急', '重要不紧急', '紧急不重要', '不紧急不重要'],
          datasets: [{
            data: [
              tasks.filter(t => t.quadrant === 1).length,
              tasks.filter(t => t.quadrant === 2).length,
              tasks.filter(t => t.quadrant === 3).length,
              tasks.filter(t => t.quadrant === 4).length
            ],
            backgroundColor: ['#ff6b6b', '#1dd1a1', '#54a0ff', '#feca57']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
    
    // 番茄钟统计图表
    const tomatoCtx = $('tomatoChart')?.getContext('2d');
    if (tomatoCtx) {
      const today = new Date().toDateString();
      const thisWeek = tomatoLog.filter(t => {
        const logDate = new Date(t.date);
        const now = new Date();
        return logDate > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }).length;
      
      new Chart(tomatoCtx, {
        type: 'bar',
        data: {
          labels: ['今日', '本周', '总计'],
          datasets: [{
            label: '番茄钟数量',
            data: [
              tomatoLog.filter(t => new Date(t.date).toDateString() === today).length,
              thisWeek,
              tomatoLog.length
            ],
            backgroundColor: '#2c6b9e'
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
    
    // 每日学习时间图表
    const dailyCtx = $('dailyChart')?.getContext('2d');
    if (dailyCtx) {
      const dates = [];
      const data = [];
      const now = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        dates.push(dateStr);
        
        const dayLogs = tomatoLog.filter(t => {
          const logDate = new Date(t.date);
          return logDate.toDateString() === date.toDateString();
        });
        
        const totalMinutes = dayLogs.reduce((sum, log) => sum + (log.duration || 25), 0);
        data.push(totalMinutes);
      }
      
      new Chart(dailyCtx, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            label: '学习时间(分钟)',
            data: data,
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
    
    // 更新统计数据
    $('totalTomatoes').textContent = tomatoLog.length.toString();
    $('totalFocusMinutes').textContent = tomatoLog.reduce((sum, t) => sum + (t.duration || 25), 0).toString();
  }, 500);
}

/* ========== 闪卡功能 ========== */
function renderFlashcardQueue() {
  const container = $('flashcardQueue');
  if (!container) return;
  
  container.innerHTML = '';
  flashcards.forEach(card => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'flashcard';
    cardDiv.innerHTML = `
      <div style="font-size:1.2rem;font-weight:bold;margin-bottom:12px;min-height:60px;display:flex;align-items:center;justify-content:center;">
        ${escapeHtml(card.front)}
      </div>
      <div style="color:#666;margin-bottom:16px;min-height:40px;">${escapeHtml(card.back)}</div>
      <div style="display:flex;gap:8px;justify-content:center;">
        <button class="rate-card-btn" data-id="${card.id}" data-rating="easy" style="background:#2ecc71;color:white;border:none;padding:6px 12px;border-radius:12px;cursor:pointer;">简单</button>
        <button class="rate-card-btn" data-id="${card.id}" data-rating="medium" style="background:#f39c12;color:white;border:none;padding:6px 12px;border-radius:12px;cursor:pointer;">中等</button>
        <button class="rate-card-btn" data-id="${card.id}" data-rating="hard" style="background:#e74c3c;color:white;border:none;padding:6px 12px;border-radius:12px;cursor:pointer;">困难</button>
      </div>
      <div style="margin-top:12px;font-size:0.8rem;color:#999;">
        掌握度: ${Math.round((card.mastery || 0) * 100)}%
      </div>
    `;
    container.appendChild(cardDiv);
  });
  
  $('totalCards').textContent = flashcards.length.toString();
  const today = new Date().toDateString();
  $('todayReview').textContent = flashcards.filter(c => c.lastReviewed === today).length.toString();
  const mastered = flashcards.filter(c => (c.mastery || 0) >= 0.8).length;
  $('masteryRate').textContent = flashcards.length > 0 ? 
    Math.round(mastered / flashcards.length * 100) + '%' : '0%';
}

function addFlashcard() {
  const front = $('cardFront').value.trim();
  const back = $('cardBack').value.trim();
  const difficulty = $('cardDifficulty').value;
  
  if (!front || !back) {
    showNotification('请输入闪卡正反面内容');
    return;
  }
  
  const card = {
    id: Date.now().toString(),
    front,
    back,
    difficulty,
    mastery: 0,
    lastReviewed: null,
    createdAt: new Date().toISOString()
  };
  
  flashcards.push(card);
  save(LS.flashcards, flashcards);
  renderFlashcardQueue();
  
  $('cardFront').value = '';
  $('cardBack').value = '';
  showNotification('闪卡已添加');
}

function rateCard(id, rating) {
  const card = flashcards.find(c => c.id === id);
  if (card) {
    const ratings = { easy: 0.2, medium: 0.1, hard: -0.1 };
    card.mastery = Math.max(0, Math.min(1, (card.mastery || 0) + ratings[rating]));
    card.lastReviewed = new Date().toDateString();
    save(LS.flashcards, flashcards);
    renderFlashcardQueue();
    showNotification(`已标记为${rating === 'easy' ? '简单' : rating === 'medium' ? '中等' : '困难'}`);
  }
}

/* ========== 搜索功能 ========== */
function searchResources() {
  const query = $('searchInput').value.trim().toLowerCase();
  if (!query) {
    showNotification('请输入搜索内容');
    return;
  }
  
  const resources = [
    { title: '高效学习法总结 - 知乎专栏', url: '#', desc: '包含多种高效学习方法总结' },
    { title: '番茄工作法详解 - B站视频', url: '#', desc: '详细讲解番茄工作法的原理和实践' },
    { title: '四象限任务管理 - 知识库', url: '#', desc: '如何使用四象限法管理任务优先级' },
    { title: '记忆曲线理论 - 维基百科', url: '#', desc: '艾宾浩斯遗忘曲线的科学原理' },
    { title: '学习流设计模式 - GitHub', url: '#', desc: '如何设计高效的学习流程' },
    { title: 'JavaScript教程 - MDN', url: '#', desc: '权威的JavaScript编程指南' },
    { title: 'CSS布局指南 - 官方文档', url: '#', desc: '现代CSS布局技术详解' },
    { title: '编程算法学习 - LeetCode', url: '#', desc: '算法和数据结构练习平台' }
  ];
  
  const results = resources.filter(r => 
    r.title.toLowerCase().includes(query) || 
    r.desc.toLowerCase().includes(query)
  );
  
  const container = $('searchResults');
  container.innerHTML = '';
  
  if (results.length > 0) {
    results.forEach(r => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div style="font-weight:bold;">${r.title}</div>
        <div style="font-size:0.9rem;color:#666;">${r.desc}</div>
      `;
      div.style.cursor = 'pointer';
      div.addEventListener('click', () => {
        showNotification(`打开: ${r.title}`);
      });
      container.appendChild(div);
    });
  } else {
    const div = document.createElement('div');
    div.textContent = '未找到相关资源';
    container.appendChild(div);
  }
  
  searchHistory.push({query, time: new Date().toISOString()});
  if (searchHistory.length > 10) searchHistory.shift();
  save(LS.search_history, searchHistory);
}

/* ========== 黑暗模式功能 ========== */
function toggleTheme() {
  const isDark = document.body.classList.toggle('theme-dark');
  settings.theme = isDark ? 'dark' : 'light';
  save(LS.settings, settings);
  showNotification(`已切换为${isDark ? '深色' : '浅色'}主题`);
}

/* ========== 数据备份恢复 ========== */
function backupData() {
  const data = {
    tasks, flows, flashcards, tomatoLog, notebookPages, settings, searchHistory,
    drawingPages: JSON.parse(localStorage.getItem(LS.drawing_pages) || '{"pages":[""],"current":0}')
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `learning_assistant_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('数据备份已下载');
}

function restoreData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        if (confirm('恢复数据将覆盖当前数据，确定继续？')) {
          tasks = data.tasks || [];
          flows = data.flows || [];
          flashcards = data.flashcards || [];
          tomatoLog = data.tomatoLog || [];
          notebookPages = data.notebookPages || [{id: Date.now().toString(), name: '我的笔记', html: '<p>欢迎开始记录学习～</p>', text: '欢迎开始记录学习～'}];
          settings = data.settings || {theme: 'light', autoStartBreak: false};
          searchHistory = data.searchHistory || [];
          if (data.drawingPages) {
            localStorage.setItem(LS.drawing_pages, JSON.stringify(data.drawingPages));
          }
          save(LS.tasks, tasks);
          save(LS.flows, flows);
          save(LS.flashcards, flashcards);
          save(LS.tomato_log, tomatoLog);
          save(LS.notebook_pages, notebookPages);
          save(LS.settings, settings);
          save(LS.search_history, searchHistory);
          location.reload();
        }
      } catch(err) {
        showNotification('恢复失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* ========== 标签页切换 ========== */
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $(tabName).classList.add('active');
    });
  });
}

/* ========== 初始化所有功能 ========== */
document.addEventListener('DOMContentLoaded', () => {
  // 设置标签页
  setupTabs();
  
  // 初始化各模块
  initCalculator();
  initDrawing();
  initNotebook();
  renderAllTaskLists();
  renderFlowList();
  renderFlashcardQueue();
  initDataCharts();
  
  // 主题设置
  if (settings.theme === 'dark') document.body.classList.add('theme-dark');
  $('themeToggle').addEventListener('click', toggleTheme);
  
  // 番茄钟事件
  updateTimerDisplay();
  $('startTimer').addEventListener('click', startTomato);
  $('pauseTimer').addEventListener('click', pauseTomato);
  $('resetTimer').addEventListener('click', resetTomato);
  $('workTimeMinutes').addEventListener('change', e => { 
    workMins = parseInt(e.target.value) || 0; 
    if (!isTomatoRunning && isWorkMode) tomatoRemaining = workMins * 60 + workSecs; 
    updateTimerDisplay(); 
  });
  $('workTimeSeconds').addEventListener('change', e => { 
    workSecs = parseInt(e.target.value) || 0; 
    if (!isTomatoRunning && isWorkMode) tomatoRemaining = workMins * 60 + workSecs; 
    updateTimerDisplay(); 
  });
  $('breakTimeMinutes').addEventListener('change', e => { breakMins = parseInt(e.target.value) || 0; });
  $('breakTimeSeconds').addEventListener('change', e => { breakSecs = parseInt(e.target.value) || 0; });
  $('autoStartBreak').addEventListener('change', e => { 
    settings.autoStartBreak = e.target.checked; 
    save(LS.settings, settings); 
  });
  
  // 任务管理事件
  $('addTask').addEventListener('click', addTask);
  $('taskTitle').addEventListener('keypress', e => {
    if (e.key === 'Enter') addTask();
  });
  
  // 任务事件委托
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-task-btn')) {
      deleteTask(e.target.dataset.id);
    }
    if (e.target.classList.contains('progress-btn')) {
      updateTaskProgress(e.target.dataset.id, parseInt(e.target.dataset.change));
    }
  });
  
  // 学习流事件
  $('addFlow').addEventListener('click', addFlow);
  $('flowTitle').addEventListener('keypress', e => {
    if (e.key === 'Enter') addFlow();
  });
  
  // 学习流事件委托
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('start-flow-btn')) {
      startFlow(e.target.dataset.id);
    }
    if (e.target.classList.contains('delete-flow-btn')) {
      deleteFlow(e.target.dataset.id);
    }
  });
  
  // 闪卡事件
  $('addFlashcard').addEventListener('click', addFlashcard);
  $('cardFront').addEventListener('keypress', e => {
    if (e.key === 'Enter') addFlashcard();
  });
  $('reviewAll').addEventListener('click', () => {
    showNotification('开始复习所有闪卡');
  });
  
  // 闪卡事件委托
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('rate-card-btn')) {
      rateCard(e.target.dataset.id, e.target.dataset.rating);
    }
  });
  
  // 搜索事件
  $('searchBtn').addEventListener('click', searchResources);
  $('searchInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') searchResources();
  });
  
  // 备份恢复事件
  $('backupBtn').addEventListener('click', backupData);
  $('restoreBtn').addEventListener('click', restoreData);
  
  // 初始通知
  setTimeout(() => {
    showNotification('高效学习小卫士已加载完成！');
  }, 500);
});