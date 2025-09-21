package terminal

import (
	"context"
	"edex-ui-golang/internal/utils"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"edex-ui-golang/internal/models"
	"github.com/gorilla/websocket"
	"github.com/iyzyi/aiopty/pty"
)

// WebSocketManager WebSocket管理器
type WebSocketManager struct {
	manager  *Manager
	server   *http.Server
	sessions map[string]*TerminalSession
	upgrader websocket.Upgrader
	mu       sync.RWMutex
}

// TerminalSession 终端会话
type TerminalSession struct {
	ID      string
	Process *exec.Cmd
	mu      sync.RWMutex
	closed  bool
	// 统一通过 PTY 交互
	ptyInst     *pty.Pty
	ProcessName string
}

// wsBinaryWriter 将 WebSocket 作为 io.Writer，按二进制帧发送
type wsBinaryWriter struct {
	conn *websocket.Conn
}

func (w *wsBinaryWriter) Write(p []byte) (int, error) {

	if err := w.conn.WriteMessage(websocket.BinaryMessage, p); err != nil {
		return 0, err
	}
	return len(p), nil
}

// NewWebSocketManager 创建WebSocket管理器
func NewWebSocketManager(manager *Manager) *WebSocketManager {

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	return &WebSocketManager{
		manager:  manager,
		sessions: make(map[string]*TerminalSession),
		upgrader: upgrader,
	}
}

// StartWebSocketServer 启动WebSocket服务器
func (wsm *WebSocketManager) StartWebSocketServer(port int) error {
	// WebSocket端点
	mux := http.NewServeMux()

	mux.HandleFunc("/webterminal", wsm.handleWebSocket)
	wsm.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: mux,
	}

	go func() {

		log.Printf("WebSocket终端服务器启动在端口 %d", port)
		if err := wsm.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("WebSocket服务器错误: %v", err)
		}
	}()

	return nil
}

// StopWebSocketServer 停止WebSocket服务器
func (wsm *WebSocketManager) StopWebSocketServer() error {

	if wsm.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return wsm.server.Shutdown(ctx)
	}
	return nil
}

// handleWebSocket 处理WebSocket连接
func (wsm *WebSocketManager) handleWebSocket(w http.ResponseWriter, r *http.Request) {

	conn, err := wsm.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket升级失败: %v", err)
		return
	}
	defer conn.Close()

	sessionID := r.RemoteAddr + "_" + fmt.Sprintf("%d", time.Now().UnixNano())
	log.Printf("新的WebSocket连接: %s", sessionID)

	// 创建终端会话
	session := &TerminalSession{
		ID: sessionID,
	}

	// 启动终端进程
	if err := session.startProcess(wsm.manager.terminal); err != nil {
		log.Printf("启动终端进程失败: %v", err)
		conn.Close()
		return
	}

	// 存储会话
	wsm.mu.Lock()
	wsm.sessions[sessionID] = session
	wsm.mu.Unlock()

	// 启动进程输出读取循环
	go session.streamProcessOutput(conn)

	// 处理WebSocket消息
	for {
		msgType, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket错误: %v", err)
			}
			break
		}

		// 优先检测 resize 控制序列 ESC[8;rows;cols t
		data := string(message)
		if strings.HasPrefix(data, "\x1b[8;") && strings.HasSuffix(data, "t") {
			body := strings.TrimPrefix(data, "\x1b[8;")
			body = strings.TrimSuffix(body, "t")
			parts := strings.Split(body, ";")
			if len(parts) == 2 && session.ptyInst != nil {
				if r, errR := strconv.Atoi(strings.TrimSpace(parts[0])); errR == nil {
					if c, errC := strconv.Atoi(strings.TrimSpace(parts[1])); errC == nil {
						_ = session.ptyInst.SetSize(&pty.WinSize{Rows: uint16(r), Cols: uint16(c)})
						continue
					}
				}
			}
		}

		// 写入进程输入（PTY）：
		// - 文本帧：若不是 resize 控制序列，则作为输入写入 PTY
		// - 二进制帧：直接写入 PTY
		if session.ptyInst != nil {
			if msgType == websocket.BinaryMessage {
				_, _ = session.ptyInst.Write(message)
			} else if msgType == websocket.TextMessage {
				// 已在上方对 resize 做了拦截并 continue；其他文本即为正常输入
				_, _ = session.ptyInst.Write(message)
			}
		}
	}

	// 清理会话
	wsm.mu.Lock()
	if session, exists := wsm.sessions[sessionID]; exists {
		session.close()
		delete(wsm.sessions, sessionID)
	}
	wsm.mu.Unlock()

	log.Printf("WebSocket连接断开: %s", sessionID)
}

// startProcess 启动终端进程（统一使用 PTY，包括 Windows）
func (ts *TerminalSession) startProcess(terminal *models.Terminal) error {
	// 解析 shell 与参数

	shell := terminal.Shell
	shellType := pty.AUTO
	AppDir, _ := utils.GetAppDir()
	var args []string
	if terminal.Params != "" {
		args = strings.Fields(terminal.Params)
	} else {
		switch runtime.GOOS {
		case "windows":
			shell = "cmd.exe"
			args = []string{"cmd.exe", "/c", "cd", "/d", AppDir, "&&", "powershell.exe"}
		case "linux", "darwin":
			shell = "bash"
		}
	}
	log.Println(terminal.Cwd)
	// 生成 PTY 启动参数
	opt := &pty.Options{
		Path: shell,
		Args: args,
		Dir:  "",
		Env:  nil,
		Size: &pty.WinSize{Cols: 120, Rows: 20},
		Type: shellType,
	}
	// 打开 PTY
	p, err := pty.OpenWithOptions(opt)
	if err != nil {
		return fmt.Errorf("启动 PTY 失败: %v", err)
	}
	// 记录 PTY 与底层命令（若可获取）
	ts.ptyInst = p
	return nil
}

// streamProcessOutput 将子进程输出以二进制帧写入到 WebSocket
func (ts *TerminalSession) streamProcessOutput(conn *websocket.Conn) {
	// 通过 io.Copy 持续将 PTY 输出转发为 WebSocket 二进制帧

	writer := &wsBinaryWriter{conn: conn}
	buffer := make([]byte, 4096)
	if _, err := io.CopyBuffer(writer, ts.ptyInst, buffer); err != nil && err != io.EOF {
		if !ts.closed {
			log.Printf("转发 PTY 到 WebSocket 失败: %v", err)
		}
	}
}

// close 关闭会话
func (ts *TerminalSession) close() {

	ts.mu.Lock()
	defer ts.mu.Unlock()

	if ts.closed {
		return
	}

	ts.closed = true

	// 关闭 PTY
	if ts.ptyInst != nil {
		ts.ptyInst.Close()
	}

	// 终止进程
	if ts.Process != nil {
		ts.Process.Process.Kill()
		ts.Process.Wait()
	}
}
