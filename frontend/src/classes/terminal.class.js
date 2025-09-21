// 终端管理器类 - 合并了原Shell类的所有功能
class TerminalManager {
    constructor() {
        this.terminals = [];
        this.currentTerm = 0;
        // Ensure a global default for code paths that read window.currentTerm before any tab switch
        if (typeof window !== 'undefined' && typeof window.currentTerm === 'undefined') {
            window.currentTerm = 0;
        }
        this.maxTabs = 5;
        this.sockets = []; // WebSocket连接数组
        this.attachAddons = []; // 每个终端的 AttachAddon 实例
        this.fitAddons = []; // 每个终端的 FitAddon 实例
        this.cwd = []; // 当前工作目录数组
        this.localEcho = []; // 是否开启本地回显（ Windows stdio 模式时临时启用 ）
        this.lastSoundFX = Date.now();
        this.lastRefit = Date.now();

        // 检查 xterm 是否已加载
        if (typeof Terminal === 'undefined') {
            throw "xterm.js not loaded. Please include xterm.js in your HTML.";
        }
        this.xTerm = Terminal;

        // 检查 AttachAddon 是否已加载（UMD 全局：window.AttachAddon.AttachAddon）
        if (!window.AttachAddon || !window.AttachAddon.AttachAddon) {
            throw "AttachAddon not loaded. Please include xterm-addon-attach in your HTML.";
        }
        this.AttachAddon = window.AttachAddon.AttachAddon;
    }

    // 初始化终端系统
    async initTerminalSystem() {
        try {
            // 创建终端标签页HTML结构
            this.createTerminalTabs();

            // 创建第一个终端实例
            await this.createTerminalInstance(0);

            // 设置事件处理器
            this.setupEventHandlers();
            // 显示欢迎信息
            this.terminals[0].write(`Welcome to eDEX-UI v1.0.0 - Wails + \r\n`);

            console.log("终端系统初始化完成");
            return true;
        } catch (error) {
            console.error("终端系统初始化失败:", error);
            return false;
        }
    }

    // 创建终端实例（合并了原Shell类的Terminal创建逻辑）
    async createTerminalInstance(terminalIndex, opts = {}) {
        try {
            const parentId = opts.parentId || `terminal${terminalIndex}`;
            const port = opts.port || 3000;
            const host = opts.host || "127.0.0.1";

            // 创建Terminal实例
            const terminal = new Terminal({
                cursorBlink: window.theme.terminal.cursorBlink,
                cursorStyle: window.theme.terminal.cursorStyle,
                allowTransparency: window.theme.terminal.allowTransparency,
                allowProposedApi: true,
                fontFamily: window.theme.terminal.fontFamily,
                fontSize: window.theme.terminal.fontSize || (window.settings ? window.settings.termFontSize : 15),
                fontWeight: window.theme.terminal.fontWeight,
                fontWeightBold: window.theme.terminal.fontWeightBold,
                letterSpacing: window.theme.terminal.letterSpacing,
                lineHeight: window.theme.terminal.lineHeight,
                bellStyle: "none",
                theme: this._createTerminalTheme()
            });

            // 加载addon
            const fitAddon = new window.FitAddon.FitAddon();
            terminal.loadAddon(fitAddon);
            this.fitAddons[terminalIndex] = fitAddon;
            fitAddon.fit();
            // 打开终端
            terminal.open(document.getElementById(parentId));


            // 设置键盘事件处理器
            terminal.attachCustomKeyEventHandler(e => {
                if (window.keyboard) {
                    window.keyboard.keydownHandler(e);
                }
                return true;
            });

            terminal.focus();
            // 存储终端实例
            this.terminals[terminalIndex] = terminal;
            this.cwd[terminalIndex] = "";

            // 创建WebSocket连接并附加到终端
            await this._createWebSocketConnection(terminalIndex, terminal, host, port);

            // 设置终端事件监听器
            this._setupTerminalEventListeners(terminalIndex, terminal, parentId);

            this.fit(terminalIndex);

            return terminal;
        } catch (error) {
            console.error(`创建终端实例失败 (终端 ${terminalIndex}):`, error);
            return null;
        }
    }

