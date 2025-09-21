package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"edex-ui-golang/internal/models"
	"edex-ui-golang/internal/network"
	"edex-ui-golang/internal/settings"
	"edex-ui-golang/internal/system"
	"edex-ui-golang/internal/terminal"
	"github.com/lxn/walk"
)

// App struct
type App struct {
	ctx            context.Context
	settingsMgr    *settings.Manager
	terminalMgr    *terminal.Manager
	systemProvider *system.InfoProvider
	networkMgr     *network.Manager
	mu             sync.RWMutex
}

var r *Boot

// NewApp creates a new App application struct
func NewApp() *App {
	// startup is called when the app starts. The context is saved
	// so we can call the runtime methods
	return &App{}
}

func (a *App) startup(ctx context.Context) {

	a.ctx = ctx

	log.Println("启动 eDEX-UI")
	log.Printf("使用 Go %s 和 Wails", runtime.Version())

	// 检查单实例
	if !a.requestSingleInstanceLock() {
		log.Println("检测到另一个 eDEX 实例正在运行")
		a.showErrorDialog("单实例错误", "另一个 eDEX 实例已经在运行。\n\n请关闭现有实例后再启动新实例。")
		os.Exit(1)
	}

	// 初始化设置管理器
	a.settingsMgr = settings.NewManager()
	if err := a.settingsMgr.LoadSettings(); err != nil {
		log.Printf("加载设置失败: %v", err)
		a.showErrorDialog("设置加载错误", fmt.Sprintf("无法加载应用设置：\n\n%v\n\n应用将使用默认设置继续运行。", err))
	}

	// 创建必要的目录和文件
	if err := a.settingsMgr.SetupDirectories(); err != nil {
		log.Printf("设置目录失败: %v", err)
		a.showErrorDialog("目录设置错误", fmt.Sprintf("无法创建必要的目录：\n\n%v\n\n应用可能无法正常工作。", err))
		return
	}

	// 创建默认快捷键和窗口状态文件
	if err := a.settingsMgr.CreateDefaultShortcuts(); err != nil {
		log.Printf("创建默认快捷键失败: %v", err)
		a.showErrorDialog("快捷键设置错误", fmt.Sprintf("无法创建默认快捷键：\n\n%v\n\n应用将使用内置快捷键。", err))
	}
	if err := a.settingsMgr.CreateDefaultWindowState(); err != nil {
		log.Printf("创建默认窗口状态失败: %v", err)
		a.showErrorDialog("窗口状态设置错误", fmt.Sprintf("无法创建默认窗口状态：\n\n%v\n\n应用将使用默认窗口设置。", err))
	}

	// 复制默认资源
	if err := a.settingsMgr.CopyDefaultAssets(); err != nil {
		log.Printf("复制默认资源失败: %v", err)
		a.showErrorDialog("资源复制错误", fmt.Sprintf("无法复制默认资源：\n\n%v\n\n应用可能无法正常显示。", err))
		return
	}

	// 记录版本历史
	if err := a.settingsMgr.UpdateVersionHistory(); err != nil {
		log.Printf("更新版本历史失败: %v", err)
		a.showErrorDialog("版本历史更新错误", fmt.Sprintf("无法更新版本历史：\n\n%v\n\n这不会影响应用功能。", err))
	}

	// 初始化终端管理器
	a.terminalMgr = terminal.NewManager(a.settingsMgr.GetSettings())
	if err := a.terminalMgr.InitializeTerminal(); err != nil {
		log.Printf("初始化终端失败: %v", err)
		a.showErrorDialog("终端初始化错误", fmt.Sprintf("无法初始化终端：\n\n%v\n\n终端功能可能无法使用。", err))
		return
	}

	// 初始化系统信息提供者
	a.systemProvider = system.NewInfoProvider()

	// 初始化网络管理器
	a.networkMgr = network.NewManager()

	r = NewBoot()
	r.loadConfig()
	r.loadTheme(a.settingsMgr.GetSettings().Theme)

	log.Println("应用启动完成")
}

