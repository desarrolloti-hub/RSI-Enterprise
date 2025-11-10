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

     // Estado de la aplicación
        const appState = {
            checklists: [],
            currentChecklist: null,
            isEditing: false
        };

        // Elementos DOM
        const checklistsContainer = document.getElementById('checklistsContainer');
        const modalOverlay = document.getElementById('modalOverlay');
        const modalTitle = document.getElementById('modalTitle');
        const checklistForm = document.getElementById('checklistForm');
        const btnCreateChecklist = document.getElementById('btnCreateChecklist');
        const btnViewAll = document.getElementById('btnViewAll');
        const modalClose = document.getElementById('modalClose');
        const btnCancel = document.getElementById('btnCancel');
        const btnSave = document.getElementById('btnSave');

        // Inicializar la aplicación
        function init() {
            loadChecklists();
            setupEventListeners();
        }

        // Configurar event listeners
        function setupEventListeners() {
            btnCreateChecklist.addEventListener('click', () => {
                window.location.href = './crear-checklist.html';
                });
            btnViewAll.addEventListener('click', loadChecklists);
            modalClose.addEventListener('click', closeModal);
            btnCancel.addEventListener('click', closeModal);
            btnSave.addEventListener('click', saveChecklist);
            
            // Cerrar modal al hacer clic fuera
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    closeModal();
                }
            });
        }

        // Cargar todos los checklists
        function loadChecklists() {
            showLoading();
            
            // Simulación de carga desde Firebase
            setTimeout(() => {
                // Datos de ejemplo
                appState.checklists = [
                    {
                        id: '1',
                        vehicleModel: 'Toyota Corolla 2022',
                        vehiclePlate: 'ABC-123',
                        date: '2023-10-15',
                        status: 'completed',
                        completedItems: 5,
                        totalItems: 5,
                        notes: 'Vehículo en buen estado general'
                    },
                    {
                        id: '2',
                        vehicleModel: 'Honda Civic 2021',
                        vehiclePlate: 'XYZ-789',
                        date: '2023-10-16',
                        status: 'in-progress',
                        completedItems: 3,
                        totalItems: 5,
                        notes: 'Falta revisar frenos'
                    },
                    {
                        id: '3',
                        vehicleModel: 'Nissan Sentra 2020',
                        vehiclePlate: 'DEF-456',
                        date: '2023-10-17',
                        status: 'pending',
                        completedItems: 0,
                        totalItems: 5,
                        notes: 'Revisión pendiente'
                    }
                ];
                
                renderChecklists();
            }, 1000);
        }

        // Mostrar estado de carga
        function showLoading() {
            checklistsContainer.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                </div>
            `;
        }

        // Renderizar checklists en la interfaz
        function renderChecklists() {
            if (appState.checklists.length === 0) {
                checklistsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-car"></i>
                        <h3>No hay checklists disponibles</h3>
                        <p>Crea tu primer checklist para comenzar</p>
                        <button class="btn btn-primary" id="btnCreateFirst">
                            <i class="fas fa-plus-circle"></i> Crear Primer Checklist
                        </button>
                    </div>
                `;
                
                document.getElementById('btnCreateFirst').addEventListener('click', openCreateModal);
                return;
            }
            
            let html = '';
            
            appState.checklists.forEach(checklist => {
                const statusClass = `status-${checklist.status}`;
                const statusText = getStatusText(checklist.status);
                const progress = Math.round((checklist.completedItems / checklist.totalItems) * 100);
                
                html += `
                    <div class="checklist-card" data-id="${checklist.id}">
                        <div class="checklist-header">
                            <div>
                                <h3 class="checklist-title">${checklist.vehicleModel}</h3>
                                <p class="checklist-date">${formatDate(checklist.date)}</p>
                            </div>
                            <span class="checklist-status ${statusClass}">${statusText}</span>
                        </div>
                        
                        <div class="checklist-details">
                            <p><strong>Placa:</strong> ${checklist.vehiclePlate}</p>
                            <p><strong>Progreso:</strong> ${progress}% (${checklist.completedItems}/${checklist.totalItems} items)</p>
                            ${checklist.notes ? `<p><strong>Observaciones:</strong> ${checklist.notes}</p>` : ''}
                        </div>
                        
                        <div class="checklist-actions">
                            <button class="btn btn-primary btn-small btn-edit" data-id="${checklist.id}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-secondary btn-small btn-view" data-id="${checklist.id}">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn btn-small btn-delete" data-id="${checklist.id}" style="background: rgba(220, 53, 69, 0.1); color: #dc3545;">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
            });
            
            checklistsContainer.innerHTML = html;
            
            // Agregar event listeners a los botones de cada card
            document.querySelectorAll('.btn-edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    openEditModal(id);
                });
            });
            
            document.querySelectorAll('.btn-view').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    viewChecklist(id);
                });
            });
            
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    deleteChecklist(id);
                });
            });
        }

        // Eliminar todos los modales excepto el de ver
function viewChecklist(id) {
    const checklist = appState.checklists.find(c => c.id === id);
    if (!checklist) {
        console.error('Checklist no encontrado');
        return;
    }

    Swal.fire({
        title: `Detalles del Checklist: ${checklist.vehicleModel}`,
        html: `
            <div>
                <p><strong>Modelo:</strong> ${checklist.vehicleModel}</p>
                <p><strong>Placa:</strong> ${checklist.vehiclePlate}</p>
                <p><strong>Fecha:</strong> ${checklist.date}</p>
                <p><strong>Estado:</strong> ${checklist.status}</p>
                <p><strong>Notas:</strong> ${checklist.notes || 'Sin notas'}</p>
            </div>
        `,
        confirmButtonText: 'Cerrar'
    });
}

// Remover referencias a otros modales
async function openCreateModal() {
  const flowContainer = document.getElementById('createChecklistFlow');
  flowContainer.style.display = 'block';
  flowContainer.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

  // Obtener autos y colaboradores desde Firestore
  const [autosSnap, colabsSnap] = await Promise.all([
    db.collection("automoviles").get(),
    db.collection("colaboradores").get()
  ]);

  const autos = autosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const colabs = colabsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Estado temporal del checklist
  const tempChecklist = {
    auto: null,
    conductor: null,
    fecha: new Date().toISOString().split('T')[0],
    horaSalida: "",
    documentos: "",
    items: [],
    notas: ""
  };

  // Pasos del flujo
  flowContainer.innerHTML = `
    <div class="flow-step step-1 active">
      <h2>🚗 Selecciona el vehículo</h2>
      <select id="selectAuto" class="form-select" required>
        <option value="">-- Selecciona un auto --</option>
        ${autos.map(a => `<option value="${a.id}">${a.marca} ${a.modelo} (${a.placa})</option>`).join('')}
      </select>
      <div class="flow-buttons">
        <button class="btn btn-primary" id="nextToConductor">Siguiente</button>
      </div>
    </div>

    <div class="flow-step step-2">
      <h2>👤 ¿Quién manejará el vehículo?</h2>
      <select id="selectConductor" class="form-select" required>
        <option value="">-- Selecciona un colaborador --</option>
        ${colabs.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
      </select>
      <div class="flow-buttons">
        <button class="btn btn-secondary" id="backToAuto">Atrás</button>
        <button class="btn btn-primary" id="nextToHora">Siguiente</button>
      </div>
    </div>

    <div class="flow-step step-3">
      <h2>📅 Fecha y hora de salida</h2>
      <p>Fecha: <strong>${tempChecklist.fecha}</strong></p>
      <input type="time" id="horaSalida" class="form-control" required>
      <div class="flow-buttons">
        <button class="btn btn-secondary" id="backToConductor">Atrás</button>
        <button class="btn btn-primary" id="nextToDocs">Siguiente</button>
      </div>
    </div>

    <div class="flow-step step-4">
      <h2>📄 Documentos y póliza</h2>
      <p id="docsInfo">Selecciona un vehículo para ver su póliza.</p>
      <div class="flow-buttons">
        <button class="btn btn-secondary" id="backToHora">Atrás</button>
        <button class="btn btn-primary" id="nextToChecklist">Siguiente</button>
      </div>
    </div>

    <div class="flow-step step-5">
      <h2>✅ Items del checklist</h2>
      <div id="checklistItemsContainer"></div>
      <textarea id="notas" class="form-control" placeholder="Observaciones..."></textarea>
      <div class="flow-buttons">
        <button class="btn btn-secondary" id="backToDocs">Atrás</button>
        <button class="btn btn-primary" id="btnGuardarChecklist">Guardar Checklist</button>
      </div>
    </div>
  `;

  // Funciones de navegación
  const showStep = (n) => {
    document.querySelectorAll('.flow-step').forEach(step => step.classList.remove('active'));
    document.querySelector(`.step-${n}`).classList.add('active');
  };

  // Navegación de pasos
  document.getElementById('nextToConductor').onclick = () => {
    const id = document.getElementById('selectAuto').value;
    if (!id) return Swal.fire('Selecciona un vehículo primero');
    tempChecklist.auto = autos.find(a => a.id === id);
    showStep(2);
  };

  document.getElementById('backToAuto').onclick = () => showStep(1);
  document.getElementById('nextToHora').onclick = () => {
    const id = document.getElementById('selectConductor').value;
    if (!id) return Swal.fire('Selecciona un conductor');
    tempChecklist.conductor = colabs.find(c => c.id === id);
    showStep(3);
  };

  document.getElementById('backToConductor').onclick = () => showStep(2);
  document.getElementById('nextToDocs').onclick = () => {
    tempChecklist.horaSalida = document.getElementById('horaSalida').value;
    if (!tempChecklist.horaSalida) return Swal.fire('Indica la hora de salida');
    document.getElementById('docsInfo').innerHTML = `
      <p><strong>Póliza:</strong> ${tempChecklist.auto.poliza || 'No registrada'}</p>
      <p><strong>Vigencia:</strong> ${tempChecklist.auto.vigencia || 'N/A'}</p>
    `;
    showStep(4);
  };

  document.getElementById('backToHora').onclick = () => showStep(3);
  document.getElementById('nextToChecklist').onclick = () => {
    // Renderizar items del checklist (puedes reemplazar con dinámicos según el auto)
    document.getElementById('checklistItemsContainer').innerHTML = `
      <label><input type="checkbox" value="luces"> Luces</label>
      <label><input type="checkbox" value="aceite"> Nivel de aceite</label>
      <label><input type="checkbox" value="llantas"> Presión de neumáticos</label>
      <label><input type="checkbox" value="frenos"> Frenos</label>
    `;
    showStep(5);
  };

  document.getElementById('backToDocs').onclick = () => showStep(4);

  // Guardar checklist
  document.getElementById('btnGuardarChecklist').onclick = async () => {
    const items = Array.from(document.querySelectorAll('#checklistItemsContainer input:checked')).map(i => i.value);
    tempChecklist.items = items;
    tempChecklist.notas = document.getElementById('notas').value;

    await db.collection("checklist-automoviles").add(tempChecklist);
    Swal.fire("✅ Checklist guardado", "", "success");
    flowContainer.style.display = 'none';
    loadChecklists();
  };
}


function openEditModal(id) {
    console.warn('Función deshabilitada: Editar modal no está disponible.');
}

function closeModal() {
    console.warn('Función deshabilitada: Cerrar modal no está disponible.');
}

        // Funciones auxiliares
        function getStatusText(status) {
            const statusMap = {
                'pending': 'Pendiente',
                'in-progress': 'En Progreso',
                'completed': 'Completado'
            };
            return statusMap[status] || status;
        }

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

document.addEventListener('DOMContentLoaded', () => {
    applyChecklistCustomizations();
});

        // Inicializar cuando el DOM esté listo
        document.addEventListener('DOMContentLoaded', init);