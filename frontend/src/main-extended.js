// 主题切换
window.themeChanger = theme => {
    SetThemeOverride(theme);
    setTimeout(() => {
        window.location.reload(true);
    }, 100);
};

// 重新制作键盘
window.remakeKeyboard = layout => {
    document.getElementById("keyboard").innerHTML = "";
    window.keyboard = new Keyboard({
        layout: `keyboards/${layout || settings.keyboard}.json`,
        container: "keyboard"
    });
    SetKbOverride(layout);
};

// 焦点终端标签
window.focusShellTab = number => {
    if (window.audioManager) {
        window.audioManager.folder.play();
    }
    
    // 使用新的TerminalManager
    if (window.terminalManager) {
        window.terminalManager.focusShellTab(number);
        
        // 如果终端存在，执行额外的操作
        if (window.terminalManager.terminals[number]) {
            window.terminalManager.fit(number);
            // resendCWD功能现在通过WebSocket自动处理
        }
        
        // 文件系统跟随标签页
        if (window.fsDisp && window.fsDisp.followTab) {
            window.fsDisp.followTab();
        }
    } else {
        // 回退到旧的方式（向后兼容）
        if (number !== window.currentTerm && window.term[number]) {
            window.currentTerm = number;

            document.querySelectorAll(`ul#main_shell_tabs > li:not(:nth-child(${number + 1}))`).forEach(e => {
                e.setAttribute("class", "");
            });
            document.getElementById("shell_tab" + number).setAttribute("class", "active");

            document.querySelectorAll(`div#main_shell_innercontainer > pre:not(:nth-child(${number + 1}))`).forEach(e => {
                e.setAttribute("class", "");
            });
            document.getElementById("terminal" + number).setAttribute("class", "active");

            if (window.term[number].fit) {
                window.term[number].fit();
            }
            if (window.term[number].term && window.term[number].term.focus) {
                window.term[number].term.focus();
            }
            if (window.term[number].resendCWD) {
                window.term[number].resendCWD();
            }

            if (window.fsDisp && window.fsDisp.followTab) {
                window.fsDisp.followTab();
            }
        } else if (number > 0 && number <= 4 && window.term[number] !== null && typeof window.term[number] !== "object") {
            window.term[number] = null;

            document.getElementById("shell_tab" + number).innerHTML = "<p>LOADING...</p>";

            // 使用 Wails 的 SpawnTTY 方法
            SpawnTTY().then(port => {
                if (port.startsWith("ERROR")) {
                    document.getElementById("shell_tab" + number).innerHTML = "<p>ERROR</p>";
                } else if (port.startsWith("SUCCESS")) {
                    let portNum = Number(port.substr(9));

                    window.term[number] = new Terminal({
                        allowProposedApi: true,
                        role: "client",
                        parentId: "terminal" + number,
                        port: portNum
                    });

                    window.term[number].onclose = e => {
                        delete window.term[number].onprocesschange;
                        document.getElementById("shell_tab" + number).innerHTML = "<p>EMPTY</p>";
                        document.getElementById("terminal" + number).innerHTML = "";
                        window.term[number].term.dispose();
                        delete window.term[number];
                        window.useAppShortcut("PREVIOUS_TAB");
                    };

                    window.term[number].onprocesschange = p => {
                        document.getElementById("shell_tab" + number).innerHTML = `<p>#${number + 1} - ${p}</p>`;
                    };

                    document.getElementById("shell_tab" + number).innerHTML = `<p>::${portNum}</p>`;
                    setTimeout(() => {
                        window.focusShellTab(number);
                    }, 500);
                }
            }).catch(error => {
                document.getElementById("shell_tab" + number).innerHTML = "<p>ERROR</p>";
                console.log("error", `创建终端失败: ${error.message}`);
            });
        }
    }
};