// cleanupSingleInstanceLock 清理单实例锁文件
func (a *App) cleanupSingleInstanceLock() {

	lockFile := filepath.Join(os.TempDir(), "edex-ui-golang.lock")
	err := os.Remove(lockFile)
	if err != nil {
		log.Printf("清理锁文件失败: %v", err)
	} else {
		log.Println("已清理单实例锁文件")
	}
}

// requestSingleInstanceLock 请求单实例锁定
func (a *App) requestSingleInstanceLock() bool {
	// 创建锁文件路径

	lockFile := filepath.Join(os.TempDir(), "edex-ui-golang.lock")

	// 尝试创建锁文件
	file, err := os.OpenFile(lockFile, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0600)
	if err != nil {
		if os.IsExist(err) {
			// 锁文件已存在，检查进程是否还在运行
			return a.checkExistingProcess(lockFile)
		}
		log.Printf("创建锁文件失败: %v", err)
		return false
	}
	defer file.Close()

	// 写入当前进程ID和启动时间
	pid := os.Getpid()
	startTime := time.Now().Unix()
	lockData := fmt.Sprintf("%d\n%d\n", pid, startTime)
	_, err = file.WriteString(lockData)
	if err != nil {
		log.Printf("写入锁数据失败: %v", err)
		return false
	}

	// 同步文件到磁盘
	err = file.Sync()
	if err != nil {
		log.Printf("同步锁文件失败: %v", err)
		return false
	}

	log.Printf("成功获取单实例锁，PID: %d", pid)
	return true
}

// checkExistingProcess 检查现有进程是否还在运行
func (a *App) checkExistingProcess(lockFile string) bool {
	// 读取锁文件中的进程ID和启动时间

	data, err := os.ReadFile(lockFile)
	if err != nil {
		log.Printf("读取锁文件失败: %v", err)
		return false
	}

	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	if len(lines) < 1 {
		log.Printf("锁文件格式错误")
		os.Remove(lockFile)
		return true
	}

	pidStr := lines[0]
	pid, err := strconv.Atoi(pidStr)
	if err != nil {
		log.Printf("解析进程ID失败: %v", err)
		os.Remove(lockFile)
		return true
	}

	// 检查进程是否存在
	process, err := os.FindProcess(pid)
	if err != nil {
		log.Printf("查找进程失败: %v", err)
		// 进程不存在，删除锁文件
		os.Remove(lockFile)
		return true
	}

	// 尝试向进程发送信号0来检查是否存活
	err = process.Signal(syscall.Signal(0))
	if err != nil {
		log.Printf("进程 %d 不存在: %v", pid, err)
		// 进程不存在，删除锁文件
		os.Remove(lockFile)
		return true
	}

	// 检查进程启动时间（如果锁文件中有的话）
	if len(lines) >= 2 {
		startTimeStr := lines[1]
		startTime, err := strconv.ParseInt(startTimeStr, 10, 64)
		if err == nil {
			// 如果进程启动时间超过24小时，可能是僵尸进程
			if time.Now().Unix()-startTime > 24*3600 {
				log.Printf("检测到可能的僵尸进程 (PID: %d, 启动时间: %d)", pid, startTime)
				os.Remove(lockFile)
				return true
			}
		}
	}

	log.Printf("检测到另一个 eDEX 实例正在运行 (PID: %d)", pid)
	return false
}

// showErrorDialog 显示错误对话框
func (a *App) showErrorDialog(title, message string) {
	// 使用 walk 库显示错误对话框

	walk.MsgBox(nil, title, message, walk.MsgBoxIconError)
}

// GetShortcuts 获取所有快捷键
func (a *App) GetShortcuts() ([]models.Shortcut, error) {
	return a.settingsMgr.GetShortcuts()
}

