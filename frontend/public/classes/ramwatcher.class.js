// Wails 版本的内存监控器类
// 从 Electron ramwatcher.class.js 转换而来

class RAMwatcher {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        // 创建 DOM
        this.parent = document.getElementById(parentId);
        let modExtContainer = document.createElement("div");
        let ramwatcherDOM = `<div id="mod_ramwatcher_inner">
                <h1>MEMORY<i id="mod_ramwatcher_info">Loading...</i></h1>
                <div id="mod_ramwatcher_pointmap">`;

        for (var i = 0; i < 440; i++) {
            ramwatcherDOM += `<div class="mod_ramwatcher_point free"></div>`;
        }

        ramwatcherDOM += `</div>
                <div id="mod_ramwatcher_swapcontainer">
                    <h1>SWAP</h1>
                    <progress id="mod_ramwatcher_swapbar" max="100" value="0"></progress>
                    <h3 id="mod_ramwatcher_swaptext">0.0 GiB</h3>
                </div>
        </div>`;

        modExtContainer.innerHTML = ramwatcherDOM;
        modExtContainer.setAttribute("id", "mod_ramwatcher");
        this.parent.append(modExtContainer);

        this.points = Array.from(document.querySelectorAll("div.mod_ramwatcher_point"));
        this.shuffleArray(this.points);

        // 初始化更新器
        this.currentlyUpdating = false;
        this.updateInfo();
        this.infoUpdater = setInterval(() => {
            this.updateInfo();
        }, 1500);
    }
    updateInfo() {
        if (this.currentlyUpdating) return;
        this.currentlyUpdating = true;
        
        // 使用 Wails 后端 API 获取内存信息
        window.go.main.App.GetMemoryInfo().then(data => {
            if (data.free + data.used !== data.total) {
                console.error("RAM Watcher Error: Bad memory values");
                this.currentlyUpdating = false;
                return;
            }

            // 为 440 点网格转换数据
            let active = Math.round((440 * data.used) / data.total);
            let available = Math.round((440 * (data.available)) / data.total);
            // 更新网格
            this.points.slice(0, active).forEach(domPoint => {
                if (domPoint.attributes.class.value !== "mod_ramwatcher_point active") {
                    domPoint.setAttribute("class", "mod_ramwatcher_point active");
                }
            });
            this.points.slice(active, active + available).forEach(domPoint => {
                if (domPoint.attributes.class.value !== "mod_ramwatcher_point available") {
                    domPoint.setAttribute("class", "mod_ramwatcher_point available");
                }
            });
            this.points.slice(active + available, this.points.length).forEach(domPoint => {
                if (domPoint.attributes.class.value !== "mod_ramwatcher_point free") {
                    domPoint.setAttribute("class", "mod_ramwatcher_point free");
                }
            });

            // 更新信息文本
            let totalGiB = Math.round((data.total / 1073742000) * 10) / 10; // 1073742000 bytes = 1 Gibibyte (GiB)
            let usedGiB = Math.round((data.used / 1073742000) * 10) / 10;
            document.getElementById("mod_ramwatcher_info").innerText = `USING ${usedGiB} OUT OF ${totalGiB} GiB`;

            // 更新交换分区指示器
            let usedSwap = Math.round((100 * data.swapused) / data.swaptotal);
            document.getElementById("mod_ramwatcher_swapbar").value = usedSwap || 0;

            let usedSwapGiB = Math.round((data.swapused / 1073742000) * 10) / 10;
            document.getElementById("mod_ramwatcher_swaptext").innerText = `${usedSwapGiB} GiB`;

            this.currentlyUpdating = false;
        }).catch(error => {
            console.error('Failed to get memory info:', error);
            document.getElementById("mod_ramwatcher_info").innerText = "Error loading memory info";
            this.currentlyUpdating = false;
        });
    }
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

// 在 Wails 中，我们直接暴露到全局作用域，而不是使用 module.exports
window.RAMwatcher = RAMwatcher;
