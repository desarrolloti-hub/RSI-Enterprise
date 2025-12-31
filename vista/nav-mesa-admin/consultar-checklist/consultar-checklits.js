// ==========================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    databaseURL: "https://rsienterprise-default-rtdb.firebaseio.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033",
    measurementId: "G-38F2DBG9HE"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
let allChecklists = []; 
let isDataFetched = false; 

const photoTypes = {
    'frontal': 'Vista Frontal',
    'lateral-izquierdo': 'Lateral Izquierdo',
    'lateral-derecho': 'Lateral Derecho',
    'posterior': 'Vista Posterior',
    'luces': 'Sistema de Luces'
};

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadChecklistsFromFirebase(); 
    setupEventListeners();
    
    // Cargar lista de colaboradores para el filtro
    populateCollaboratorSelect();

    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    
    if (!viewId) {
        renderResults(allChecklists);
    } else {
        window.viewChecklistDetails(viewId);
        renderResults(allChecklists);
    }
});

function setupEventListeners() {
    document.getElementById('btnApplyFilters').addEventListener('click', applyFiltersFromUI);
    document.getElementById('btnClearFilters').addEventListener('click', clearFiltersAndReload);
}

// ==========================================
// 2. READ: CARGA DE FIREBASE
// ==========================================

async function loadChecklistsFromFirebase() {
    if (isDataFetched) return;

    const container = document.getElementById('resultsContainer');
    container.innerHTML = `<div class="loading" style="grid-column: 1/-1;"><div class="spinner"></div><p>Descargando historial completo...</p></div>`;

    try {
        let query = db.collection('checkList').orderBy('createdAt', 'desc'); 
        const snapshot = await query.get();
        
        console.log(`✅ Registros descargados: ${snapshot.size}`);
        allChecklists.length = 0; 
        
        snapshot.forEach(doc => {
            allChecklists.push({ id: doc.id, ...doc.data() });
        });
        
        isDataFetched = true;
        populateCollaboratorSelect(); 

        // Si no hay filtros activos por URL, renderizamos
        const params = new URLSearchParams(window.location.search);
        if (!params.get('view')) {
            renderResults(allChecklists);
        }

    } catch (error) {
        console.error("Error CRÍTICO:", error);
        container.innerHTML = `<div class="error-message" style="grid-column: 1/-1; text-align: center;">Error: ${error.message}</div>`;
    }
}

// ==========================================
// 3. LÓGICA DE FILTRADO
// ==========================================

function clearFiltersAndReload() {
    document.getElementById('filterDateStart').value = '';
    document.getElementById('filterDateEnd').value = '';
    document.getElementById('filterCollaborator').value = '';
    document.getElementById('filterPlate').value = '';
    renderResults(allChecklists);
}

function applyFiltersFromUI() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `<div class="loading" style="grid-column: 1/-1;"><div class="spinner"></div><p>Filtrando...</p></div>`;

    const filters = {
        dateStart: document.getElementById('filterDateStart').value,
        dateEnd: document.getElementById('filterDateEnd').value,
        collaborator: document.getElementById('filterCollaborator').value.toLowerCase().trim(),
        plate: document.getElementById('filterPlate').value.toLowerCase().trim()
    };

    const filteredList = applyClientFilters(allChecklists, filters);

    if (filteredList.length === 0) {
        container.innerHTML = `<p style="text-align:center; grid-column: 1/-1;">No se encontraron resultados.</p>`;
        return;
    }
    renderResults(filteredList);
}

