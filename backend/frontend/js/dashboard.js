// 🌐 Global API Fetcher with Auth Redirection
async function apiFetch(url, options = {}) {
    const finalOptions = {
        credentials: 'include',
        ...options
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        finalOptions.headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        finalOptions.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, finalOptions);

    if (res.status === 401) {
        console.warn('⚠️ Session expired or unauthorized, redirecting to login...');
        window.location.href = '/login.html';
        throw new Error('Unauthorized');
    }

    const data = await res.json();

    // Handle error objects from API
    if (data.error && res.status >= 400) {
        throw new Error(data.error);
    }

    return data;
}

// Check authentication on load
async function checkAuth() {
    try {
        const data = await apiFetch('/api/auth/verify');
        if (!data.authenticated) {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
    }
}

checkAuth();

// Navigation
const views = {
    dashboard: document.getElementById('dashboard-view'),
    whitelist: document.getElementById('whitelist-view'),
    keywords: document.getElementById('keywords-view')
};

function showView(viewName) {
    Object.keys(views).forEach(key => {
        views[key].style.display = key === viewName ? 'block' : 'none';

        // Update menu links styling
        const navLink = document.getElementById(`nav-${key}`) || document.querySelector(`.nav a[href="/"]`);
        if (navLink) {
            if (key === viewName) navLink.classList.add('active');
            else if (viewName !== 'dashboard' || key !== 'dashboard') navLink.classList.remove('active');
        }
    });

    document.querySelectorAll('.nav a').forEach(link => link.classList.remove('active'));
    if (viewName === 'dashboard') document.querySelector('.nav a[href="/"]').classList.add('active');
    else if (document.getElementById(`nav-${viewName}`)) document.getElementById(`nav-${viewName}`).classList.add('active');
}

document.getElementById('nav-whitelist').addEventListener('click', (e) => {
    e.preventDefault();
    showView('whitelist');
    loadWhitelist();
});

document.getElementById('nav-keywords').addEventListener('click', (e) => {
    e.preventDefault();
    showView('keywords');
    loadKeywords();
});

document.querySelector('.nav a[href="/"]').addEventListener('click', (e) => {
    e.preventDefault();
    showView('dashboard');
    loadDashboard();
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/login.html';
    }
});

// ==================== DASHBOARD ====================

async function loadDashboard() {
    await Promise.all([
        loadStats(),
        loadRecentEmails()
    ]);
}

