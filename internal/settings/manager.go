package settings

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"edex-ui-golang/internal/models"
	"edex-ui-golang/internal/utils"
	"github.com/shirou/gopsutil/v3/disk"
)

// Manager 设置管理器
type Manager struct {
	settings *models.Settings
}

// NewManager 创建新的设置管理器
func NewManager() *Manager {
	// LoadSettings 加载设置
	return &Manager{}
}

func (m *Manager) LoadSettings() error {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	settingsFile := filepath.Join(AppDataDir, "settings.json")

	// 如果设置文件不存在，创建默认设置
	if _, err := os.Stat(settingsFile); os.IsNotExist(err) {
		return m.createDefaultSettings(settingsFile)
	}

	// 读取现有设置
	data, err := os.ReadFile(settingsFile)
	if err != nil {
		return err
	}

	var settings models.Settings
	if err := json.Unmarshal(data, &settings); err != nil {
		return err
	}

	m.settings = &settings
	return nil
}

// createDefaultSettings 创建默认设置
func (m *Manager) createDefaultSettings(settingsFile string) error {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	// 确定默认shell
	var defaultShell string
	if runtime.GOOS == "windows" {
		defaultShell = "powershell.exe"
	} else {
		defaultShell = "bash"
	}

	settings := models.Settings{
		Shell:                     defaultShell,
		ShellArgs:                 "",
		Cwd:                       AppDataDir,
		Keyboard:                  "en-US",
		Theme:                     "tron",
		TermFontSize:              15,
		Audio:                     true,
		AudioVolume:               1.0,
		DisableFeedbackAudio:      false,
		ClockHours:                24,
		PingAddr:                  "8.8.8.8",
		Port:                      3000,
		Nointro:                   false,
		Nocursor:                  false,
		ForceFullscreen:           true,
		AllowWindowed:             false,
		ExcludeThreadsFromToplist: true,
		HideDotfiles:              false,
		FsListView:                false,
		ExperimentalGlobeFeatures: false,
		ExperimentalFeatures:      false,
		DisableAutoUpdate:         false,
	}

	data, err := json.MarshalIndent(settings, "", "    ")
	if err != nil {
		return err
	}

	// 安全地写入文件
	if err := utils.SafeWriteFile(settingsFile, data, 0644); err != nil {
		return err
	}

	m.settings = &settings
	return nil
}

// GetSettings 获取当前设置
func (m *Manager) GetSettings() *models.Settings {
	// CreateDefaultShortcuts 创建默认快捷键文件
	return m.settings
}

func (m *Manager) CreateDefaultShortcuts() error {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	shortcutsFile := filepath.Join(AppDataDir, "shortcuts.json")

	// 如果快捷键文件不存在，创建默认快捷键
	if _, err := os.Stat(shortcutsFile); os.IsNotExist(err) {
		shortcuts := []models.Shortcut{
			{Type: "app", Trigger: "Ctrl+Shift+C", Action: "COPY", Enabled: true},
			{Type: "app", Trigger: "Ctrl+Shift+V", Action: "PASTE", Enabled: true},
			{Type: "app", Trigger: "Ctrl+Tab", Action: "NEXT_TAB", Enabled: true},
			{Type: "app", Trigger: "Ctrl+Shift+Tab", Action: "PREVIOUS_TAB", Enabled: true},
			{Type: "app", Trigger: "Ctrl+X", Action: "TAB_X", Enabled: true},
			{Type: "app", Trigger: "Ctrl+Shift+S", Action: "SETTINGS", Enabled: true},
			{Type: "app", Trigger: "Ctrl+Shift+K", Action: "SHORTCUTS", Enabled: true},
			{Type: "app", Trigger: "Ctrl+Shift+F", Action: "FUZZY_SEARCH", Enabled: true},
			{Type: "app", Trigger: "Ctrl+Shift+L", Action: "FS_LIST_VIEW", Enabled: true},
			{Type: "app", Trigger: "Ctrl+Shift+H", Action: "FS_DOTFILES", Enabled: true},
			{Type: "app", Trigger: "Ctrl+Shift+P", Action: "KB_PASSMODE", Enabled: true},
			{Type: "app", Trigger: "Ctrl+Shift+I", Action: "DEV_DEBUG", Enabled: false},
			{Type: "app", Trigger: "Ctrl+Shift+F5", Action: "DEV_RELOAD", Enabled: true},
			{Type: "shell", Trigger: "Ctrl+Shift+Alt+Space", Action: "neofetch", Linebreak: true, Enabled: false},
		}

		data, err := json.MarshalIndent(shortcuts, "", "    ")
		if err != nil {
			return err
		}

		// 安全地写入文件
		if err := utils.SafeWriteFile(shortcutsFile, data, 0644); err != nil {
			return err
		}
	}

	return nil
}

