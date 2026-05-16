const form = document.getElementById('crawlForm');
const commandPreview = document.getElementById('commandPreview');
const configDrawer = document.getElementById('configDrawer');
const logDrawer = document.getElementById('logDrawer');
const toggleConfigDrawerButton = document.getElementById('toggleConfigDrawer');
const toggleLogDrawerButton = document.getElementById('toggleLogDrawer');
const reloadResultsQuickButton = document.getElementById('reloadResultsQuick');
const closeConfigDrawerButton = document.getElementById('closeConfigDrawer');
const closeLogDrawerButton = document.getElementById('closeLogDrawer');
const openConfigFromHeaderButton = document.getElementById('openConfigFromHeader');
const openLogFromHeaderButton = document.getElementById('openLogFromHeader');
const logOutput = document.getElementById('logOutput');
const statusBadge = document.getElementById('statusBadge');
const runDot = document.getElementById('runDot');
const runState = document.getElementById('runState');
const resultCount = document.getElementById('resultCount');
const magnetCount = document.getElementById('magnetCount');
const errorCount = document.getElementById('errorCount');
const progressLabel = document.getElementById('progressLabel');
const progressBar = document.getElementById('progressBar');
const startCrawlButton = document.getElementById('startCrawl');
const stopTaskButton = document.getElementById('stopTask');
const startUpdateButton = document.getElementById('startUpdate');
const chooseOutputButton = document.getElementById('chooseOutput');
const openOutputButton = document.getElementById('openOutput');
const clearLogButton = document.getElementById('clearLog');
const resultDirInput = document.getElementById('resultDir');
const chooseResultDirButton = document.getElementById('chooseResultDir');
const loadResultsButton = document.getElementById('loadResults');
const resultSearchInput = document.getElementById('resultSearch');
const resultStats = document.getElementById('resultStats');
const resultsMessage = document.getElementById('resultsMessage');
const resultsList = document.getElementById('resultsList');
const logFilterButtons = document.querySelectorAll('.log-filter');
const detailModal = document.getElementById('detailModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const closeDetailModalButton = document.getElementById('closeDetailModal');
const detailPoster = document.getElementById('detailPoster');
const detailTags = document.getElementById('detailTags');
const detailTitle = document.getElementById('detailTitle');
const detailMeta = document.getElementById('detailMeta');
const detailMagnetList = document.getElementById('detailMagnetList');
const copyDetailFirstButton = document.getElementById('copyDetailFirst');
const copyDetailAllButton = document.getElementById('copyDetailAll');
const openDetailFirstButton = document.getElementById('openDetailFirst');

let resultItems = [];
let logEntries = [];
let activeLogFilter = 'all';
let activeDetailItem = null;
let activeActressFilter = null;
const actressFilterContainer = document.getElementById('actressFilter');
const exportMagnetsButton = document.getElementById('exportMagnets');
let stats = {
  target: 0,
  success: 0,
  errors: 0
};

const STORAGE_KEY_OUTPUT = 'jav-gui-output-dir';
const STORAGE_KEY_RESULT_DIR = 'jav-gui-result-dir';

(function restoreSavedDirs() {
  const savedOutput = localStorage.getItem(STORAGE_KEY_OUTPUT);
  const savedResultDir = localStorage.getItem(STORAGE_KEY_RESULT_DIR);
  if (savedOutput) document.getElementById('output').value = savedOutput;
  if (savedResultDir) resultDirInput.value = savedResultDir;
})();

const optionMap = [
  ['limit', '--limit'],
  ['parallel', '--parallel'],
  ['delay', '--delay'],
  ['proxy', '--proxy'],
  ['search', '--search'],
  ['base', '--base'],
  ['output', '--output'],
  ['cookies', '--cookies']
];

const flagMap = [
  ['cloudflare', '--cloudflare'],
  ['nomag', '--nomag'],
  ['allmag', '--allmag'],
  ['nopic', '--nopic'],
  ['debug', '--debug'],
  ['noStrictSsl', '--no-strict-ssl']
];

function getValue(id) {
  return document.getElementById(id).value.trim();
}

function getChecked(id) {
  return document.getElementById(id).checked;
}

function buildArgs() {
  const args = [];

  for (const [id, flag] of optionMap) {
    const value = getValue(id);
    if (value) {
      args.push(flag, value);
    }
  }

  const timeoutSeconds = Number(getValue('timeout'));
  if (Number.isFinite(timeoutSeconds) && timeoutSeconds > 0) {
    args.push('--timeout', String(Math.round(timeoutSeconds * 1000)));
  }

  for (const [id, flag] of flagMap) {
    if (getChecked(id)) {
      args.push(flag);
    }
  }

  return args;
}

function quoteArg(arg) {
  if (!/\s/.test(arg)) {
    return arg;
  }

  return `"${arg.replace(/"/g, '\\"')}"`;
}

function updatePreview() {
  const args = buildArgs();
  commandPreview.value = ['jav', 'crawl', ...args].map(quoteArg).join(' ');

  if (!resultDirInput.value.trim()) {
    resultDirInput.placeholder = getValue('output') || '默认读取输出目录';
  }
}

function appendLog(type, message, timestamp) {
  const normalized = String(message)
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\r/g, '');
  const entry = {
    type,
    message: normalized,
    timestamp: timestamp || new Date().toLocaleTimeString()
  };
  logEntries.push(entry);
  updateStatsFromLog(entry);
  renderLogs();
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setRunning(isRunning, label) {
  statusBadge.textContent = label;
  statusBadge.classList.toggle('running', isRunning);
  runState.textContent = label;
  runDot.className = `status-dot ${isRunning ? 'running' : 'idle'}`;
  startCrawlButton.disabled = isRunning;
  startUpdateButton.disabled = isRunning;
  stopTaskButton.disabled = !isRunning;
}

async function runAction(action, args = []) {
  const result = action === 'crawl'
    ? await window.javLauncher.startCrawl(args)
    : await window.javLauncher.startUpdate();

  if (!result.ok) {
    appendLog('error', result.error || '启动失败', new Date().toLocaleTimeString());
    setRunning(false, '空闲');
  }
}

form.addEventListener('input', updatePreview);
form.addEventListener('change', updatePreview);

toggleConfigDrawerButton.addEventListener('click', () => toggleDrawer(configDrawer, toggleConfigDrawerButton));
toggleLogDrawerButton.addEventListener('click', () => toggleDrawer(logDrawer, toggleLogDrawerButton));
openConfigFromHeaderButton.addEventListener('click', () => openDrawer(configDrawer, toggleConfigDrawerButton));
openLogFromHeaderButton.addEventListener('click', () => openDrawer(logDrawer, toggleLogDrawerButton));
closeConfigDrawerButton.addEventListener('click', () => closeDrawer(configDrawer, toggleConfigDrawerButton));
closeLogDrawerButton.addEventListener('click', () => closeDrawer(logDrawer, toggleLogDrawerButton));
reloadResultsQuickButton.addEventListener('click', () => loadResults());
modalBackdrop.addEventListener('click', closeDetailModal);
closeDetailModalButton.addEventListener('click', closeDetailModal);
copyDetailFirstButton.addEventListener('click', () => copyText(activeDetailItem?.magnetLinks?.[0]?.link || ''));
copyDetailAllButton.addEventListener('click', () => copyText((activeDetailItem?.magnetLinks || []).map((magnet) => magnet.link).join('\n')));
openDetailFirstButton.addEventListener('click', () => openMagnet(activeDetailItem?.magnetLinks?.[0]?.link || ''));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeDetailModal();
  }
});

logFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeLogFilter = button.dataset.filter;
    logFilterButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderLogs();
  });
});

chooseOutputButton.addEventListener('click', async () => {
  const selected = await window.javLauncher.selectOutput();
  if (selected) {
    document.getElementById('output').value = selected;
    localStorage.setItem(STORAGE_KEY_OUTPUT, selected);
    if (!resultDirInput.value.trim()) {
      resultDirInput.value = selected;
      localStorage.setItem(STORAGE_KEY_RESULT_DIR, selected);
    }
    updatePreview();
  }
});

openOutputButton.addEventListener('click', async () => {
  const output = getValue('output');
  if (!output) {
    appendLog('warn', '请先选择输出目录，或在启动目录中查看结果。', new Date().toLocaleTimeString());
    return;
  }

  const result = await window.javLauncher.openPath(output);
  if (!result.ok) {
    appendLog('error', result.error || '无法打开输出目录', new Date().toLocaleTimeString());
  }
});

startCrawlButton.addEventListener('click', async () => {
  const args = buildArgs();
  stats = {
    target: Number(getValue('limit')) || 0,
    success: 0,
    errors: 0
  };
  updateDashboard();
  setRunning(true, '运行中');
  closeDrawer(configDrawer, toggleConfigDrawerButton);
  openDrawer(logDrawer, toggleLogDrawerButton);
  appendLog('command', ['jav', 'crawl', ...args].map(quoteArg).join(' '), new Date().toLocaleTimeString());
  await runAction('crawl', args);
});

