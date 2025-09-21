package system

import (
	"log"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"

	"github.com/shirou/gopsutil/v3/host"

	"edex-ui-golang/internal/models"
)

// GetCPUTemperature 获取 CPU 温度信息
func (p *InfoProvider) GetCPUTemperature() *models.CPUTemperature {
	// 首先尝试使用 gopsutil 的传感器温度功能

	temps, err := host.SensorsTemperatures()
	if err == nil && len(temps) > 0 {
		// 查找CPU相关的温度传感器
		maxTemp := 0.0
		for _, temp := range temps {
			// 检查传感器名称是否包含CPU相关关键词
			sensorName := strings.ToLower(temp.SensorKey)
			if strings.Contains(sensorName, "cpu") ||
				strings.Contains(sensorName, "core") ||
				strings.Contains(sensorName, "package") ||
				strings.Contains(sensorName, "coretemp") {
				if temp.Temperature > maxTemp {
					maxTemp = temp.Temperature
				}
			}
		}

		if maxTemp > 0 {
			return &models.CPUTemperature{
				Max: maxTemp,
			}
		}
	}

	// 如果 gopsutil 方法失败，尝试平台特定的方法
	switch runtime.GOOS {
	case "linux":
		return p.getCPUTemperatureLinux()
	case "windows":
		return p.getCPUTemperatureWindows()
	case "darwin":
		return p.getCPUTemperatureDarwin()
	default:
		log.Printf("不支持的操作系统: %s", runtime.GOOS)
		return &models.CPUTemperature{
			Max: 0.0,
		}
	}
}

// getCPUTemperatureLinux 在Linux系统上获取CPU温度
func (p *InfoProvider) getCPUTemperatureLinux() *models.CPUTemperature {
	// 尝试读取 thermal zone 文件

	thermalPaths := []string{
		"/sys/class/thermal/thermal_zone0/temp",
		"/sys/class/thermal/thermal_zone1/temp",
		"/sys/class/thermal/thermal_zone2/temp",
		"/sys/devices/virtual/thermal/thermal_zone0/temp",
	}

	var maxTemp float64
	for _, path := range thermalPaths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}

		tempStr := strings.TrimSpace(string(data))
		temp, err := strconv.ParseFloat(tempStr, 64)
		if err != nil {
			continue
		}

		// 温度值通常需要除以1000转换为摄氏度
		tempC := temp / 1000.0
		if tempC > maxTemp && tempC < 200 { // 合理的温度范围检查
			maxTemp = tempC
		}
	}

	if maxTemp > 0 {
		return &models.CPUTemperature{
			Max: maxTemp,
		}
	}

	// 如果 thermal zone 方法失败，尝试使用 sensors 命令
	return p.getCPUTemperatureFromCommand("sensors", "-u")
}

// getCPUTemperatureWindows 在Windows系统上获取CPU温度
func (p *InfoProvider) getCPUTemperatureWindows() *models.CPUTemperature {
	// Windows 上可以使用 wmic 命令获取温度

	return p.getCPUTemperatureFromCommand("wmic", "/namespace:\\\\root\\wmi", "path", "MSAcpi_ThermalZoneTemperature", "get", "CurrentTemperature", "/value")
}

// getCPUTemperatureDarwin 在macOS系统上获取CPU温度
func (p *InfoProvider) getCPUTemperatureDarwin() *models.CPUTemperature {
	// macOS 上可以使用 osx-cpu-temp 或 powermetrics 命令
	// 首先尝试 osx-cpu-temp

	result := p.getCPUTemperatureFromCommand("osx-cpu-temp")
	if result.Max > 0 {
		return result
	}

	// 如果 osx-cpu-temp 不可用，尝试 powermetrics
	return p.getCPUTemperatureFromCommand("powermetrics", "-n", "1", "-i", "1000", "--samplers", "smc")
}

// getCPUTemperatureFromCommand 通过系统命令获取CPU温度
func (p *InfoProvider) getCPUTemperatureFromCommand(command string, args ...string) *models.CPUTemperature {

	cmd := exec.Command(command, args...)
	output, err := cmd.Output()
	if err != nil {
		log.Printf("执行温度命令失败: %v", err)
		return &models.CPUTemperature{
			Max: 0.0,
		}
	}

	outputStr := string(output)
	var maxTemp float64

	// 解析不同命令的输出格式
	if command == "sensors" {
		// sensors 命令输出格式: Core 0: +45.0°C
		lines := strings.Split(outputStr, "\n")
		for _, line := range lines {
			if strings.Contains(line, "Core") || strings.Contains(line, "Package") {
				// 提取温度值
				parts := strings.Fields(line)
				for _, part := range parts {
					if strings.Contains(part, "°C") {
						tempStr := strings.TrimSuffix(part, "°C")
						if temp, err := strconv.ParseFloat(tempStr, 64); err == nil {
							if temp > maxTemp {
								maxTemp = temp
							}
						}
					}
				}
			}
		}
	} else if command == "wmic" {
		// wmic 命令输出格式: CurrentTemperature=3200
		lines := strings.Split(outputStr, "\n")
		for _, line := range lines {
			if strings.Contains(line, "CurrentTemperature=") {
				parts := strings.Split(line, "=")
				if len(parts) > 1 {
					if temp, err := strconv.ParseFloat(parts[1], 64); err == nil {
						// Windows 温度值需要除以10转换为摄氏度
						tempC := temp / 10.0
						if tempC > maxTemp {
							maxTemp = tempC
						}
					}
				}
			}
		}
	} else if command == "osx-cpu-temp" {
		// osx-cpu-temp 输出格式: 45.0
		tempStr := strings.TrimSpace(outputStr)
		if temp, err := strconv.ParseFloat(tempStr, 64); err == nil {
			maxTemp = temp
		}
	}

	return &models.CPUTemperature{
		Max: maxTemp,
	}
}
