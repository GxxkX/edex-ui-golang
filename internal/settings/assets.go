package settings

import (
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"

	"edex-ui-golang/internal/utils"
)

// SetupDirectories 设置必要的目录
func (m *Manager) SetupDirectories() error {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	// 创建用户数据目录
	if err := os.MkdirAll(AppDataDir, 0755); err != nil {
		return err
	}

	// 创建子目录
	dirs := []string{"themes", "keyboards", "fonts"}
	for _, dir := range dirs {
		dirPath := filepath.Join(AppDataDir, dir)
		if err := os.MkdirAll(dirPath, 0755); err != nil {
			return err
		}
	}

	return nil
}

// CopyDefaultAssets 复制默认资源
func (m *Manager) CopyDefaultAssets() error {

	AppDataDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	// 获取应用资源目录
	appDir, err := utils.GetAppDir()
	if err != nil {
		return err
	}

	// 复制主题文件
	themesDir := filepath.Join(AppDataDir, "themes")
	innerThemesDir := filepath.Join(appDir, "themes")
	if err := m.copyDirectory(innerThemesDir, themesDir); err != nil {
		log.Printf("复制主题文件失败: %v", err)
	}

	// 复制键盘布局文件
	kblayoutsDir := filepath.Join(AppDataDir, "keyboards")
	innerKblayoutsDir := filepath.Join(appDir, "kb_layouts")
	if err := m.copyDirectory(innerKblayoutsDir, kblayoutsDir); err != nil {
		log.Printf("复制键盘布局文件失败: %v", err)
	}

	// 复制字体文件
	fontsDir := filepath.Join(AppDataDir, "fonts")
	innerFontsDir := filepath.Join(appDir, "fonts")
	if err := m.copyDirectory(innerFontsDir, fontsDir); err != nil {
		log.Printf("复制字体文件失败: %v", err)
	}

	return nil
}

// copyDirectory 复制目录
func (m *Manager) copyDirectory(src, dst string) error {
	// 检查源目录是否存在

	if _, err := os.Stat(src); os.IsNotExist(err) {
		log.Printf("源目录不存在，跳过复制: %s", src)
		return nil
	}

	log.Printf("开始复制目录: %s -> %s", src, dst)

	var fileCount, dirCount int
	err := filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}

		dstPath := filepath.Join(dst, relPath)

		if d.IsDir() {
			dirCount++
			log.Printf("创建目录: %s", dstPath)
			return os.MkdirAll(dstPath, 0755)
		}

		// 复制文件
		fileCount++
		log.Printf("复制文件: %s -> %s", path, dstPath)
		data, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("读取源文件失败 %s: %v", path, err)
		}

		// 安全地写入文件
		if err := utils.SafeWriteFile(dstPath, data, 0644); err != nil {
			return fmt.Errorf("写入目标文件失败 %s: %v", dstPath, err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("复制目录失败 %s -> %s: %v", src, dst, err)
	}

	log.Printf("目录复制完成: %s -> %s (文件: %d, 目录: %d)", src, dst, fileCount, dirCount)
	return nil
}