// UpdateShortcut 更新快捷键
func (a *App) UpdateShortcut(shortcut models.Shortcut) error {
	return a.settingsMgr.UpdateShortcut(shortcut)
}

// HandleShortcut 处理快捷键动作
func (a *App) HandleShortcut(action string) (string, error) {
	switch action {
	case "COPY":
		return "COPY", nil
	case "PASTE":
		return "PASTE", nil
	case "NEXT_TAB":
		return "NEXT_TAB", nil
	case "PREVIOUS_TAB":
		return "PREVIOUS_TAB", nil
	case "TAB_1":
		return "TAB_1", nil
	case "TAB_2":
		return "TAB_2", nil
	case "TAB_3":
		return "TAB_3", nil
	case "TAB_4":
		return "TAB_4", nil
	case "TAB_5":
		return "TAB_5", nil
	case "SETTINGS":
		return "SETTINGS", nil
	case "SHORTCUTS":
		return "SHORTCUTS", nil
	case "FUZZY_SEARCH":
		return "FUZZY_SEARCH", nil
	case "FS_LIST_VIEW":
		return "FS_LIST_VIEW", nil
	case "FS_DOTFILES":
		return "FS_DOTFILES", nil
	case "KB_PASSMODE":
		return "KB_PASSMODE", nil
	case "DEV_DEBUG":
		return "DEV_DEBUG", nil
	case "DEV_RELOAD":
		return "DEV_RELOAD", nil
	default:
		return "", fmt.Errorf("未知的快捷键动作: %s", action)
	}
}

// GetAvailableShortcuts 获取可用的快捷键定义
func (a *App) GetAvailableShortcuts() map[string]string {

	return map[string]string{
		"COPY":         "复制选中的终端缓冲区内容",
		"PASTE":        "将系统剪贴板内容粘贴到终端",
		"NEXT_TAB":     "切换到下一个终端标签页（从左到右）",
		"PREVIOUS_TAB": "切换到上一个终端标签页（从右到左）",
		"TAB_1":        "切换到终端标签页 1，如果不存在则创建",
		"TAB_2":        "切换到终端标签页 2，如果不存在则创建",
		"TAB_3":        "切换到终端标签页 3，如果不存在则创建",
		"TAB_4":        "切换到终端标签页 4，如果不存在则创建",
		"TAB_5":        "切换到终端标签页 5，如果不存在则创建",
		"SETTINGS":     "打开设置编辑器",
		"SHORTCUTS":    "显示可用的键盘快捷键列表",
		"FUZZY_SEARCH": "在当前工作目录中搜索文件",
		"FS_LIST_VIEW": "在文件浏览器中切换列表和网格视图",
		"FS_DOTFILES":  "在文件浏览器中切换隐藏文件显示",
		"KB_PASSMODE":  "切换屏幕键盘的密码模式",
		"DEV_DEBUG":    "打开开发者调试工具",
		"DEV_RELOAD":   "触发前端热重载",
	}
}

// GetSettingsData 获取设置数据
func (a *App) GetSettingsData() (map[string]interface{}, error) {

	sets := a.settingsMgr.GetSettings()

	// 获取可用的选项列表
	keyboards, err := a.getAvailableKeyboards()
	if err != nil {
		log.Printf("获取键盘布局失败: %v", err)
		keyboards = []string{"en-US", "zh-CN"}
	}

	themes, err := a.getAvailableThemes()
	if err != nil {
		log.Printf("获取主题列表失败: %v", err)
		themes = []string{"tron", "matrix", "cyborg", "nord"}
	}

	interfaces, err := a.getAvailableInterfaces()
	if err != nil {
		log.Printf("获取网络接口列表失败: %v", err)
		interfaces = []string{"eth0", "wlan0"}
	}

	return map[string]interface{}{
		"sets":       sets,
		"keyboards":  keyboards,
		"themes":     themes,
		"interfaces": interfaces,
	}, nil
}