    // 创建终端主题（从原Shell类合并）
    _createTerminalTheme() {
        const themeColor = `rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b})`;
        const colorify = (base, target) => this._mixColors(base, target, 0.3);
        return {
            foreground: window.theme.terminal.foreground,
            background: window.theme.terminal.background,
            cursor: window.theme.terminal.cursor,
            cursorAccent: window.theme.terminal.cursorAccent,
            selection: window.theme.terminal.selection,
            black: window.theme.colors.black || colorify("#2e3436", themeColor),
            red: window.theme.colors.red || colorify("#cc0000", themeColor),
            green: window.theme.colors.green || colorify("#4e9a06", themeColor),
            yellow: window.theme.colors.yellow || colorify("#c4a000", themeColor),
            blue: window.theme.colors.blue || colorify("#3465a4", themeColor),
            magenta: window.theme.colors.magenta || colorify("#75507b", themeColor),
            cyan: window.theme.colors.cyan || colorify("#06989a", themeColor),
            white: window.theme.colors.white || colorify("#d3d7cf", themeColor),
            brightBlack: window.theme.colors.brightBlack || colorify("#555753", themeColor),
            brightRed: window.theme.colors.brightRed || colorify("#ef2929", themeColor),
            brightGreen: window.theme.colors.brightGreen || colorify("#8ae234", themeColor),
            brightYellow: window.theme.colors.brightYellow || colorify("#fce94f", themeColor),
            brightBlue: window.theme.colors.brightBlue || colorify("#729fcf", themeColor),
            brightMagenta: window.theme.colors.brightMagenta || colorify("#ad7fa8", themeColor),
            brightCyan: window.theme.colors.brightCyan || colorify("#34e2e2", themeColor),
            brightWhite: window.theme.colors.brightWhite || colorify("#eeeeec", themeColor)
        };
    }

    // 创建WebSocket连接并使用AttachAddon附加到终端
    async _createWebSocketConnection(terminalIndex, terminal, host, port) {
        return new Promise((resolve, reject) => {
            const socket = new WebSocket(`ws://${host}:${port}/webterminal`);
            socket.binaryType = 'arraybuffer';

            socket.onopen = () => {
                this.sockets[terminalIndex] = socket;

                // 创建AttachAddon并附加到终端
                const attachAddon = new this.AttachAddon(socket, {
                    bidirectional: true
                });
                terminal.loadAddon(attachAddon);
                this.attachAddons[terminalIndex] = attachAddon;
                this.fit(terminalIndex);
                resolve();
            };

            // 移除自定义 onmessage，避免与 AttachAddon 的接收重复写入

            socket.onerror = (e) => {
                console.error(`终端 ${terminalIndex} WebSocket连接错误:`, e);
                reject(e);
            };

            socket.onclose = () => {
                delete this.sockets[terminalIndex];
                if (this.attachAddons[terminalIndex]) {
                    this.attachAddons[terminalIndex].dispose();
                    delete this.attachAddons[terminalIndex];
                }
            };
        });
    }


    // 设置终端事件监听器（从原Shell类合并）
    _setupTerminalEventListeners(terminalIndex, terminal, parentId) {
        const parent = document.getElementById(parentId);

        // 鼠标滚轮事件
        parent.addEventListener("wheel", e => {
            terminal.scrollLines(Math.round(e.deltaY / 10));
        });

        // 触摸事件
        let lastTouchY = null;
        parent.addEventListener("touchstart", e => {
            lastTouchY = e.targetTouches[0].screenY;
        });
        parent.addEventListener("touchmove", e => {
            if (lastTouchY) {
                const y = e.changedTouches[0].screenY;
                const deltaY = y - lastTouchY;
                lastTouchY = y;
                terminal.scrollLines(-Math.round(deltaY / 10));
            }
        });
        parent.addEventListener("touchend", () => {
            lastTouchY = null;
        });
        parent.addEventListener("touchcancel", () => {
            lastTouchY = null;
        });

        // F11全屏事件
        document.querySelector(".xterm-helper-textarea")?.addEventListener("keydown", e => {
            if (e.key === "F11" && window.settings.allowWindowed) {
                e.preventDefault();
                window.toggleFullScreen();
            }
        });
    }

    // 创建终端标签页HTML结构
    createTerminalTabs() {
        let shellContainer = document.getElementById("main_shell");
        shellContainer.innerHTML += `
            <ul id="main_shell_tabs">
                <li id="shell_tab0" onclick="window.terminalManager.focusShellTab(0);" class="active"><p>MAIN SHELL</p></li>
                <li id="shell_tab1" onclick="window.terminalManager.focusShellTab(1);"><p>SHELL 1</p></li>
                <li id="shell_tab2" onclick="window.terminalManager.focusShellTab(2);"><p>SHELL 2</p></li>
                <li id="shell_tab3" onclick="window.terminalManager.focusShellTab(3);"><p>SHELL 3</p></li>
                <li id="shell_tab4" onclick="window.terminalManager.focusShellTab(4);"><p>SHELL 4</p></li>
            </ul>
            <div id="main_shell_innercontainer">
                <pre id="terminal0" class="active"></pre>
                <pre id="terminal1"></pre>
                <pre id="terminal2"></pre>
                <pre id="terminal3"></pre>
                <pre id="terminal4"></pre>
            </div>`;
    }