// 应用快捷键
window.useAppShortcut = async (action) => {
    try {
        // 首先调用后端处理快捷键
        const result = await window.go.main.App.HandleShortcut(action);
        if (result && result.error) {
            console.log("error", `快捷键处理失败: ${result.error}`);
            return false;
        }
    } catch (error) {
        console.log("error", `调用后端快捷键处理失败: ${error.message}`);
    }

    // 执行前端快捷键逻辑
    switch (action) {
        case "COPY":
            if (window.terminalManager) {
                window.terminalManager.clipboard.copy(window.currentTerm);
            } else if (window.term[window.currentTerm] && window.term[window.currentTerm].clipboard) {
                window.term[window.currentTerm].clipboard.copy();
            }
            return true;
        case "PASTE":
            if (window.terminalManager) {
                window.terminalManager.clipboard.paste(window.currentTerm);
            } else if (window.term[window.currentTerm] && window.term[window.currentTerm].clipboard) {
                window.term[window.currentTerm].clipboard.paste();
            }
            return true;
        case "NEXT_TAB":
            if (window.term[window.currentTerm + 1]) {
                window.focusShellTab(window.currentTerm + 1);
            } else if (window.term[window.currentTerm + 2]) {
                window.focusShellTab(window.currentTerm + 2);
            } else if (window.term[window.currentTerm + 3]) {
                window.focusShellTab(window.currentTerm + 3);
            } else if (window.term[window.currentTerm + 4]) {
                window.focusShellTab(window.currentTerm + 4);
            } else {
                window.focusShellTab(0);
            }
            return true;
        case "PREVIOUS_TAB":
            let i = window.currentTerm || 4;
            if (window.term[i] && i !== window.currentTerm) {
                window.focusShellTab(i);
            } else if (window.term[i - 1]) {
                window.focusShellTab(i - 1);
            } else if (window.term[i - 2]) {
                window.focusShellTab(i - 2);
            } else if (window.term[i - 3]) {
                window.focusShellTab(i - 3);
            } else if (window.term[i - 4]) {
                window.focusShellTab(i - 4);
            }
            return true;
        case "TAB_1":
            window.focusShellTab(0);
            return true;
        case "TAB_2":
            window.focusShellTab(1);
            return true;
        case "TAB_3":
            window.focusShellTab(2);
            return true;
        case "TAB_4":
            window.focusShellTab(3);
            return true;
        case "TAB_5":
            window.focusShellTab(4);
            return true;
        case "SETTINGS":
            window.openSettings();
            return true;
        case "SHORTCUTS":
            window.openShortcutsHelp();
            return true;
        case "FUZZY_SEARCH":
            window.activeFuzzyFinder = new FuzzyFinder();
            return true;
        case "FS_LIST_VIEW":
            window.fsDisp.toggleListview();
            return true;
        case "FS_DOTFILES":
            window.fsDisp.toggleHidedotfiles();
            return true;
        case "KB_PASSMODE":
            window.keyboard.togglePasswordMode();
            return true;
        case "DEV_DEBUG":
            // 在 Wails 中，开发者工具由运行时管理
            console.log("info", "开发者工具功能在 Wails 中由运行时管理");
            return true;
        case "DEV_RELOAD":
            window.location.reload(true);
            return true;
        default:
            console.warn(`Unknown "${action}" app shortcut action`);
            return false;
    }
};

// 注册键盘快捷键
window.registerKeyboardShortcuts = async () => {
    try {
        // 从后端获取快捷键配置
        const shortcuts = await window.go.main.App.GetShortcuts();
        
        // 创建快捷键映射
        window.shortcutMap = new Map();
        shortcuts.forEach(shortcut => {
            if (shortcut.Enabled) {
                window.shortcutMap.set(shortcut.Trigger, shortcut.Action);
            }
        });
        
        console.log("info", `已注册 ${shortcuts.length} 个键盘快捷键`);
    } catch (error) {
        console.log("error", `注册键盘快捷键失败: ${error.message}`);
    }
};

// 初始化快捷键系统
window.initShortcuts = async () => {
    await window.registerKeyboardShortcuts();
    
    // 添加键盘事件监听器
    document.addEventListener("keydown", async (e) => {
        // 构建快捷键字符串
        let shortcut = "";
        if (e.ctrlKey) shortcut += "Ctrl+";
        if (e.shiftKey) shortcut += "Shift+";
        if (e.altKey) shortcut += "Alt+";
        if (e.metaKey) shortcut += "Meta+";
        
        // 添加按键
        if (e.key.length === 1) {
            shortcut += e.key.toUpperCase();
        } else {
            shortcut += e.key;
        }
        
        // 检查是否有匹配的快捷键
        if (window.shortcutMap && window.shortcutMap.has(shortcut)) {
            const action = window.shortcutMap.get(shortcut);
            e.preventDefault();
            e.stopPropagation();
            
            console.log("info", `触发快捷键: ${shortcut} -> ${action}`);
            await window.useAppShortcut(action);
        }
    });
};