// UpdateSettings 更新设置
func (a *App) UpdateSettings(settingsData map[string]interface{}) error {

	newSettings := &models.Settings{}

	// 从 map 中提取设置值
	if val, ok := settingsData["shell"].(string); ok {
		newSettings.Shell = val
	}
	if val, ok := settingsData["shellArgs"].(string); ok {
		newSettings.ShellArgs = val
	}
	if val, ok := settingsData["cwd"].(string); ok {
		newSettings.Cwd = val
	}
	if val, ok := settingsData["env"].(string); ok {
		newSettings.Env = val
	}
	if val, ok := settingsData["username"].(string); ok {
		newSettings.Username = val
	}
	if val, ok := settingsData["keyboard"].(string); ok {
		newSettings.Keyboard = val
	}
	if val, ok := settingsData["theme"].(string); ok {
		newSettings.Theme = val
	}
	if val, ok := settingsData["termFontSize"].(float64); ok {
		newSettings.TermFontSize = int(val)
	}
	if val, ok := settingsData["audio"].(bool); ok {
		newSettings.Audio = val
	}
	if val, ok := settingsData["audioVolume"].(float64); ok {
		newSettings.AudioVolume = val
	}
	if val, ok := settingsData["disableFeedbackAudio"].(bool); ok {
		newSettings.DisableFeedbackAudio = val
	}
	if val, ok := settingsData["port"].(float64); ok {
		newSettings.Port = int(val)
	}
	if val, ok := settingsData["pingAddr"].(string); ok {
		newSettings.PingAddr = val
	}
	if val, ok := settingsData["clockHours"].(float64); ok {
		newSettings.ClockHours = int(val)
	}
	if val, ok := settingsData["monitor"].(float64); ok {
		newSettings.Monitor = int(val)
	}
	if val, ok := settingsData["nointro"].(bool); ok {
		newSettings.Nointro = val
	}
	if val, ok := settingsData["nocursor"].(bool); ok {
		newSettings.Nocursor = val
	}
	if val, ok := settingsData["iface"].(string); ok {
		newSettings.Iface = val
	}
	if val, ok := settingsData["allowWindowed"].(bool); ok {
		newSettings.AllowWindowed = val
	}
	if val, ok := settingsData["keepGeometry"].(bool); ok {
		newSettings.KeepGeometry = val
	}
	if val, ok := settingsData["excludeThreadsFromToplist"].(bool); ok {
		newSettings.ExcludeThreadsFromToplist = val
	}
	if val, ok := settingsData["hideDotfiles"].(bool); ok {
		newSettings.HideDotfiles = val
	}
	if val, ok := settingsData["fsListView"].(bool); ok {
		newSettings.FsListView = val
	}
	if val, ok := settingsData["experimentalGlobeFeatures"].(bool); ok {
		newSettings.ExperimentalGlobeFeatures = val
	}
	if val, ok := settingsData["experimentalFeatures"].(bool); ok {
		newSettings.ExperimentalFeatures = val
	}

	// 保存设置
	return a.settingsMgr.SaveSettings(newSettings)
}

// getAvailableKeyboards 获取可用的键盘布局
func (a *App) getAvailableKeyboards() ([]string, error) {
	// 从文件系统读取可用的键盘布局文件

	keyboardDir := "build/bin/kb_layouts"
	entries, err := os.ReadDir(keyboardDir)
	if err != nil {
		return []string{"en-US", "zh-CN"}, nil
	}

	var keyboards []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if strings.HasSuffix(entry.Name(), ".json") {
			keyboard := strings.TrimSuffix(entry.Name(), ".json")
			keyboards = append(keyboards, keyboard)
		}
	}

	if len(keyboards) == 0 {
		keyboards = []string{"en-US", "zh-CN"}
	}

	return keyboards, nil
}

