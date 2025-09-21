// Wails 版本的硬件检查器类
// 从 Electron hardwareInspector.class.js 转换而来

class HardwareInspector {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        // 创建 DOM
        this.parent = document.getElementById(parentId);
        this._element = document.createElement("div");
        this._element.setAttribute("id", "mod_hardwareInspector");
        this._element.innerHTML = `<div id="mod_hardwareInspector_inner">
            <div>
                <h1>MANUFACTURER</h1>
                <h2 id="mod_hardwareInspector_manufacturer" >Loading...</h2>
            </div>
            <div>
                <h1>MODEL</h1>
                <h2 id="mod_hardwareInspector_model" >Loading...</h2>
            </div>
            <div>
                <h1>CHASSIS</h1>
                <h2 id="mod_hardwareInspector_chassis" >Loading...</h2>
            </div>
        </div>`;

        this.parent.append(this._element);

        this.updateInfo();
        this.infoUpdater = setInterval(() => {
            this.updateInfo();
        }, 20000);
    }
    updateInfo() {
        // 使用 Wails 后端 API 获取硬件信息
        window.go.main.App.GetHardwareInfo().then(hardwareInfo => {
            
            try {
                document.getElementById("mod_hardwareInspector_manufacturer").innerText = hardwareInfo.manufacturer;
                document.getElementById("mod_hardwareInspector_model").innerText = hardwareInfo.model;
                document.getElementById("mod_hardwareInspector_chassis").innerText = hardwareInfo.chassisType;
            } catch (error) {
                console.error('Failed to update hardware info:', error);
                document.getElementById("mod_hardwareInspector_manufacturer").innerText = "Unknown";
                document.getElementById("mod_hardwareInspector_model").innerText = "Unknown";
                document.getElementById("mod_hardwareInspector_chassis").innerText = "Unknown";
            }
        }).catch(error => {
            console.error('Failed to get hardware info:', error);
            document.getElementById("mod_hardwareInspector_manufacturer").innerText = "Error";
            document.getElementById("mod_hardwareInspector_model").innerText = "Error";
            document.getElementById("mod_hardwareInspector_chassis").innerText = "Error";
        });
    }
}

// 在 Wails 中，我们直接暴露到全局作用域，而不是使用 module.exports
window.HardwareInspector = HardwareInspector;
