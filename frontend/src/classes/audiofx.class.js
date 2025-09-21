// Wails 版本的音频管理器
// 从 Electron audiofx.class.js 转换而来

class AudioManager {
    constructor() {
        this.audioEnabled = window.settings?.audio === true;
        this.volume = window.settings?.audioVolume || 1.0;
        this.disableFeedbackAudio = window.settings?.disableFeedbackAudio || false;
        
        // 音频文件路径（适配 Wails 资源管理）
        const audioBasePath = "assets/audio/";
        
        // 初始化音频对象
        this.sounds = {};
        
        if (this.audioEnabled) {
            // 反馈音频（如果启用）
            if (!this.disableFeedbackAudio) {
                this.sounds.stdout = this.createAudio(audioBasePath + "stdout.wav", 0.4);
                this.sounds.stdin = this.createAudio(audioBasePath + "stdin.wav", 0.4);
                this.sounds.folder = this.createAudio(audioBasePath + "folder.wav", 1.0);
                this.sounds.granted = this.createAudio(audioBasePath + "granted.wav", 1.0);
            }
            
            // 其他音频效果
            this.sounds.keyboard = this.createAudio(audioBasePath + "keyboard.wav", 1.0);
            this.sounds.theme = this.createAudio(audioBasePath + "theme.wav", 1.0);
            this.sounds.expand = this.createAudio(audioBasePath + "expand.wav", 1.0);
            this.sounds.panels = this.createAudio(audioBasePath + "panels.wav", 1.0);
            this.sounds.scan = this.createAudio(audioBasePath + "scan.wav", 1.0);
            this.sounds.denied = this.createAudio(audioBasePath + "denied.wav", 1.0);
            this.sounds.info = this.createAudio(audioBasePath + "info.wav", 1.0);
            this.sounds.alarm = this.createAudio(audioBasePath + "alarm.wav", 1.0);
            this.sounds.error = this.createAudio(audioBasePath + "error.wav", 1.0);
        }

        // 设置全局音量
        this.setVolume(this.volume);
        
        // 返回代理对象以保持兼容性
        return new Proxy(this, {
            get: (target, sound) => {
                if (sound in target.sounds) {
                    return target.sounds[sound];
                } else if (sound === 'volume') {
                    return target.volume;
                } else if (sound === 'setVolume') {
                    return target.setVolume.bind(target);
                } else {
                    // 返回空播放器以避免错误
                    return {
                        play: () => { return true; },
                        stop: () => { return true; },
                        pause: () => { return true; },
                        volume: () => { return 1.0; }
                    };
                }
            }
        });
    }

    // 创建音频对象
    createAudio(src, volume = 1.0) {
        const audio = new Audio(src);
        audio.volume = volume * this.volume;
        audio.preload = 'auto';
        
        // 添加错误处理
        audio.addEventListener('error', (e) => {
            console.warn(`音频加载失败: ${src}`, e);
        });
        
        return {
            play: () => {
                try {
                    audio.currentTime = 0; // 重置播放位置
                    return audio.play().catch(e => {
                        console.warn(`音频播放失败: ${src}`, e);
                        return Promise.resolve();
                    });
                } catch (e) {
                    console.warn(`音频播放错误: ${src}`, e);
                    return Promise.resolve();
                }
            },
            stop: () => {
                audio.pause();
                audio.currentTime = 0;
                return true;
            },
            pause: () => {
                audio.pause();
                return true;
            },
            volume: (vol) => {
                if (vol !== undefined) {
                    audio.volume = vol * this.volume;
                    return audio;
                }
                return audio.volume / this.volume;
            }
        };
    }

    // 设置全局音量
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // 更新所有音频的音量
        Object.values(this.sounds).forEach(sound => {
            if (sound.volume) {
                sound.volume(sound.volume() * this.volume);
            }
        });
    }

    // 更新设置
    updateSettings(settings) {
        this.audioEnabled = settings.audio === true;
        this.volume = settings.audioVolume || 1.0;
        this.disableFeedbackAudio = settings.disableFeedbackAudio || false;
        
        this.setVolume(this.volume);
    }
}

// 在 Wails 中，我们直接暴露到全局作用域，而不是使用 module.exports
window.AudioManager = AudioManager;
