// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN FIREBASE
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

// Inicializar Firebase si no está inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// ==========================================
// 2. VARIABLES GLOBALES
// ==========================================
let allChecklists = [];
let lastVisibleDoc = null;
let isFilterActive = false;

// Definición de las fotos y etiquetas
const photoTypes = {
    'frontal': 'Vista Frontal',
    'lateral-izquierdo': 'Lateral Izquierdo',
    'lateral-derecho': 'Lateral Derecho',
    'posterior': 'Vista Posterior',
    'luces': 'Sistema de Luces'
};

// ==========================================
// 3. INICIALIZACIÓN DEL DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initYearSelect();
    loadChecklists(true); // Carga inicial
    setupEventListeners();
    
});

// Función para llenar el select de Años
// Función para llenar el select de Años dinámicamente
function initYearSelect() {
    const yearSelect = document.getElementById('selectYear');
    
    // Validación de seguridad por si no existe el elemento en el HTML
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear(); // Toma el año del sistema (ej: 2025, 2026...)
    const startYear = 2025; // 🔒 AÑO DE INICIO FIJO (El sistema nace aquí)

    yearSelect.innerHTML = ''; // Limpiar opciones anteriores
    
    // Ciclo: Empieza en el año actual y baja hasta el 2025
    // Ejemplo en 2025: Solo muestra [2025]
    // Ejemplo en 2027: Mostrará [2027, 2026, 2025]
    for (let year = currentYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    // Seleccionar año actual por defecto
    yearSelect.value = currentYear;
}

// ==========================================
// 4. CONFIGURACIÓN DE LISTENERS
// ==========================================
function setupEventListeners() {
    // Botón Crear
    document.getElementById('btnCreateChecklist').addEventListener('click', () => {
        window.location.href = '../crear-checklist/crear-checklist.html';
    });

    // Botón Consultar Todo
    document.getElementById('btnViewAll').addEventListener('click', () => {
        window.location.href = '../consultar-checklist/consultar-checklists.html'; 
    });

    // Filtros
    document.getElementById('limitSelect').addEventListener('change', () => {
        loadChecklists(true);
    });

    document.getElementById('selectMonth').addEventListener('change', () => {
        loadChecklists(true); 
    });

    document.getElementById('selectYear').addEventListener('change', () => {
        // Solo recargamos si ya hay un mes seleccionado
        if(document.getElementById('selectMonth').value) {
          loadChecklists(true);   
        }
    });

    // Botón Limpiar filtro 
    document.getElementById('btnClearMonth').addEventListener('click', () => {
        document.getElementById('selectMonth').value = ''; // Reset Mes
        document.getElementById('selectYear').value = new Date().getFullYear(); // Reset Año
        loadChecklists(true);
    });

    // Botón "Cargar Más"
    document.getElementById('btnLoadMore').addEventListener('click', () => {
        loadChecklists(false); // false = append
    });
}

// ==========================================
// 5. LÓGICA CORE: CARGAR CHECKLISTS
// ==========================================
async function loadChecklists(isReset = false) {
    const container = document.getElementById('checklistsContainer');
    const loadMoreContainer = document.getElementById('paginationContainer'); 
    const btnLoadMore = document.getElementById('btnLoadMore');
    
    // Valores actuales de UI
    const limitVal = parseInt(document.getElementById('limitSelect').value) || 10;
    const selMonth = document.getElementById('selectMonth').value;
    const selYear = document.getElementById('selectYear').value;

    let monthVal = null;
    if(selMonth && selYear) {
        monthVal = `${selYear}-${selMonth}`;
    }

    // --- ESTADO DE CARGA (Spinner) ---
    if (isReset) {
        container.innerHTML = '';
        allChecklists = [];
        lastVisibleDoc = null;
        
        if(loadMoreContainer) loadMoreContainer.style.display = 'none';

        container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Cargando registros...</p></div>`;
    } else {
        if(btnLoadMore) {
            btnLoadMore.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Cargando...`;
            btnLoadMore.disabled = true;
        }
    }

    try {
        let query;

        // --- CONSTRUCCIÓN DE LA QUERY ---
        if (monthVal) {
            isFilterActive = true;
            // Calcular rango del mes
            const startStr = `${monthVal}-01`; 
            const [year, month] = monthVal.split('-');
            const lastDay = new Date(year, month, 0).getDate(); 
            const endStr = `${monthVal}-${lastDay}`;

            query = db.collection('checkList')
                .where('tripInfo.fecha', '>=', startStr)
                .where('tripInfo.fecha', '<=', endStr)
                .orderBy('tripInfo.fecha', 'desc') 
                .limit(limitVal);
        } else {
            isFilterActive = false;
            query = db.collection('checkList')
                .orderBy('createdAt', 'desc')
                .limit(limitVal);
        }

        // --- PAGINACIÓN ---
        if (!isReset && lastVisibleDoc) {
            query = query.startAfter(lastVisibleDoc);
        }

        // --- EJECUCIÓN ---
        const snapshot = await query.get();

        // Limpiar spinner si es reset
        if (isReset) {
            const loadingElem = container.querySelector('.loading');
            if (loadingElem) loadingElem.remove();
        }

        // --- MANEJO DE VACÍO ---
        if (snapshot.empty) {
            if (isReset) {
                container.innerHTML = `
                    <div style="text-align:center; grid-column: 1/-1; padding: 40px;">
                        <i class="fas fa-search" style="font-size: 3rem; color: #ccc;"></i>
                        <h3>No se encontraron resultados</h3>
                        <p>${monthVal ? 'Intenta con otro mes.' : 'No hay registros aún.'}</p>
                    </div>`;
            } else {
                if(btnLoadMore) {
                    btnLoadMore.innerHTML = "No hay más registros";
                    setTimeout(() => { 
                        if(loadMoreContainer) loadMoreContainer.style.display = 'none'; 
                    }, 2000);
                }
            }
            return;
        }

        // Actualizar cursor
        lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

        // Procesar datos
        const newItems = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const item = { id: doc.id, ...data };
            allChecklists.push(item);
            newItems.push(item);
        });

        // Renderizar
        renderChecklists(newItems, isReset);

        // --- GESTIÓN BOTÓN CARGAR MÁS ---
        if (loadMoreContainer && btnLoadMore) {
            if (snapshot.docs.length < limitVal) {
                loadMoreContainer.style.display = 'none';
            } else {
                loadMoreContainer.style.display = 'block';
                btnLoadMore.innerHTML = `<i class="fas fa-arrow-down"></i> Cargar más registros`;
                btnLoadMore.disabled = false;
            }
        }

    } catch (error) {
        console.error("Error:", error);
        if (isReset) {
            container.innerHTML = `<p class="error" style="grid-column: 1/-1; text-align: center;">Error: ${error.message}</p>`;
        } else {
            if(btnLoadMore) {
                btnLoadMore.innerHTML = "Error al cargar";
                alert("Error: " + error.message);
            }
        }
    }
}

