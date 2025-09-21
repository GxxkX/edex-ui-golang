package terminal

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strconv"
	"sync"

	"edex-ui-golang/internal/models"
	"edex-ui-golang/internal/utils"
)

// Manager 终端管理器
type Manager struct {
	settings         *models.Settings
	terminal         *models.Terminal
	extraTerminals   map[int]*models.Terminal
	websocketManager *WebSocketManager
	mu               sync.RWMutex
	ctx              context.Context
	cancel           context.CancelFunc
}

// NewManager 创建新的终端管理器
func NewManager(settings *models.Settings) *Manager {

	ctx, cancel := context.WithCancel(context.Background())
	manager := &Manager{
		settings:       settings,
		extraTerminals: make(map[int]*models.Terminal),
		ctx:            ctx,
		cancel:         cancel,
	}

	// 创建WebSocket管理器
	manager.websocketManager = NewWebSocketManager(manager)

	return manager
}

// InitializeTerminal 初始化终端
func (m *Manager) InitializeTerminal() error {

	if m.settings == nil {
		return fmt.Errorf("设置未加载")
	}

	// 解析shell路径
	shellPath, err := exec.LookPath(m.settings.Shell)
	if err != nil {
		return fmt.Errorf("找不到shell: %s", m.settings.Shell)
	}

	log.Printf("找到shell: %s", shellPath)

	// 检查工作目录
	if _, err := os.Stat(m.settings.Cwd); os.IsNotExist(err) {
		return fmt.Errorf("配置的工作目录不存在: %s", m.settings.Cwd)
	}

	// 创建终端
	terminal := &models.Terminal{
		Role:   "server",
		Shell:  shellPath,
		Params: m.settings.ShellArgs,
		Cwd:    m.settings.Cwd,
		Env:    m.getCleanEnv(),
		Port:   m.settings.Port,
	}

	m.terminal = terminal

	// 启动WebSocket服务器
	if err := m.websocketManager.StartWebSocketServer(m.settings.Port); err != nil {
		return fmt.Errorf("启动WebSocket服务器失败: %v", err)
	}

	log.Println("终端后端已初始化")

	return nil
}

func (m *Manager) getCleanEnv() map[string]string {

	// 复制当前环境变量
	env := make(map[string]string)

	for _, e := range os.Environ() {
		if key, value, found := utils.Cut(e, "="); found {
			env[key] = value
		}
	}

	// 设置终端相关环境变量
	env["TERM"] = "xterm-256color"
	env["COLORTERM"] = "truecolor"
	env["TERM_PROGRAM"] = "eDEX-UI"
	env["TERM_PROGRAM_VERSION"] = "1.0.0"

	return env
}

func (m *Manager) SpawnTTY() (string, error) {

	// 查找可用的端口
	m.mu.Lock()
	defer m.mu.Unlock()

	var port int
	for i := 0; i < 4; i++ {
		checkPort := m.settings.Port + 2 + i
		if _, exists := m.extraTerminals[checkPort]; !exists {
			port = checkPort
			break
		}
	}

	if port == 0 {
		return "", fmt.Errorf("错误: 已达到最大TTY数量")
	}

	// 创建新终端
	terminal := &models.Terminal{
		Role:   "server",
		Shell:  m.terminal.Shell,
		Params: m.terminal.Params,
		Cwd:    m.terminal.Cwd,
		Env:    m.terminal.Env,
		Port:   port,
	}

	m.extraTerminals[port] = terminal
	log.Printf("新终端后端已在端口 %d 初始化", port)

	return strconv.Itoa(port), nil
}

func (m *Manager) Close() error {
	// 停止WebSocket服务器
	m.cancel()

	if m.websocketManager != nil {
		return m.websocketManager.StopWebSocketServer()
	}

	return nil
}
