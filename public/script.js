(function() {
  // -------------------- LIVE CLOCK --------------------
  function updateClock() {
    const clockEl = document.getElementById('liveClock');
    if (!clockEl) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hh}:${mm}:${ss}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // -------------------- SIDEBAR TOGGLE --------------------
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sidebar.classList.toggle('sidebar--collapsed');
    });
  }

  // -------------------- ACTIVE NAVIGATION LINK (based on current URL) --------------------
  function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const isSubpage = currentPath.includes('/folder/');
    const links = document.querySelectorAll('.sidebar__link');
    links.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (!href) return;
      if (href === 'index.html' && (currentPath.endsWith('/') || currentPath.endsWith('index.html') || currentPath === '/')) {
        link.classList.add('active');
      } 
      else if (href === 'folder/index.html' && currentPath.includes('/folder/index.html')) {
        link.classList.add('active');
      }
      else if (href === '../index.html' && (currentPath.endsWith('/') || currentPath.endsWith('index.html') || currentPath === '/')) {
        link.classList.add('active');
      }
    });
    if (isSubpage) {
      const contestsLink = document.querySelector('.sidebar__link[data-nav="contests"]');
      if (contestsLink) contestsLink.classList.add('active');
    } else {
      const dashboardLink = document.querySelector('.sidebar__link[data-nav="dashboard"]');
      if (dashboardLink && !document.querySelector('.sidebar__link.active')) {
        dashboardLink.classList.add('active');
      }
    }
  }
  setActiveNavLink();

  // -------------------- USER SESSION & DROPDOWN --------------------
  const userArea = document.getElementById('userArea');

  async function loadUser() {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data.loggedIn && data.user) {
        renderLoggedIn(data.user.username);
      } else {
        renderLoggedOut();
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      renderLoggedOut();
    }
  }

  function renderLoggedIn(username) {
    userArea.innerHTML = `
      <div class="user-dropdown">
        <button class="user-dropdown__trigger" id="userDropdownBtn">
          <i class="fa fa-user-circle"></i>
          <span>${escapeHtml(username)}</span>
          <i class="fa fa-chevron-down" style="font-size: 0.8rem;"></i>
        </button>
        <ul class="user-dropdown__menu" id="userDropdownMenu">
          <li><button id="logoutBtn">Logout</button></li>
        </ul>
      </div>
    `;
    // Attach dropdown toggle
    const trigger = document.getElementById('userDropdownBtn');
    const menu = document.getElementById('userDropdownMenu');
    if (trigger && menu) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('show');
      });
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!trigger.contains(e.target) && !menu.contains(e.target)) {
          menu.classList.remove('show');
        }
      });
    }
    // Attach logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const res = await fetch('/api/logout', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          window.location.href = data.redirect;
        } else {
          alert('Logout failed');
        }
      });
    }
  }

  function renderLoggedOut() {
    userArea.innerHTML = `
      <div class="auth-links">
        <a href="login.html">Login</a>
      </div>
    `;
  }

  // Helper to prevent XSS
  function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  loadUser();

  // -------------------- SEARCH PLACEHOLDER (unchanged) --------------------
  const searchInputs = document.querySelectorAll('.search-input');
  searchInputs.forEach(input => {
    input.addEventListener('input', function(e) {
      const resultsDiv = this.closest('.sidebar__search')?.querySelector('.search-results');
      if (resultsDiv) {
        if (this.value.trim() !== '') {
          resultsDiv.style.display = 'block';
          resultsDiv.textContent = `No results for "${this.value}"`;
        } else {
          resultsDiv.style.display = 'none';
        }
      }
    });
  });
})();