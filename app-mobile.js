// Arquivo: app-mobile.js | Versão: 1 (Task Easier — página mobile/web, fora da extensão)
// ═══════════════════════════════════════════════════════════
//  PÁGINA COMPACTA PARA CELULAR
//  Mesma lógica de tela do popup.html da extensão (adição rápida +
//  lista de hoje), adaptada para funcionar como página web comum,
//  com login explícito via Google Identity Services (gis-shim.js)
//  em vez de chrome.identity.
// ═══════════════════════════════════════════════════════════

// ── I18N (PT-BR / EN) ────────────────────────────────────────
const I18N = {
  pt: {
    login_intro: 'Entre com sua conta Google para gerenciar suas tarefas do Google Tasks e eventos do Google Calendar.',
    signin_btn: 'Entrar com o Google',
    signout_btn: 'Sair',
    coffee_text_short: 'Apoie',
    tab_new: '➕ Nova',
    tab_tasks: '📋 Hoje',
    ph_title: 'Título...',
    type_task: 'Tarefa',
    type_event: 'Evento',
    label_event_color: 'Cor do evento',
    notes_placeholder: 'Notas (opcional)',
    color_tooltip_event: 'Cor do evento ({name})',
    color_orange: 'Laranja', color_blue: 'Azul', color_green: 'Verde', color_red: 'Vermelho',
    color_yellow: 'Amarelo', color_purple: 'Roxo', color_gray: 'Cinza', color_cyan: 'Ciano',
    error_loading_prefix: 'Erro ao carregar: ',
    error_prefix: 'Erro: ',
    toast_event_created: 'Evento criado!',
    toast_task_created: 'Tarefa criada!',
    toast_no_list_found: 'Nenhuma lista de tarefas encontrada',
    tasks_loading: 'Carregando tarefas…',
    tasks_empty: 'Nenhuma tarefa para hoje',
    delete_title: 'Excluir',
    toast_deleted: 'Excluído.',
    btn_add_title: 'Adicionar'
  },
  en: {
    login_intro: 'Sign in with your Google account to manage your Google Tasks and Google Calendar events.',
    signin_btn: 'Sign in with Google',
    signout_btn: 'Sign out',
    coffee_text_short: 'Support',
    tab_new: '➕ New',
    tab_tasks: '📋 Today',
    ph_title: 'Title...',
    type_task: 'Task',
    type_event: 'Event',
    label_event_color: 'Event color',
    notes_placeholder: 'Notes (optional)',
    color_tooltip_event: 'Event color ({name})',
    color_orange: 'Orange', color_blue: 'Blue', color_green: 'Green', color_red: 'Red',
    color_yellow: 'Yellow', color_purple: 'Purple', color_gray: 'Gray', color_cyan: 'Cyan',
    error_loading_prefix: 'Error loading: ',
    error_prefix: 'Error: ',
    toast_event_created: 'Event created!',
    toast_task_created: 'Task created!',
    toast_no_list_found: 'No task list found',
    tasks_loading: 'Loading tasks…',
    tasks_empty: 'No tasks for today',
    delete_title: 'Delete',
    toast_deleted: 'Deleted.',
    btn_add_title: 'Add'
  }
};

let currentLang = 'pt';
try { currentLang = localStorage.getItem('te-site-lang') || 'pt'; } catch (e) { /* ignore */ }

function T(key) {
  var dict = I18N[currentLang] || I18N.pt;
  return (dict[key] !== undefined) ? dict[key] : (I18N.pt[key] !== undefined ? I18N.pt[key] : key);
}

function tf(key, params) {
  var str = T(key);
  if (params) {
    Object.keys(params).forEach(function(k) {
      str = str.split('{' + k + '}').join(params[k]);
    });
  }
  return str;
}

var COLOR_NAME_KEYS = { '6': 'color_orange', '9': 'color_blue', '10': 'color_green', '11': 'color_red', '5': 'color_yellow', '3': 'color_purple', '8': 'color_gray', '7': 'color_cyan' };
function colorName(id) {
  var key = COLOR_NAME_KEYS[id];
  return key ? T(key) : '';
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    el.textContent = T(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    el.placeholder = T(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
    el.title = T(el.dataset.i18nTitle);
  });
  document.querySelectorAll('.lang-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.lang === currentLang);
  });
  document.documentElement.lang = currentLang === 'en' ? 'en' : 'pt-BR';
}

