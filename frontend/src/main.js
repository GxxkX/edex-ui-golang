// 安全辅助函数
window._escapeHtml = text => {
    let map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => {return map[m];});
};

window._encodePathURI = uri => {
    return encodeURI(uri).replace(/#/g, "%23");
};

window._purifyCSS = str => {
    if (typeof str === "undefined") return "";
    if (typeof str !== "string") {
        str = str.toString();
    }
    return str.replace(/[<]/g, "");
};

window._delay = ms => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
};

// 初始化基本错误处理
initGraphicalErrorHandling();

// 导入 Wails 应用接口
import { Log, GetSettings, GetTheme } from '../wailsjs/go/main/App';

// 全局变量
let settings, shortcuts, lastWindowState;

// 初始化应用
async function initApp() {
    try {
        // 获取设置
        settings = await GetSettings();
        window.settings = settings;

        // 加载主题
        await loadTheme();
        
        // 初始化音频管理器
        window.audioManager = new AudioManager();
        
        // 启动应用
        if (window.settings.nointro) {
            const bootScreen = document.getElementById("boot_screen");
            if (bootScreen) {
                bootScreen.remove();
            }
            document.body.setAttribute("class", "");
            await waitForFonts();
            await initUI();
        } else {
            displayLine();
        }
        
    } catch (error) {
        console.error("应用初始化失败:", error);
        Log("error", `应用初始化失败: ${error.message}`);
    }
}

// 加载主题
async function loadTheme() {
    try {
        // 从 Go 后端获取主题信息
        const theme = await GetTheme();
        
        _loadTheme(theme);
    } catch (error) {
        console.error("主题加载失败:", error);
        Log("error", `主题加载失败: ${error.message}`);
        
        // 如果主题加载失败，使用默认主题
        const defaultTheme = {
            cssvars: {
                font_main: "United Sans Light",
                font_main_light: "United Sans Medium"
            },
            terminal: {
                fontFamily: "Fira Code",
                cursorBlink: true,
                cursorStyle: "block",
                allowTransparency: false,
                fontSize: 15,
                fontWeight: "normal",
                fontWeightBold: "bold",
                letterSpacing: 0,
                lineHeight: 1,
                foreground: "#00ff00",
                background: "#000000",
                cursor: "#00ff00",
                cursorAccent: "#000000",
                selection: "#404040",
                colorFilter: []
            },
            colors: {
                r: 0,
                g: 255,
                b: 0,
                black: "#000000",
                light_black: "#404040",
                grey: "#808080",
                red: "#ff0000",
                yellow: "#ffff00",
                green: "#00ff00",
                blue: "#0000ff",
                magenta: "#ff00ff",
                cyan: "#00ffff",
                white: "#ffffff",
                brightBlack: "#555753",
                brightRed: "#ef2929",
                brightGreen: "#8ae234",
                brightYellow: "#fce94f",
                brightBlue: "#729fcf",
                brightMagenta: "#ad7fa8",
                brightCyan: "#34e2e2",
                brightWhite: "#eeeeec"
            },
            globe: {
                base: "#00ff00",
                marker: "#00ff00",
                pin: "#00ff00",
                satellite: "#00ff00"
            },
            injectCSS: ""
        };
        
        _loadTheme(defaultTheme);
    }
}

