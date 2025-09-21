package network

import (
	"encoding/json"
	"fmt"
	"log"
	nt "net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-ping/ping"
	"github.com/shirou/gopsutil/v3/net"

	"edex-ui-golang/internal/models"
)

// Manager 网络管理器
type Manager struct {
	mu         sync.Mutex
	last       map[string]lastNICounter
	geoCache   map[string]*models.GeoLocation
	cacheMutex sync.RWMutex
}

type lastNICounter struct {
	sent uint64
	recv uint64
	ts   time.Time
}

// NewManager 创建新的网络管理器
func NewManager() *Manager {

	return &Manager{
		last:     make(map[string]lastNICounter),
		geoCache: make(map[string]*models.GeoLocation),
	}
}

// GetNetworkInfo 获取网络信息
func (m *Manager) GetNetworkInfo() *models.NetworkInfo {

	interfaces, err := net.Interfaces()
	if err != nil {
		log.Printf("获取网络接口信息失败: %v", err)
		return &models.NetworkInfo{
			Interfaces: []models.NetworkInterface{},
		}
	}

	var networkInterfaces []models.NetworkInterface
	for _, iface := range interfaces {
		// 获取接口地址
		addrs := iface.Addrs

		var ip4 string
		for _, addr := range addrs {
			// 使用字符串解析来获取IP地址
			addrStr := addr.String()

			// 解析地址字符串，格式通常是 "192.168.1.1/24" 或 "192.168.1.1"
			var ipStr string
			if idx := strings.Index(addrStr, "/"); idx != -1 {
				ipStr = addrStr[:idx]
			} else {
				ipStr = addrStr
			}

			// 解析IP地址
			ip := nt.ParseIP(ipStr)
			if ip == nil {
				continue
			}

			// 检查是否为IPv4且非回环地址
			if ip.To4() != nil && !ip.IsLoopback() {
				ip4 = ip.String()
				break
			}
		}

		// 判断是否为内部接口
		internal := ip4 == "" || ip4 == "127.0.0.1" || strings.HasPrefix(ip4, "169.254.")

		// 判断接口状态
		operState := "down"
		for _, flag := range iface.Flags {
			if flag == "up" {
				operState = "up"
				break
			}
		}

		networkInterfaces = append(networkInterfaces, models.NetworkInterface{
			Iface:     iface.Name,
			OperState: operState,
			Internal:  internal,
			IP4:       ip4,
			MAC:       iface.HardwareAddr,
		})
	}

	return &models.NetworkInfo{
		Interfaces: networkInterfaces,
	}
}

// GetExternalIP 获取外部 IP
func (m *Manager) GetExternalIP() *models.ExternalIP {
	// 使用多个服务尝试获取外部 IP

	services := []string{
		"https://api.ipify.org",
		"https://ipv4.icanhazip.com",
		"https://api.my-ip.io/ip",
		"https://checkip.amazonaws.com",
	}

	for _, service := range services {
		resp, err := http.Get(service)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			body := make([]byte, 64)
			n, err := resp.Body.Read(body)
			if err == nil && n > 0 {
				ip := strings.TrimSpace(string(body[:n]))
				// 验证 IP 地址格式
				if nt.ParseIP(ip) != nil {
					return &models.ExternalIP{
						IP: ip,
					}
				}
			}
		}
	}

	// 如果所有服务都失败，返回默认值
	return &models.ExternalIP{
		IP: "0.0.0.0",
	}
}

// Ping 执行 ping 操作
func (m *Manager) Ping(target string) *models.PingResult {

	pinger, err := ping.NewPinger(target)
	if err != nil {
		return &models.PingResult{Time: 0, Success: false, Error: err.Error()}
	}

	// 配置：发送1个包，总超时2秒
	pinger.Count = 1
	pinger.Timeout = 2 * time.Second
	pinger.Interval = 100 * time.Millisecond
	// Windows 非管理员时使用特权较低的模式
	pinger.SetPrivileged(true)

	// 运行一次，若特权失败则降级重试
	err = pinger.Run() // 阻塞直到完成
	if err != nil {
		// 降级为非特权模式（使用 UDP）
		pinger.SetPrivileged(false)
		err = pinger.Run()
		if err != nil {
			return &models.PingResult{Time: 0, Success: false, Error: err.Error()}
		}
	}

	stats := pinger.Statistics()
	// RTT 使用毫秒
	rttMs := float64(stats.AvgRtt.Microseconds()) / 1000.0
	// 兼容无响应的情况
	success := stats.PacketsRecv > 0
	if !success {
		return &models.PingResult{Time: 0, Success: false, Error: "无响应"}
	}
	return &models.PingResult{Time: rttMs, Success: true}
}

