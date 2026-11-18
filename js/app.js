// Taskaroo - app-level glue: dark-mode toggle, JSON import/export, init.
        function toggleDarkMode() {
            document.documentElement.classList.toggle('dark');
            document.getElementById('themeIcon').classList.toggle('fa-moon');
            document.getElementById('themeIcon').classList.toggle('fa-sun');
        }

        // Export / Import
        function exportData() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", "taskaroo_backup.json");
            dlAnchorElem.click();
        }

        function importData(event) {
            const fileReader = new FileReader();
            if (event.target.files[0]) {
                fileReader.readAsText(event.target.files[0], "UTF-8");
                fileReader.onload = e => {
                    try {
                        const imported = normalizeState(JSON.parse(e.target.result));
                        state = imported;
                        saveState();
                        render();
                        alert("Data imported successfully!");
                    } catch (err) {
                        alert("Invalid JSON backup file.");
                    }
                };
            }
        }

        render();
        initCategoryQuickMenu();

