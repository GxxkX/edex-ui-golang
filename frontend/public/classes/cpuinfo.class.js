// Wails 版本的 CPU 信息类
// 从 Electron cpuinfo.class.js 转换而来

class Cpuinfo {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        // 创建初始 DOM
        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_cpuinfo">
        </div>`;
        this.container = document.getElementById("mod_cpuinfo");

        // 初始化图表库（需要先加载 smoothie.js）
        this.initCharts();
    }

    // 初始化图表
    initCharts() {
        // 检查 smoothie 是否可用
        if (typeof SmoothieChart === 'undefined' || typeof TimeSeries === 'undefined') {
            console.error('Smoothie chart library not loaded');
            this.container.innerHTML = '<div style="color: red;">Chart library not available</div>';
            return;
        }

        this.series = [];
        this.charts = [];
        
        // 使用 Wails 后端 API 获取 CPU 信息
        window.go.main.App.GetCPUInfo().then(data => {
            let divide = Math.floor(data.cores/2);
            this.divide = divide;

            let cpuName = data.manufacturer + data.brand;
            cpuName = cpuName.substr(0, 30);
            cpuName = cpuName.substr(0, Math.min(cpuName.length, cpuName.lastIndexOf(" ")));

            let innercontainer = document.createElement("div");
            innercontainer.setAttribute("id", "mod_cpuinfo_innercontainer");
            innercontainer.innerHTML = `<h1>CPU USAGE<i>${cpuName}</i></h1>
                <div>
                    <h1># <em>1</em> - <em>${divide}</em><br>
                    <i id="mod_cpuinfo_usagecounter0">Avg. --%</i></h1>
                    <canvas id="mod_cpuinfo_canvas_0" height="60"></canvas>
                </div>
                <div>
                    <h1># <em>${divide+1}</em> - <em>${data.cores}</em><br>
                    <i id="mod_cpuinfo_usagecounter1">Avg. --%</i></h1>
                    <canvas id="mod_cpuinfo_canvas_1" height="60"></canvas>
                </div>
                <div>
                    <div>
                        <h1>${this.isWindows() ? "CORES" : "TEMP"}<br>
                        <i id="mod_cpuinfo_temp">${this.isWindows() ? data.cores : "--°C"}</i></h1>
                    </div>
                    <div>
                        <h1>SPD<br>
                        <i id="mod_cpuinfo_speed_min">--GHz</i></h1>
                    </div>
                    <div>
                        <h1>MAX<br>
                        <i id="mod_cpuinfo_speed_max">--GHz</i></h1>
                    </div>
                    <div>
                        <h1>TASKS<br>
                        <i id="mod_cpuinfo_tasks">---</i></h1>
                    </div>
                </div>`;
            this.container.append(innercontainer);

            for (var i = 0; i < 2; i++) {
                this.charts.push(new SmoothieChart({
                    limitFPS: 30,
                    responsive: true,
                    millisPerPixel: 50,
                    grid:{
                        fillStyle:'transparent',
                        strokeStyle:'transparent',
                        verticalSections:0,
                        borderVisible:false
                    },
                    labels:{
                        disabled: true
                    },
                    yRangeFunction: () => {
                        return {min:0,max:100};
                    }
                }));
            }

            for (var i = 0; i < data.cores; i++) {
                // Create TimeSeries
                this.series.push(new TimeSeries());

                let serie = this.series[i];
                let options = {
                    lineWidth: 1.7,
                    strokeStyle: `rgb(${window.theme ? window.theme.r : 255},${window.theme ? window.theme.g : 255},${window.theme ? window.theme.b : 255})`
                };

                if (i < divide) {
                    this.charts[0].addTimeSeries(serie, options);
                } else {
                    this.charts[1].addTimeSeries(serie, options);
                }
            }

            for (var i = 0; i < 2; i++) {
                this.charts[i].streamTo(document.getElementById(`mod_cpuinfo_canvas_${i}`), 500);
            }

            // 初始化更新器
            this.updatingCPUload = false;
            this.updateCPUload();
            if (!this.isWindows()) {this.updateCPUtemp();}
            this.updatingCPUspeed = false;
            this.updateCPUspeed();
            this.updatingCPUtasks = false;
            this.updateCPUtasks();
            this.loadUpdater = setInterval(() => {
                this.updateCPUload();
            }, 500);
            if (!this.isWindows()) {
                this.tempUpdater = setInterval(() => {
                    this.updateCPUtemp();
                }, 2000);
            }
            this.speedUpdater = setInterval(() => {
                this.updateCPUspeed();
            }, 1000);
            this.tasksUpdater = setInterval(() => {
                this.updateCPUtasks();
            }, 5000);
        }).catch(error => {
            console.error('Failed to get CPU info:', error);
            this.container.innerHTML = '<div style="color: red;">Failed to load CPU information</div>';
        });
    }

    // 检查是否为 Windows 平台
    isWindows() {
        return navigator.platform.toLowerCase().indexOf('win') > -1;
    }
    updateCPUload() {
        if (this.updatingCPUload) return;
        this.updatingCPUload = true;
        window.go.main.App.GetCPULoad().then(data => {
            let average = [[], []];

            if (!data.cpus) return; // 防止内存泄漏

            data.cpus.forEach((e, i) => {
                this.series[i].append(new Date().getTime(), e.load);

                if (i < this.divide) {
                    average[0].push(e.load);
                } else {
                    average[1].push(e.load);
                }
            });
            average.forEach((stats, i) => {
                average[i] = Math.round(stats.reduce((a, b) => a + b, 0)/stats.length);

                try {
                    document.getElementById(`mod_cpuinfo_usagecounter${i}`).innerText = `Avg. ${average[i]}%`;
                } catch(e) {
                    // 静默失败，DOM 元素可能正在刷新（新主题等）
                }
            });
            this.updatingCPUload = false;
        }).catch(error => {
            console.error('Failed to get CPU load:', error);
            this.updatingCPUload = false;
        });
    }
    updateCPUtemp() {
        window.go.main.App.GetCPUTemperature().then(data => {
            try {
                document.getElementById("mod_cpuinfo_temp").innerText = `${data.max}°C`;
            } catch(e) {
                // 静默失败
            }
        }).catch(error => {
            console.error('Failed to get CPU temperature:', error);
        });
    }
    updateCPUspeed() {
        if (this.updatingCPUspeed) return;
        this.updatingCPUspeed = true;
        window.go.main.App.GetCPUSpeed().then(data => {
            try {
                document.getElementById("mod_cpuinfo_speed_min").innerText = `${data.speed}GHz`;
                document.getElementById("mod_cpuinfo_speed_max").innerText = `${data.speedMax}GHz`;
            } catch(e) {
                // 静默失败
            }
            this.updatingCPUspeed = false;
        }).catch(error => {
            console.error('Failed to get CPU speed:', error);
            this.updatingCPUspeed = false;
        });
    }
    updateCPUtasks() {
        if (this.updatingCPUtasks) return;
        this.updatingCPUtasks = true;
        window.go.main.App.GetProcessCount().then(data => {
            try {
                document.getElementById("mod_cpuinfo_tasks").innerText = `${data.count}`;
            } catch(e) {
                // 静默失败
            }
            this.updatingCPUtasks = false;
        }).catch(error => {
            console.error('Failed to get process count:', error);
            this.updatingCPUtasks = false;
        });
    }
}

window.Cpuinfo = Cpuinfo;