// getAvailableThemes 获取可用的主题
func (a *App) getAvailableThemes() ([]string, error) {
	// 从文件系统读取可用的主题文件

	themeDir := "build/bin/themes"
	entries, err := os.ReadDir(themeDir)
	if err != nil {
		return []string{"tron", "matrix", "cyborg", "nord"}, nil
	}

	var themes []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if strings.HasSuffix(entry.Name(), ".json") {
			theme := strings.TrimSuffix(entry.Name(), ".json")
			themes = append(themes, theme)
		}
	}

	if len(themes) == 0 {
		themes = []string{"tron", "matrix", "cyborg", "nord"}
	}

	return themes, nil
}

// getAvailableInterfaces 获取可用的网络接口
func (a *App) getAvailableInterfaces() ([]string, error) {

	if a.networkMgr == nil {
		return []string{"eth0", "wlan0"}, nil
	}

	networkInfo := a.networkMgr.GetNetworkInfo()

	var interfaces []string
	for _, iface := range networkInfo.Interfaces {
		interfaces = append(interfaces, iface.Iface)
	}

	if len(interfaces) == 0 {
		interfaces = []string{"eth0", "wlan0"}
	}

	return interfaces, nil
}

// GetSettings 获取应用设置
func (a *App) GetSettings() *models.Settings {

	return a.settingsMgr.GetSettings()
}

// GetClockHours 获取时钟小时制设置
func (a *App) GetClockHours() int {

	if a.settingsMgr.GetSettings() != nil {
		return a.settingsMgr.GetSettings().ClockHours
	}
	return 24 // 默认24小时制
}

// GetSystemInfo 获取系统信息
func (a *App) GetSystemInfo() *models.SystemInfo {

	return a.systemProvider.GetSystemInfo()
}

// GetUptime 获取系统运行时间（秒）
func (a *App) GetUptime() float64 {

	return a.systemProvider.GetUptime()
}

// GetBatteryInfo 获取电池信息
func (a *App) GetBatteryInfo() *models.BatteryInfo {

	return a.systemProvider.GetBatteryInfo()
}

// GetHardwareInfo 获取硬件信息
func (a *App) GetHardwareInfo() *models.HardwareInfo {

	return a.systemProvider.GetHardwareInfo()
}

// GetCPUInfo 获取 CPU 信息
func (a *App) GetCPUInfo() *models.CPUInfo {

	return a.systemProvider.GetCPUInfo()
}

// GetCPULoad 获取 CPU 负载信息
func (a *App) GetCPULoad() *models.CPULoad {

	return a.systemProvider.GetCPULoad()
}

// GetCPUTemperature 获取 CPU 温度信息
func (a *App) GetCPUTemperature() *models.CPUTemperature {

	return a.systemProvider.GetCPUTemperature()
}

// GetCPUSpeed 获取 CPU 速度信息
func (a *App) GetCPUSpeed() *models.CPUSpeed {

	return a.systemProvider.GetCPUSpeed()
}

// GetProcessCount 获取进程数量
func (a *App) GetProcessCount() *models.ProcessCount {

	return a.systemProvider.GetProcessCount()
}

// GetMemoryInfo 获取内存信息
func (a *App) GetMemoryInfo() *models.MemoryInfo {

	return a.systemProvider.GetMemoryInfo()
}

// GetProcessList 获取进程列表
func (a *App) GetProcessList() *models.ProcessList {

	return a.systemProvider.GetProcessList()
}

// GetNetworkInfo 获取网络信息
func (a *App) GetNetworkInfo() *models.NetworkInfo {

	return a.networkMgr.GetNetworkInfo()
}

// GetExternalIP 获取外部 IP
func (a *App) GetExternalIP() *models.ExternalIP {

	return a.networkMgr.GetExternalIP()
}

// Ping 执行 ping 操作
func (a *App) Ping(target string) *models.PingResult {

	result := a.networkMgr.Ping(target)
	return result
}

// GetNetworkConnections 获取网络连接信息
func (a *App) GetNetworkConnections() []models.NetworkConnection {

	return a.networkMgr.GetNetworkConnections()
}

