// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Estado de la aplicación
const appState = {
    currentUser: null,
    currentTicketId: null,
    colaboradores: [],
    clientes: [],
    tickets: [],
    allTickets: [],
    filters: {
        searchTerm: '',
        collaboratorId: ''
    },
    pagination: {
        currentPage: 1,
        ticketsPerPage: 10,
        lastVisible: null,
        firstVisible: null,
        pages: {}
    },
    unsubscribeTickets: null
};

// =================================================================================
// FUNCIONES PRINCIPALES
// =================================================================================

async function initialLoad() {
    try {
        console.log('Iniciando carga de datos...');
        await loadUserProfile();
        console.log('Perfil de usuario cargado');
        
        await loadCollaborators();
        console.log('Colaboradores cargados');
        
        setupEventListeners();
        console.log('Event listeners configurados');
        
        loadTicketsPage(1);
        console.log('Página de tickets cargada');
        
    } catch (error) {
        console.error("Error en la carga inicial:", error);
        showError('No se pudieron cargar los datos iniciales.');
    }
}

async function loadUserProfile() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../nav-visitantes/inicio-de-sesion.html';
        return;
    }
    
    try {
        const querySnapshot = await db.collection("colaboradores")
            .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email)
            .get();
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const userData = doc.data();
            appState.currentUser = {
                id: doc.id,
                nombre: userData.NOMBRE,
                area: userData.ÁREA,
                imagen: userData.imagen || '../css/img/Logo-RSI-OFICIAL.png'
            };
            sessionStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
        }
    } catch (error) {
        console.error("Error al cargar perfil:", error);
    }
}

