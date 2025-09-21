class FuzzyFinder {
    constructor() {
        if (document.getElementById("fuzzyFinder") || document.getElementById("settingsEditor")) {
            return false;
        }
        
        window.keyboard.detach();
        
        this.disp = new Modal({
            type: "custom",
            title: "Fuzzy cwd file search",
            html: `<input type="search" id="fuzzyFinder" placeholder="Search file in cwd..." />
                <ul id="fuzzyFinder-results">
                    <li class="fuzzyFinderMatchSelected"></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                </ul>`,
            buttons: [
                {label: "Select", action: "window.activeFuzzyFinder.submit()"}
            ]
        }, () => {
            delete window.activeFuzzyFinder;
            window.keyboard.attach();
            if (window.terminalManager) {
                const terminal = window.terminalManager.getCurrentTerminal();
                if (terminal && terminal.focus) {
                    terminal.focus();
                }
            } else if (window.term[window.currentTerm] && window.term[window.currentTerm].term) {
                window.term[window.currentTerm].term.focus();
            }
        });
        
        this.input = document.getElementById("fuzzyFinder");
        this.results = document.getElementById("fuzzyFinder-results");
        
        this.input.addEventListener('input', e => {
            if ((e.inputType && e.inputType.startsWith("delete")) || (e.detail && e.detail.startsWith("delete"))) {
                this.input.value = "";
                this.search("");
            } else {
                this.search(this.input.value);
            }
        });
        this.input.addEventListener('change', e => {
                if (e.detail === "enter") {
                    this.submit();
                }
        });
        this.input.addEventListener('keydown', e => {
            let selectedEl,selected,next,nextEl;
            switch(e.key) {
                case 'Enter':
                    this.submit();
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    selectedEl = document.querySelector('li.fuzzyFinderMatchSelected');
                    selected = Number(selectedEl.id.substr(17));
                    next = (document.getElementById(`fuzzyFinderMatch-${selected+1}`)) ? selected+1 : 0;
                    nextEl = document.getElementById(`fuzzyFinderMatch-${next}`);
                    selectedEl.removeAttribute("class");
                    nextEl.setAttribute("class", "fuzzyFinderMatchSelected");
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    selectedEl = document.querySelector('li.fuzzyFinderMatchSelected');
                    selected = Number(selectedEl.id.substr(17));
                    next = (document.getElementById(`fuzzyFinderMatch-${selected-1}`)) ? selected-1: 0;
                    nextEl = document.getElementById(`fuzzyFinderMatch-${next}`);
                    selectedEl.removeAttribute("class");
                    nextEl.setAttribute("class", "fuzzyFinderMatchSelected");
                    e.preventDefault();
                    break;
                default:
                    // Do nothing, input event will be triggered
            }
        });
        
        this.search("");
        this.input.focus();
    }

    search(text) {
        // 在 Wails 中，我们通过 Go 后端进行模糊搜索
        this.performFuzzySearch(text);
    }

    // 执行模糊搜索
    async performFuzzySearch(text) {
        try {
            // 调用 Go 后端进行模糊搜索
            const searchResults = await window.go.main.App.FuzzySearch(text, window.fsDisp.dirpath);
            
            if (!searchResults || searchResults.length === 0) {
                this.results.innerHTML = `<li class="fuzzyFinderMatchSelected">No results</li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>`;
                return;
            }

            let html = "";
            searchResults.forEach((file, i) => {
                html += `<li id="fuzzyFinderMatch-${i}" class="${(i === 0) ? 'fuzzyFinderMatchSelected' : ''}" onclick="document.querySelector('li.fuzzyFinderMatchSelected').removeAttribute('class');document.getElementById('fuzzyFinderMatch-${i}').setAttribute('class', 'fuzzyFinderMatchSelected')">${file.name}</li>`;
            });
            
            if (searchResults.length !== 5) {
                for (let i = searchResults.length; i < 5; i++) {
                    html += "<li></li>";
                }
            }
            this.results.innerHTML = html;
            
        } catch (error) {
            console.error('模糊搜索失败:', error);
            this.results.innerHTML = `<li class="fuzzyFinderMatchSelected">Search error</li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>`;
        }
    }

    submit() {
        let file = document.querySelector("li.fuzzyFinderMatchSelected").innerText;
        if (file === "No results" || file === "Search error" || file.length <= 0) {
            this.disp.close();
            return;
        }
        
        // 在 Wails 中，我们通过 Go 后端解析文件路径
        this.resolveFilePath(file);
    }

    // 解析文件路径
    async resolveFilePath(filename) {
        try {
            // 调用 Go 后端解析文件路径
            const filePath = await window.go.main.App.ResolveFilePath(window.fsDisp.dirpath, filename);
            
            if (filePath) {
                if (window.terminalManager) {
                    window.terminalManager.write(window.currentTerm, `'${filePath}'`);
                } else if (window.term[window.currentTerm]) {
                    window.term[window.currentTerm].write(`'${filePath}'`);
                }
            } else {
                // 如果后端解析失败，使用简单的路径拼接
                const simplePath = window.fsDisp.dirpath + '/' + filename;
                if (window.terminalManager) {
                    const shell = window.terminalManager.getCurrentShell();
                    if (shell && shell.write) {
                        shell.write(`'${simplePath}'`);
                    }
                } else if (window.term[window.currentTerm]) {
                if (window.terminalManager) {
                    window.terminalManager.write(window.currentTerm, `'${simplePath}'`);
                } else if (window.term[window.currentTerm]) {
                    window.term[window.currentTerm].write(`'${simplePath}'`);
                }
                }
            }
        } catch (error) {
            console.error('解析文件路径失败:', error);
            // 使用简单的路径拼接作为后备
            const simplePath = window.fsDisp.dirpath + '/' + filename;
                if (window.terminalManager) {
                    window.terminalManager.write(window.currentTerm, `'${simplePath}'`);
                } else if (window.term[window.currentTerm]) {
                    window.term[window.currentTerm].write(`'${simplePath}'`);
                }
        }
        
        this.disp.close();
    }
}

// 在 Wails 中，我们直接暴露到全局作用域
window.FuzzyFinder = FuzzyFinder;
