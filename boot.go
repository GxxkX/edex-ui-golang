package main

import (
	"context"
	"edex-ui-golang/internal/models"
	"edex-ui-golang/internal/utils"
	"encoding/json"

	"log"
	"os"
	"path/filepath"
)

// Boot 是主要的渲染器结构体
type Boot struct {
	ctx context.Context

	// 配置和设置
	settings        *models.Settings
	shortcuts       []models.Shortcut
	lastWindowState *models.WindowState

	// 主题和UI
	theme        *Theme
	audioManager *AudioManager

	// 终端管理
	terminals   map[int]*models.Terminal
	currentTerm int

	// 模块管理
	modules map[string]interface{}

	// 文件系统
	fsDisplay *FilesystemDisplay

	// 键盘
	keyboard *Keyboard

	// 错误处理
	errorModals []*Modal
}

// Theme 表示主题配置
type Theme struct {
	CSSVars   ThemeCSSVars  `json:"cssvars"`
	Colors    ThemeColors   `json:"colors"`
	Terminal  ThemeTerminal `json:"terminal"`
	Globe     ThemeGlobe    `json:"globe"`
	InjectCSS string        `json:"injectCSS"`
}

// ThemeCSSVars 表示主题CSS变量
type ThemeCSSVars struct {
	FontMain      string `json:"font_main"`
	FontMainLight string `json:"font_main_light"`
}

// ThemeColors 表示主题颜色
type ThemeColors struct {
	R          int    `json:"r"`
	G          int    `json:"g"`
	B          int    `json:"b"`
	Black      string `json:"black"`
	LightBlack string `json:"light_black"`
	Grey       string `json:"grey"`
	Red        string `json:"red"`
	Yellow     string `json:"yellow"`
}

// ThemeTerminal 表示终端主题
type ThemeTerminal struct {
	FontFamily   string `json:"fontFamily"`
	CursorStyle  string `json:"cursorStyle"`
	Foreground   string `json:"foreground"`
	Background   string `json:"background"`
	Cursor       string `json:"cursor"`
	CursorAccent string `json:"cursorAccent"`
	Selection    string `json:"selection"`
}

// ThemeGlobe 表示地球仪主题
type ThemeGlobe struct {
	Base      string `json:"base"`
	Marker    string `json:"marker"`
	Pin       string `json:"pin"`
	Satellite string `json:"satellite"`
}

// AudioManager 管理音频播放
type AudioManager struct {
	Settings *models.Settings
	Sounds   map[string]interface{}
}

// FilesystemDisplay 表示文件系统显示
type FilesystemDisplay struct {
	ParentID string
}

// Keyboard 表示键盘
type Keyboard struct {
	Layout       string
	Container    string
	LinkedToTerm bool
}

// Modal 表示模态框
type Modal struct {
	Type    string
	Title   string
	Message string
	HTML    string
	Buttons []ModalButton
	OnClose func()
}

// ModalButton 表示模态框按钮
type ModalButton struct {
	Label  string
	Action string
}

// NewBoot 创建新的渲染器实例
func NewBoot() *Boot {

	return &Boot{
		terminals:   make(map[int]*models.Terminal),
		modules:     make(map[string]interface{}),
		errorModals: make([]*Modal, 0),
		currentTerm: 0,
	}
}

// 配置管理

// loadConfig 加载配置文件
func (r *Boot) loadConfig() {
	// 获取用户数据目录

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		AppDataDir = os.TempDir()
	}

	themesDir := filepath.Join(AppDataDir, "themes")
	keyboardsDir := filepath.Join(AppDataDir, "keyboards")
	fontsDir := filepath.Join(AppDataDir, "fonts")
	settingsFile := filepath.Join(AppDataDir, "settings.json")
	shortcutsFile := filepath.Join(AppDataDir, "shortcuts.json")
	lastWindowStateFile := filepath.Join(AppDataDir, "lastWindowState.json")

	// 确保目录存在
	os.MkdirAll(AppDataDir, 0755)
	os.MkdirAll(themesDir, 0755)
	os.MkdirAll(keyboardsDir, 0755)
	os.MkdirAll(fontsDir, 0755)

	// 加载设置
	r.settings = r.loadSettings(settingsFile)
	r.shortcuts = r.loadShortcuts(shortcutsFile)
	r.lastWindowState = r.loadWindowState(lastWindowStateFile)

	// 检查命令行参数
	r.checkCLIParameters()
}

