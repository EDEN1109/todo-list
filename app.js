import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

// ── 상태 ──────────────────────────────────────────
let todos = [];
let groups = [];
let currentFilter = 'all';
let currentGroup = 'all';
let expandedDescriptions = new Set();
let currentUser = null;
let authMode = 'login'; // 'login' | 'signup'

// ── DOM 참조 (앱) ──────────────────────────────────
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const descToggleBtn = document.getElementById('desc-toggle-btn');
const descInput = document.getElementById('desc-input');
const groupAddToggleBtn = document.getElementById('group-add-toggle-btn');
const groupAddForm = document.getElementById('group-add-form');
const groupNameInput = document.getElementById('group-name-input');
const groupConfirmBtn = document.getElementById('group-confirm-btn');
const groupChips = document.getElementById('group-chips');
const groupSelect = document.getElementById('group-select');
const groupFilter = document.getElementById('group-filter');
const list = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const countText = document.getElementById('count-text');
const clearBtn = document.getElementById('clear-btn');
const filterBtns = document.querySelectorAll('.status-filter .filter-btn');

// ── DOM 참조 (인증) ────────────────────────────────
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const authSubmit = document.getElementById('auth-submit');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const logoutBtn = document.getElementById('logout-btn');
const userEmailEl = document.getElementById('user-email');

// ── 인증 UI 헬퍼 ───────────────────────────────────
function showAuth() {
  authView.classList.remove('hidden');
  appView.classList.add('hidden');
  authEmail.value = '';
  authPassword.value = '';
  authError.classList.add('hidden');
  authError.textContent = '';
}

function showApp(user) {
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  userEmailEl.textContent = user.email;
}

function setAuthMode(mode) {
  authMode = mode;
  if (mode === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    authSubmit.textContent = '로그인';
  } else {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    authSubmit.textContent = '회원가입';
  }
  authError.classList.add('hidden');
  authError.textContent = '';
}

function getAuthErrorMessage(error) {
  const msg = error.message
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (msg.includes('User already registered')) return '이미 사용 중인 이메일입니다.'
  if (msg.includes('Password should be at least')) return '비밀번호는 6자 이상이어야 합니다.'
  if (msg.includes('Unable to validate email')) return '유효하지 않은 이메일 형식입니다.'
  return msg
}

// ── 인증 이벤트 ────────────────────────────────────
tabLogin.addEventListener('click', () => setAuthMode('login'));
tabSignup.addEventListener('click', () => setAuthMode('signup'));

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  authError.classList.add('hidden');
  authSubmit.disabled = true;

  let error;
  if (authMode === 'login') {
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  } else {
    ({ error } = await supabase.auth.signUp({ email, password }));
  }

  authSubmit.disabled = false;
  if (error) {
    authError.textContent = getAuthErrorMessage(error);
    authError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// ── 인증 상태 감지 ─────────────────────────────────
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    currentUser = session.user;
    showApp(currentUser);
    await init();
  } else {
    currentUser = null;
    todos = [];
    groups = [];
    expandedDescriptions.clear();
    showAuth();
  }
});

// ── 데이터 매핑 ────────────────────────────────────
function mapTodo(row) {
  return {
    id: row.id,
    text: row.text,
    description: row.description || '',
    groupId: row.group_id,
    completed: row.completed,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };
}

// ── 그룹 CRUD ──────────────────────────────────────
function syncGroupSelect() {
  const current = groupSelect.value;
  groupSelect.innerHTML = '<option value="">그룹 없음</option>';
  groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    groupSelect.appendChild(opt);
  });
  groupSelect.value = groups.find(g => String(g.id) === current) ? current : '';
}

async function addGroup(name) {
  const id = Date.now();
  const { data, error } = await supabase
    .from('groups')
    .insert({ id, name, user_id: currentUser.id })
    .select()
    .single();
  if (error) { console.error(error); return; }
  groups.push({ id: data.id, name: data.name });
  renderGroups();
  renderGroupFilter();
  syncGroupSelect();
}