// CreateDefaultWindowState 创建默认窗口状态文件
func (m *Manager) CreateDefaultWindowState() error {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	windowStateFile := filepath.Join(AppDataDir, "lastWindowState.json")

	// 如果窗口状态文件不存在，创建默认状态
	if _, err := os.Stat(windowStateFile); os.IsNotExist(err) {
		windowState := models.WindowState{
			UseFullscreen: true,
		}

		data, err := json.MarshalIndent(windowState, "", "    ")
		if err != nil {
			return err
		}

		// 安全地写入文件
		if err := utils.SafeWriteFile(windowStateFile, data, 0644); err != nil {
			return err
		}
	}

	return nil
}

// UpdateVersionHistory 更新版本历史
func (m *Manager) UpdateVersionHistory() error {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	versionHistoryPath := filepath.Join(AppDataDir, "versions_log.json")

	var versionHistory map[string]models.VersionHistory
	if _, err := os.Stat(versionHistoryPath); err == nil {
		data, err := os.ReadFile(versionHistoryPath)
		if err == nil {
			json.Unmarshal(data, &versionHistory)
		}
	}

	if versionHistory == nil {
		versionHistory = make(map[string]models.VersionHistory)
	}

	version := "1.0.0"
	now := time.Now().Unix()

	if vh, exists := versionHistory[version]; exists {
		vh.LastSeen = now
		versionHistory[version] = vh
	} else {
		versionHistory[version] = models.VersionHistory{
			FirstSeen: now,
			LastSeen:  now,
		}
	}

	data, err := json.MarshalIndent(versionHistory, "", "  ")
	if err != nil {
		return err
	}

	// 安全地写入文件
	return utils.SafeWriteFile(versionHistoryPath, data, 0644)
}

// 文件系统相关函数

// ReadDirectory 读取目录内容
func (m *Manager) ReadDirectory(path string) (*models.DirectoryData, error) {

	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var files []models.FileInfo
	for _, entry := range entries {
		filePath := filepath.Join(path, entry.Name())
		info, err := entry.Info()
		if err != nil {
			continue
		}

		fileInfo := models.FileInfo{
			Name:           entry.Name(),
			Path:           filePath,
			IsDirectory:    entry.IsDir(),
			IsFile:         !entry.IsDir(),
			IsSymbolicLink: entry.Type()&os.ModeSymlink != 0,
			Size:           info.Size(),
			LastAccessed:   info.ModTime().Unix(),
		}

		// 设置 MIME 类型
		if !entry.IsDir() {
			ext := filepath.Ext(entry.Name())
			fileInfo.MimeType = mime.TypeByExtension(ext)

			// 检查是否为文本文件
			fileInfo.IsText = m.isTextFile(fileInfo.MimeType)
		}

		files = append(files, fileInfo)
	}

	return &models.DirectoryData{Files: files}, nil
}

// GetFileInfo 获取文件信息
func (m *Manager) GetFileInfo(path string) (*models.FileInfo, error) {

	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	fileInfo := models.FileInfo{
		Name:           filepath.Base(path),
		Path:           path,
		IsDirectory:    info.IsDir(),
		IsFile:         !info.IsDir(),
		IsSymbolicLink: info.Mode()&os.ModeSymlink != 0,
		Size:           info.Size(),
		LastAccessed:   info.ModTime().Unix(),
	}

	// 设置 MIME 类型
	if !info.IsDir() {
		ext := filepath.Ext(path)
		fileInfo.MimeType = mime.TypeByExtension(ext)
		fileInfo.IsText = m.isTextFile(fileInfo.MimeType)
	}

	return &fileInfo, nil
}