// 防止使用键盘快捷键显示菜单、退出全屏或应用
document.addEventListener("keydown", e => {
    if (e.key === "Alt") {
        e.preventDefault();
    }
    if (e.code.startsWith("Alt") && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
    }
    if (e.key === "F11" && !settings.allowWindowed) {
        e.preventDefault();
    }
    if (e.code === "KeyD" && e.ctrlKey) {
        e.preventDefault();
    }
    if (e.code === "KeyA" && e.ctrlKey) {
        e.preventDefault();
    }
});

// 设置编辑器
window.openSettings = async () => {
    if (document.getElementById("settingsEditor")) return;

    try {
        // 从后端获取设置数据
        const settingsData = await window.go.main.App.GetSettingsData();
        const settings = settingsData.settings;
        const keyboards = settingsData.keyboards;
        const themes = settingsData.themes;
        const monitors = settingsData.monitors;
        const interfaces = settingsData.interfaces;

        // 构建选项列表
        let keyboardsOptions = "";
        keyboards.forEach(keyboard => {
            keyboardsOptions += `<option value="${keyboard}">${keyboard}</option>`;
        });

        let themesOptions = "";
        themes.forEach(theme => {
            themesOptions += `<option value="${theme}">${theme}</option>`;
        });

        let monitorsOptions = "";
        monitors.forEach(monitor => {
            monitorsOptions += `<option value="${monitor}">${monitor}</option>`;
        });

        let interfacesOptions = "";
        interfaces.forEach(iface => {
            interfacesOptions += `<option value="${iface}">${iface}</option>`;
        });

    } catch (error) {
        console.log("error", `获取设置数据失败: ${error.message}`);
        // 回退到默认实现
        const settings = window.settings || {};
        const keyboards = ["en-US", "zh-CN"];
        const themes = ["tron", "matrix", "cyborg", "nord"];
        const monitors = [0];
        const interfaces = ["eth0", "wlan0"];

        // 构建选项列表
        let keyboardsOptions = "";
        keyboards.forEach(keyboard => {
            keyboardsOptions += `<option value="${keyboard}">${keyboard}</option>`;
        });

        let themesOptions = "";
        themes.forEach(theme => {
            themesOptions += `<option value="${theme}">${theme}</option>`;
        });

        let monitorsOptions = "";
        monitors.forEach(monitor => {
            monitorsOptions += `<option value="${monitor}">${monitor}</option>`;
        });

        let interfacesOptions = "";
        interfaces.forEach(iface => {
            interfacesOptions += `<option value="${iface}">${iface}</option>`;
        });
    }

    // 将触觉键盘从终端模拟器中分离，以允许填写设置字段
    window.keyboard.detach();

    new Modal({
        type: "custom",
        title: `Settings <i>(v1.0.0)</i>`,
        html: `<table id="settingsEditor">
                    <tr>
                        <th>Key</th>
                        <th>Description</th>
                        <th>Value</th>
                    </tr>
                    <tr>
                        <td>shell</td>
                        <td>终端模拟器程序</td>
                        <td><input type="text" id="settingsEditor-shell" value="${settings.Shell || ''}"></td>
                    </tr>
                    <tr>
                        <td>shellArgs</td>
                        <td>传递给 shell 的参数</td>
                        <td><input type="text" id="settingsEditor-shellArgs" value="${settings.ShellArgs || ''}"></td>
                    </tr>
                    <tr>
                        <td>cwd</td>
                        <td>启动时的工作目录</td>
                        <td><input type="text" id="settingsEditor-cwd" value="${settings.Cwd || ''}"></td>
                    </tr>
                    <tr>
                        <td>env</td>
                        <td>自定义 shell 环境变量</td>
                        <td><input type="text" id="settingsEditor-env" value="${settings.Env || ''}"></td>
                    </tr>
                    <tr>
                        <td>username</td>
                        <td>启动时显示的自定义用户名</td>
                        <td><input type="text" id="settingsEditor-username" value="${settings.Username || ''}"></td>
                    </tr>
                    <tr>
                        <td>keyboard</td>
                        <td>屏幕键盘布局代码</td>
                        <td><select id="settingsEditor-keyboard">
                            <option value="${settings.Keyboard || 'en-US'}">${settings.Keyboard || 'en-US'}</option>
                            ${keyboardsOptions}
                        </select></td>
                    </tr>
                    <tr>
                        <td>theme</td>
                        <td>要加载的主题名称</td>
                        <td><select id="settingsEditor-theme">
                            <option value="${settings.Theme || 'tron'}">${settings.Theme || 'tron'}</option>
                            ${themesOptions}
                        </select></td>
                    </tr>
                    <tr>
                        <td>termFontSize</td>
                        <td>终端文本大小（像素）</td>
                        <td><input type="number" id="settingsEditor-termFontSize" value="${settings.TermFontSize || 14}"></td>
                    </tr>
                    <tr>
                        <td>audio</td>
                        <td>激活音频音效</td>
                        <td><select id="settingsEditor-audio">
                            <option value="${settings.Audio}">${settings.Audio}</option>
                            <option value="${!settings.Audio}">${!settings.Audio}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>audioVolume</td>
                        <td>音效默认音量 (0.0 - 1.0)</td>
                        <td><input type="number" id="settingsEditor-audioVolume" value="${settings.AudioVolume || 1.0}" min="0" max="1" step="0.1"></td>
                    </tr>
                    <tr>
                        <td>disableFeedbackAudio</td>
                        <td>禁用重复反馈音效（输入/输出等）</td>
                        <td><select id="settingsEditor-disableFeedbackAudio">
                            <option value="${settings.DisableFeedbackAudio}">${settings.DisableFeedbackAudio}</option>
                            <option value="${!settings.DisableFeedbackAudio}">${!settings.DisableFeedbackAudio}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>port</td>
                        <td>UI-shell 连接使用的本地端口</td>
                        <td><input type="number" id="settingsEditor-port" value="${settings.Port || 8080}"></td>
                    </tr>
                    <tr>
                        <td>pingAddr</td>
                        <td>测试互联网连接的 IPv4 地址</td>
                        <td><input type="text" id="settingsEditor-pingAddr" value="${settings.PingAddr || '8.8.8.8'}"></td>
                    </tr>
                    <tr>
                        <td>clockHours</td>
                        <td>时钟格式 (12/24 小时)</td>
                        <td><select id="settingsEditor-clockHours">
                            <option value="${settings.ClockHours || 24}">${settings.ClockHours || 24}</option>
                            <option value="${settings.ClockHours === 12 ? 24 : 12}">${settings.ClockHours === 12 ? 24 : 12}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>monitor</td>
                        <td>启动 UI 的显示器（默认为主显示器）</td>
                        <td><select id="settingsEditor-monitor">
                            <option value="${settings.Monitor || 0}">${settings.Monitor || 0}</option>
                            ${monitorsOptions}
                        </select></td>
                    </tr>
                    <tr>
                        <td>nointro</td>
                        <td>跳过启动日志和标志</td>
                        <td><select id="settingsEditor-nointro">
                            <option value="${settings.Nointro}">${settings.Nointro}</option>
                            <option value="${!settings.Nointro}">${!settings.Nointro}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>nocursor</td>
                        <td>隐藏鼠标光标</td>
                        <td><select id="settingsEditor-nocursor">
                            <option value="${settings.Nocursor}">${settings.Nocursor}</option>
                            <option value="${!settings.Nocursor}">${!settings.Nocursor}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>iface</td>
                        <td>网络监控使用的接口</td>
                        <td><select id="settingsEditor-iface">
                            <option value="${settings.Iface || 'eth0'}">${settings.Iface || 'eth0'}</option>
                            ${interfacesOptions}
                        </select></td>
                    </tr>
                    <tr>
                        <td>allowWindowed</td>
                        <td>允许使用 F11 键将 UI 设置为窗口模式</td>
                        <td><select id="settingsEditor-allowWindowed">
                            <option value="${settings.AllowWindowed}">${settings.AllowWindowed}</option>
                            <option value="${!settings.AllowWindowed}">${!settings.AllowWindowed}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>keepGeometry</td>
                        <td>在窗口模式下尝试保持 16:9 宽高比</td>
                        <td><select id="settingsEditor-keepGeometry">
                            <option value="${settings.KeepGeometry !== false}">${settings.KeepGeometry !== false}</option>
                            <option value="${settings.KeepGeometry === false}">${settings.KeepGeometry === false}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>excludeThreadsFromToplist</td>
                        <td>在顶级进程列表中显示线程</td>
                        <td><select id="settingsEditor-excludeThreadsFromToplist">
                            <option value="${settings.ExcludeThreadsFromToplist}">${settings.ExcludeThreadsFromToplist}</option>
                            <option value="${!settings.ExcludeThreadsFromToplist}">${!settings.ExcludeThreadsFromToplist}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>hideDotfiles</td>
                        <td>在文件显示中隐藏以点开头的文件和目录</td>
                        <td><select id="settingsEditor-hideDotfiles">
                            <option value="${settings.HideDotfiles}">${settings.HideDotfiles}</option>
                            <option value="${!settings.HideDotfiles}">${!settings.HideDotfiles}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>fsListView</td>
                        <td>在文件浏览器中以详细列表而不是图标网格显示文件</td>
                        <td><select id="settingsEditor-fsListView">
                            <option value="${settings.FsListView}">${settings.FsListView}</option>
                            <option value="${!settings.FsListView}">${!settings.FsListView}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>experimentalGlobeFeatures</td>
                        <td>切换网络地球仪的实验性功能</td>
                        <td><select id="settingsEditor-experimentalGlobeFeatures">
                            <option value="${settings.ExperimentalGlobeFeatures}">${settings.ExperimentalGlobeFeatures}</option>
                            <option value="${!settings.ExperimentalGlobeFeatures}">${!settings.ExperimentalGlobeFeatures}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>experimentalFeatures</td>
                        <td>切换 Chrome 的实验性 Web 功能（危险）</td>
                        <td><select id="settingsEditor-experimentalFeatures">
                            <option value="${settings.ExperimentalFeatures}">${settings.ExperimentalFeatures}</option>
                            <option value="${!settings.ExperimentalFeatures}">${!settings.ExperimentalFeatures}</option>
                        </select></td>
                    </tr>
                </table>
                <h6 id="settingsEditorStatus">Loaded values from memory</h6>
                <br>`,
        buttons: [
            { label: "Save to Disk", action: "window.writeSettingsFile()" },
            { label: "Reload UI", action: "window.location.reload(true);" },
            { label: "Restart eDEX", action: "window.location.reload(true);" }
        ]
    }, () => {
        // 将键盘重新链接到终端
        window.keyboard.attach();

        // 重新聚焦到终端
        if (window.terminalManager) {
            const terminal = window.terminalManager.getCurrentTerminal();
            if (terminal && terminal.focus) {
                terminal.focus();
            }
        } else if (window.term[window.currentTerm] && window.term[window.currentTerm].term) {
            window.term[window.currentTerm].term.focus();
        }
    });
};

