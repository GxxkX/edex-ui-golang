// Wails 版本的连接信息类
// 从 Electron conninfo.class.js 转换而来

class Conninfo {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        // 创建 DOM
        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_conninfo">
            <div id="mod_conninfo_innercontainer">
                <h1>NETWORK TRAFFIC<i>UP / DOWN, MB/S</i></h1>
                <h2>TOTAL<i>0B OUT, 0B IN</i></h2>
                <canvas id="mod_conninfo_canvas_top"></canvas>
                <canvas id="mod_conninfo_canvas_bottom"></canvas>
                <h3>OFFLINE</h3>
            </div>
        </div>`;

        this.current = document.querySelector("#mod_conninfo_innercontainer > h1 > i");
        this.total = document.querySelector("#mod_conninfo_innercontainer > h2 > i");
        
        // 在 Wails 中，我们使用自定义的字节格式化函数
        this._pb = this.formatBytes;

        // 检查 Smoothie 库是否可用
        if (typeof SmoothieChart === 'undefined' || typeof TimeSeries === 'undefined') {
            console.error('Smoothie chart library not loaded');
            this.parent.innerHTML = '<div style="color: red;">Chart library not available</div>';
            return;
        }

        // Set chart options
        let chartOptions = [{
            limitFPS: 40,
            responsive: true,
            millisPerPixel: 70,
            interpolation: 'linear',
            grid:{
                millisPerLine: 5000,
                fillStyle:'transparent',
                strokeStyle:`rgba(${window.theme.r},${window.theme.g},${window.theme.b},0.4)`,
                verticalSections:3,
                borderVisible:false
            },
            labels:{
                fontSize: 10,
                fillStyle: `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                precision: 2
            }
        }];
        chartOptions.push(Object.assign({}, chartOptions[0]));  // Deep copy object, see http://jsben.ch/bWfk9
        chartOptions[0].minValue = 0;
        chartOptions[1].maxValue = 0;

        // Create chart
        this.series = [new TimeSeries(), new TimeSeries()];
        this.charts = [new SmoothieChart(chartOptions[0]), new SmoothieChart(chartOptions[1])];

        this.charts[0].addTimeSeries(this.series[0], {lineWidth:1.7,strokeStyle:`rgb(${window.theme.r},${window.theme.g},${window.theme.b})`});
        this.charts[1].addTimeSeries(this.series[1], {lineWidth:1.7,strokeStyle:`rgb(${window.theme.r},${window.theme.g},${window.theme.b})`});

        this.charts[0].streamTo(document.getElementById("mod_conninfo_canvas_top"), 1000);
        this.charts[1].streamTo(document.getElementById("mod_conninfo_canvas_bottom"), 1000);

        // 初始化更新器
        this.updateInfo();
        this.infoUpdater = setInterval(() => {
            this.updateInfo();
        }, 1000);
    }

    // 字节格式化函数
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    updateInfo() {
        let time = new Date().getTime();

        if (window.mods.netstat.offline || window.mods.netstat.iface === null) {
            this.series[0].append(time, 0);
            this.series[1].append(time, 0);
            document.querySelector("div#mod_conninfo").setAttribute("class", "offline");
            return;
        } else {
            document.querySelector("div#mod_conninfo").setAttribute("class", "");
            
            // 使用 Wails 后端 API 获取网络统计信息
            window.go.main.App.GetNetworkStats(window.mods.netstat.iface).then(data => {
                let max0 = this.series[0].maxValue;
                let max1 = -this.series[1].minValue;
                if (max0 > max1) {
                    this.series[1].minValue = -max0;
                } else if (max1 > max0) {
                    this.series[0].maxValue = max1;
                }

                this.series[0].append(time, data[0].tx_sec/125000);
                this.series[1].append(time, -data[0].rx_sec/125000);

                this.total.innerText = `${this._pb(data[0].tx_bytes)} OUT, ${this._pb(data[0].rx_bytes)} IN`.toUpperCase();
                this.current.innerText = "UP " + parseFloat(data[0].tx_sec/125000).toFixed(2) + " DOWN " + parseFloat(data[0].rx_sec/125000).toFixed(2);
            }).catch(error => {
                console.error('Failed to get network stats:', error);
                this.series[0].append(time, 0);
                this.series[1].append(time, 0);
            });
        }
    }
}

// 在 Wails 中，我们直接暴露到全局作用域，而不是使用 module.exports
window.Conninfo = Conninfo;
