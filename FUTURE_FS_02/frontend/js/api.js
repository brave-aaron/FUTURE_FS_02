const API_BASE = 'http://localhost:5000/api';
const token = localStorage.getItem('crm_token');

if (!token) {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const userLabel = document.getElementById('userLabel');
  if (userLabel) userLabel.textContent = localStorage.getItem('crm_username') || 'Admin';

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'index.html';
    });
  }

  initNotifications();
});

// ---------- Fetch API authentifié ----------
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: authHeaders() });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = 'index.html';
    throw new Error('Session expirée');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur inconnue');
  return data;
}

// ---------- Toasts ----------
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('toast-visible'), 10);
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---------- Helpers communs ----------
function statusLabel(status) {
  return {
    new: 'Nouveau',
    qualified: 'Qualifié',
    contacted: 'Contacté',
    negotiation: 'Négociation',
    converted: 'Converti',
    lost: 'Perdu'
  }[status] || status;
}

function sourceLabel(source) {
  return {
    website: 'Site Web',
    linkedin: 'LinkedIn',
    referral: 'Référence',
    email: 'Email',
    phone: 'Téléphone',
    other: 'Autre'
  }[source] || source;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(value) {
  const n = Number(value) || 0;
  return n > 0 ? `${n.toLocaleString('fr-FR')} F` : '—';
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHr < 24) return `il y a ${diffHr} h`;
  return `il y a ${diffDay} j`;
}

// ---------- Panneau de notifications (partagé dashboard + leads) ----------
async function initNotifications() {
  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  const notifList = document.getElementById('notifList');
  const notifDot = document.getElementById('notifDot');
  if (!notifBtn || !notifPanel) return;

  async function loadNotifications() {
    try {
      const stats = await apiFetch('/dashboard/stats');
      const activities = stats.recentActivity || [];

      const lastChecked = parseInt(localStorage.getItem('crm_last_notif_check') || '0', 10);
      const hasUnread = activities.some((a) => new Date(a.timestamp).getTime() > lastChecked);
      notifDot.classList.toggle('hidden', !hasUnread);

      notifList.innerHTML = activities.length
        ? activities.map((a) => `
            <div class="notif-item">
              <p>${a.message}</p>
              ${a.meta ? `<p class="notif-meta">${a.meta}</p>` : ''}
              <time>${timeAgo(a.timestamp)}</time>
            </div>
          `).join('')
        : '<p class="notif-empty">Aucune activité récente.</p>';
    } catch (err) {
      console.error(err);
    }
  }

  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = notifPanel.classList.contains('hidden');
    notifPanel.classList.toggle('hidden');
    if (isHidden) {
      loadNotifications();
      localStorage.setItem('crm_last_notif_check', Date.now().toString());
      notifDot.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!notifPanel.contains(e.target) && e.target !== notifBtn) {
      notifPanel.classList.add('hidden');
    }
  });

  loadNotifications();
  setInterval(loadNotifications, 15000);
}
