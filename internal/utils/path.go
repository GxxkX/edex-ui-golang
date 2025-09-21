package utils

import (
	"os"
	"path/filepath"
	"runtime"
)

// GetAppDataDir 获取用户数据目录
func GetAppDataDir() (string, error) {

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	var appDataDir string
	switch runtime.GOOS {
	case "windows":
		appDataDir = filepath.Join(homeDir, "AppData", "Roaming", "edex-ui-golang")
	case "darwin":
		appDataDir = filepath.Join(homeDir, "Library", "Application Support", "edex-ui-golang")
	default:
		appDataDir = filepath.Join(homeDir, ".config", "edex-ui-golang")
	}

	return appDataDir, nil
}

// GetAppDir 获取应用目录
func GetAppDir() (string, error) {

	execPath, err := os.Executable()
	if err != nil {
		return "", err
	}
	return filepath.Dir(execPath), nil
}
