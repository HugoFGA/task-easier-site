// Arquivo: app-mobile.js | Versão: 5 (Task Easier — página mobile/web, fora da extensão)
// ═══════════════════════════════════════════════════════════
//  PÁGINA COMPACTA PARA CELULAR
//  Mesma lógica de tela do popup.html da extensão (adição rápida +
//  lista de pendências), adaptada para funcionar como página web comum,
//  com login explícito via Google Identity Services (gis-shim.js)
//  em vez de chrome.identity.
// ═══════════════════════════════════════════════════════════

// Exibido no canto inferior direito da página — ajuda a confirmar que a
// versão mais recente carregou (útil ao testar cache de PWA instalado).
var APP_VERSION = 'v5';

// ── TEMA CLARO/ESCURO ────────────────────────────────────────────────
var THEME_KEY = 'te-site-theme';
var currentTheme = 'light';
try { currentTheme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { /* ignore */ }

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  var btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#161719' : '#F4511E');
}
applyTheme(currentTheme);

(function initThemeSwitch() {
  var btn = document.getElementById('theme-btn');
  if (!btn) return;
  btn.addEventListener('click', function() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, currentTheme); } catch (e) { /* ignore */ }
    applyTheme(currentTheme);
  });
})();

// ── I18N (PT-BR / EN) ────────────────────────────────────────
const I18N = {
  pt: {
    login_intro: 'Entre com sua conta Google para gerenciar suas tarefas do Google Tasks e eventos do Google Calendar.',
    signin_btn: 'Entrar com o Google',
    signout_btn: 'Sair',
    coffee_text_short: 'Apoie',
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
    tasks_empty: 'Nenhuma tarefa ou evento',
    delete_title: 'Excluir',
    toast_removed_undo: 'Removido. Toque para desfazer.',
    toast_removed_undo_n: '{n} removidos. Toque para desfazer.',
    btn_add_title: 'Adicionar'
  },
  en: {
    login_intro: 'Sign in with your Google account to manage your Google Tasks and Google Calendar events.',
    signin_btn: 'Sign in with Google',
    signout_btn: 'Sign out',
    coffee_text_short: 'Support',
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
    tasks_empty: 'No tasks or events',
    delete_title: 'Delete',
    toast_removed_undo: 'Removed. Tap to undo.',
    toast_removed_undo_n: '{n} removed. Tap to undo.',
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

// Rótulo do tipo (Tarefa/Evento) selecionado no formulário — não usa
// data-i18n genérico porque o texto depende do estado (currentType), não
// de uma chave fixa.
var currentType = '__task__';
function updateTypeToggle() {
  var label = document.getElementById('qa-type-label');
  if (!label) return;
  label.textContent = T(currentType === '__calendar__' ? 'type_event' : 'type_task');
  var colorBlock = document.getElementById('qa-color-block');
  if (colorBlock) colorBlock.classList.toggle('hidden', currentType !== '__calendar__');
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
  updateTypeToggle();
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

// Mostra a versão no canto inferior direito.
(function showVersion() {
  var el = document.getElementById('app-version');
  if (el) el.textContent = APP_VERSION;
})();

// ── ÍCONE "INSTALAR NO CELULAR" ──────────────────────────────────────
// O Chrome/Android só mostra o banner automático de instalação uma vez
// (e às vezes nem isso). Este botão fica visível sempre que o navegador
// sinaliza que a página é instalável, para a pessoa poder instalar quando
// quiser, sem depender do banner automático.
(function setupInstallButton() {
  var btn = document.getElementById('install-btn');
  if (!btn) return;
  var deferredPrompt = null;

  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
  if (isStandalone) return; // já instalado/rodando como app — não mostra o botão

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    btn.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', function() {
    deferredPrompt = null;
    btn.classList.add('hidden');
  });

  btn.addEventListener('click', function() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function() {
      deferredPrompt = null;
      btn.classList.add('hidden');
    });
  });
})();

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

// ── BANNER NO TOPO (confirmação de criação) ───────────────────────────
var toastHideTimer = null;
function showToast(msg, type) {
  var el = document.getElementById('qa-toast');
  el.textContent = msg;
  el.className = type || 'ok';
  el.classList.remove('hidden');
  clearTimeout(toastHideTimer);
  toastHideTimer = setTimeout(function() { el.classList.add('hidden'); }, 2200);
}