async function loadCollaborators() {
    try {
        const snapshot = await db.collection('colaboradores').get();
        appState.colaboradores = snapshot.docs.map(doc => ({
            id: doc.id,
            nombre: doc.data().NOMBRE,
            area: doc.data().ÁREA
        }));

        // Popular el select del filtro
        const filterSelect = document.getElementById('collaboratorFilter');
        filterSelect.innerHTML = '<option value="">Todos los Colaboradores</option>';
        appState.colaboradores.forEach(col => {
            const option = document.createElement('option');
            option.value = col.id;
            option.textContent = col.nombre;
            filterSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar colaboradores:", error);
    }
}

function loadTicketsPage(pageNumber) {
    if (appState.unsubscribeTickets) {
        appState.unsubscribeTickets();
    }

    let query = db.collection('ticketsmesa').orderBy('fechaCreacion', 'desc');

    if (appState.filters.collaboratorId) {
        query = query.where('colaboradores', 'array-contains', appState.filters.collaboratorId);
    }
    
    query.get().then(snapshot => {
        const totalFilteredTickets = snapshot.size;
        setupPagination(totalFilteredTickets);

        let pageQuery = query;
        if (pageNumber > 1 && appState.pagination.pages[pageNumber - 1]) {
            pageQuery = pageQuery.startAfter(appState.pagination.pages[pageNumber - 1]);
        }
        pageQuery = pageQuery.limit(appState.pagination.ticketsPerPage);

        appState.unsubscribeTickets = pageQuery.onSnapshot(pageSnapshot => {
            if (pageSnapshot.empty && pageNumber > 1) {
                return;
            }

            appState.allTickets = pageSnapshot.docs.map(doc => {
                const ticket = { id: doc.id, ...doc.data() };
                
                // Procesar nombres de colaboradores
                if (ticket.colaboradores && ticket.colaboradores.length > 0) {
                    ticket.nombresColaboradores = ticket.colaboradores.map(colabId => {
                        const colaborador = appState.colaboradores.find(c => c.id === colabId);
                        return colaborador ? colaborador.nombre : 'Desconocido';
                    }).filter(Boolean).join(', ');
                } else {
                    ticket.nombresColaboradores = 'Sin asignar';
                }
                
                return ticket;
            });

            appState.pagination.firstVisible = pageSnapshot.docs[0];
            appState.pagination.lastVisible = pageSnapshot.docs[pageSnapshot.docs.length - 1];
            appState.pagination.pages[pageNumber] = appState.pagination.lastVisible;
            appState.pagination.currentPage = pageNumber;

            applySearchAndDisplay();
            
        }, error => {
            console.error("Error al cargar tickets:", error);
            showError('No se pudieron cargar los tickets.');
        });
    }).catch(error => {
        console.error("Error en consulta de tickets:", error);
        showError('Error al consultar la base de datos.');
    });
}

function applySearchAndDisplay() {
    const searchTerm = appState.filters.searchTerm.toLowerCase().trim();
    
    let ticketsToDisplay = appState.allTickets;
    
    if (searchTerm) {
        ticketsToDisplay = appState.allTickets.filter(ticket => {
            const searchableString = [
                ticket.idTicket || ticket.id,
                ticket.nombresColaboradores,
                ticket.titulo,
                ticket.estado,
                ticket.prioridad,
                ticket.area,
                ticket.levantadoPor,
                formatDate(ticket.fechaCreacion),
                ticket.cuentaNombre,
                ticket.proyecto,
                ticket.servicio,
                ticket.ordenServicio
            ].join(' ').toLowerCase();
            
            return searchableString.includes(searchTerm);
        });
    }

    displayTickets(ticketsToDisplay);
}

function displayTickets(tickets) {
    const tbody = document.getElementById('ticketsTableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    
    tbody.innerHTML = '';
    mobileContainer.innerHTML = '';
    
    if (!tickets || tickets.length === 0) {
        const emptyMessage = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No hay tickets para mostrar</h3>
                    <p>${appState.filters.searchTerm || appState.filters.collaboratorId ? 
                        'Intenta ajustar los filtros de búsqueda' : 
                        'No se encontraron tickets en el sistema'}</p>
                </td>
            </tr>
        `;
        tbody.innerHTML = emptyMessage;
        mobileContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No hay tickets para mostrar</h3>
                <p>${appState.filters.searchTerm || appState.filters.collaboratorId ? 
                    'Intenta ajustar los filtros de búsqueda' : 
                    'No se encontraron tickets en el sistema'}</p>
            </div>
        `;
        return;
    }

    // Mostrar tabla para escritorio
    const rowsHtml = tickets.map(ticket => {
        return `
            <tr>
                <td><strong>${ticket.idTicket || ticket.id || 'N/A'}</strong></td>
                <td>${ticket.nombresColaboradores || 'Sin asignar'}</td>
                <td><strong>${ticket.titulo || 'Sin título'}</strong></td>
                <td><span class="badge badge-${getBadgeClass(ticket.estado)}">${formatStatus(ticket.estado)}</span></td>
                <td>${ticket.prioridad ? ticket.prioridad.charAt(0).toUpperCase() + ticket.prioridad.slice(1) : 'N/A'}</td>
                <td>${ticket.area || 'N/A'}</td>
                <td>${ticket.levantadoPor || 'Rsi'}</td>
                <td>${formatDate(ticket.fechaCreacion)}</td>
                <td>
                    <button class="action-btn" onclick="viewTicket('${ticket.id}')" title="Ver Detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn" onclick="editTicket('${ticket.id}')" title="Editar Ticket">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" onclick="generatePdfPage('${ticket.id}')" title="Generar PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteTicket('${ticket.id}')" title="Mover a Papelera">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // Mostrar tarjetas para móvil
    const cardsHtml = tickets.map(ticket => {
        return `
            <div class="ticket-card">
                <div class="card-row">
                    <span class="card-label">ID del Ticket:</span>
                    <span class="card-value"><strong>${ticket.idTicket || ticket.id || 'N/A'}</strong></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Colaboradores:</span>
                    <span class="card-value">${ticket.nombresColaboradores || 'Sin asignar'}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Título:</span>
                    <span class="card-value"><strong>${ticket.titulo || 'Sin título'}</strong></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Estado:</span>
                    <span class="card-value"><span class="badge badge-${getBadgeClass(ticket.estado)}">${formatStatus(ticket.estado)}</span></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Prioridad:</span>
                    <span class="card-value">${ticket.prioridad ? ticket.prioridad.charAt(0).toUpperCase() + ticket.prioridad.slice(1) : 'N/A'}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Área:</span>
                    <span class="card-value">${ticket.area || 'N/A'}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Levantado por:</span>
                    <span class="card-value">${ticket.levantadoPor || 'N/A'}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Fecha:</span>
                    <span class="card-value">${formatDate(ticket.fechaCreacion)}</span>
                </div>
                <div class="card-actions">
                    <button class="action-btn" onclick="viewTicket('${ticket.id}')" title="Ver Detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn" onclick="editTicket('${ticket.id}')" title="Editar Ticket">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" onclick="generatePdfPage('${ticket.id}')" title="Generar PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteTicket('${ticket.id}')" title="Mover a Papelera">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    mobileContainer.innerHTML = cardsHtml;
}

function setupPagination(totalTickets) {
    const paginationContainer = document.querySelector('.pagination-container');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(totalTickets / appState.pagination.ticketsPerPage);
    
    if (totalPages <= 1) {
        return;
    }

    const { currentPage } = appState.pagination;
    
    // Botón Anterior
    const prevButton = createPaginationButton(
        '<i class="fas fa-chevron-left"></i>', 
        'prev', 
        currentPage === 1, 
        () => loadTicketsPage(currentPage - 1)
    );
    paginationContainer.appendChild(prevButton);

    // Números de página
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createPaginationButton(
            i, 
            i === currentPage ? 'active' : '', 
            false, 
            () => loadTicketsPage(i)
        );
        paginationContainer.appendChild(pageButton);
    }
    
    // Botón Siguiente
    const nextButton = createPaginationButton(
        '<i class="fas fa-chevron-right"></i>', 
        'next', 
        currentPage >= totalPages, 
        () => loadTicketsPage(currentPage + 1)
    );
    paginationContainer.appendChild(nextButton);
}

function createPaginationButton(text, type, disabled, onClick) {
    const button = document.createElement('button');
    button.className = `pagination-btn ${type}`;
    button.innerHTML = text;
    button.disabled = disabled;
    button.addEventListener('click', onClick);
    return button;
}

// Funciones auxiliares
const getBadgeClass = (status) => {
    const statusMap = {
        'finalizado': 'success',
        'en_proceso': 'warning', 
        'pendiente': 'danger',
        'cancelado': 'secondary'
    };
    return statusMap[status] || 'secondary';
};

const formatStatus = (status) => {
    if (!status) return 'N/A';
    return status.replace('_', ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
};

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('es-MX');
        }
        return new Date(timestamp).toLocaleDateString('es-MX');
    } catch (error) {
        return 'Fecha inválida';
    }
};

// =================================================================================
// FUNCIONES DE ACCIÓN
// =================================================================================

async function viewTicket(ticketId) {
    try {
        window.location.href = `../verTicket/verTicket.html?id=${ticketId}`;
    } catch (error) {
        console.error('Error al ver ticket:', error);
        showError('No se pudo cargar el ticket.');
    }
}

async function editTicket(ticketId) {
    try {
        window.location.href = `../editar-ticket/editar-ticket.html?id=${ticketId}`;
    } catch (error) {
        console.error('Error al editar ticket:', error);
        showError('No se pudo cargar el ticket para editar.');
    }
}

// NUEVA FUNCIÓN: Redirigir a generar-pdf.html
async function generatePdfPage(ticketId) {
    try {
        window.location.href = `../generar-pdf/generar-pdf.html?id=${ticketId}`;
    } catch (error) {
        console.error('Error al redirigir a generar PDF:', error);
        showError('No se pudo cargar la página de generación de PDF.');
    }
}

async function deleteTicket(ticketId) {
    try {
        const result = await Swal.fire({
            title: '¿Mover a la papelera?',
            text: "Esta acción moverá el ticket a la papelera. Podrás restaurarlo más tarde.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, mover a papelera',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6C43E0',
            cancelButtonColor: '#dc3545'
        });

        if (result.isConfirmed) {
            const ticketRef = db.collection('ticketsmesa').doc(ticketId);
            const ticketDoc = await ticketRef.get();
            
            if (ticketDoc.exists) {
                const ticketData = ticketDoc.data();
                
                // Mover a papelera
                await db.collection('ticketsmesaPapelera').doc(ticketId).set({
                    ...ticketData,
                    fechaEliminacion: firebase.firestore.FieldValue.serverTimestamp(),
                    eliminadoPor: appState.currentUser ? appState.currentUser.nombre : 'Sistema'
                });
                
                // Eliminar de tickets activos
                await ticketRef.delete();
                
                Swal.fire({
                    title: '¡Movido!',
                    text: 'El ticket ha sido movido a la papelera.',
                    icon: 'success',
                    confirmButtonColor: '#6C43E0'
                });
                
                // Recargar la página actual
                loadTicketsPage(appState.pagination.currentPage);
            } else {
                showError('El ticket no existe.');
            }
        }
    } catch (error) {
        console.error('Error al eliminar ticket:', error);
        showError('No se pudo mover el ticket a la papelera.');
    }
}

// =================================================================================
// CONFIGURACIÓN DE EVENTOS
// =================================================================================

function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Evento de búsqueda - con verificación de existencia
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            appState.filters.searchTerm = e.target.value;
            applySearchAndDisplay();
        });
        console.log('Event listener de búsqueda configurado');
    } else {
        console.warn('searchInput no encontrado');
    }

    // Evento de filtro por colaborador - con verificación de existencia
    const collaboratorFilter = document.getElementById('collaboratorFilter');
    if (collaboratorFilter) {
        collaboratorFilter.addEventListener('change', (e) => {
            appState.filters.collaboratorId = e.target.value;
            loadTicketsPage(1);
        });
        console.log('Event listener de filtro por colaborador configurado');
    } else {
        console.warn('collaboratorFilter no encontrado');
    }

    console.log('Todos los event listeners configurados correctamente');
}

// Función para abrir papelera
function openTrash() {
    window.location.href = '../papelera/papelera.html';
}

// Función para mostrar errores
function showError(message) {
    Swal.fire({
        title: 'Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#6C43E0'
    });
}

// =================================================================================
// INICIALIZACIÓN
// =================================================================================
document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('Usuario autenticado:', user.email);
            initialLoad();
        } else {
            console.log('No hay usuario autenticado, redirigiendo...');
            window.location.href = '../nav-visitantes/inicio-de-sesion.html';
        }
    });
});