// 写入设置文件
window.writeSettingsFile = async () => {
    try {
        // 收集设置数据
        const settingsData = {
            shell: document.getElementById("settingsEditor-shell").value,
            shellArgs: document.getElementById("settingsEditor-shellArgs").value,
            cwd: document.getElementById("settingsEditor-cwd").value,
            env: document.getElementById("settingsEditor-env").value,
            username: document.getElementById("settingsEditor-username").value,
            keyboard: document.getElementById("settingsEditor-keyboard").value,
            theme: document.getElementById("settingsEditor-theme").value,
            termFontSize: Number(document.getElementById("settingsEditor-termFontSize").value),
            audio: document.getElementById("settingsEditor-audio").value === "true",
            audioVolume: Number(document.getElementById("settingsEditor-audioVolume").value),
            disableFeedbackAudio: document.getElementById("settingsEditor-disableFeedbackAudio").value === "true",
            pingAddr: document.getElementById("settingsEditor-pingAddr").value,
            clockHours: Number(document.getElementById("settingsEditor-clockHours").value),
            port: Number(document.getElementById("settingsEditor-port").value),
            monitor: Number(document.getElementById("settingsEditor-monitor").value),
            nointro: document.getElementById("settingsEditor-nointro").value === "true",
            nocursor: document.getElementById("settingsEditor-nocursor").value === "true",
            iface: document.getElementById("settingsEditor-iface").value,
            allowWindowed: document.getElementById("settingsEditor-allowWindowed").value === "true",
            keepGeometry: document.getElementById("settingsEditor-keepGeometry").value === "true",
            excludeThreadsFromToplist: document.getElementById("settingsEditor-excludeThreadsFromToplist").value === "true",
            hideDotfiles: document.getElementById("settingsEditor-hideDotfiles").value === "true",
            fsListView: document.getElementById("settingsEditor-fsListView").value === "true",
            experimentalGlobeFeatures: document.getElementById("settingsEditor-experimentalGlobeFeatures").value === "true",
            experimentalFeatures: document.getElementById("settingsEditor-experimentalFeatures").value === "true"
        };

        // 清理 undefined 值
        Object.keys(settingsData).forEach(key => {
            if (settingsData[key] === "undefined" || settingsData[key] === undefined) {
                delete settingsData[key];
            }
        });

        // 调用后端保存设置
        await window.go.main.App.UpdateSettings(settingsData);
        
        console.log("info", "设置已保存到后端");
        document.getElementById("settingsEditorStatus").innerText = "设置已保存到磁盘 - " + new Date().toTimeString();
        
    } catch (error) {
        console.log("error", `保存设置失败: ${error.message}`);
        document.getElementById("settingsEditorStatus").innerText = "保存设置失败: " + error.message;
    }
};