// ── BALÃO VERDE "DESFAZER" (canto superior direito) ───────────────────
// Some tanto ao excluir quanto ao marcar algo como concluído — a linha
// some da tela na hora (otimista), mas a mudança de verdade no Google só
// acontece depois de 5s. Tocar no balão cancela e restaura a linha.
var undoBalloonTimer = null;
function hideUndoBalloon() {
  var el = document.getElementById('undo-balloon');
  el.classList.add('hidden');
  el.onclick = null;
  clearTimeout(undoBalloonTimer);
}
function showUndoBalloon(msg, onClick) {
  var el = document.getElementById('undo-balloon');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.onclick = onClick;
  clearTimeout(undoBalloonTimer);
  undoBalloonTimer = setTimeout(hideUndoBalloon, 5000);
}

var pendingUndos = [];

function checkEmptyState() {
  var listEl  = document.getElementById('tasks-list');
  var emptyEl = document.getElementById('tasks-empty');
  if (!listEl.children.length) {
    emptyEl.classList.remove('hidden');
    listEl.classList.add('hidden');
  } else {
    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');
  }
}

function updateUndoBalloon() {
  var n = pendingUndos.length;
  if (!n) { hideUndoBalloon(); return; }
  var msg = n === 1 ? T('toast_removed_undo') : tf('toast_removed_undo_n', { n: n });
  showUndoBalloon(msg, function() {
    pendingUndos.slice().forEach(function(entry) { entry.restore(); });
    pendingUndos = [];
    hideUndoBalloon();
  });
}

// Remove a linha na hora (otimista) e só executa a ação de verdade (excluir
// ou marcar concluído) depois de 5s — dá tempo de desfazer pelo balão.
function scheduleRowAction(row, listEl, doActionFn) {
  var nextSibling = row.nextSibling;
  var parent = row.parentNode || listEl;
  row.remove();
  checkEmptyState();

  var entry = {
    timer: null,
    restore: function() {
      clearTimeout(entry.timer);
      if (nextSibling && nextSibling.parentNode === parent) parent.insertBefore(row, nextSibling);
      else parent.appendChild(row);
      checkEmptyState();
      var idx = pendingUndos.indexOf(entry);
      if (idx > -1) pendingUndos.splice(idx, 1);
    }
  };
  entry.timer = setTimeout(function() {
    var idx = pendingUndos.indexOf(entry);
    if (idx > -1) pendingUndos.splice(idx, 1);
    doActionFn().catch(function(e) { showToast(T('error_prefix') + e.message, 'err'); });
    if (!pendingUndos.length) hideUndoBalloon();
  }, 5000);

  pendingUndos.push(entry);
  updateUndoBalloon();
}

// ── LISTA DE PENDÊNCIAS (marcar concluído, excluir) ──────────────────
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
    row.className = 'task-row';

    // Barra de cor na frente da linha: usa a cor do evento; nas tarefas
    // (sem cor própria) fica neutra, só para manter o alinhamento.
    var colorBar = document.createElement('div');
    colorBar.className = 'task-color-bar';
    if (isEvent) {
      var barColor = (EVENT_COLORS.find(function(c) { return c.id === (t.color || DEFAULT_EVENT_COLOR); }) || {}).hex;
      if (barColor) colorBar.style.background = barColor;
    }

    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = false;
    chk.addEventListener('change', function() {
      if (!chk.checked) return; // nesta lista só há pendentes; marcar sempre é "concluir"
      scheduleRowAction(row, listEl, function() {
        return isEvent
          ? gsCall('toggleEventStatus', [t.taskId, true])
          : gsCall('updateField', [t.listId, t.taskId, 'status', 'completed']);
      });
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
      scheduleRowAction(row, listEl, function() {
        return isEvent ? gsCall('deleteEvent', [t.taskId]) : gsCall('deleteTask', [t.listId, t.taskId]);
      });
    });

    row.appendChild(colorBar);
    row.appendChild(chk);
    row.appendChild(title);
    row.appendChild(delBtn);
    listEl.appendChild(row);
  });
}

