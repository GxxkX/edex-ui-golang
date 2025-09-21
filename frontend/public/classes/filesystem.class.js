class FilesystemDisplay {
    constructor(opts) {
        if (!opts.parentId) throw "Missing options";

        // 在 Wails 中，我们不再使用 Node.js 的 fs 和 path 模块
        this.cwd = [];
        this.cwd_path = null;
        this.iconcolor = `rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b})`;
        this._formatBytes = (a,b) => {if(0==a)return"0 Bytes";var c=1024,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]};
       

        // 获取文件图标
        this.getFileIcons = async () => {
            try {
                // 尝试从 file-icons.json 加载图标
                const response = await fetch('./assets/icons/file-icons.json');
                if (response.ok) {
                    const fileIcons = await response.json();
                    return { ...fileIcons };
                }
            } catch (error) {
                console.warn('从 file-icons.json 加载图标失败，使用默认图标:', error);
            }
        };
        this.icons = null; // 将在初始化时异步加载
        this.edexIcons = {
            theme: {
                width: 24,
                height: 24,
                svg: '<path d="M 17.9994,3.99805L 17.9994,2.99805C 17.9994,2.44604 17.5514,1.99805 16.9994,1.99805L 4.9994,1.99805C 4.4474,1.99805 3.9994,2.44604 3.9994,2.99805L 3.9994,6.99805C 3.9994,7.55005 4.4474,7.99805 4.9994,7.99805L 16.9994,7.99805C 17.5514,7.99805 17.9994,7.55005 17.9994,6.99805L 17.9994,5.99805L 18.9994,5.99805L 18.9994,9.99805L 8.9994,9.99805L 8.9994,20.998C 8.9994,21.55 9.4474,21.998 9.9994,21.998L 11.9994,21.998C 12.5514,21.998 12.9994,21.55 12.9994,20.998L 12.9994,11.998L 20.9994,11.998L 20.9994,3.99805L 17.9994,3.99805 Z"/>'
            },
            themesDir: {
                width: 24,
                height: 24,
                svg: `<path d="m9.9994 3.9981h-6c-1.105 0-1.99 0.896-1.99 2l-0.01 12c0 1.104 0.895 2 2 2h16c1.104 0 2-0.896 2-2v-9.9999c0-1.104-0.896-2-2-2h-8l-1.9996-2z" stroke-width=".2"/><path stroke-linejoin="round" d="m18.8 9.3628v-0.43111c0-0.23797-0.19314-0.43111-0.43111-0.43111h-5.173c-0.23797 0-0.43111 0.19313-0.43111 0.43111v1.7244c0 0.23797 0.19314 0.43111 0.43111 0.43111h5.1733c0.23797 0 0.43111-0.19314 0.43111-0.43111v-0.43111h0.43111v1.7244h-4.3111v4.7422c0 0.23797 0.19314 0.43111 0.43111 0.43111h0.86221c0.23797 0 0.43111-0.19314 0.43111-0.43111v-3.879h3.449v-3.4492z" stroke-width=".086221" fill="${window.theme.colors.light_black}"/>`
            },
            kblayout: {
                width: 24,
                height: 24,
                svg: '<path d="M 18.9994,9.99807L 16.9994,9.99807L 16.9994,7.99807L 18.9994,7.99807M 18.9994,12.9981L 16.9994,12.9981L 16.9994,10.9981L 18.9994,10.9981M 15.9994,9.99807L 13.9994,9.99807L 13.9994,7.99807L 15.9994,7.99807M 15.9994,12.9981L 13.9994,12.9981L 13.9994,10.9981L 15.9994,10.9981M 15.9994,16.9981L 7.99941,16.9981L 7.99941,14.9981L 15.9994,14.9981M 6.99941,9.99807L 4.99941,9.99807L 4.99941,7.99807L 6.99941,7.99807M 6.99941,12.9981L 4.99941,12.9981L 4.99941,10.9981L 6.99941,10.9981M 7.99941,10.9981L 9.99941,10.9981L 9.99941,12.9981L 7.99941,12.9981M 7.99941,7.99807L 9.99941,7.99807L 9.99941,9.99807L 7.99941,9.99807M 10.9994,10.9981L 12.9994,10.9981L 12.9994,12.9981L 10.9994,12.9981M 10.9994,7.99807L 12.9994,7.99807L 12.9994,9.99807L 10.9994,9.99807M 19.9994,4.99807L 3.99941,4.99807C 2.89441,4.99807 2.0094,5.89406 2.0094,6.99807L 1.99941,16.9981C 1.99941,18.1021 2.89441,18.9981 3.99941,18.9981L 19.9994,18.9981C 21.1034,18.9981 21.9994,18.1021 21.9994,16.9981L 21.9994,6.99807C 21.9994,5.89406 21.1034,4.99807 19.9994,4.99807 Z"/>'
            },
            kblayoutsDir: {
                width: 24,
                height: 24,
                svg: `<path d="m9.9994 3.9981h-6c-1.105 0-1.99 0.896-1.99 2l-0.01 12c0 1.104 0.895 2 2 2h16c1.104 0 2-0.896 2-2v-9.9999c0-1.104-0.896-2-2-2h-8l-1.9996-2z" stroke-width=".2"/><path stroke-linejoin="round" d="m17.48 11.949h-1.14v-1.14h1.14m0 2.8499h-1.14v-1.14h1.14m-1.7099-0.56999h-1.14v-1.14h1.14m0 2.8499h-1.14v-1.14h1.14m0 3.4199h-4.56v-1.14h4.56m-5.13-2.85h-1.1399v-1.14h1.14m0 2.8499h-1.1399v-1.14h1.14m0.56998 0h1.14v1.14h-1.14m0-2.8499h1.14v1.14h-1.14m1.7099 0.56999h1.14v1.14h-1.14m0-2.8499h1.14v1.14h-1.14m5.13-2.8494h-9.1199c-0.62982 0-1.1343 0.51069-1.1343 1.14l-0.0057 5.6998c0 0.62925 0.51013 1.14 1.14 1.14h9.1196c0.62925 0 1.14-0.5107 1.14-1.14v-5.6998c0-0.62926-0.5107-1.14-1.14-1.14z" stroke-width="0.114" fill="${window.theme.colors.light_black}"/>`
            },
            settings: {
                width: 24,
                height: 24,
                svg: '<path d="M 11.9994,15.498C 10.0664,15.498 8.49939,13.931 8.49939,11.998C 8.49939,10.0651 10.0664,8.49805 11.9994,8.49805C 13.9324,8.49805 15.4994,10.0651 15.4994,11.998C 15.4994,13.931 13.9324,15.498 11.9994,15.498 Z M 19.4284,12.9741C 19.4704,12.6531 19.4984,12.329 19.4984,11.998C 19.4984,11.6671 19.4704,11.343 19.4284,11.022L 21.5414,9.36804C 21.7294,9.21606 21.7844,8.94604 21.6594,8.73004L 19.6594,5.26605C 19.5354,5.05005 19.2734,4.96204 19.0474,5.04907L 16.5584,6.05206C 16.0424,5.65607 15.4774,5.32104 14.8684,5.06903L 14.4934,2.41907C 14.4554,2.18103 14.2484,1.99805 13.9994,1.99805L 9.99939,1.99805C 9.74939,1.99805 9.5434,2.18103 9.5054,2.41907L 9.1304,5.06805C 8.52039,5.32104 7.95538,5.65607 7.43939,6.05206L 4.95139,5.04907C 4.7254,4.96204 4.46338,5.05005 4.33939,5.26605L 2.33939,8.73004C 2.21439,8.94604 2.26938,9.21606 2.4574,9.36804L 4.5694,11.022C 4.5274,11.342 4.49939,11.6671 4.49939,11.998C 4.49939,12.329 4.5274,12.6541 4.5694,12.9741L 2.4574,14.6271C 2.26938,14.78 2.21439,15.05 2.33939,15.2661L 4.33939,18.73C 4.46338,18.946 4.7254,19.0341 4.95139,18.947L 7.4404,17.944C 7.95639,18.34 8.52139,18.675 9.1304,18.9271L 9.5054,21.577C 9.5434,21.8151 9.74939,21.998 9.99939,21.998L 13.9994,21.998C 14.2484,21.998 14.4554,21.8151 14.4934,21.577L 14.8684,18.9271C 15.4764,18.6741 16.0414,18.34 16.5574,17.9431L 19.0474,18.947C 19.2734,19.0341 19.5354,18.946 19.6594,18.73L 21.6594,15.2661C 21.7844,15.05 21.7294,14.78 21.5414,14.6271L 19.4284,12.9741 Z"/>'
            }
        };

        const container = document.getElementById(opts.parentId);
        container.innerHTML = `
            <h3 class="title"><p>FILESYSTEM</p><p id="fs_disp_title_dir"></p></h3>
            <div id="fs_disp_container">
            </div>
            <div id="fs_space_bar">
                <h1>EXIT DISPLAY</h1>
                <h3>Calculating available space...</h3><progress value="100" max="100"></progress>
            </div>`;
        this.filesContainer = document.getElementById("fs_disp_container");
        this.space_bar = {
            text: document.querySelector("#fs_space_bar > h3"),
            bar: document.querySelector("#fs_space_bar > progress")
        };
        this.fsBlock = {};
        this.dirpath = "";
        this.failed = false;
        this._noTracking = false;
        this._runNextTick = false;
        this._reading = false;


        // cross-browser Windows detection (avoids deprecated `platform`)
        this._isWindows = () => {
            try {
                const p = (navigator.userAgentData && navigator.userAgentData.platform) ? navigator.userAgentData.platform : navigator.userAgent;
                return typeof p === 'string' && p.toLowerCase().indexOf('win') > -1;
            } catch (e) { return false; }
        };

        this.setFailedState = () => {
            this.failed = true;
            container.innerHTML = `
            <h3 class="title"><p>FILESYSTEM</p><p id="fs_disp_title_dir">EXECUTION FAILED</p></h3>
            <h2 id="fs_disp_error">CANNOT ACCESS CURRENT WORKING DIRECTORY</h2>`;
        };

        // 独立模式：去除与终端的联动逻辑

        // 异步初始化图标
        this.initializeIcons = async () => {
            if (!this.icons) {
                this.icons = await this.getFileIcons();
            }
        };

        this.readFS = async dir => {

            if (this.failed === true || this._reading || !dir) return false;
            this._reading = true;

            // 确保图标已初始化
            await this.initializeIcons();

            document.getElementById("fs_disp_title_dir").innerText = this.dirpath;
            this.filesContainer.setAttribute("class", "");
            this.filesContainer.innerHTML = "";
            // 独立模式下不显示与 TTY 相关的提示

            try {
                // 在 Wails 中，我们通过 Go 后端获取目录内容
                const dirData = await window.go.main.App.ReadDirectory(dir);
                
                if (!dirData || !dirData.files) {
                    throw new Error('无法读取目录');
                }

                this.reCalculateDiskUsage(dir);

                this.cwd = [];

                // 处理文件列表
                for (const file of dirData.files) {
                    let e = {
                        name: window._escapeHtml(file.name),
                        path: file.path,
                        type: "other",
                        category: "other",
                        hidden: false,
                        size: file.size || 0,
                        lastAccessed: file.lastAccessed || 0
                    };

                    // 设置文件类型
                    if (file.isDirectory) {
                        e.category = "dir";
                        e.type = "dir";
                    } else if (file.isSymbolicLink) {
                        e.category = "symlink";
                        e.type = "symlink";
                    } else if (file.isFile) {
                        e.category = "file";
                        e.type = "file";
                    } else {
                        e.type = "system";
                        e.hidden = true;
                    }

                    // 检查特殊文件类型
                    if (file.name.startsWith(".")) e.hidden = true;

                    this.cwd.push(e);
                }

                // 排序
                let ordering = {
                    dir: 0,
                    symlink: 1,
                    file: 2,
                    other: 3
                };

                this.cwd.sort((a, b) => {
                    return (ordering[a.category] - ordering[b.category] || a.name.localeCompare(b.name));
                });

                // 添加导航选项
                this.cwd.splice(0, 0, {
                    name: "Show disks",
                    type: "showDisks"
                });

                if (dir !== "/" && !/^[A-Z]:\\$/i.test(dir)) {
                    this.cwd.splice(1, 0, {
                        name: "Go up",
                        type: "up"
                    });
                }

                this.dirpath = dir;
                this.render(this.cwd);
                
            } catch (error) {
                console.warn('读取目录失败:', error);
                this.setFailedState();
            }

            this._reading = false;
        };

        this.readDevices = async () => {
            if (this.failed === true) return false;

            try {
                // 在 Wails 中，我们通过 Go 后端获取设备信息
                const devices = await window.go.main.App.GetBlockDevices();
                this.render(devices, true);
            } catch (error) {
                console.error('获取设备信息失败:', error);
                this.setFailedState();
            }
        };

        this.render = async (originBlockList, isDiskView) => {
            // Work on a clone of the blocklist to avoid altering fsDisp.cwd
            let blockList = JSON.parse(JSON.stringify(originBlockList));

            if (this.failed === true) return false;

            if (isDiskView) {
                document.getElementById("fs_disp_title_dir").innerText = "Showing available block devices";
                this.filesContainer.setAttribute("class", "disks");
            } else {
                document.getElementById("fs_disp_title_dir").innerText = this.dirpath;
                this.filesContainer.setAttribute("class", "");
            }
            // 独立模式下不显示与 TTY 相关的提示

            let filesDOM = ``;
            blockList.forEach((e, blockIndex) => {
                let hidden = e.hidden ? " hidden" : "";

                let cmd;
                if (e.type === "dir" || e.type.endsWith("Dir")) {
                    cmd = `window.fsDisp.readFS(window.fsDisp.cwd[${blockIndex}].path)`;
                } else if (e.type === "up") {
                    cmd = `window.fsDisp.readFS(window.fsDisp.getParentPath(window.fsDisp.dirpath))`;
                } else if (e.type === "disk" || e.type === "rom" || e.type === "usb") {
                    cmd = `window.fsDisp.readFS("${e.path.replace(/\\/g, '')}")`;
                }

                if (e.type === "file") {
                    cmd = `window.fsDisp.openFile(${blockIndex})`;
                }

                if (e.type === "system") {
                    cmd = "";
                }

                if (e.type === "showDisks") {
                    cmd = `window.fsDisp.readDevices()`;
                }

                // up 已在独立模式下处理

                if (e.type === "edex-theme") {
                    cmd = `window.themeChanger("${e.name.slice(0, -5)}")`;
                }
                if (e.type === "edex-kblayout") {
                    cmd = `window.remakeKeyboard("${e.name.slice(0, -5)}")`;
                }
                if (e.type === "edex-settings") {
                    cmd = `window.openSettings()`;
                }
                if (e.type === "edex-shortcuts") {
                    cmd = `window.openShortcutsHelp()`;
                }

                let icon = "";
                let type = "";
                switch(e.type) {
                    case "showDisks":
                        icon = this.icons.showDisks;
                        type = "--";
                        e.category = "showDisks";
                        break;
                    case "up":
                        icon = this.icons.up;
                        type = "--";
                        e.category = "up";
                        break;
                    case "symlink":
                        icon = this.icons.symlink;
                        break;
                    case "disk":
                        icon = this.icons.disk;
                        break;
                    case "rom":
                        icon = this.icons.rom;
                        break;
                    case "usb":
                        icon = this.icons.usb;
                        break;
                    case "edex-theme":
                        icon = this.edexIcons.theme;
                        type = "eDEX-UI theme";
                        break;
                    case "edex-kblayout":
                        icon = this.edexIcons.kblayout;
                        type = "eDEX-UI keyboard layout";
                        break;
                    case "edex-settings":
                    case "edex-shortcuts":
                        icon = this.edexIcons.settings;
                        type = "eDEX-UI config file";
                        break;
                    case "system":
                        icon = this.edexIcons.settings;
                        break;
                    case "edex-themesDir":
                        icon = this.edexIcons.themesDir;
                        type = "eDEX-UI themes folder";
                        break;
                    case "edex-kblayoutsDir":
                        icon = this.edexIcons.kblayoutsDir;
                        type = "eDEX-UI keyboards folder";
                        break;
                    default:
                        let iconName = window.matchIcon(e.name);
                        icon = this.icons[iconName];
                        if (typeof icon === "undefined") {
                            if (e.type === "file") icon = this.icons.file;
                            if (e.type === "dir") {
                                icon = this.icons.dir;
                                type = "folder";
                            }
                            if (typeof icon === "undefined") icon = this.icons.other;
                        } else if (e.category !== "dir") {
                            type = iconName;
                            icon = this.icons.other;
                        } else {
                            type = "special folder";
                            icon = this.icons.other;
                        }
                        break;
                }

                if (type === "") type = e.type;
                e.type = type;

                // Handle displayable media
                if (e.type === 'video' || e.type === 'audio' || e.type === 'image') {
                    this.cwd[blockIndex].type = e.type;
                    cmd = `window.fsDisp.openMedia(${blockIndex})`;
                }

                if (typeof e.size === "number") {
                    e.size = this._formatBytes(e.size);
                } else {
                    e.size = "--";
                }
                if (typeof e.lastAccessed === "number") {
                    e.lastAccessed = new Date(e.lastAccessed).toLocaleString();
                } else {
                    e.lastAccessed = "--";
                }

                filesDOM += `<div class="fs_disp_${e.type}${hidden} animationWait" onclick='${cmd}'>
                                <svg viewBox="0 0 ${icon.width} ${icon.height}" fill="${this.iconcolor}">
                                    ${icon.svg}
                                </svg>
                                <h3>${e.name}</h3>
                                <h4>${type}</h4>
                                <h4>${e.size}</h4>
                                <h4>${e.lastAccessed}</h4>
                            </div>`;
            });
            this.filesContainer.innerHTML = filesDOM;

            if (this.filesContainer.getAttribute("class").endsWith("disks")) {
                document.getElementById("fs_space_bar").setAttribute("onclick", "window.fsDisp.render(window.fsDisp.cwd)");
            } else {
                document.getElementById("fs_space_bar").setAttribute("onclick", "");
            }

            // Render animation
            let id = 0;
            while (this.filesContainer.childNodes[id]) {
                let e = this.filesContainer.childNodes[id];
                e.setAttribute("class", e.className.replace(" animationWait", ""));

                if (window.settings.hideDotfiles !== true || e.className.indexOf("hidden") === -1) {
                    window.audioManager.folder.play();
                    await _delay(30);
                }

                id++;
            }
        };

        this.reCalculateDiskUsage = async path => {
            this.fsBlock = null;
            this.space_bar.text.innerHTML = "Calculating available space...";
            this.space_bar.bar.removeAttribute("value");

            try {
                // 在 Wails 中，我们通过 Go 后端获取磁盘使用情况
                const diskUsage = await window.go.main.App.GetDiskUsage(path);
                this.fsBlock = diskUsage;
                this.renderDiskUsage(this.fsBlock);
            } catch (error) {
                console.error('获取磁盘使用情况失败:', error);
                this.space_bar.text.innerHTML = "Could not calculate mountpoint usage.";
                this.space_bar.bar.value = 100;
            }
        };

        this.renderDiskUsage = async fsBlock => {
            if (document.getElementById("fs_space_bar").getAttribute("onclick") !== "" || fsBlock === null) return;
            const __isWindows = this._isWindows();
            let splitter = (__isWindows) ? "\\" : "/";
            let displayMount = (fsBlock.mount.length < 18) ? fsBlock.mount : "..."+splitter+fsBlock.mount.split(splitter).pop();

            // 优先使用直接提供的使用率，否则计算使用率
            if (!isNaN(fsBlock.use) && fsBlock.use >= 0) {
                this.space_bar.text.innerHTML = `Mount <strong>${displayMount}</strong> used <strong>${Math.round(fsBlock.use)}%</strong>`;
                this.space_bar.bar.value = Math.round(fsBlock.use);
            } else if (fsBlock.size > 0 && fsBlock.used >= 0) {
                let usage = Math.round((fsBlock.used / fsBlock.size) * 100);

                this.space_bar.text.innerHTML = `Mount <strong>${displayMount}</strong> used <strong>${usage}%</strong>`;
                this.space_bar.bar.value = usage;
            } else {
                this.space_bar.text.innerHTML = "Could not calculate mountpoint usage.";
                this.space_bar.bar.value = 100;
            }
        };

        if (window.performance.navigation.type === 0) {
            this.readFS(window.settings.cwd);
        }

        this.openFile = async (name, path, type) => {
            let block;

            if (typeof name === "number") {
                block = this.cwd[name];
                name = block.name;
            }

            block.path = block.path.replace(/\\/g, "/");

            try {
                // 在 Wails 中，我们通过 Go 后端获取文件类型
                const fileInfo = await window.go.main.App.GetFileInfo(block.path);
                
                if (fileInfo.mimeType === "application/pdf") {
                    let html = `<div>
                        <div class="pdf_options">
                            <button class="zoom_in">
                                <svg viewBox="0 0 24 24" fill="${this.iconcolor}">
                                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                                </svg>
                            </button>
                            <button class="zoom_out">
                                <svg viewBox="0 0 24 24" fill="${this.iconcolor}">
                                    <path d="M9.5 3C13.09 3 16 5.91 16 9.5c0 1.61-.59 3.09-1.57 4.23l.27.28v.79l5 4.99L20.49 19l-4.99-5v-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3zM9.5 5C7.01 5 5 7.01 5 9.5S7.01 14 9.5 14 14 11.99 14 9.5 11.99 5 9.5 5z"/>
                                </svg>
                            </button>
                            <button class="previous_page">
                                <svg viewBox="0 0 24 24" fill="${this.iconcolor}">
                                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                                </svg>
                            </button>
                            <span>Page: <span class="page_num"/></span><span>/</span> <span class="page_count"></span></span>
                            <button class="next_page">
                                <svg viewBox="0 0 24 24" fill="${this.iconcolor}">
                                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                                </svg>
                            </button>
                        </div>
                        <div class="pdf_container fsDisp_mediaDisp">
                            <canvas class="pdf_canvas" />
                        </div>
                    </div>`;
                    const newModal = new Modal(
                        {
                            type: "custom",
                            title: window._escapeHtml(name),
                            html: html
                        }
                    );
                    new DocReader(
                        {
                            modalId: newModal.id,
                            path: block.path
                        }
                    );
                } else if (fileInfo.isText) {
                    // 读取文本文件
                    const fileData = await window.go.main.App.ReadFile(block.path);
                    window.keyboard.detach();
                    new Modal(
                        {
                            type: "custom",
                            title: window._escapeHtml(name),
                            html: `<textarea id="fileEdit" rows="40" cols="150" spellcheck="false">${fileData.content}</textarea><p id="fedit-status"></p>`,
                            buttons: [
                                {label:"Save to disk",action:`window.writeFile('${block.path}')`}
                            ]
                        }, () => {
                            window.keyboard.attach();
                        }
                    );
                } else {
                    // 其他文件类型，尝试用系统默认程序打开
                    try {
                        await window.go.main.App.OpenFile(block.path);
                    } catch (openError) {
                        console.warn('无法用系统程序打开文件:', openError);
                        new Modal({
                            type: "info",
                            title: "无法打开文件",
                            html: `系统程序打开失败。路径: ${window._escapeHtml(block.path)}`
                        });
                    }
                }
            } catch (error) {
                console.error('打开文件失败:', error);
                new Modal({
                    type: "info",
                    title: "无法加载文件: " + block.path,
                    html: `错误信息: ${error.message}<br><br>您可以尝试:<br>1. 检查文件是否存在<br>2. 检查文件权限<br>3. 在终端中手动打开文件`
                });
            }
        };

        // 使用系统默认程序打开文件
        this.openFileWithSystem = async (blockIndex) => {
            try {
                const block = this.cwd[blockIndex];
                if (!block) {
                    throw new Error('文件不存在');
                }
                
                const filePath = block.path.replace(/\\/g, "/");
                
                // 通过 Wails Go 后端打开文件
                await window.go.main.App.OpenFile(filePath);
            } catch (error) {
                console.error('使用系统程序打开文件失败:', error);
                const block = this.cwd[blockIndex];
                if (block) {
                    new Modal({
                        type: "info",
                        title: "无法打开文件",
                        html: `系统程序打开失败。路径: ${window._escapeHtml(block.path)}`
                    });
                }
            }
        };

        // 获取父目录路径（替代 Node.js 的 path.resolve）
        this.getParentPath = (currentPath) => {
            if (!currentPath || currentPath === "/" || currentPath === "C:\\" || /^[A-Z]:\\$/i.test(currentPath)) {
                return currentPath; // 已经是根目录
            }
            
            // 处理 Windows 路径
            if (currentPath.includes("\\")) {
                const parts = currentPath.split("\\");
                if (parts.length <= 1) return currentPath;
                return parts.slice(0, -1).join("\\");
            }
            
            // 处理 Unix 路径
            const parts = currentPath.split("/");
            if (parts.length <= 1) return "/";
            return parts.slice(0, -1).join("/") || "/";
        };

        this.openMedia = (name, path, type) => {
            let block, html;

            if (typeof name === "number") {
                block = this.cwd[name];
                name = block.name;
            }

            block.path = block.path.replace(/\\/g, "/");

            switch (type || block.type) {
                case "image":
                    html = `<img class="fsDisp_mediaDisp" src="${window._encodePathURI(path || block.path)}" ondragstart="return false;">`;
                    break;
                case "audio":
                    html = `<div>
                                <div class="media_container" data-fullscreen="false">
                                    <audio class="media fsDisp_mediaDisp" preload="auto">
                                        <source src="${window._encodePathURI(path || block.path)}">
                                        Unsupported audio format!
                                    </audio>
                                    <div class="media_controls" data-state="hidden">
                                        <div class="playpause media_button" data-state="play">
                                            <svg viewBox="0 0 24 24" fill="${this.iconcolor}">
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                        </div>
                                        <div class="progress_container">
                                            <div class="progress">
                                                <span class="progress_bar"></span>
                                            </div>
                                        </div>
                                        <div class="media_time">00:00:00</div>
                                        <div class="volume_icon">
                                            <svg viewBox="0 0 24 24" fill="${this.iconcolor}">
                                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                            </svg>
                                        </div>
                                        <div class="volume">
                                            <div class="volume_bkg"></div>
                                            <div class="volume_bar"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                    break;
                case "video":
                    html = `<div>
                                <div class="media_container" data-fullscreen="false">
                                    <video class="media fsDisp_mediaDisp" preload="auto">
                                        <source src="${window._encodePathURI(path || block.path)}">
                                        Unsupported video format!
                                    </video>
                                    <div class="media_controls" data-state="hidden">
                                        <div class="playpause media_button" data-state="play">
                                            <svg viewBox="0 0 24 24" fill="${this.iconcolor}">
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                        </div>
                                        <div class="progress_container">
                                            <div class="progress">
                                                <span class="progress_bar"></span>
                                            </div>
                                        </div>
                                        <div class="media_time">00:00:00</div>
                                        <div class="volume_icon">
                                            <svg viewBox="0 0 24 24" fill="${this.iconcolor}">
                                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                            </svg>
                                        </div>
                                        <div class="volume">
                                            <div class="volume_bkg"></div>
                                            <div class="volume_bar"></div>
                                        </div>
                                        <div class="fs media_button" data-state="go-fullscreen">
                                            <svg viewBox="0 0 24 24" fill="${this.iconcolor}">
                                                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                    break;
                default:
                    throw new Error("fsDisp media displayer: unknown type " + (type || block.type));
            }

            const newModal = new Modal({
                type: "custom",
                title: window._escapeHtml(name),
                html
            });
            if (block.type === "audio" || block.type === "video") {
                new MediaPlayer({
                    modalId: newModal.id,
                    path: block.path,
                    type: block.type
                });
            }
        };

        
    }
}

// 全局文件写入函数
window.writeFile = async (filePath) => {
    try {
        const textarea = document.getElementById('fileEdit');
        if (!textarea) {
            throw new Error('找不到文件编辑区域');
        }
        
        const content = textarea.value;
        const status = document.getElementById('fedit-status');
        
        if (status) {
            status.textContent = '正在保存...';
            status.style.color = '#ffa726';
        }
        
        // 通过 Go 后端保存文件
        await window.go.main.App.WriteFile(filePath, content);
        
        if (status) {
            status.textContent = '文件保存成功！';
            status.style.color = '#4caf50';
        }
        
        console.log(`文件已保存: ${filePath}`);
    } catch (error) {
        console.error('保存文件失败:', error);
        const status = document.getElementById('fedit-status');
        if (status) {
            status.textContent = `保存失败: ${error.message}`;
            status.style.color = '#f44336';
        }
    }
};

// 在 Wails 中，我们直接暴露到全局作用域
window.FilesystemDisplay = FilesystemDisplay;
