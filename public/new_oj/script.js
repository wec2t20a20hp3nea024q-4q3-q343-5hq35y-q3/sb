// Local Storage Keys
const STORAGE_KEY = 'new_oj_state';
const FILTERS_STORAGE_KEY = 'new_oj_filters';
const FONT_SCALE_KEY = 'oj_font_scale';
const HIDE_TAGS_KEY = 'oj_hide_tags';   // new key for hiding question tags

// Global state
let state = {
    answers: {}, // qIndex -> answer
    submitted: {}, // qIndex -> true/false
    scores: {}, // qIndex -> earned points (for LQ)
    currentFilters: {
        subject: 'all',
        topic: 'all',
        source: 'all',
        type: 'all',
        search: ''
    }
};

let filteredQuestions = [];
let currentFontScale = 1.0;   // default scale factor (1.0 = 100%)
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.05;

let hideTags = false;          // whether to hide question metadata badges

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    addQIdToDatabase();
    loadState();
    loadFontScale();
    loadHideTagsPreference();   // load saved tag visibility
    setupEventListeners();
    populateFilters();
    restoreFilterUI();
    renderQuestions();
    updateStats();
    setupClock();
    setupLogout();
    applyFontScale();
    updateFontSizePercentDisplay();
    updateTagToggleButton();    // set button text based on current state
    applyTagVisibility();       // apply the hide/show class to container
});

// Add unique ID to each question
function addQIdToDatabase() {
    database.forEach((q, idx) => {
        if (!q.qId) {
            q.qId = 'q_' + idx;
        }
    });
}

// Setup event listeners (including new tag toggle button)
function setupEventListeners() {
    document.getElementById('subjectFilter').addEventListener('change', function() {
        state.currentFilters.subject = this.value;
        const topicSelect = document.getElementById('topicFilter');
        populateTopicFilter();
        topicSelect.value = 'all';
        state.currentFilters.topic = 'all';
        saveFilters();
        renderQuestions();
        updateStats();
    });

    document.getElementById('topicFilter').addEventListener('change', function() {
        state.currentFilters.topic = this.value;
        saveFilters();
        renderQuestions();
        updateStats();
    });

    document.getElementById('sourceFilter').addEventListener('change', function() {
        state.currentFilters.source = this.value;
        saveFilters();
        renderQuestions();
        updateStats();
    });

    document.getElementById('typeFilter').addEventListener('change', function() {
        state.currentFilters.type = this.value;
        saveFilters();
        renderQuestions();
        updateStats();
    });

    document.getElementById('searchInput').addEventListener('input', function() {
        state.currentFilters.search = this.value;
        saveFilters();
        renderQuestions();
        updateStats();
    });

    document.getElementById('backToTopBtn').addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    document.getElementById('clearAllBtn').addEventListener('click', clearAllAnswers);
    document.getElementById('submitAllBtn').addEventListener('click', submitAllAnswers);

    // Font size control buttons
    const decreaseBtn = document.getElementById('fontDecreaseBtn');
    const increaseBtn = document.getElementById('fontIncreaseBtn');
    const resetBtn = document.getElementById('fontResetBtn');
    
    if (decreaseBtn) decreaseBtn.addEventListener('click', () => adjustFontScale(-SCALE_STEP));
    if (increaseBtn) increaseBtn.addEventListener('click', () => adjustFontScale(SCALE_STEP));
    if (resetBtn) resetBtn.addEventListener('click', () => setFontScale(1.0));

    // Tag toggle button
    const toggleTagsBtn = document.getElementById('toggleTagsBtn');
    if (toggleTagsBtn) {
        toggleTagsBtn.addEventListener('click', toggleTagVisibility);
    }
}

// Toggle tag visibility and save preference
function toggleTagVisibility() {
    hideTags = !hideTags;
    saveHideTagsPreference();
    applyTagVisibility();
    updateTagToggleButton();
    // No need to re-render questions, just apply class to container
}

// Apply the hide-tags class to the container (or remove it)
function applyTagVisibility() {
    const container = document.getElementById('questionsContainer');
    if (container) {
        if (hideTags) {
            container.classList.add('hide-question-tags');
        } else {
            container.classList.remove('hide-question-tags');
        }
    }
}

// Update button text based on current state
function updateTagToggleButton() {
    const btn = document.getElementById('toggleTagsBtn');
    if (btn) {
        if (hideTags) {
            btn.innerHTML = '🏷️ Show Tags';
            btn.title = 'Show question metadata tags';
        } else {
            btn.innerHTML = '🏷️ Hide Tags';
            btn.title = 'Hide question metadata tags';
        }
    }
}

// Save hideTags preference to localStorage
function saveHideTagsPreference() {
    localStorage.setItem(HIDE_TAGS_KEY, hideTags ? 'true' : 'false');
}

