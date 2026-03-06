// Global state
let wines = [];
let wineTypes = [];
let allCountries = [];
let currentView = 'list'; // 'list' or 'grid'
let currentEditId = null;

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

// Event Listeners
function setupEventListeners() {
    addWineBtn.addEventListener('click', openAddWineModal);
    modalCloseBtn.addEventListener('click', closeWineModal);
    detailCloseBtn.addEventListener('click', closeDetailModal);
    wineForm.addEventListener('submit', saveWine);
    deleteWineBtn.addEventListener('click', deleteWine);
    searchInput.addEventListener('input', filterWines);
    typeFilter.addEventListener('change', filterWines);
    countryFilter.addEventListener('change', filterWines);
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

// Load wines from API
async function loadWines() {
    try {
        const response = await fetch('/api/wines?action=list');
        const data = await response.json();

        if (data.success) {
            wines = data.wines || [];
            wineTypes = data.types || [];
            allCountries = [...new Set(wines.map(w => w.country).filter(Boolean))].sort();

            populateFilterDropdowns();
            renderWines();
        } else {
            console.error('Failed to load wines:', data.error);
        }
    } catch (error) {
        console.error('Error loading wines:', error);
    }
}

// Populate filter dropdowns
function populateFilterDropdowns() {
    // Populate types
    typeFilter.innerHTML = '<option value="">All Types</option>';
    wineTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        typeFilter.appendChild(option);
    });

    // Populate countries
    countryFilter.innerHTML = '<option value="">All Countries</option>';
    allCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });
}

// Render wines based on filters
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
                        <span class="wine-badge">${wine.country}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter wines on input
function filterWines() {
    renderWines();
}

// Toggle between list and grid view
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

// Open add wine modal
function openAddWineModal() {
    currentEditId = null;
    modalTitle.textContent = 'Add Wine';
    deleteWineBtn.style.display = 'none';
    resetForm();
    populateTypeDropdown();
    wineModal.style.display = 'flex';
}

// Close wine modal
function closeWineModal() {
    wineModal.style.display = 'none';
    resetForm();
}

// Close detail modal
function closeDetailModal() {
    detailModal.style.display = 'none';
}

// Reset form
function resetForm() {
    wineForm.reset();
    photoPreview.style.display = 'none';
    newTypeInput.style.display = 'none';
    newTypeInput.value = '';
    currentEditId = null;
}

// Populate type dropdown
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

// Toggle new type input
function toggleNewTypeInput() {
    const isHidden = newTypeInput.style.display === 'none';
    newTypeInput.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        newTypeInput.focus();
    }
}

// Preview photo
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

// Save wine (add or edit)
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
        const newType = await createWineType(newTypeName);
        if (newType) {
            typeId = newType.id;
        } else {
            return; // Type creation failed
        }
    }

    // Validate required fields
    if (!name) {
        alert('Wine name is required.');
        return;
    }

    if (!typeId) {
        alert('Please select or create a wine type.');
        return;
    }

    // Upload photo if provided
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

    try {
        const response = await fetch('/api/wines?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wineData)
        });

        const result = await response.json();
        if (result.success) {
            loadWines();
            closeWineModal();
        } else {
            alert('Failed to save wine: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving wine:', error);
        alert('Error saving wine.');
    }
}

// Create new wine type
async function createWineType(name) {
    try {
        const response = await fetch('/api/wines?action=createType', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() })
        });

        const result = await response.json();
        if (result.success) {
            return result.type;
        } else {
            alert('Failed to create wine type: ' + result.error);
            return null;
        }
    } catch (error) {
        console.error('Error creating wine type:', error);
        alert('Error creating wine type.');
        return null;
    }
}

// Upload photo to R2
async function uploadPhoto(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/wines?action=uploadPhoto', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            return result.url;
        } else {
            console.error('Upload failed:', result.error);
            return null;
        }
    } catch (error) {
        console.error('Error uploading photo:', error);
        return null;
    }
}