// loadSettings 加载设置文件
func (r *Boot) loadSettings(filepath string) *models.Settings {

	defaultSettings := &models.Settings{
		Shell:                     "bash",
		ShellArgs:                 "",
		Cwd:                       os.Getenv("HOME"),
		Env:                       "",
		Username:                  "",
		Keyboard:                  "en-US",
		Theme:                     "tron",
		TermFontSize:              14,
		Audio:                     true,
		AudioVolume:               1.0,
		DisableFeedbackAudio:      false,
		PingAddr:                  "8.8.8.8",
		ClockHours:                24,
		Port:                      3000,
		Monitor:                   0,
		NoIntro:                   false,
		NoCursor:                  false,
		Iface:                     "",
		AllowWindowed:             false,
		ForceFullscreen:           false,
		KeepGeometry:              true,
		ExcludeThreadsFromToplist: false,
		HideDotfiles:              false,
		FsListView:                false,
		ExperimentalGlobeFeatures: false,
		ExperimentalFeatures:      false,
	}

	data, err := os.ReadFile(filepath)
	if err != nil {
		// 如果文件不存在，创建默认设置
		r.saveSettings(defaultSettings, filepath)
		return defaultSettings
	}

	var settings models.Settings
	if err := json.Unmarshal(data, &settings); err != nil {
		return defaultSettings
	}

	return &settings
}

// loadShortcuts 加载快捷键文件
func (r *Boot) loadShortcuts(filepath string) []models.Shortcut {

	defaultShortcuts := []models.Shortcut{
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
		{Type: "app", Trigger: "Ctrl+Shift+Alt+Space", Action: "neofetch", Linebreak: true, Enabled: true},
	}

	data, err := os.ReadFile(filepath)
	if err != nil {
		err := r.saveShortcuts(defaultShortcuts, filepath)
		if err != nil {
			return nil
		}
		return defaultShortcuts
	}

	var shortcuts []models.Shortcut
	if err := json.Unmarshal(data, &shortcuts); err != nil {
		return defaultShortcuts
	}

	return shortcuts
}

// loadWindowState 加载窗口状态文件
func (r *Boot) loadWindowState(filepath string) *models.WindowState {

	defaultState := &models.WindowState{
		UseFullscreen: true,
	}
	data, err := os.ReadFile(filepath)
	if err != nil {
		err := r.saveWindowState(defaultState, filepath)
		if err != nil {
			return nil
		}
		return defaultState
	}

	var state models.WindowState
	if err := json.Unmarshal(data, &state); err != nil {
		return defaultState
	}

	return &state
}

// saveSettings 保存设置文件
func (r *Boot) saveSettings(settings *models.Settings, filepath string) error {

	data, err := json.MarshalIndent(settings, "", "settings.json")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath, data, 0644)
}

// saveShortcuts 保存快捷键文件
func (r *Boot) saveShortcuts(shortcuts []models.Shortcut, filepath string) error {

	data, err := json.MarshalIndent(shortcuts, "", "shortcuts.json")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath, data, 0644)
}

// saveWindowState 保存窗口状态文件
func (r *Boot) saveWindowState(state *models.WindowState, filepath string) error {

	data, err := json.MarshalIndent(state, "", "lastWindowState.json")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath, data, 0644)
}

// checkCLIParameters 检查命令行参数
func (r *Boot) checkCLIParameters() {

	args := os.Args
	for _, arg := range args {
		switch arg {
		case "--nointro":
			r.settings.NoIntro = true
		case "--nocursor":
			r.settings.NoCursor = true
		}
	}
}

func (r *Boot) loadTheme(themeName string) {

	AppDataDir, _ := utils.GetAppDir()
	themesDir := filepath.Join(AppDataDir, "themes")
	themeFile := filepath.Join(themesDir, themeName+".json")
	log.Println(themeFile)
	data, err := os.ReadFile(themeFile)
	if err != nil {
		// 使用默认主题
		r.loadTheme("tron")
		return
	}

	var theme Theme
	if err := json.Unmarshal(data, &theme); err != nil {
		return
	}

	r.theme = &theme
}

// ChangeTheme 切换主题
func (r *Boot) ChangeTheme(themeName string) {

	r.loadTheme(themeName)
	r.settings.Theme = themeName
}