// 加载 UI 主题
window._loadTheme = theme => {
    if (document.querySelector("style.theming")) {
        document.querySelector("style.theming").remove();
    }

    // 加载字体（在 Wails 中，字体路径由后端管理）
    let mainFont = new FontFace(theme.cssvars.font_main, `url("assets/fonts/${theme.cssvars.font_main.toLowerCase().replace(/ /g, '_')}.woff2")`);
    let lightFont = new FontFace(theme.cssvars.font_main_light, `url("assets/fonts/${theme.cssvars.font_main_light.toLowerCase().replace(/ /g, '_')}.woff2")`);
    let termFont = new FontFace(theme.terminal.fontFamily, `url("assets/fonts/${theme.terminal.fontFamily.toLowerCase().replace(/ /g, '_')}.woff2")`);

    document.fonts.add(mainFont);
    document.fonts.load("12px "+theme.cssvars.font_main);
    document.fonts.add(lightFont);
    document.fonts.load("12px "+theme.cssvars.font_main_light);
    document.fonts.add(termFont);
    document.fonts.load("12px "+theme.terminal.fontFamily);

    document.querySelector("head").innerHTML += `<style class="theming">
    :root {
        --font_main: "${window._purifyCSS(theme.cssvars.font_main)}";
        --font_main_light: "${window._purifyCSS(theme.cssvars.font_main_light)}";
        --font_mono: "${window._purifyCSS(theme.terminal.fontFamily)}";
        --color_r: ${window._purifyCSS(theme.colors.r)};
        --color_g: ${window._purifyCSS(theme.colors.g)};
        --color_b: ${window._purifyCSS(theme.colors.b)};
        --color_black: ${window._purifyCSS(theme.colors.black)};
        --color_light_black: ${window._purifyCSS(theme.colors.light_black)};
        --color_grey: ${window._purifyCSS(theme.colors.grey)};

        /* 用于错误和警告模态框 */
        --color_red: ${window._purifyCSS(theme.colors.red) || "red"};
        --color_yellow: ${window._purifyCSS(theme.colors.yellow) || "yellow"};
    }

    body {
        font-family: var(--font_main), sans-serif;
        cursor: ${(window.settings?.nocursor || window.settings?.nocursor) ? "none" : "default"} !important;
    }

    * {
        ${(window.settings?.nocursor || window.settings?.nocursor) ? "cursor: none !important;" : ""}
    }

    ${window._purifyCSS(theme.injectCSS || "")}
    </style>`;

    // 设置全局主题对象，确保所有属性都可用
    window.theme = theme;
    window.theme.r = theme.colors.r;
    window.theme.g = theme.colors.g;
    window.theme.b = theme.colors.b;
    // 确保 globe 属性存在
    if (!window.theme.globe) {
        window.theme.globe = {
            base: "#00ff00",
            marker: "#00ff00",
            pin: "#00ff00",
            satellite: "#00ff00"
        };
    }
    
    // 确保 terminal 属性存在
    if (!window.theme.terminal) {
        window.theme.terminal = {
            fontFamily: "Fira Code",
            cursorBlink: true,
            cursorStyle: "block",
            allowTransparency: false,
            fontSize: 15,
            fontWeight: "normal",
            fontWeightBold: "bold",
            letterSpacing: 0,
            lineHeight: 1,
            foreground: "#00ff00",
            background: "#000000",
            cursor: "#00ff00",
            cursorAccent: "#000000",
            selection: "#404040",
            colorFilter: []
        };
    }
    
    // 确保 colors 属性存在
    if (!window.theme.colors) {
        window.theme.colors = {
            r: 0,
            g: 255,
            b: 0,
            black: "#000000",
            light_black: "#404040",
            grey: "#808080",
            red: "#ff0000",
            yellow: "#ffff00",
            green: "#00ff00",
            blue: "#0000ff",
            magenta: "#ff00ff",
            cyan: "#00ffff",
            white: "#ffffff",
            brightBlack: "#555753",
            brightRed: "#ef2929",
            brightGreen: "#8ae234",
            brightYellow: "#fce94f",
            brightBlue: "#729fcf",
            brightMagenta: "#ad7fa8",
            brightCyan: "#34e2e2",
            brightWhite: "#eeeeec"
        };
    }
};

// 图形化错误处理
function initGraphicalErrorHandling() {
    window.edexErrorsModals = [];
    window.onerror = (msg, path, line, col, error) => {
        let errorModal = new Modal({
            type: "error",
            title: error,
            message: `${msg}<br/>        at ${path}  ${line}:${col}`
        });
        window.edexErrorsModals.push(errorModal);

        Log("error", `${error}: ${msg}`);
        Log("debug", `at ${path} ${line}:${col}`);
    };
}

