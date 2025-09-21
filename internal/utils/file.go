package utils

import (
	"fmt"

	"log"
	"os"
	"path/filepath"
)

// ensureDir 确保目录存在，如果不存在则创建
func EnsureDir(filePath string) error {

	dir := filepath.Dir(filePath)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		log.Printf("创建目录: %s", dir)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("无法创建目录 %s: %v", dir, err)
		}
		log.Printf("目录创建成功: %s", dir)
	}
	return nil
}

// SafeWriteFile 安全地写入文件，确保目录存在并处理错误
func SafeWriteFile(filePath string, data []byte, perm os.FileMode) error {
	// 确保目录存在

	if err := EnsureDir(filePath); err != nil {
		return err
	}

	// 写入文件
	if err := os.WriteFile(filePath, data, perm); err != nil {
		return fmt.Errorf("写入文件失败 %s: %v", filePath, err)
	}

	log.Printf("文件写入成功: %s", filePath)
	return nil
}

// Cut 字符串分割函数
func Cut(s, sep string) (before, after string, found bool) {

	var i int
	var j int
	if i = len(sep); i == 0 {
		return s, "", true
	}
	if j = len(s); j < i {
		return s, "", false
	}
	for k := 0; k <= j-i; k++ {
		if s[k:k+i] == sep {
			return s[:k], s[k+i:], true
		}
	}
	return s, "", false
}
