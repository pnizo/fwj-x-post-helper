document.addEventListener('DOMContentLoaded', function() {
    const postForm = document.getElementById('postForm');
    const notification = document.getElementById('notification');
    const saveContestNameBtn = document.getElementById('saveContestName');
    const contestNameInput = document.getElementById('contestName');
    const savedContestNamesDiv = document.getElementById('savedContestNames');
    const csvFileInput = document.getElementById('csvFile');
    const uploadCsvBtn = document.getElementById('uploadCsv');
    const csvStatusDiv = document.getElementById('csvStatus');
    const statusSelect = document.getElementById('status');
    const messageTextarea = document.getElementById('message');

    // Load saved contest names, and status options on page load
    loadSavedContestNames();
    loadStatusOptions();

    // CSV upload functionality
    uploadCsvBtn.addEventListener('click', function() {
        const file = csvFileInput.files[0];
        if (file) {
            uploadCsvFile(file);
        } else {
            showNotification('CSVファイルを選択してください', 'error');
        }
    });

    // Status change handler
    statusSelect.addEventListener('change', function() {
        const selectedStatus = this.value;
        if (selectedStatus) {
            updateMessageFromStatus(selectedStatus);
        }
    });

    // Save contest name functionality
    saveContestNameBtn.addEventListener('click', function() {
        const contestName = contestNameInput.value.trim();
        if (contestName) {
            saveContestName(contestName);
        }
    });

    // Save contest name function
    function saveContestName(name) {
        let savedNames = JSON.parse(localStorage.getItem('savedContestNames') || '[]');
        if (!savedNames.includes(name)) {
            savedNames.push(name);
            localStorage.setItem('savedContestNames', JSON.stringify(savedNames));
            loadSavedContestNames();
            showNotification('コンテスト名を保存しました', 'success');
        } else {
            showNotification('このコンテスト名は既に保存されています', 'info');
        }
    }

    // Load saved contest names
    function loadSavedContestNames() {
        const savedNames = JSON.parse(localStorage.getItem('savedContestNames') || '[]');
        if (savedNames.length === 0) {
            savedContestNamesDiv.innerHTML = '';
            return;
        }

        savedContestNamesDiv.innerHTML = savedNames.map((name, index) => `
            <div class="saved-contest-item">
                <span class="contest-name" data-action="select-contest" data-contest-name="${name.replace(/"/g, '&quot;')}">${name}</span>
                <button class="delete-btn" data-action="delete-contest" data-contest-name="${name.replace(/"/g, '&quot;')}">×</button>
            </div>
        `).join('');
        
        // Add event listeners for saved contest names
        document.querySelectorAll('[data-action="select-contest"]').forEach(button => {
            button.addEventListener('click', function() {
                const contestName = this.dataset.contestName;
                selectContestName(contestName);
            });
        });
        
        document.querySelectorAll('[data-action="delete-contest"]').forEach(button => {
            button.addEventListener('click', function() {
                const contestName = this.dataset.contestName;
                deleteContestName(contestName);
            });
        });
    }

    // Select contest name
    window.selectContestName = function(name) {
        contestNameInput.value = name;
    };

    // Delete contest name
    window.deleteContestName = function(name) {
        let savedNames = JSON.parse(localStorage.getItem('savedContestNames') || '[]');
        savedNames = savedNames.filter(n => n !== name);
        localStorage.setItem('savedContestNames', JSON.stringify(savedNames));
        loadSavedContestNames();
        showNotification('コンテスト名を削除しました', 'success');
    };

    // Handle form submission - show text preview dialog
    postForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(postForm);
        const postData = {
            contestName: formData.get('contestName'),
            status: formData.get('status'),
            message: formData.get('message')
        };

        // Validate required fields
        if (!postData.contestName || !postData.status) {
            showNotification('コンテスト名と状況は必須です', 'error');
            return;
        }

        try {
            const response = await fetch('/api/generate-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });

            if (response.ok) {
                const result = await response.json();
                showTextPreviewDialog(result.text, result.charCount);
            } else {
                const error = await response.json();
                showNotification(error.error || 'エラーが発生しました', 'error');
            }
        } catch (error) {
            showNotification('ネットワークエラーが発生しました', 'error');
        }
    });

    // Show text preview dialog
    function showTextPreviewDialog(text, charCount) {
        const modal = document.createElement('div');
        modal.className = 'modal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>投稿内容プレビュー・編集</h3>
                <div class="text-edit-container">
                    <textarea id="textEditArea" class="text-edit-textarea" placeholder="投稿内容を編集...">${text}</textarea>
                    <p class="char-count-edit" id="charCountEdit">
                        文字数: ${charCount}
                    </p>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-action="close-modal">閉じる</button>
                    <button class="btn btn-primary" data-action="copy-text">コピー</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const textArea = modal.querySelector('#textEditArea');
        const charCountElement = modal.querySelector('#charCountEdit');
        
        // リアルタイム文字数カウント
        textArea.addEventListener('input', function() {
            const currentLength = this.value.length;
            charCountElement.textContent = `文字数: ${currentLength}`;
        });

        // Focus on textarea and select all text
        textArea.focus();
        textArea.select();
        
        // モーダル内のボタンにイベントリスナーを追加
        modal.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal);
        modal.querySelector('[data-action="copy-text"]').addEventListener('click', function() {
            const text = textArea.value;
            copyToClipboard(text);
            closeModal();
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
        
        // モーダルを表示
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Copy text to clipboard
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showNotification('テキストをクリップボードにコピーしました', 'success');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('テキストをクリップボードにコピーしました', 'success');
        }
    }

    // Close modal
    window.closeModal = function() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
        // Remove keydown listener
        document.removeEventListener('keydown', closeModal);
    };

    // Show notification
    function showNotification(message, type = 'info') {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Load status options from server
    async function loadStatusOptions() {
        try {
            const response = await fetch('/api/status-options');
            const statusOptions = await response.json();
            updateStatusSelect(statusOptions);
        } catch (error) {
            console.error('状況オプションの読み込みに失敗:', error);
        }
    }

    // Update status select options
    function updateStatusSelect(statusOptions) {
        // 既存のオプションをクリア（最初の「選択してください」は残す）
        statusSelect.innerHTML = '<option value="">選択してください</option>';
        
        if (statusOptions.length === 0) {
            // デフォルトオプションを追加
            const defaultOptions = [
                { status: '開始', memo: '' },
                { status: '進行中', memo: '' },
                { status: '終了', memo: '' },
                { status: '延期', memo: '' },
                { status: '中止', memo: '' }
            ];
            
            defaultOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.status;
                optionElement.textContent = option.status;
                statusSelect.appendChild(optionElement);
            });
            
            csvStatusDiv.innerHTML = '<p class="status-info">デフォルトの状況オプションを使用中</p>';
        } else {
            // CSVから読み込んだオプションを追加
            statusOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.status;
                optionElement.textContent = option.status;
                optionElement.dataset.memo = option.memo;
                statusSelect.appendChild(optionElement);
            });
            
            csvStatusDiv.innerHTML = `<p class="status-success">✅ ${statusOptions.length}個の状況オプションを読み込み済み</p>`;
        }
    }

    // Upload CSV file
    async function uploadCsvFile(file) {
        const formData = new FormData();
        formData.append('csvFile', file);
        
        try {
            csvStatusDiv.innerHTML = '<p class="status-loading">CSVファイルを処理中...</p>';
            
            const response = await fetch('/api/upload-csv', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                showNotification(result.message + ' - ページを更新しています...', 'success');
                updateStatusSelect(result.statusOptions);
                csvFileInput.value = ''; // ファイル選択をクリア
                
                // 2秒後にページをリロード（通知を表示してから）
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                const error = await response.json();
                showNotification(error.error || 'CSVアップロードに失敗しました', 'error');
                csvStatusDiv.innerHTML = '<p class="status-error">CSVアップロードに失敗しました</p>';
            }
        } catch (error) {
            showNotification('ネットワークエラーが発生しました', 'error');
            csvStatusDiv.innerHTML = '<p class="status-error">ネットワークエラーが発生しました</p>';
        }
    }

    // Update message based on selected status
    function updateMessageFromStatus(selectedStatus) {
        const selectedOption = statusSelect.querySelector(`option[value="${selectedStatus}"]`);
        if (selectedOption && selectedOption.dataset.memo) {
            // 現在のメッセージが空の場合のみ自動入力
            if (!messageTextarea.value.trim()) {
                messageTextarea.value = selectedOption.dataset.memo;
            }
        }
    }
});