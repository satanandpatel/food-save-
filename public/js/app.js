// FoodSave Frontend Controller — Real Backend & MySQL Integration

document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle Elements
  const themeToggleBtn = document.getElementById('theme-toggle');

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeToggleBtn) themeToggleBtn.innerHTML = '☀️ Light';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeToggleBtn) themeToggleBtn.innerHTML = '🌙 Dark';
    }
    localStorage.setItem('foodsave_theme', theme);
  }

  const savedTheme = localStorage.getItem('foodsave_theme') || 'light';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      applyTheme(isDark ? 'light' : 'dark');
    });
  }

  // Form Elements
  const catButtons = document.querySelectorAll('.cat-btn');
  const qtyInput = document.getElementById('qty');
  const ageInput = document.getElementById('age');
  const descInput = document.getElementById('desc');
  const citySelect = document.getElementById('city-select');
  const donorNameInput = document.getElementById('donor-name');
  const toStep2Btn = document.getElementById('to-step-2');

  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');

  const fill1 = document.getElementById('fill-1');
  const fill2 = document.getElementById('fill-2');
  const fill3 = document.getElementById('fill-3');

  const refreshHistoryBtn = document.getElementById('refresh-history-btn');
  const historyTbody = document.getElementById('history-tbody');

  let selectedCat = null;
  let currentListing = null;
  let currentMatchedNgos = [];
  let selectedNgoIndex = 0;

  // Category Selection
  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCat = btn.dataset.cat;
      checkReady();
    });
  });

  [qtyInput, ageInput, descInput, citySelect, donorNameInput].forEach(el => {
    if (el) el.addEventListener('input', checkReady);
  });

  function checkReady() {
    const hasCat = !!selectedCat;
    const hasQty = qtyInput.value.trim().length > 0 && parseInt(qtyInput.value, 10) > 0;
    const hasAge = ageInput.value.trim().length > 0;
    toStep2Btn.disabled = !(hasCat && hasQty && hasAge);
  }

  // Helper for initials
  function getInitials(name) {
    if (!name) return 'FS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Step 1 -> Step 2: Submit to POST /api/listings
  toStep2Btn.addEventListener('click', async () => {
    const qty = parseInt(qtyInput.value, 10);
    const city = citySelect.value;
    const donorName = donorNameInput.value.trim() || 'Food Partner';
    const age = ageInput.value.trim();
    const notes = descInput.value.trim();

    step1.style.display = 'none';
    step2.style.display = 'block';
    fill1.style.width = '100%';

    step2.innerHTML = `
      <div class="diag-loading">
        <div class="spinner"></div>
        <span>Saving listing to MySQL and querying best-fit NGOs in ${city}...</span>
      </div>
    `;

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCat,
          quantity: qty,
          city: city,
          donor_name: donorName,
          donor_type: 'restaurant',
          prepared_at: new Date().toISOString(),
          notes: notes
        })
      });

      const data = await response.json();

      if (!data.success) {
        step2.innerHTML = `
          <div class="diag-result">
            <span class="tag urgent">Error</span>
            <h3>Failed to create listing</h3>
            <p class="meta-line">${data.error || 'Server error'}</p>
            <div class="panel-actions">
              <button class="btn btn-primary" id="back-btn">Try again</button>
            </div>
          </div>
        `;
        document.getElementById('back-btn').addEventListener('click', resetDemo);
        return;
      }

      currentListing = data.listing;
      currentMatchedNgos = data.matched_ngos || [];
      selectedNgoIndex = 0;

      fill2.style.width = '100%';
      renderStep2();
      loadHistory();
    } catch (err) {
      console.error('API call failed:', err);
      step2.innerHTML = `
        <div class="diag-result">
          <span class="tag urgent">Network Error</span>
          <h3>Could not connect to backend server</h3>
          <p class="meta-line">Ensure the Node.js server is running and MySQL is reachable.</p>
          <div class="panel-actions">
            <button class="btn btn-primary" id="back-btn">Try again</button>
          </div>
        </div>
      `;
      document.getElementById('back-btn').addEventListener('click', resetDemo);
    }
  });

  function renderStep2() {
    const ruleUrgent = currentListing.urgency === 'high';
    const hasNgos = currentMatchedNgos.length > 0;

    const ngosHtml = hasNgos
      ? currentMatchedNgos.map((ngo, idx) => `
        <div class="ngo-card ${idx === selectedNgoIndex ? 'active-ngo' : ''}" data-index="${idx}">
          <div class="who">
            <div class="avatar">${getInitials(ngo.name)}</div>
            <div>
              <div class="name">${ngo.name} ${idx === 0 ? '<span style="font-size:0.75rem; background:var(--gold); color:#1E3327; font-weight:700; padding:2px 6px; border-radius:3px; margin-left:6px;">BEST FIT</span>' : ''}</div>
              <div class="meta">${ngo.area}, ${ngo.city} · 📞 ${ngo.contact_phone || 'Available on match'}</div>
            </div>
          </div>
          <div class="capacity">Capacity: ${ngo.capacity_per_day}/day</div>
        </div>
      `).join('')
      : `<p style="color:#C7CFC6; margin: 16px 0;">No active NGOs in ${currentListing.donor_city || 'this city'} currently have capacity for ${currentListing.quantity} servings.</p>`;

    const chosenNgo = hasNgos ? currentMatchedNgos[selectedNgoIndex] : null;

    step2.innerHTML = `
      <div class="diag-result">
        <span class="tag ${ruleUrgent ? 'urgent' : 'normal'}">${currentListing.category} · ${ruleUrgent ? 'URGENT' : 'NORMAL'}</span>
        <h3>${currentListing.quantity} servings · safe to serve for ~${currentListing.shelf_life_hours} hours</h3>
        <p class="meta-line">
          ${ruleUrgent
            ? 'Time-sensitive cooked meal — matched with top local shelters capable of immediate pickup.'
            : 'Sufficient shelf window — matched with certified local partner NGOs ranked by capacity fit.'
          }
        </p>

        <span class="field-label">Top Matched NGOs in ${currentListing.donor_city || citySelect.value} (from MySQL):</span>
        <div class="ngo-cards" id="ngo-cards-container">
          ${ngosHtml}
        </div>

        <div class="panel-actions" style="display:flex; gap:10px; flex-wrap:wrap;">
          ${hasNgos ? `<button class="btn btn-primary" id="book-btn">Confirm pickup with ${chosenNgo ? chosenNgo.name : 'NGO'}</button>` : ''}
          <button class="btn btn-danger-ghost" id="close-btn">Food no longer available</button>
          <button class="btn btn-ghost" id="back-btn" style="background:transparent; color:#F3EFE0; border-color:#3D5344;">Start over</button>
        </div>
      </div>
    `;

    // Make NGO cards clickable
    document.querySelectorAll('.ngo-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedNgoIndex = parseInt(card.dataset.index, 10);
        renderStep2();
      });
    });

    const bookBtn = document.getElementById('book-btn');
    if (bookBtn) {
      bookBtn.addEventListener('click', confirmPickup);
    }

    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCurrentListing);
    }

    document.getElementById('back-btn').addEventListener('click', resetDemo);
  }

  // Step 2 -> Step 3: POST /api/listings/:id/confirm
  async function confirmPickup() {
    if (!currentListing || currentMatchedNgos.length === 0) return;

    const chosenNgo = currentMatchedNgos[selectedNgoIndex];
    const bookBtn = document.getElementById('book-btn');
    if (bookBtn) {
      bookBtn.disabled = true;
      bookBtn.innerText = 'Confirming in Database...';
    }

    try {
      const response = await fetch(`/api/listings/${currentListing.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ngo_id: chosenNgo.id })
      });

      const data = await response.json();

      if (!data.success) {
        alert('Failed to confirm pickup: ' + (data.error || 'Unknown error'));
        if (bookBtn) {
          bookBtn.disabled = false;
          bookBtn.innerText = 'Try Again';
        }
        return;
      }

      fill3.style.width = '100%';
      step2.style.display = 'none';
      step3.style.display = 'block';

      step3.innerHTML = `
        <div class="confirm-box">
          <div class="check">✓</div>
          <h3>Pickup Confirmed — Listing #FS-${currentListing.id}</h3>
          <p>
            <strong>${chosenNgo.name}</strong> (${chosenNgo.area}, ${chosenNgo.city}) has accepted the dispatch.<br>
            A volunteer is dispatched with estimated arrival in <strong>20–30 minutes</strong>, well within the ~${currentListing.shelf_life_hours} hr safe window.<br>
            <span style="font-size:0.85rem; color:#A4B2A3; margin-top:8px; display:inline-block;">NGO Contact: ${chosenNgo.contact_phone || 'On call'}</span>
          </p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary" id="restart-btn">List another batch</button>
            <button class="btn btn-danger-ghost" id="cancel-confirmed-btn" style="font-size:0.88rem;">Food no longer available</button>
            <a href="#history" class="btn btn-ghost" style="color:#F3EFE0; border-color:#3D5344;">View in Database Log</a>
          </div>
        </div>
      `;

      document.getElementById('restart-btn').addEventListener('click', resetDemo);
      const cancelConfirmedBtn = document.getElementById('cancel-confirmed-btn');
      if (cancelConfirmedBtn) {
        cancelConfirmedBtn.addEventListener('click', closeCurrentListing);
      }

      // Update hero ticket with this confirmed donation!
      updateHeroTicket(data.listing || currentListing, chosenNgo);

      // Refresh Live Database Activity
      loadHistory();
    } catch (err) {
      console.error('Confirmation error:', err);
      alert('Error confirming pickup: ' + err.message);
      if (bookBtn) {
        bookBtn.disabled = false;
        bookBtn.innerText = 'Confirm pickup';
      }
    }
  }

  // Close Listing: POST /api/listings/:id/close
  async function closeCurrentListing() {
    if (!currentListing) return;

    const closeBtn = document.getElementById('close-btn') || document.getElementById('cancel-confirmed-btn');
    if (closeBtn) {
      closeBtn.disabled = true;
      closeBtn.innerText = 'Closing listing...';
    }

    try {
      const response = await fetch(`/api/listings/${currentListing.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!data.success) {
        alert('Failed to close listing: ' + (data.error || 'Unknown error'));
        if (closeBtn) {
          closeBtn.disabled = false;
          closeBtn.innerText = 'Food no longer available';
        }
        return;
      }

      currentListing = data.listing;

      // Show closed confirmation screen in step3 container
      step2.style.display = 'none';
      step3.style.display = 'block';

      step3.innerHTML = `
        <div class="confirm-box">
          <div class="check" style="background:#434A44; color:#D3DAD3; font-size:1.4rem;">✕</div>
          <h3>Listing closed — thanks for updating us</h3>
          <p>
            Listing <strong>#FS-${currentListing.id}</strong> has been marked as closed in MySQL.<br>
            No volunteer will be dispatched for this batch.
          </p>
          <div style="display:flex; justify-content:center; gap:12px; margin-top:16px;">
            <button class="btn btn-primary" id="restart-closed-btn">List another batch</button>
            <a href="#history" class="btn btn-ghost" style="color:#F3EFE0; border-color:#3D5344;">View in Database Log</a>
          </div>
        </div>
      `;

      document.getElementById('restart-closed-btn').addEventListener('click', resetDemo);

      // Refresh Live Database Activity
      loadHistory();
    } catch (err) {
      console.error('Failed to close listing:', err);
      alert('Error closing listing: ' + err.message);
      if (closeBtn) {
        closeBtn.disabled = false;
        closeBtn.innerText = 'Food no longer available';
      }
    }
  }

  function resetDemo() {
    step1.style.display = 'block';
    step2.style.display = 'none';
    step3.style.display = 'none';
    fill1.style.width = '0%';
    fill2.style.width = '0%';
    fill3.style.width = '0%';
    catButtons.forEach(b => b.classList.remove('selected'));
    selectedCat = null;
    currentListing = null;
    currentMatchedNgos = [];
    selectedNgoIndex = 0;
    qtyInput.value = '';
    ageInput.value = '1 hour ago';
    descInput.value = '';
    checkReady();
  }

  function updateHeroTicket(listing, ngo) {
    if (!listing || !ngo) return;
    const ticketId = document.getElementById('hero-ticket-id');
    const ticketCity = document.getElementById('hero-ticket-city');
    const ticketTitle = document.getElementById('hero-ticket-title');
    const ticketShelf = document.getElementById('hero-ticket-shelf');
    const ticketStatus = document.getElementById('hero-ticket-status');
    const ticketAvatar = document.getElementById('hero-ticket-avatar');
    const ticketNgo = document.getElementById('hero-ticket-ngo');
    const ticketMeta = document.getElementById('hero-ticket-meta');

    if (ticketId) ticketId.innerText = `Donation #FS-${listing.id}`;
    if (ticketCity) ticketCity.innerText = `${ngo.city}, MP`;
    if (ticketTitle) ticketTitle.innerText = `${listing.quantity} servings of ${listing.category.toLowerCase()}`;
    if (ticketShelf) ticketShelf.innerText = `Safe to serve for: ~${listing.shelf_life_hours} hours · Category: ${listing.category}`;
    if (ticketStatus) {
      ticketStatus.innerText = `Confirmed in MySQL`;
      ticketStatus.style.background = '#D1E7DD';
      ticketStatus.style.color = '#0F5132';
    }
    if (ticketAvatar) ticketAvatar.innerText = getInitials(ngo.name);
    if (ticketNgo) ticketNgo.innerText = ngo.name;
    if (ticketMeta) ticketMeta.innerText = `${ngo.area} · Capacity ${ngo.capacity_per_day}/day`;
  }

  // Load Real Listings from GET /api/listings
  async function loadHistory() {
    if (!historyTbody) return;
    try {
      const res = await fetch('/api/listings');
      const data = await res.json();
      if (!data.success || !data.listings || data.listings.length === 0) {
        historyTbody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align:center; padding:24px; color:var(--ink-muted);">
              No donation listings recorded in MySQL yet. Submit a batch above to create one!
            </td>
          </tr>
        `;
        return;
      }

      historyTbody.innerHTML = data.listings.map(l => {
        const dateStr = new Date(l.created_at).toLocaleString('en-IN', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const ngoDisplay = l.ngo_name ? `${l.ngo_name} (${l.ngo_area})` : '<em style="color:var(--ink-muted);">None</em>';
        const isClosed = l.status === 'closed';

        return `
          <tr style="${isClosed ? 'opacity: 0.75;' : ''}">
            <td><strong>#FS-${l.id}</strong></td>
            <td>${l.donor_name || 'Anonymous'}</td>
            <td>${l.donor_city || '-'}</td>
            <td>${l.category}</td>
            <td><strong>${l.quantity}</strong> servings</td>
            <td><span class="urgency-pill ${l.urgency}">${l.urgency.toUpperCase()}</span></td>
            <td>~${l.shelf_life_hours}h</td>
            <td>${ngoDisplay}</td>
            <td><span class="status-badge ${l.status}">${l.status.toUpperCase()}</span></td>
            <td style="font-size:0.8rem; color:var(--ink-muted);">${dateStr}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load history:', err);
      historyTbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:24px; color:var(--urgent);">
            Error loading records from MySQL database.
          </td>
        </tr>
      `;
    }
  }

  if (refreshHistoryBtn) {
    refreshHistoryBtn.addEventListener('click', loadHistory);
  }

  // Initial load
  loadHistory();
});
