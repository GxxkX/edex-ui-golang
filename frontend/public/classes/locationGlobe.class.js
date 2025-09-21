// Wails 版本的地球仪类
// 从 Electron locationGlobe.class.js 转换而来

class LocationGlobe {
    constructor(parentId) {
        if (!parentId) throw "Missing parameters";

        // 在 Wails 中，我们通过 fetch 加载地理数据
        this.loadGeoData();
        
        // 检查 ENCOM 库是否可用
        if (typeof window.ENCOM === 'undefined') {
            console.error('ENCOM Globe library not loaded');
            this.parent = document.getElementById(parentId);
            this.parent.innerHTML = '<div style="color: red;">Globe library not available</div>';
            return;
        }
        this.ENCOM = window.ENCOM;

        // 创建 DOM
        this.parent = document.getElementById(parentId);
        this.parent.innerHTML += `<div id="mod_globe">
            <div id="mod_globe_innercontainer">
                <h1>WORLD VIEW<i>GLOBAL NETWORK MAP</i></h1>
                <h2>ENDPOINT LAT/LON<i class="mod_globe_headerInfo">0.0000, 0.0000</i></h2>
                <div id="mod_globe_canvas_placeholder"></div>
                <h3>OFFLINE</h3>
            </div>
        </div>`;

        this.lastgeo = {};
        this.conns = [];
    }

    // 加载地理数据
    async loadGeoData() {
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                console.log(`正在加载地理数据... (尝试 ${retryCount + 1}/${maxRetries})`);
                const response = await fetch('assets/misc/grid.json');
                
                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
                }
                
                this._geodata = await response.json();
                
                if (!this._geodata || !this._geodata.tiles) {
                    throw new Error('地理数据格式无效');
                }
                
