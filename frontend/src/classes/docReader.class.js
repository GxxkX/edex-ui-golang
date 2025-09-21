class DocReader {
    constructor(opts) {
        // 在 Wails 中，我们需要从 Go 后端获取 PDF 文件数据
        this.modalElementId = "modal_" + opts.modalId;
        this.path = opts.path;
        this.scale = 1;
        this.pageNum = 1;
        this.pageRendering = false;
        this.pageNumPending = null;
        this.zoom = 100;
        this.pdfDoc = null;

        // 初始化 PDF.js
        this.initPDFJS();
        
        // 从 Go 后端获取 PDF 文件数据
        this.loadPDFFromBackend();
    }

    // 初始化 PDF.js
    initPDFJS() {
        // 在 Wails 中，我们需要确保 PDF.js 正确加载
        if (typeof pdfjsLib === 'undefined') {
            console.error('PDF.js 未加载');
            return;
        }
        
        // 设置 worker 路径
        pdfjsLib.GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/build/pdf.worker.js';
    }

    // 从 Go 后端加载 PDF 文件
    async loadPDFFromBackend() {
        try {
            // 调用 Go 后端获取 PDF 文件数据
            const pdfData = await window.go.main.App.GetPDFData(this.path);
            
            if (!pdfData || !pdfData.data) {
                throw new Error('无法获取 PDF 文件数据');
            }

            // 将 base64 数据转换为 ArrayBuffer
            const binaryString = atob(pdfData.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // 加载 PDF 文档
            const loadingTask = pdfjsLib.getDocument({ data: bytes });
            loadingTask.promise.then((pdfDoc) => {
                this.pdfDoc = pdfDoc;
                this.setupUI();
                this.renderPage(this.pageNum);
            }).catch((error) => {
                console.error('PDF 加载失败:', error);
                this.showError('PDF 文件加载失败');
            });

        } catch (error) {
            console.error('从后端获取 PDF 数据失败:', error);
            this.showError('无法从后端获取 PDF 文件');
        }
    }

    // 设置 UI 元素
    setupUI() {
        const modalElement = document.getElementById(this.modalElementId);
        if (!modalElement) return;

        const pageCountElement = modalElement.querySelector(".page_count");
        if (pageCountElement) {
            pageCountElement.textContent = this.pdfDoc.numPages;
        }

        // 绑定事件监听器
        const prevButton = modalElement.querySelector(".previous_page");
        const nextButton = modalElement.querySelector(".next_page");
        const zoomInButton = modalElement.querySelector(".zoom_in");
        const zoomOutButton = modalElement.querySelector(".zoom_out");

        if (prevButton) {
            prevButton.addEventListener('click', () => this.onPrevPage());
        }
        if (nextButton) {
            nextButton.addEventListener('click', () => this.onNextPage());
        }
        if (zoomInButton) {
            zoomInButton.addEventListener('click', () => this.zoomIn());
        }
        if (zoomOutButton) {
            zoomOutButton.addEventListener('click', () => this.zoomOut());
        }
    }

    // 渲染页面
    renderPage(num) {
        if (!this.pdfDoc) return;

        this.pageRendering = true;
        this.pdfDoc.getPage(num).then((page) => {
            const canvas = document.getElementById(this.modalElementId).querySelector(".pdf_canvas");
            if (!canvas) return;

            const context = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: this.scale });
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            const renderTask = page.render(renderContext);
            renderTask.promise.then(() => {
                this.pageRendering = false;
                if (this.pageNumPending !== null) {
                    this.renderPage(this.pageNumPending);
                    this.pageNumPending = null;
                }
            });
        });

        // 更新页面号显示
        const pageNumElement = document.getElementById(this.modalElementId).querySelector(".page_num");
        if (pageNumElement) {
            pageNumElement.textContent = num;
        }
    }

    // 队列渲染页面
    queueRenderPage(num) {
        if (this.pageRendering) {
            this.pageNumPending = num;
        } else {
            this.renderPage(num);
        }
    }

    // 上一页
    onPrevPage() {
        if (this.pageNum <= 1) {
            return;
        }
        this.pageNum--;
        this.queueRenderPage(this.pageNum);
    }

    // 下一页
    onNextPage() {
        if (!this.pdfDoc || this.pageNum >= this.pdfDoc.numPages) {
            return;
        }
        this.pageNum++;
        this.queueRenderPage(this.pageNum);
    }

    // 放大
    zoomIn() {
        if (this.zoom >= 200) {
            return;
        }
        this.zoom += 10;
        const canvas = document.getElementById(this.modalElementId).querySelector(".pdf_canvas");
        if (canvas) {
            canvas.style.zoom = this.zoom + "%";
        }
    }

    // 缩小
    zoomOut() {
        if (this.zoom <= 50) {
            return;
        }
        this.zoom -= 10;
        const canvas = document.getElementById(this.modalElementId).querySelector(".pdf_canvas");
        if (canvas) {
            canvas.style.zoom = this.zoom + "%";
        }
    }

    // 显示错误信息
    showError(message) {
        const modalElement = document.getElementById(this.modalElementId);
        if (modalElement) {
            const container = modalElement.querySelector(".pdf_container");
            if (container) {
                container.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">${message}</div>`;
            }
        }
    }

    // 销毁文档阅读器
    destroy() {
        // 清理资源
        this.pdfDoc = null;
        this.pageRendering = false;
        this.pageNumPending = null;
    }
}

// 在 Wails 中，我们直接暴露到全局作用域
window.DocReader = DocReader;