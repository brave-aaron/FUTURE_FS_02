const API_BASE = 'http://localhost:5000/api';

if (localStorage.getItem('crm_token')) {
  window.location.href = 'dashboard.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errorMsg.textContent = data.error || 'Échec de la connexion.';
      errorMsg.classList.remove('hidden');
      return;
    }

    localStorage.setItem('crm_token', data.token);
    localStorage.setItem('crm_username', data.username);
    window.location.href = 'dashboard.html';
  } catch (err) {
    errorMsg.textContent = 'Impossible de contacter le serveur. Vérifiez que le backend tourne.';
    errorMsg.classList.remove('hidden');
  }
});
