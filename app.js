import { CATEGORIES, balancesFor, categoryLabel, euro, expensesInPeriod, totalsByCategory } from './finance.mjs?v=5';

const $ = id => document.getElementById(id);
const palette = ['#6251c8', '#15a7a1', '#f3a94e', '#e76e91', '#688bc9', '#a9a3b8'];
const categoryColor = category => {
  const index = CATEGORIES.indexOf(category);
  if (index >= 0) return palette[index];
  let hash = 0;
  for (const letter of category) hash = (hash * 31 + letter.codePointAt(0)) >>> 0;
  return `hsl(${hash % 360} 55% 48%)`;
};
const config = window.EXPENSE_APP_CONFIG || {};
const state = { client: null, user: null, groups: [], memberships: [], group: null,
  members: [], expenses: [], events: [], editing: null, channel: null, refreshTimer: null };
const make = (tag, className = '', content = '') => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
};
const dateLabel = value => value ? new Intl.DateTimeFormat('it-IT').format(new Date(`${value}T12:00:00`)) : '';
const timeLabel = value => value ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '';
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const memberName = id => state.members.find(member => member.user_id === id)?.display_name || 'Partecipante';
const currentMember = () => state.members.find(member => member.user_id === state.user?.id);
const isOwner = () => currentMember()?.role === 'owner';
const notice = (message, error = false) => {
  $('notice').textContent = message;
  $('notice').classList.toggle('error', error);
  $('notice').classList.remove('hidden');
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => $('notice').classList.add('hidden'), 6500);
};
const run = async (button, callback) => {
  if (button) button.disabled = true;
  try { await callback(); }
  catch (error) { notice(error.message || 'Si è verificato un errore. Riprova.', true); }
  finally { if (button) button.disabled = false; }
};
const response = async promise => {
  const result = await promise;
  if (result.error) throw result.error;
  return result.data;
};
const rpc = (name, args) => response(state.client.rpc(name, args));
const empty = (target, text) => target.append(make('p', 'empty', text));
const download = (name, contents, type) => {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

async function renderSession(session) {
  const previousUserId = state.user?.id;
  state.user = session?.user || null;
  if (previousUserId && previousUserId !== state.user?.id) {
    if (state.channel) { await state.client.removeChannel(state.channel); state.channel = null; }
    state.group = null; state.members = []; state.expenses = []; state.events = [];
    $('groupContent').classList.add('hidden'); sessionStorage.removeItem('selectedExpenseGroup');
  }
  $('login').classList.toggle('hidden', !!state.user);
  $('workspace').classList.toggle('hidden', !state.user);
  if (!state.user) {
    if (state.channel) { await state.client.removeChannel(state.channel); state.channel = null; }
    $('groupContent').classList.add('hidden'); state.group = null; return;
  }
  await refreshGroups();
}

function renderGoogleAccess() {
  $('googleDetails').classList.toggle('hidden', !config.googleEnabled);
  $('browserAccessHint').classList.toggle('hidden', !state.user?.is_anonymous);
  if (!config.googleEnabled || !state.user) return;
  const linked = state.user.identities?.some(identity => identity.provider === 'google');
  const hasGroups = state.groups.length > 0;
  const anonymous = !!state.user.is_anonymous;
  $('googleAccess').classList.toggle('hidden', !!linked);
  $('googleRecover').classList.toggle('hidden', !anonymous || !hasGroups);
  $('googleAccess').textContent = hasGroups ? 'Collega Google a questi gruppi' : 'Accedi con Google';
  $('googleHelp').textContent = linked
    ? 'Accesso collegato a Google: potrai ritrovare i tuoi gruppi anche su un altro dispositivo.'
    : hasGroups
      ? 'Collega Google per ritrovare questi gruppi anche se cambi telefono. È facoltativo.'
      : 'Puoi entrare con Google per ritrovare i gruppi che hai già collegato.';
}

async function refreshGroups() {
  state.memberships = await response(state.client.from('expense_members')
    .select('group_id,user_id,display_name,email,role,status').eq('user_id', state.user.id));
  const ids = state.memberships.map(item => item.group_id);
  state.groups = ids.length ? await response(state.client.from('expense_groups')
    .select('id,name,created_by,created_at').in('id', ids)) : [];
  if (state.group && !state.groups.some(group => group.id === state.group.id &&
      state.memberships.some(member => member.group_id === group.id && member.status === 'active'))) {
    if (state.channel) { await state.client.removeChannel(state.channel); state.channel = null; }
    state.group = null; $('groupContent').classList.add('hidden');
  }
  if (!state.group) { $('syncStatus').textContent = 'Pronto'; $('syncStatus').classList.remove('offline'); }
  renderGoogleAccess();
  const list = $('groupsList'); list.replaceChildren();
  if (!state.groups.length) empty(list, 'Crea un gruppo o chiedi di entrare con un invito.');
  for (const group of state.groups) {
    const membership = state.memberships.find(item => item.group_id === group.id);
    const button = make('button', `group-choice ${membership.status === 'pending' ? 'pending' : ''} ${state.group?.id === group.id ? 'selected' : ''}`,
      `${group.name}${membership.status === 'pending' ? ' · in attesa' : ''}`);
    button.type = 'button'; button.dataset.groupId = group.id;
    button.addEventListener('click', () => {
      if (membership.status === 'pending') return notice('La tua richiesta aspetta l’approvazione di chi amministra il gruppo.');
      run(button, () => loadGroup(group));
    });
    list.append(button);
  }
  const saved = state.groups.find(group => group.id === (state.group?.id || sessionStorage.getItem('selectedExpenseGroup')));
  if (saved && state.memberships.find(member => member.group_id === saved.id)?.status === 'active' && state.group?.id !== saved.id) await loadGroup(saved);
  else if (!state.group) {
    const first = state.groups.find(group => state.memberships.find(member => member.group_id === group.id)?.status === 'active');
    if (first) await loadGroup(first);
  }
}

async function loadGroup(group) {
  if (state.channel) { await state.client.removeChannel(state.channel); state.channel = null; }
  state.group = group; sessionStorage.setItem('selectedExpenseGroup', group.id);
  $('groupContent').classList.remove('hidden');
  $('groupTitle').textContent = group.name;
  $('reportGroup').textContent = group.name;
  $('syncStatus').textContent = 'Sincronizzazione attiva'; $('syncStatus').classList.remove('offline');
  await refreshCurrent();
  state.channel = state.client.channel(`expenses-${group.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_expenses', filter: `group_id=eq.${group.id}` }, scheduleRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_events', filter: `group_id=eq.${group.id}` }, scheduleRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_members', filter: `group_id=eq.${group.id}` }, scheduleRefresh)
    .subscribe(status => {
      $('syncStatus').textContent = status === 'SUBSCRIBED' ? 'Sincronizzazione attiva' : 'Riconnessione…';
      $('syncStatus').classList.toggle('offline', status !== 'SUBSCRIBED');
    });
  for (const choice of document.querySelectorAll('.group-choice')) choice.classList.toggle('selected', choice.dataset.groupId === group.id);
}
function scheduleRefresh() {
  clearTimeout(state.refreshTimer);
  state.refreshTimer = setTimeout(() => run(null, refreshCurrent), 200);
}
async function refreshCurrent() {
  if (!state.group) return;
  const groupId = state.group.id;
  const [members, expenses, events] = await Promise.all([
    response(state.client.from('expense_members').select('group_id,user_id,display_name,email,role,status').eq('group_id', groupId)),
    response(state.client.from('shared_expenses').select('*').eq('group_id', groupId).order('spent_on', { ascending: false })),
    response(state.client.from('expense_events').select('*').eq('group_id', groupId).order('occurred_at', { ascending: false }).limit(150))
  ]);
  if (state.group?.id !== groupId) return;
  state.members = members; state.expenses = expenses; state.events = events;
  renderAll();
}
function renderAll() {
  const active = state.members.filter(member => member.status === 'active');
  $('memberCount').textContent = `${active.length} partecipanti`;
  $('currentPayer').textContent = currentMember()?.display_name || 'tu';
  const selected = [...document.querySelectorAll('#splitChoices input:checked')].map(input => input.value);
  const choices = $('splitChoices'); choices.replaceChildren();
  active.forEach(member => {
    const label = make('label'); const checkbox = make('input');
    checkbox.type = 'checkbox'; checkbox.value = member.user_id;
    checkbox.checked = state.editing ? selected.includes(member.user_id) : (selected.length ? selected.includes(member.user_id) : true);
    label.append(checkbox, document.createTextNode(member.display_name)); choices.append(label);
  });
  const payerFilter = $('filterPayer'); const prev = payerFilter.value;
  payerFilter.replaceChildren(new Option('Tutti', ''));
  active.forEach(member => payerFilter.add(new Option(member.display_name, member.user_id)));
  payerFilter.value = active.some(member => member.user_id === prev) ? prev : '';
  renderExpenses(); renderDashboard(); renderHistory(); renderPeople();
}
function actionButton(text, className, handler) {
  const button = make('button', className, text);
  button.type = 'button'; button.addEventListener('click', () => run(button, handler)); return button;
}
function renderExpenses() {
  const list = $('expensesList'); list.replaceChildren();
  const active = state.expenses.filter(expense => !expense.deleted_at);
  $('expenseCount').textContent = `${active.length} spese`;
  if (!active.length) empty(list, 'Non ci sono ancora spese. Aggiungi la prima.');
  active.forEach(expense => {
    const card = make('article', 'expense-item'); const head = make('div', 'item-head');
    head.append(make('div', 'item-title', expense.description), make('div', 'amount', euro(expense.amount_cents)));
    card.append(head, make('p', 'meta', `${categoryLabel(expense)} · ${dateLabel(expense.spent_on)} · Pagata da ${memberName(expense.paid_by)}`));
    card.append(make('p', 'meta', `Divisa tra ${expense.split_between.map(memberName).join(', ')}`));
    card.append(make('p', 'meta', `Inserita da ${memberName(expense.created_by)} il ${timeLabel(expense.created_at)}${expense.updated_at !== expense.created_at ? ` · Modificata da ${memberName(expense.updated_by)} il ${timeLabel(expense.updated_at)}` : ''}`));
    if (expense.created_by === state.user.id || isOwner()) {
      const actions = make('div', 'small-actions');
      actions.append(actionButton('Modifica', '', async () => startEdit(expense)),
        actionButton('Elimina', 'danger', async () => {
          if (!confirm(`Eliminare “${expense.description}”? La spesa potrà essere ripristinata dalla cronologia.`)) return;
          await rpc('delete_shared_expense', { p_id: expense.id }); await refreshCurrent(); notice('Spesa eliminata. Resta nella cronologia.');
        }));
      card.append(actions);
    }
    list.append(card);
  });
}
function startEdit(expense) {
  state.editing = expense.id;
  const form = $('expenseForm');
  form.elements.description.value = expense.description;
  form.elements.amount.value = (expense.amount_cents / 100).toFixed(2);
  form.elements.spentOn.value = expense.spent_on;
  form.elements.category.value = expense.category;
  form.elements.categoryDetail.value = expense.category_detail || '';
  updateOtherCategoryField();
  document.querySelectorAll('#splitChoices input').forEach(input => { input.checked = expense.split_between.includes(input.value); });
  $('formTitle').textContent = 'Modifica spesa'; $('saveExpense').textContent = 'Salva modifiche';
  $('cancelEdit').classList.remove('hidden'); form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function clearForm() {
  state.editing = null; $('expenseForm').reset();
  $('expenseForm').elements.spentOn.value = today();
  updateOtherCategoryField();
  $('formTitle').textContent = 'Aggiungi una spesa'; $('saveExpense').textContent = 'Salva spesa';
  $('cancelEdit').classList.add('hidden');
  document.querySelectorAll('#splitChoices input').forEach(input => { input.checked = true; });
}
function updateOtherCategoryField() {
  const other = $('expenseForm').elements.category.value === 'Altro';
  $('otherCategoryField').classList.toggle('hidden', !other);
  $('expenseForm').elements.categoryDetail.required = other;
  if (!other) $('expenseForm').elements.categoryDetail.value = '';
}
function renderDashboard() {
  const filtered = expensesInPeriod(state.expenses, $('filterFrom').value, $('filterTo').value, $('filterPayer').value);
  const { overall, rows } = totalsByCategory(filtered);
  $('reportTotal').textContent = euro(overall);
  const donut = $('donut'); donut.replaceChildren();
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', '0 0 240 240');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', rows.map(r => `${r.category} ${r.percentage.toFixed(1)}%`).join(', ') || 'Nessuna spesa');
  const base = document.createElementNS(svgNS, 'circle');
  for (const [key, value] of Object.entries({ cx: 120, cy: 120, r: 88, fill: 'none', stroke: '#eeecf5', 'stroke-width': 27 })) base.setAttribute(key, value);
  svg.append(base);
  let offset = 0; const circumference = 2 * Math.PI * 88;
  rows.forEach((row, index) => {
    const slice = document.createElementNS(svgNS, 'circle');
    for (const [key, value] of Object.entries({ cx: 120, cy: 120, r: 88, fill: 'none', stroke: categoryColor(row.category), 'stroke-width': 27,
      'stroke-dasharray': `${circumference * row.percentage / 100} ${circumference}`, 'stroke-dashoffset': -circumference * offset / 100,
      transform: 'rotate(-90 120 120)' })) slice.setAttribute(key, value);
    svg.append(slice); offset += row.percentage;
  });
  const center = document.createElementNS(svgNS, 'text'); center.setAttribute('x', '120'); center.setAttribute('y', '115');
  center.setAttribute('text-anchor', 'middle'); center.setAttribute('font-size', '14'); center.setAttribute('fill', '#77718a'); center.textContent = 'TOTALE'; svg.append(center);
  const value = document.createElementNS(svgNS, 'text'); value.setAttribute('x', '120'); value.setAttribute('y', '140');
  value.setAttribute('text-anchor', 'middle'); value.setAttribute('font-size', '23'); value.setAttribute('font-weight', '800'); value.setAttribute('fill', '#3b3267'); value.textContent = euro(overall); svg.append(value);
  donut.append(svg);
  const list = $('categoryRows'); list.replaceChildren();
  if (!rows.length) empty(list, 'Le categorie compariranno dopo la prima spesa nel periodo scelto.');
  rows.forEach(row => {
    const color = categoryColor(row.category); const item = make('div', 'category-row');
    const label = make('span', 'category-name'); const swatch = make('span', 'swatch'); swatch.style.backgroundColor = color;
    label.append(swatch, document.createTextNode(row.category));
    item.append(label, make('strong', '', `${euro(row.cents)} · ${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(row.percentage)}%`));
    const track = make('div', 'track'); const fill = make('span'); fill.style.width = `${row.percentage}%`; fill.style.backgroundColor = color; track.append(fill); item.append(track); list.append(item);
  });
  const balanceList = $('balancesList'); balanceList.replaceChildren();
  const balances = balancesFor(state.members.filter(m => m.status === 'active'), state.expenses);
  for (const member of state.members.filter(m => m.status === 'active')) {
    const balance = balances[member.user_id] || 0; const row = make('div', 'balance-row');
    row.append(make('span', '', member.display_name), make('strong', balance < 0 ? 'negative' : balance > 0 ? 'positive' : '', euro(balance)));
    balanceList.append(row);
  }
}
function renderHistory() {
  const list = $('historyList'); list.replaceChildren();
  if (!state.events.length) empty(list, 'Le aggiunte e le modifiche appariranno qui.');
  const verbs = { added: 'ha aggiunto', edited: 'ha modificato', deleted: 'ha eliminato', restored: 'ha ripristinato' };
  state.events.forEach(event => {
    const card = make('article', 'activity-item'); const before = event.before_state; const after = event.after_state;
    const title = after?.description || before?.description || 'Spesa';
    card.append(make('div', 'item-title', `${memberName(event.actor_id)} ${verbs[event.action] || 'ha aggiornato'} “${title}”`));
    card.append(make('p', 'meta', timeLabel(event.occurred_at)));
    if (event.action === 'edited' && before && after) {
      const changes = [];
      if (before.amount_cents !== after.amount_cents) changes.push(`importo: ${euro(before.amount_cents)} → ${euro(after.amount_cents)}`);
      if (categoryLabel(before) !== categoryLabel(after)) changes.push(`categoria: ${categoryLabel(before)} → ${categoryLabel(after)}`);
      if (before.description !== after.description) changes.push(`descrizione: ${before.description} → ${after.description}`);
      if (before.spent_on !== after.spent_on) changes.push(`data: ${dateLabel(before.spent_on)} → ${dateLabel(after.spent_on)}`);
      if (JSON.stringify(before.split_between) !== JSON.stringify(after.split_between)) changes.push('partecipanti alla spesa aggiornati');
      if (changes.length) card.append(make('p', 'meta', changes.join(' · ')));
    }
    if (event.action === 'deleted' && (after.created_by === state.user.id || isOwner()) &&
      state.expenses.find(expense => expense.id === event.expense_id)?.deleted_at) {
      const actions = make('div', 'small-actions');
      actions.append(actionButton('Ripristina spesa', '', async () => {
        await rpc('restore_shared_expense', { p_id: event.expense_id }); await refreshCurrent(); notice('Spesa ripristinata.');
      })); card.append(actions);
    }
    list.append(card);
  });
}
async function renderPeople() {
  const list = $('peopleList'); list.replaceChildren();
  const owner = isOwner();
  state.members.forEach(member => {
    const card = make('div', 'person-item');
    card.append(make('strong', '', `${member.display_name}${member.role === 'owner' ? ' · amministratore' : ''}`));
    card.append(make('p', 'meta', member.status === 'pending' ? 'In attesa di approvazione' : 'Nel gruppo'));
    if (owner && member.status === 'pending') card.append(actionButton('Approva partecipante', '', async () => {
      await rpc('approve_expense_member', { p_group: state.group.id, p_user: member.user_id });
      await refreshCurrent(); notice(`${member.display_name} può ora vedere il gruppo.`);
    }));
    list.append(card);
  });
  $('inviteBox').classList.toggle('hidden', !owner);
  $('deleteGroupBox').classList.toggle('hidden', !owner || state.group.created_by !== state.user.id);
  if (owner) {
    try {
      const code = await rpc('expense_invite_code', { p_group: state.group.id });
      if (state.group) {
        const url = new URL(location.href); url.search = ''; url.hash = ''; url.searchParams.set('invite', code);
        $('inviteLink').value = url.toString();
      }
    } catch (error) { notice(error.message, true); }
  }
}
function selectedExpenses() { return expensesInPeriod(state.expenses, $('filterFrom').value, $('filterTo').value, $('filterPayer').value); }
function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
function exportCsv() {
  const headings = ['Data', 'Descrizione', 'Categoria', 'Importo EUR', 'Pagatore', 'Partecipanti', 'Inserita da', 'Inserita il', 'Modificata da', 'Modificata il'];
  const rows = selectedExpenses().map(expense => [expense.spent_on, expense.description, categoryLabel(expense),
    (expense.amount_cents / 100).toFixed(2).replace('.', ','), memberName(expense.paid_by), expense.split_between.map(memberName).join('; '),
    memberName(expense.created_by), timeLabel(expense.created_at), memberName(expense.updated_by), timeLabel(expense.updated_at)]);
  download('spese-gruppo.csv', '\ufeff' + [headings, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}
function exportPng() {
  const { overall, rows } = totalsByCategory(selectedExpenses());
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 370 + Math.max(rows.length, 1) * 70;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#3a2e73'; ctx.font = 'bold 38px sans-serif'; ctx.fillText('Dove abbiamo speso', 65, 72);
  ctx.font = '22px sans-serif'; ctx.fillStyle = '#686177'; ctx.fillText(state.group.name, 65, 110);
  ctx.fillText(`Periodo: ${$('filterFrom').value || 'inizio'} – ${$('filterTo').value || 'oggi'}`, 65, 143);
  ctx.font = 'bold 32px sans-serif'; ctx.fillStyle = '#30235e'; ctx.fillText(`Totale ${euro(overall)}`, 65, 190);
  let start = -Math.PI / 2;
  if (!rows.length) { ctx.beginPath(); ctx.arc(210, 335, 100, 0, Math.PI * 2); ctx.strokeStyle = '#e9e7f0'; ctx.lineWidth = 42; ctx.stroke(); }
  rows.forEach(row => {
    ctx.beginPath(); ctx.arc(210, 335, 100, start, start + 2 * Math.PI * row.percentage / 100);
    ctx.strokeStyle = categoryColor(row.category); ctx.lineWidth = 42; ctx.stroke();
    start += 2 * Math.PI * row.percentage / 100;
  });
  rows.forEach((row, i) => {
    const y = 247 + i * 70;
    ctx.fillStyle = categoryColor(row.category); ctx.fillRect(400, y - 19, 22, 22);
    ctx.font = '25px sans-serif'; ctx.fillStyle = '#302c43'; ctx.fillText(row.category, 438, y);
    ctx.fillText(`${euro(row.cents)}   ${row.percentage.toFixed(1).replace('.', ',')}%`, 770, y);
  });
  canvas.toBlob(blob => { if (blob) {
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url;
    link.download = 'riepilogo-spese.png'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } }, 'image/png');
}

function bind() {
  $('googleAccess').addEventListener('click', event => run(event.currentTarget, async () => {
    const options = { redirectTo: location.origin + location.pathname + location.search };
    if (state.groups.length) await response(state.client.auth.linkIdentity({ provider: 'google', options }));
    else await response(state.client.auth.signInWithOAuth({ provider: 'google', options }));
  }));
  $('googleRecover').addEventListener('click', event => run(event.currentTarget, async () => {
    if (!confirm('Se usi un account Google già esistente, i gruppi di questo browser potrebbero non essere accessibili. Vuoi continuare?')) return;
    await response(state.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname + location.search } }));
  }));
  $('githubLogin').addEventListener('click', event => run(event.currentTarget, async () => {
    if (state.user?.is_anonymous && state.groups.length &&
        !confirm('Passando all’account GitHub, i gruppi creati in questo browser senza account potrebbero non essere più accessibili. Vuoi continuare?')) return;
    await response(state.client.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: location.origin + location.pathname + location.search } }));
  }));
  $('createForm').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; run(event.submitter, async () => {
    const data = new FormData(form);
    const id = await rpc('create_expense_group', { p_name: data.get('groupName'), p_display_name: data.get('displayName') });
    form.reset(); $('createDetails').open = false;
    sessionStorage.setItem('selectedExpenseGroup', id); state.group = null; await refreshGroups(); notice('Gruppo creato. Ora puoi invitare i partecipanti.');
  }); });
  $('joinForm').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; run(event.submitter, async () => {
    const data = new FormData(form);
    let code = String(data.get('invite')).trim();
    try { code = new URL(code).searchParams.get('invite') || ''; } catch { /* A bare UUID is accepted. */ }
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(code)) throw Error('Incolla un codice o link di invito valido.');
    const id = await rpc('request_expense_membership', { p_code: code, p_display_name: data.get('displayName') });
    form.reset(); $('joinDetails').open = false;
    sessionStorage.setItem('selectedExpenseGroup', id); state.group = null; await refreshGroups();
    notice('Benvenuto nel gruppo. Le spese sono ora condivise.');
  }); });
  $('expenseForm').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; run(event.submitter, async () => {
    const data = new FormData(form);
    const amount = Number(data.get('amount')); const cents = Math.round(amount * 100);
    if (!Number.isFinite(cents) || cents < 1 || cents > 100000000) throw Error('Inserisci un importo valido.');
    const people = [...document.querySelectorAll('#splitChoices input:checked')].map(input => input.value);
    if (!people.length) throw Error('Seleziona almeno un partecipante alla spesa.');
    const args = { p_description: String(data.get('description')).trim(), p_amount_cents: cents,
      p_spent_on: data.get('spentOn'), p_category: data.get('category'),
      p_category_detail: data.get('category') === 'Altro' ? String(data.get('categoryDetail')).trim() : null,
      p_split_between: people };
    if (state.editing) await rpc('edit_shared_expense_v2', { p_id: state.editing, ...args });
    else await rpc('add_shared_expense_v2', { p_group: state.group.id, ...args });
    clearForm(); await refreshCurrent(); notice('Spesa salvata e condivisa con il gruppo.');
  }); });
  $('cancelEdit').addEventListener('click', clearForm);
  $('expenseForm').elements.category.addEventListener('change', updateOtherCategoryField);
  for (const tab of document.querySelectorAll('[data-tab]')) tab.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button === tab));
    for (const name of ['expenses', 'dashboard', 'history', 'people']) $(`${name}Tab`).classList.toggle('hidden', name !== tab.dataset.tab);
  });
  for (const id of ['filterFrom', 'filterTo', 'filterPayer']) $(id).addEventListener('change', renderDashboard);
  $('copyInvite').addEventListener('click', event => run(event.currentTarget, async () => {
    await navigator.clipboard.writeText($('inviteLink').value); notice('Link di invito copiato.');
  }));
  $('rotateInvite').addEventListener('click', event => run(event.currentTarget, async () => {
    if (!confirm('Rinnovare il link? Il link precedente non permetterà nuovi ingressi.')) return;
    await rpc('rotate_expense_invite_code', { p_group: state.group.id });
    await renderPeople(); notice('Link rinnovato. Copia e condividi quello nuovo.');
  }));
  $('deleteGroup').addEventListener('click', event => run(event.currentTarget, async () => {
    const group = state.group;
    if (!group || !isOwner() || group.created_by !== state.user.id) return;
    const typed = prompt(`Eliminare definitivamente «${group.name}» e tutte le sue spese e attività? Scrivi il nome esatto del gruppo per confermare:`);
    if (typed === null) return;
    if (typed !== group.name) throw Error('Nome diverso: il gruppo non è stato eliminato.');
    await rpc('delete_expense_group', { p_group: group.id, p_confirmation: typed });
    if (state.channel) { await state.client.removeChannel(state.channel); state.channel = null; }
    state.group = null; state.members = []; state.expenses = []; state.events = [];
    $('groupContent').classList.add('hidden'); sessionStorage.removeItem('selectedExpenseGroup');
    await refreshGroups(); notice(`Il gruppo «${group.name}» è stato eliminato.`);
  }));
  $('exportCsv').addEventListener('click', exportCsv);
  $('exportPng').addEventListener('click', exportPng);
  $('exportPdf').addEventListener('click', () => window.print());
  window.addEventListener('online', () => { if (state.group) refreshCurrent(); });
}

async function start() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  CATEGORIES.forEach(category => $('expenseForm').elements.category.add(new Option(category, category)));
  $('expenseForm').elements.spentOn.value = today();
  bind();
  if (!config.supabaseUrl || !config.publishableKey || !window.supabase?.createClient) {
    $('setup').classList.remove('hidden'); return;
  }
  state.client = window.supabase.createClient(config.supabaseUrl, config.publishableKey);
  state.client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => run(null, () => renderSession(session)), 0);
  });
  const { data, error } = await state.client.auth.getSession();
  if (error) throw new Error(`Accesso non disponibile: ${error.message}`);
  let session = data?.session;
  if (!session) {
    const anonymous = await state.client.auth.signInAnonymously();
    if (anonymous.error) throw new Error('Impossibile aprire l’app senza account. Riprova tra poco.');
    session = anonymous.data.session;
  }
  await renderSession(session);
  const invite = new URL(location.href).searchParams.get('invite');
  if (invite) { $('joinDetails').open = true; $('joinForm').elements.invite.value = invite; }
  setInterval(() => { if (state.user) run(null, refreshGroups); }, 30000);
}
start().catch(error => notice(error.message || 'Impossibile avviare l’app', true));
