export namespace main {
	
	export class ThemeGlobe {
	    base: string;
	    marker: string;
	    pin: string;
	    satellite: string;
	
	    static createFrom(source: any = {}) {
	        return new ThemeGlobe(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.base = source["base"];
	        this.marker = source["marker"];
	        this.pin = source["pin"];
	        this.satellite = source["satellite"];
	    }
	}
	export class ThemeTerminal {
	    fontFamily: string;
	    cursorStyle: string;
	    foreground: string;
	    background: string;
	    cursor: string;
	    cursorAccent: string;
	    selection: string;
	
	    static createFrom(source: any = {}) {
	        return new ThemeTerminal(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.fontFamily = source["fontFamily"];
	        this.cursorStyle = source["cursorStyle"];
	        this.foreground = source["foreground"];
	        this.background = source["background"];
	        this.cursor = source["cursor"];
	        this.cursorAccent = source["cursorAccent"];
	        this.selection = source["selection"];
	    }
	}
	export class ThemeColors {
	    r: number;
	    g: number;
	    b: number;
	    black: string;
	    light_black: string;
	    grey: string;
	    red: string;
	    yellow: string;
	
	    static createFrom(source: any = {}) {
	        return new ThemeColors(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.r = source["r"];
	        this.g = source["g"];
	        this.b = source["b"];
	        this.black = source["black"];
	        this.light_black = source["light_black"];
	        this.grey = source["grey"];
	        this.red = source["red"];
	        this.yellow = source["yellow"];
	    }
	}
	export class ThemeCSSVars {
	    font_main: string;
	    font_main_light: string;
	
	    static createFrom(source: any = {}) {
	        return new ThemeCSSVars(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.font_main = source["font_main"];
	        this.font_main_light = source["font_main_light"];
	    }
	}
	export class Theme {
	    cssvars: ThemeCSSVars;
	    colors: ThemeColors;
	    terminal: ThemeTerminal;
	    globe: ThemeGlobe;
	    injectCSS: string;
	