                console.log('地理数据加载成功');
                this.initGlobe();
                return;
                
            } catch (error) {
                retryCount++;
                console.error(`加载地理数据失败 (尝试 ${retryCount}/${maxRetries}):`, error);
                
                if (retryCount >= maxRetries) {
                    console.error('所有重试都失败了，使用默认地理数据');
                    this.loadDefaultGeoData();
                    return;
                }
                
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }
    }
    
    // 加载默认地理数据
    loadDefaultGeoData() {
        console.log('使用默认地理数据');
        this._geodata = {
            tiles: [] // 空的地理数据，地球仪仍可工作但可能没有详细的地形
        };
        this.initGlobe();
    }

    // 初始化地球仪
    initGlobe() {


        setTimeout(() => {
            let container = document.getElementById("mod_globe_innercontainer");
            let placeholder = document.getElementById("mod_globe_canvas_placeholder");
            // Create Globe
            this.globe = new this.ENCOM.Globe(placeholder.offsetWidth, placeholder.offsetHeight, {
                font: window.theme.cssvars.font_main,
                data: [],
                tiles: this._geodata.tiles,
                baseColor: window.theme.globe.base || `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                markerColor: window.theme.globe.marker || `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                pinColor: window.theme.globe.pin || `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                satelliteColor: window.theme.globe.satellite || `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                scale: 1.1,
                viewAngle: 0.630,
                dayLength: 1000 * 45,
                introLinesDuration: 2000,
                introLinesColor: window.theme.globe.marker || `rgb(${window.theme.r},${window.theme.g},${window.theme.b})`,
                maxPins: 300,
                maxMarkers: 100
            });

            // Place Globe
            placeholder.remove();
            container.append(this.globe.domElement);

            // Init animations
            this._animate = () => {
                if (window.mods.globe.globe) {
                    window.mods.globe.globe.tick();
                }
                if (window.mods.globe._animate) {
                    setTimeout(() => {
                        try {
                            requestAnimationFrame(window.mods.globe._animate);
                        } catch(e) {
                            // We probably got caught in a theme change. Print it out but everything should keep running fine.
                            console.warn(e);
                        }
                    }, 1000 / 30);
                }
            };
            this.globe.init(window.theme.colors.light_black, () => {
                this._animate();
                window.audioManager.scan.play();
            });

            // resize handler
            this.resizeHandler = () => {
                let canvas = document.querySelector("div#mod_globe canvas");
                window.mods.globe.globe.camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
                window.mods.globe.globe.camera.updateProjectionMatrix();
                window.mods.globe.globe.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
            };
            window.addEventListener("resize", this.resizeHandler);

            // Connections
            this.conns = [];
            this.addConn = async ip => {
                try {
                    // 使用后端API查询IP地理位置
                    const geoResult = await window.go.main.App.GetIPGeoLocation(ip);
                    if (geoResult.found && geoResult.location) {
                        const lat = Number(geoResult.location.latitude);
                        const lon = Number(geoResult.location.longitude);
                        window.mods.globe.conns.push({
                            ip,
                            pin: window.mods.globe.globe.addPin(lat, lon, "", 1.2),
                        });
                    }
                } catch (error) {
                    console.error(`查询IP ${ip} 地理位置失败:`, error);
                }
            };
            this.removeConn = ip => {
                let index = this.conns.findIndex(x => x.ip === ip);
                this.conns[index].pin.remove();
                this.conns.splice(index, 1);
            };

            // Add random satellites
            let constellation = [];
            for(var i = 0; i< 2; i++){
                for(var j = 0; j< 3; j++){
                    constellation.push({
                        lat: 50 * i - 30 + 15 * Math.random(),
                        lon: 120 * j - 120 + 30 * i,
                        altitude: Math.random() * (1.7 - 1.3) + 1.3
                    });
                }
            }

            this.globe.addConstellation(constellation);
        }, 2000);

        // Init updaters when intro animation is done
        setTimeout(() => {
            this.updateLoc();
            this.locUpdater = setInterval(() => {
                this.updateLoc();
            }, 10000);

            this.updateConns();
            this.connsUpdater = setInterval(() => {
                this.updateConns();
            }, 10000);
        }, 4000);
    }

    addRandomConnectedMarkers() {
        const randomLat = this.getRandomInRange(40, 90, 3);
        const randomLong = this.getRandomInRange(-180, 0, 3);
        this.globe.addMarker(randomLat, randomLong, '');
        this.globe.addMarker(randomLat - 20, randomLong + 150, '', true);
    }
    addTemporaryConnectedMarker(ip) {
        let data = window.mods.netstat.geoLookup.get(ip);
        let geo = (data !== null ? data.location : {});
        if (geo.latitude && geo.longitude) {
            const lat = Number(geo.latitude);
            const lon = Number(geo.longitude);

            window.mods.globe.conns.push({
                ip,
                pin: window.mods.globe.globe.addPin(lat, lon, "", 1.2)
            });
            let mark = window.mods.globe.globe.addMarker(lat, lon, '', true);
            setTimeout(() => {
                mark.remove();
            }, 3000);
        }
    }
    removeMarkers() {
        this.globe.markers.forEach(marker => { marker.remove(); });
        this.globe.markers = [];
    }
    removePins() {
        this.globe.pins.forEach(pin => {
            pin.remove();
        });
        this.globe.pins = [];
    }
    getRandomInRange(from, to, fixed) {
        return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
    }
    updateLoc() {
        if (window.mods.netstat.offline) {
            document.querySelector("div#mod_globe").setAttribute("class", "offline");
            document.querySelector("i.mod_globe_headerInfo").innerText = "(OFFLINE)";

            this.removePins();
            this.removeMarkers();
            this.conns = [];
            this.lastgeo = {
                latitude: 0,
                longitude: 0
            };
        } else {
            this.updateConOnlineConnection().then(() => {
                document.querySelector("div#mod_globe").setAttribute("class", "");
            }).catch(() => {
                document.querySelector("i.mod_globe_headerInfo").innerText = "UNKNOWN";
            })
        }
    }
    async updateConOnlineConnection() {
        try {
            // 使用后端API获取外部IP的地理位置信息
            const geoInfo = await window.go.main.App.GetExternalIPWithGeo();
            
            if (geoInfo.status === "success" && geoInfo.location) {
                let newgeo = {
                    latitude: geoInfo.location.latitude,
                    longitude: geoInfo.location.longitude,
                    country: geoInfo.location.country,
                    city: geoInfo.location.city,
                    region: geoInfo.location.region
                };
                
                
                // 四舍五入到4位小数
                newgeo.latitude = Math.round(newgeo.latitude * 10000) / 10000;
                newgeo.longitude = Math.round(newgeo.longitude * 10000) / 10000;

                if (newgeo.latitude !== this.lastgeo.latitude || newgeo.longitude !== this.lastgeo.longitude) {
                    // 更新显示信息
                    const locationText = `${newgeo.latitude}, ${newgeo.longitude}`;
                    if (newgeo.city && newgeo.country) {
                        document.querySelector("i.mod_globe_headerInfo").innerText = `${locationText} (${newgeo.city}, ${newgeo.country})`;
                    } else {
                        document.querySelector("i.mod_globe_headerInfo").innerText = locationText;
                    }
                    
                    this.removePins();
                    this.removeMarkers();
                    this.conns = [];

                    // 添加当前位置的标记
                    this._locPin = this.globe.addPin(newgeo.latitude, newgeo.longitude, "", 1.2);
                    this._locMarker = this.globe.addMarker(newgeo.latitude, newgeo.longitude, "", false, 1.2);
                }

                this.lastgeo = newgeo;
                document.querySelector("div#mod_globe").setAttribute("class", "");
            } else {
                console.warn("无法获取地理位置信息:", geoInfo.message);
                document.querySelector("i.mod_globe_headerInfo").innerText = "UNKNOWN";
            }
        } catch (error) {
            console.error("获取地理位置信息失败:", error);
            document.querySelector("i.mod_globe_headerInfo").innerText = "ERROR";
        }
    }
    updateConns() {
        if (!window.mods.globe.globe || window.mods.netstat.offline) return false;
        
        // 使用 Wails 后端 API 获取网络连接信息
        window.go.main.App.GetNetworkConnections().then(async conns => {
            let newconns = [];
            conns.forEach(conn => {
                let ip = conn.peeraddress;
                let state = conn.state;
                if (state === "ESTABLISHED" && ip !== "0.0.0.0" && ip !== "127.0.0.1" && ip !== "::") {
                    newconns.push(ip);
                }
            });

            // 移除不再存在的连接
            this.conns.forEach(conn => {
                if (newconns.indexOf(conn.ip) !== -1) {
                    newconns.splice(newconns.indexOf(conn.ip), 1);
                } else {
                    this.removeConn(conn.ip);
                }
            });

            // 添加新连接（限制并发查询数量）
            const maxConcurrent = 3;
            const chunks = this.chunkArray(newconns, maxConcurrent);
            
            for (const chunk of chunks) {
                const promises = chunk.map(ip => this.addConn(ip));
                await Promise.allSettled(promises);
                
                // 在批次之间稍作延迟，避免过于频繁的API调用
                if (chunks.indexOf(chunk) < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }).catch(error => {
            console.error('Failed to get network connections:', error);
        });
    }
    
    // 将数组分块
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
}

// 在 Wails 中，我们直接暴露到全局作用域，而不是使用 module.exports
window.LocationGlobe = LocationGlobe;