// ReadFile 读取文件内容
func (m *Manager) ReadFile(path string) (*models.FileData, error) {

	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	return &models.FileData{
		Content: string(content),
	}, nil
}

// WriteFile 写入文件内容
func (m *Manager) WriteFile(path string, content string) error {

	return os.WriteFile(path, []byte(content), 0644)
}

// GetFileIcons 获取文件图标信息
func (m *Manager) GetFileIcons() map[string]interface{} {
	// 返回基本的文件图标信息
	// 这里可以扩展为从配置文件或数据库读取更丰富的图标信息

	return map[string]interface{}{
		"file": map[string]interface{}{
			"width":  24,
			"height": 24,
			"svg":    "<path d=\"M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z\"/>",
		},
		"dir": map[string]interface{}{
			"width":  24,
			"height": 24,
			"svg":    "<path d=\"M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z\"/>",
		},
		"symlink": map[string]interface{}{
			"width":  24,
			"height": 24,
			"svg":    "<path d=\"M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z\"/>",
		},
		"up": map[string]interface{}{
			"width":  24,
			"height": 24,
			"svg":    "<path d=\"M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z\"/>",
		},
		"showDisks": map[string]interface{}{
			"width":  24,
			"height": 24,
			"svg":    "<path d=\"M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z\"/>",
		},
		"disk": map[string]interface{}{
			"width":  24,
			"height": 24,
			"svg":    "<path d=\"M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z\"/>",
		},
		"rom": map[string]interface{}{
			"width":  24,
			"height": 24,
			"svg":    "<path d=\"M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z\"/>",
		},
		"usb": map[string]interface{}{
			"width":  24,
			"height": 24,
			"svg":    "<path d=\"M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z\"/>",
		},
		"other": map[string]interface{}{
			"width":  24,
			"height": 24,
			"svg":    "<path d=\"M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z\"/>",
		},
	}
}

// OpenFile 用系统默认程序打开文件
func (m *Manager) OpenFile(path string) error {

	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", path)
	case "darwin":
		cmd = exec.Command("open", path)
	default:
		cmd = exec.Command("xdg-open", path)
	}

	return cmd.Run()
}

// GetBlockDevices 获取块设备信息
func (m *Manager) GetBlockDevices() ([]models.BlockDevice, error) {

	// 获取所有分区信息
	var devices []models.BlockDevice

	partitions, err := disk.Partitions(false)
	if err != nil {
		return nil, fmt.Errorf("获取分区信息失败: %v", err)
	}

	for _, partition := range partitions {
		// 过滤掉一些系统分区
		if partition.Mountpoint == "" ||
			strings.Contains(partition.Mountpoint, "/proc") ||
			strings.Contains(partition.Mountpoint, "/sys") ||
			strings.Contains(partition.Mountpoint, "/dev") {
			continue
		}

		// 判断是否为可移动设备（简化判断）
		removable := false
		if runtime.GOOS == "windows" {
			// Windows 下，通常 D:、E: 等为可移动设备
			removable = len(partition.Mountpoint) == 3 && partition.Mountpoint[1] == ':' && partition.Mountpoint[2] == '\\' && partition.Mountpoint[0] > 'C'
		} else {
			// Unix 系统下，通常 /media/ 或 /mnt/ 下的为可移动设备
			removable = strings.HasPrefix(partition.Mountpoint, "/media/") || strings.HasPrefix(partition.Mountpoint, "/mnt/")
		}

		label := partition.Mountpoint
		if runtime.GOOS == "windows" {
			label = partition.Mountpoint[:2] // 如 "C:"
		} else {
			// 尝试从挂载点路径获取标签
			parts := strings.Split(partition.Mountpoint, "/")
			if len(parts) > 1 {
				label = parts[len(parts)-1]
			}
		}

		devices = append(devices, models.BlockDevice{
			Name:      partition.Device,
			Type:      partition.Fstype,
			Path:      partition.Mountpoint,
			Label:     label,
			Removable: removable,
		})
	}

	return devices, nil
}

