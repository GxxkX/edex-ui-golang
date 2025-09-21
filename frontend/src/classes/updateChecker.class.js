class UpdateChecker {
    constructor() {
        this._failed = false;
        this._willfail = false;
        
        // 在 Wails 中，我们通过 Go 后端检查更新
        this.checkForUpdates();
    }

    // 检查更新
    async checkForUpdates() {
        try {
            // 调用 Go 后端检查更新
            const updateInfo = await window.go.main.App.CheckForUpdates();
            
            if (!updateInfo) {
                this._fail("无法获取更新信息");
                return;
            }

            if (updateInfo.isLatest) {
                this.log("info", "UpdateChecker: Running latest version.");
            } else if (updateInfo.isDevelopment) {
                this.log("info", "UpdateChecker: Running an unreleased, development version.");
            } else {
                this.showUpdateModal(updateInfo);
                this.log("info", `UpdateChecker: New version ${updateInfo.latestVersion} available.`);
            }
        } catch (error) {
            this._fail(error);
        }
    }

    // 显示更新模态框
    showUpdateModal(updateInfo) {
        const modal = new Modal({
            type: "info",
            title: "New version available",
            message: `eDEX-UI <strong>${updateInfo.latestVersion}</strong> is now available.<br/>Head over to <a href="#" onclick="window.go.main.App.OpenURL('${updateInfo.downloadURL}')">github.com</a> to download the latest version.`
        });
    }

    // 记录日志
    log(level, message) {
        // 在 Wails 中，我们通过 Go 后端记录日志
        if (window.go && window.go.main && window.go.main.App) {
            window.go.main.App.Log(level, message);
        } else {
            console.log(`[${level.toUpperCase()}] ${message}`);
        }
    }

    // 处理失败
    _fail = (error) => {
        this._failed = true;
        this.log("note", "UpdateChecker: Could not fetch latest release from GitHub's API.");
        this.log("debug", `Error: ${error}`);
    };
}

// 在 Wails 中，我们直接暴露到全局作用域
window.UpdateChecker = UpdateChecker;
