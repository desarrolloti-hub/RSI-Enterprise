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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// ==========================================
// 2. VARIABLES GLOBALES
// ==========================================
let allChecklists = []; // Aquí guardaremos TODO lo que bajemos para filtrar localmente
let currentUserFilter = null; // Nombre del usuario logueado

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
    setupEventListeners();
    applyChecklistCustomizations();

    // Detección de Usuario
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Buscar nombre real en colección colaboradores
                const snapshot = await db.collection('colaboradores')
                    .where('CORREO ELECTRÓNICO EMPRESARIAL', '==', user.email)
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    currentUserFilter = data.NOMBRE;
                    console.log("Usuario identificado:", currentUserFilter);
                } else {
                    console.warn("Usuario no encontrado en DB. Se mostrará vista general.");
                }
                // Cargar datos una vez identificado
                loadChecklistsNoIndex();
            } catch (e) {
                console.error("Error auth:", e);
            }
        } else {
            window.location.href = '../nav-visitantes/inicio-de-sesion.html';
        }
    });
});

function initYearSelect() {
    const yearSelect = document.getElementById('selectYear');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    yearSelect.innerHTML = ''; 
    
    for (let year = currentYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    yearSelect.value = currentYear;
}

// ==========================================
// 4. LISTENERS
// ==========================================
function setupEventListeners() {
    const btnCreate = document.getElementById('btnCreateChecklist');
    if(btnCreate) btnCreate.addEventListener('click', () => window.location.href = '../crear-checklist/crear-checklist.html');
    
    const btnMultas = document.getElementById('btnAddVehicles'); 
    if(btnMultas) btnMultas.addEventListener('click', () => window.location.href = '../multas/multas.html');

    // Al cambiar filtros, recargamos usando la lógica local (No Index)
    document.getElementById('limitSelect')?.addEventListener('change', applyLocalFilters);
    document.getElementById('selectMonth')?.addEventListener('change', applyLocalFilters);
    document.getElementById('selectYear')?.addEventListener('change', () => {
        if(document.getElementById('selectMonth').value) applyLocalFilters();
    });

    document.getElementById('btnClearMonth')?.addEventListener('click', () => {
        document.getElementById('selectMonth').value = ''; 
        document.getElementById('selectYear').value = new Date().getFullYear(); 
        applyLocalFilters();
    });
    
    // En modo "No Index", cargar más es complejo, así que ocultamos el botón o cargamos todo de una.
    // Para simplificar, este método carga todo lo del usuario y pagina localmente.
}

// ==========================================
// 5. LOGICA "NO INDEX" (Carga todo y filtra en JS)
// ==========================================

async function loadChecklistsNoIndex() {
    const container = document.getElementById('checklistsContainer');
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Cargando mis registros...</p></div>`;
    
    // Ocultamos paginación de servidor porque haremos todo local
    const pagContainer = document.getElementById('paginationContainer');
    if(pagContainer) pagContainer.style.display = 'none';

    try {
        let query = db.collection('checkList');

        // SOLO aplicamos el filtro de igualdad (esto NO requiere índice)
        if (currentUserFilter) {
            query = query.where('collaboratorInfo.name', '==', currentUserFilter);
        }

        // Descargamos los datos "crudos" (sin ordenar ni filtrar fecha en base de datos)
        const snapshot = await query.get();

        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center; grid-column: 1/-1; padding: 40px;">
                    <i class="fas fa-folder-open" style="font-size: 3rem; color: #ccc;"></i>
                    <h3>No tienes registros</h3>
                    <p>Aún no has creado ningún checklist.</p>
                </div>`;
            allChecklists = [];
            return;
        }

        // Convertimos a array
        allChecklists = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Agregamos un campo timestamp numérico para ordenar fácil en JS
            let sortTime = 0;
            
            // Prioridad: fecha del viaje > fecha de creación
            if (data.tripInfo && data.tripInfo.fecha) {
                 // Convertir "YYYY-MM-DD" a timestamp
                 const parts = data.tripInfo.fecha.split('-');
                 if(parts.length === 3) {
                     sortTime = new Date(parts[0], parts[1]-1, parts[2]).getTime();
                     // Sumamos la hora si existe para ser más precisos
                     if(data.tripInfo.horaSalida) {
                         const timeParts = data.tripInfo.horaSalida.split(':');
                         sortTime += (parseInt(timeParts[0])*3600000) + (parseInt(timeParts[1])*60000);
                     }
                 }
            } else if (data.createdAt) {
                sortTime = data.createdAt.seconds * 1000;
            }
            
            allChecklists.push({ id: doc.id, ...data, _sortTime: sortTime });
        });

        // Una vez descargados, aplicamos filtros y orden en el navegador
        applyLocalFilters();

    } catch (error) {
        console.error("Error carga local:", error);
        container.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

// Función que filtra y ordena el array en memoria (JavaScript)
function applyLocalFilters() {
    const container = document.getElementById('checklistsContainer');
    const limitVal = parseInt(document.getElementById('limitSelect').value) || 10;
    const selMonth = document.getElementById('selectMonth').value;
    const selYear = document.getElementById('selectYear').value;

    let filteredList = [...allChecklists]; // Copia del array original

    // 1. FILTRO DE FECHA (JavaScript)
    if (selMonth && selYear) {
        const targetPrefix = `${selYear}-${selMonth}`; // Ej: "2025-11"
        
        filteredList = filteredList.filter(item => {
            if (item.tripInfo && item.tripInfo.fecha) {
                return item.tripInfo.fecha.startsWith(targetPrefix);
            }
            return false;
        });
    }

    // 2. ORDENAMIENTO (JavaScript) - Del más reciente al más antiguo
    filteredList.sort((a, b) => b._sortTime - a._sortTime);

    // 3. PAGINACIÓN / LIMITE (JavaScript)
    // Cortamos el array para mostrar solo lo que pide el usuario
    const displayList = filteredList.slice(0, limitVal);

    // 4. RENDERIZAR
    if (displayList.length === 0) {
         container.innerHTML = `
            <div style="text-align:center; grid-column: 1/-1; padding: 40px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #ccc;"></i>
                <h3>Sin resultados</h3>
                <p>No hay registros para el filtro seleccionado.</p>
            </div>`;
    } else {
        renderChecklists(displayList);
    }
}

// ==========================================
// 6. RENDERIZADO (UI)
// ==========================================
function renderChecklists(list) {
    const container = document.getElementById('checklistsContainer');
    container.innerHTML = '';

    list.forEach(item => {
        const carBrand = item.vehicleInfo?.brand || '';
        const carModel = item.vehicleInfo?.name || 'Vehículo Desconocido';
        const carPlate = item.vehicleInfo?.plates || 'Sin Placa';
        
        let displayDate = 'Fecha no registrada';
        if (item.tripInfo && item.tripInfo.fecha) {
            displayDate = formatDate(item.tripInfo.fecha); 
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
    if (!checklist) return Swal.fire('Error', 'No encontrado.', 'error');

    const photoTypeLabels = photoTypes;
    const car = `${checklist.vehicleInfo?.name || 'N/A'} (${checklist.vehicleInfo?.plates || 'N/A'})`;
    const collab = checklist.collaboratorInfo?.name || 'N/A';
    const origen = checklist.tripInfo?.origen || 'N/A';
    const destino = checklist.tripInfo?.destino || 'N/A';
    const km = checklist.tripInfo?.kmSalida || '0';
    const gasolina = checklist.tripInfo?.gasolina || 'N/A';
    const firma = checklist.signature; 

    // Fotos
    const photos = checklist.vehiclePhotos || {};
    let photoButtonsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">';
    let foundPhotoCount = 0;
    for (const key in photoTypeLabels) { 
        if (photos[key]) {
            foundPhotoCount++;
            photoButtonsHtml += `<button class="btn btn-primary" style="padding: 8px 12px; font-size: 0.9rem;" onclick="viewPhoto('${photos[key].replace(/'/g, "\\'")}')"><i class="fas fa-camera"></i> ${photoTypeLabels[key]}</button>`;
        }
    }
    photoButtonsHtml += '</div>';

    // Listas
    const getList = (key) => (checklist.checklists?.[key]?.items || []).join(', ') || 'Ninguno';
    const getObs = (key) => checklist.checklists?.[key]?.obs || 'Ninguna';

    // Firma
    let firmaHtml = firma ? 
        `<div style="text-align: center; margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px;">
            <p style="font-size: 0.85rem; color: #555; margin-bottom: 5px;">Firma de Conformidad:</p>
            <img src="${firma}" alt="Firma" style="max-height: 80px; border: 1px solid #eee; padding: 5px; border-radius: 4px; background-color: #fff;">
        </div>` : `<p style="text-align:center; color:#999; margin-top:15px;">(Sin firma)</p>`;

    // Novedades
    let incidentsHtml = '<p style="color: #777; font-size: 0.9rem;">Sin novedades.</p>';
    if (checklist.incidents?.length > 0) {
        incidentsHtml = '<div style="max-height: 100px; overflow-y: auto;">';
        checklist.incidents.forEach(inc => {
            incidentsHtml += `<div class="incident-item"><strong>${inc.type}</strong>: ${inc.desc} ($${inc.cost})</div>`;
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
                <hr style="margin: 10px 0; border-color: #eee;">
                
                <h4 style="color:#d35400; font-size:1rem;"><i class="fas fa-exclamation-circle"></i> Novedades</h4>
                ${incidentsHtml}
                
                <hr style="margin: 10px 0; border-color: #eee;">
                <h4 style="font-size:1rem;"><i class="fas fa-camera"></i> Evidencia (${foundPhotoCount})</h4>
                ${photoButtonsHtml}
                
                <hr style="margin: 10px 0; border-color: #eee;">
                <h4 style="font-size:1rem;"><i class="fas fa-list"></i> Verificación</h4>
                <div style="font-size: 0.85rem;">
                    <p><strong>Docs:</strong> ${getList('documentos')} <br> <em>${getObs('documentos')}</em></p>
                    <p><strong>Acc:</strong> ${getList('accesorios')} <br> <em>${getObs('accesorios')}</em></p>
                </div>
                ${firmaHtml}
            </div>
        `,
        width: 600,
        confirmButtonText: 'Cerrar'
    });
};

window.viewPhoto = (d) => Swal.fire({ imageUrl: d, width: '80%', showConfirmButton: false, showCloseButton: true });
function formatDate(d) { if(!d) return 'N/A'; const [y, m, da] = d.split('-'); return (y&&m&&da) ? `${da}/${m}/${y}` : d; }
function applyChecklistCustomizations() { try { if(typeof actualizarColoresPersonalizados === 'function') actualizarColoresPersonalizados(); if(typeof updateMenuStyles === 'function') setTimeout(updateMenuStyles, 100); } catch(e){} }