// GetDiskUsage 获取磁盘使用情况
func (m *Manager) GetDiskUsage(path string) (*models.DiskUsage, error) {
	// 使用 gopsutil 获取磁盘使用情况

	usage, err := disk.Usage(path)
	if err != nil {
		return nil, fmt.Errorf("获取磁盘使用情况失败: %v", err)
	}

	// 计算使用百分比
	usePercent := 0.0
	if usage.Total > 0 {
		usePercent = float64(usage.Used) / float64(usage.Total) * 100.0
	}

	return &models.DiskUsage{
		Mount: path,
		Use:   usePercent,
		Size:  usage.Total,
		Used:  usage.Used,
	}, nil
}

// 媒体文件相关函数

// GetMediaData 获取媒体文件数据
func (m *Manager) GetMediaData(path, mimeType string) (*models.MediaData, error) {
	// 读取文件

	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// 读取文件内容
	content, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	// 编码为 base64
	data := base64.StdEncoding.EncodeToString(content)

	// 如果没有指定 MIME 类型，尝试检测
	if mimeType == "" {
		ext := filepath.Ext(path)
		mimeType = mime.TypeByExtension(ext)
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}
	}

	return &models.MediaData{
		Data:     data,
		MimeType: mimeType,
		URL:      "", // 在本地文件系统中不使用 URL
	}, nil
}

// 更新检查相关函数

// Version 版本信息
var (
	Version   = "1.0.0" // 在构建时通过 ldflags 设置
	BuildTime = "unknown"
	GitCommit = "unknown"
)

// CheckForUpdates 检查更新
func (m *Manager) CheckForUpdates() (*models.UpdateInfo, error) {
	// 检查是否应该跳过更新检查

	if m.shouldSkipUpdateCheck() {
		return &models.UpdateInfo{
			IsLatest:      true,
			IsDevelopment: false,
			LatestVersion: Version,
			DownloadURL:   "",
		}, nil
	}

	// 检查缓存
	if cached, err := m.getCachedUpdateInfo(); err == nil && cached != nil {
		// 如果缓存未过期（1小时内），直接返回缓存结果
		if time.Since(cached.CheckTime) < time.Hour {
			return cached, nil
		}
	}

	// 调用 GitHub API 获取最新版本信息
	release, err := m.fetchLatestRelease()
	if err != nil {
		// 如果 API 调用失败，尝试返回缓存的结果
		if cached, cacheErr := m.getCachedUpdateInfo(); cacheErr == nil && cached != nil {
			return cached, nil
		}
		return nil, err
	}

	// 解析版本信息
	currentVersion := Version
	latestVersion := strings.TrimPrefix(release.TagName, "v")

	// 进行语义化版本比较
	isLatest, err := m.compareVersions(currentVersion, latestVersion)
	if err != nil {
		// 如果版本比较失败，使用简单的字符串比较作为后备
		isLatest = currentVersion == latestVersion
	}

	// 判断是否为开发版本
	isDevelopment := m.isDevelopmentVersion(currentVersion)

	// 查找适合当前平台的下载资源
	downloadURL := m.findPlatformAsset(release.Assets)

	updateInfo := &models.UpdateInfo{
		IsLatest:      isLatest,
		IsDevelopment: isDevelopment,
		LatestVersion: latestVersion,
		DownloadURL:   downloadURL,
		ReleaseNotes:  release.Body,
		PublishedAt:   release.PublishedAt,
		CheckTime:     time.Now(),
	}

	// 缓存结果
	m.cacheUpdateInfo(updateInfo)

	return updateInfo, nil
}

// GitHubRelease GitHub 发布信息结构体
type GitHubRelease struct {
	TagName     string        `json:"tag_name"`
	HTMLURL     string        `json:"html_url"`
	Body        string        `json:"body"`
	PublishedAt time.Time     `json:"published_at"`
	Assets      []GitHubAsset `json:"assets"`
}

// GitHubAsset GitHub 资源结构体
type GitHubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	ContentType        string `json:"content_type"`
	Size               int64  `json:"size"`
}

// shouldSkipUpdateCheck 检查是否应该跳过更新检查
func (m *Manager) shouldSkipUpdateCheck() bool {
	// 检查设置中是否禁用了自动更新检查

	if m.settings != nil && m.settings.DisableAutoUpdate {
		return true
	}
	return false
}

