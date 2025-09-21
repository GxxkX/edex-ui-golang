class MediaPlayer {
    constructor(opts) {
        this.modalElementId = "modal_" + opts.modalId;
        this.type = opts.type;
        this.path = opts.path;
        
        // 在 Wails 中，我们需要从 Go 后端获取媒体文件数据
        this.mediaData = null;
        this.volumeDrag = false;
        this.fullscreenVisible = true;
        this.fullscreenTimeout = null;
        
        // 初始化媒体播放器
        this.initMediaPlayer();
    }

    // 初始化媒体播放器
    async initMediaPlayer() {
        try {
            // 从 Go 后端获取媒体文件数据
            this.mediaData = await this.getMediaDataFromBackend();
            
            if (!this.mediaData) {
                throw new Error('无法获取媒体文件数据');
            }

            // 设置媒体源
            this.setupMediaSource();
            
            // 初始化 UI 控件
            this.setupControls();
            
        } catch (error) {
            console.error('媒体播放器初始化失败:', error);
            this.showError('媒体文件加载失败');
        }
    }

    // 从 Go 后端获取媒体文件数据
    async getMediaDataFromBackend() {
        try {
            // 调用 Go 后端获取媒体文件数据
            const mediaData = await window.go.main.App.GetMediaData(this.path);
            return mediaData;
        } catch (error) {
            console.error('从后端获取媒体数据失败:', error);
            return null;
        }
    }

    // 设置媒体源
    setupMediaSource() {
        const media = document.getElementById(this.modalElementId).querySelector(this.type);
        if (!media) return;

        // 设置媒体源
        if (this.mediaData && this.mediaData.data) {
            // 如果是 base64 数据，创建 blob URL
            const binaryString = atob(this.mediaData.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: this.mediaData.mimeType });
            const url = URL.createObjectURL(blob);
            media.src = url;
        } else if (this.mediaData && this.mediaData.url) {
            // 如果是 URL
            media.src = this.mediaData.url;
        } else {
            // 直接使用路径
            media.src = this.path;
        }
    }

    // 设置控件
    setupControls() {
        const modalElement = document.getElementById(this.modalElementId);
        if (!modalElement) return;

        // 获取控件元素
        this.mediaContainer = modalElement.querySelector(".media_container");
        this.media = modalElement.querySelector(this.type);
        this.mediaControls = modalElement.querySelector(".media_controls");
        this.playpause = modalElement.querySelector(".playpause");
        this.volumeIcon = modalElement.querySelector(".volume_icon");
        this.volume = modalElement.querySelector(".volume");
        this.volumeBar = modalElement.querySelector(".volume_bar");
        this.progress = modalElement.querySelector(".progress");
        this.progressBar = modalElement.querySelector(".progress_bar");
        this.fullscreen = modalElement.querySelector(".fs");
        this.mediaTime = modalElement.querySelector(".media_time");

        if (!this.media) return;

        // 设置初始状态
        this.media.controls = false;
        if (this.mediaControls) {
            this.mediaControls.setAttribute("data-state", "visible");
        }

        // 绑定事件监听器
        this.bindEvents();
    }

    // 绑定事件监听器
    bindEvents() {
        if (!this.media) return;

        // 媒体事件
        this.media.addEventListener("loadedmetadata", () => {
            if (this.mediaTime) {
                this.mediaTime.textContent = "00:00:00";
            }
        });

        this.media.addEventListener("play", () => {
            this.changeButtonState("playpause");
        });

        this.media.addEventListener("pause", () => {
            this.changeButtonState("playpause");
        });

        this.media.addEventListener("timeupdate", () => {
            if (this.progressBar && this.media.duration) {
                this.progressBar.style.width = Math.floor((this.media.currentTime / this.media.duration) * 100) + "%";
            }
            if (this.mediaTime) {
                this.mediaTime.textContent = this.mediaTimeToHMS(this.media.currentTime);
            }
        });

        // 控件事件
        if (this.volume) {
            this.volume.addEventListener("mousedown", (e) => {
                this.volumeDrag = true;
                this.media.muted = false;
                this.updateVolume(e.pageX);
            });
        }

        if (this.volumeIcon) {
            this.volumeIcon.addEventListener("click", () => {
                this.media.muted = !this.media.muted;
                this.updateVolumeIcon(this.media.volume);
            });
        }

        if (this.progress) {
            this.progress.addEventListener("click", (e) => {
                const pos = (e.pageX - (this.progress.offsetLeft + this.progress.offsetParent.offsetLeft)) / this.progress.offsetWidth;
                this.media.currentTime = pos * this.media.duration;
            });
        }

        if (this.playpause) {
            this.playpause.addEventListener("click", () => {
                (this.media.paused || this.media.ended) ? this.media.play() : this.media.pause();
            });
        }

        if (this.fullscreen) {
            this.fullscreen.addEventListener("click", () => {
                this.handleFullscreen();
            });
        }

        // 全局事件
        document.addEventListener("fullscreenchange", () => {
            this.setFullscreenData(!!(document.fullscreenElement));
        });

        document.addEventListener("mouseup", (e) => {
            if (this.volumeDrag) {
                this.volumeDrag = false;
                this.updateVolume(e.pageX);
            }
        });

        document.addEventListener("mousemove", (e) => {
            if (this.volumeDrag) {
                this.updateVolume(e.pageX);
            }
        });
    }

    // 改变按钮状态
    changeButtonState(type) {
        if (!this.playpause) return;

        const iconcolor = `rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b})`;
        
        if (this.media.paused || this.media.ended) {
            this.playpause.setAttribute("data-state", "play");
            this.playpause.innerHTML = `
                <svg viewBox="0 0 24 24" fill="${iconcolor}">
                    <path d="M8 5v14l11-7z"/>
                </svg>`;
        } else {
            this.playpause.setAttribute("data-state", "pause");
            this.playpause.innerHTML = `
                <svg viewBox="0 0 24 24" fill="${iconcolor}">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>`;
        }
    }

    // 设置全屏数据
    setFullscreenData(state) {
        if (!this.fullscreen || !this.mediaContainer) return;
        
        const iconcolor = `rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b})`;
        
        this.mediaContainer.setAttribute("data-fullscreen", !!state);
        this.fullscreen.setAttribute("data-state", !!state ? "cancel-fullscreen" : "go-fullscreen");
        const buttonIcon = !!state ? "fullscreen-exit" : "fullscreen";
        this.fullscreen.innerHTML = `
            <svg viewBox="0 0 24 24" fill="${iconcolor}">
                <path d="${buttonIcon === 'fullscreen-exit' ? 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z' : 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'}"/>
            </svg>`;
    }

    // 处理全屏
    handleFullscreen() {
        if (!this.mediaContainer) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
            this.setFullscreenData(false);
            this.mediaContainer.removeEventListener('mousemove', this.handleFullscreenControls);
            this.fullscreenVisible = true;
            clearTimeout(this.fullscreenTimeout);
            this.fullscreenVisible();
        } else {
            this.mediaContainer.requestFullscreen();
            this.setFullscreenData(true);
            this.fullscreenVisible = false;
            this.fullscreenHidden();
            this.mediaContainer.addEventListener('mousemove', this.handleFullscreenControls);
        }
    }

    // 处理全屏控件
    handleFullscreenControls = () => {
        if (!this.fullscreenVisible) {
            this.fullscreenVisible = true;
            this.fullscreenVisible();

            clearTimeout(this.fullscreenTimeout);

            this.fullscreenTimeout = setTimeout(() => {
                this.fullscreenVisible = false;
                this.fullscreenHidden();
            }, 2000);
        }
    };

    // 全屏隐藏
    fullscreenHidden = () => {
        if (this.mediaContainer && this.mediaControls) {
            this.mediaContainer.style.cursor = "none";
            this.mediaControls.classList.add("fullscreen_hidden");
        }
    };

    // 全屏显示
    fullscreenVisible = () => {
        if (this.mediaContainer && this.mediaControls) {
            this.mediaContainer.style.cursor = "default";
            this.mediaControls.classList.remove("fullscreen_hidden");
        }
    };

    // 时间转换为 HMS 格式
    mediaTimeToHMS(time) {
        let seconds = parseInt(time);
        const hours = parseInt(seconds / 3600);
        seconds = seconds % 3600;
        const minutes = parseInt(seconds / 60);
        seconds = seconds % 60;
        return (hours < 10 ? "0" : "") + hours + ":" +
            (minutes < 10 ? "0" : "") + minutes + ":" +
            (seconds < 10 ? "0" : "") + seconds;
    }

    // 更新音量
    updateVolume(x) {
        if (!this.volumeBar) return;

        let vol = (x - (this.volumeBar.offsetLeft + this.volumeBar.offsetParent.offsetLeft)) / this.volumeBar.clientWidth;
        if (vol > 1) {
            vol = 1;
        }
        if (vol < 0) {
            vol = 0;
        }
        this.volumeBar.style.clip = "rect(0px, " + ((vol * 100) / 20) + "vw,2vh,0px)";
        this.media.volume = vol;
        this.updateVolumeIcon(vol);
    }

    // 更新音量图标
    updateVolumeIcon(vol) {
        if (!this.volumeIcon) return;

        const iconcolor = `rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b})`;
        let icon = (vol > 0) ? "volume" : "mute";
        
        this.volumeIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="${iconcolor}">
            <path d="${icon === 'volume' ? 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z' : 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'}"/>
        </svg>`;
    }

    // 显示错误信息
    showError(message) {
        const modalElement = document.getElementById(this.modalElementId);
        if (modalElement) {
            const container = modalElement.querySelector(".media_container");
            if (container) {
                container.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">${message}</div>`;
            }
        }
    }

    // 销毁媒体播放器
    destroy() {
        // 清理资源
        if (this.media && this.media.src && this.media.src.startsWith('blob:')) {
            URL.revokeObjectURL(this.media.src);
        }
        
        // 清理事件监听器
        if (this.fullscreenTimeout) {
            clearTimeout(this.fullscreenTimeout);
        }
        
        this.mediaData = null;
        this.volumeDrag = false;
        this.fullscreenVisible = true;
    }
}

// 在 Wails 中，我们直接暴露到全局作用域
window.MediaPlayer = MediaPlayer;
