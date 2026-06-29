let todos = [];
let groups = [];
let currentFilter = 'all';
let expandedDescriptions = new Set();

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
const list = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const countText = document.getElementById('count-text');
const clearBtn = document.getElementById('clear-btn');
const filterBtns = document.querySelectorAll('.filter-btn');

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

function addGroup(name) {
  groups.push({ id: Date.now(), name });
  renderGroups();
  syncGroupSelect();
}

function deleteGroup(id) {
  groups = groups.filter(g => g.id !== id);
  todos = todos.map(t => t.groupId === id ? { ...t, groupId: null } : t);
  renderGroups();
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

function addTodo(text, description = '', groupId = null) {
  todos.push({ id: Date.now(), text, description, groupId, completed: false, completedAt: null });
  render();
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  expandedDescriptions.delete(id);
  render();
}

function formatDate(date) {
  const y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${M}-${d} ${h}:${m}`;
}

function toggleTodo(id) {
  todos = todos.map(t => {
    if (t.id !== id) return t;
    const completed = !t.completed;
    return { ...t, completed, completedAt: completed ? new Date() : null };
  });
  render();
}

function clearCompleted() {
  todos.filter(t => t.completed).forEach(t => expandedDescriptions.delete(t.id));
  todos = todos.filter(t => !t.completed);
  render();
}

function getFiltered() {
  if (currentFilter === 'active') return todos.filter(t => !t.completed);
  if (currentFilter === 'completed') return todos.filter(t => t.completed);
  return todos;
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

groupAddToggleBtn.addEventListener('click', () => {
  const isHidden = groupAddForm.classList.toggle('hidden');
  groupAddToggleBtn.textContent = isHidden ? '+ 추가' : '- 취소';
  if (!isHidden) groupNameInput.focus();
  else groupNameInput.value = '';
});

function submitGroup() {
  const name = groupNameInput.value.trim();
  if (!name) return;
  addGroup(name);
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

form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  const description = descInput.value.trim();
  const groupId = groupSelect.value ? Number(groupSelect.value) : null;
  addTodo(text, description, groupId);
  input.value = '';
  descInput.value = '';
  descInput.classList.remove('visible');
  descToggleBtn.textContent = '+ 설명 추가';
  groupSelect.value = '';
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

render();