// Load hideTags preference from localStorage
function loadHideTagsPreference() {
    const saved = localStorage.getItem(HIDE_TAGS_KEY);
    if (saved !== null) {
        hideTags = saved === 'true';
    } else {
        hideTags = false; // default: show tags
    }
}

// Font scale functions (unchanged)
function adjustFontScale(delta) {
    let newScale = currentFontScale + delta;
    newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    newScale = Math.round(newScale * 100) / 100;
    setFontScale(newScale);
}

function setFontScale(scale) {
    if (scale === currentFontScale) return;
    currentFontScale = scale;
    saveFontScale();
    applyFontScale();
    updateFontSizePercentDisplay();
}

function applyFontScale() {
    const container = document.getElementById('questionsContainer');
    if (container) {
        container.style.setProperty('--problem-scale', currentFontScale);
    }
}

function updateFontSizePercentDisplay() {
    const percentSpan = document.getElementById('fontSizePercent');
    if (percentSpan) {
        const percent = Math.round(currentFontScale * 100);
        percentSpan.textContent = `${percent}%`;
    }
}

function saveFontScale() {
    localStorage.setItem(FONT_SCALE_KEY, currentFontScale.toString());
}

function loadFontScale() {
    const saved = localStorage.getItem(FONT_SCALE_KEY);
    if (saved !== null) {
        let parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= MIN_SCALE && parsed <= MAX_SCALE) {
            currentFontScale = parsed;
        } else {
            currentFontScale = 1.0;
        }
    } else {
        currentFontScale = 1.0;
    }
}

// Populate filters (unchanged)
function populateFilters() {
    const subjects = [...new Set(database.map(q => q.subject))].sort();
    const subjectSelect = document.getElementById('subjectFilter');
    
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });

    populateSourceFilter();
    populateTopicFilter();
}

function populateSourceFilter() {
    const sources = [...new Set(database.map(q => q.source))].sort();
    const sourceSelect = document.getElementById('sourceFilter');
    
    sources.forEach(source => {
        const option = document.createElement('option');
        option.value = source;
        option.textContent = source;
        sourceSelect.appendChild(option);
    });

    sourceSelect.disabled = false;
}