function setLang(lang) {
  if (lang !== 'pt' && lang !== 'en') return;
  currentLang = lang;
  try { localStorage.setItem('te-site-lang', lang); } catch (e) { /* ignore */ }
  applyI18n();
  if (typeof colorVal !== 'undefined') {
    var block = document.getElementById('qa-color-block');
    if (block && typeof updateColorBlock === 'function') updateColorBlock(block);
  }
}

function initLangSwitch() {
  document.querySelectorAll('.lang-btn').forEach(function(b) {
    b.addEventListener('click', function() { setLang(b.dataset.lang); });
  });
  applyI18n();
}
initLangSwitch();

// ── CORES DE EVENTO (mesmas da extensão) ────────────────────
const EVENT_COLORS = [
  { id: '6',  icon: '🟧', name: 'Laranja',  hex: '#F4511E' },
  { id: '9',  icon: '🟦', name: 'Azul',     hex: '#3F51B5' },
  { id: '10', icon: '🟩', name: 'Verde',    hex: '#0B8043' },
  { id: '11', icon: '🟥', name: 'Vermelho', hex: '#D50000' },
  { id: '5',  icon: '🟨', name: 'Amarelo',  hex: '#F6BF26' },
  { id: '3',  icon: '🟪', name: 'Roxo',     hex: '#8E24AA' },
  { id: '8',  icon: '⬜', name: 'Cinza',    hex: '#616161' },
  { id: '7',  icon: '🔷', name: 'Ciano',    hex: '#039BE5' }
];
const DEFAULT_EVENT_COLOR = '6';

// ── PALETA DE CORES (popover ao tocar no bloco de cor) ──────
var colorPopoverEl = null;
function closeColorPopover() {
  if (colorPopoverEl) { colorPopoverEl.remove(); colorPopoverEl = null; }
  document.removeEventListener('mousedown', onColorPopoverOutside, true);
  document.removeEventListener('keydown', onColorPopoverEscape, true);
}
function onColorPopoverOutside(e) {
  if (colorPopoverEl && !colorPopoverEl.contains(e.target)) closeColorPopover();
}
function onColorPopoverEscape(e) {
  if (e.key === 'Escape') closeColorPopover();
}
function openColorPopover(anchorEl, currentId, onSelect) {
  closeColorPopover();
  var pop = document.createElement('div');
  pop.className = 'color-popover';
  EVENT_COLORS.forEach(function(c) {
    var sw = document.createElement('div');
    sw.className = 'swatch' + (c.id === (currentId || DEFAULT_EVENT_COLOR) ? ' selected' : '');
    sw.style.background = c.hex;
    sw.title = colorName(c.id);
    if (c.id === (currentId || DEFAULT_EVENT_COLOR)) {
      sw.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    }
    sw.addEventListener('click', function(e) {
      e.stopPropagation();
      closeColorPopover();
      onSelect(c.id);
    });
    pop.appendChild(sw);
  });
  document.body.appendChild(pop);
  var rect = anchorEl.getBoundingClientRect();
  var popRect = pop.getBoundingClientRect();
  var left = Math.min(rect.left, window.innerWidth - popRect.width - 8);
  var top = rect.bottom + 4;
  if (top + popRect.height > window.innerHeight) top = Math.max(4, rect.top - popRect.height - 4);
  pop.style.left = Math.max(4, left) + 'px';
  pop.style.top = top + 'px';
  colorPopoverEl = pop;
  setTimeout(function() {
    document.addEventListener('mousedown', onColorPopoverOutside, true);
    document.addEventListener('keydown', onColorPopoverEscape, true);
  }, 0);
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }

// ── CHAMADAS AO GOOGLE (via gis-shim.js) ─────────────────────
function gsCall(fn, args) {
  return new Promise(function(resolve, reject) {
    var runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
    runner[fn].apply(runner, args);
  });
}

// ── ESTADO ────────────────────────────────────────────────
var taskLists   = [];
var todayEvents = []; // só para calcular o próximo horário livre (nextEventSlot)
var colorVal    = DEFAULT_EVENT_COLOR;
var todayISO, todayBR;

function resolveMainListId() {
  return taskLists.length ? taskLists[0].id : null;
}

// Encadeia o próximo evento 15 minutos após o último já existente no dia
// escolhido (ou sugere 09:00 se não houver nenhum) — mesma lógica da extensão.
function nextEventSlot(dateISO) {
  var dayEvents = todayEvents.filter(function(t) {
    return t.type === 'event' && t.due === dateISO && t.dueTime;
  });
  if (!dayEvents.length) return { h: 9, mi: 0 };
  var maxMinutes = -1;
  dayEvents.forEach(function(t) {
    var p = t.dueTime.split(':').map(Number);
    var mins = p[0] * 60 + p[1];
    if (mins > maxMinutes) maxMinutes = mins;
  });
  var nextMinutes = maxMinutes + 15;
  return { h: Math.floor(nextMinutes / 60) % 24, mi: nextMinutes % 60 };
}

