// Local Storage Keys
const STORAGE_KEY = 'recite_state';
const FILTERS_STORAGE_KEY = 'recite_filters';

// Global state
let state = {
    currentFilters: {
        subject: 'all',
        topic: 'all',
        source: 'all'
    },
    currentParagraphIndex: null,
    answers: {}, // blank_index -> user answer
    checked: {}, // blank_index -> true/false (whether answer has been checked)
    correct: {}, // blank_index -> true/false (whether answer is correct)
    filteredParagraphs: []
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadState();
    setupEventListeners();
    populateFilters();
    renderParagraphList();
    updateStats();
    setupClock();
    setupLogout();
    displayCurrentUser(); // 显示当前登录用户
});

// 显示当前登录用户
function displayCurrentUser() {
    const userDisplaySpan = document.getElementById('currentUserDisplay');
    if (userDisplaySpan) {
        // 尝试从 account.js 获取当前用户
        if (typeof getCurrentUser === 'function') {
            const user = getCurrentUser();
            if (user) {
                userDisplaySpan.textContent = user;
                return;
            }
        }
        // 备用：从 localStorage 读取用户名（如果 account.js 存储了）
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            userDisplaySpan.textContent = storedUser;
        } else {
            userDisplaySpan.textContent = 'User';
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('subjectFilter').addEventListener('change', function() {
        state.currentFilters.subject = this.value;
        const topicSelect = document.getElementById('topicFilter');
        populateTopicFilter();
        topicSelect.value = 'all';
        state.currentFilters.topic = 'all';
        state.currentFilters.source = 'all';
        document.getElementById('sourceFilter').value = 'all';
        saveState();
        renderParagraphList();
        updateStats();
    });

    document.getElementById('topicFilter').addEventListener('change', function() {
        state.currentFilters.topic = this.value;
        state.currentFilters.source = 'all';
        document.getElementById('sourceFilter').value = 'all';
        saveState();
        renderParagraphList();
        updateStats();
    });

    document.getElementById('sourceFilter').addEventListener('change', function() {
        state.currentFilters.source = this.value;
        saveState();
        renderParagraphList();
        updateStats();
    });

    document.getElementById('startBtn').addEventListener('click', startReciting);
    document.getElementById('resetBtn').addEventListener('click', resetAll);
    document.getElementById('backBtn').addEventListener('click', backToList);
    document.getElementById('startAgainBtn').addEventListener('click', startReciting);
    document.getElementById('backToListBtn').addEventListener('click', backToList);
}

// Populate filters
function populateFilters() {
    const subjects = [...new Set(reciteDatabase.map(p => p.subject))].sort();
    const subjectSelect = document.getElementById('subjectFilter');
    
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });

    populateTopicFilter();
    populateSourceFilter();
}

// Parse paragraph to extract blanks
function parseBlankMarkers(paragraph) {
    // Find all ~...~ markers and extract the alternatives
    const blanks = [];
    const regex = /~([^~]+)~/g;
    let match;
    
    while ((match = regex.exec(paragraph)) !== null) {
        const alternatives = match[1].split(',').map(s => s.trim());
        blanks.push(alternatives);
    }
    
    return blanks;
}

// Populate topic filter
function populateTopicFilter() {
    const subjectSelect = document.getElementById('subjectFilter');
    const topicSelect = document.getElementById('topicFilter');
    const selectedSubject = subjectSelect.value;

    topicSelect.innerHTML = '<option value="all">All Topics</option>';

    if (selectedSubject !== 'all') {
        const topics = [...new Set(
            reciteDatabase
                .filter(p => p.subject === selectedSubject)
                .map(p => p.topic)
        )].sort();

        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic;
            option.textContent = topic;
            topicSelect.appendChild(option);
        });

        topicSelect.disabled = false;
    } else {
        topicSelect.disabled = true;
    }
}

