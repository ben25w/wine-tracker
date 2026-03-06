// Global state
let wines = [];
let wineTypes = [];
let allCountries = [];
let currentView = 'list';
let currentEditId = null;
let currentSort = 'date-newest';

const STORAGE_WINES_KEY = 'wines_data';
const STORAGE_TYPES_KEY = 'wine_types_data';

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

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadWines();
    setupEventListeners();
});

// Load wines from localStorage
function loadWines() {
    try {
        const storedWines = localStorage.getItem(STORAGE_WINES_KEY);
        const storedTypes = localStorage.getItem(STORAGE_TYPES_KEY);
        
        wines = storedWines ? JSON.parse(storedWines) : [];
        wineTypes = storedTypes ? JSON.parse(storedTypes) : getDefaultTypes();
        
        allCountries = [...new Set(wines.map(w => w.country).filter(Boolean))].sort();
        populateFilterDropdowns();
        renderWines();
    } catch (error) {
        console.error('Error loading wines:', error);
        wineTypes = getDefaultTypes();
    }
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

function saveWines() {
    localStorage.setItem(STORAGE_WINES_KEY, JSON.stringify(wines));
    localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(wineTypes));
}

// Setup Event Listeners
function setupEventListeners() {
    addWineBtn.addEventListener('click', openAddWineModal);
    modalCloseBtn.addEventListener('click', closeWineModal);
    detailCloseBtn.addEventListener('click', closeDetailModal);
    wineForm.addEventListener('submit', saveWine);
    deleteWineBtn.addEventListener('click', deleteWine);
    searchInput.addEventListener('input', filterWines);
    typeFilter.addEventListener('change', filterWines);
    countryFilter.addEventListener('change', filterWines);
    document.getElementById('sortFilter').addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterWines();
    });
    toggleViewBtn.addEventListener('click', toggleView);
    addNewTypeBtn.addEventListener('click', toggleNewTypeInput);
    winePhotoInput.addEventListener('change', previewPhoto);
    document.getElementById('editWineBtn').addEventListener('click', editWineFromDetail);
    
    // Bulk import listeners
    document.getElementById('bulkImportBtn').addEventListener('click', openBulkImportModal);
    document.getElementById('bulkImportCloseBtn').addEventListener('click', closeBulkImportModal);
    document.getElementById('bulkParseBtn').addEventListener('click', parseBulkWines);
    document.getElementById('bulkBackBtn').addEventListener('click', bulkGoBack);
    document.getElementById('bulkImportConfirmBtn').addEventListener('click', executeBulkImport);
}

// Populate filter dropdowns
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

