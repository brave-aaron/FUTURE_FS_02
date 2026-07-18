let currentPage = 1;
const limit = 10;
let currentTotalPages = 1;

function getFilters() {
  return {
    search: document.getElementById('searchInput').value.trim(),
    status: document.getElementById('statusFilter').value,
    source: document.getElementById('sourceFilter').value,
    sort: document.getElementById('sortSelect').value
  };
}

function buildQuery(extra = {}) {
  const f = getFilters();
  const params = new URLSearchParams();
  if (f.search) params.set('search', f.search);
  if (f.status !== 'all') params.set('status', f.status);
  if (f.source !== 'all') params.set('source', f.source);
  params.set('sort', f.sort);
  params.set('page', extra.page || currentPage);
  params.set('limit', extra.limit || limit);
  return params.toString();
}

// ---------- Chargement de la liste ----------
async function loadLeads() {
  try {
    const data = await apiFetch(`/leads?${buildQuery()}`);
    renderTable(data.leads);
    renderPagination(data.pagination);
  } catch (err) {
    console.error(err);
    showToast(err.message, 'danger');
  }
}

function renderTable(leads) {
  const tbody = document.getElementById('leadsTableBody');
  const empty = document.getElementById('emptyState');
  tbody.innerHTML = '';

  if (leads.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  leads.forEach((lead) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Nom">
        <div class="cell-title">${lead.full_name}</div>
        <div class="cell-sub">${lead.email}</div>
      </td>
      <td data-label="Société">${lead.company || '—'}</td>
      <td data-label="Source">${sourceLabel(lead.source)}</td>
      <td data-label="Statut"><span class="badge badge-${lead.status}">${statusLabel(lead.status)}</span></td>
      <td data-label="Valeur" class="text-right value-cell">${formatMoney(lead.value)}</td>
      <td class="row-actions" data-label="">
        <button data-action="view" title="Voir le détail">👁</button>
        <button data-action="edit" title="Modifier">✎</button>
        <button data-action="delete" title="Supprimer">🗑</button>
      </td>
    `;
    tr.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'edit') { e.stopPropagation(); openLeadModal(lead); return; }
      if (action === 'delete') { e.stopPropagation(); deleteLead(lead.id); return; }
      openDetailDrawer(lead.id);
    });
    tbody.appendChild(tr);
  });
}

function renderPagination(pagination) {
  currentTotalPages = pagination.totalPages;
  const info = document.getElementById('paginationInfo');
  const controls = document.getElementById('paginationControls');

  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);
  info.textContent = `Affichage de ${start} à ${end} sur ${pagination.total} leads`;

  controls.innerHTML = '';
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '←';
  prevBtn.disabled = pagination.page === 1;
  prevBtn.addEventListener('click', () => { currentPage = Math.max(pagination.page - 1, 1); loadLeads(); });
  controls.appendChild(prevBtn);

  for (let i = 1; i <= pagination.totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === pagination.page) btn.classList.add('active');
    btn.addEventListener('click', () => { currentPage = i; loadLeads(); });
    controls.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '→';
  nextBtn.disabled = pagination.page === pagination.totalPages;
  nextBtn.addEventListener('click', () => { currentPage = Math.min(pagination.page + 1, pagination.totalPages); loadLeads(); });
  controls.appendChild(nextBtn);
}

// ---------- Recherche / filtres / tri ----------
document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  currentPage = 1;
  loadLeads();
});
['statusFilter', 'sourceFilter', 'sortSelect'].forEach((id) => {
  document.getElementById(id).addEventListener('change', () => { currentPage = 1; loadLeads(); });
});
document.getElementById('resetFiltersBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('sourceFilter').value = 'all';
  document.getElementById('sortSelect').value = 'createdAt_desc';
  currentPage = 1;
  loadLeads();
});

// ---------- Export CSV ----------
document.getElementById('exportBtn').addEventListener('click', async () => {
  try {
    const data = await apiFetch(`/leads?${buildQuery({ page: 1, limit: 100000 })}`);
    const leads = data.leads;

    if (leads.length === 0) {
      showToast('Aucun lead à exporter avec ces filtres.', 'warning');
      return;
    }

    const headers = ['ID', 'Nom complet', 'Email', 'Téléphone', 'Société', 'Source', 'Statut', 'Valeur (F CFA)', 'Créé le'];
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = [
      headers.join(','),
      ...leads.map((l) => [
        l.id, l.full_name, l.email, l.phone, l.company,
        sourceLabel(l.source), statusLabel(l.status), l.value, l.created_at
      ].map(escapeCSV).join(','))
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mini_crm_leads_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`${leads.length} lead(s) exporté(s) avec succès.`, 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

// ---------- Modale création / édition ----------
const overlay = document.getElementById('overlay');
const leadModal = document.getElementById('leadModal');
const leadForm = document.getElementById('leadForm');
const leadFormError = document.getElementById('leadFormError');

document.getElementById('newLeadBtn').addEventListener('click', () => openLeadModal());

function openLeadModal(lead = null) {
  leadFormError.classList.add('hidden');
  document.getElementById('leadModalTitle').textContent = lead ? 'Modifier le lead' : 'Nouveau lead';
  document.getElementById('leadId').value = lead ? lead.id : '';
  document.getElementById('leadName').value = lead ? lead.full_name : '';
  document.getElementById('leadEmail').value = lead ? lead.email : '';
  document.getElementById('leadPhone').value = lead ? (lead.phone || '') : '';
  document.getElementById('leadCompany').value = lead ? (lead.company || '') : '';
  document.getElementById('leadSource').value = lead ? lead.source : 'website';
  document.getElementById('leadStatus').value = lead ? lead.status : 'new';
  document.getElementById('leadValue').value = lead ? lead.value : 0;
  showOverlayElement(leadModal);
}

leadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  leadFormError.classList.add('hidden');

  const id = document.getElementById('leadId').value;
  const payload = {
    fullName: document.getElementById('leadName').value.trim(),
    email: document.getElementById('leadEmail').value.trim(),
    phone: document.getElementById('leadPhone').value.trim(),
    company: document.getElementById('leadCompany').value.trim(),
    source: document.getElementById('leadSource').value,
    status: document.getElementById('leadStatus').value,
    value: Number(document.getElementById('leadValue').value) || 0
  };

  try {
    if (id) {
      await apiFetch(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Lead mis à jour avec succès.', 'success');
    } else {
      await apiFetch('/leads', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Lead créé avec succès.', 'success');
    }
    hideOverlayElement(leadModal);
    loadLeads();
  } catch (err) {
    leadFormError.textContent = err.message;
    leadFormError.classList.remove('hidden');
  }
});

async function deleteLead(id) {
  if (!confirm('Supprimer définitivement ce lead ?')) return;
  try {
    await apiFetch(`/leads/${id}`, { method: 'DELETE' });
    showToast('Lead supprimé avec succès.', 'success');
    loadLeads();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ---------- Tiroir de détail + notes ----------
const detailDrawer = document.getElementById('detailDrawer');
let activeLead = null;

async function openDetailDrawer(id) {
  try {
    const lead = await apiFetch(`/leads/${id}`);
    activeLead = lead;

    document.getElementById('detailName').textContent = lead.full_name;
    document.getElementById('detailCompany').textContent = lead.company || 'Sans société';
    document.getElementById('detailEmail').textContent = lead.email;
    document.getElementById('detailPhone').textContent = lead.phone || '—';
    document.getElementById('detailSource').textContent = sourceLabel(lead.source);
    document.getElementById('detailStatusBadge').innerHTML =
      `<span class="badge badge-${lead.status}">${statusLabel(lead.status)}</span>`;
    document.getElementById('detailValue').textContent = formatMoney(lead.value);
    document.getElementById('detailCreated').textContent = formatDate(lead.created_at);
    document.getElementById('noteLeadId').value = lead.id;

    renderNotes(lead.notes, lead.id);
    showOverlayElement(detailDrawer, true);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function renderNotes(notes, leadId) {
  const notesList = document.getElementById('notesList');
  notesList.innerHTML = notes.length
    ? notes.map((n) => `
        <div class="note-item">
          <div class="note-content">${n.content}</div>
          <div class="note-footer">
            <time>${formatDate(n.created_at)}</time>
            <button class="note-delete" data-note-id="${n.id}" title="Supprimer la note">🗑</button>
          </div>
        </div>
      `).join('')
    : '<p class="muted small">Aucune note pour ce lead.</p>';

  notesList.querySelectorAll('.note-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette note ?')) return;
      try {
        await apiFetch(`/leads/${leadId}/notes/${btn.dataset.noteId}`, { method: 'DELETE' });
        showToast('Note supprimée.', 'success');
        openDetailDrawer(leadId);
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  });
}

document.getElementById('noteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const leadId = document.getElementById('noteLeadId').value;
  const noteText = document.getElementById('noteText');

  try {
    await apiFetch(`/leads/${leadId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content: noteText.value.trim() })
    });
    noteText.value = '';
    showToast('Note ajoutée avec succès.', 'success');
    openDetailDrawer(leadId);
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