// 等待字体加载
function waitForFonts() {
    return new Promise(resolve => {
        if (document.readyState !== "complete" || document.fonts.status !== "loaded") {
            document.addEventListener("readystatechange", () => {
                if (document.readyState === "complete") {
                    if (document.fonts.status === "loaded") {
                        resolve();
                    } else {
                        document.fonts.onloadingdone = () => {
                            if (document.fonts.status === "loaded") resolve();
                        };
                    }
                }
            });
        } else {
            resolve();
        }
    });
}

// 启动引导日志
function displayLine() {
    let bootScreen = document.getElementById("boot_screen");
    let log = [
        "eDEX-UI Kernel version 1.0.0 boot at " + new Date().toString(),
        "Loading modules...",
        "Initializing terminal...",
        "Setting up network interfaces...",
        "Mounting filesystem...",
        "Starting services...",
        "Boot Complete"
    ];

    let i = 0;
    
    function displayNextLine() {
        if (i >= log.length) {
            setTimeout(displayTitleScreen, 300);
            return;
        }

        if (log[i] === "Boot Complete") {
            if (window.audioManager) {
                window.audioManager.granted.play();
            }
        } else {
            if (window.audioManager) {
                window.audioManager.stdout.play();
            }
        }
        
        bootScreen.innerHTML += log[i] + "<br/>";
        i++;

        setTimeout(displayNextLine, 100);
    }
    
    displayNextLine();
}

// 显示"标志"和背景网格
async function displayTitleScreen() {
    let bootScreen = document.getElementById("boot_screen");
    if (bootScreen === null) {
        bootScreen = document.createElement("section");
        bootScreen.setAttribute("id", "boot_screen");
        bootScreen.setAttribute("style", "z-index: 9999999");
        document.body.appendChild(bootScreen);
    }
    bootScreen.innerHTML = "";
    if (window.audioManager) {
        window.audioManager.theme.play();
    }

    await _delay(400);

    document.body.setAttribute("class", "");
    bootScreen.setAttribute("class", "center");
    bootScreen.innerHTML = "<h1>eDEX-UI</h1>";
    let title = document.querySelector("section > h1");

    await _delay(200);

    document.body.setAttribute("class", "solidBackground");

    await _delay(100);

    title.setAttribute("style", `background-color: rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});border-bottom: 5px solid rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});`);

    await _delay(300);

    title.setAttribute("style", `border: 5px solid rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});`);

    await _delay(100);

    title.setAttribute("style", "");
    title.setAttribute("class", "glitch");

    await _delay(500);

    document.body.setAttribute("class", "");
    title.setAttribute("class", "");
    title.setAttribute("style", `border: 5px solid rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});`);

    await _delay(1000);
    if (window.term) {
        bootScreen.remove();
        return true;
    }
    waitForFonts().then(() => {
        bootScreen.remove();
        initUI();
    });
}

// 返回用户期望的显示名称
async function getDisplayName() {
    let user = settings.username || null;
    if (user)
        return user;

        try {
            if (window.go && window.go.main && window.go.main.App && typeof window.go.main.App.GetCurrentUsername === 'function') {
                user = await window.go.main.App.GetCurrentUsername();
            }
        if (!user) user = "User";
    } catch (e) {
        user = "User";
    }

    return user;
}