// fetchLatestRelease 从 GitHub API 获取最新发布信息
func (m *Manager) fetchLatestRelease() (*GitHubRelease, error) {

	client := &http.Client{
		Timeout: 15 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:       10,
			IdleConnTimeout:    30 * time.Second,
			DisableCompression: true,
		},
	}

	req, err := http.NewRequest("GET", "https://api.github.com/repos/GxxkX/edex-ui-golang/releases/latest", nil)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %v", err)
	}

	req.Header.Set("User-Agent", "eDEX-UI-Go-UpdateChecker/1.0")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()

	// 检查速率限制
	if resp.StatusCode == 403 {
		rateLimitRemaining := resp.Header.Get("X-RateLimit-Remaining")
		if rateLimitRemaining == "0" {
			return nil, fmt.Errorf("GitHub API 速率限制已用完，请稍后再试")
		}
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub API 返回状态码 %d", resp.StatusCode)
	}

	var release GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("解析响应失败: %v", err)
	}

	return &release, nil
}

// compareVersions 比较两个语义化版本号
func (m *Manager) compareVersions(current, latest string) (bool, error) {
	// 简单的语义化版本比较实现
	// 格式: major.minor.patch[-prerelease][+build]

	// 移除 v 前缀
	current = strings.TrimPrefix(current, "v")
	latest = strings.TrimPrefix(latest, "v")

	// 如果版本相同，则是最新版本
	if current == latest {
		return true, nil
	}

	// 分割版本号
	currentParts := strings.Split(current, ".")
	latestParts := strings.Split(latest, ".")

	// 确保两个版本都有足够的组件
	maxLen := len(currentParts)
	if len(latestParts) > maxLen {
		maxLen = len(latestParts)
	}

	// 补齐版本号组件
	for len(currentParts) < maxLen {
		currentParts = append(currentParts, "0")
	}
	for len(latestParts) < maxLen {
		latestParts = append(latestParts, "0")
	}

	// 比较每个组件
	for i := 0; i < maxLen; i++ {
		currentNum, err1 := strconv.Atoi(strings.Split(currentParts[i], "-")[0])
		latestNum, err2 := strconv.Atoi(strings.Split(latestParts[i], "-")[0])

		if err1 != nil || err2 != nil {
			// 如果无法解析为数字，使用字符串比较
			if currentParts[i] < latestParts[i] {
				return false, nil
			} else if currentParts[i] > latestParts[i] {
				return true, nil
			}
			continue
		}

		if currentNum < latestNum {
			return false, nil
		} else if currentNum > latestNum {
			return true, nil
		}
	}

	// 如果主版本号相同，检查预发布版本
	currentHasPrerelease := strings.Contains(current, "-")
	latestHasPrerelease := strings.Contains(latest, "-")

	if currentHasPrerelease && !latestHasPrerelease {
		return false, nil // 当前是预发布版本，最新是稳定版本
	} else if !currentHasPrerelease && latestHasPrerelease {
		return true, nil // 当前是稳定版本，最新是预发布版本
	}

	// 如果都是预发布版本，比较预发布部分
	if currentHasPrerelease && latestHasPrerelease {
		currentPrerelease := strings.Split(current, "-")[1]
		latestPrerelease := strings.Split(latest, "-")[1]
		return currentPrerelease >= latestPrerelease, nil
	}

	return true, nil
}

// isDevelopmentVersion 判断是否为开发版本
func (m *Manager) isDevelopmentVersion(version string) bool {
	// 检查版本号中是否包含开发版本标识

	devKeywords := []string{"dev", "alpha", "beta", "rc", "pre", "snapshot"}
	version = strings.ToLower(version)

	for _, keyword := range devKeywords {
		if strings.Contains(version, keyword) {
			return true
		}
	}

	return false
}

