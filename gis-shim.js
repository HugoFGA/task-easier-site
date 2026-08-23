// ═══════════════════════════════════════════════════════════
//  TASK EASIER — Página mobile (fora da extensão)
//  Arquivo: gis-shim.js | Versão: 2
//
//  Igual ao gas-shim.js da extensão Chrome (mesmas chamadas às APIs
//  do Google Tasks e Calendar via fetch()), só que a autenticação usa
//  o Google Identity Services (GIS) em vez de chrome.identity — assim
//  funciona em qualquer navegador, inclusive no celular, sem precisar
//  ser uma extensão.
//
//  Expõe "window.google.script.run" com a MESMA forma usada no app.js
//  da extensão/Apps Script, para reaproveitar a mesma lógica de tela.
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // Cole aqui o Client ID do tipo "Aplicativo Web" (Web application),
  // criado no mesmo projeto do Google Cloud — é diferente do Client ID
  // da extensão (tipo "Aplicativo Chrome"). Em "Authorized JavaScript
  // origins" desse client, adicione exatamente a origem onde esta
  // página está hospedada (ex.: https://hugofga.github.io).
  var WEB_CLIENT_ID = '12609428896-9vhd2175v6ha23jdqfhu3r8qsbnau1go.apps.googleusercontent.com';
  var SCOPES = 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar.events';

  var TASKS_BASE = 'https://tasks.googleapis.com/tasks/v1';
  var CAL_BASE   = 'https://www.googleapis.com/calendar/v3';

  // Mesmas constantes usadas no Code.gs / gas-shim.js originais — o
  // texto da tag precisa continuar IGUAL, pois é ele que identifica,
  // dentro da sua agenda, quais eventos pertencem ao app.
  var EVENT_RANGE_PAST_DAYS   = 7;
  var EVENT_RANGE_FUTURE_DAYS = 14;
  var EVENT_TAG_TEXT = '[Criado pelo Google Tasks Manager]';
  var EVENT_TAG      = '\n\n' + EVENT_TAG_TEXT;
  var DONE_PREFIX    = '✅ ';
  var TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  var WD_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function tagDescription(notes) { return (notes || '').trim() + EVENT_TAG; }
  function stripTag(desc) { return (desc || '').split(EVENT_TAG_TEXT).join('').trim(); }
  function parseEventTitle(rawTitle) {
    var title = rawTitle || '';
    var done = title.indexOf(DONE_PREFIX) === 0;
    return { title: done ? title.slice(DONE_PREFIX.length) : title, status: done ? 'completed' : 'needsAction' };
  }
  function fmtDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function fmtTime(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function localDateTime(y, mo, d, h, mi) {
    return y + '-' + pad2(mo) + '-' + pad2(d) + 'T' + pad2(h) + ':' + pad2(mi) + ':00';
  }

  // ── AUTENTICAÇÃO (Google Identity Services) ─────────────────
  // Diferente do chrome.identity (que guarda o token pra sempre e
  // renova sozinho), o GIS pede um "gesto do usuário" (toque/clique)
  // para abrir o seletor de conta na primeira vez. Por isso o app.html
  // sempre começa com um botão explícito "Entrar com o Google".
  var cachedToken = null;
  var tokenClient = null;
  var pendingAuthResolvers = [];

  function ensureTokenClient() {
    if (tokenClient) return tokenClient;
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      throw new Error('Google Identity Services ainda não carregou. Recarregue a página.');
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: WEB_CLIENT_ID,
      scope: SCOPES,
      callback: function (resp) {
        var resolvers = pendingAuthResolvers;
        pendingAuthResolvers = [];
        if (resp && resp.access_token) {
          cachedToken = resp.access_token;
          resolvers.forEach(function (r) { r.resolve(resp.access_token); });
        } else {
          var err = new Error((resp && resp.error_description) || 'Não foi possível autenticar com sua conta Google.');
          resolvers.forEach(function (r) { r.reject(err); });
        }
      }
    });
    return tokenClient;
  }

  // requestSignIn() só deve ser chamado a partir de um clique/toque do
  // usuário (ex.: o botão "Entrar com o Google"). Pede consentimento e
  // guarda o token em memória para as chamadas seguintes.
  function requestSignIn() {
    return new Promise(function (resolve, reject) {
      try {
        var client = ensureTokenClient();
        pendingAuthResolvers.push({ resolve: resolve, reject: reject });
        client.requestAccessToken({ prompt: cachedToken ? '' : 'consent' });
      } catch (e) { reject(e); }
    });
  }

  // Tenta renovar o token sem exigir um novo clique (funciona enquanto
  // a sessão do Google no navegador ainda estiver ativa). Se falhar,
  // quem chamou precisa pedir para o usuário tocar em "Entrar" de novo.
  function silentRefresh() {
    return new Promise(function (resolve, reject) {
      try {
        var client = ensureTokenClient();
        pendingAuthResolvers.push({ resolve: resolve, reject: reject });
        client.requestAccessToken({ prompt: '' });
      } catch (e) { reject(e); }
    });
  }

  function isSignedIn() { return !!cachedToken; }
  function signOut() {
    if (cachedToken && window.google && google.accounts && google.accounts.oauth2) {
      try { google.accounts.oauth2.revoke(cachedToken, function () {}); } catch (e) { /* ignore */ }
    }
    cachedToken = null;
  }

  function rawFetch(url, options, token) {
    var headers = Object.assign({}, options.headers, { Authorization: 'Bearer ' + token });
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    return fetch(url, Object.assign({}, options, { headers: headers }));
  }

  // fetch autenticado com retry automático (renovação silenciosa) se o
  // token expirou (401).
  async function apiFetch(url, options) {
    options = options || {};
    if (!cachedToken) throw new Error('Faça login com sua conta Google primeiro.');
    var resp = await rawFetch(url, options, cachedToken);
    if (resp.status === 401) {
      cachedToken = null;
      var token = await silentRefresh().catch(function () {
        throw new Error('Sua sessão expirou. Toque em "Entrar com o Google" novamente.');
      });
      resp = await rawFetch(url, options, token);
    }
    if (!resp.ok) {
      var msg = 'Erro ' + resp.status;
      try {
        var body = await resp.json();
        msg = (body.error && body.error.message) || msg;
      } catch (e) { /* ignore */ }
      throw new Error(msg);
    }
    if (resp.status === 204) return null;
    var text = await resp.text();
    return text ? JSON.parse(text) : null;
  }

  // ── Tasks API: helpers ──────────────────────────────────────
  async function apiGetTaskListsRaw() {
    var data = await apiFetch(TASKS_BASE + '/users/@me/lists?maxResults=100');
    return (data && data.items) || [];
  }

  // ═══════════════════════════════════════════════════════════
  //  Funções equivalentes ao Code.gs / gas-shim.js (mesma
  //  assinatura e retorno, para reaproveitar a UI sem alterações)
  // ═══════════════════════════════════════════════════════════

  async function getTaskLists() {
    var items = await apiGetTaskListsRaw();
    return items.map(function (l) { return { id: l.id, title: l.title }; });
  }

  async function getTasks(incluirConcluidas) {
    var listas = await apiGetTaskListsRaw();
    var result = [];
    for (var i = 0; i < listas.length; i++) {
      var lista = listas[i];
      var pageToken = null;
      do {
        var params = new URLSearchParams({
          maxResults: '100',
          showCompleted: String(!!incluirConcluidas),
          showHidden: String(!!incluirConcluidas)
        });
        if (pageToken) params.set('pageToken', pageToken);
        var resp = await apiFetch(TASKS_BASE + '/lists/' + encodeURIComponent(lista.id) + '/tasks?' + params.toString());
        var items = (resp && resp.items) || [];
        items.forEach(function (t) {
          if (!incluirConcluidas && t.status === 'completed') return;
          var dueParts = t.due ? t.due.split('T') : null;
          var timePart = dueParts && dueParts[1] ? dueParts[1].substring(0, 5) : '';
          result.push({
            type: 'task',
            listId: lista.id,
            listTitle: lista.title,
            taskId: t.id,
            title: t.title || '',
            status: t.status || 'needsAction',
            due: dueParts ? dueParts[0] : '',
            dueTime: timePart !== '00:00' ? timePart : '',
            notes: t.notes || ''
          });
        });
        pageToken = (resp && resp.nextPageToken) || null;
      } while (pageToken);
    }
    return result;
  }

  async function updateField(listId, taskId, field, value) {
    var patch = {};
    patch[field] = value;
    if (field === 'status' && value === 'needsAction') patch.completed = null;
    await apiFetch(TASKS_BASE + '/lists/' + encodeURIComponent(listId) + '/tasks/' + encodeURIComponent(taskId), {
      method: 'PATCH', body: JSON.stringify(patch)
    });
    return true;
  }

  async function createTask(listId, title, dateISO, notes) {
    var task = { title: title, status: 'needsAction' };
    if (dateISO) task.due = dateISO + 'T00:00:00.000Z';
    if (notes) task.notes = notes;
    var created = await apiFetch(TASKS_BASE + '/lists/' + encodeURIComponent(listId) + '/tasks', { method: 'POST', body: JSON.stringify(task) });
    return {
      listId: listId, taskId: created.id, title: created.title || '',
      status: created.status || 'needsAction', due: created.due ? created.due.split('T')[0] : '',
      notes: created.notes || ''
    };
  }

  async function deleteTask(listId, taskId) {
    await apiFetch(TASKS_BASE + '/lists/' + encodeURIComponent(listId) + '/tasks/' + encodeURIComponent(taskId), { method: 'DELETE' });
    return true;
  }

  // ── Calendar API: helpers ────────────────────────────────────
  function eventStartMs(ev) {
    if (ev.start.dateTime) return new Date(ev.start.dateTime).getTime();
    return new Date(ev.start.date + 'T00:00:00').getTime();
  }

  async function listCalendarEvents(timeMinIso, timeMaxIso) {
    var items = [];
    var pageToken = null;
    do {
      var params = new URLSearchParams({
        timeMin: timeMinIso, timeMax: timeMaxIso,
        singleEvents: 'true', maxResults: '2500', orderBy: 'startTime'
      });
      if (pageToken) params.set('pageToken', pageToken);
      var resp = await apiFetch(CAL_BASE + '/calendars/primary/events?' + params.toString());
      items = items.concat((resp && resp.items) || []);
      pageToken = (resp && resp.nextPageToken) || null;
    } while (pageToken);
    return items;
  }

  function mapEventToItem(ev) {
    var allDay = !ev.start.dateTime;
    var s = new Date(eventStartMs(ev));
    var parsed = parseEventTitle(ev.summary);
    return {
      type: 'event',
      listId: '__calendar__',
      listTitle: 'Evento',
      taskId: ev.id,
      title: parsed.title,
      status: parsed.status,
      due: fmtDate(s),
      dueTime: allDay ? '' : fmtTime(s),
      notes: stripTag(ev.description),
      color: ev.colorId || ''
    };
  }

  async function getEvents(incluirConcluidas) {
    var now = new Date();
    var start = new Date(now.getTime() - EVENT_RANGE_PAST_DAYS * 24 * 60 * 60 * 1000);
    var end   = new Date(now.getTime() + EVENT_RANGE_FUTURE_DAYS * 24 * 60 * 60 * 1000);
    var items = await listCalendarEvents(start.toISOString(), end.toISOString());
    return items
      .filter(function (ev) { return (ev.description || '').indexOf(EVENT_TAG_TEXT) > -1; })
      .map(mapEventToItem)
      .filter(function (item) { return !!incluirConcluidas || item.status !== 'completed'; });
  }

  async function createEventQuick(title, y, mo, d, h, mi, notes, colorId) {
    var startStr = localDateTime(y, mo, d, h, mi);
    var startDate = new Date(y, mo - 1, d, h, mi);
    var endDate = new Date(startDate.getTime() + 15 * 60000);
    var endStr = localDateTime(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate(), endDate.getHours(), endDate.getMinutes());
    var body = {
      summary: title || '(sem título)',
      description: tagDescription(notes),
      start: { dateTime: startStr, timeZone: TZ },
      end: { dateTime: endStr, timeZone: TZ },
      colorId: colorId || '6',
      transparency: 'transparent'
    };
    var ev = await apiFetch(CAL_BASE + '/calendars/primary/events', { method: 'POST', body: JSON.stringify(body) });
    return {
      type: 'event', listId: '__calendar__', listTitle: 'Evento', taskId: ev.id,
      title: ev.summary || '', status: 'needsAction',
      due: fmtDate(startDate), dueTime: fmtTime(startDate),
      notes: notes || '', color: colorId || '6', recur: 'none'
    };
  }

  async function deleteEvent(eventId) {
    try {
      await apiFetch(CAL_BASE + '/calendars/primary/events/' + encodeURIComponent(eventId), { method: 'DELETE' });
    } catch (e) { /* já pode ter sido removido */ }
    return true;
  }

  function getEventRaw(eventId) {
    return apiFetch(CAL_BASE + '/calendars/primary/events/' + encodeURIComponent(eventId));
  }

  async function toggleEventStatus(eventId, completed) {
    var ev = await getEventRaw(eventId);
    if (!ev) return false;
    var current = ev.summary || '';
    var bare = current.indexOf(DONE_PREFIX) === 0 ? current.slice(DONE_PREFIX.length) : current;
    await apiFetch(CAL_BASE + '/calendars/primary/events/' + encodeURIComponent(eventId), {
      method: 'PATCH', body: JSON.stringify({ summary: (completed ? DONE_PREFIX : '') + bare })
    });
    return true;
  }

  // Edição inline (linha expandida na lista mobile): título, notas ou cor,
  // um campo por vez — preserva o prefixo de "concluído" no título.
  async function updateEventField(eventId, field, value) {
    if (field === 'color') {
      await apiFetch(CAL_BASE + '/calendars/primary/events/' + encodeURIComponent(eventId), {
        method: 'PATCH', body: JSON.stringify({ colorId: value })
      });
      return true;
    }
    if (field === 'title') {
      var ev = await getEventRaw(eventId);
      var current = ev.summary || '';
      var isDone = current.indexOf(DONE_PREFIX) === 0;
      await apiFetch(CAL_BASE + '/calendars/primary/events/' + encodeURIComponent(eventId), {
        method: 'PATCH', body: JSON.stringify({ summary: (isDone ? DONE_PREFIX : '') + (value || '(sem título)') })
      });
      return true;
    }
    if (field === 'notes') {
      await apiFetch(CAL_BASE + '/calendars/primary/events/' + encodeURIComponent(eventId), {
        method: 'PATCH', body: JSON.stringify({ description: tagDescription(value) })
      });
      return true;
    }
    throw new Error('Campo não suportado: ' + field);
  }

  // Move a data/hora do evento preservando a duração original.
  async function updateEventDateTime(eventId, dateISO, timeHHMM) {
    var ev = await getEventRaw(eventId);
    var allDay = !ev.start.dateTime;
    var durationMs = allDay ? 15 * 60000 : (new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime).getTime());
    var dp = (dateISO || '').split('-').map(Number);
    var tp = (timeHHMM || '09:00').split(':').map(Number);
    var start = new Date(dp[0], (dp[1] || 1) - 1, dp[2] || 1, tp[0] || 0, tp[1] || 0);
    var end = new Date(start.getTime() + (durationMs > 0 ? durationMs : 15 * 60000));
    var startStr = localDateTime(start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes());
    var endStr = localDateTime(end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes());
    await apiFetch(CAL_BASE + '/calendars/primary/events/' + encodeURIComponent(eventId), {
      method: 'PATCH',
      body: JSON.stringify({ start: { dateTime: startStr, timeZone: TZ }, end: { dateTime: endStr, timeZone: TZ } })
    });
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  //  Shim "google.script.run" — mesma forma usada na extensão,
  //  para o app.js/popup.js funcionarem sem alteração.
  // ═══════════════════════════════════════════════════════════
  var API = {
    getTaskLists: getTaskLists,
    getTasks: getTasks,
    getEvents: getEvents,
    createEventQuick: createEventQuick,
    deleteEvent: deleteEvent,
    toggleEventStatus: toggleEventStatus,
    updateEventField: updateEventField,
    updateEventDateTime: updateEventDateTime,
    updateField: updateField,
    createTask: createTask,
    deleteTask: deleteTask
  };

  function makeRunner(successHandler, failureHandler) {
    var runner = {};
    runner.withSuccessHandler = function (fn) { return makeRunner(fn, failureHandler); };
    runner.withFailureHandler = function (fn) { return makeRunner(successHandler, fn); };
    Object.keys(API).forEach(function (name) {
      runner[name] = function () {
        var args = Array.prototype.slice.call(arguments);
        Promise.resolve()
          .then(function () { return API[name].apply(null, args); })
          .then(function (result) { if (successHandler) successHandler(result); })
          .catch(function (err) {
            if (failureHandler) failureHandler(err);
            else if (typeof console !== 'undefined') console.error(err);
          });
      };
    });
    return runner;
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = makeRunner(null, null);

  // Exposto à parte para a tela de login e o botão de sair.
  window.TaskEasierAuth = {
    requestSignIn: requestSignIn,
    isSignedIn: isSignedIn,
    signOut: signOut
  };
})();