    // 设置事件处理器（精简，避免无效引用导致错误）
    setupEventHandlers() {
        window.onresize = () => { console.log("onresize"); this.fitAll(); };
    }

    // 切换终端标签页
    focusShellTab(index) {
        if (index < 0 || index >= this.maxTabs) return;

        // 移除所有活动状态
        document.querySelectorAll('#main_shell_tabs li').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('#main_shell_innercontainer pre').forEach(term => {
            term.classList.remove('active');
        });

        // 激活选中的标签页
        document.getElementById(`shell_tab${index}`).classList.add('active');
        document.getElementById(`terminal${index}`).classList.add('active');

        // 如果终端不存在，创建新的
        if (!this.terminals[index]) {
            // 异步创建并在完成后聚焦与适配
            this.createTerminalInstance(index).then(() => {
                this.currentTerm = index;
                window.currentTerm = index;

                this.fit(index);
            });
        }

        // 更新当前终端索引
        window.currentTerm = index;
        this.currentTerm = index;
        // 聚焦到当前终端
        this.terminals[index].focus();
        this.fit(index);
    }

    // 调整终端大小（精简）
    fit(terminalIndex) {
        const terminal = this.terminals[terminalIndex];
        const fitAddon = this.fitAddons[terminalIndex];
        if (!terminal || !fitAddon) return;
        fitAddon.fit();
    }

    // 调整所有终端大小
    fitAll() {
        this.terminals.forEach((terminal, index) => {
            if (terminal) {
                this.fit(index);
            }
        });
    }

    // 写入命令（通过终端直接写入，AttachAddon会自动处理）
    write(terminalIndex, cmd) {
        const terminal = this.terminals[terminalIndex];
        if (terminal) {
            terminal.write(cmd);
        }
    }

    // 写入命令并换行（通过终端直接写入，AttachAddon会自动处理）
    writeln(terminalIndex, cmd) {
        const terminal = this.terminals[terminalIndex];
        if (terminal) {
            this.sockets[terminalIndex].send(cmd + "\r\n");
        }
    }


    // 获取当前终端
    getCurrentTerminal() {
        return this.terminals[this.currentTerm];
    }

    // 获取当前WebSocket连接
    getCurrentSocket() {
        return this.sockets[this.currentTerm];
    }

    // 获取当前工作目录
    getCurrentCwd() {
        return this.cwd[this.currentTerm];
    }

    // 设置当前工作目录
    setCurrentCwd(cwd) {
        this.cwd[this.currentTerm] = cwd;
    }

    // 颜色混合方法（从原Shell类合并）
    _mixColors(base, target, ratio) {
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };

        const rgbToHex = (r, g, b) => {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        };

        const baseRgb = hexToRgb(base);
        const targetRgb = hexToRgb(target);

        if (!baseRgb || !targetRgb) {
            return base;
        }

        const r = Math.round(baseRgb.r + (targetRgb.r - baseRgb.r) * ratio);
        const g = Math.round(baseRgb.g + (targetRgb.g - baseRgb.g) * ratio);
        const b = Math.round(baseRgb.b + (targetRgb.b - baseRgb.b) * ratio);

        return rgbToHex(r, g, b);
    }

    // 销毁所有终端
    destroyAll() {
        this.sockets.forEach(socket => {
            if (socket) {
                socket.close();
            }
        });
        this.attachAddons.forEach(attachAddon => {
            if (attachAddon) {
                attachAddon.dispose();
            }
        });
        this.terminals.forEach(terminal => {
            if (terminal && terminal.dispose) {
                terminal.dispose();
            }
        });
        this.terminals = [];
        this.sockets = [];
        this.attachAddons = [];
        this.cwd = [];
    }

    // 销毁指定终端
    destroy(terminalIndex) {
        if (this.sockets[terminalIndex]) {
            this.sockets[terminalIndex].close();
            delete this.sockets[terminalIndex];
        }
        if (this.attachAddons[terminalIndex]) {
            this.attachAddons[terminalIndex].dispose();
            delete this.attachAddons[terminalIndex];
        }
        if (this.terminals[terminalIndex]) {
            this.terminals[terminalIndex].dispose();
            delete this.terminals[terminalIndex];
        }
        delete this.cwd[terminalIndex];
    }
}

// 全局暴露类
window.TerminalManager = TerminalManager;