function populateTopicFilter() {
    const subjectSelect = document.getElementById('subjectFilter');
    const topicSelect = document.getElementById('topicFilter');
    const selectedSubject = subjectSelect.value;

    topicSelect.innerHTML = '<option value="all">All Topics</option>';

    if (selectedSubject !== 'all') {
        const topics = [...new Set(
            database
                .filter(q => q.subject === selectedSubject)
                .map(q => q.topic)
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

function restoreFilterUI() {
    const subjectSelect = document.getElementById('subjectFilter');
    const topicSelect = document.getElementById('topicFilter');
    const sourceSelect = document.getElementById('sourceFilter');
    const typeSelect = document.getElementById('typeFilter');
    const searchInput = document.getElementById('searchInput');

    if (state.currentFilters.subject && state.currentFilters.subject !== 'all') {
        subjectSelect.value = state.currentFilters.subject;
        populateTopicFilter();
    }

    if (state.currentFilters.topic && state.currentFilters.topic !== 'all' && subjectSelect.value !== 'all') {
        topicSelect.value = state.currentFilters.topic;
    }

    if (state.currentFilters.source && state.currentFilters.source !== 'all') {
        sourceSelect.value = state.currentFilters.source;
    }

    if (state.currentFilters.type && state.currentFilters.type !== 'all') {
        typeSelect.value = state.currentFilters.type;
    }

    if (state.currentFilters.search) {
        searchInput.value = state.currentFilters.search;
    }
}

function filterQuestions() {
    filteredQuestions = database.filter(q => {
        const subjectMatch = state.currentFilters.subject === 'all' || q.subject === state.currentFilters.subject;
        const topicMatch = state.currentFilters.topic === 'all' || q.topic === state.currentFilters.topic;
        const sourceMatch = state.currentFilters.source === 'all' || q.source === state.currentFilters.source;
        const typeMatch = state.currentFilters.type === 'all' || q.type === state.currentFilters.type;
        
        let searchMatch = true;
        if (state.currentFilters.search) {
            const searchTerm = state.currentFilters.search.toLowerCase();
            searchMatch = q.statement.toLowerCase().includes(searchTerm) ||
                         (q.choice && q.choice.some(c => c.toLowerCase().includes(searchTerm)));
        }

        return subjectMatch && topicMatch && sourceMatch && typeMatch && searchMatch;
    });
}

function renderQuestions() {
    filterQuestions();
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    if (filteredQuestions.length === 0) {
        container.innerHTML = '<div class="no-questions">No questions found matching your filters.</div>';
        return;
    }

    filteredQuestions.forEach((q, idx) => {
        const questionIndex = database.indexOf(q);
        const card = createQuestionCard(q, questionIndex);
        container.appendChild(card);
    });

    applyFontScale();
    applyTagVisibility(); // ensure tag visibility class is applied after render (important)

    if (window.renderMathInElement) {
        renderMathInElement(container, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ]
        });
    }
}

function createQuestionCard(q, qIndex) {
    const card = document.createElement('div');
    card.className = `question-card ${q.type}`;
    card.id = `question_${qIndex}`;

    const headerHtml = `
        <div class="question-header">
            <div class="question-meta">
                <span class="meta-badge ${q.type}">${q.type === 'mc' ? 'MC' : 'LQ'}</span>
                <span class="meta-badge">${q.subject}</span>
                <span class="meta-badge">${q.topic}</span>
                <span class="meta-badge">${q.source}</span>
            </div>
            <div class="question-points">${q.point} pts</div>
        </div>
    `;

    const statementHtml = `<div class="statement">${q.statement}</div>`;

    let answerHtml = '';
    if (q.type === 'mc') {
        answerHtml = createMCAnswerArea(q, qIndex);
    } else {
        answerHtml = createLQAnswerArea(q, qIndex);
    }

    card.innerHTML = headerHtml + statementHtml + answerHtml;
    return card;
}

function createMCAnswerArea(q, qIndex) {
    const isSubmitted = state.submitted[qIndex] || false;
    const selectedAnswer = state.answers[qIndex];

    const optionsHtml = q.choice.map((choice, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const isSelected = selectedAnswer === letter;
        return `
            <label class="option">
                <input type="radio" name="q_${qIndex}" value="${letter}" 
                    ${isSelected ? 'checked' : ''} 
                    ${isSubmitted ? 'disabled' : ''}>
                <span class="option-text">${letter}. ${choice}</span>
            </label>
        `;
    }).join('');

    let answerSectionHtml = '';
    if (isSubmitted) {
        const isCorrect = selectedAnswer === q.letter;
        answerSectionHtml = `
            <div class="answer-section show">
                <div class="answer-label">Answer: <strong>${q.letter}</strong> ${isCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
                <div class="answer-text">${q.ans}</div>
            </div>
        `;
    }

    const actionButtonsHtml = `
        <div class="question-actions">
            <button class="btn-submit-q" onclick="submitMC(${qIndex})" ${isSubmitted ? 'disabled' : ''}>
                ${isSubmitted ? 'Submitted' : 'Submit'}
            </button>
            <button class="btn-clear-q" onclick="clearQuestion(${qIndex})">Clear</button>
        </div>
    `;

    return `
        <div class="options">
            ${optionsHtml}
        </div>
        ${answerSectionHtml}
        ${actionButtonsHtml}
    `;
}

function createLQAnswerArea(q, qIndex) {
    const isSubmitted = state.submitted[qIndex] || false;
    const userAnswer = state.answers[qIndex] || '';
    const earnedPoints = state.scores[qIndex];

    let html = `
        <textarea class="answer-textarea" id="textarea_${qIndex}" 
            ${isSubmitted ? 'disabled' : ''} placeholder="Enter your answer here...">${userAnswer}</textarea>
    `;

    if (isSubmitted) {
        html += `
            <div class="answer-section show">
                <div class="answer-label">Model Answer:</div>
                <div class="answer-text">${q.ans}</div>
                <div class="points-input-area">
                    <label>Points earned (out of ${q.point}):</label>
                    <input type="number" id="points_${qIndex}" min="0" max="${q.point}" 
                        value="${earnedPoints || 0}" placeholder="0">
                    <button id="save_btn_${qIndex}" onclick="saveLQPoints(${qIndex}, ${q.point})">Save</button>
                </div>
            </div>
        `;
    }

    const actionButtonsHtml = `
        <div class="question-actions">
            <button class="btn-submit-q" onclick="submitLQ(${qIndex})" ${isSubmitted && earnedPoints !== undefined ? 'disabled' : ''}>
                ${isSubmitted ? 'Submitted' : 'Submit'}
            </button>
            <button class="btn-clear-q" onclick="clearQuestion(${qIndex})">Clear</button>
        </div>
    `;

    return html + actionButtonsHtml;
}

function submitMC(qIndex) {
    const radios = document.getElementsByName(`q_${qIndex}`);
    let selected = null;
    for (let radio of radios) {
        if (radio.checked) {
            selected = radio.value;
            break;
        }
    }

    if (!selected) {
        alert('Please select an answer before submitting.');
        return;
    }

    state.answers[qIndex] = selected;
    state.submitted[qIndex] = true;
    saveState();
    renderQuestions();
    updateStats();
}

function submitLQ(qIndex) {
    const textarea = document.getElementById(`textarea_${qIndex}`);
    const answer = textarea.value.trim();

    if (!answer) {
        alert('Please enter an answer before submitting.');
        return;
    }

    state.answers[qIndex] = answer;
    state.submitted[qIndex] = true;
    saveState();
    renderQuestions();
    updateStats();
}

function createParticleEffect(button, color) {
    const rect = button.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const particleCount = 12 + Math.floor(Math.random() * 4);
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = startX + 'px';
        particle.style.top = startY + 'px';
        particle.style.backgroundColor = color;

        const angle = (i / particleCount) * Math.PI * 2;
        let velocity = 4 + Math.random() * 6;
        let vx = Math.cos(angle) * velocity;
        let vy = Math.sin(angle) * velocity;

        document.body.appendChild(particle);

        let x = startX;
        let y = startY;
        let opacity = 1;
        const duration = 600;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress < 1) {
                x += vx;
                y += vy;
                vy += 0.2;
                opacity = 1 - progress;

                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                particle.style.opacity = opacity;

                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };
        animate();
    }
}

