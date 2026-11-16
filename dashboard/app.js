// dashboard/app.js - Token Radar Dashboard Application
(function() {
  'use strict';

  let allRows = [];
  let currentSort = { column: 'radarScore', asc: false };
  let currentCategory = 'all';
  let currentChain = 'all';
  let currentPreTokenOnly = false;
  let currentSearch = '';
  let selectedRowId = null;

  function init() {
    if (!window.RADAR_DATA || !window.RADAR_DATA.rows) {
      console.error('No RADAR_DATA found');
      return;
    }
    allRows = window.RADAR_DATA.rows;

    setupFilters();
    setupTableInteractivity();
    render();
  }

  function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('category-select');
    const chainSelect = document.getElementById('chain-select');
    const preTokenToggle = document.getElementById('pre-token-toggle');
    const resetBtn = document.getElementById('reset-filters-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        render();
      });
    }

    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        render();
      });
    }

    if (chainSelect) {
      chainSelect.addEventListener('change', (e) => {
        currentChain = e.target.value;
        render();
      });
    }

    if (preTokenToggle) {
      preTokenToggle.addEventListener('change', (e) => {
        currentPreTokenOnly = e.target.checked;
        render();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        currentCategory = 'all';
        currentChain = 'all';
        currentPreTokenOnly = false;
        currentSearch = '';
        if (searchInput) searchInput.value = '';
        if (categorySelect) categorySelect.value = 'all';
        if (chainSelect) chainSelect.value = 'all';
        if (preTokenToggle) preTokenToggle.checked = false;
        render();
      });
    }
  }

  function setupTableInteractivity() {
    const headers = document.querySelectorAll('#radar-table th[data-sort]');
    headers.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (currentSort.column === col) {
          currentSort.asc = !currentSort.asc;
        } else {
          currentSort.column = col;
          currentSort.asc = (col === 'name' || col === 'category' || col === 'chain');
        }
        render();
      });
    });
  }

  function getFilteredAndSortedRows() {
    let rows = allRows.filter(row => {
      if (currentCategory !== 'all' && row.category !== currentCategory) {
        return false;
      }
      if (currentChain !== 'all' && row.chain !== currentChain) {
        return false;
      }
      if (currentPreTokenOnly && row.hasToken) {
        return false;
      }
      if (currentSearch) {
        const nameMatch = row.name.toLowerCase().includes(currentSearch);
        const symbolMatch = row.symbol.toLowerCase().includes(currentSearch);
        const descMatch = (row.desc || '').toLowerCase().includes(currentSearch);
        if (!nameMatch && !symbolMatch && !descMatch) {
          return false;
        }
      }
      return true;
    });

    rows.sort((a, b) => {
      let valA = a[currentSort.column];
      let valB = b[currentSort.column];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        if (valA < valB) return currentSort.asc ? -1 : 1;
        if (valA > valB) return currentSort.asc ? 1 : -1;
        return 0;
      } else {
        if (valA < valB) return currentSort.asc ? -1 : 1;
        if (valA > valB) return currentSort.asc ? 1 : -1;
        return 0;
      }
    });

    return rows;
  }

  function render() {
    const tbody = document.getElementById('radar-tbody');
    const countEl = document.getElementById('row-count');
    if (!tbody) return;

    const rows = getFilteredAndSortedRows();
    if (countEl) {
      countEl.textContent = `Showing ${rows.length} of ${allRows.length} protocols`;
    }

    // Update sort indicators on headers
    document.querySelectorAll('#radar-table th[data-sort]').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.getAttribute('data-sort') === currentSort.column) {
        th.classList.add(currentSort.asc ? 'sort-asc' : 'sort-desc');
      }
    });

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No matching protocols found.</td></tr>`;
      return;
    }

    let html = '';
    rows.forEach(row => {
      const isSelected = selectedRowId === row.id;
      const tokenBadge = row.hasToken 
        ? `<span class="badge token-yes" title="Token launched">${row.symbol || 'TOKEN'}</span>`
        : `<span class="badge token-no" title="No token yet (Pre-TGE)">Pre-Token</span>`;
      
      const badgeClass = `badge-cat badge-${row.category}`;

      html += `
        <tr data-id="${row.id}" class="${isSelected ? 'selected' : ''}">
          <td class="col-rank">#${row.rank || '-'}</td>
          <td class="col-name">
            <div class="protocol-cell">
              <span class="p-name">${escapeHtml(row.name)}</span>
              <span class="p-symbol">${escapeHtml(row.symbol)}</span>
            </div>
          </td>
          <td class="col-cat"><span class="${badgeClass}">${escapeHtml(row.category)}</span></td>
          <td class="col-chain">${escapeHtml(row.chain)}</td>
          <td class="col-token">${tokenBadge}</td>
          <td class="col-tvl">${formatCurrency(row.tvl)}</td>
          <td class="col-score"><strong>${Number(row.radarScore || 0).toFixed(1)}</strong></td>
          <td class="col-action"><button class="btn-detail" data-id="${row.id}">Details</button></td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach row click listeners
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return; // let button handler take care
        const id = tr.getAttribute('data-id');
        selectRow(id);
      });
    });

    tbody.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        selectRow(id);
      });
    });

    updateDetailView();
  }

  function selectRow(id) {
    selectedRowId = id;
    document.querySelectorAll('#radar-tbody tr').forEach(tr => {
      if (tr.getAttribute('data-id') === id) {
        tr.classList.add('selected');
      } else {
        tr.classList.remove('selected');
      }
    });
    updateDetailView();
  }

  function updateDetailView() {
    const detailContainer = document.getElementById('detail-view');
    if (!detailContainer) return;

    if (!selectedRowId) {
      detailContainer.innerHTML = `
        <div class="detail-placeholder">
          <div class="placeholder-icon">🎯</div>
          <h3>Select a Protocol</h3>
          <p>Click any protocol row in the table to inspect its full valuation figures, factor breakdown model, and step-by-step farm plan.</p>
        </div>
      `;
      return;
    }

    const row = allRows.find(r => r.id === selectedRowId);
    if (!row) {
      detailContainer.innerHTML = `<div class="detail-placeholder"><p>Protocol not found.</p></div>`;
      return;
    }

    const figures = row.figures || {};
    const factors = row.factors || {};
    const farmPlan = row.farmPlan || [];

    let factorsHtml = '';
    for (const [key, val] of Object.entries(factors)) {
      const label = formatFactorLabel(key);
      const scoreNum = Number(val) || 0;
      const pct = Math.min(Math.max(scoreNum * 10, 0), 100);
      factorsHtml += `
        <div class="factor-row">
          <span class="factor-label" title="${escapeHtml(key)}">${escapeHtml(label)}</span>
          <div class="factor-bar-bg"><div class="factor-bar-fill" style="width: ${pct}%"></div></div>
          <span class="factor-val">${scoreNum.toFixed(1)}</span>
        </div>
      `;
    }

    let farmPlanHtml = '';
    if (farmPlan.length === 0) {
      farmPlanHtml = `<p class="text-muted">No specific farm plan steps listed for this protocol.</p>`;
    } else {
      farmPlanHtml = `<ol class="farm-steps-list">`;
      farmPlan.forEach((step, idx) => {
        farmPlanHtml += `<li><strong>Step ${idx + 1}:</strong> ${escapeHtml(step)}</li>`;
      });
      farmPlanHtml += `</ol>`;
    }

    detailContainer.innerHTML = `
      <div class="detail-header">
        <div class="detail-title-group">
          <h2>${escapeHtml(row.name)} <span class="detail-symbol">(${escapeHtml(row.symbol)})</span></h2>
          <div class="detail-badges">
            <span class="badge-cat badge-${row.category}">${escapeHtml(row.category)}</span>
            <span class="badge chain-badge">${escapeHtml(row.chain)}</span>
            ${row.hasToken ? '<span class="badge token-yes">Has Token</span>' : '<span class="badge token-no">Pre-Token</span>'}
          </div>
        </div>
        <button id="close-detail-btn" class="close-btn" title="Close details">&times;</button>
      </div>

      <p class="detail-desc">${escapeHtml(row.desc || 'No description available.')}</p>

      <div class="detail-sections">
        <div class="detail-section">
          <h3>Protocol Figures</h3>
          <div class="figures-grid">
            <div class="fig-card">
              <span class="fig-label">TVL</span>
              <span class="fig-value">${formatCurrency(figures.tvl !== undefined ? figures.tvl : row.tvl)}</span>
            </div>
            <div class="fig-card">
              <span class="fig-label">Volume (24h)</span>
              <span class="fig-value">${formatCurrency(figures.volume24h)}</span>
            </div>
            <div class="fig-card">
              <span class="fig-label">Revenue (30d)</span>
              <span class="fig-value">${formatCurrency(figures.revenue30d)}</span>
            </div>
            <div class="fig-card">
              <span class="fig-label">FDV</span>
              <span class="fig-value">${formatCurrency(figures.fdv)}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Model Factor Breakdown <span class="score-badge">Radar Score: ${Number(row.radarScore || 0).toFixed(1)}</span></h3>
          <div class="factors-container">
            ${factorsHtml || '<p class="text-muted">No factor breakdown available.</p>'}
          </div>
        </div>

        <div class="detail-section">
          <h3>Airdrop & Farm Plan</h3>
          <div class="farm-plan-box">
            ${farmPlanHtml}
          </div>
        </div>
      </div>
    `;

    const closeBtn = document.getElementById('close-detail-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        selectedRowId = null;
        document.querySelectorAll('#radar-tbody tr').forEach(tr => tr.classList.remove('selected'));
        updateDetailView();
      });
    }
  }

  function formatCurrency(val) {
    if (val === undefined || val === null || isNaN(val)) return 'N/A';
    const num = Number(val);
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(2);
  }

  function formatFactorLabel(key) {
    const labels = {
      tvlDepth: 'TVL Depth',
      volumeGrowth: 'Volume Growth',
      feeYield: 'Fee Yield',
      backingTeam: 'Backing & Team',
      tokenomicsModel: 'Tokenomics Model',
      snapshotRisk: 'Snapshot Risk',
      complexityCost: 'Complexity / Cost'
    };
    if (labels[key]) return labels[key];
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.addEventListener('DOMContentLoaded', init);

})();
