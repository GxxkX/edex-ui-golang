// Wails 版本的网络状态类
// 从 Electron netstat.class.js 转换而来

class Netstat {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        // 创建 DOM
        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_netstat">
            <div id="mod_netstat_inner">
                <h1>NETWORK STATUS<i id="mod_netstat_iname">Loading...</i></h1>
                <div id="mod_netstat_innercontainer">
                    <div>
                        <h1>STATE</h1>
                        <h2>UNKNOWN</h2>
                    </div>
                    <div>
                        <h1>IPv4</h1>
                        <h2>--.--.--.--</h2>
                    </div>
                    <div>
                        <h1>PING</h1>
                        <h2>--ms</h2>
                    </div>
                </div>
            </div>
        </div>`;

        this.offline = false;
        this.iface = null;
        this.runsBeforeGeoIPUpdate = 0;

        // 初始化更新器
        this.updateInfo();
        this.infoUpdater = setInterval(() => {
            this.updateInfo();
        }, 5000);

        this.updateExternalIP();
        this.externalIPUpdater = setInterval(() => {
            this.updateExternalIP();
        }, 600000);

        // 使用后端API的地理位置查找
        this.geoLookup = {
            get: async (ip) => {
                try {
                    const geoResult = await window.go.main.App.GetIPGeoLocation(ip);
                    if (geoResult.found) {
                        return {
                            location: geoResult.location
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`查询IP ${ip} 地理位置失败:`, error);
                    return null;
                }
            }
        };
    }
    async updateExternalIP() {
        if (this.runsBeforeGeoIPUpdate === 0) {
            try {
                // 使用新的API获取外部IP和地理位置信息
                const geoInfo = await window.go.main.App.GetExternalIPWithGeo();
                this.ipinfo = {
                    ip: geoInfo.ip,
                    geo: geoInfo.location
                };

                let ip = this.ipinfo.ip;
                document.querySelector("#mod_netstat_innercontainer > div:nth-child(2) > h2").innerHTML = window._escapeHtml ? window._escapeHtml(ip) : ip;

                this.runsBeforeGeoIPUpdate = 10;
            } catch (e) {
                console.warn('Failed to get external IP:', e);
                // 降级到只获取IP
                try {
                    const externalIP = await window.go.main.App.GetExternalIP();
                    this.ipinfo = {
                        ip: externalIP.ip,
                        geo: null
                    };
                    let ip = this.ipinfo.ip;
                    document.querySelector("#mod_netstat_innercontainer > div:nth-child(2) > h2").innerHTML = window._escapeHtml ? window._escapeHtml(ip) : ip;
                } catch (e2) {
                    console.warn('Failed to get external IP (fallback):', e2);
                }
            }
        } else if (this.runsBeforeGeoIPUpdate !== 0) {
            this.runsBeforeGeoIPUpdate = this.runsBeforeGeoIPUpdate - 1;
        }
    }
    updateInfo() {
        // 使用 Wails 后端 API 获取网络信息
        window.go.main.App.GetNetworkInfo().then(async data => {
            let offline = false;

            let net = data.interfaces[0];

            this.iface = net.iface;
            this.internalIPv4 = net.ip4;
            document.getElementById("mod_netstat_iname").innerText = "Interface: " + net.iface;

            if (net.ip4 === "127.0.0.1") {
                offline = true;
            } else {
                // 在 Wails 中，我们通过后端进行 ping
                try {
                    const pingResult = await window.go.main.App.Ping(window.settings?.pingAddr || "8.8.8.8");
                    this.offline = false;
                    document.querySelector("#mod_netstat_innercontainer > div:first-child > h2").innerHTML = "ONLINE";
                    document.querySelector("#mod_netstat_innercontainer > div:nth-child(3) > h2").innerHTML = Math.round(pingResult.time) + "ms";
                } catch (e) {
                    offline = true;
                }

                this.offline = offline;
                if (offline) {
                    document.querySelector("#mod_netstat_innercontainer > div:first-child > h2").innerHTML = "OFFLINE";
                    document.querySelector("#mod_netstat_innercontainer > div:nth-child(2) > h2").innerHTML = "--.--.--.--";
                    document.querySelector("#mod_netstat_innercontainer > div:nth-child(3) > h2").innerHTML = "--ms";
                }
            }
        }).catch(error => {
            console.error('Failed to get network info:', error);
            document.getElementById("mod_netstat_iname").innerText = "Interface: (error)";
            document.querySelector("#mod_netstat_innercontainer > div:first-child > h2").innerHTML = "ERROR";
            document.querySelector("#mod_netstat_innercontainer > div:nth-child(2) > h2").innerHTML = "--.--.--.--";
            document.querySelector("#mod_netstat_innercontainer > div:nth-child(3) > h2").innerHTML = "--ms";
        });
    }
}

// 在 Wails 中，我们直接暴露到全局作用域，而不是使用 module.exports
window.Netstat = Netstat;
