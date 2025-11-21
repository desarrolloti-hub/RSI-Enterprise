// Consolidar configuración e inicialización de Firebase
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

// Inicializar Firebase si no está inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
let allChecklists = [];

// Definición de las fotos y el texto del botón
const photoTypes = {
    'frontal': 'Vista Frontal',
    'lateral-izquierdo': 'Lateral Izquierdo', // ✅ Corregido
    'lateral-derecho': 'Lateral Derecho',     // ✅ Corregido
    'posterior': 'Vista Posterior',
    'luces': 'Sistema de Luces'
};



document.addEventListener('DOMContentLoaded', () => {
    loadChecklists();
    setupEventListeners();
    applyChecklistCustomizations();
});
     // Estado de la aplicación
        const appState = {
            checklists: [],
            currentChecklist: null,
            isEditing: false
        };


        // Elementos DOM
        
       const checklistsContainer = document.getElementById('checklistsContainer');
        

        // 3. Configurar Botones y Filtros
function setupEventListeners() {
    // Botón Crear (Redirige a la página de creación)
    document.getElementById('btnCreateChecklist').addEventListener('click', () => {
        window.location.href = '../crear-checklist/crear-checklist.html';
    });

    // 🟢 NUEVO: Botón Consultar Todo (Redirige al CRUD completo)
    document.getElementById('btnViewAll').addEventListener('click', () => {
        window.location.href = '../consultar-checklist/consultar-checklists.html'; 
    });


    document.getElementById('limitSelect').addEventListener('change', () => {
        loadChecklists();
    });
}

        // 4. READ: Cargar Checklists desde Firestore