startUpdateButton.addEventListener('click', async () => {
  setRunning(true, '更新中');
  closeDrawer(configDrawer, toggleConfigDrawerButton);
  openDrawer(logDrawer, toggleLogDrawerButton);
  appendLog('command', 'jav update', new Date().toLocaleTimeString());
  await runAction('update');
});

stopTaskButton.addEventListener('click', async () => {
  const result = await window.javLauncher.stopProcess();
  if (!result.ok) {
    appendLog('error', result.error || '停止失败', new Date().toLocaleTimeString());
  }
});

clearLogButton.addEventListener('click', () => {
  logEntries = [];
  stats.errors = 0;
  renderLogs();
  updateDashboard();
});

chooseResultDirButton.addEventListener('click', async () => {
  const selected = await window.javLauncher.selectOutput();
  if (selected) {
    resultDirInput.value = selected;
    localStorage.setItem(STORAGE_KEY_RESULT_DIR, selected);
    await loadResults();
  }
});

loadResultsButton.addEventListener('click', loadResults);
resultSearchInput.addEventListener('input', renderResults);

exportMagnetsButton.addEventListener('click', async () => {
  const filtered = getFilteredItems();
  const lines = [];
  filtered.forEach((item) => {
    if (item.magnetLinks.length === 0) return;
    const label = [item.code, ...(item.actress || [])].filter(Boolean).join(' - ') || item.title;
    lines.push(`# ${label}`);
    item.magnetLinks.forEach((m) => lines.push(m.link));
    lines.push('');
  });

  if (lines.length === 0) {
    appendLog('warn', '当前筛选结果中没有磁力链接可导出', new Date().toLocaleTimeString());
    return;
  }

  const defaultName = activeActressFilter
    ? `${activeActressFilter}_magnets.txt`
    : 'all_magnets.txt';
  const saveResult = await window.javLauncher.saveFileDialog(defaultName);
  if (!saveResult.ok) return;

  const writeResult = await window.javLauncher.writeFile(saveResult.filePath, lines.join('\n'));
  if (writeResult.ok) {
    appendLog('success', `已导出 ${filtered.length} 部影片的磁力链接到: ${saveResult.filePath}`, new Date().toLocaleTimeString());
  } else {
    appendLog('error', writeResult.error || '导出失败', new Date().toLocaleTimeString());
  }
});

window.javLauncher.onProcessEvent((event) => {
  appendLog(event.type, event.message, event.timestamp);

  if (['closed', 'error', 'stopped'].includes(event.type)) {
    setRunning(false, '空闲');
    if (event.type === 'closed') {
      loadResults({ silent: true });
    }
  }
});

updatePreview();

async function loadResults(options = {}) {
  const outputDir = resultDirInput.value.trim() || getValue('output');
  const result = await window.javLauncher.loadResults(outputDir);

  if (!result.ok) {
    resultItems = [];
    renderResults();
    if (!options.silent) {
      resultsMessage.textContent = result.error || '读取结果失败';
    }
    resultStats.textContent = '未读取';
    return;
  }

  resultItems = result.items || [];
  resultDirInput.value = result.outputDir || outputDir;
  localStorage.setItem(STORAGE_KEY_RESULT_DIR, resultDirInput.value);
  resultsMessage.textContent = '';
  activeActressFilter = null;
  buildActressFilter();
  updateDashboard();
  renderResults();
}

