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
let allChecklists = []; // Almacena todos los resultados de Firebase
let isDataFetched = false; // Bandera de control

// Definición de las fotos para el modal
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
    // 1. Precarga de datos
    await loadChecklistsFromFirebase(); 
    setupEventListeners();
    
    // 2. Comprobar si venimos de la página de resumen con un ID
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    
    // Si no hay ID específico, mostramos todo lo descargado
    if (!viewId) {
        renderResults(allChecklists);
    } else {
        window.viewChecklistDetails(viewId);
        renderResults(allChecklists);
    }
});

function setupEventListeners() {
    // 🟢 Botón Aplicar Filtros: Usamos la función orquestadora que filtra Y renderiza
    document.getElementById('btnApplyFilters').addEventListener('click', applyFiltersFromUI);
    
    // 🟢 Botón Limpiar
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
        // Ordenamos por fecha de creación descendente
        let query = db.collection('checkList').orderBy('createdAt', 'desc'); 
        
        const snapshot = await query.get();
        
        console.log(`✅ Registros descargados de Firebase: ${snapshot.size}`);

        allChecklists.length = 0; 
        
        snapshot.forEach(doc => {
            allChecklists.push({ id: doc.id, ...doc.data() });
        });
        
        isDataFetched = true;

        populateCollaboratorSelect();

        const params = new URLSearchParams(window.location.search);
        if(!params.get('view'))
        {
            renderResults(allChecklists);
        }

    } catch (error) {
        console.error("Error CRÍTICO al cargar checklists:", error);
        container.innerHTML = `
            <div class="error-message" style="grid-column: 1/-1; color: red; text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-circle"></i> 
                <p>Error de conexión: ${error.message}</p>
            </div>`;
    }
}

// ==========================================
// 3. LÓGICA DE FILTRADO (CORREGIDA Y BLINDADA)
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

    // 1. Capturar valores
    const filters = {
        dateStart: document.getElementById('filterDateStart').value,
        dateEnd: document.getElementById('filterDateEnd').value,
        collaborator: document.getElementById('filterCollaborator').value.toLowerCase().trim(),
        plate: document.getElementById('filterPlate').value.toLowerCase().trim()
    };

    console.log("🔍 Filtros aplicados:", filters);

    // 2. Filtrar la lista global
    const filteredList = applyClientFilters(allChecklists, filters);

    console.log(`📊 Resultados: ${filteredList.length} encontrados de ${allChecklists.length} totales.`);

    if (filteredList.length === 0) {
        container.innerHTML = `<p style="text-align:center; grid-column: 1/-1;">No se encontraron resultados con esos filtros.</p>`;
        return;
    }

    // 3. Renderizar
    renderResults(filteredList);
}