async function loadChecklists() {
    const container = document.getElementById('checklistsContainer');
    const limit = parseInt(document.getElementById('limitSelect').value) || 20;
    
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Cargando últimos registros...</p>
        </div>
    `;

    try {
        // Consultar colección 'checkList' ordenado por fecha de creación
        const snapshot = await db.collection('checkList')
            .orderBy('createdAt', 'desc') // Asegúrate de tener un índice en Firebase si esto falla
            .limit(limit)
            .get();

        allChecklists = [];
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center; grid-column: 1/-1; padding: 40px;">
                    <i class="fas fa-clipboard-list" style="font-size: 3rem; color: #ccc;"></i>
                    <h3>No hay checklists registrados</h3>
                    <p>Crea el primero usando el botón superior.</p>
                </div>`;
            return;
        }

        // Procesar datos
        snapshot.forEach(doc => {
            const data = doc.data();
            allChecklists.push({
                id: doc.id,
                ...data
            });
        });

        renderChecklists(allChecklists);

    } catch (error) {
        console.error("Error al cargar checklists:", error);
        container.innerHTML = `<p class="error">Error al cargar datos: ${error.message}</p>`;
    }
}

        // Mostrar estado de carga
        function showLoading() {
            checklistsContainer.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                </div>
            `;
        }

        

// 5. Renderizar Tarjetas (UI) - SOLO LECTURA
function renderChecklists(list) {
    const container = document.getElementById('checklistsContainer');
    container.innerHTML = '';

    list.forEach(item => {
        // ... (Extracción de datos igual que antes) ...
        const carBrand = item.vehicleInfo?.brand || '';
        const carModel = item.vehicleInfo?.name || 'Vehículo Desconocido';
        const carPlate = item.vehicleInfo?.plates || 'Sin Placa';
        const collaborator = item.collaboratorInfo?.name || 'Sin Asignar';
        
        let displayDate = 'Fecha no registrada';
        if (item.tripInfo && item.tripInfo.fecha) {
            displayDate = item.tripInfo.fecha; 
        } else if (item.createdAt) {
            displayDate = new Date(item.createdAt.seconds * 1000).toLocaleDateString();
        }

        const card = document.createElement('div');
        card.className = 'checklist-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="card-date"><i class="far fa-calendar-alt"></i> ${displayDate}</span>
                <span class="card-plate">${carPlate}</span>
            </div>
            <div class="card-body">
                <div class="card-vehicle">${carBrand} ${carModel}</div>
                
                <div class="info-row">
                    <i class="fas fa-user-tie"></i>
                    <span>${collaborator}</span>
                </div>
            </div>
            <div class="card-footer" style="justify-content: flex-end;">
                <button class="btn btn-action btn-secondary" onclick="viewChecklistDetails('${item.id}')">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// 7. Muestra los detalles de un Checklist en un modal (SWEETALERT2)
window.viewChecklistDetails = (id) => {
    const checklist = allChecklists.find(c => c.id === id);

    if (!checklist) {
        Swal.fire('Error', 'Detalles del checklist no encontrados.', 'error');
        return;
    }

    // Nota: La variable global 'photoTypes' ya está definida arriba.
    const photoTypeLabels = photoTypes; // ✅ USAMOS LA VARIABLE GLOBAL CORRECTA
    
    // Extracción de datos básicos para el encabezado
    const car = `${checklist.vehicleInfo?.name || 'N/A'} (${checklist.vehicleInfo?.plates || 'N/A'})`;
    const collab = checklist.collaboratorInfo?.name || 'N/A';
    const origen = checklist.tripInfo?.origen || 'No registrado';
    const destino = checklist.tripInfo?.destino || 'No registrado';
    const km = checklist.tripInfo?.kmSalida || '0';

    // 1. Construcción de los Botones de Fotos
    const photos = checklist.vehiclePhotos || {};
    let photoButtonsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">';
    let foundPhotoCount = 0;
    
    // ✅ CORRECCIÓN: Usamos 'photoTypeLabels' (que es un alias de 'photoTypes')
    for (const key in photoTypeLabels) { 
        const imgData = photos[key];
        if (imgData) {
            foundPhotoCount++;
            
            photoButtonsHtml += `
                <button 
                    class="btn btn-primary" 
                    style="padding: 8px 12px; font-size: 0.9rem;"
                    onclick="viewPhoto('${imgData.replace(/'/g, "\\'")}')">
                    <i class="fas fa-camera"></i> ${photoTypeLabels[key]}
                </button>
            `;
        }
    }
    photoButtonsHtml += '</div>';

    // 2. Construcción de Listas y Observaciones
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

    // 3. Mostrar el modal
    Swal.fire({
        title: `Detalles: ${car}`,
        html: `
            <div style="text-align: left; line-height: 1.6; font-size: 1rem;">
                <p><strong>Colaborador:</strong> ${collab}</p>
                <p><strong>Fecha/Hora Salida:</strong> ${checklist.tripInfo?.fecha || 'N/A'} @ ${checklist.tripInfo?.horaSalida || 'N/A'}</p>
                <p><strong>Ruta:</strong> ${origen} ➝ ${destino}</p>
                <p><strong>KM de Salida:</strong> ${km} KM</p>
                
                <hr style="margin: 15px 0; border-color: #ddd;">

                <h4><i class="fas fa-camera-retro"></i> Evidencia Fotográfica (${foundPhotoCount} de ${Object.keys(photoTypeLabels).length})</h4>
                ${photoButtonsHtml}
                
                <hr style="margin: 15px 0; border-color: #ddd;">
                
                <h4><i class="fas fa-exclamation-triangle"></i> Detalles y Situaciones</h4>
                <div style="max-height: 150px; overflow-y: auto; margin-bottom: 15px;">
                    <p style="font-weight: 600; margin-bottom: 5px;">Daños Vehículo :</p>
                    ${(checklist.vehicleDetails && checklist.vehicleDetails.length > 0)
                        ? `<ul>${checklist.vehicleDetails.map(d => `<li>${d}</li>`).join('')}</ul>`
                        : '— Ningún daño reportado.'}
                </div>
                
                <h4><i class="fas fa-list-check"></i> Resumen de Verificación (Checklists)</h4>
                <div style="font-size: 0.95rem;">
                    ${checklistItemsHtml}
                    ${obsHtml}
                </div>
            </div>
        `,
        width: 650,
        confirmButtonText: 'Cerrar',
        customClass: {
            container: 'custom-swal-container',
            popup: 'custom-swal-popup'
        }
    });
};


// 🖼️ FUNCIÓN VISOR DE FOTOS INDIVIDUAL
window.viewPhoto = (imageData) => {
    // Escapa cualquier comilla para evitar romper el HTML de SweetAlert
    const escapedData = imageData.replace(/"/g, '&quot;'); 
    
    Swal.fire({
        title: 'Evidencia Fotográfica',
        html: `<img src="${escapedData}" style="max-width: 100%; height: auto; border-radius: 8px;">`,
        width: '80%', // Aumenta el tamaño del modal para la foto
        showConfirmButton: true,
        confirmButtonText: 'Cerrar'
    });
};





     

        function formatDate(dateString) {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString('es-ES', options);
        }

        // Integrar compatibilidad con navegación y personalización
function applyChecklistCustomizations() {
    if (typeof actualizarColoresPersonalizados === 'function') {
        actualizarColoresPersonalizados();
    }

    if (typeof updateMenuStyles === 'function') {
        updateMenuStyles();
    }
}


