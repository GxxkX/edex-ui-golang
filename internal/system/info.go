package system

import (
	"log"
	"os/user"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/distatus/battery"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/process"

	"edex-ui-golang/internal/models"
)

// InfoProvider 系统信息提供者
type InfoProvider struct {
	mu           sync.Mutex
	lastCPUTimes []cpu.TimesStat
	lastSampleAt time.Time
}

// NewInfoProvider 创建新的系统信息提供者
func NewInfoProvider() *InfoProvider {
	return &InfoProvider{}
}

func (p *InfoProvider) GetCurrentUsername() string {

	u, err := user.Current()
	if err != nil || u == nil || u.Username == "" {
		return "User"
	}
	name := u.Username
	if strings.Contains(name, "\\") {
		parts := strings.Split(name, "\\")
		name = parts[len(parts)-1]
	}
	return name
}

// GetSystemInfo 获取系统信息
func (p *InfoProvider) GetSystemInfo() *models.SystemInfo {

	hostInfo, err := host.Info()
	if err != nil {
		log.Printf("获取系统信息失败: %v", err)
		// 回退到基本系统信息
		return &models.SystemInfo{
			OS: runtime.GOOS,
		}
	}

	return &models.SystemInfo{
		OS: hostInfo.OS,
	}
}

// GetUptime 获取系统运行时间（秒）
func (p *InfoProvider) GetUptime() float64 {

	hostInfo, err := host.Info()
	if err != nil {
		log.Printf("获取系统运行时间失败: %v", err)
		return 0.0
	}
	return float64(hostInfo.Uptime)
}

// GetBatteryInfo 获取电池信息
func (p *InfoProvider) GetBatteryInfo() *models.BatteryInfo {
	// 使用 gopsutil 获取电池信息

	batteries, err := battery.GetAll()
	if err != nil || len(batteries) == 0 {
		// 没有电池或获取失败，返回默认值
		return &models.BatteryInfo{
			HasBattery:  false,
			IsCharging:  false,
			ACConnected: true,
			Percent:     100.0,
		}
	}

	battery := batteries[0] // 取第一个电池
	return &models.BatteryInfo{
		HasBattery:  true,
		IsCharging:  true,
		ACConnected: true,
		Percent:     battery.Current,
	}
}

// GetHardwareInfo 获取硬件信息
func (p *InfoProvider) GetHardwareInfo() *models.HardwareInfo {

	hostInfo, err := host.Info()
	if err != nil {
		log.Printf("获取硬件信息失败: %v", err)
		return &models.HardwareInfo{
			Manufacturer: "Unknown",
			Model:        "Unknown",
			ChassisType:  "Unknown",
		}
	}
	return &models.HardwareInfo{
		Manufacturer: hostInfo.Platform,
		Model:        hostInfo.KernelArch,
		ChassisType:  hostInfo.OS,
	}
}

// GetCPUInfo 获取 CPU 信息
func (p *InfoProvider) GetCPUInfo() *models.CPUInfo {

	cpuInfo, err := cpu.Info()
	if err != nil || len(cpuInfo) == 0 {
		log.Printf("获取 CPU 信息失败: %v", err)
		// 回退到基本信息
		cores := runtime.NumCPU()
		return &models.CPUInfo{
			Manufacturer: "Unknown",
			Brand:        "Unknown",
			Cores:        cores,
			Speed:        0.0,
			SpeedMax:     0.0,
		}
	}

	// 取第一个 CPU 的信息
	info := cpuInfo[0]
	cores := runtime.NumCPU()

	return &models.CPUInfo{
		Manufacturer: info.VendorID,
		Brand:        info.ModelName,
		Cores:        cores,
		Speed:        info.Mhz / 1000.0, // 转换为 GHz
		SpeedMax:     info.Mhz / 1000.0, // 使用当前频率作为最大频率
	}
}