// GetNetworkStats 获取网络统计信息
func (a *App) GetNetworkStats(iface string) []models.NetworkStats {

	return a.networkMgr.GetNetworkStats(iface)
}

// GetIPGeoLocation 获取IP地理位置信息
func (a *App) GetIPGeoLocation(ip string) *models.GeoLookupResult {

	return a.networkMgr.GetIPGeoLocation(ip)
}

// GetExternalIPWithGeo 获取外部IP及其地理位置信息
func (a *App) GetExternalIPWithGeo() *models.IPGeoInfo {

	return a.networkMgr.GetExternalIPWithGeo()
}

// GetTheme 获取主题信息
func (a *App) GetTheme() *Theme {
	return r.theme
}
func (a *App) Log(class string, msg string) {
	log.Printf("[%s] %s", class, msg)
}
func (a *App) GetCurrentUsername() string {

	if a.settingsMgr != nil && a.settingsMgr.GetSettings() != nil && a.settingsMgr.GetSettings().Username != "" {
		return a.settingsMgr.GetSettings().Username
	}
	if a.systemProvider == nil {
		return "User"
	}
	return a.systemProvider.GetCurrentUsername()
}

// 文件系统相关函数

// ReadDirectory 读取目录内容
func (a *App) ReadDirectory(path string) (*models.DirectoryData, error) {

	return a.settingsMgr.ReadDirectory(path)
}

// GetFileInfo 获取文件信息
func (a *App) GetFileInfo(path string) (*models.FileInfo, error) {

	return a.settingsMgr.GetFileInfo(path)
}

// ReadFile 读取文件内容
func (a *App) ReadFile(path string) (*models.FileData, error) {

	// OpenFile 用系统默认程序打开文件

	return a.settingsMgr.ReadFile(path)
}

func (a *App) OpenFile(path string) error {

	// WriteFile 写入文件内容

	return a.settingsMgr.OpenFile(path)
}

func (a *App) WriteFile(path string, content string) error {

	// GetBlockDevices 获取块设备信息

	return a.settingsMgr.WriteFile(path, content)
}

func (a *App) GetBlockDevices() ([]models.BlockDevice, error) {

	return a.settingsMgr.GetBlockDevices()
}

// GetDiskUsage 获取磁盘使用情况
func (a *App) GetDiskUsage(path string) (*models.DiskUsage, error) {

	return a.settingsMgr.GetDiskUsage(path)
}

// 媒体文件相关函数

// GetPDFData 获取PDF文件数据
func (a *App) GetPDFData(path string) (*models.MediaData, error) {

	return a.settingsMgr.GetMediaData(path, "application/pdf")
}

// GetMediaData 获取媒体文件数据
func (a *App) GetMediaData(path string) (*models.MediaData, error) {

	return a.settingsMgr.GetMediaData(path, "")
}

// CheckForUpdates 检查更新
func (a *App) CheckForUpdates() (*models.UpdateInfo, error) {

	return a.settingsMgr.CheckForUpdates()
}

// OpenURL 打开URL
func (a *App) OpenURL(url string) error {

	// 模糊搜索相关函数

	return a.settingsMgr.OpenURL(url)
}

// FuzzySearch 模糊搜索文件
func (a *App) FuzzySearch(query, dirPath string) ([]models.SearchResult, error) {

	return a.settingsMgr.FuzzySearch(query, dirPath)
}

// ResolveFilePath 解析文件路径
func (a *App) ResolveFilePath(dirPath, filename string) (string, error) {

	return a.settingsMgr.ResolveFilePath(dirPath, filename)
}

// Shutdown 应用关闭时的清理工作
func (a *App) shutdown(ctx context.Context) {
	// 清理单实例锁文件
	a.cleanupSingleInstanceLock()

	// 关闭终端管理器
	if a.terminalMgr != nil {
		a.terminalMgr.Close()
	}
	log.Println("应用已关闭")
}