document.getElementById('detailEditBtn').addEventListener('click', () => {
  if (!activeLead) return;
  hideOverlayElement(detailDrawer, true);
  openLeadModal(activeLead);
});

document.getElementById('detailDeleteBtn').addEventListener('click', async () => {
  if (!activeLead) return;
  if (!confirm(`Supprimer définitivement le lead "${activeLead.full_name}" ?`)) return;
  try {
    await apiFetch(`/leads/${activeLead.id}`, { method: 'DELETE' });
    showToast('Lead supprimé avec succès.', 'success');
    hideOverlayElement(detailDrawer, true);
    loadLeads();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

// ---------- Overlay partagé (modale + tiroir) ----------
function showOverlayElement(el, isDrawer = false) {
  overlay.classList.remove('hidden');
  el.classList.remove('hidden');
  if (isDrawer) el.classList.add('drawer-open');
}
function hideOverlayElement(el, isDrawer = false) {
  overlay.classList.add('hidden');
  el.classList.add('hidden');
  if (isDrawer) el.classList.remove('drawer-open');
}
overlay.addEventListener('click', () => {
  hideOverlayElement(leadModal);
  hideOverlayElement(detailDrawer, true);
});
document.querySelectorAll('[data-close-modal]').forEach((btn) => btn.addEventListener('click', () => hideOverlayElement(leadModal)));
document.querySelectorAll('[data-close-drawer]').forEach((btn) => btn.addEventListener('click', () => hideOverlayElement(detailDrawer, true)));

// ---------- Init ----------
(function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const openId = urlParams.get('open');
  loadLeads();
  if (openId) openDetailDrawer(openId);
})();