async function deleteGroup(id) {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) { console.error(error); return; }
  groups = groups.filter(g => g.id !== id);
  todos = todos.map(t => t.groupId === id ? { ...t, groupId: null } : t);
  if (String(currentGroup) === String(id)) currentGroup = 'all';
  renderGroups();
  renderGroupFilter();
  syncGroupSelect();
  render();
}

function renderGroups() {
  groupChips.innerHTML = '';
  groups.forEach(group => {
    const chip = document.createElement('div');
    chip.className = 'group-chip';

    const label = document.createElement('span');
    label.className = 'group-chip-label';
    label.textContent = group.name;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'group-chip-del';
    delBtn.textContent = '×';
    delBtn.title = '그룹 삭제';
    delBtn.addEventListener('click', () => deleteGroup(group.id));

    chip.append(label, delBtn);
    groupChips.appendChild(chip);
  });
}

// ── 투두 CRUD ──────────────────────────────────────
async function addTodo(text, description = '', groupId = null) {
  const id = Date.now();
  const { data, error } = await supabase
    .from('todos')
    .insert({ id, text, description, group_id: groupId, completed: false, completed_at: null, user_id: currentUser.id })
    .select()
    .single();
  if (error) { console.error(error); return; }
  todos.push(mapTodo(data));
  render();
}

async function deleteTodo(id) {
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) { console.error(error); return; }
  todos = todos.filter(t => t.id !== id);
  expandedDescriptions.delete(id);
  render();
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  const completed = !todo.completed;
  const completedAt = completed ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('todos')
    .update({ completed, completed_at: completedAt })
    .eq('id', id);
  if (error) { console.error(error); return; }

  todos = todos.map(t => {
    if (t.id !== id) return t;
    return { ...t, completed, completedAt: completedAt ? new Date(completedAt) : null };
  });
  render();
}

async function clearCompleted() {
  const completedIds = todos.filter(t => t.completed).map(t => t.id);
  if (completedIds.length === 0) return;
  const { error } = await supabase.from('todos').delete().in('id', completedIds);
  if (error) { console.error(error); return; }
  completedIds.forEach(id => expandedDescriptions.delete(id));
  todos = todos.filter(t => !t.completed);
  render();
}