// GetNetworkConnections 获取网络连接信息
func (m *Manager) GetNetworkConnections() []models.NetworkConnection {
	// 使用 gopsutil 获取网络连接

	connections, err := net.Connections("all")
	if err != nil {
		log.Printf("获取网络连接失败: %v", err)
		return []models.NetworkConnection{}
	}

	var networkConnections []models.NetworkConnection
	for _, conn := range connections {
		// 只返回 ESTABLISHED 状态的连接
		if conn.Status == "ESTABLISHED" {
			networkConnections = append(networkConnections, models.NetworkConnection{
				PeerAddress: conn.Raddr.IP,
				State:       conn.Status,
			})
		}
	}

	return networkConnections
}

// GetNetworkStats 获取网络统计信息
func (m *Manager) GetNetworkStats(iface string) []models.NetworkStats {
	// 使用 gopsutil 获取网络统计

	ioCounters, err := net.IOCounters(true)
	if err != nil {
		log.Printf("获取网络统计失败: %v", err)
		return []models.NetworkStats{}
	}

	now := time.Now()
	m.mu.Lock()
	defer m.mu.Unlock()

	var stats []models.NetworkStats
	for _, counter := range ioCounters {
		// 如果指定了接口名称，只返回该接口的统计
		if iface != "" && counter.Name != iface {
			continue
		}

		prev, ok := m.last[counter.Name]
		var txSec, rxSec float64
		if ok {
			dt := now.Sub(prev.ts).Seconds()
			if dt > 0 {
				// 防止计数器回绕或重置导致的负值
				var dtx, drx int64
				dtx = int64(counter.BytesSent) - int64(prev.sent)
				drx = int64(counter.BytesRecv) - int64(prev.recv)
				if dtx < 0 {
					dtx = 0
				}
				if drx < 0 {
					drx = 0
				}
				txSec = float64(dtx) / dt
				rxSec = float64(drx) / dt
			}
		}

		// 更新缓存
		m.last[counter.Name] = lastNICounter{sent: counter.BytesSent, recv: counter.BytesRecv, ts: now}

		stats = append(stats, models.NetworkStats{
			TxSec:   txSec,
			RxSec:   rxSec,
			TxBytes: counter.BytesSent,
			RxBytes: counter.BytesRecv,
		})
	}

	return stats
}

// GetIPGeoLocation 获取IP地理位置信息
func (m *Manager) GetIPGeoLocation(ip string) *models.GeoLookupResult {
	// 验证IP地址格式

	parsedIP := nt.ParseIP(ip)
	if parsedIP == nil {
		return &models.GeoLookupResult{
			IP:    ip,
			Found: false,
			Error: "无效的IP地址格式",
		}
	}

	// 检查缓存
	m.cacheMutex.RLock()
	if cached, exists := m.geoCache[ip]; exists {
		m.cacheMutex.RUnlock()
		return &models.GeoLookupResult{
			IP:       ip,
			Location: cached,
			Found:    true,
		}
	}
	m.cacheMutex.RUnlock()

	// 查询地理位置
	location, err := m.queryGeoLocation(ip)
	if err != nil {
		return &models.GeoLookupResult{
			IP:    ip,
			Found: false,
			Error: err.Error(),
		}
	}

	// 缓存结果
	if location != nil {
		m.cacheMutex.Lock()
		m.geoCache[ip] = location
		m.cacheMutex.Unlock()
	}

	return &models.GeoLookupResult{
		IP:       ip,
		Location: location,
		Found:    location != nil,
	}
}