// findPlatformAsset 查找适合当前平台的下载资源
func (m *Manager) findPlatformAsset(assets []GitHubAsset) string {
	// 根据当前平台确定关键词
	var platformKeywords []string

	switch runtime.GOOS {
	case "windows":
		platformKeywords = []string{"windows", "win", ".exe"}
		if runtime.GOARCH == "amd64" {
			platformKeywords = append(platformKeywords, "amd64", "x64", "64")
		} else if runtime.GOARCH == "386" {
			platformKeywords = append(platformKeywords, "386", "x86", "32")
		}
	case "darwin":
		platformKeywords = []string{"darwin", "macos", "mac", ".dmg", ".pkg"}
		if runtime.GOARCH == "arm64" {
			platformKeywords = append(platformKeywords, "arm64", "m1", "apple")
		} else if runtime.GOARCH == "amd64" {
			platformKeywords = append(platformKeywords, "amd64", "x64", "intel")
		}
	case "linux":
		platformKeywords = []string{"linux", ".AppImage", ".deb", ".rpm", ".tar.gz"}
		if runtime.GOARCH == "amd64" {
			platformKeywords = append(platformKeywords, "amd64", "x64", "64")
		} else if runtime.GOARCH == "386" {
			platformKeywords = append(platformKeywords, "386", "x86", "32")
		} else if runtime.GOARCH == "arm64" {
			platformKeywords = append(platformKeywords, "arm64", "aarch64")
		}
	}

	// 查找最匹配的资源
	bestMatch := ""
	bestScore := 0

	for _, asset := range assets {
		score := 0
		assetName := strings.ToLower(asset.Name)

		// 计算匹配分数
		for _, keyword := range platformKeywords {
			if strings.Contains(assetName, strings.ToLower(keyword)) {
				score++
			}
		}

		// 优先选择可执行文件
		if strings.HasSuffix(assetName, ".exe") ||
			strings.HasSuffix(assetName, ".AppImage") ||
			strings.HasSuffix(assetName, ".dmg") {
			score += 2
		}

		if score > bestScore {
			bestScore = score
			bestMatch = asset.BrowserDownloadURL
		}
	}

	return bestMatch
}

// getCachedUpdateInfo 获取缓存的更新信息
func (m *Manager) getCachedUpdateInfo() (*models.UpdateInfo, error) {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return nil, err
	}

	cacheFile := filepath.Join(AppDataDir, "update_cache.json")

	data, err := os.ReadFile(cacheFile)
	if err != nil {
		return nil, err
	}

	var updateInfo models.UpdateInfo
	if err := json.Unmarshal(data, &updateInfo); err != nil {
		return nil, err
	}

	return &updateInfo, nil
}

// cacheUpdateInfo 缓存更新信息
func (m *Manager) cacheUpdateInfo(updateInfo *models.UpdateInfo) error {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	cacheFile := filepath.Join(AppDataDir, "update_cache.json")

	data, err := json.MarshalIndent(updateInfo, "", "  ")
	if err != nil {
		return err
	}

	return utils.SafeWriteFile(cacheFile, data, 0644)
}

// ClearUpdateCache 清除更新缓存
func (m *Manager) ClearUpdateCache() error {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	cacheFile := filepath.Join(AppDataDir, "update_cache.json")

	// 如果缓存文件存在，删除它
	if _, err := os.Stat(cacheFile); err == nil {
		return os.Remove(cacheFile)
	}

	return nil
}

// GetCurrentVersion 获取当前版本信息
func (m *Manager) GetCurrentVersion() string {
	// GetBuildInfo 获取构建信息
	return Version
}

func (m *Manager) GetBuildInfo() map[string]string {

	return map[string]string{
		"version":   Version,
		"buildTime": BuildTime,
		"gitCommit": GitCommit,
		"goVersion": runtime.Version(),
		"platform":  runtime.GOOS,
		"arch":      runtime.GOARCH,
	}
}

// CheckUpdateSettings 检查更新设置
func (m *Manager) CheckUpdateSettings() *models.UpdateSettings {

	if m.settings == nil {
		return &models.UpdateSettings{
			AutoCheck:      true,
			CheckInterval:  24, // 小时
			NotifyOnUpdate: true,
		}
	}

	return &models.UpdateSettings{
		AutoCheck:      !m.settings.DisableAutoUpdate,
		CheckInterval:  24,   // 可以从设置中读取
		NotifyOnUpdate: true, // 可以从设置中读取
	}
}

// OpenURL 打开URL
func (m *Manager) OpenURL(url string) error {

	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}

	return cmd.Run()
}

// 模糊搜索相关函数