// Populate source filter
function populateSourceFilter() {
    const subjectSelect = document.getElementById('subjectFilter');
    const topicSelect = document.getElementById('topicFilter');
    const sourceSelect = document.getElementById('sourceFilter');
    const selectedSubject = subjectSelect.value;
    const selectedTopic = topicSelect.value;

    sourceSelect.innerHTML = '<option value="all">All Sources</option>';

    let filteredData = reciteDatabase;
    
    if (selectedSubject !== 'all') {
        filteredData = filteredData.filter(p => p.subject === selectedSubject);
    }
    
    if (selectedTopic !== 'all') {
        filteredData = filteredData.filter(p => p.topic === selectedTopic);
    }

    const sources = [...new Set(filteredData.map(p => p.source))].sort();
    
    sources.forEach(source => {
        const option = document.createElement('option');
        option.value = source;
        option.textContent = source;
        sourceSelect.appendChild(option);
    });

    sourceSelect.disabled = sources.length === 0;
}

// Filter paragraphs based on current filters
function filterParagraphs() {
    state.filteredParagraphs = reciteDatabase.filter(p => {
        const subjectMatch = state.currentFilters.subject === 'all' || p.subject === state.currentFilters.subject;
        const topicMatch = state.currentFilters.topic === 'all' || p.topic === state.currentFilters.topic;
        const sourceMatch = state.currentFilters.source === 'all' || p.source === state.currentFilters.source;
        
        return subjectMatch && topicMatch && sourceMatch;
    });
}

