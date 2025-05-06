document.addEventListener('DOMContentLoaded', () => {
    // console.log("!!! DOMContentLoaded event fired. Starting script execution..."); // REMOVED

    try {
        // --- Get ALL Elements ---
        // console.log("Getting elements..."); // REMOVED
        const btnOpen = document.getElementById('btn-open'); if (!btnOpen) throw new Error("ID 'btn-open' not found!");
        const btnNew = document.getElementById('btn-new'); if (!btnNew) throw new Error("ID 'btn-new' not found!");
        const btnClear = document.getElementById('btn-clear'); if (!btnClear) throw new Error("ID 'btn-clear' not found!");
        const btnSettings = document.getElementById('btn-settings'); if (!btnSettings) throw new Error("ID 'btn-settings' not found!");
        const settingsModal = document.getElementById('settings-modal'); if (!settingsModal) throw new Error("ID 'settings-modal' not found!");
        const btnCloseSettings = document.getElementById('close-settings-modal'); if (!btnCloseSettings) throw new Error("ID 'close-settings-modal' not found!");
        // --- REINSTATED btnToggleDevtools ---
        const btnToggleDevtools = document.getElementById('btn-toggle-devtools'); if (!btnToggleDevtools) throw new Error("ID 'btn-toggle-devtools' not found!");
        // ------------------------------------
        const fontSizeInput = document.getElementById('font-size-input'); if (!fontSizeInput) throw new Error("ID 'font-size-input' not found!");
        const filenameDisplay = document.getElementById('filename-display'); if (!filenameDisplay) throw new Error("ID 'filename-display' not found!");
        const dirtyIndicator = document.getElementById('dirty-indicator'); if (!dirtyIndicator) throw new Error("ID 'dirty-indicator' not found!");
        const keyInput = document.getElementById('key-input'); if (!keyInput) throw new Error("ID 'key-input' not found!");
        const textArea = document.getElementById('text-area'); if (!textArea) throw new Error("ID 'text-area' not found!");
        const btnLoad = document.getElementById('btn-load'); if (!btnLoad) throw new Error("ID 'btn-load' not found!");
        const btnSave = document.getElementById('btn-save'); if (!btnSave) throw new Error("ID 'btn-save' not found!");
        const statusBar = document.getElementById('status-bar'); if (!statusBar) throw new Error("ID 'status-bar' not found!");
        const lineCountEl = document.getElementById('line-count'); if (!lineCountEl) throw new Error("ID 'line-count' not found!");
        const wordCountEl = document.getElementById('word-count'); if (!wordCountEl) throw new Error("ID 'word-count' not found!");
        const charCountEl = document.getElementById('char-count'); if (!charCountEl) throw new Error("ID 'char-count' not found!");
        // console.log("All essential elements found."); // REMOVED

        // --- State Variables ---
        let currentFilename = "Untitled.enc";
        let encryptedDataBuffer = null;
        let isDirty = false;

        // --- Initial Setup ---
        updateCounts();
        loadFontSize();

        // --- Helper Functions ---
        function updateStatus(message, type = 'info') { statusBar.textContent = message; statusBar.className = type; /* console.log removed */ }
        function setButtonLoading(button, isLoading) { const textSpan = button.querySelector('.btn-text'); const spinnerDiv = button.querySelector('.ldld'); if (isLoading) { button.classList.add('loading'); button.disabled = true; if (spinnerDiv) spinnerDiv.style.display = 'block'; if (textSpan) textSpan.style.opacity = '0'; } else { button.classList.remove('loading'); button.disabled = false; if (spinnerDiv) spinnerDiv.style.display = 'none'; if (textSpan) textSpan.style.opacity = '1'; } }
        function setDirty(dirtyState) { isDirty = dirtyState; dirtyIndicator.textContent = isDirty ? "*" : ""; }
        function updateCounts() { const text = textArea.value; const lines = text.split('\n'); const words = text.match(/\S+/g) || []; const chars = text.length; lineCountEl.textContent = lines.length; wordCountEl.textContent = words.length; charCountEl.textContent = chars; }
        function saveFontSize(size) { try { localStorage.setItem('editorFontSize', size); } catch (e) { /* console.warn removed */ } }
        function loadFontSize() { let size = 10; try { const savedSize = localStorage.getItem('editorFontSize'); if (savedSize) { size = parseInt(savedSize, 10); if (isNaN(size) || size < 8 || size > 32) size = 10; } } catch (e) { /* console.warn removed */ } textArea.style.fontSize = `${size}pt`; fontSizeInput.value = size; }
        function confirmDiscardChanges() { if (isDirty) { return confirm("You have unsaved changes. Discard them?"); } return true; }

        // --- Global Functions Called by Python ---
        window.handleFileContent = function(filename, contentBase64) { currentFilename = filename; filenameDisplay.textContent = currentFilename; encryptedDataBuffer = contentBase64; textArea.value = ""; setDirty(false); updateStatus(`Selected: ${currentFilename}. Enter key and Load/Decrypt.`, 'info'); updateCounts(); }
        window.handleFileError = function(errorMessage) { updateStatus(errorMessage, 'error'); encryptedDataBuffer = null; /* console.error removed */ }
        window.handleSaveResult = function(result) { /* console.log removed */ if (result && result.status === 'success') { updateStatus(result.message || 'File saved successfully.', 'success'); setDirty(false); if (result.data) { encryptedDataBuffer = result.data; /* console.log removed */ } if (result.path) { const pathParts = result.path.replace(/\\/g, '/').split('/'); currentFilename = pathParts[pathParts.length - 1]; filenameDisplay.textContent = currentFilename; /* console.log removed */ } } else if (result && result.status === 'info') { updateStatus(result.message || 'Operation cancelled.', 'info'); } else { updateStatus(result.message || 'Failed to save file.', 'error'); } setButtonLoading(btnSave, false); }
        // --- NEW: Handle DevTools toggle result ---
        window.handleDevToolsToggleResult = function(success, message) {
             if (!success) {
                 updateStatus(message || 'Could not toggle DevTools.', 'error');
             }
         }

        // --- Event Listeners ---
        // console.log("Attaching event listeners..."); // REMOVED

        btnOpen.addEventListener('click', () => {
            // console.log(">>> btnOpen CLICKED <<<"); // REMOVED
            if (!confirmDiscardChanges()) return;
            // console.log("JS: Open button clicked, calling Python API..."); // REMOVED
            try { window.pywebview.api.open_file_dialog(); }
            catch (e) { console.error("JS Error calling open_file_dialog:", e); updateStatus("Error opening file dialog.", "error");}
        }); // console.log("- Attached listener to btnOpen"); // REMOVED

        btnNew.addEventListener('click', () => {
             // console.log(">>> btnNew CLICKED <<<"); // REMOVED
             if (!confirmDiscardChanges()) return;
             encryptedDataBuffer = null; currentFilename = "Untitled.enc"; filenameDisplay.textContent = "New File"; textArea.value = ""; keyInput.value = ""; setDirty(false); updateStatus("New file created.", 'info'); updateCounts();
         }); // console.log("- Attached listener to btnNew"); // REMOVED

        btnClear.addEventListener('click', () => {
             // console.log(">>> btnClear CLICKED <<<"); // REMOVED
             if (textArea.value.length > 0) { if (confirm("Clear text area?")) { textArea.value = ""; setDirty(true); updateStatus("Text area cleared.", 'info'); updateCounts(); } }
         }); // console.log("- Attached listener to btnClear"); // REMOVED

        textArea.addEventListener('input', () => {
             setDirty(true); updateCounts();
         }); // console.log("- Attached listener to textArea"); // REMOVED

        btnLoad.addEventListener('click', async () => {
             // console.log(">>> btnLoad CLICKED <<<"); // REMOVED
             const key = keyInput.value; if (!key) { updateStatus("Enter key word.", 'error'); return; } if (!encryptedDataBuffer) { updateStatus("Open a file first.", 'error'); return; }
             updateStatus("Decrypting...", 'info'); setButtonLoading(btnLoad, true);
             try {
                 const response = await fetch('/decrypt', { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify({ key: key, data: encryptedDataBuffer }), });
                 const result = await response.json();
                 if (response.ok && result.status === 'success') { textArea.value = result.text; setDirty(false); updateStatus("Decrypted.", 'success'); updateCounts(); }
                 else { textArea.value = ""; updateStatus(result.message || "Decryption failed.", 'error'); updateCounts(); }
             } catch (error) { textArea.value = ""; updateStatus(`Decrypt error: ${error}`, 'error'); /* console.error removed */ updateCounts();
             } finally { setButtonLoading(btnLoad, false); }
         }); // console.log("- Attached listener to btnLoad"); // REMOVED

        btnSave.addEventListener('click', () => {
             // console.log(">>> btnSave CLICKED <<<"); // REMOVED
             const key = keyInput.value; const text = textArea.value;
             // console.log("JS: Save button clicked..."); // REMOVED
             if (!key) { updateStatus("Enter key word.", 'error'); return; }
             if (!text.trim()) { if (!confirm("Save empty file?")) { updateStatus("Save cancelled."); return; } }
             updateStatus("Saving...", 'info'); setButtonLoading(btnSave, true);
             try {
                 // console.log(`JS: Calling pywebview.api.save_file...`); // REMOVED
                 window.pywebview.api.save_file(key, text, currentFilename);
             } catch (error) {
                 // console.error("JS: Error calling pywebview.api.save_file:", error); // REMOVED
                 updateStatus(`Error initiating save: ${error}`, 'error');
                 setButtonLoading(btnSave, false);
             }
         }); // console.log("- Attached listener to btnSave"); // REMOVED

        // --- Settings Modal Listeners ---
        btnSettings.addEventListener('click', () => {
             // console.log(">>> btnSettings CLICKED <<<"); // REMOVED
             settingsModal.style.display = "block";
         }); // console.log("- Attached listener to btnSettings"); // REMOVED

        btnCloseSettings.addEventListener('click', () => {
             // console.log(">>> btnCloseSettings CLICKED <<<"); // REMOVED
             settingsModal.style.display = "none";
         }); // console.log("- Attached listener to btnCloseSettings"); // REMOVED

        window.addEventListener('click', (event) => {
             if (event.target == settingsModal) {
                // console.log(">>> window clicked (modal backdrop) <<<"); // REMOVED
                 settingsModal.style.display = "none";
             }
         }); // console.log("- Attached listener to window (modal close)"); // REMOVED

        // --- REINSTATED Toggle DevTools Listener ---
        btnToggleDevtools.addEventListener('click', () => {
             // console.log("JS: Toggle DevTools call..."); // REMOVED
             try {
                 window.pywebview.api.toggle_devtools();
                 // Optionally close settings modal after clicking
                 // settingsModal.style.display = "none";
             } catch (e) {
                 // console.error("JS: Failed toggle devtools call:", e); // REMOVED
                 updateStatus("Could not toggle DevTools.", "error");
             }
         }); // console.log("- Attached listener to btnToggleDevtools"); // ADDED Log

        fontSizeInput.addEventListener('change', (event) => {
             // console.log(">>> fontSizeInput CHANGED <<<"); // REMOVED
             const newSize = parseInt(event.target.value, 10); if (!isNaN(newSize) && newSize >= 8 && newSize <= 32) { textArea.style.fontSize = `${newSize}pt`; saveFontSize(newSize); } else { event.target.value = parseInt(textArea.style.fontSize, 10) || 10; }
         }); // console.log("- Attached listener to fontSizeInput"); // REMOVED

        // console.log("All event listeners attached successfully."); // REMOVED

    } catch (error) {
        // Keep this vital error reporting
        console.error("!!! FATAL ERROR during script initialization:", error);
        try { statusBar.textContent = `Initialization Error: ${error.message || error}`; statusBar.className = 'error'; } catch (e) {}
    }

}); // End DOMContentLoaded