// ==========================================
// 6. RENDERIZADO (UI)
// ==========================================
function renderChecklists(list, isReset) {
    const container = document.getElementById('checklistsContainer');
    
    if (isReset) {
        container.innerHTML = '';
    }

    list.forEach(item => {
        const carBrand = item.vehicleInfo?.brand || '';
        const carModel = item.vehicleInfo?.name || 'Vehículo Desconocido';
        const carPlate = item.vehicleInfo?.plates || 'Sin Placa';
        const collaborator = item.collaboratorInfo?.name || 'Sin Asignar';
        
        let displayDate = 'Fecha no registrada';
        if (item.tripInfo && item.tripInfo.fecha) {
            displayDate = formatDate(item.tripInfo.fecha); 
        } else if (item.createdAt) {
            displayDate = new Date(item.createdAt.seconds * 1000).toLocaleDateString();
        }

        const card = document.createElement('div');
        card.className = 'checklist-card';
        card.style.animation = "fadeIn 0.5s ease"; 
        
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

// ==========================================
// 7. MODAL DETALLES
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
// 8. UTILIDADES
// ==========================================
window.viewPhoto = (imageData) => {
    const escapedData = imageData.replace(/"/g, '&quot;'); 
    Swal.fire({
        title: 'Evidencia',
        html: `<img src="${escapedData}" style="max-width: 100%; height: auto; border-radius: 8px;">`,
        width: '80%',
        showConfirmButton: true,
        confirmButtonText: 'Cerrar'
    });
};

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return dateString;
}