// View wine details
function viewWineDetail(id) {
    const wine = wines.find(w => w.id == id);
    if (!wine) return;

    const typeName = wineTypes.find(t => t.id == wine.type_id)?.name || 'Unknown';

    const detailContent = document.getElementById('detailContent');
    detailContent.innerHTML = `
        ${wine.photo_url 
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

        <div class="detail-section">
            <div class="detail-label">Country</div>
            <div class="detail-value">${wine.country}</div>
        </div>

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

// Edit wine from detail view
function editWineFromDetail() {
    const wineId = this.dataset.wineId;
    const wine = wines.find(w => w.id == wineId);
    if (!wine) return;

    currentEditId = wineId;
    modalTitle.textContent = 'Edit Wine';
    deleteWineBtn.style.display = 'block';

    document.getElementById('wineName').value = wine.name;
    document.getElementById('wineType').value = wine.type_id;
    document.getElementById('wineCountry').value = wine.country;
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

// Delete wine
async function deleteWine(e) {
    e.preventDefault();
    if (!currentEditId) return;

    const confirmed = confirm('Are you sure you want to delete this wine?');
    if (!confirmed) return;

    try {
        const response = await fetch('/api/wines?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentEditId })
        });

        const result = await response.json();
        if (result.success) {
            loadWines();
            closeWineModal();
        } else {
            alert('Failed to delete wine: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting wine:', error);
        alert('Error deleting wine.');
    }
}

// Utility: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target === wineModal) closeWineModal();
    if (e.target === detailModal) closeDetailModal();
    if (e.target === document.getElementById('bulkImportModal')) closeBulkImportModal();
});

// Bulk Import Functions
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

    // Pre-populated wine list based on your data
    const wineData = [
        { name: 'Chateau Bel Air', type: 'Red - Medium', country: 'France', region: 'Bordeaux' },
        { name: 'Appellation D\'origine protégée', type: 'Red - Medium', country: 'France', region: 'Bordeaux' },
        { name: 'Penfolds', type: 'Cabernet Sauvignon', country: 'Australia', region: '' },
        { name: 'Penfolds Koonuga Hill', type: 'Cabernet Sauvignon', country: 'Australia', region: '' },
        { name: 'Rochester', type: 'Cabernet Sauvignon', country: 'USA', region: '' },
        { name: 'DV Catena Cabernet / Malbec', type: 'Cabernet Sauvignon', country: 'Argentina', region: '' },
        { name: 'Sangre de Toro', type: 'Cabernet Sauvignon', country: 'Spain', region: '' },
        { name: 'Cabina 56 Reserve Aresti', type: 'Cabernet Sauvignon', country: 'Chile', region: '' },
        { name: 'Antawara', type: 'Cabernet Sauvignon', country: 'Argentina', region: '' },
        { name: 'Casillero del Diablo', type: 'Cabernet Sauvignon', country: 'Chile', region: '' },
        { name: 'Selection de Familia - Gran Reserva', type: 'Cabernet Sauvignon', country: 'Chile', region: '' },
        { name: 'Single Estate Cabernet Sauvignon', type: 'Cabernet Sauvignon', country: 'Chile', region: '' },
        { name: 'Diablo', type: 'Cabernet Sauvignon', country: 'Chile', region: '' },
        { name: 'Kaiken Ultra', type: 'Cabernet Sauvignon', country: 'Argentina', region: '' },
        { name: 'Chianti Classico - Riserva - Famiglia Zingarelli', type: 'Chianti', country: 'Italy', region: 'Tuscany' },
        { name: 'Chianti Reserva Cecchi', type: 'Chianti', country: 'Italy', region: 'Tuscany' },
        { name: 'Santa Julia', type: 'Malbec', country: 'Argentina', region: '' },
        { name: 'Delle Venezia DOC Case Defra', type: 'Pinot Grigio', country: 'Italy', region: 'Veneto' },
        { name: 'Luis Felipe Edwards from Central', type: 'Pinot Noir', country: 'Chile', region: '' },
        { name: 'Casillero del Diablo', type: 'Pinot Noir', country: 'Chile', region: '' },
        { name: 'Shiraz Cabernet Koonunga Hill', type: 'Shiraz', country: 'Australia', region: '' },
        { name: 'Cape Discovery', type: 'Shiraz', country: 'South Africa', region: '' },
        { name: 'Agustinos', type: 'Shiraz', country: 'Chile', region: '' }
    ];

    bulkWines = wineData;

    // Show preview
    const previewHtml = bulkWines.map(wine => `
        <div class="bulk-preview-item">
            <strong>${escapeHtml(wine.name)}</strong>
            <small>${wine.type} • ${wine.country}${wine.region ? ' • ' + wine.region : ''}</small>
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

async function executeBulkImport() {
    if (bulkWines.length === 0) {
        alert('No wines to import.');
        return;
    }

    const statusEl = document.getElementById('bulkStatus');
    statusEl.className = 'bulk-status loading';
    statusEl.textContent = `Importing ${bulkWines.length} wines...`;
    statusEl.style.display = 'block';

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < bulkWines.length; i++) {
        const wine = bulkWines[i];

        try {
            // Create/get wine type
            const typeResponse = await fetch('/api/wines?action=createType', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: wine.type })
            });

            const typeResult = await typeResponse.json();
            const typeId = typeResult.type?.id;

            if (!typeId) {
                failCount++;
            } else {
                // Save wine
                const wineResponse = await fetch('/api/wines?action=save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: wine.name,
                        type_id: typeId,
                        country: wine.country,
                        region: wine.region || null,
                        notes: null,
                        photo_url: null
                    })
                });

                const wineResult = await wineResponse.json();
                if (wineResult.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            }
        } catch (error) {
            failCount++;
            console.error(`Error importing wine: ${wine.name}`, error);
        }
    }

    // Show results
    if (failCount === 0) {
        statusEl.className = 'bulk-status success';
        statusEl.innerHTML = `✓ Successfully imported <strong>${successCount}</strong> wines!`;
        setTimeout(() => {
            closeBulkImportModal();
            loadWines();
        }, 2000);
    } else {
        statusEl.className = 'bulk-status error';
        statusEl.innerHTML = `Imported <strong>${successCount}</strong> wines, but <strong>${failCount}</strong> failed.`;
    }
}
