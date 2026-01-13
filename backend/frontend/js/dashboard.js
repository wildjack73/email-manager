// Check authentication on load
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/verify', { credentials: 'include' });
        const data = await res.json();

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
    });

    // Update active nav link
    document.querySelectorAll('.nav a').forEach(link => {
        link.classList.remove('active');
    });
}

document.getElementById('nav-whitelist').addEventListener('click', (e) => {
    e.preventDefault();
    showView('whitelist');
    e.target.classList.add('active');
    loadWhitelist();
});

document.getElementById('nav-keywords').addEventListener('click', (e) => {
    e.preventDefault();
    showView('keywords');
    e.target.classList.add('active');
    loadKeywords();
});

document.querySelector('.nav a[href="/"]').addEventListener('click', (e) => {
    e.preventDefault();
    showView('dashboard');
    e.target.classList.add('active');
    loadDashboard();
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
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
        const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
        const data = await res.json();

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
        const res = await fetch('/api/dashboard/recent?limit=50', { credentials: 'include' });
        const emails = await res.json();

        if (emails.length === 0) {
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
            <div style="font-weight: 500;">${truncate(email.from_email, 30)}</div>
          </td>
          <td>${truncate(email.subject, 50)}</td>
          <td>${classificationBadge}</td>
          <td style="font-size: 0.875rem; color: var(--text-muted); font-style: italic;">${email.claude_reasoning || ''}</td>
          <td>${actionBadge}</td>
        </tr>
      `;
        }).join('');

    } catch (error) {
        console.error('Failed to load emails:', error);
        tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="color: var(--danger);">
          Erreur de chargement
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
        await fetch('/api/dashboard/manual-run', {
            method: 'POST',
            credentials: 'include'
        });

        btn.textContent = '✓ Lancé !';

        // Refresh stats after 5 seconds
        setTimeout(() => {
            loadDashboard();
            btn.textContent = '🚀 Exécuter maintenant';
            btn.disabled = false;
        }, 5000);

    } catch (error) {
        console.error('Manual run failed:', error);
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
        const res = await fetch('/api/whitelist', { credentials: 'include' });
        const domains = await res.json();

        if (domains.length === 0) {
            tbody.innerHTML = `
        <tr>
          <td colspan="3" class="empty-state">
            <p>Aucun domaine whitelisté</p>
          </td>
        </tr>
      `;
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
        const res = await fetch('/api/whitelist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ domain })
        });

        const data = await res.json();

        if (data.success) {
            input.value = '';
            loadWhitelist();
        } else {
            alert(data.error || 'Erreur lors de l\'ajout');
        }
    } catch (error) {
        console.error('Failed to add whitelist:', error);
        alert('Erreur de connexion');
    }
});

async function deleteWhitelist(id) {
    if (!confirm('Voulez-vous vraiment retirer ce domaine de la whitelist ?')) {
        return;
    }

    try {
        await fetch(`/api/whitelist/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        loadWhitelist();
    } catch (error) {
        console.error('Failed to delete whitelist:', error);
        alert('Erreur lors de la suppression');
    }
}

// ==================== KEYWORDS ====================

async function loadKeywords() {
    const tbody = document.getElementById('keywords-tbody');

    try {
        const res = await fetch('/api/keywords', { credentials: 'include' });
        const keywords = await res.json();

        if (keywords.length === 0) {
            tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <p>Aucun mot-clé banni</p>
          </td>
        </tr>
      `;
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
        const res = await fetch('/api/keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ keyword, case_sensitive: caseSensitive })
        });

        const data = await res.json();

        if (data.success) {
            input.value = '';
            document.getElementById('keyword-case-sensitive').checked = false;
            loadKeywords();
        } else {
            alert(data.error || 'Erreur lors de l\'ajout');
        }
    } catch (error) {
        console.error('Failed to add keyword:', error);
        alert('Erreur de connexion');
    }
});

async function deleteKeyword(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce mot-clé ?')) {
        return;
    }

    try {
        await fetch(`/api/keywords/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        loadKeywords();
    } catch (error) {
        console.error('Failed to delete keyword:', error);
        alert('Erreur lors de la suppression');
    }
}

// Load dashboard on initial page load
loadDashboard();