// Lista só as tarefas e eventos PENDENTES (concluídos não aparecem mais),
// ordenados por data/hora (os sem data ficam no fim) — a página inteira
// rola normalmente; só o formulário no topo fica fixo.
function loadTasksView() {
  var loadEl  = document.getElementById('tasks-loading');
  var emptyEl = document.getElementById('tasks-empty');
  var listEl  = document.getElementById('tasks-list');
  emptyEl.classList.add('hidden');
  listEl.classList.add('hidden');
  loadEl.classList.remove('hidden');
  Promise.all([gsCall('getTasks', [false]), gsCall('getEvents', [false])])
    .then(function(results) {
      var tasks  = results[0] || [];
      var events = results[1] || [];
      var all = tasks.concat(events).sort(function(a, b) {
        var da = a.due || '9999-99-99', db = b.due || '9999-99-99';
        if (da !== db) return da < db ? -1 : 1;
        var ta = a.dueTime || '99:99', tb = b.dueTime || '99:99';
        return ta < tb ? -1 : (ta > tb ? 1 : 0);
      });
      renderTasksList(all);
    })
    .catch(function(e) {
      loadEl.textContent = T('error_loading_prefix') + e.message;
    });
}

function updateColorBlock(block) {
  var c = EVENT_COLORS.find(function(c) { return c.id === colorVal; }) || {};
  block.style.background = c.hex || '#F4511E';
  block.title = tf('color_tooltip_event', { name: colorName(colorVal) });
}

// Notas fica vazia por padrão (só o placeholder itálico aparece). A data só
// é gravada na frente do texto se a pessoa realmente escrever algo.
function resetForm() {
  document.getElementById('qa-title').value = '';
  document.getElementById('qa-date').value = todayISO;
  document.getElementById('qa-notes').value = '';
  document.getElementById('qa-title').focus();
}

var formWired = false;

// Prepara os campos do formulário de adição rápida e a lista de pendências
// — chamado uma única vez, depois do primeiro login bem-sucedido.
async function startApp() {
  var today = new Date();
  todayISO = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
  todayBR  = pad2(today.getDate()) + '/' + pad2(today.getMonth() + 1) + '/' + String(today.getFullYear()).slice(-2);

  var lists  = await gsCall('getTaskLists', []);
  taskLists  = lists;
  var events = await gsCall('getEvents', [false]);
  todayEvents = events;

  var typeToggle  = document.getElementById('qa-type-toggle');
  var colorBlock  = document.getElementById('qa-color-block');
  var dateInput   = document.getElementById('qa-date');
  var notesInput  = document.getElementById('qa-notes');
  var titleInput  = document.getElementById('qa-title');
  var addBtn      = document.getElementById('qa-add-btn');

  var mainListId = resolveMainListId();

  currentType = '__task__';
  updateTypeToggle();
  updateColorBlock(colorBlock);
  dateInput.value = todayISO;
  notesInput.value = '';

  if (!formWired) {
    formWired = true;

    // Alterna Tarefa/Evento com um toque, sem abrir nenhuma lista.
    typeToggle.addEventListener('click', function() {
      currentType = currentType === '__task__' ? '__calendar__' : '__task__';
      updateTypeToggle();
    });

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
      var listVal   = currentType;
      var dateVal   = dateInput.value;
      var notesRaw  = notesInput.value.trim();
      // Só grava a data na frente das notas se a pessoa escreveu algo.
      var notesVal  = notesRaw ? (todayBR + ' - ' + notesRaw) : '';

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
            showToast(T('toast_event_created'), 'ok');
            loadTasksView();
          })
          .catch(function(e) { titleInput.disabled = false; addBtn.disabled = false; showToast(T('error_prefix') + e.message, 'err'); });
      } else {
        var targetListId = mainListId || (taskLists.length ? taskLists[0].id : null);
        if (!targetListId) {
          titleInput.disabled = false;
          addBtn.disabled = false;
          showToast(T('toast_no_list_found'), 'err');
          return;
        }
        gsCall('createTask', [targetListId, title, dateVal || null, notesVal || null])
          .then(function() {
            titleInput.disabled = false;
            addBtn.disabled = false;
            resetForm();
            showToast(T('toast_task_created'), 'ok');
            loadTasksView();
          })
          .catch(function(e) { titleInput.disabled = false; addBtn.disabled = false; showToast(T('error_prefix') + e.message, 'err'); });
      }
    });
  }

  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('quick-form-wrap').classList.remove('hidden');
  document.getElementById('tasks-view').classList.remove('hidden');
  loadTasksView();
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
    pendingUndos = [];
    hideUndoBalloon();
    document.getElementById('quick-form-wrap').classList.add('hidden');
    document.getElementById('tasks-view').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-error').classList.add('hidden');
  });
})();