// FuzzySearch 模糊搜索文件
func (m *Manager) FuzzySearch(query, dirPath string) ([]models.SearchResult, error) {
	// 读取目录内容

	dirData, err := m.ReadDirectory(dirPath)
	if err != nil {
		return nil, err
	}

	var results []models.SearchResult
	query = strings.ToLower(query)

	for _, file := range dirData.Files {
		// 简单的模糊匹配
		if strings.Contains(strings.ToLower(file.Name), query) {
			results = append(results, models.SearchResult{
				Name: file.Name,
				Path: file.Path,
			})

			// 限制结果数量
			if len(results) >= 5 {
				break
			}
		}
	}

	return results, nil
}

// ResolveFilePath 解析文件路径
func (m *Manager) ResolveFilePath(dirPath, filename string) (string, error) {
	// 简单的路径解析

	return filepath.Join(dirPath, filename), nil
}

// 辅助函数

// isTextFile 检查是否为文本文件
func (m *Manager) isTextFile(mimeType string) bool {

	textTypes := []string{
		"text/",
		"application/json",
		"application/xml",
		"application/javascript",
		"application/typescript",
	}

	for _, textType := range textTypes {
		if strings.HasPrefix(mimeType, textType) {
			return true
		}
	}

	return false
}

// GetShortcuts 获取所有快捷键
func (m *Manager) GetShortcuts() ([]models.Shortcut, error) {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return nil, err
	}

	shortcutsFile := filepath.Join(AppDataDir, "shortcuts.json")

	// 如果文件不存在，创建默认快捷键
	if _, err := os.Stat(shortcutsFile); os.IsNotExist(err) {
		if err := m.CreateDefaultShortcuts(); err != nil {
			return nil, err
		}
	}

	data, err := os.ReadFile(shortcutsFile)
	if err != nil {
		return nil, err
	}

	var shortcuts []models.Shortcut
	if err := json.Unmarshal(data, &shortcuts); err != nil {
		return nil, err
	}

	return shortcuts, nil
}

// UpdateShortcut 更新快捷键
func (m *Manager) UpdateShortcut(shortcut models.Shortcut) error {

	shortcuts, err := m.GetShortcuts()
	if err != nil {
		return err
	}

	// 查找并更新快捷键
	found := false
	for i, s := range shortcuts {
		if s.Trigger == shortcut.Trigger {
			shortcuts[i] = shortcut
			found = true
			break
		}
	}

	if !found {
		// 如果没找到，添加新的快捷键
		shortcuts = append(shortcuts, shortcut)
	}

	return m.saveShortcuts(shortcuts)
}

// DeleteShortcut 删除快捷键
func (m *Manager) DeleteShortcut(trigger string) error {

	shortcuts, err := m.GetShortcuts()
	if err != nil {
		return err
	}

	// 过滤掉要删除的快捷键
	var newShortcuts []models.Shortcut
	for _, s := range shortcuts {
		if s.Trigger != trigger {
			newShortcuts = append(newShortcuts, s)
		}
	}

	return m.saveShortcuts(newShortcuts)
}

// AddShortcut 添加新快捷键
func (m *Manager) AddShortcut(shortcut models.Shortcut) error {

	shortcuts, err := m.GetShortcuts()
	if err != nil {
		return err
	}

	// 检查是否已存在相同的触发器
	for _, s := range shortcuts {
		if s.Trigger == shortcut.Trigger {
			return fmt.Errorf("快捷键 %s 已存在", shortcut.Trigger)
		}
	}

	// 添加新快捷键
	shortcuts = append(shortcuts, shortcut)
	return m.saveShortcuts(shortcuts)
}

// saveShortcuts 保存快捷键到文件
func (m *Manager) saveShortcuts(shortcuts []models.Shortcut) error {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	shortcutsFile := filepath.Join(AppDataDir, "shortcuts.json")

	data, err := json.MarshalIndent(shortcuts, "", "    ")
	if err != nil {
		return err
	}

	return utils.SafeWriteFile(shortcutsFile, data, 0644)
}

// SaveSettings 保存设置
func (m *Manager) SaveSettings(settings *models.Settings) error {
	// 更新内存中的设置

	m.settings = settings

	// 保存到文件
	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	settingsFile := filepath.Join(AppDataDir, "settings.json")

	data, err := json.MarshalIndent(settings, "", "    ")
	if err != nil {
		return err
	}

	return utils.SafeWriteFile(settingsFile, data, 0644)
}
