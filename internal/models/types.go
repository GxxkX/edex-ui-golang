package models

import "time"

// Settings 配置结构体
type Settings struct {
	Shell                     string  `json:"shell"`
	ShellArgs                 string  `json:"shellArgs"`
	Cwd                       string  `json:"cwd"`
	Keyboard                  string  `json:"keyboard"`
	Theme                     string  `json:"theme"`
	TermFontSize              int     `json:"termFontSize"`
	Audio                     bool    `json:"audio"`
	AudioVolume               float64 `json:"audioVolume"`
	DisableFeedbackAudio      bool    `json:"disableFeedbackAudio"`
	ClockHours                int     `json:"clockHours"`
	PingAddr                  string  `json:"pingAddr"`
	Port                      int     `json:"port"`
	Nointro                   bool    `json:"nointro"`
	Nocursor                  bool    `json:"nocursor"`
	ForceFullscreen           bool    `json:"forceFullscreen"`
	AllowWindowed             bool    `json:"allowWindowed"`
	ExcludeThreadsFromToplist bool    `json:"excludeThreadsFromToplist"`
	HideDotfiles              bool    `json:"hideDotfiles"`
	FsListView                bool    `json:"fsListView"`
	ExperimentalGlobeFeatures bool    `json:"experimentalGlobeFeatures"`
	ExperimentalFeatures      bool    `json:"experimentalFeatures"`
	DisableAutoUpdate         bool    `json:"disableAutoUpdate"`
	Env                       string
	Username                  string
	Monitor                   int
	NoIntro                   bool
	NoCursor                  bool
	Iface                     string
	KeepGeometry              bool
}

// SystemInfo 系统信息结构体
type SystemInfo struct {
	OS string `json:"os"`
}

// BatteryInfo 电池信息结构体
type BatteryInfo struct {
	HasBattery  bool    `json:"hasBattery"`
	IsCharging  bool    `json:"isCharging"`
	ACConnected bool    `json:"acConnected"`
	Percent     float64 `json:"percent"`
}