function getFilteredItems() {
  const query = resultSearchInput.value.trim().toLowerCase();
  return resultItems.filter((item) => {
    if (activeActressFilter && !(item.actress || []).includes(activeActressFilter)) {
      return false;
    }
    if (!query) {
      return true;
    }

    return [
      item.title,
      item.code,
      ...(item.category || []),
      ...(item.actress || []),
      ...(item.magnetLinks || []).map((magnet) => `${magnet.size} ${magnet.link}`)
    ].join(' ').toLowerCase().includes(query);
  });
}

function renderResults() {
  const filtered = getFilteredItems();

  resultStats.textContent = resultItems.length
    ? `${filtered.length}/${resultItems.length} 部影片`
    : '无数据';
  updateDashboard(filtered.length);

  resultsList.innerHTML = '';
  if (filtered.length === 0) {
    resultsMessage.textContent = resultItems.length ? '没有匹配的结果' : '请选择结果目录并读取 filmData.json';
    return;
  }

  resultsMessage.textContent = '';
  const fragment = document.createDocumentFragment();
  filtered.forEach((item) => fragment.appendChild(createResultCard(item)));
  resultsList.appendChild(fragment);
}

function buildActressFilter() {
  actressFilterContainer.innerHTML = '';
  const counts = {};
  resultItems.forEach((item) => {
    (item.actress || []).forEach((name) => {
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  if (sorted.length === 0) return;

  const allChip = document.createElement('button');
  allChip.type = 'button';
  allChip.className = 'actress-chip active';
  allChip.textContent = '全部';
  allChip.addEventListener('click', () => {
    activeActressFilter = null;
    updateChipStates();
    renderResults();
  });
  actressFilterContainer.appendChild(allChip);

  sorted.forEach(([name, count]) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'actress-chip';
    chip.dataset.actress = name;
    chip.innerHTML = `${name} <span class="chip-count">${count}</span>`;
    chip.addEventListener('click', () => {
      activeActressFilter = activeActressFilter === name ? null : name;
      updateChipStates();
      renderResults();
    });
    actressFilterContainer.appendChild(chip);
  });
}

function updateChipStates() {
  actressFilterContainer.querySelectorAll('.actress-chip').forEach((chip) => {
    if (!chip.dataset.actress) {
      chip.classList.toggle('active', !activeActressFilter);
    } else {
      chip.classList.toggle('active', chip.dataset.actress === activeActressFilter);
    }
  });
}

function createResultCard(item) {
  const card = document.createElement('article');
  card.className = 'result-card';
  card.tabIndex = 0;

  const posterWrap = document.createElement('div');
  posterWrap.className = 'poster-wrap';
  if (item.imageUrl) {
    const img = document.createElement('img');
    img.src = item.imageUrl;
    img.alt = item.title || 'poster';
    img.loading = 'lazy';
    posterWrap.appendChild(img);
  } else {
    const noPoster = document.createElement('div');
    noPoster.className = 'no-poster';
    noPoster.textContent = '无图片';
    posterWrap.appendChild(noPoster);
  }

  if (item.magnetLinks.length > 0) {
    const badge = document.createElement('span');
    badge.className = 'card-magnet-badge';
    badge.textContent = `${item.magnetLinks.length} 磁力`;
    posterWrap.appendChild(badge);
  }

  const body = document.createElement('div');
  body.className = 'card-body';

  if (item.code) {
    const code = document.createElement('div');
    code.className = 'card-code';
    code.textContent = item.code;
    body.appendChild(code);
  }

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = item.title || item.code || '未命名影片';
  body.appendChild(title);

  const summary = document.createElement('div');
  summary.className = 'card-summary';
  const parts = [];
  if (item.actress && item.actress.length > 0 && item.actress[0]) {
    parts.push(item.actress.slice(0, 2).join(', '));
  }
  if (item.category && item.category.length > 0) {
    parts.push(item.category.slice(0, 2).join(', '));
  }
  summary.textContent = parts.join(' · ') || `${item.magnetLinks.length} 个磁力`;
  body.appendChild(summary);

  card.append(posterWrap, body);
  card.addEventListener('click', (event) => {
    if (event.target.closest('button')) {
      return;
    }
    openDetailModal(item);
  });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      openDetailModal(item);
    }
  });
  return card;
}