	    static createFrom(source: any = {}) {
	        return new Theme(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cssvars = this.convertValues(source["cssvars"], ThemeCSSVars);
	        this.colors = this.convertValues(source["colors"], ThemeColors);
	        this.terminal = this.convertValues(source["terminal"], ThemeTerminal);
	        this.globe = this.convertValues(source["globe"], ThemeGlobe);
	        this.injectCSS = source["injectCSS"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	

}

export namespace models {
	
	export class BatteryInfo {
	    hasBattery: boolean;
	    isCharging: boolean;
	    acConnected: boolean;
	    percent: number;
	
	    static createFrom(source: any = {}) {
	        return new BatteryInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hasBattery = source["hasBattery"];
	        this.isCharging = source["isCharging"];
	        this.acConnected = source["acConnected"];
	        this.percent = source["percent"];
	    }
	}
	export class BlockDevice {
	    name: string;
	    type: string;
	    path: string;
	    label: string;
	    removable: boolean;
	
	    static createFrom(source: any = {}) {
	        return new BlockDevice(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	        this.path = source["path"];
	        this.label = source["label"];
	        this.removable = source["removable"];
	    }
	}
	export class CPUInfo {
	    manufacturer: string;
	    brand: string;
	    cores: number;
	    speed: number;
	    speedMax: number;
	
	    static createFrom(source: any = {}) {
	        return new CPUInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.manufacturer = source["manufacturer"];
	        this.brand = source["brand"];
	        this.cores = source["cores"];
	        this.speed = source["speed"];
	        this.speedMax = source["speedMax"];
	    }
	}
	export class CPUUsage {
	    load: number;
	
	    static createFrom(source: any = {}) {
	        return new CPUUsage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.load = source["load"];
	    }
	}
	export class CPULoad {
	    cpus: CPUUsage[];
	
	    static createFrom(source: any = {}) {
	        return new CPULoad(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cpus = this.convertValues(source["cpus"], CPUUsage);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CPUSpeed {
	    speed: number;
	    speedMax: number;
	
	    static createFrom(source: any = {}) {
	        return new CPUSpeed(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.speed = source["speed"];
	        this.speedMax = source["speedMax"];
	    }
	}
	export class CPUTemperature {
	    max: number;
	
	    static createFrom(source: any = {}) {
	        return new CPUTemperature(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.max = source["max"];
	    }
	}
	
	export class FileInfo {
	    name: string;
	    path: string;
	    isDirectory: boolean;
	    isFile: boolean;
	    isSymbolicLink: boolean;
	    size: number;
	    lastAccessed: number;
	    mimeType: string;
	    isText: boolean;
	
	    static createFrom(source: any = {}) {
	        return new FileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.isDirectory = source["isDirectory"];
	        this.isFile = source["isFile"];
	        this.isSymbolicLink = source["isSymbolicLink"];
	        this.size = source["size"];
	        this.lastAccessed = source["lastAccessed"];
	        this.mimeType = source["mimeType"];
	        this.isText = source["isText"];
	    }
	}
	export class DirectoryData {
	    files: FileInfo[];
	
	    static createFrom(source: any = {}) {
	        return new DirectoryData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.files = this.convertValues(source["files"], FileInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DiskUsage {
	    mount: string;
	    use: number;
	    size: number;
	    used: number;
	
	    static createFrom(source: any = {}) {
	        return new DiskUsage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mount = source["mount"];
	        this.use = source["use"];
	        this.size = source["size"];
	        this.used = source["used"];
	    }
	}
	export class ExternalIP {
	    ip: string;
	
	    static createFrom(source: any = {}) {
	        return new ExternalIP(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ip = source["ip"];
	    }
	}
	export class FileData {
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new FileData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.content = source["content"];
	    }
	}
	
	export class GeoLocation {
	    latitude: number;
	    longitude: number;
	    country: string;
	    region: string;
	    city: string;
	    timezone: string;
	    isp: string;
	    org: string;
	    as: string;
	    query: string;
	
	    static createFrom(source: any = {}) {
	        return new GeoLocation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.latitude = source["latitude"];
	        this.longitude = source["longitude"];
	        this.country = source["country"];
	        this.region = source["region"];
	        this.city = source["city"];
	        this.timezone = source["timezone"];
	        this.isp = source["isp"];
	        this.org = source["org"];
	        this.as = source["as"];
	        this.query = source["query"];
	    }
	}
	export class GeoLookupResult {
	    ip: string;
	    location?: GeoLocation;
	    found: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new GeoLookupResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ip = source["ip"];
	        this.location = this.convertValues(source["location"], GeoLocation);
	        this.found = source["found"];
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HardwareInfo {
	    manufacturer: string;
	    model: string;
	    chassisType: string;
	
	    static createFrom(source: any = {}) {
	        return new HardwareInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.manufacturer = source["manufacturer"];
	        this.model = source["model"];
	        this.chassisType = source["chassisType"];
	    }
	}
	export class IPGeoInfo {
	    ip: string;
	    location?: GeoLocation;
	    status: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new IPGeoInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ip = source["ip"];
	        this.location = this.convertValues(source["location"], GeoLocation);
	        this.status = source["status"];
	        this.message = source["message"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MediaData {
	    data: string;
	    mimeType: string;
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new MediaData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = source["data"];
	        this.mimeType = source["mimeType"];
	        this.url = source["url"];
	    }
	}
	export class MemoryInfo {
	    total: number;
	    free: number;
	    used: number;
	    active: number;
	    available: number;
	    swaptotal: number;
	    swapused: number;
	
	    static createFrom(source: any = {}) {
	        return new MemoryInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total = source["total"];
	        this.free = source["free"];
	        this.used = source["used"];
	        this.active = source["active"];
	        this.available = source["available"];
	        this.swaptotal = source["swaptotal"];
	        this.swapused = source["swapused"];
	    }
	}
	export class NetworkConnection {
	    peeraddress: string;
	    state: string;
	
	    static createFrom(source: any = {}) {
	        return new NetworkConnection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.peeraddress = source["peeraddress"];
	        this.state = source["state"];
	    }
	}
	export class NetworkInterface {
	    iface: string;
	    operstate: string;
	    internal: boolean;
	    ip4: string;
	    mac: string;
	
	    static createFrom(source: any = {}) {
	        return new NetworkInterface(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.iface = source["iface"];
	        this.operstate = source["operstate"];
	        this.internal = source["internal"];
	        this.ip4 = source["ip4"];
	        this.mac = source["mac"];
	    }
	}
	export class NetworkInfo {
	    interfaces: NetworkInterface[];
	
	    static createFrom(source: any = {}) {
	        return new NetworkInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.interfaces = this.convertValues(source["interfaces"], NetworkInterface);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class NetworkStats {
	    tx_sec: number;
	    rx_sec: number;
	    tx_bytes: number;
	    rx_bytes: number;
	
	    static createFrom(source: any = {}) {
	        return new NetworkStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tx_sec = source["tx_sec"];
	        this.rx_sec = source["rx_sec"];
	        this.tx_bytes = source["tx_bytes"];
	        this.rx_bytes = source["rx_bytes"];
	    }
	}
	export class PingResult {
	    time: number;
	    success: boolean;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new PingResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.time = source["time"];
	        this.success = source["success"];
	        this.error = source["error"];
	    }
	}
	export class ProcessCount {
	    count: number;
	    Username: string;
	    Monitor: number;
	    NoIntro: boolean;
	    NoCursor: boolean;
	    Iface: string;
	    KeepGeometry: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ProcessCount(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.count = source["count"];
	        this.Username = source["Username"];
	        this.Monitor = source["Monitor"];
	        this.NoIntro = source["NoIntro"];
	        this.NoCursor = source["NoCursor"];
	        this.Iface = source["Iface"];
	        this.KeepGeometry = source["KeepGeometry"];
	    }
	}
	export class ProcessInfo {
	    pid: number;
	    name: string;
	    user: string;
	    cpu: number;
	    mem: number;
	    state: string;
	    started: string;
	
	    static createFrom(source: any = {}) {
	        return new ProcessInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pid = source["pid"];
	        this.name = source["name"];
	        this.user = source["user"];
	        this.cpu = source["cpu"];
	        this.mem = source["mem"];
	        this.state = source["state"];
	        this.started = source["started"];
	    }
	}
	export class ProcessList {
	    list: ProcessInfo[];
	
	    static createFrom(source: any = {}) {
	        return new ProcessList(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.list = this.convertValues(source["list"], ProcessInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SearchResult {
	    name: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new SearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	    }
	}
	export class Settings {
	    shell: string;
	    shellArgs: string;
	    cwd: string;
	    keyboard: string;
	    theme: string;
	    termFontSize: number;
	    audio: boolean;
	    audioVolume: number;
	    disableFeedbackAudio: boolean;
	    clockHours: number;
	    pingAddr: string;
	    port: number;
	    nointro: boolean;
	    nocursor: boolean;
	    forceFullscreen: boolean;
	    allowWindowed: boolean;
	    excludeThreadsFromToplist: boolean;
	    hideDotfiles: boolean;
	    fsListView: boolean;
	    experimentalGlobeFeatures: boolean;
	    experimentalFeatures: boolean;
	    disableAutoUpdate: boolean;
	    Env: string;
	    Username: string;
	    Monitor: number;
	    NoIntro: boolean;
	    NoCursor: boolean;
	    Iface: string;
	    KeepGeometry: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.shell = source["shell"];
	        this.shellArgs = source["shellArgs"];
	        this.cwd = source["cwd"];
	        this.keyboard = source["keyboard"];
	        this.theme = source["theme"];
	        this.termFontSize = source["termFontSize"];
	        this.audio = source["audio"];
	        this.audioVolume = source["audioVolume"];
	        this.disableFeedbackAudio = source["disableFeedbackAudio"];
	        this.clockHours = source["clockHours"];
	        this.pingAddr = source["pingAddr"];
	        this.port = source["port"];
	        this.nointro = source["nointro"];
	        this.nocursor = source["nocursor"];
	        this.forceFullscreen = source["forceFullscreen"];
	        this.allowWindowed = source["allowWindowed"];
	        this.excludeThreadsFromToplist = source["excludeThreadsFromToplist"];
	        this.hideDotfiles = source["hideDotfiles"];
	        this.fsListView = source["fsListView"];
	        this.experimentalGlobeFeatures = source["experimentalGlobeFeatures"];
	        this.experimentalFeatures = source["experimentalFeatures"];
	        this.disableAutoUpdate = source["disableAutoUpdate"];
	        this.Env = source["Env"];
	        this.Username = source["Username"];
	        this.Monitor = source["Monitor"];
	        this.NoIntro = source["NoIntro"];
	        this.NoCursor = source["NoCursor"];
	        this.Iface = source["Iface"];
	        this.KeepGeometry = source["KeepGeometry"];
	    }
	}
	export class Shortcut {
	    type: string;
	    trigger: string;
	    action: string;
	    enabled: boolean;
	    linebreak?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Shortcut(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.trigger = source["trigger"];
	        this.action = source["action"];
	        this.enabled = source["enabled"];
	        this.linebreak = source["linebreak"];
	    }
	}
	export class SystemInfo {
	    os: string;
	
	    static createFrom(source: any = {}) {
	        return new SystemInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.os = source["os"];
	    }
	}
	export class UpdateInfo {
	    isLatest: boolean;
	    isDevelopment: boolean;
	    latestVersion: string;
	    downloadURL: string;
	    releaseNotes?: string;
	    // Go type: time
	    publishedAt?: any;
	    // Go type: time
	    checkTime?: any;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.isLatest = source["isLatest"];
	        this.isDevelopment = source["isDevelopment"];
	        this.latestVersion = source["latestVersion"];
	        this.downloadURL = source["downloadURL"];
	        this.releaseNotes = source["releaseNotes"];
	        this.publishedAt = this.convertValues(source["publishedAt"], null);
	        this.checkTime = this.convertValues(source["checkTime"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

