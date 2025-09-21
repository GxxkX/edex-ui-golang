class Clock {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        // Load settings - 在 Wails 中，我们需要从 Go 后端获取设置
        this.twelveHours = this.getClockSettings();

        // Create DOM
        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_clock" class="${(this.twelveHours) ? "mod_clock_twelve" : ""}">
            <h1 id="mod_clock_text"><span>?</span><span>?</span><span>:</span><span>?</span><span>?</span><span>:</span><span>?</span><span>?</span></h1>
        </div>`;

        this.lastTime = new Date();

        this.updateClock();
        this.updater = setInterval(() => {
            this.updateClock();
        }, 1000);
    }

    // 获取时钟设置 - 在 Wails 中从 Go 后端获取
    getClockSettings() {
        // 默认使用 24 小时制，可以通过 Wails 后端 API 获取设置
        if (window.go && window.go.main && window.go.main.App) {
            try {
                // 调用 Go 后端的设置获取方法
                const clockHours = window.go.main.App.GetClockHours();
                return clockHours === 12; // 如果是12小时制则返回true
            } catch (error) {
                console.warn('无法获取时钟设置，使用默认值:', error);
                return false; // 默认 24 小时制
            }
        }
        return false; // 默认 24 小时制
    }

    updateClock() {
        let time = new Date();
        let array = [time.getHours(), time.getMinutes(), time.getSeconds()];

        // 12-hour mode translation
        if (this.twelveHours) {
            this.ampm = (array[0] >= 12) ? "PM" : "AM";
            if (array[0] > 12) array[0] = array[0] - 12;
            if (array[0] === 0) array[0] = 12;
        }

        array.forEach((e, i) => {
            if (e.toString().length !== 2) {
                array[i] = "0"+e;
            }
        });
        let clockString = `${array[0]}:${array[1]}:${array[2]}`;
        array = clockString.match(/.{1}/g);
        clockString = "";
        array.forEach(e => {
            if (e === ":") clockString += "<em>"+e+"</em>";
            else clockString += "<span>"+e+"</span>";
        });
        
        if (this.twelveHours) clockString += `<span>${this.ampm}</span>`;

        document.getElementById("mod_clock_text").innerHTML = clockString;
        this.lastTime = time;
    }

    // 销毁时钟组件
    destroy() {
        if (this.updater) {
            clearInterval(this.updater);
            this.updater = null;
        }
        if (this.parent) {
            this.parent.innerHTML = '';
        }
    }
}

// 在 Wails 中，我们直接暴露到全局作用域，而不是使用 module.exports
window.Clock = Clock;