// Render wines
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

    // Apply sorting
    filtered.sort((a, b) => {
        switch(currentSort) {
            case 'date-newest':
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            case 'date-oldest':
                return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            case 'alpha-az':
                return a.name.localeCompare(b.name);
            case 'alpha-za':
                return b.name.localeCompare(a.name);
            default:
                return 0;
        }
    });

    if (filtered.length === 0) {
        wineContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    wineContainer.style.display = '';
    emptyState.style.display = 'none';

    wineContainer.innerHTML = filtered.map(wine => {
        const typeName = wineTypes.find(t => t.id == wine.type_id)?.name || 'Unknown';
        return `
            <div class="wine-card" onclick="viewWineDetail(${wine.id})">
                ${wine.photo_url 
                    ? `<img src="${wine.photo_url}" alt="${wine.name}" class="wine-photo">` 
                    : `<div class="wine-placeholder">🍷</div>`
                }
                <div class="wine-info">
                    <div class="wine-name">${escapeHtml(wine.name)}</div>
                    <div class="wine-meta">
                        <span class="wine-badge">${typeName}</span>
                        ${wine.country ? `<span class="wine-badge">${wine.country}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterWines() {
    renderWines();
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
    wineTypeSelect.innerHTML = '<option value="">Select type...</option>';
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
    if (isHidden) {
        newTypeInput.focus();
    }
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

// Save wine
async function saveWine(e) {
    e.preventDefault();

    const name = document.getElementById('wineName').value.trim();
    let typeId = document.getElementById('wineType').value;
    const country = document.getElementById('wineCountry').value.trim();
    const region = document.getElementById('wineRegion').value.trim();
    const notes = document.getElementById('wineNotes').value.trim();
    const photoFile = winePhotoInput.files[0];

    // Handle new type
    if (!typeId && newTypeInput.style.display !== 'none' && newTypeInput.value.trim()) {
        const newTypeName = newTypeInput.value.trim();
        const newType = createWineType(newTypeName);
        if (newType) {
            typeId = newType.id;
        } else {
            return;
        }
    }

    if (!name) {
        alert('Wine name is required.');
        return;
    }

    if (!typeId) {
        alert('Please select or create a wine type.');
        return;
    }

    let photoUrl = null;
    if (currentEditId) {
        const wine = wines.find(w => w.id == currentEditId);
        photoUrl = wine.photo_url;
    }

    if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
        if (!photoUrl) {
            alert('Failed to upload photo.');
            return;
        }
    }

    const wineData = {
        id: currentEditId,
        name,
        type_id: typeId,
        country: country || null,
        region,
        notes,
        photo_url: photoUrl
    };

    if (currentEditId) {
        const index = wines.findIndex(w => w.id == currentEditId);
        if (index >= 0) {
            wines[index] = { ...wines[index], ...wineData };
        }
    } else {
        const newWine = {
            id: Math.max(...wines.map(w => w.id || 0), 0) + 1,
            ...wineData,
            created_at: new Date().toISOString()
        };
        wines.push(newWine);
    }

    saveWines();
    loadWines();
    closeWineModal();
}

function createWineType(name) {
    const existing = wineTypes.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
        return existing;
    }

    const newType = {
        id: Math.max(...wineTypes.map(t => t.id || 0), 0) + 1,
        name: name.trim()
    };
    wineTypes.push(newType);
    saveWines();
    return newType;
}

async function uploadPhoto(file) {
    const reader = new FileReader();
    return new Promise((resolve) => {
        reader.onload = (event) => {
            resolve(event.target.result);
        };
        reader.readAsDataURL(file);
    });
}

function viewWineDetail(id) {
    const wine = wines.find(w => w.id == id);
    if (!wine) return;

    const typeName = wineTypes.find(t => t.id == wine.type_id)?.name || 'Unknown';

    const detailContent = document.getElementById('detailContent');
    detailContent.innerHTML = `
        ${wine.photo_url && !wine.photo_url.startsWith('data:') 
            ? `<img src="${wine.photo_url}" alt="${wine.name}" class="detail-photo">` 
            : wine.photo_url
            ? `<img src="${wine.photo_url}" alt="${wine.name}" class="detail-photo">`
            : `<div class="detail-placeholder">🍷</div>`
        }
        
        <div class="detail-section">
            <div class="detail-label">Wine Name</div>
            <div class="detail-value">${escapeHtml(wine.name)}</div>
        </div>

        <div class="detail-section">
            <div class="detail-label">Type</div>
            <div class="detail-value">${typeName}</div>
        </div>

        ${wine.country ? `
            <div class="detail-section">
                <div class="detail-label">Country</div>
                <div class="detail-value">${wine.country}</div>
            </div>
        ` : ''}

        ${wine.region ? `
            <div class="detail-section">
                <div class="detail-label">Region</div>
                <div class="detail-value">${wine.region}</div>
            </div>
        ` : ''}

        ${wine.notes ? `
            <div class="detail-section">
                <div class="detail-label">Notes</div>
                <div class="detail-value">${escapeHtml(wine.notes)}</div>
            </div>
        ` : ''}
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

    document.getElementById('wineName').value = wine.name;
    document.getElementById('wineType').value = wine.type_id;
    document.getElementById('wineCountry').value = wine.country || '';
    document.getElementById('wineRegion').value = wine.region || '';
    document.getElementById('wineNotes').value = wine.notes || '';

    if (wine.photo_url) {
        previewImg.src = wine.photo_url;
        photoPreview.style.display = 'block';
    }

    populateTypeDropdown();
    closeDetailModal();
    wineModal.style.display = 'flex';
}

function deleteWine(e) {
    e.preventDefault();
    if (!currentEditId) return;

    const confirmed = confirm('Are you sure you want to delete this wine?');
    if (!confirmed) return;

    wines = wines.filter(w => w.id != currentEditId);
    saveWines();
    loadWines();
    closeWineModal();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.addEventListener('click', (e) => {
    if (e.target === wineModal) closeWineModal();
    if (e.target === detailModal) closeDetailModal();
    if (e.target === document.getElementById('bulkImportModal')) closeBulkImportModal();
});

// Bulk Import
let bulkWines = [];

function openBulkImportModal() {
    bulkWines = [];
    document.getElementById('bulkImportModal').style.display = 'flex';
    document.getElementById('bulkStep1').style.display = 'block';
    document.getElementById('bulkStep2').style.display = 'none';
    document.getElementById('bulkInput').value = '';
    document.getElementById('bulkStatus').style.display = 'none';
}

function closeBulkImportModal() {
    document.getElementById('bulkImportModal').style.display = 'none';
    bulkWines = [];
}

function parseBulkWines() {
    const input = document.getElementById('bulkInput').value.trim();
    if (!input) {
        alert('Please paste some wines first.');
        return;
    }

    bulkWines = [];
    const lines = input.split('\n').filter(line => line.trim());

    lines.forEach(line => {
        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        
        if (parts.length >= 2) {
            bulkWines.push({
                name: parts[0],
                type: parts[1],
                country: parts[2] || '',
                region: parts[3] || ''
            });
        }
    });

    if (bulkWines.length === 0) {
        alert('No wines could be parsed.');
        return;
    }

    const previewHtml = bulkWines.map(wine => `
        <div class="bulk-preview-item">
            <strong>${escapeHtml(wine.name)}</strong>
            <small>${wine.type}${wine.country ? ' • ' + wine.country : ''}${wine.region ? ' • ' + wine.region : ''}</small>
        </div>
    `).join('');

    document.getElementById('bulkPreview').innerHTML = previewHtml;
    document.getElementById('bulkWineCount').textContent = bulkWines.length;
    document.getElementById('bulkStep1').style.display = 'none';
    document.getElementById('bulkStep2').style.display = 'block';
}

function bulkGoBack() {
    document.getElementById('bulkStep1').style.display = 'block';
    document.getElementById('bulkStep2').style.display = 'none';
    document.getElementById('bulkStatus').style.display = 'none';
}

function executeBulkImport() {
    if (bulkWines.length === 0) {
        alert('No wines to import.');
        return;
    }

    const statusEl = document.getElementById('bulkStatus');
    let successCount = 0;

    bulkWines.forEach(wine => {
        // Create type if needed
        let typeId = wineTypes.find(t => t.name.toLowerCase() === wine.type.toLowerCase())?.id;
        
        if (!typeId) {
            const newType = createWineType(wine.type);
            typeId = newType.id;
        }

        // Add wine
        const newWine = {
            id: Math.max(...wines.map(w => w.id || 0), 0) + 1,
            name: wine.name,
            type_id: typeId,
            country: wine.country || null,
            region: wine.region || null,
            notes: null,
            photo_url: null,
            created_at: new Date().toISOString()
        };
        wines.push(newWine);
        successCount++;
    });

    saveWines();
    
    statusEl.className = 'bulk-status success';
    statusEl.innerHTML = `✓ Successfully imported <strong>${successCount}</strong> wines!`;
    statusEl.style.display = 'block';

    setTimeout(() => {
        closeBulkImportModal();
        loadWines();
    }, 1500);
}