function saveLQPoints(qIndex, maxPoints) {
    const pointsInput = document.getElementById(`points_${qIndex}`);
    const points = parseInt(pointsInput.value);

    if (isNaN(points) || points < 0 || points > maxPoints) {
        alert(`Please enter a valid score between 0 and ${maxPoints}.`);
        return;
    }

    const button = document.getElementById(`save_btn_${qIndex}`);
    let particleColor = '#FFD700';

    if (points === maxPoints) {
        particleColor = '#28a745';
    } else if (points === 0) {
        particleColor = '#DC3545';
    }

    createParticleEffect(button, particleColor);

    button.style.opacity = '0.5';
    button.style.cursor = 'not-allowed';
    button.disabled = true;

    state.scores[qIndex] = points;
    saveState();
    updateStats();
}

function clearQuestion(qIndex) {
    delete state.answers[qIndex];
    delete state.submitted[qIndex];
    delete state.scores[qIndex];
    saveState();
    renderQuestions();
    updateStats();
}

function clearAllAnswers() {
    if (confirm('Are you sure you want to clear all answers? This action cannot be undone.')) {
        state.answers = {};
        state.submitted = {};
        state.scores = {};
        saveState();
        renderQuestions();
        updateStats();
    }
}

function submitAllAnswers() {
    let unanswered = 0;
    filteredQuestions.forEach((q, idx) => {
        const qIndex = database.indexOf(q);
        if (!state.submitted[qIndex]) {
            unanswered++;
            if (q.type === 'mc') {
                const radios = document.getElementsByName(`q_${qIndex}`);
                let isAnswered = false;
                for (let radio of radios) {
                    if (radio.checked) {
                        isAnswered = true;
                        break;
                    }
                }
                if (isAnswered) submitMC(qIndex);
            } else {
                const textarea = document.getElementById(`textarea_${qIndex}`);
                if (textarea && textarea.value.trim()) {
                    submitLQ(qIndex);
                }
            }
        }
    });

    alert('All answered questions have been submitted!');
}

function updateStats() {
    let totalPoints = 0;
    let earnedPoints = 0;
    let answeredCount = 0;
    let submittedCount = 0;

    filteredQuestions.forEach(q => {
        const qIndex = database.indexOf(q);
        totalPoints += q.point;

        if (state.submitted[qIndex]) {
            submittedCount++;

            if (q.type === 'mc') {
                if (state.answers[qIndex] === q.letter) {
                    earnedPoints += q.point;
                }
            } else {
                earnedPoints += state.scores[qIndex] || 0;
            }
        }

        if (state.answers[qIndex]) {
            answeredCount++;
        }
    });

    document.getElementById('totalScoreDisplay').textContent = earnedPoints;
    document.getElementById('maxScoreDisplay').textContent = totalPoints;
    document.getElementById('questionCountDisplay').textContent = submittedCount;
    document.getElementById('totalQuestionCountDisplay').textContent = filteredQuestions.length;
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            state = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to load state', e);
        }
    }

    const storedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (storedFilters) {
        try {
            state.currentFilters = JSON.parse(storedFilters);
        } catch (e) {
            console.error('Failed to load filters', e);
        }
    }
}

function saveFilters() {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(state.currentFilters));
}

function setupClock() {
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        document.querySelector('.clock-time').textContent = `${hours}:${minutes}:${seconds}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                logout();
                window.location.href = '../login.html';
            }
        });
    }

    const userDisplay = document.getElementById('currentUserDisplay');
    if (userDisplay && typeof getCurrentUser === 'function') {
        const user = getCurrentUser();
        if (user) {
            userDisplay.textContent = user;
        }
    }
}