function applyClientFilters(list, filters) {
    return list.filter(item => {
        const itemPlate = (item.vehicleInfo?.plates || '').toLowerCase();
        const itemCollaborator = (item.collaboratorInfo?.name || '').toLowerCase();
        const rawDate = item.tripInfo?.fecha; 

        let recordDate = null;
        if (rawDate) {
            const normalizedDate = rawDate.replace(/\//g, '-'); 
            recordDate = new Date(normalizedDate + "T00:00:00");
        }

        if (!recordDate || isNaN(recordDate.getTime())) {
            if (item.createdAt) {
                 recordDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
            }
        }

        const filterStart = filters.dateStart ? new Date(filters.dateStart + "T00:00:00") : null;
        const filterEnd = filters.dateEnd ? new Date(filters.dateEnd + "T23:59:59") : null;

        if (recordDate && !isNaN(recordDate.getTime())) {
            if (filterStart && recordDate < filterStart) return false;
            if (filterEnd && recordDate > filterEnd) return false;
        }

        if (filters.plate && !itemPlate.includes(filters.plate)) return false;
        if (filters.collaborator && !itemCollaborator.includes(filters.collaborator)) return false;

        return true;
    });
}

// ==========================================
// 4. RENDERIZADO (HTML) 
// ==========================================

function renderResults(list) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = ''; 
    
    if (list.length === 0) {
        container.innerHTML = `<p style="text-align:center; grid-column: 1/-1;">No hay registros disponibles.</p>`;
        return;
    }

    list.forEach(item => {
        const carModel = item.vehicleInfo?.name || 'Vehículo Desconocido';
        const carPlate = item.vehicleInfo?.plates || 'Sin Placa';
        const collaborator = item.collaboratorInfo?.name || 'Sin Asignar';
        const displayDate = formatDate(item.tripInfo?.fecha);

        const card = document.createElement('div');
        card.className = 'checklist-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="card-date"><i class="far fa-calendar-alt"></i> ${displayDate}</span>
                <span class="card-plate">${carPlate}</span>
            </div>
            <div class="card-body">
                <div class="card-vehicle">${carModel}</div>
                <div class="info-row">
                    <i class="fas fa-user-tie"></i>
                    <span>${collaborator}</span>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-action" style="background-color: #f39c12; color: white;" onclick="openAddIncidentModal('${item.id}')">
                    <i class="fas fa-exclamation-triangle"></i> Multas/Gastos
                </button>
                
                <button class="btn btn-action btn-secondary" onclick="viewChecklistDetails('${item.id}')" style="background-color: #3498db; color: white;">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
                
                </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// 5. NUEVA FUNCIONALIDAD: AGREGAR MULTAS/IMPREVISTOS
// ==========================================

window.openAddIncidentModal = async (id) => {
    const checklist = allChecklists.find(c => c.id === id);
    if (!checklist) return;

    // Variable temporal para guardar la evidencia
    let evidencePhotoBase64 = null;

    const { value: formValues } = await Swal.fire({
        title: 'Registrar Novedad',
        html: `
            <div class="incident-form-container">
                <div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> Registrando para: <strong>${checklist.vehicleInfo?.plates || 'N/A'}</strong>
                </div>

                <div>
                    <label class="incident-label">Tipo de Novedad</label>
                    <select id="incType" class="incident-input">
                        <option value="Multa de Tránsito">👮 Multa de Tránsito</option>
                        <option value="Gasto Imprevisto">💸 Gasto Imprevisto / Mecánico</option>
                        <option value="Combustible Extra">⛽ Combustible Extra</option>
                        <option value="Otro">📝 Otro</option>
                    </select>
                </div>

                <div>
                    <label class="incident-label">Descripción</label>
                    <input id="incDesc" type="text" class="incident-input" placeholder="Ej: Exceso de velocidad...">
                </div>

                <div>
                    <label class="incident-label">Costo Total</label>
                    <div class="cost-wrapper">
                        <span class="cost-symbol">$</span>
                        <input id="incCost" type="number" class="incident-input cost" placeholder="0.00" step="0.01">
                    </div>
                </div>

                <div>
                    <label class="incident-label">Evidencia (Foto/Ticket)</label>
                    <input type="file" id="incFile" accept="image/*" class="incident-input" style="padding: 8px;">
                    <div id="previewContainer" style="margin-top: 10px; text-align: center; display: none;">
                        <img id="imgPreview" src="" style="max-height: 100px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#f39c12',
        width: 450,
        didOpen: () => {
            // Escuchar cambios en el input file
            const fileInput = document.getElementById('incFile');
            const previewContainer = document.getElementById('previewContainer');
            const imgPreview = document.getElementById('imgPreview');

            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!file.type.startsWith('image/')) {
                        Swal.showValidationMessage('Solo se permiten imágenes');
                        fileInput.value = '';
                        return;
                    }

                    // Mostrar preview temporal mientras procesa
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        // Comprimir
                        try {
                            const compressed = await comprimirImagen(e.target.result);
                            evidencePhotoBase64 = compressed; // Guardar en variable
                            imgPreview.src = compressed;
                            previewContainer.style.display = 'block';
                        } catch (err) {
                            console.error("Error compresión", err);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        },
        preConfirm: () => {
            // VALIDACIÓN: descripción mínima 10 caracteres
            if (desc.length < 10) {
                Swal.showValidationMessage('⚠ La descripción debe tener al menos 10 caracteres.');
                return false;
            }

            // VALIDACIÓN: costo numérico
            if (!cost || isNaN(cost)) {
                Swal.showValidationMessage('⚠ El costo debe ser un número válido.');
                return false;
            }

            // VALIDACIÓN: costo > 0
            if (parseFloat(cost) <= 0) {
                Swal.showValidationMessage('⚠ El costo debe ser mayor a 0.');
                return false;
            }

            // VALIDACIÓN: evidencia obligatoria
            if (!file) {
                Swal.showValidationMessage('⚠ Debes subir una evidencia en imagen (JPG o PNG).');
                return false;
            }

            // VALIDACIÓN: formato JPG/PNG
            if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png')) {
                Swal.showValidationMessage('⚠ Solo se permiten imágenes JPG o PNG.');
                return false;
            }

            return { desc, cost, file };
                }
    });

    if (formValues) {
        try {
            await db.collection('checkList').doc(id).update({
                incidents: firebase.firestore.FieldValue.arrayUnion(formValues)
            });

            Swal.fire({
                title: '¡Registrado!',
                text: 'La novedad se guardó correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            
            if (!checklist.incidents) checklist.incidents = [];
            checklist.incidents.push(formValues);

        } catch (error) {
            console.error("Error:", error);
            Swal.fire('Error', 'No se pudo guardar.', 'error');
        }
    }
};

// ==========================================
// 6. VER DETALLES (ACTUALIZADO PARA MOSTRAR MULTAS)
// ==========================================

window.viewChecklistDetails = (id) => {
    const checklist = allChecklists.find(c => c.id === id);

    if (!checklist) {
        Swal.fire('Error', 'Detalles no encontrados.', 'error');
        return;
    }

    const photoTypeLabels = photoTypes;
    const car = `${checklist.vehicleInfo?.name || 'N/A'} (${checklist.vehicleInfo?.plates || 'N/A'})`;
    const collab = checklist.collaboratorInfo?.name || 'N/A';
    const origen = checklist.tripInfo?.origen || 'No registrado';
    const destino = checklist.tripInfo?.destino || 'No registrado';
    const km = checklist.tripInfo?.kmSalida || '0';
    const gasolina = checklist.tripInfo?.gasolina || 'No registrado';

    const firma = checklist.signature; 
    let firmaHtml = '';
    
    if (firma) {
        firmaHtml = `
            <div style="text-align: center; margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px;">
                <p style="font-size: 0.85rem; color: #555; margin-bottom: 5px;">Firma de Conformidad:</p>
                <img src="${firma}" alt="Firma Colaborador" style="max-height: 80px; border: 1px solid #eee; padding: 5px; border-radius: 4px; background-color: #fff;">
            </div>
        `;
    } else {
        firmaHtml = `<p style="text-align:center; font-size: 0.8rem; color: #999; margin-top: 15px;">(Sin firma registrada)</p>`;
    }

    // Fotos
    const photos = checklist.vehiclePhotos || {};
    let photoButtonsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">';
    let foundPhotoCount = 0;
    
    for (const key in photoTypeLabels) { 
        const imgData = photos[key];
        if (imgData) {
            foundPhotoCount++;
            photoButtonsHtml += `
                <button class="btn btn-primary" style="padding: 8px 12px; font-size: 0.9rem;" onclick="viewPhoto('${imgData.replace(/'/g, "\\'")}')">
                    <i class="fas fa-camera"></i> ${photoTypeLabels[key]}
                </button>`;
        }
    }
    photoButtonsHtml += '</div>';

    // Listas
    const docsList = checklist.checklists?.documentos?.items || [];
    const accsList = checklist.checklists?.accesorios?.items || [];
    const segList = checklist.checklists?.seguridad?.items || [];
    const equipList = checklist.checklists?.equipamiento?.items || [];

    const checklistItemsHtml = `
        <p><strong>Documentos:</strong> ${docsList.join(', ') || 'Ninguno'}</p>
        <p><strong>Accesorios:</strong> ${accsList.join(', ') || 'Ninguno'}</p>
        <p><strong>Seguridad:</strong> ${segList.join(', ') || 'Ninguno'}</p>
        <p><strong>Equipamiento:</strong> ${equipList.join(', ') || 'Ninguno'}</p>
    `;

    const obsHtml = `
        <p style="margin-top: 10px;">
            <strong>Obs. Documentos:</strong> ${checklist.checklists?.documentos?.obs || 'Ninguna'}<br>
            <strong>Obs. Accesorios:</strong> ${checklist.checklists?.accesorios?.obs || 'Ninguna'}<br>
            <strong>Obs. Seguridad:</strong> ${checklist.checklists?.seguridad?.obs || 'Ninguna'}<br>
            <strong>Obs. Equipamiento:</strong> ${checklist.checklists?.equipamiento?.obs || 'Ninguna'}
        </p>
    `;

    // Novedades / Multas (HTML)
    let incidentsHtml = '<p style="color: #777; font-style: italic; font-size: 0.9rem;">No hay novedades registradas.</p>';
    
    if (checklist.incidents && checklist.incidents.length > 0) {
        incidentsHtml = '<div style="max-height: 200px; overflow-y: auto;">';
        
        checklist.incidents.forEach(inc => {
            const date = new Date(inc.date).toLocaleDateString();
            
            // Botón para ver evidencia si existe
            let btnEvidencia = '';
            if (inc.evidence) {
                // Escapamos comillas para el onclick
                const safeEvidence = inc.evidence.replace(/'/g, "\\'");
                btnEvidencia = `
                    <button onclick="viewPhoto('${safeEvidence}')" class="btn-sm" style="margin-top: 5px; background: #e67e22; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600; ">
                        <i class="fas fa-image"></i> Ver Evidencia
                    </button>
                `;
            }

            incidentsHtml += `
                <div class="incident-item">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong>${inc.type}</strong> <span style="font-size: 0.8rem; color: #666;">(${date})</span><br>
                            ${inc.desc}
                        </div>
                        <div style="text-align: right;">
                            <strong>$${inc.cost}</strong>
                        </div>
                    </div>
                    ${btnEvidencia}
                </div>`;
        });
        incidentsHtml += '</div>';
    }

    Swal.fire({
        title: `Detalles: ${car}`,
        html: `
            <div style="text-align: left; line-height: 1.6; font-size: 1rem;">
                <p><strong>Colaborador:</strong> ${collab}</p>
                <p><strong>Ruta:</strong> ${origen} ➝ ${destino}</p>
                <p><strong>KM:</strong> ${km} | <strong>Gasolina:</strong> ${gasolina}</p>
                
                <hr style="margin: 15px 0; border-color: #ddd;">
                <h4><i class="fas fa-camera-retro"></i> Evidencia (${foundPhotoCount})</h4>
                ${photoButtonsHtml}
                
                <hr style="margin: 15px 0; border-color: #ddd;">
                <h4><i class="fas fa-exclamation-triangle"></i> Situaciones</h4>
                <div style="max-height: 100px; overflow-y: auto;">
                    ${(checklist.vehicleDetails && checklist.vehicleDetails.length > 0) 
                        ? `<ul>${checklist.vehicleDetails.map(d => `<li>${d}</li>`).join('')}</ul>` 
                        : '— Ningún daño reportado.'}
                </div>
                
                <h4><i class="fas fa-list-check"></i> Verificación</h4>
                <div style="font-size: 0.9rem;">
                    ${checklistItemsHtml}
                    ${obsHtml}
                </div>
                ${firmaHtml}

                ${incidentsHtml}
            </div>
        `,
        width: 650,
        confirmButtonText: 'Cerrar'
    });
};


// ==========================================
// 7. UTILIDADES
// ==========================================

window.viewPhoto = (imageData) => {
    const safeImgData = imageData.replace(/"/g, '&quot;'); 
    Swal.fire({
        title: 'Evidencia',
        html: `<img src="${safeImgData}" style="max-width: 100%; height: auto; border-radius: 8px;">`,
        width: '80%', 
        confirmButtonText: 'Cerrar'
    });
};

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return dateString; 
}

function populateCollaboratorSelect() {
    const select = document.getElementById('filterCollaborator');
    if (!select) return;

    const uniqueNames = new Set();
    allChecklists.forEach(item => {
        const name = item.collaboratorInfo?.name;
        if (name) uniqueNames.add(name.trim());
    });

    const sortedNames = Array.from(uniqueNames).sort();
    select.innerHTML = '<option value="">Todos los colaboradores</option>';

    sortedNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name.toLowerCase(); 
        option.textContent = name; 
        select.appendChild(option);
    });
}

// ==========================================
// 8. FUNCIÓN DE COMPRESIÓN DE IMÁGENES
// ==========================================
async function comprimirImagen(base64Str) {
    const MAX_BYTES = 1000000; // 1 MB
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIDE = 1280; 
            if (width > height) {
                if (width > MAX_SIDE) { height *= MAX_SIDE / width; width = MAX_SIDE; }
            } else {
                if (height > MAX_SIDE) { width *= MAX_SIDE / height; height = MAX_SIDE; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            let quality = 0.9;
            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            while (dataUrl.length * 0.75 > MAX_BYTES && quality > 0.2) {
                quality -= 0.1;
                dataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            resolve(dataUrl);
        };
        img.onerror = () => { resolve(base64Str); };
    });
}