// Render paragraph list (list view)
function renderParagraphList() {
    filterParagraphs();
    
    const container = document.getElementById('paragraphListContainer');
    container.innerHTML = '';

    if (state.filteredParagraphs.length === 0) {
        container.innerHTML = '<div class="no-results">No paragraphs found</div>';
        document.getElementById('startBtn').disabled = true;
        return;
    }

    document.getElementById('startBtn').disabled = false;

    state.filteredParagraphs.forEach((para, idx) => {
        const item = document.createElement('div');
        item.className = 'paragraph-item';
        
        const preview = para.paragraph.replace(/`/g, '').substring(0, 100) + '...';
        
        item.innerHTML = `
            <div class="paragraph-item-meta">
                <span class="meta-tag">${para.subject}</span>
                <span class="meta-tag">${para.topic}</span>
                <span class="meta-tag">${para.source}</span>
            </div>
            <div class="paragraph-preview">${escapeHtml(preview)}</div>
        `;
        
        item.addEventListener('click', () => startRecitingSpecific(idx));
        container.appendChild(item);
    });
}

// Start reciting (default: first in list)
function startReciting() {
    if (state.filteredParagraphs.length === 0) return;
    startRecitingSpecific(0);
}

// Start reciting specific paragraph
function startRecitingSpecific(idx) {
    filterParagraphs();
    state.currentParagraphIndex = idx;
    
    // Reset answers for this paragraph
    state.answers = {};
    state.checked = {};
    state.correct = {};
    
    // Reset visibility: show paragraph display and input area, hide results
    const paragraphDisplay = document.getElementById('paragraphDisplay');
    const inputArea = document.getElementById('inputArea');
    const resultsView = document.getElementById('resultsView');
    if (paragraphDisplay) paragraphDisplay.classList.remove('hidden');
    if (inputArea) inputArea.classList.remove('hidden');
    if (resultsView) resultsView.classList.add('hidden');
    
    showReciteView();
    renderReciteContent();
    
    // Focus on first input
    setTimeout(() => {
        const firstInput = document.querySelector('.inline-blank-input');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Show recite view
function showReciteView() {
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('reciteView').classList.remove('hidden');
}

// Show results view with accuracy
function showResultsView() {
    const para = state.filteredParagraphs[state.currentParagraphIndex];
    const blanks = parseBlankMarkers(para.paragraph);
    const totalBlanks = blanks.length;
    const correctCount = Object.values(state.correct).filter(v => v === true).length;
    const accuracy = Math.round((correctCount / totalBlanks) * 100);
    
    // Update accuracy display
    const accuracyScoreEl = document.getElementById('accuracyScore');
    const accuracyDetailsEl = document.getElementById('accuracyDetails');
    if (accuracyScoreEl) accuracyScoreEl.textContent = accuracy + '%';
    if (accuracyDetailsEl) {
        accuracyDetailsEl.innerHTML = `
            <div>Correct: ${correctCount} / ${totalBlanks}</div>
            <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                ${accuracy === 100 ? 'Perfect! 🎉' : accuracy >= 80 ? 'Great job! 👍' : accuracy >= 60 ? 'Good effort! 📚' : 'Keep practicing! 💪'}
            </div>
        `;
    }
    
    // Hide the paragraph display and input area, show results container
    const paragraphDisplay = document.getElementById('paragraphDisplay');
    const inputArea = document.getElementById('inputArea');
    const resultsView = document.getElementById('resultsView');
    if (paragraphDisplay) paragraphDisplay.classList.add('hidden');
    if (inputArea) inputArea.classList.add('hidden');
    if (resultsView) resultsView.classList.remove('hidden');
}

// Render recite content
function renderReciteContent() {
    const para = state.filteredParagraphs[state.currentParagraphIndex];
    
    // Update progress and metadata
    document.getElementById('progressText').textContent = 
        `Progress: ${state.currentParagraphIndex + 1}/${state.filteredParagraphs.length}`;
    document.getElementById('currentParagraphMeta').textContent = 
        `${para.subject} - ${para.topic} - ${para.source}`;
    
    // Render paragraph with inline inputs
    renderParagraphWithInlineInputs(para);
}

// Render paragraph with inline inputs
function renderParagraphWithInlineInputs(para) {
    const displayContainer = document.getElementById('paragraphContent');
    const inputContainer = document.getElementById('inputArea');
    
    displayContainer.innerHTML = '';
    inputContainer.innerHTML = '';
    
    const blanks = parseBlankMarkers(para.paragraph);
    let blankIndex = 0;
    
    // Split by the ~...~ markers and create fragments
    const parts = para.paragraph.split(/~[^~]+~/);
    const markers = para.paragraph.match(/~[^~]+~/g) || [];
    
    // Build the display with inline inputs
    const wrapper = document.createElement('div');
    wrapper.className = 'paragraph-with-inputs';
    
    for (let i = 0; i < parts.length; i++) {
        // Add text part
        if (parts[i]) {
            const textNode = document.createElement('span');
            textNode.textContent = parts[i];
            wrapper.appendChild(textNode);
        }
        
        // Add input for this blank
        if (i < markers.length) {
            const idx = blankIndex;
            const alternatives = blanks[idx];
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'inline-blank-input';
            input.id = `blank-input-${idx}`;
            input.dataset.blankIndex = idx;
            input.placeholder = `[${idx + 1}]`;
            input.value = state.answers[idx] || '';
            
            // Handle Enter key
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    checkAnswer(idx);
                    e.preventDefault();
                }
            });
            
            // Handle input change
            input.addEventListener('input', (e) => {
                state.answers[idx] = e.target.value;
            });
            
            // Apply styles if checked
            if (state.checked[idx]) {
                input.classList.add('checked');
                input.classList.add(state.correct[idx] ? 'correct' : 'incorrect');
                input.disabled = true;
            }
            
            wrapper.appendChild(input);
            blankIndex++;
        }
    }
    
    displayContainer.appendChild(wrapper);
    
    // Add answer feedback area
    const feedbackContainer = document.createElement('div');
    feedbackContainer.id = 'feedback-area';
    feedbackContainer.className = 'feedback-area';
    
    blanks.forEach((alternatives, idx) => {
        if (state.checked[idx]) {
            const feedbackItem = document.createElement('div');
            feedbackItem.className = 'feedback-item ' + (state.correct[idx] ? 'correct' : 'incorrect');
            feedbackItem.id = `feedback-${idx}`;
            
            if (state.correct[idx]) {
                feedbackItem.textContent = `✓ Blank ${idx + 1}: Correct`;
            } else {
                feedbackItem.textContent = `✗ Blank ${idx + 1}: ${alternatives.map(escapeHtml).join(' / ')}`;
            }
            
            feedbackContainer.appendChild(feedbackItem);
        }
    });
    
    if (feedbackContainer.children.length > 0) {
        inputContainer.appendChild(feedbackContainer);
    }
}

// Check answer - case-insensitive
function checkAnswer(idx) {
    const para = state.filteredParagraphs[state.currentParagraphIndex];
    const blanks = parseBlankMarkers(para.paragraph);
    const userAnswerRaw = (state.answers[idx] || '').trim();
    const userAnswer = userAnswerRaw.toLowerCase();
    const acceptedAnswersRaw = blanks[idx];
    const acceptedAnswers = acceptedAnswersRaw.map(ans => ans.trim().toLowerCase());
    
    state.checked[idx] = true;
    state.correct[idx] = acceptedAnswers.includes(userAnswer);
    
    // Update UI - re-render the entire content to update inline inputs and feedback
    renderParagraphWithInlineInputs(para);
    
    // Check if all blanks are filled
    const allChecked = Object.keys(state.checked).length === blanks.length;
    if (allChecked) {
        // All blanks answered, show results
        showResultsView();
    } else {
        // Move focus to next unchecked input
        moveToNextInput(idx);
    }
}

// Move to next unchecked input
function moveToNextInput(currentIdx) {
    const para = state.filteredParagraphs[state.currentParagraphIndex];
    const blanks = parseBlankMarkers(para.paragraph);
    
    for (let i = currentIdx + 1; i < blanks.length; i++) {
        if (!state.checked[i]) {
            const nextInput = document.getElementById(`blank-input-${i}`);
            if (nextInput) {
                nextInput.focus();
                return;
            }
        }
    }
}

// Back to list
function backToList() {
    // Reset visibility for next start
    const paragraphDisplay = document.getElementById('paragraphDisplay');
    const inputArea = document.getElementById('inputArea');
    const resultsView = document.getElementById('resultsView');
    if (paragraphDisplay) paragraphDisplay.classList.remove('hidden');
    if (inputArea) inputArea.classList.remove('hidden');
    if (resultsView) resultsView.classList.add('hidden');
    
    document.getElementById('listView').classList.remove('hidden');
    document.getElementById('reciteView').classList.add('hidden');
    
    state.currentParagraphIndex = null;
    state.answers = {};
    state.checked = {};
    state.correct = {};
}

// Reset all
function resetAll() {
    if (confirm('Are you sure you want to reset all progress?')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(FILTERS_STORAGE_KEY);
        state = {
            currentFilters: {
                subject: 'all',
                topic: 'all',
                source: 'all'
            },
            currentParagraphIndex: null,
            answers: {},
            checked: {},
            correct: {},
            filteredParagraphs: []
        };
        
        document.getElementById('subjectFilter').value = 'all';
        document.getElementById('topicFilter').value = 'all';
        document.getElementById('sourceFilter').value = 'all';
        
        renderParagraphList();
        updateStats();
    }
}

// Update stats
function updateStats() {
    filterParagraphs();
    document.getElementById('totalCount').textContent = state.filteredParagraphs.length;
}

// Save state
function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentFilters: state.currentFilters
    }));
}

// Load state
function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        if (data.currentFilters) {
            state.currentFilters = data.currentFilters;
        }
    }
}

// Clock setup
function setupClock() {
    const clockSpan = document.querySelector('.clock-time');
    
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockSpan.textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// 修复登出功能
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // 尝试使用 account.js 提供的 logout 函数
            if (typeof logout === 'function') {
                logout();
            } else {
                // 备用登出逻辑：清除用户相关存储并跳转
                localStorage.removeItem('currentUser');
                sessionStorage.clear();
                // 如果有其他 token 或用户标识，也一并清除
                localStorage.removeItem('userToken');
            }
            // 无论哪种方式，都跳转到登录页
            window.location.href = '../login.html';
        });
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 确保用户显示在页面加载时执行
if (typeof setCurrentUserDisplay === 'function') {
    setCurrentUserDisplay();
} else {
    // 如果没有全局函数，手动调用我们的显示函数
    displayCurrentUser();
}