// Global state
let wines = [];
let wineTypes = [];
let allCountries = [];
let currentView = 'list';
let currentEditId = null;
let currentSort = 'alpha-az';

// DOM Elements
const wineContainer = document.getElementById('wineContainer');
const emptyState = document.getElementById('emptyState');
const wineModal = document.getElementById('wineModal');
const detailModal = document.getElementById('detailModal');
const wineForm = document.getElementById('wineForm');
const modalTitle = document.getElementById('modalTitle');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const countryFilter = document.getElementById('countryFilter');
const toggleViewBtn = document.getElementById('toggleViewBtn');
const addWineBtn = document.getElementById('addWineBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const detailCloseBtn = document.getElementById('detailCloseBtn');
const deleteWineBtn = document.getElementById('deleteWineBtn');
const addNewTypeBtn = document.getElementById('addNewTypeBtn');
const newTypeInput = document.getElementById('newTypeInput');
const winePhotoInput = document.getElementById('winePhoto');
const photoPreview = document.getElementById('photoPreview');
const previewImg = document.getElementById('previewImg');

// ─── API ─────────────────────────────────────────────────────────────────────

async function apiGet(action) {
  const res = await fetch(`/api/?action=${action}`);
  return res.json();
}

async function apiPost(action, body) {
  const res = await fetch(`/api/?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch('/api/?action=uploadPhoto', {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  return data.success ? data.url : null;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadWines();
  setupEventListeners();
});

async function loadWines() {
  showLoadingState();
  try {
    const data = await apiGet('list');
    if (!data.success) throw new Error(data.error);

    wines = data.wines || [];
    wineTypes = data.types && data.types.length > 0 ? data.types : getDefaultTypes();
    allCountries = [...new Set(wines.map(w => w.country).filter(Boolean))].sort();

    populateFilterDropdowns();
    renderWines();
  } catch (error) {
    console.error('Error loading wines:', error);
    showError('Could not load wines. Please refresh the page.');
  }
}

function showLoadingState() {
  wineContainer.style.display = 'none';
  emptyState.style.display = 'block';
  emptyState.textContent = 'Loading your wines…';
}

function showError(msg) {
  emptyState.style.display = 'block';
  emptyState.textContent = msg;
  wineContainer.style.display = 'none';
}

function getDefaultTypes() {
  return [
    { id: 1, name: 'Red - Light' },
    { id: 2, name: 'Red - Medium' },
    { id: 3, name: 'Red - Full' },
    { id: 4, name: 'White - Crisp' },
    { id: 5, name: 'White - Medium' },
    { id: 6, name: 'White - Full' },
    { id: 7, name: 'Rosé' },
    { id: 8, name: 'Sparkling' },
    { id: 9, name: 'Fortified' },
    { id: 10, name: 'Dessert' }
  ];
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

function setupEventListeners() {
  addWineBtn.addEventListener('click', openAddWineModal);
  modalCloseBtn.addEventListener('click', closeWineModal);
  detailCloseBtn.addEventListener('click', closeDetailModal);
  document.getElementById('closeDetailBtn').addEventListener('click', closeDetailModal);
  wineForm.addEventListener('submit', saveWine);
  deleteWineBtn.addEventListener('click', deleteWine);
  searchInput.addEventListener('input', renderWines);
  typeFilter.addEventListener('change', renderWines);
  countryFilter.addEventListener('change', renderWines);
  document.getElementById('sortFilter').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderWines();
  });
  toggleViewBtn.addEventListener('click', toggleView);
  addNewTypeBtn.addEventListener('click', toggleNewTypeInput);
  winePhotoInput.addEventListener('change', previewPhoto);
  document.getElementById('editWineBtn').addEventListener('click', editWineFromDetail);

  window.addEventListener('click', (e) => {
    if (e.target === wineModal) closeWineModal();
    if (e.target === detailModal) closeDetailModal();
  });
}

// ─── Filters & Rendering ──────────────────────────────────────────────────────

function populateFilterDropdowns() {
  typeFilter.innerHTML = '<option value="">All Types</option>';
  wineTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type.id;
    option.textContent = type.name;
    typeFilter.appendChild(option);
  });

  countryFilter.innerHTML = '<option value="">All Countries</option>';
  allCountries.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countryFilter.appendChild(option);
  });
}

function renderWines() {
  const searchTerm = searchInput.value.toLowerCase();
  const typeId = typeFilter.value;
  const country = countryFilter.value;

  let filtered = wines.filter(wine => {
    const matchesSearch = wine.name.toLowerCase().includes(searchTerm);
    const matchesType = !typeId || wine.type_id == typeId;
    const matchesCountry = !country || wine.country === country;
    return matchesSearch && matchesType && matchesCountry;
  });

  filtered.sort((a, b) => {
    switch (currentSort) {
      case 'date-newest': return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      case 'date-oldest': return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      case 'alpha-az':    return a.name.localeCompare(b.name);
      case 'alpha-za':    return b.name.localeCompare(a.name);
      default:            return 0;
    }
  });

  if (filtered.length === 0) {
    wineContainer.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.textContent = wines.length === 0
      ? "No wines yet — add your first one!"
      : 'No wines match your search.';
    return;
  }

  wineContainer.style.display = '';
  emptyState.style.display = 'none';

  wineContainer.innerHTML = filtered.map(wine => {
    const typeName = wineTypes.find(t => t.id == wine.type_id)?.name || 'Unknown';
    return `
      <div class="wine-card" onclick="viewWineDetail(${wine.id})">
        ${wine.photo_url
          ? `<img src="${wine.photo_url}" alt="${escapeHtml(wine.name)}" class="wine-photo">`
          : `<div class="wine-placeholder">🍷</div>`}
        <div class="wine-info">
          <div class="wine-name">${escapeHtml(wine.name)}</div>
          <div class="wine-meta">
            <span class="wine-badge">${typeName}</span>
            ${wine.country ? `<span class="wine-badge">${escapeHtml(wine.country)}</span>` : ''}
            ${wine.region ? `<span class="wine-badge wine-badge-region">${escapeHtml(wine.region)}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleView() {
  currentView = currentView === 'list' ? 'grid' : 'list';
  if (currentView === 'grid') {
    wineContainer.classList.add('grid-view');
    toggleViewBtn.querySelector('.view-icon').textContent = '≡';
  } else {
    wineContainer.classList.remove('grid-view');
    toggleViewBtn.querySelector('.view-icon').textContent = '⊞';
  }
  renderWines();
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function openAddWineModal() {
  currentEditId = null;
  modalTitle.textContent = 'Add Wine';
  deleteWineBtn.style.display = 'none';
  resetForm();
  populateTypeDropdown();
  wineModal.style.display = 'flex';
}

function closeWineModal() {
  wineModal.style.display = 'none';
  resetForm();
}

function closeDetailModal() {
  detailModal.style.display = 'none';
}

function resetForm() {
  wineForm.reset();
  photoPreview.style.display = 'none';
  newTypeInput.style.display = 'none';
  newTypeInput.value = '';
  currentEditId = null;
}

function populateTypeDropdown() {
  const wineTypeSelect = document.getElementById('wineType');
  wineTypeSelect.innerHTML = '<option value="">Select type…</option>';
  wineTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type.id;
    option.textContent = type.name;
    wineTypeSelect.appendChild(option);
  });
}

function toggleNewTypeInput() {
  const isHidden = newTypeInput.style.display === 'none';
  newTypeInput.style.display = isHidden ? 'block' : 'none';
  if (isHidden) newTypeInput.focus();
}

function previewPhoto(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      previewImg.src = event.target.result;
      photoPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}

// ─── Save Wine ────────────────────────────────────────────────────────────────

async function saveWine(e) {
  e.preventDefault();

  const name = document.getElementById('wineName').value.trim();
  let typeId = document.getElementById('wineType').value;
  const country = document.getElementById('wineCountry').value.trim();
  const region = document.getElementById('wineRegion').value.trim();
  const notes = document.getElementById('wineNotes').value.trim();
  const photoFile = winePhotoInput.files[0];

  if (!typeId && newTypeInput.style.display !== 'none' && newTypeInput.value.trim()) {
    const newTypeName = newTypeInput.value.trim();
    const result = await apiPost('createType', { name: newTypeName });
    if (result.success) {
      typeId = result.type.id;
      wineTypes.push(result.type);
    } else {
      alert('Could not create new type. Please try again.');
      return;
    }
  }

  if (!name) { alert('Wine name is required.'); return; }
  if (!typeId) { alert('Please select or create a wine type.'); return; }

  let photoUrl = null;
  if (currentEditId) {
    const existing = wines.find(w => w.id == currentEditId);
    photoUrl = existing ? existing.photo_url : null;
  }
  if (photoFile) {
    const uploaded = await uploadPhoto(photoFile);
    if (!uploaded) { alert('Photo upload failed. Please try again.'); return; }
    photoUrl = uploaded;
  }

  const result = await apiPost('save', {
    id: currentEditId || null,
    name,
    type_id: typeId,
    country: country || null,
    region: region || null,
    notes: notes || null,
    photo_url: photoUrl
  });

  if (!result.success) {
    alert('Could not save wine: ' + (result.error || 'Unknown error'));
    return;
  }

  closeWineModal();
  loadWines();
}

// ─── Delete Wine ──────────────────────────────────────────────────────────────

async function deleteWine(e) {
  e.preventDefault();
  if (!currentEditId) return;
  if (!confirm('Delete this wine?')) return;

  const result = await apiPost('delete', { id: currentEditId });
  if (!result.success) {
    alert('Could not delete wine: ' + (result.error || 'Unknown error'));
    return;
  }

  closeWineModal();
  loadWines();
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function viewWineDetail(id) {
  const wine = wines.find(w => w.id == id);
  if (!wine) return;

  const typeName = wineTypes.find(t => t.id == wine.type_id)?.name || 'Unknown';
  const detailContent = document.getElementById('detailContent');

  detailContent.innerHTML = `
    ${wine.photo_url
      ? `<img src="${wine.photo_url}" alt="${escapeHtml(wine.name)}" class="detail-photo">`
      : `<div class="detail-placeholder">🍷</div>`}
    <div class="detail-section">
      <div class="detail-label">Wine</div>
      <div class="detail-value">${escapeHtml(wine.name)}</div>
    </div>
    <div class="detail-section">
      <div class="detail-label">Type</div>
      <div class="detail-value">${typeName}</div>
    </div>
    ${wine.country ? `
    <div class="detail-section">
      <div class="detail-label">Country</div>
      <div class="detail-value">${escapeHtml(wine.country)}</div>
    </div>` : ''}
    ${wine.region ? `
    <div class="detail-section">
      <div class="detail-label">Region</div>
      <div class="detail-value">${escapeHtml(wine.region)}</div>
    </div>` : ''}
    ${wine.notes ? `
    <div class="detail-section">
      <div class="detail-label">Notes</div>
      <div class="detail-value detail-notes">${escapeHtml(wine.notes)}</div>
    </div>` : ''}
  `;

  document.getElementById('editWineBtn').dataset.wineId = id;
  detailModal.style.display = 'flex';
}

function editWineFromDetail() {
  const wineId = this.dataset.wineId;
  const wine = wines.find(w => w.id == wineId);
  if (!wine) return;

  currentEditId = wineId;
  modalTitle.textContent = 'Edit Wine';
  deleteWineBtn.style.display = 'block';

  populateTypeDropdown();
  document.getElementById('wineName').value = wine.name;
  document.getElementById('wineType').value = wine.type_id;
  document.getElementById('wineCountry').value = wine.country || '';
  document.getElementById('wineRegion').value = wine.region || '';
  document.getElementById('wineNotes').value = wine.notes || '';

  if (wine.photo_url) {
    previewImg.src = wine.photo_url;
    photoPreview.style.display = 'block';
  }

  closeDetailModal();
  wineModal.style.display = 'flex';
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
