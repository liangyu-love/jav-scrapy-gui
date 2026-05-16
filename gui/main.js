const { app, BrowserWindow, clipboard, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');

const CLI_CHILD_FLAG = '--jav-cli-child';
let mainWindow = null;
let activeProcess = null;

function resolveAppRoot() {
  return app && app.isPackaged ? app.getAppPath() : path.resolve(__dirname, '..');
}

function resolveCliPath() {
  return path.join(resolveAppRoot(), 'dist', 'jav.js');
}

function runCliChildIfRequested() {
  const flagIndex = process.argv.indexOf(CLI_CHILD_FLAG);
  if (flagIndex === -1) {
    return false;
  }

  const cliArgs = process.argv.slice(flagIndex + 1);
  const cliPath = resolveCliPath();
  process.argv = [process.execPath, cliPath, ...cliArgs];
  require(cliPath);
  return true;
}

if (!runCliChildIfRequested()) {
  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (activeProcess) {
      activeProcess.kill();
      activeProcess = null;
    }

    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  registerIpcHandlers();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    title: 'JAV Scrapy Launcher',
    backgroundColor: '#faf8f6',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function registerIpcHandlers() {
  ipcMain.handle('dialog:select-output', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择输出目录',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('shell:open-path', async (_event, targetPath) => {
    if (!targetPath || typeof targetPath !== 'string') {
      return { ok: false, error: '输出目录为空' };
    }

    const error = await shell.openPath(targetPath);
    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('shell:open-external', async (_event, targetUrl) => {
    if (!targetUrl || typeof targetUrl !== 'string') {
      return { ok: false, error: '链接为空' };
    }

    try {
      await shell.openExternal(targetUrl);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('process:start-crawl', async (_event, args) => {
    return startCliProcess(['crawl', ...sanitizeArgs(args)]);
  });

  ipcMain.handle('process:start-update', async () => {
    return startCliProcess(['update']);
  });

  ipcMain.handle('process:stop', async () => {
    if (!activeProcess) {
      return { ok: false, error: '没有正在运行的任务' };
    }

    activeProcess.kill();
    activeProcess = null;
    sendProcessEvent('stopped', '任务已停止');
    return { ok: true };
  });

  ipcMain.handle('results:load', async (_event, targetPath) => {
    return loadResults(targetPath);
  });

  ipcMain.handle('clipboard:write-text', async (_event, text) => {
    if (typeof text !== 'string' || !text.trim()) {
      return { ok: false, error: '没有可复制的内容' };
    }

    clipboard.writeText(text);
    return { ok: true };
  });

  ipcMain.handle('dialog:save-file', async (_event, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出磁力链接',
      defaultPath: defaultName || 'magnets.txt',
      filters: [
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true };
    }

    return { ok: true, filePath: result.filePath };
  });

  ipcMain.handle('fs:write-file', async (_event, filePath, content) => {
    if (!filePath || typeof filePath !== 'string') {
      return { ok: false, error: '文件路径为空' };
    }

    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

function sanitizeArgs(args) {
  if (!Array.isArray(args)) {
    return [];
  }

  return args
    .filter((arg) => typeof arg === 'string')
    .map((arg) => arg.trim())
    .filter(Boolean);
}

function startCliProcess(args) {
  if (activeProcess) {
    return { ok: false, error: '已有任务正在运行，请先停止或等待完成' };
  }

  const commandInfo = createCommand(args);
  activeProcess = spawn(commandInfo.command, commandInfo.args, {
    cwd: process.cwd(),
    windowsHide: true,
    env: {
      ...process.env,
      FORCE_COLOR: '0'
    }
  });

  sendProcessEvent('started', formatCommand(commandInfo.command, commandInfo.args));

  activeProcess.stdout.on('data', (chunk) => {
    sendProcessEvent('stdout', chunk.toString());
  });

  activeProcess.stderr.on('data', (chunk) => {
    sendProcessEvent('stderr', chunk.toString());
  });

  activeProcess.on('error', (error) => {
    sendProcessEvent('error', error.message);
    activeProcess = null;
  });

  activeProcess.on('close', (code, signal) => {
    sendProcessEvent('closed', `任务结束，退出码: ${code ?? '无'}${signal ? `，信号: ${signal}` : ''}`);
    activeProcess = null;
  });

  return { ok: true };
}

function createCommand(args) {
  if (app.isPackaged) {
    return {
      command: process.execPath,
      args: [CLI_CHILD_FLAG, ...args]
    };
  }

  return {
    command: process.env.JAV_GUI_NODE || process.env.npm_node_execpath || 'node',
    args: [resolveCliPath(), ...args]
  };
}

function formatCommand(command, args) {
  return [command, ...args].map(quoteArg).join(' ');
}

function quoteArg(arg) {
  if (!/\s/.test(arg)) {
    return arg;
  }

  return `"${arg.replace(/"/g, '\\"')}"`;
}

function sendProcessEvent(type, message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('process:event', {
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    });
  }
}

function loadResults(targetPath) {
  const outputDir = typeof targetPath === 'string' && targetPath.trim()
    ? targetPath.trim()
    : process.cwd();
  const dataPath = path.join(outputDir, 'filmData.json');

  if (!fs.existsSync(dataPath)) {
    return {
      ok: false,
      error: `未找到结果文件: ${dataPath}`,
      outputDir
    };
  }

  try {
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const films = Array.isArray(parsed) ? parsed : [parsed];
    const imageFiles = findImageFiles(outputDir);
    const items = films.map((film, index) => normalizeFilm(film, index, imageFiles));

    return {
      ok: true,
      outputDir,
      dataPath,
      total: items.length,
      items
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      outputDir
    };
  }
}

function findImageFiles(outputDir) {
  if (!fs.existsSync(outputDir)) {
    return [];
  }

  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  return fs.readdirSync(outputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && imageExts.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const fullPath = path.join(outputDir, entry.name);
      return {
        name: entry.name,
        base: path.basename(entry.name, path.extname(entry.name)),
        fullPath,
        url: pathToFileURL(fullPath).href
      };
    });
}

function normalizeFilm(film, index, imageFiles) {
  const title = typeof film?.title === 'string' ? film.title : '';
  const magnetLinks = Array.isArray(film?.magnetLinks)
    ? film.magnetLinks
        .filter((item) => item && typeof item.link === 'string' && item.link.trim())
        .map((item) => ({
          link: item.link.trim(),
          size: typeof item.size === 'string' ? item.size.trim() : ''
        }))
    : [];
  const image = findImageForFilm(title, imageFiles);

  return {
    id: `${index}-${title || 'untitled'}`,
    title,
    code: extractFilmCode(title, magnetLinks),
    category: Array.isArray(film?.category) ? film.category.filter(Boolean) : [],
    actress: Array.isArray(film?.actress) ? film.actress.filter(Boolean) : [],
    magnetLinks,
    imageUrl: image?.url || null,
    imageName: image?.name || null
  };
}

function findImageForFilm(title, imageFiles) {
  if (!title || imageFiles.length === 0) {
    return null;
  }

  const normalizedTitle = normalizeForMatch(title);
  const exact = imageFiles.find((image) => normalizeForMatch(image.base) === normalizedTitle);
  if (exact) {
    return exact;
  }

  const code = extractFilmCode(title, []);
  if (code) {
    const byCode = imageFiles.find((image) => image.base.toUpperCase().includes(code));
    if (byCode) {
      return byCode;
    }
  }

  const byContain = imageFiles.find((image) => {
    const normalizedImage = normalizeForMatch(image.base);
    return normalizedImage.includes(normalizedTitle.slice(0, 30)) ||
      normalizedTitle.includes(normalizedImage.slice(0, 30));
  });
  if (byContain) {
    return byContain;
  }

  const titleTokens = tokenizeTitle(title);
  let bestMatch = null;
  let bestScore = 0;
  for (const image of imageFiles) {
    const imageTokens = tokenizeTitle(image.base);
    const overlap = titleTokens.filter((token) => imageTokens.includes(token)).length;
    const score = titleTokens.length > 0 ? overlap / titleTokens.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = image;
    }
  }

  return bestScore >= 0.35 ? bestMatch : null;
}

function normalizeForMatch(value) {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim();
}

function tokenizeTitle(value) {
  return String(value)
    .toLowerCase()
    .replace(/[\\/:*?"<>|()[\]{}]+/g, ' ')
    .split(/[\s._-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && token !== 'jpg' && token !== 'jpeg' && token !== 'png');
}

function extractFilmCode(title, magnetLinks) {
  const titleMatch = String(title).match(/[A-Z]{2,10}-?\d{2,6}[A-Z]?/i);
  if (titleMatch) {
    return titleMatch[0].toUpperCase();
  }

  for (const magnet of magnetLinks) {
    const dnMatch = String(magnet.link).match(/[?&]dn=([^&]+)/i);
    if (!dnMatch) {
      continue;
    }

    try {
      const decoded = decodeURIComponent(dnMatch[1]);
      const codeMatch = decoded.match(/[A-Z]{2,10}-?\d{2,6}[A-Z]?/i);
      if (codeMatch) {
        return codeMatch[0].toUpperCase();
      }
    } catch {
      // Ignore malformed dn values.
    }
  }

  return '';
}
