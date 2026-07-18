const STATUS_COLORS = {
  new: 'var(--new)',
  qualified: 'var(--qualified)',
  contacted: 'var(--contacted)',
  negotiation: 'var(--negotiation)',
  converted: 'var(--converted)',
  lost: 'var(--lost)'
};

async function loadDashboard() {
  try {
    const stats = await apiFetch('/dashboard/stats');
    renderMetrics(stats.metrics);
    renderPipeline(stats.metrics);
    renderLatestLeads(stats.latestLeads);
    renderActivity(stats.recentActivity);
  } catch (err) {
    console.error(err);
    showToast(err.message, 'danger');
  }
}

function renderMetrics(m) {
  document.getElementById('mTotal').textContent = m.totalLeads;
  document.getElementById('mQualified').textContent = m.qualifiedLeads;
  document.getElementById('mQualifiedSub').textContent =
    m.totalLeads > 0 ? `${Math.round((m.qualifiedLeads / m.totalLeads) * 100)}% du pipeline` : '0% du pipeline';
  document.getElementById('mConversion').textContent = `${m.conversionRate}%`;
  document.getElementById('mPipeline').textContent = formatMoney(m.pipelineValue);
}

function renderPipeline(m) {
  const bar = document.getElementById('pipelineBar');
  const legend = document.getElementById('pipelineLegend');
  const total = m.totalLeads || 0;

  const segments = [
    { key: 'qualified', label: 'Qualifié', count: m.qualifiedLeads },
    { key: 'negotiation', label: 'Négociation', count: m.negotiationLeads },
    { key: 'converted', label: 'Converti', count: m.convertedLeads },
    { key: 'lost', label: 'Perdu', count: m.lostLeads }
  ];
  const accounted = segments.reduce((s, seg) => s + seg.count, 0);
  const others = Math.max(total - accounted, 0);

  bar.innerHTML = '';
  legend.innerHTML = '';

  if (total === 0) {
    bar.innerHTML = '<div class="pipeline-empty"></div>';
    legend.innerHTML = '<span class="muted small">Aucune donnée pour le moment.</span>';
    return;
  }

  segments.forEach((seg) => {
    if (seg.count <= 0) return;
    const pct = (seg.count / total) * 100;
    const div = document.createElement('div');
    div.style.width = `${pct}%`;
    div.style.background = STATUS_COLORS[seg.key];
    div.title = `${seg.label} (${seg.count})`;
    bar.appendChild(div);
  });
  if (others > 0) {
    const div = document.createElement('div');
    div.style.width = `${(others / total) * 100}%`;
    div.style.background = 'var(--muted-light)';
    div.title = `Nouveau / Contacté (${others})`;
    bar.appendChild(div);
  }

  const legendItems = [...segments];
  if (others > 0) legendItems.push({ key: 'others', label: 'Nouveau / Contacté', count: others });

  legend.innerHTML = legendItems
    .filter((s) => s.count > 0)
    .map((s) => `
      <span class="legend-item">
        <span class="legend-dot" style="background:${s.key === 'others' ? 'var(--muted-light)' : STATUS_COLORS[s.key]}"></span>
        ${s.label} (${s.count})
      </span>
    `).join('');
}

function renderLatestLeads(leads) {
  const tbody = document.getElementById('latestLeadsBody');
  const empty = document.getElementById('latestEmpty');
  tbody.innerHTML = '';

  if (!leads || leads.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  leads.forEach((lead) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="cell-title">${lead.full_name}</div>
        <div class="cell-sub">${lead.email}</div>
      </td>
      <td>${lead.company || '—'}</td>
      <td><span class="badge badge-${lead.status}">${statusLabel(lead.status)}</span></td>
      <td class="text-right value-cell">${formatMoney(lead.value)}</td>
    `;
    tr.addEventListener('click', () => { window.location.href = `leads.html?open=${lead.id}`; });
    tbody.appendChild(tr);
  });
}

function renderActivity(activities) {
  const list = document.getElementById('activityList');
  const empty = document.getElementById('activityEmpty');

  if (!activities || activities.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = activities.map((a) => `
    <div class="activity-item">
      <span class="activity-dot activity-${a.type.toLowerCase()}"></span>
      <div>
        <p class="activity-msg">${a.message}</p>
        ${a.meta ? `<p class="activity-meta">${a.meta}</p>` : ''}
        <p class="activity-time">${timeAgo(a.timestamp)}</p>
      </div>
    </div>
  `).join('');
}

loadDashboard();