// 创建 UI 的 HTML 结构并初始化终端客户端和键盘
async function initUI() {
    document.body.innerHTML += `<section class="mod_column" id="mod_column_left">
        <h3 class="title"><p>PANEL</p><p>SYSTEM</p></h3>
    </section>
    <section id="main_shell" style="height:0%;width:0%;opacity:0;margin-bottom:30vh;" augmented-ui="bl-clip tr-clip exe">
        <h3 class="title" style="opacity:0;"><p>TERMINAL</p><p>MAIN SHELL</p></h3>
        <h1 id="main_shell_greeting"></h1>
    </section>
    <section class="mod_column" id="mod_column_right">
        <h3 class="title"><p>PANEL</p><p>NETWORK</p></h3>
    </section>`;

    await _delay(10);

    if (window.audioManager) {
        window.audioManager.expand.play();
    }
    document.getElementById("main_shell").setAttribute("style", "height:0%;margin-bottom:30vh;");

    await _delay(500);

    document.getElementById("main_shell").setAttribute("style", "margin-bottom: 30vh;");
    document.querySelector("#main_shell > h3.title").setAttribute("style", "");

    await _delay(700);

    document.getElementById("main_shell").setAttribute("style", "opacity: 0;");
    document.body.innerHTML += `
    <section id="filesystem" style="width: 0px;" class="${window.settings.hideDotfiles ? "hideDotfiles" : ""} ${window.settings.fsListView ? "list-view" : ""}">
    </section>
    <section id="keyboard" style="opacity:0;">
    </section>`;
    
    window.keyboard = new Keyboard({
        layout: `assets/kb_layouts/${settings.keyboard}.json`,
        container: "keyboard"
    });

    await _delay(10);

    document.getElementById("main_shell").setAttribute("style", "");

    await _delay(270);

    let greeter = document.getElementById("main_shell_greeting");

    getDisplayName().then(user => {
        if (user) {
            greeter.innerHTML += `Welcome back, <em>${user}</em>`;
        } else {
            greeter.innerHTML += "Welcome back";
        }
    });

    greeter.setAttribute("style", "opacity: 1;");

    document.getElementById("filesystem").setAttribute("style", "");
    document.getElementById("keyboard").setAttribute("style", "");
    document.getElementById("keyboard").setAttribute("class", "animation_state_1");
    if (window.audioManager) {
        window.audioManager.keyboard.play();
    }

    await _delay(100);

    document.getElementById("keyboard").setAttribute("class", "animation_state_1 animation_state_2");

    await _delay(1000);

    greeter.setAttribute("style", "opacity: 0;");

    await _delay(100);

    document.getElementById("keyboard").setAttribute("class", "");

    await _delay(400);

    greeter.remove();

    // 初始化模块
    window.mods = {};

    // 左列
    window.mods.clock = new Clock("mod_column_left");
    window.mods.sysinfo = new Sysinfo("mod_column_left");
    window.mods.hardwareInspector = new HardwareInspector("mod_column_left");
    window.mods.cpuinfo = new Cpuinfo("mod_column_left");
    window.mods.ramwatcher = new RAMwatcher("mod_column_left");
    window.mods.toplist = new Toplist("mod_column_left");

    // 右列
    window.mods.netstat = new Netstat("mod_column_right");
    window.mods.globe = new LocationGlobe("mod_column_right");
    window.mods.conninfo = new Conninfo("mod_column_right");

    // 淡入动画
    document.querySelectorAll(".mod_column").forEach(e => {
        e.setAttribute("class", "mod_column activated");
    });
    let i = 0;
    let left = document.querySelectorAll("#mod_column_left > div");
    let right = document.querySelectorAll("#mod_column_right > div");
    let x = setInterval(() => {
        if (!left[i] && !right[i]) {
            clearInterval(x);
        } else {
            if (window.audioManager) {
                window.audioManager.panels.play();
            }
            if (left[i]) {
                left[i].setAttribute("style", "animation-play-state: running;");
            }
            if (right[i]) {
                right[i].setAttribute("style", "animation-play-state: running;");
            }
            i++;
        }
    }, 500);

    await _delay(100);

    await initShortcuts();

    // 初始化终端系统
    window.terminalManager = new TerminalManager();
    await window.terminalManager.initTerminalSystem();
    
    await _delay(100);

    window.fsDisp = new FilesystemDisplay({
        parentId: "filesystem"
    });

    await _delay(200);

    document.getElementById("filesystem").setAttribute("style", "opacity: 1;");

    await _delay(200);

    window.updateCheck = new UpdateChecker();
}

// 导入扩展功能
import './main-extended.js';

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);