// queryGeoLocation 查询IP地理位置
func (m *Manager) queryGeoLocation(ip string) (*models.GeoLocation, error) {
	//局域网不获取地址

	ipObj := nt.ParseIP(ip)
	if ipObj == nil {
		return nil, fmt.Errorf("无效的IP地址")
	}
	// 检测是否为私有IP（局域网IP）
	if ipObj.IsPrivate() {
		return nil, fmt.Errorf("局域网IP不获取地理位置信息")
	}
	// 使用多个免费的地理位置API服务
	services := []string{
		"http://ip-api.com/json/" + ip,
		"https://ipapi.co/" + ip + "/json/",
		"https://freeipapi.com/api/json/" + ip,
	}

	for _, service := range services {
		location, err := m.queryService(service, ip)
		if err == nil && location != nil {
			return location, nil
		}
	}

	return nil, fmt.Errorf("所有地理位置查询服务都失败")
}

// queryService 查询单个地理位置服务
func (m *Manager) queryService(url, ip string) (*models.GeoLocation, error) {

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP状态码: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// 解析不同API的响应格式
	location := m.parseGeoResponse(result, ip)
	if location == nil {
		return nil, fmt.Errorf("无法解析地理位置响应")
	}

	return location, nil
}

// parseGeoResponse 解析地理位置API响应
func (m *Manager) parseGeoResponse(data map[string]interface{}, ip string) *models.GeoLocation {

	location := &models.GeoLocation{Query: ip}

	// 尝试解析ip-api.com格式
	if lat, ok := data["lat"].(float64); ok {
		location.Latitude = lat
	}
	if lon, ok := data["lon"].(float64); ok {
		location.Longitude = lon
	}
	if country, ok := data["country"].(string); ok {
		location.Country = country
	}
	if region, ok := data["regionName"].(string); ok {
		location.Region = region
	}
	if city, ok := data["city"].(string); ok {
		location.City = city
	}
	if timezone, ok := data["timezone"].(string); ok {
		location.Timezone = timezone
	}
	if isp, ok := data["isp"].(string); ok {
		location.ISP = isp
	}
	if org, ok := data["org"].(string); ok {
		location.Org = org
	}
	if as, ok := data["as"].(string); ok {
		location.AS = as
	}

	// 如果ip-api.com格式解析失败，尝试ipapi.co格式
	if location.Latitude == 0 && location.Longitude == 0 {
		if lat, ok := data["latitude"].(float64); ok {
			location.Latitude = lat
		}
		if lon, ok := data["longitude"].(float64); ok {
			location.Longitude = lon
		}
		if country, ok := data["country_name"].(string); ok {
			location.Country = country
		}
		if region, ok := data["region"].(string); ok {
			location.Region = region
		}
		if city, ok := data["city"].(string); ok {
			location.City = city
		}
		if timezone, ok := data["timezone"].(string); ok {
			location.Timezone = timezone
		}
		if isp, ok := data["org"].(string); ok {
			location.ISP = isp
		}
	}

	// 检查是否成功解析了经纬度
	if location.Latitude == 0 && location.Longitude == 0 {
		return nil
	}

	return location
}

// GetExternalIPWithGeo 获取外部IP及其地理位置信息
func (m *Manager) GetExternalIPWithGeo() *models.IPGeoInfo {

	externalIP := m.GetExternalIP()
	if externalIP.IP == "0.0.0.0" {
		return &models.IPGeoInfo{
			IP:      externalIP.IP,
			Status:  "error",
			Message: "无法获取外部IP地址",
		}
	}

	geoResult := m.GetIPGeoLocation(externalIP.IP)
	return &models.IPGeoInfo{
		IP:       externalIP.IP,
		Location: geoResult.Location,
		Status:   "success",
		Message:  "成功获取地理位置信息",
	}
}

// ClearGeoCache 清空地理位置缓存
func (m *Manager) ClearGeoCache() {

	m.cacheMutex.Lock()
	defer m.cacheMutex.Unlock()
	m.geoCache = make(map[string]*models.GeoLocation)
}