// 显示可用的键盘快捷键和自定义快捷键辅助
window.openShortcutsHelp = async () => {
    if (document.getElementById("settingsEditor")) return;

    try {
        // 从后端获取快捷键定义
        const availableShortcuts = await window.go.main.App.GetAvailableShortcuts();
        const shortcuts = await window.go.main.App.GetShortcuts();
        
        let appList = "";
        let customList = "";

        // 构建应用快捷键列表
        shortcuts.forEach(shortcut => {
            if (shortcut.Type === "app" && shortcut.Enabled) {
                const description = availableShortcuts[shortcut.Action] || shortcut.Action;
                appList += `<tr>
                    <td>${shortcut.Enabled ? "YES" : "NO"}</td>
                    <td><input type="text" maxlength=25 value="${shortcut.Trigger}" onchange="updateShortcut('${shortcut.Trigger}', this.value)"></td>
                    <td>${description}</td>
                </tr>`;
            } else if (shortcut.Type === "shell" && shortcut.Enabled) {
                customList += `<tr>
                    <td>${shortcut.Enabled ? "YES" : "NO"}</td>
                    <td><input type="text" maxlength=25 value="${shortcut.Trigger}" onchange="updateShortcut('${shortcut.Trigger}', this.value)"></td>
                    <td>${shortcut.Action}</td>
                </tr>`;
            }
        });

        // 添加更新快捷键的函数
        window.updateShortcut = async (oldTrigger, newTrigger) => {
            try {
                // 获取所有快捷键
                const shortcuts = await window.go.main.App.GetShortcuts();
                const shortcut = shortcuts.find(s => s.Trigger === oldTrigger);
                
                if (shortcut) {
                    // 更新触发器
                    shortcut.Trigger = newTrigger;
                    await window.go.main.App.UpdateShortcut(shortcut);
                    console.log("info", `快捷键已更新: ${oldTrigger} -> ${newTrigger}`);
                }
            } catch (error) {
                console.log("error", `更新快捷键失败: ${error.message}`);
            }
        };

    } catch (error) {
        console.log("error", `获取快捷键信息失败: ${error.message}`);
        // 回退到默认实现
        appList = `<tr>
                    <td>YES</td>
                    <td><input disabled type="text" maxlength=25 value="Ctrl+Shift+C"></td>
                    <td>复制选中的终端缓冲区内容</td>
                </tr>`;
        customList = "";
    }

    window.keyboard.detach();
    new Modal({
        type: "custom",
        title: `Available Keyboard Shortcuts <i>(v1.0.0)</i>`,
        html: `<h5>Using either the on-screen or a physical keyboard, you can use the following shortcuts:</h5>
                <details open id="shortcutsHelpAccordeon1">
                    <summary>Emulator shortcuts</summary>
                    <table class="shortcutsHelp">
                        <tr>
                            <th>Enabled</th>
                            <th>Trigger</th>
                            <th>Action</th>
                        </tr>
                        ${appList}
                    </table>
                </details>
                <br>
                <details id="shortcutsHelpAccordeon2">
                    <summary>Custom command shortcuts</summary>
                    <table class="shortcutsHelp">
                        <tr>
                            <th>Enabled</th>
                            <th>Trigger</th>
                            <th>Command</th>
                        <tr>
                       ${customList}
                    </table>
                </details>
                <br>`,
        buttons: [
            { label: "Reload UI", action: "window.location.reload(true);" },
        ]
    }, () => {
        window.keyboard.attach();
        if (window.terminalManager) {
            const terminal = window.terminalManager.getCurrentTerminal();
            if (terminal && terminal.focus) {
                terminal.focus();
            }
        } else if (window.term[window.currentTerm] && window.term[window.currentTerm].term) {
            window.term[window.currentTerm].term.focus();
        }
    });

    let wrap1 = document.getElementById('shortcutsHelpAccordeon1');
    let wrap2 = document.getElementById('shortcutsHelpAccordeon2');

    wrap1.addEventListener('toggle', e => {
        wrap2.open = !wrap1.open;
    });

    wrap2.addEventListener('toggle', e => {
        wrap1.open = !wrap2.open;
    });
};