function showToast(msg, ok) {
  var el = document.getElementById('qa-toast');
  el.textContent = msg;
  el.className = ok ? 'ok' : 'err';
  el.classList.remove('hidden');
  setTimeout(function() { el.classList.add('hidden'); }, 2200);
}

// ── ABA "TAREFAS" (visualização em lista, marcar concluído) ──
function renderTasksList(items) {
  var listEl   = document.getElementById('tasks-list');
  var emptyEl  = document.getElementById('tasks-empty');
  var loadEl   = document.getElementById('tasks-loading');
  loadEl.classList.add('hidden');
  listEl.innerHTML = '';

  if (!items.length) {
    emptyEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  listEl.classList.remove('hidden');

  items.forEach(function(t) {
    var isEvent = t.type === 'event';
    var row = document.createElement('div');
    row.className = 'task-row' + (t.status === 'completed' ? ' done' : '');

    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = t.status === 'completed';
    chk.addEventListener('change', function() {
      var willBeDone = chk.checked;
      chk.disabled = true;
      var call = isEvent
        ? gsCall('toggleEventStatus', [t.taskId, willBeDone])
        : gsCall('updateField', [t.listId, t.taskId, 'status', willBeDone ? 'completed' : 'needsAction']);
      call
        .then(function() {
          t.status = willBeDone ? 'completed' : 'needsAction';
          row.classList.toggle('done', willBeDone);
          chk.disabled = false;
        })
        .catch(function(e) { chk.disabled = false; chk.checked = !willBeDone; showToast(T('error_prefix') + e.message, false); });
    });

    var title = document.createElement('div');
    title.className = 'task-col-notes';
    title.textContent = t.title || '—';

    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'task-del-btn';
    delBtn.title = T('delete_title');
    delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';
    if (isEvent) {
      var delColor = (EVENT_COLORS.find(function(c) { return c.id === (t.color || DEFAULT_EVENT_COLOR); }) || {}).hex;
      if (delColor) delBtn.style.color = delColor;
    }
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      delBtn.disabled = true;
      var delCall = isEvent ? gsCall('deleteEvent', [t.taskId]) : gsCall('deleteTask', [t.listId, t.taskId]);
      delCall
        .then(function() {
          row.remove();
          if (!listEl.children.length) {
            emptyEl.classList.remove('hidden');
            listEl.classList.add('hidden');
          }
        })
        .catch(function(e) { delBtn.disabled = false; showToast(T('error_prefix') + e.message, false); });
    });

    row.appendChild(chk);
    row.appendChild(title);
    row.appendChild(delBtn);
    listEl.appendChild(row);
  });
}

function loadTasksView() {
  var loadEl  = document.getElementById('tasks-loading');
  var emptyEl = document.getElementById('tasks-empty');
  var listEl  = document.getElementById('tasks-list');
  emptyEl.classList.add('hidden');
  listEl.classList.add('hidden');
  loadEl.classList.remove('hidden');
  Promise.all([gsCall('getTasks', [true]), gsCall('getEvents', [true])])
    .then(function(results) {
      var tasks  = results[0] || [];
      var events = results[1] || [];
      var todays = tasks.concat(events).filter(function(t) { return t.due === todayISO; });
      renderTasksList(todays);
    })
    .catch(function(e) {
      loadEl.textContent = T('error_loading_prefix') + e.message;
    });
}

function switchTab(name) {
  var btnNew   = document.getElementById('tab-new');
  var btnTasks = document.getElementById('tab-tasks');
  var formEl   = document.getElementById('quick-form');
  var viewEl   = document.getElementById('tasks-view');
  var isTasks  = name === 'tasks';
  btnNew.classList.toggle('active', !isTasks);
  btnTasks.classList.toggle('active', isTasks);
  formEl.classList.toggle('hidden', isTasks);
  viewEl.classList.toggle('hidden', !isTasks);
  if (isTasks) loadTasksView();
}

document.getElementById('tab-new').addEventListener('click', function() { switchTab('new'); });
document.getElementById('tab-tasks').addEventListener('click', function() { switchTab('tasks'); });

function updateColorBlock(block) {
  var c = EVENT_COLORS.find(function(c) { return c.id === colorVal; }) || {};
  block.style.background = c.hex || '#F4511E';
  block.title = tf('color_tooltip_event', { name: colorName(colorVal) });
}