function createTag(text, type) {
  const tag = document.createElement('span');
  tag.className = `tag ${type}`;
  tag.textContent = text;
  return tag;
}

function createMetaLine(label, value) {
  const line = document.createElement('p');
  const name = document.createElement('span');
  name.textContent = label;
  const text = document.createElement('b');
  text.textContent = value || '-';
  line.append(name, text);
  return line;
}

function createMagnetCollapse(magnetLinks) {
  const wrapper = document.createElement('div');
  wrapper.className = 'magnet-collapse';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'magnet-collapse-toggle';
  toggle.innerHTML = `<span>磁力链接 (${magnetLinks.length})</span><span class="arrow">▼</span>`;

  const body = document.createElement('div');
  body.className = 'magnet-collapse-body';

  magnetLinks.forEach((magnet) => {
    const item = document.createElement('div');
    item.className = 'magnet-item';

    const size = document.createElement('span');
    size.className = 'magnet-size';
    size.textContent = magnet.size || '-';

    const link = document.createElement('span');
    link.className = 'magnet-link';
    link.textContent = magnet.link;
    link.title = magnet.link;

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = '复制';
    copy.addEventListener('click', () => copyText(magnet.link));

    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = '调用';
    open.addEventListener('click', () => openMagnet(magnet.link));

    item.append(size, link, copy, open);
    body.appendChild(item);
  });

  toggle.addEventListener('click', () => {
    const expanded = body.classList.toggle('expanded');
    toggle.classList.toggle('expanded', expanded);
  });

  wrapper.append(toggle, body);
  return wrapper;
}

function createMagnetRow(magnet) {
  const row = document.createElement('div');
  row.className = 'magnet-item';

  const size = document.createElement('span');
  size.className = 'magnet-size';
  size.textContent = magnet.size || '-';

  const link = document.createElement('span');
  link.className = 'magnet-link';
  link.textContent = magnet.link;
  link.title = magnet.link;

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = '复制';
  copy.addEventListener('click', () => copyText(magnet.link));
  const open = document.createElement('button');
  open.type = 'button';
  open.textContent = '调用';
  open.addEventListener('click', () => openMagnet(magnet.link));

  row.append(size, link, copy, open);
  return row;
}

async function copyText(text) {
  const result = await window.javLauncher.copyText(text);
  const timestamp = new Date().toLocaleTimeString();
  appendLog(result.ok ? 'copy' : 'error', result.ok ? '已复制到剪贴板' : result.error, timestamp);
}

function joinList(value) {
  return Array.isArray(value) && value.length > 0 ? value.join(' / ') : '-';
}

function openDrawer(drawer, button) {
  drawer.classList.add('open');
  button.classList.add('active');
}

function closeDrawer(drawer, button) {
  drawer.classList.remove('open');
  button.classList.remove('active');
}

function toggleDrawer(drawer, button) {
  if (drawer.classList.contains('open')) {
    closeDrawer(drawer, button);
  } else {
    openDrawer(drawer, button);
  }
}