// HardwareInfo 硬件信息结构体
type HardwareInfo struct {
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`
	ChassisType  string `json:"chassisType"`
}

// CPUInfo CPU 信息结构体
type CPUInfo struct {
	Manufacturer string  `json:"manufacturer"`
	Brand        string  `json:"brand"`
	Cores        int     `json:"cores"`
	Speed        float64 `json:"speed"`
	SpeedMax     float64 `json:"speedMax"`
}

// CPULoad CPU 负载信息结构体
type CPULoad struct {
	CPUs []CPUUsage `json:"cpus"`
}

// CPUUsage 单个 CPU 核心使用率
type CPUUsage struct {
	Load float64 `json:"load"`
}

// CPUTemperature CPU 温度信息结构体
type CPUTemperature struct {
	Max float64 `json:"max"`
}

// CPUSpeed CPU 速度信息结构体
type CPUSpeed struct {
	Speed    float64 `json:"speed"`
	SpeedMax float64 `json:"speedMax"`
}

// ProcessCount 进程数量信息结构体
type ProcessCount struct {
	Count        int `json:"count"`
	Username     string
	Monitor      int
	NoIntro      bool
	NoCursor     bool
	Iface        string
	KeepGeometry bool
}

// Shortcut 快捷键结构体
type Shortcut struct {
	Type      string `json:"type"`
	Trigger   string `json:"trigger"`
	Action    string `json:"action"`
	Enabled   bool   `json:"enabled"`
	Linebreak bool   `json:"linebreak,omitempty"`
}

// WindowState 窗口状态结构体
type WindowState struct {
	UseFullscreen bool `json:"useFullscreen"`
}

// VersionHistory 版本历史结构体
type VersionHistory struct {
	FirstSeen int64 `json:"firstSeen"`
	LastSeen  int64 `json:"lastSeen"`
}

// Terminal 终端结构体
type Terminal struct {
	Role   string
	Shell  string
	Params string
	Cwd    string
	Env    map[string]string
	Port   int
}

// MemoryInfo 内存信息结构体
type MemoryInfo struct {
	Total     uint64 `json:"total"`
	Free      uint64 `json:"free"`
	Used      uint64 `json:"used"`
	Active    uint64 `json:"active"`
	Available uint64 `json:"available"`
	SwapTotal uint64 `json:"swaptotal"`
	SwapUsed  uint64 `json:"swapused"`
}

// ProcessInfo 进程信息结构体
type ProcessInfo struct {
	PID     int     `json:"pid"`
	Name    string  `json:"name"`
	User    string  `json:"user"`
	CPU     float64 `json:"cpu"`
	Mem     float64 `json:"mem"`
	State   string  `json:"state"`
	Started string  `json:"started"`
}

// ProcessList 进程列表结构体
type ProcessList struct {
	List []ProcessInfo `json:"list"`
}

// NetworkInterface 网络接口信息结构体
type NetworkInterface struct {
	Iface     string `json:"iface"`
	OperState string `json:"operstate"`
	Internal  bool   `json:"internal"`
	IP4       string `json:"ip4"`
	MAC       string `json:"mac"`
}

// NetworkInfo 网络信息结构体
type NetworkInfo struct {
	Interfaces []NetworkInterface `json:"interfaces"`
}

// ExternalIP 外部 IP 信息结构体
type ExternalIP struct {
	IP string `json:"ip"`
}

// PingResult ping 结果结构体
type PingResult struct {
	Time    float64 `json:"time"`
	Success bool    `json:"success"`
	Error   string  `json:"error"`
}

// NetworkConnection 网络连接信息结构体
type NetworkConnection struct {
	PeerAddress string `json:"peeraddress"`
	State       string `json:"state"`
}

// NetworkConnections 网络连接列表结构体
type NetworkConnections struct {
	Connections []NetworkConnection `json:"connections"`
}

// NetworkStats 网络统计信息结构体
type NetworkStats struct {
	TxSec   float64 `json:"tx_sec"`
	RxSec   float64 `json:"rx_sec"`
	TxBytes uint64  `json:"tx_bytes"`
	RxBytes uint64  `json:"rx_bytes"`
}

// NetworkStatsList 网络统计信息列表结构体
type NetworkStatsList struct {
	Stats []NetworkStats `json:"stats"`
}

// ThemeInfo 主题信息结构体
type ThemeInfo struct {
	CSSVars struct {
		FontMain      string `json:"font_main"`
		FontMainLight string `json:"font_main_light"`
	} `json:"cssvars"`
	Terminal struct {
		FontFamily        string   `json:"fontFamily"`
		CursorBlink       bool     `json:"cursorBlink"`
		CursorStyle       string   `json:"cursorStyle"`
		AllowTransparency bool     `json:"allowTransparency"`
		FontSize          int      `json:"fontSize"`
		FontWeight        string   `json:"fontWeight"`
		FontWeightBold    string   `json:"fontWeightBold"`
		LetterSpacing     int      `json:"letterSpacing"`
		LineHeight        int      `json:"lineHeight"`
		Foreground        string   `json:"foreground"`
		Background        string   `json:"background"`
		Cursor            string   `json:"cursor"`
		CursorAccent      string   `json:"cursorAccent"`
		Selection         string   `json:"selection"`
		ColorFilter       []string `json:"colorFilter"`
	} `json:"terminal"`
	Colors struct {
		R             int    `json:"r"`
		G             int    `json:"g"`
		B             int    `json:"b"`
		Black         string `json:"black"`
		LightBlack    string `json:"light_black"`
		Grey          string `json:"grey"`
		Red           string `json:"red"`
		Yellow        string `json:"yellow"`
		Green         string `json:"green"`
		Blue          string `json:"blue"`
		Magenta       string `json:"magenta"`
		Cyan          string `json:"cyan"`
		White         string `json:"white"`
		BrightBlack   string `json:"brightBlack"`
		BrightRed     string `json:"brightRed"`
		BrightGreen   string `json:"brightGreen"`
		BrightYellow  string `json:"brightYellow"`
		BrightBlue    string `json:"brightBlue"`
		BrightMagenta string `json:"brightMagenta"`
		BrightCyan    string `json:"brightCyan"`
		BrightWhite   string `json:"brightWhite"`
	} `json:"colors"`
	Globe struct {
		Base      string `json:"base"`
		Marker    string `json:"marker"`
		Pin       string `json:"pin"`
		Satellite string `json:"satellite"`
	} `json:"globe"`
	InjectCSS string `json:"injectCSS"`
}

// 文件系统相关结构体

// DirectoryData 目录数据结构体
type DirectoryData struct {
	Files []FileInfo `json:"files"`
}

// FileInfo 文件信息结构体
type FileInfo struct {
	Name           string `json:"name"`
	Path           string `json:"path"`
	IsDirectory    bool   `json:"isDirectory"`
	IsFile         bool   `json:"isFile"`
	IsSymbolicLink bool   `json:"isSymbolicLink"`
	Size           int64  `json:"size"`
	LastAccessed   int64  `json:"lastAccessed"`
	MimeType       string `json:"mimeType"`
	IsText         bool   `json:"isText"`
}

// FileData 文件数据结构体
type FileData struct {
	Content string `json:"content"`
}

// BlockDevice 块设备信息结构体
type BlockDevice struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	Path      string `json:"path"`
	Label     string `json:"label"`
	Removable bool   `json:"removable"`
}

// DiskUsage 磁盘使用情况结构体
type DiskUsage struct {
	Mount string  `json:"mount"`
	Use   float64 `json:"use"`
	Size  uint64  `json:"size"`
	Used  uint64  `json:"used"`
}

// 媒体文件相关结构体

// MediaData 媒体数据结构体
type MediaData struct {
	Data     string `json:"data"`     // base64 编码的数据
	MimeType string `json:"mimeType"` // MIME 类型
	URL      string `json:"url"`      // 文件 URL（如果适用）
}

// 更新检查相关结构体

// UpdateInfo 更新信息结构体
type UpdateInfo struct {
	IsLatest      bool      `json:"isLatest"`
	IsDevelopment bool      `json:"isDevelopment"`
	LatestVersion string    `json:"latestVersion"`
	DownloadURL   string    `json:"downloadURL"`
	ReleaseNotes  string    `json:"releaseNotes,omitempty"`
	PublishedAt   time.Time `json:"publishedAt,omitempty"`
	CheckTime     time.Time `json:"checkTime,omitempty"`
}

// UpdateSettings 更新设置结构体
type UpdateSettings struct {
	AutoCheck      bool `json:"autoCheck"`
	CheckInterval  int  `json:"checkInterval"`  // 检查间隔（小时）
	NotifyOnUpdate bool `json:"notifyOnUpdate"` // 有更新时是否通知
}

// 模糊搜索相关结构体

// SearchResult 搜索结果结构体
type SearchResult struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// 地理位置相关结构体

// GeoLocation 地理位置信息结构体
type GeoLocation struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Country   string  `json:"country"`
	Region    string  `json:"region"`
	City      string  `json:"city"`
	Timezone  string  `json:"timezone"`
	ISP       string  `json:"isp"`
	Org       string  `json:"org"`
	AS        string  `json:"as"`
	Query     string  `json:"query"`
}

// IPGeoInfo IP地理位置信息结构体
type IPGeoInfo struct {
	IP       string       `json:"ip"`
	Location *GeoLocation `json:"location"`
	Status   string       `json:"status"`
	Message  string       `json:"message"`
}

// GeoLookupResult 地理位置查询结果结构体
type GeoLookupResult struct {
	IP       string       `json:"ip"`
	Location *GeoLocation `json:"location"`
	Found    bool         `json:"found"`
	Error    string       `json:"error,omitempty"`
}

// GlobeData 地球仪数据结构体
type GlobeData struct {
	Tiles []GlobeTile `json:"tiles"`
}

// GlobeTile 地球仪瓦片结构体
type GlobeTile struct {
	X    int    `json:"x"`
	Y    int    `json:"y"`
	Data string `json:"data"`
}