// ── 렌더링 ─────────────────────────────────────────
function formatDate(date) {
  const y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${M}-${d} ${h}:${m}`;
}

function getFiltered() {
  let result = todos;
  if (currentGroup !== 'all') {
    result = result.filter(t => String(t.groupId) === String(currentGroup));
  }
  if (currentFilter === 'active') result = result.filter(t => !t.completed);
  if (currentFilter === 'completed') result = result.filter(t => t.completed);
  return result;
}

function renderGroupFilter() {
  groupFilter.innerHTML = '';

  if (groups.length === 0) {
    currentGroup = 'all';
    return;
  }

  const allBtn = document.createElement('button');
  allBtn.className = `group-filter-btn${currentGroup === 'all' ? ' active' : ''}`;
  allBtn.dataset.group = 'all';
  allBtn.textContent = '전체';
  allBtn.addEventListener('click', () => setGroupFilter('all'));
  groupFilter.appendChild(allBtn);

  groups.forEach(g => {
    const btn = document.createElement('button');
    btn.className = `group-filter-btn${String(currentGroup) === String(g.id) ? ' active' : ''}`;
    btn.dataset.group = g.id;
    btn.textContent = g.name;
    btn.addEventListener('click', () => setGroupFilter(g.id));
    groupFilter.appendChild(btn);
  });
}

function setGroupFilter(groupId) {
  currentGroup = groupId;
  renderGroupFilter();
  render();
}

function render() {
  const filtered = getFiltered();
  list.innerHTML = '';

  filtered.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.completed ? ' completed' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const info = document.createElement('div');
    info.className = 'todo-info';

    const textRow = document.createElement('div');
    textRow.className = 'todo-text-row';

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;
    textRow.appendChild(span);

    if (todo.description) {
      const expandBtn = document.createElement('button');
      expandBtn.type = 'button';
      expandBtn.className = 'desc-expand-btn';
      const isExpanded = expandedDescriptions.has(todo.id);
      expandBtn.textContent = isExpanded ? '▲' : '▼';
      expandBtn.title = isExpanded ? '설명 접기' : '설명 보기';
      expandBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (expandedDescriptions.has(todo.id)) {
          expandedDescriptions.delete(todo.id);
        } else {
          expandedDescriptions.add(todo.id);
        }
        render();
      });
      textRow.appendChild(expandBtn);
    }

    info.appendChild(textRow);

    if (todo.groupId) {
      const group = groups.find(g => g.id === todo.groupId);
      if (group) {
        const badge = document.createElement('span');
        badge.className = 'group-badge';
        badge.textContent = group.name;
        textRow.appendChild(badge);
      }
    }

    if (todo.completed && todo.completedAt) {
      const time = document.createElement('span');
      time.className = 'completion-time';
      time.textContent = formatDate(new Date(todo.completedAt));
      info.appendChild(time);
    }

    if (todo.description && expandedDescriptions.has(todo.id)) {
      const desc = document.createElement('p');
      desc.className = 'todo-description';
      desc.textContent = todo.description;
      info.appendChild(desc);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', '삭제');
    delBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.append(checkbox, info, delBtn);
    list.appendChild(li);
  });

  const remaining = todos.filter(t => !t.completed).length;
  countText.textContent = `${remaining}개 남음`;

  const isEmpty = filtered.length === 0;
  emptyState.classList.toggle('visible', isEmpty);
}

// ── 앱 이벤트 ──────────────────────────────────────
groupAddToggleBtn.addEventListener('click', () => {
  const isHidden = groupAddForm.classList.toggle('hidden');
  groupAddToggleBtn.textContent = isHidden ? '+ 추가' : '- 취소';
  if (!isHidden) groupNameInput.focus();
  else groupNameInput.value = '';
});

async function submitGroup() {
  const name = groupNameInput.value.trim();
  if (!name) return;
  await addGroup(name);
  groupNameInput.value = '';
  groupAddForm.classList.add('hidden');
  groupAddToggleBtn.textContent = '+ 추가';
}

groupConfirmBtn.addEventListener('click', submitGroup);
groupNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitGroup(); } });

descToggleBtn.addEventListener('click', () => {
  const isVisible = descInput.classList.toggle('visible');
  descToggleBtn.textContent = isVisible ? '- 설명 취소' : '+ 설명 추가';
  if (!isVisible) descInput.value = '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  const description = descInput.value.trim();
  const groupId = groupSelect.value ? Number(groupSelect.value) : null;
  input.value = '';
  descInput.value = '';
  descInput.classList.remove('visible');
  descToggleBtn.textContent = '+ 설명 추가';
  groupSelect.value = '';
  await addTodo(text, description, groupId);
});

clearBtn.addEventListener('click', clearCompleted);

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// ── 초기화 ─────────────────────────────────────────
async function init() {
  currentGroup = 'all';
  currentFilter = 'all';
  filterBtns.forEach((b, i) => b.classList.toggle('active', i === 0));

  const [{ data: groupRows, error: groupErr }, { data: todoRows, error: todoErr }] = await Promise.all([
    supabase.from('groups').select('*').order('created_at'),
    supabase.from('todos').select('*').order('created_at'),
  ]);

  if (groupErr) console.error('groups 로드 실패:', groupErr);
  if (todoErr) console.error('todos 로드 실패:', todoErr);

  groups = (groupRows || []).map(g => ({ id: g.id, name: g.name }));
  todos = (todoRows || []).map(mapTodo);

  renderGroups();
  renderGroupFilter();
  syncGroupSelect();
  render();
}