async function loadStats() {
    try {
        const data = await apiFetch('/api/dashboard/stats');
        document.getElementById('stat-total').textContent = data.total || 0;
        document.getElementById('stat-spam').textContent = data.spam_count || 0;
        document.getElementById('stat-important').textContent = data.important_count || 0;

        const deletionRate = data.total > 0
            ? Math.round((data.deleted_count / data.total) * 100)
            : 0;
        document.getElementById('stat-rate').textContent = deletionRate + '%';
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadRecentEmails() {
    const tbody = document.getElementById('emails-tbody');

    try {
        const emails = await apiFetch('/api/dashboard/recent?limit=50');

        if (!Array.isArray(emails) || emails.length === 0) {
            tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <div class="empty-state-icon">📭</div>
            <p>Aucun email traité pour le moment</p>
          </td>
        </tr>
      `;
            return;
        }

        tbody.innerHTML = emails.map(email => {
            const date = new Date(email.processed_at).toLocaleString('fr-FR');
            const classificationBadge = getClassificationBadge(email.classification);
            const actionBadge = getActionBadge(email.action_taken);

            return `
        <tr>
          <td style="font-size: 0.875rem; color: var(--text-muted);">${date}</td>
          <td>
            <div style="font-weight: 500;">${truncate(email.from_email, 35)}</div>
          </td>
          <td>${truncate(email.subject, 60)}</td>
          <td>${classificationBadge}</td>
          <td>
            <div class="reasoning-cell">${email.claude_reasoning || ''}</div>
          </td>
          <td>${actionBadge}</td>
        </tr>
      `;
        }).join('');

    } catch (error) {
        console.error('Failed to load emails:', error);
        if (error.message === 'Unauthorized') return; // Silence if redirecting

        tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="color: var(--danger);">
          Erreur: ${error.message}
        </td>
      </tr>
    `;
    }
}

function getClassificationBadge(classification) {
    const badges = {
        'SPAM': '<span class="badge badge-spam">Spam</span>',
        'INUTILE': '<span class="badge badge-useless">Inutile</span>',
        'IMPORTANT': '<span class="badge badge-important">Important</span>'
    };
    return badges[classification] || classification;
}

function getActionBadge(action) {
    const badges = {
        'DELETED': '<span class="badge badge-deleted">Supprimé</span>',
        'KEPT': '<span class="badge badge-kept">Gardé</span>'
    };
    return badges[action] || action;
}

function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
}

document.getElementById('manual-run-btn').addEventListener('click', async () => {
    const btn = document.getElementById('manual-run-btn');
    btn.disabled = true;
    btn.textContent = '⏳ En cours...';

    try {
        await apiFetch('/api/dashboard/manual-run', { method: 'POST' });
        btn.textContent = '✓ Lancé !';
        setTimeout(() => {
            loadDashboard();
            btn.textContent = '🚀 Exécuter maintenant';
            btn.disabled = false;
        }, 5000);
    } catch (error) {
        console.error('Manual run failed:', error);
        if (error.message === 'Unauthorized') return;
        btn.textContent = '❌ Erreur';
        setTimeout(() => {
            btn.textContent = '🚀 Exécuter maintenant';
            btn.disabled = false;
        }, 2000);
    }
});

document.getElementById('refresh-btn').addEventListener('click', () => {
    loadDashboard();
});

// ==================== WHITELIST ====================

async function loadWhitelist() {
    const tbody = document.getElementById('whitelist-tbody');
    try {
        const domains = await apiFetch('/api/whitelist');
        if (domains.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="empty-state"><p>Aucun domaine whitelisté</p></td></tr>`;
            return;
        }

        tbody.innerHTML = domains.map(domain => {
            const date = new Date(domain.created_at).toLocaleDateString('fr-FR');
            return `
        <tr>
          <td><strong>${domain.domain}</strong></td>
          <td style="color: var(--text-muted);">${date}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteWhitelist(${domain.id})">
              🗑️ Supprimer
            </button>
          </td>
        </tr>
      `;
        }).join('');
    } catch (error) {
        console.error('Failed to load whitelist:', error);
    }
}

document.getElementById('whitelist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('whitelist-domain');
    const domain = input.value.trim();

    try {
        const data = await apiFetch('/api/whitelist', {
            method: 'POST',
            body: { domain }
        });
        if (data.success) {
            input.value = '';
            loadWhitelist();
        } else {
            alert(data.error || 'Erreur lors de l\'ajout');
        }
    } catch (error) {
        if (error.message === 'Unauthorized') return;
        console.error('Failed to add whitelist:', error);
        alert(error.message || 'Erreur de connexion');
    }
});

async function deleteWhitelist(id) {
    if (!confirm('Voulez-vous vraiment retirer ce domaine de la whitelist ?')) return;
    try {
        await apiFetch(`/api/whitelist/${id}`, { method: 'DELETE' });
        loadWhitelist();
    } catch (error) {
        if (error.message === 'Unauthorized') return;
        console.error('Failed to delete whitelist:', error);
        alert('Erreur lors de la suppression');
    }
}

// ==================== KEYWORDS ====================

async function loadKeywords() {
    const tbody = document.getElementById('keywords-tbody');
    try {
        const keywords = await apiFetch('/api/keywords');
        if (keywords.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><p>Aucun mot-clé banni</p></td></tr>`;
            return;
        }

        tbody.innerHTML = keywords.map(keyword => {
            const date = new Date(keyword.created_at).toLocaleDateString('fr-FR');
            const caseSensitive = keyword.case_sensitive
                ? '<span class="badge badge-important">Oui</span>'
                : '<span class="badge" style="background: var(--bg-tertiary);">Non</span>';
            return `
        <tr>
          <td><strong>${keyword.keyword}</strong></td>
          <td>${caseSensitive}</td>
          <td style="color: var(--text-muted);">${date}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteKeyword(${keyword.id})">
              🗑️ Supprimer
            </button>
          </td>
        </tr>
      `;
        }).join('');
    } catch (error) {
        console.error('Failed to load keywords:', error);
    }
}

document.getElementById('keyword-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('keyword-text');
    const caseSensitive = document.getElementById('keyword-case-sensitive').checked;
    const keyword = input.value.trim();

    try {
        const data = await apiFetch('/api/keywords', {
            method: 'POST',
            body: { keyword, case_sensitive: caseSensitive }
        });
        if (data.success) {
            input.value = '';
            document.getElementById('keyword-case-sensitive').checked = false;
            loadKeywords();
        } else {
            alert(data.error || 'Erreur lors de l\'ajout');
        }
    } catch (error) {
        if (error.message === 'Unauthorized') return;
        console.error('Failed to add keyword:', error);
        alert(error.message || 'Erreur de connexion');
    }
});

async function deleteKeyword(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce mot-clé ?')) return;
    try {
        await apiFetch(`/api/keywords/${id}`, { method: 'DELETE' });
        loadKeywords();
    } catch (error) {
        if (error.message === 'Unauthorized') return;
        console.error('Failed to delete keyword:', error);
        alert('Erreur lors de la suppression');
    }
}

// Initial Load
loadDashboard();