function openDetailModal(item) {
  activeDetailItem = item;
  detailPoster.innerHTML = '';
  if (item.imageUrl) {
    const img = document.createElement('img');
    img.src = item.imageUrl;
    img.alt = item.title || 'poster';
    detailPoster.appendChild(img);
  } else {
    detailPoster.textContent = '无图片';
  }

  detailTags.innerHTML = '';
  if (item.code) {
    detailTags.appendChild(createTag(item.code, 'code'));
  }
  item.actress.forEach((name) => detailTags.appendChild(createTag(name, 'actress')));
  item.category.forEach((name) => detailTags.appendChild(createTag(name, 'category')));

  detailTitle.textContent = item.title || item.code || '未命名影片';
  detailMeta.innerHTML = '';
  detailMeta.appendChild(createMetaLine('番号', item.code || '-'));
  detailMeta.appendChild(createMetaLine('演员', joinList(item.actress)));
  detailMeta.appendChild(createMetaLine('分类', joinList(item.category)));

  detailMagnetList.innerHTML = '';
  if (item.magnetLinks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-magnet';
    empty.textContent = '暂无磁力链接';
    detailMagnetList.appendChild(empty);
  } else {
    detailMagnetList.appendChild(createMagnetCollapse(item.magnetLinks));
  }

  copyDetailFirstButton.disabled = item.magnetLinks.length === 0;
  copyDetailAllButton.disabled = item.magnetLinks.length === 0;
  openDetailFirstButton.disabled = item.magnetLinks.length === 0;
  detailModal.classList.add('open');
  detailModal.setAttribute('aria-hidden', 'false');
}

function closeDetailModal() {
  detailModal.classList.remove('open');
  detailModal.setAttribute('aria-hidden', 'true');
  activeDetailItem = null;
}

async function openMagnet(link) {
  const result = await window.javLauncher.openExternal(link);
  appendLog(result.ok ? 'open' : 'error', result.ok ? '已调用系统下载器' : result.error, new Date().toLocaleTimeString());
}

function renderLogs() {
  const visible = logEntries.filter((entry) => {
    if (activeLogFilter === 'all') {
      return true;
    }
    if (activeLogFilter === 'error') {
      return entry.type === 'stderr' || entry.type === 'error' || /error|失败|错误/i.test(entry.message);
    }
    if (activeLogFilter === 'success') {
      return /success|完成|已抓取|成功/i.test(entry.message);
    }
    return true;
  });

  logOutput.innerHTML = '';
  const fragment = document.createDocumentFragment();
  for (const entry of visible) {
    const line = document.createElement('span');
    line.className = getLogLineClass(entry);
    const ts = document.createElement('span');
    ts.className = 'log-line-timestamp';
    ts.textContent = `[${entry.timestamp}] `;
    line.appendChild(ts);
    line.appendChild(document.createTextNode(`${entry.type.toUpperCase()}: ${entry.message}`));
    if (!entry.message.endsWith('\n')) {
      line.appendChild(document.createTextNode('\n'));
    }
    fragment.appendChild(line);
  }
  logOutput.appendChild(fragment);
}

function getLogLineClass(entry) {
  if (entry.type === 'stderr' || entry.type === 'error' || /error|失败|错误|ERROR/i.test(entry.message)) {
    return 'log-line-error';
  }
  if (/warn|警告|WARN/i.test(entry.message)) {
    return 'log-line-warn';
  }
  if (/success|完成|已抓取|成功/i.test(entry.message)) {
    return 'log-line-success';
  }
  if (entry.type === 'copy' || entry.type === 'open') {
    return 'log-line-copy';
  }
  return 'log-line-info';
}

function updateStatsFromLog(entry) {
  const message = entry.message;
  if (entry.type === 'stderr' || entry.type === 'error' || /失败|错误|ERROR/i.test(message)) {
    stats.errors += 1;
  }

  const targetMatch = message.match(/目标抓取数量:\s*(\d+)/);
  if (targetMatch) {
    stats.target = Number(targetMatch[1]) || stats.target;
  }

  const successMatches = message.match(/已抓取|已处理:/g);
  if (successMatches) {
    stats.success += successMatches.length;
  }

  updateDashboard();
}

function updateDashboard(visibleCount = null) {
  const totalResults = resultItems.length;
  const totalMagnets = resultItems.reduce((sum, item) => sum + item.magnetLinks.length, 0);
  resultCount.textContent = String(visibleCount ?? totalResults);
  magnetCount.textContent = String(totalMagnets);
  errorCount.textContent = String(stats.errors);

  const target = stats.target || totalResults || 0;
  const completed = Math.max(stats.success, totalResults);
  const percent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  progressBar.style.width = `${percent}%`;
  progressLabel.textContent = target > 0 ? `已完成 ${Math.min(completed, target)}/${target}` : '不限数量';
}
