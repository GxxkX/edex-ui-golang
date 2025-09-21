// Wails 版本的系统信息类
// 从 Electron sysinfo.class.js 转换而来

class Sysinfo {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        // 创建 DOM
        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_sysinfo">
            <div>
                <h1>1970</h1>
                <h2>JAN 1</h2>
            </div>
            <div>
                <h1>UPTIME</h1>
                <h2>0:0:0</h2>
            </div>
            <div>
                <h1>TYPE</h1>
                <h2>Loading...</h2>
            </div>
            <div>
                <h1>POWER</h1>
                <h2>00%</h2>
            </div>
        </div>`;

        this.updateDate();
        this.updateUptime();
        this.uptimeUpdater = setInterval(() => {
            this.updateUptime();
        }, 60000);
        this.updateBattery();
        this.batteryUpdater = setInterval(() => {
            this.updateBattery();
        }, 3000);
        
        // 异步获取系统信息
        this.loadSystemInfo();
    }
    updateDate() {
        let time = new Date();

        document.querySelector("#mod_sysinfo > div:first-child > h1").innerHTML = time.getFullYear();

        let month = time.getMonth();
        switch(month) {
            case 0:
                month = "JAN";
                break;
            case 1:
                month = "FEB";
                break;
            case 2:
                month = "MAR";
                break;
            case 3:
                month = "APR";
                break;
            case 4:
                month = "MAY";
                break;
            case 5:
                month = "JUN";
                break;
            case 6:
                month = "JUL";
                break;
            case 7:
                month = "AUG";
                break;
            case 8:
                month = "SEP";
                break;
            case 9:
                month = "OCT";
                break;
            case 10:
                month = "NOV";
                break;
            case 11:
                month = "DEC";
                break;
        }
        document.querySelector("#mod_sysinfo > div:first-child > h2").innerHTML = month+" "+time.getDate();

        let timeToNewDay = ((23 - time.getHours()) * 3600000) + ((59 - time.getMinutes()) * 60000);
        setTimeout(() => {
            this.updateDate();
        }, timeToNewDay);
    }
    // 异步加载系统信息
    async loadSystemInfo() {
        try {
            const systemInfo = await window.go.main.App.GetSystemInfo();
            document.querySelector("#mod_sysinfo > div:nth-child(3) > h2").innerHTML = systemInfo.os;
        } catch (error) {
            console.error('Failed to load system info:', error);
            document.querySelector("#mod_sysinfo > div:nth-child(3) > h2").innerHTML = "Unknown";
        }
    }

    updateUptime() {
        // 在 Wails 中，我们需要通过后端获取系统运行时间
        window.go.main.App.GetUptime().then(uptimeSeconds => {
            let uptime = {
                raw: Math.floor(uptimeSeconds),
                days: 0,
                hours: 0,
                minutes: 0
            };

            uptime.days = Math.floor(uptime.raw/86400);
            uptime.raw -= uptime.days*86400;
            uptime.hours = Math.floor(uptime.raw/3600);
            uptime.raw -= uptime.hours*3600;
            uptime.minutes = Math.floor(uptime.raw/60);

            if (uptime.hours.toString().length !== 2) uptime.hours = "0"+uptime.hours;
            if (uptime.minutes.toString().length !== 2) uptime.minutes = "0"+uptime.minutes;

            document.querySelector("#mod_sysinfo > div:nth-child(2) > h2").innerHTML = uptime.days + '<span style="opacity:0.5;">d</span>' + uptime.hours + '<span style="opacity:0.5;">:</span>' + uptime.minutes;
        }).catch(error => {
            console.error('Failed to get uptime:', error);
            document.querySelector("#mod_sysinfo > div:nth-child(2) > h2").innerHTML = "Error";
        });
    }
    
    updateBattery() {
        // 在 Wails 中，我们需要通过后端获取电池信息
        window.go.main.App.GetBatteryInfo().then(batteryInfo => {
            let indicator = document.querySelector("#mod_sysinfo > div:last-child > h2");
            if (batteryInfo.HasBattery) {
                if (batteryInfo.IsCharging) {
                    indicator.innerHTML = "CHARGE";
                } else if (batteryInfo.ACConnected) {
                    indicator.innerHTML = "WIRED";
                } else {
                    indicator.innerHTML = Math.round(batteryInfo.Percent) + "%";
                }
            } else {
                indicator.innerHTML = "ON";
            }
        }).catch(error => {
            console.error('Failed to get battery info:', error);
            document.querySelector("#mod_sysinfo > div:last-child > h2").innerHTML = "ON";
        });
    }
}

window.Sysinfo = Sysinfo;
