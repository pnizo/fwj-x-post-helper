document.addEventListener('DOMContentLoaded', function() {
    const postForm = document.getElementById('postForm');
    const postsContainer = document.getElementById('postsContainer');
    const notification = document.getElementById('notification');
    const saveContestNameBtn = document.getElementById('saveContestName');
    const contestNameInput = document.getElementById('contestName');
    const savedContestNamesDiv = document.getElementById('savedContestNames');
    const authStatusDiv = document.getElementById('authStatus');
    const csvFileInput = document.getElementById('csvFile');
    const uploadCsvBtn = document.getElementById('uploadCsv');
    const csvStatusDiv = document.getElementById('csvStatus');
    const statusSelect = document.getElementById('status');
    const messageTextarea = document.getElementById('message');
    const clearAllPostsBtn = document.getElementById('clearAllPosts');

    // Load posts, saved contest names, auth status, and status options on page load
    loadPosts();
    loadSavedContestNames();
    checkAuthStatus();
    loadStatusOptions();
    loadInitialFormValues();

    // Check for auth result in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
        showNotification('Twitter認証が完了しました！', 'success');
        checkAuthStatus();
        // Remove auth parameter from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('auth') === 'error') {
        showNotification('Twitter認証に失敗しました', 'error');
        // Remove auth parameter from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check authentication status
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/twitter/status');
            const authData = await response.json();
            
            updateAuthDisplay(authData);
        } catch (error) {
            console.error('認証状態の確認に失敗:', error);
            authStatusDiv.innerHTML = `
                <div class="auth-error">
                    <p>認証状態の確認に失敗しました</p>
                </div>
            `;
        }
    }

    // Update authentication display
    function updateAuthDisplay(authData) {
        if (authData.connected) {
            authStatusDiv.innerHTML = `
                <div class="auth-success">
                    <div class="user-info">
                        <span class="user-icon">✅</span>
                        <span class="user-text">
                            <strong>${authData.user.name}</strong> (@${authData.user.username}) として認証済み
                        </span>
                    </div>
                </div>
            `;
        } else {
            authStatusDiv.innerHTML = `
                <div class="auth-needed">
                    <div class="auth-message">
                        <span class="auth-icon">🔐</span>
                        <span>Xに投稿するには認証が必要です</span>
                    </div>
                    <span>API認証が必要です（.envファイルを確認してください）</span>
                </div>
            `;
        }
    }


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

    // Clear all posts functionality
    clearAllPostsBtn.addEventListener('click', function() {
        clearAllPosts();
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

    // Handle form submission
    postForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(postForm);
        const postData = {
            contestName: formData.get('contestName'),
            status: formData.get('status'),
            message: formData.get('message')
        };

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });

            if (response.ok) {
                const newPost = await response.json();
                showNotification('投稿を作成しました', 'success');
                
                // コンテスト名と現在の状況を保持
                const savedContestName = contestNameInput.value;
                const currentStatusIndex = statusSelect.selectedIndex;
                
                // フォームをリセット
                postForm.reset();
                contestNameInput.value = savedContestName;
                
                // 次の状況オプションを選択（最後の項目の場合は「選択してください」に戻る）
                if (statusSelect.options.length > 1) { // 「選択してください」以外にオプションがある場合
                    const nextIndex = currentStatusIndex + 1;
                    if (nextIndex < statusSelect.options.length) {
                        statusSelect.selectedIndex = nextIndex;
                        
                        // 選択された状況に基づいてメッセージを更新
                        const selectedStatus = statusSelect.value;
                        if (selectedStatus) {
                            updateMessageFromStatus(selectedStatus);
                        }
                    } else {
                        // 最後の項目の場合は「選択してください」（インデックス0）を選択
                        statusSelect.selectedIndex = 0;
                    }
                }
                
                loadPosts();
            } else {
                const error = await response.json();
                showNotification(error.error || 'エラーが発生しました', 'error');
            }
        } catch (error) {
            showNotification('ネットワークエラーが発生しました', 'error');
        }
    });

    // Load and display posts
    async function loadPosts() {
        try {
            const response = await fetch('/api/posts');
            const posts = await response.json();
            displayPosts(posts);
        } catch (error) {
            console.error('投稿の読み込みに失敗しました:', error);
        }
    }

    // Display posts in the container
    function displayPosts(posts) {
        if (posts.length === 0) {
            postsContainer.innerHTML = '<p class="no-posts">まだ投稿がありません</p>';
            return;
        }

        postsContainer.innerHTML = posts.map(post => `
            <div class="post-card">
                <div class="post-header">
                    <h3>${post.contest_name}</h3>
                    <span class="post-time">${formatDate(post.created_at)}</span>
                </div>
                <div class="post-content">
                    <p><strong>状況:</strong> <span class="status status-${post.status}">${post.status}</span></p>
                    ${post.message ? `<p><strong>メッセージ:</strong> ${post.message}</p>` : ''}
                </div>
                <div class="post-actions">
                    ${post.posted ? 
                        `<span class="posted-badge">✓ 投稿済み (${formatDate(post.tweeted_at)})</span>
                         ${post.tweet_text ? `<div class="tweet-preview">
                             <strong>投稿内容:</strong>
                             <div class="tweet-text">${post.tweet_text}</div>
                         </div>` : ''}` :
                        `<button class="btn btn-primary" data-action="preview" data-post-id="${post.id}">
                            プレビュー・投稿
                        </button>`
                    }
                </div>
            </div>
        `).join('');
        
        // Add event listeners for dynamically generated buttons
        document.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', function() {
                const action = this.dataset.action;
                const postId = this.dataset.postId;
                
                if (action === 'preview') {
                    previewTweet(postId);
                }
            });
        });
    }

    // Preview tweet text
    window.previewTweet = async function(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}/preview`);
            
            if (response.ok) {
                const result = await response.json();
                const modal = document.createElement('div');
                modal.className = 'modal';
                const replySection = result.replyTo ? `
                    <div class="reply-info">
                        <h4>📝 リプライ先の投稿</h4>
                        <div class="reply-post">
                            <p><strong>状況:</strong> ${result.replyTo.status}</p>
                            <p><strong>投稿内容:</strong></p>
                            <div class="reply-tweet-text">${result.replyTo.tweetText || '(内容なし)'}</div>
                            <p class="reply-time">投稿日時: ${formatDate(result.replyTo.tweetedAt)}</p>
                        </div>
                        <p class="reply-note">⬇️ この投稿へのリプライとして投稿されます</p>
                    </div>
                ` : `
                    <div class="reply-info">
                        <p class="new-post-note">🆕 このコンテストの最初の投稿として投稿されます</p>
                    </div>
                `;

                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>ツイートプレビュー・編集</h3>
                        ${replySection}
                        <div class="tweet-edit-container">
                            <textarea id="tweetEditText" class="tweet-edit-textarea" placeholder="ツイート内容を編集...">${result.tweetText}</textarea>
                            <p class="char-count-edit" id="charCountEdit">
                                文字数: ${result.charCount}/280
                            </p>
                        </div>
                        <div class="media-upload-container">
                            <h4>📎 メディア添付（画像・動画 最大4枚）</h4>
                            <input type="file" id="mediaFiles" multiple accept="image/*,video/*" class="media-file-input">
                            <div class="media-upload-info">
                                <p>対応形式: JPEG, PNG, GIF, WebP, MP4, MOV, AVI</p>
                                <p>最大ファイルサイズ: 50MB</p>
                            </div>
                            <div id="mediaPreview" class="media-preview"></div>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-secondary" data-action="close-modal">キャンセル</button>
                            <button class="btn btn-twitter" data-action="modal-tweet" data-post-id="${postId}">
                                投稿する
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                const textArea = modal.querySelector('#tweetEditText');
                const charCountElement = modal.querySelector('#charCountEdit');
                const mediaFilesInput = modal.querySelector('#mediaFiles');
                const mediaPreview = modal.querySelector('#mediaPreview');
                let selectedMediaFiles = [];
                
                // リアルタイム文字数カウント
                textArea.addEventListener('input', function() {
                    const currentLength = this.value.length;
                    charCountElement.textContent = `文字数: ${currentLength}/280`;
                    charCountElement.className = currentLength <= 280 ? 'char-count-edit within-limit' : 'char-count-edit over-limit';
                });

                // メディアファイル選択
                mediaFilesInput.addEventListener('change', function() {
                    const files = Array.from(this.files);
                    if (files.length > 4) {
                        showNotification('メディアファイルは最大4枚までです', 'error');
                        this.value = '';
                        return;
                    }
                    
                    updateMediaPreview(files, mediaPreview);
                    selectedMediaFiles = files;
                });
                
                // モーダル内のボタンにイベントリスナーを追加
                modal.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal);
                modal.querySelector('[data-action="modal-tweet"]').addEventListener('click', function() {
                    const postId = this.dataset.postId;
                    const customText = textArea.value.trim();
                    
                    if (customText.length > 280) {
                        showNotification('ツイートが280文字を超えています', 'error');
                        return;
                    }
                    
                    tweetPostWithMedia(postId, customText, selectedMediaFiles);
                    closeModal();
                });
                
                // モーダルを表示
                setTimeout(() => modal.classList.add('show'), 10);
            } else {
                const error = await response.json();
                showNotification(error.error || 'プレビューの取得に失敗しました', 'error');
            }
        } catch (error) {
            showNotification('ネットワークエラーが発生しました', 'error');
        }
    };

    // Close modal
    window.closeModal = function() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    };

    // Tweet a post
    window.tweetPost = async function(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}/tweet`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                showNotification(result.message, 'success');
                loadPosts();
            } else {
                const error = await response.json();
                showNotification(error.error || '投稿に失敗しました', 'error');
            }
        } catch (error) {
            showNotification('ネットワークエラーが発生しました', 'error');
        }
    };

    // Tweet a post with custom text
    window.tweetPostWithCustomText = async function(postId, customText) {
        try {
            const response = await fetch(`/api/posts/${postId}/tweet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ customText })
            });

            if (response.ok) {
                const result = await response.json();
                showNotification(result.message, 'success');
                loadPosts();
            } else {
                const error = await response.json();
                showNotification(error.error || '投稿に失敗しました', 'error');
            }
        } catch (error) {
            showNotification('ネットワークエラーが発生しました', 'error');
        }
    };

    // Tweet a post with media files
    window.tweetPostWithMedia = async function(postId, customText, mediaFiles) {
        try {
            let uploadedMediaFiles = [];
            
            // メディアファイルがある場合はアップロード
            if (mediaFiles && mediaFiles.length > 0) {
                const formData = new FormData();
                for (let i = 0; i < mediaFiles.length; i++) {
                    formData.append('mediaFiles', mediaFiles[i]);
                }
                
                const uploadResponse = await fetch('/api/upload-media', {
                    method: 'POST',
                    body: formData
                });
                
                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    uploadedMediaFiles = uploadResult.mediaFiles;
                } else {
                    const error = await uploadResponse.json();
                    showNotification(error.error || 'メディアファイルのアップロードに失敗しました', 'error');
                    return;
                }
            }

            // ツイート投稿
            const response = await fetch(`/api/posts/${postId}/tweet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    customText,
                    mediaFiles: uploadedMediaFiles
                })
            });

            if (response.ok) {
                const result = await response.json();
                const mediaInfo = uploadedMediaFiles.length > 0 ? ` (メディア${uploadedMediaFiles.length}枚添付)` : '';
                showNotification(result.message + mediaInfo, 'success');
                loadPosts();
            } else {
                const error = await response.json();
                showNotification(error.error || '投稿に失敗しました', 'error');
            }
        } catch (error) {
            showNotification('ネットワークエラーが発生しました', 'error');
        }
    };

    // Update media preview
    function updateMediaPreview(files, previewContainer) {
        previewContainer.innerHTML = '';
        
        if (files.length === 0) return;
        
        files.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'media-preview-item';
            
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.alt = `Preview ${index + 1}`;
                previewItem.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = URL.createObjectURL(file);
                video.controls = true;
                video.muted = true;
                previewItem.appendChild(video);
            }
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'media-file-info';
            fileInfo.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
            previewItem.appendChild(fileInfo);
            
            previewContainer.appendChild(previewItem);
        });
    }

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

    // Load initial form values from latest post
    async function loadInitialFormValues() {
        try {
            const response = await fetch('/api/posts/latest');
            const latestData = await response.json();
            
            if (latestData.hasData) {
                // コンテスト名を設定
                contestNameInput.value = latestData.contestName;
                
                // 状況オプションの読み込み完了を待ってから状況を設定
                // 少し遅延させてstatusSelectのオプションが読み込まれるのを待つ
                setTimeout(() => {
                    // 最新投稿の状況のインデックスを取得
                    const currentStatusIndex = Array.from(statusSelect.options).findIndex(option => 
                        option.value === latestData.status
                    );
                    
                    if (currentStatusIndex !== -1) {
                        // 次の状況オプションを選択（最後の項目の場合は「選択してください」に戻る）
                        const nextIndex = currentStatusIndex + 1;
                        if (nextIndex < statusSelect.options.length) {
                            statusSelect.selectedIndex = nextIndex;
                            
                            // 選択された状況に基づいてメッセージを更新
                            const selectedStatus = statusSelect.value;
                            if (selectedStatus) {
                                updateMessageFromStatus(selectedStatus);
                            }
                            
                            console.log('✅ 最新投稿データから初期値を設定しました（次の状況）:', {
                                contestName: latestData.contestName,
                                previousStatus: latestData.status,
                                nextStatus: selectedStatus,
                                createdAt: latestData.createdAt
                            });
                        } else {
                            // 最後の項目の場合は「選択してください」（インデックス0）を選択
                            statusSelect.selectedIndex = 0;
                            
                            console.log('✅ 最新投稿データから初期値を設定しました（最終状況のため選択なし）:', {
                                contestName: latestData.contestName,
                                previousStatus: latestData.status,
                                nextStatus: '選択してください',
                                createdAt: latestData.createdAt
                            });
                        }
                    } else {
                        // 最新投稿の状況が見つからない場合は最初の実際のオプションを選択
                        if (statusSelect.options.length > 1) {
                            statusSelect.selectedIndex = 1;
                            const selectedStatus = statusSelect.value;
                            if (selectedStatus) {
                                updateMessageFromStatus(selectedStatus);
                            }
                        }
                        
                        console.log('⚠️ 最新投稿の状況が見つからないため、最初のオプションを設定しました:', {
                            contestName: latestData.contestName,
                            previousStatus: latestData.status,
                            fallbackStatus: statusSelect.value,
                            createdAt: latestData.createdAt
                        });
                    }
                }, 500); // 500ms待機
            } else {
                console.log('ℹ️ 投稿履歴がないため、初期値は設定されませんでした');
            }
        } catch (error) {
            console.error('初期値の読み込みに失敗:', error);
        }
    }

    // Clear all posts with confirmation
    async function clearAllPosts() {
        // 確認ダイアログを表示
        const confirmed = window.confirm('すべての投稿履歴を削除しますか？\n\nこの操作は取り消せません。');
        
        if (!confirmed) {
            return;
        }
        
        try {
            const response = await fetch('/api/posts/all', {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const result = await response.json();
                showNotification(result.message, 'success');
                
                // 投稿リストを再読み込み
                loadPosts();
                
                console.log('✅ すべての投稿履歴を削除しました');
            } else {
                const error = await response.json();
                showNotification(error.error || '削除に失敗しました', 'error');
            }
        } catch (error) {
            console.error('削除エラー:', error);
            showNotification('ネットワークエラーが発生しました', 'error');
        }
    }

    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
});