// GetCPULoad 获取 CPU 负载信息
func (p *InfoProvider) GetCPULoad() *models.CPULoad {
	// 优先使用两次采样之间的 CPU times 计算，避免 0ms 采样在部分平台返回瞬时或不稳定值

	curTimes, err := cpu.Times(true)
	if err != nil || len(curTimes) == 0 {
		// 回退方案：使用一个短间隔百分比
		cpuPercents, err2 := cpu.Percent(200*time.Millisecond, true)
		if err2 != nil {
			log.Printf("获取 CPU 负载失败: %v", err2)
			cores := runtime.NumCPU()
			empty := make([]models.CPUUsage, cores)
			return &models.CPULoad{CPUs: empty}
		}
		cpus := make([]models.CPUUsage, len(cpuPercents))
		for i, percent := range cpuPercents {
			cpus[i] = models.CPUUsage{Load: percent}
		}
		return &models.CPULoad{CPUs: cpus}
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	// 首次采样：仅保存，返回 0
	if p.lastCPUTimes == nil || len(p.lastCPUTimes) != len(curTimes) {
		p.lastCPUTimes = curTimes
		p.lastSampleAt = time.Now()
		zeros := make([]models.CPUUsage, len(curTimes))
		return &models.CPULoad{CPUs: zeros}
	}

	// 计算每个核心的 busy/total 差值百分比
	cpus := make([]models.CPUUsage, len(curTimes))
	for i := range curTimes {
		prev := p.lastCPUTimes[i]
		cur := curTimes[i]

		// total = 所有字段之和
		prevTotal := prev.User + prev.System + prev.Idle + prev.Nice + prev.Iowait + prev.Irq + prev.Softirq + prev.Steal + prev.Guest + prev.GuestNice
		curTotal := cur.User + cur.System + cur.Idle + cur.Nice + cur.Iowait + cur.Irq + cur.Softirq + cur.Steal + cur.Guest + cur.GuestNice
		dTotal := curTotal - prevTotal
		if dTotal <= 0 {
			cpus[i] = models.CPUUsage{Load: 0}
			continue
		}
		// busy = total - idle 系
		prevBusy := prevTotal - prev.Idle - prev.Iowait
		curBusy := curTotal - cur.Idle - cur.Iowait
		dBusy := curBusy - prevBusy
		load := (dBusy / dTotal) * 100.0
		if load < 0 {
			load = 0
		}
		if load > 100 {
			load = 100
		}
		cpus[i] = models.CPUUsage{Load: load}
	}

	// 更新缓存
	p.lastCPUTimes = curTimes
	p.lastSampleAt = time.Now()

	return &models.CPULoad{CPUs: cpus}
}

// GetCPUSpeed 获取 CPU 速度信息
func (p *InfoProvider) GetCPUSpeed() *models.CPUSpeed {

	cpuInfo, err := cpu.Info()
	if err != nil || len(cpuInfo) == 0 {
		log.Printf("获取 CPU 速度失败: %v", err)
		return &models.CPUSpeed{
			Speed:    0.0,
			SpeedMax: 0.0,
		}
	}

	info := cpuInfo[0]
	speed := info.Mhz / 1000.0 // 转换为 GHz

	return &models.CPUSpeed{
		Speed:    speed,
		SpeedMax: speed, // 使用当前频率作为最大频率
	}
}

// GetProcessCount 获取进程数量
func (p *InfoProvider) GetProcessCount() *models.ProcessCount {

	processes, err := process.Processes()
	if err != nil {
		log.Printf("获取进程数量失败: %v", err)
		return &models.ProcessCount{
			Count: 0,
		}
	}

	return &models.ProcessCount{
		Count: len(processes),
	}
}

// GetMemoryInfo 获取内存信息
func (p *InfoProvider) GetMemoryInfo() *models.MemoryInfo {

	memInfo, err := mem.VirtualMemory()
	if err != nil {
		log.Printf("获取内存信息失败: %v", err)
		return &models.MemoryInfo{
			Total:     0,
			Free:      0,
			Used:      0,
			Active:    0,
			Available: 0,
			SwapTotal: 0,
			SwapUsed:  0,
		}
	}

	swapInfo, err := mem.SwapMemory()
	if err != nil {
		log.Printf("获取交换分区信息失败: %v", err)
		swapInfo = &mem.SwapMemoryStat{
			Total: 0,
			Used:  0,
		}
	}

	return &models.MemoryInfo{
		Total:     memInfo.Total,
		Free:      memInfo.Free,
		Used:      memInfo.Used,
		Active:    memInfo.Active,
		Available: memInfo.Available,
		SwapTotal: swapInfo.Total,
		SwapUsed:  swapInfo.Used,
	}
}

// GetProcessList 获取进程列表
func (p *InfoProvider) GetProcessList() *models.ProcessList {

	processes, err := process.Processes()
	if err != nil {
		log.Printf("获取进程列表失败: %v", err)
		return &models.ProcessList{
			List: []models.ProcessInfo{},
		}
	}

	var processList []models.ProcessInfo
	for _, p := range processes {
		// 获取进程基本信息
		name, _ := p.Name()
		user, _ := p.Username()
		cpuPercent, _ := p.CPUPercent()
		memInfo, _ := p.MemoryInfo()
		status, _ := p.Status()
		createTime, _ := p.CreateTime()

		// 计算内存使用百分比
		memPercent := 0.0
		if memInfo != nil {
			memInfo, err := mem.VirtualMemory()
			if err == nil && memInfo.Total > 0 {
				memPercent = float64(memInfo.Used) / float64(memInfo.Total) * 100
			}
		}

		// 转换状态
		state := "R" // 默认运行状态
		if len(status) > 0 {
			state = string(status[0])
		}

		// 格式化开始时间
		started := time.Unix(createTime/1000, 0).Format(time.RFC3339)

		processList = append(processList, models.ProcessInfo{
			PID:     int(p.Pid),
			Name:    name,
			User:    user,
			CPU:     cpuPercent,
			Mem:     memPercent,
			State:   state,
			Started: started,
		})
	}

	return &models.ProcessList{
		List: processList,
	}
}