function applyClientFilters(list, filters) {
    return list.filter(item => {
        // --- A. PREPARACIÓN DE DATOS ---
        const itemPlate = (item.vehicleInfo?.plates || '').toLowerCase();
        const itemCollaborator = (item.collaboratorInfo?.name || '').toLowerCase();
        const rawDate = item.tripInfo?.fecha; // Esperamos "YYYY-MM-DD"

        // --- B. MANEJO SEGURO DE FECHAS ---
        let recordDate = null;
        
        if (rawDate) {
            // Reemplazamos guiones por si acaso y aseguramos hora 00:00:00
            const normalizedDate = rawDate.replace(/\//g, '-'); 
            recordDate = new Date(normalizedDate + "T00:00:00");
        }

        // Si la fecha del viaje es inválida, intentamos usar la fecha de creación del registro
        if (!recordDate || isNaN(recordDate.getTime())) {
            if (item.createdAt) {
                 recordDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
            }
        }

        // Definimos rango de filtro (Inicio 00:00 - Fin 23:59)
        const filterStart = filters.dateStart ? new Date(filters.dateStart + "T00:00:00") : null;
        const filterEnd = filters.dateEnd ? new Date(filters.dateEnd + "T23:59:59") : null;

        // --- C. COMPARACIONES ---

        // 1. Filtro por Fecha
        if (recordDate && !isNaN(recordDate.getTime())) {
            if (filterStart && recordDate < filterStart) return false;
            if (filterEnd && recordDate > filterEnd) return false;
        }

        // 2. Filtro por Placa
        if (filters.plate && !itemPlate.includes(filters.plate)) return false;

        // 3. Filtro por Colaborador
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
                <button class="btn btn-action btn-primary" onclick="openEditModal('${item.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-action btn-secondary" onclick="viewChecklistDetails('${item.id}')" style="background-color: #3498db; color: white;">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
                <button class="btn btn-action btn-delete" onclick="deleteChecklist('${item.id}')">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// 5. FUNCIONES CRUD (EDITAR, ELIMINAR, VER)
// ==========================================

window.deleteChecklist = async (id) => {
    const checklist = allChecklists.find(c => c.id === id);
    const car = checklist?.vehicleInfo?.name || 'este registro';

    const result = await Swal.fire({
        title: `Eliminar Checklist de ${car}`,
        html: `
            <p>Estás a punto de eliminar permanentemente este registro.</p>
            <p>Para confirmar, escribe <strong>"CONFIRMAR"</strong>:</p>
            <input type="text" id="confirmInput" class="swal2-input" placeholder="Escribe CONFIRMAR">
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, ¡Eliminar!',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const input = document.getElementById('confirmInput').value.trim();
            if (input !== 'CONFIRMAR') {
                Swal.showValidationMessage('Debes escribir CONFIRMAR exactamente.');
                return false;
            }
            return true;
        }
    });

    if (result.isConfirmed) {
        try {
            await db.collection('checkList').doc(id).delete();
            Swal.fire('¡Eliminado!', 'Registro eliminado.', 'success');
            
            // Recargar datos y reaplicar filtros actuales
            isDataFetched = false; // Forzar recarga
            await loadChecklistsFromFirebase(); 
            applyFiltersFromUI(); 
            
        } catch (error) {
            console.error("Error al eliminar:", error);
            Swal.fire('Error', 'No se pudo eliminar.', 'error');
        }
    }
};

window.openEditModal = (id) => {
    // Redirigir a la página de creación pasando el ID como parámetro
    // Ajusta el nombre del archivo HTML si es necesario (ej: crear-checklist.html)
    window.location.href = `../crear-checklist/crear-checklist.html?editId=${id}`;
};

window.viewChecklistDetails = (id) => {
    const checklist = allChecklists.find(c => c.id === id);
    if (!checklist) return Swal.fire('Error', 'No encontrado.', 'error');
    
    const car = `${checklist.vehicleInfo?.name || 'N/A'} (${checklist.vehicleInfo?.plates || 'N/A'})`;
    const collab = checklist.collaboratorInfo?.name || 'N/A';
    
    // Fotos
    const photosData = checklist.vehiclePhotos || {};
    let photoButtonsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">';
    let foundPhotoCount = 0;
    
    for (const key in photoTypes) { 
        if (photosData[key]) {
            foundPhotoCount++;
            const safeImgData = photosData[key].replace(/'/g, "\\'"); 
            photoButtonsHtml += `
                <button class="btn btn-primary" style="padding: 8px 12px; font-size: 0.9rem;" onclick="viewPhoto('${safeImgData}')">
                    <i class="fas fa-camera"></i> ${photoTypes[key]}
                </button>`;
        }
    }
    photoButtonsHtml += '</div>';

    // Detalles
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
    const detallesHtml = (checklist.vehicleDetails?.length > 0)
        ? `<ul>${checklist.vehicleDetails.map(d => `<li>${d}</li>`).join('')}</ul>`
        : '— Ningún daño reportado.';

    const obsHtml = `
        <p style="margin-top: 10px;">
            <strong>Obs. Documentos:</strong> ${checklist.checklists?.documentos?.obs || 'Ninguna'}<br>
            <strong>Obs. Accesorios:</strong> ${checklist.checklists?.accesorios?.obs || 'Ninguna'}<br>
            <strong>Obs. Seguridad:</strong> ${checklist.checklists?.seguridad?.obs || 'Ninguna'}<br>
            <strong>Obs. Equipamiento:</strong> ${checklist.checklists?.equipamiento?.obs || 'Ninguna'}
        </p>
    `;

    Swal.fire({
        title: `Detalles: ${car}`,
        html: `
            <div style="text-align: left; line-height: 1.6; font-size: 1rem;">
                <p><strong>Colaborador:</strong> ${collab}</p>
                <p><strong>Ruta:</strong> ${checklist.tripInfo?.origen || 'N/A'} ➝ ${checklist.tripInfo?.destino || 'N/A'}</p>
                <p><strong>Fecha:</strong> ${checklist.tripInfo?.fecha || 'N/A'}</p>
                
                <hr style="margin: 15px 0; border-color: #ddd;">
                <h4><i class="fas fa-camera-retro"></i> Evidencia (${foundPhotoCount})</h4>
                ${photoButtonsHtml}
                
                <hr style="margin: 15px 0; border-color: #ddd;">
                <h4><i class="fas fa-exclamation-triangle"></i> Daños</h4>
                <div style="max-height: 100px; overflow-y: auto;">${detallesHtml}</div>
                
                <h4><i class="fas fa-list-check"></i> Verficacion y Observaciones</h4>
                <div style="font-size: 0.9rem;">
                ${checklistItemsHtml}
                ${obsHtml}
                </div>
            </div>
        `,
        width: 650,
        confirmButtonText: 'Cerrar'
    });
};

// ==========================================
// 6. UTILIDADES
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

// ==========================================
// 8. FUNCIÓN PARA LLENAR EL SELECT DE COLABORADORES
// ==========================================
function populateCollaboratorSelect() {
    const select = document.getElementById('filterCollaborator');
    if (!select) return;

    // 1. Usamos un Set para guardar nombres únicos (evita duplicados)
    const uniqueNames = new Set();

    allChecklists.forEach(item => {
        const name = item.collaboratorInfo?.name;
        if (name) {
            uniqueNames.add(name.trim()); // Guardamos el nombre limpio
        }
    });

    // 2. Convertimos a array y ordenamos alfabéticamente
    const sortedNames = Array.from(uniqueNames).sort();

    // 3. Limpiamos el select y dejamos la opción por defecto
    select.innerHTML = '<option value="">Todos los colaboradores</option>';

    // 4. Creamos las opciones
    sortedNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name.toLowerCase(); // El valor en minúsculas para comparar fácil
        option.textContent = name; // El texto visible tal cual es
        select.appendChild(option);
    });
}