function resetForm() {
  document.getElementById('qa-title').value = '';
  document.getElementById('qa-date').value = todayISO;
  document.getElementById('qa-notes').value = todayBR + ' - ';
  document.getElementById('qa-title').focus();
}

var formWired = false;

// Prepara os campos do formulário de adição rápida e a lista de hoje —
// chamado uma única vez, depois do primeiro login bem-sucedido.
async function startApp() {
  var today = new Date();
  todayISO = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
  todayBR  = pad2(today.getDate()) + '/' + pad2(today.getMonth() + 1) + '/' + String(today.getFullYear()).slice(-2);

  var lists  = await gsCall('getTaskLists', []);
  taskLists  = lists;
  var events = await gsCall('getEvents', [false]);
  todayEvents = events;

  var listSelect  = document.getElementById('qa-list');
  var colorBlock  = document.getElementById('qa-color-block');
  var dateInput   = document.getElementById('qa-date');
  var notesInput  = document.getElementById('qa-notes');
  var titleInput  = document.getElementById('qa-title');
  var addBtn      = document.getElementById('qa-add-btn');

  var mainListId = resolveMainListId();

  listSelect.value = '__task__';
  updateColorBlock(colorBlock);
  dateInput.value = todayISO;
  notesInput.value = todayBR + ' - ';

  function syncColorVisibility() {
    colorBlock.classList.toggle('hidden', listSelect.value !== '__calendar__');
  }
  syncColorVisibility();

  if (!formWired) {
    formWired = true;

    listSelect.addEventListener('change', syncColorVisibility);

    colorBlock.addEventListener('click', function(e) {
      e.stopPropagation();
      openColorPopover(colorBlock, colorVal, function(newColor) {
        colorVal = newColor;
        updateColorBlock(colorBlock);
      });
    });

    document.getElementById('quick-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var title = titleInput.value.trim();
      if (!title) return;
      var listVal  = listSelect.value;
      var dateVal  = dateInput.value;
      var notesVal = notesInput.value.trim();

      titleInput.disabled = true;
      addBtn.disabled = true;

      if (listVal === '__calendar__') {
        var evDateStr = dateVal || todayISO;
        var slot = nextEventSlot(evDateStr);
        var dp = evDateStr.split('-').map(Number);
        var base = new Date(dp[0], dp[1] - 1, dp[2], slot.h, slot.mi);
        gsCall('createEventQuick', [title, base.getFullYear(), base.getMonth() + 1, base.getDate(), base.getHours(), base.getMinutes(), notesVal, colorVal])
          .then(function(created) {
            todayEvents.unshift(created);
            titleInput.disabled = false;
            addBtn.disabled = false;
            resetForm();
            showToast(T('toast_event_created'), true);
          })
          .catch(function(e) { titleInput.disabled = false; addBtn.disabled = false; showToast(T('error_prefix') + e.message, false); });
      } else {
        var targetListId = mainListId || (taskLists.length ? taskLists[0].id : null);
        if (!targetListId) {
          titleInput.disabled = false;
          addBtn.disabled = false;
          showToast(T('toast_no_list_found'), false);
          return;
        }
        gsCall('createTask', [targetListId, title, dateVal || null, notesVal || null])
          .then(function() {
            titleInput.disabled = false;
            addBtn.disabled = false;
            resetForm();
            showToast(T('toast_task_created'), true);
          })
          .catch(function(e) { titleInput.disabled = false; addBtn.disabled = false; showToast(T('error_prefix') + e.message, false); });
      }
    });
  }

  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
  switchTab('new');
  titleInput.focus();
}

// ── LOGIN / LOGOUT ────────────────────────────────────────
function showLoginError(msg) {
  var el = document.getElementById('login-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

(function initAuth() {
  var signinBtn  = document.getElementById('signin-btn');
  var signoutBtn = document.getElementById('signout-btn');

  signinBtn.addEventListener('click', function() {
    signinBtn.disabled = true;
    document.getElementById('login-error').classList.add('hidden');
    window.TaskEasierAuth.requestSignIn()
      .then(function() { return startApp(); })
      .then(function() { signinBtn.disabled = false; })
      .catch(function(e) {
        signinBtn.disabled = false;
        showLoginError(T('error_prefix') + (e && e.message ? e.message : e));
      });
  });

  signoutBtn.addEventListener('click', function() {
    window.TaskEasierAuth.signOut();
    taskLists = [];
    todayEvents = [];
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-error').classList.add('hidden');
  });
})();
