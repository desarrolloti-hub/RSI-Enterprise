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
    colaboradores: [],
    allTickets: [],
    filteredTickets: [],
    isSearchActive: false,
    filters: {
        searchTerm: '',
        collaboratorId: '',
        dateFilter: {
            day: '',
            month: '',
            year: ''
        }
    },
    pagination: {
        currentPage: 1,
        ticketsPerPage: 10,
        totalTickets: 0,
        lastDoc: null,
        firstDoc: null,
        pages: {}
    },
    searchTimeout: null
};

// =================================================================================
// FUNCIONES PRINCIPALES
// =================================================================================

async function initialLoad() {
    try {
        console.log('Iniciando carga de datos...');
        await loadUserProfile();
        await loadCollaborators();
        initializeDateFilters(); // Inicializar filtros de fecha
        setupEventListeners();
        await loadTotalTickets();
        await loadTicketsPage(1);
    } catch (error) {
        console.error("Error en la carga inicial:", error);
        showError('No se pudieron cargar los datos iniciales.');
    }
}

// NUEVA FUNCIÓN: Inicializar filtros de fecha (AÑOS DINÁMICOS)
function initializeDateFilters() {
    const dayFilter = document.getElementById('dayFilter');
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    if (!dayFilter || !monthFilter || !yearFilter) return;
    
    // Limpiar opciones existentes
    dayFilter.innerHTML = '<option value="">Todos los días</option>';
    monthFilter.innerHTML = '<option value="">Todos los meses</option>';
    yearFilter.innerHTML = '<option value="">Todos los años</option>';
    
    // Llenar días (1-31)
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i.toString().padStart(2, '0');
        option.textContent = i;
        dayFilter.appendChild(option);
    }
    
    // Llenar meses
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = (index + 1).toString().padStart(2, '0');
        option.textContent = month;
        monthFilter.appendChild(option);
    });
    
    // ***** AÑOS: desde 2025 hasta año actual *****
    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    
    for (let i = currentYear; i >= startYear; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearFilter.appendChild(option);
    }
    // ********************************************
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
        })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

        const filterSelect = document.getElementById('collaboratorFilter');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Todos los Colaboradores</option>';
            appState.colaboradores.forEach(col => {
                const option = document.createElement('option');
                option.value = col.id;
                option.textContent = col.nombre;
                filterSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error al cargar colaboradores:", error);
    }
}

async function loadTotalTickets() {
    try {
        let query = db.collection('ticketsmesa');
        if (appState.filters.collaboratorId) {
            query = query.where('colaboradores', 'array-contains', appState.filters.collaboratorId);
        }
        const snapshot = await query.get();
        appState.pagination.totalTickets = snapshot.size;
    } catch (error) {
        console.error("Error al cargar total:", error);
    }
}

async function loadAllTicketsForSearch() {
    try {
        let query = db.collection('ticketsmesa').orderBy('fechaCreacion', 'desc');
        
        if (appState.filters.collaboratorId) {
            query = db.collection('ticketsmesa')
                .where('colaboradores', 'array-contains', appState.filters.collaboratorId)
                .orderBy('fechaCreacion', 'desc');
        }
        
        const snapshot = await query.get();
        
        const tickets = [];
        for (const doc of snapshot.docs) {
            const ticket = { id: doc.id, ...doc.data() };
            
            if (ticket.colaboradores && ticket.colaboradores.length > 0) {
                const nombres = ticket.colaboradores.map(colabId => {
                    const colab = appState.colaboradores.find(c => c.id === colabId);
                    return colab ? colab.nombre : 'Desconocido';
                }).filter(Boolean);
                ticket.nombresColaboradores = nombres.join(', ') || 'Sin asignar';
            } else {
                ticket.nombresColaboradores = 'Sin asignar';
            }
            
            tickets.push(ticket);
        }
        
        appState.allTickets = tickets;
        return tickets;
    } catch (error) {
        console.error("Error al cargar tickets para búsqueda:", error);
        return [];
    }
}

async function loadTicketsPage(pageNumber) {
    try {
        showLoading();

        let query = db.collection('ticketsmesa')
            .orderBy('fechaCreacion', 'desc')
            .limit(appState.pagination.ticketsPerPage);

        if (appState.filters.collaboratorId) {
            query = db.collection('ticketsmesa')
                .where('colaboradores', 'array-contains', appState.filters.collaboratorId)
                .orderBy('fechaCreacion', 'desc')
                .limit(appState.pagination.ticketsPerPage);
        }

        if (pageNumber === 1) {
            appState.pagination.lastDoc = null;
        } else if (appState.pagination.pages[pageNumber - 1]) {
            query = query.startAfter(appState.pagination.pages[pageNumber - 1]);
        }

        const snapshot = await query.get();
        
        if (snapshot.empty && pageNumber > 1) {
            await loadTicketsPage(1);
            return;
        }

        if (!snapshot.empty) {
            appState.pagination.lastDoc = snapshot.docs[snapshot.docs.length - 1];
            appState.pagination.pages[pageNumber] = appState.pagination.lastDoc;
        }

        const tickets = [];
        for (const doc of snapshot.docs) {
            const ticket = { id: doc.id, ...doc.data() };
            
            if (ticket.colaboradores && ticket.colaboradores.length > 0) {
                const nombres = ticket.colaboradores.map(colabId => {
                    const colab = appState.colaboradores.find(c => c.id === colabId);
                    return colab ? colab.nombre : 'Desconocido';
                }).filter(Boolean);
                ticket.nombresColaboradores = nombres.join(', ') || 'Sin asignar';
            } else {
                ticket.nombresColaboradores = 'Sin asignar';
            }
            
            tickets.push(ticket);
        }

        appState.pagination.currentPage = pageNumber;
        appState.isSearchActive = false;
        displayTickets(tickets);
        updatePagination();

    } catch (error) {
        console.error("Error al cargar tickets:", error);
        showError('Error al cargar los tickets');
    }
}

async function searchTickets(searchTerm) {
    updateDateFiltersFromInputs();
    
    const hasDateFilters = hasActiveDateFilters();
    
    if (!searchTerm.trim() && !hasDateFilters) {
        appState.isSearchActive = false;
        appState.filters.searchTerm = '';
        await loadTotalTickets();
        await loadTicketsPage(1);
        hideSearchResults();
        return;
    }

    try {
        showLoading();
        
        if (appState.allTickets.length === 0) {
            await loadAllTicketsForSearch();
        }
        
        const searchLower = searchTerm.toLowerCase().trim();
        
        const filtered = appState.allTickets.filter(ticket => {
            if (!passesDateFilters(ticket)) {
                return false;
            }
            
            if (searchTerm.trim()) {
                const fechaStr = formatDateForSearch(ticket.fechaCreacion);
                
                const searchableText = [
                    ticket.idTicket || '',
                    ticket.nombresColaboradores || '',
                    ticket.titulo || '',
                    ticket.estado || '',
                    ticket.prioridad || '',
                    ticket.area || '',
                    ticket.levantadoPor || '',
                    fechaStr,
                    ticket.cuentaNombre || '',
                    ticket.proyecto || '',
                    ticket.servicio || '',
                    ticket.ordenServicio || ''
                ].join(' ').toLowerCase();
                
                return searchableText.includes(searchLower);
            }
            
            return true;
        });

        appState.filteredTickets = filtered;
        appState.isSearchActive = true;
        appState.filters.searchTerm = searchTerm;
        
        displayTickets(filtered);
        
        let filterMessage = '';
        if (hasDateFilters && searchTerm.trim()) {
            filterMessage = `Filtros: "${searchTerm}" + fecha`;
        } else if (hasDateFilters) {
            filterMessage = 'Filtros de fecha aplicados';
        } else {
            filterMessage = `Búsqueda: "${searchTerm}"`;
        }
        
        showSearchResults(filtered.length, filterMessage);
        
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
        
        const recordInfo = document.getElementById('recordInfo');
        if (recordInfo) {
            recordInfo.style.display = 'none';
        }

    } catch (error) {
        console.error("Error en búsqueda:", error);
        showError('Error en la búsqueda');
    }
}

function hasActiveDateFilters() {
    const { day, month, year } = appState.filters.dateFilter;
    return day !== '' || month !== '' || year !== '';
}

function updateDateFiltersFromInputs() {
    const dayFilter = document.getElementById('dayFilter');
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    appState.filters.dateFilter = {
        day: dayFilter ? dayFilter.value : '',
        month: monthFilter ? monthFilter.value : '',
        year: yearFilter ? yearFilter.value : ''
    };
}

function passesDateFilters(ticket) {
    const { day, month, year } = appState.filters.dateFilter;
    
    if (!day && !month && !year) {
        return true;
    }
    
    try {
        const fecha = ticket.fechaCreacion;
        if (!fecha) return false;
        
        const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
        if (isNaN(date.getTime())) return false;
        
        const ticketDay = date.getDate().toString().padStart(2, '0');
        const ticketMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        const ticketYear = date.getFullYear().toString();
        
        if (day && ticketDay !== day) return false;
        if (month && ticketMonth !== month) return false;
        if (year && ticketYear !== year) return false;
        
        return true;
    } catch (error) {
        console.error("Error al filtrar por fecha:", error);
        return false;
    }
}

function clearDateFilters() {
    const dayFilter = document.getElementById('dayFilter');
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    if (dayFilter) dayFilter.value = '';
    if (monthFilter) monthFilter.value = '';
    if (yearFilter) yearFilter.value = '';
    
    appState.filters.dateFilter = { day: '', month: '', year: '' };
    
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value : '';
    
    if (searchTerm.trim()) {
        searchTickets(searchTerm);
    } else {
        clearSearch();
    }
}

function formatDateForSearch(timestamp) {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const monthName = date.toLocaleString('es', { month: 'long' });
        const dayName = date.toLocaleString('es', { weekday: 'long' });
        
        return `${day} ${month} ${year} ${day}/${month} ${day}/${month}/${year} ${monthName} ${dayName}`;
    } catch {
        return '';
    }
}

function showLoading() {
    const tbody = document.getElementById('ticketsTableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    
    const loadingHtml = `
        <tr>
            <td colspan="9" class="empty-state">
                <i class="fas fa-spinner fa-spin fa-3x"></i>
                <h3>Cargando tickets...</h3>
            </td>
        </tr>
    `;
    
    if (tbody) tbody.innerHTML = loadingHtml;
    if (mobileContainer) {
        mobileContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin fa-3x"></i>
                <h3>Cargando tickets...</h3>
            </div>
        `;
    }
}

function displayTickets(tickets) {
    const tbody = document.getElementById('ticketsTableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    
    if (!tbody || !mobileContainer) return;
    
    tbody.innerHTML = '';
    mobileContainer.innerHTML = '';
    
    if (!tickets || tickets.length === 0) {
        const emptyHtml = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-inbox fa-3x"></i>
                    <h3>No hay tickets para mostrar</h3>
                    <p>${getEmptyMessage()}</p>
                </td>
            </tr>
        `;
        tbody.innerHTML = emptyHtml;
        mobileContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox fa-3x"></i>
                <h3>No hay tickets para mostrar</h3>
                <p>${getEmptyMessage()}</p>
            </div>
        `;
        return;
    }

    tbody.innerHTML = tickets.map(ticket => `
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
    `).join('');

    mobileContainer.innerHTML = tickets.map(ticket => `
        <div class="ticket-card">
            <div class="card-header"><strong>${ticket.idTicket || ticket.id || 'N/A'}</strong></div>
            <div class="card-body">
                <div><span class="card-label">Colaboradores:</span> ${ticket.nombresColaboradores || 'Sin asignar'}</div>
                <div><span class="card-label">Título:</span> <strong>${ticket.titulo || 'Sin título'}</strong></div>
                <div><span class="card-label">Estado:</span> <span class="badge badge-${getBadgeClass(ticket.estado)}">${formatStatus(ticket.estado)}</span></div>
                <div><span class="card-label">Prioridad:</span> ${ticket.prioridad ? ticket.prioridad.charAt(0).toUpperCase() + ticket.prioridad.slice(1) : 'N/A'}</div>
                <div><span class="card-label">Área:</span> ${ticket.area || 'N/A'}</div>
                <div><span class="card-label">Levantado por:</span> ${ticket.levantadoPor || 'N/A'}</div>
                <div><span class="card-label">Fecha:</span> ${formatDate(ticket.fechaCreacion)}</div>
            </div>
            <div class="card-actions">
                <button class="action-btn" onclick="viewTicket('${ticket.id}')"><i class="fas fa-eye"></i></button>
                <button class="action-btn" onclick="editTicket('${ticket.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn" onclick="generatePdfPage('${ticket.id}')"><i class="fas fa-file-pdf"></i></button>
                <button class="action-btn delete" onclick="deleteTicket('${ticket.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function getEmptyMessage() {
    if (appState.isSearchActive) {
        if (hasActiveDateFilters()) {
            return 'No hay tickets que coincidan con los filtros de fecha seleccionados';
        }
        return 'Intenta con otra búsqueda';
    }
    return 'No se encontraron tickets';
}

function updatePagination() {
    const paginationContainer = document.querySelector('.pagination-container');
    if (!paginationContainer || appState.isSearchActive) return;

    const { currentPage, ticketsPerPage, totalTickets } = appState.pagination;
    const totalPages = Math.ceil(totalTickets / ticketsPerPage);

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    paginationContainer.innerHTML = `
        <button class="pagination-btn prev" 
            ${currentPage === 1 ? 'disabled' : ''} 
            onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i> Anterior
        </button>
        <span class="pagination-info">
            Página ${currentPage} de ${totalPages}
        </span>
        <button class="pagination-btn next" 
            ${currentPage === totalPages ? 'disabled' : ''} 
            onclick="changePage(${currentPage + 1})">
            Siguiente <i class="fas fa-chevron-right"></i>
        </button>
    `;

    updateRecordInfo();
}

function updateRecordInfo() {
    const { currentPage, ticketsPerPage, totalTickets } = appState.pagination;
    const start = ((currentPage - 1) * ticketsPerPage) + 1;
    const end = Math.min(currentPage * ticketsPerPage, totalTickets);
    
    let infoElement = document.getElementById('recordInfo');
    if (!infoElement) {
        infoElement = document.createElement('div');
        infoElement.id = 'recordInfo';
        infoElement.className = 'record-info';
        infoElement.style.textAlign = 'center';
        infoElement.style.margin = '10px 0';
        infoElement.style.color = '#666';
        
        const container = document.querySelector('.pagination-container');
        if (container) {
            container.parentNode.insertBefore(infoElement, container.nextSibling);
        }
    }
    
    if (!appState.isSearchActive) {
        infoElement.style.display = 'block';
        infoElement.innerHTML = `Mostrando ${start} - ${end} de ${totalTickets} tickets`;
    } else {
        infoElement.style.display = 'none';
    }
}

function showSearchResults(count, message) {
    let resultsDiv = document.getElementById('searchResults');
    if (!resultsDiv) {
        resultsDiv = document.createElement('div');
        resultsDiv.id = 'searchResults';
        resultsDiv.className = 'search-results-info'; // <-- Usa la clase existente
        resultsDiv.style.margin = '10px 0';
        resultsDiv.style.padding = '10px 15px';
        resultsDiv.style.borderRadius = '5px';
        resultsDiv.style.display = 'flex';
        resultsDiv.style.justifyContent = 'space-between';
        resultsDiv.style.alignItems = 'center';
        
        // El color lo tomará automáticamente del sistema
        resultsDiv.style.backgroundColor = 'var(--color-primario)'; // o la variable que uses
        resultsDiv.style.color = 'white';
        
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            headerControls.appendChild(resultsDiv);
        }
    }
    
    resultsDiv.innerHTML = `
        <span>
            <i class="fas fa-search" style="margin-right: 8px;"></i> 
            ${message} - ${count} resultado${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}
        </span>
        <button onclick="clearAllFilters()" class="btn-limpiar-todo" style="padding: 5px 15px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 3px; cursor: pointer;">
            <i class="fas fa-times"></i> Limpiar todo
        </button>
    `;
}

function hideSearchResults() {
    const resultsDiv = document.getElementById('searchResults');
    if (resultsDiv) {
        resultsDiv.remove();
    }
}

async function clearSearch() {
    appState.filters.searchTerm = '';
    appState.isSearchActive = false;
    appState.filteredTickets = [];
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    if (hasActiveDateFilters()) {
        await searchTickets('');
    } else {
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) paginationContainer.style.display = 'flex';
        
        const recordInfo = document.getElementById('recordInfo');
        if (recordInfo) recordInfo.style.display = 'block';
        
        hideSearchResults();
        
        await loadTotalTickets();
        await loadTicketsPage(1);
    }
}

async function clearAllFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    clearDateFilters();
    
    const collaboratorFilter = document.getElementById('collaboratorFilter');
    if (collaboratorFilter) collaboratorFilter.value = '';
    
    appState.filters = {
        searchTerm: '',
        collaboratorId: '',
        dateFilter: { day: '', month: '', year: '' }
    };
    appState.isSearchActive = false;
    appState.filteredTickets = [];
    appState.allTickets = [];
    
    const paginationContainer = document.querySelector('.pagination-container');
    if (paginationContainer) paginationContainer.style.display = 'flex';
    
    hideSearchResults();
    
    await loadTotalTickets();
    await loadTicketsPage(1);
}

async function changePage(newPage) {
    if (newPage < 1 || appState.isSearchActive) return;
    await loadTicketsPage(newPage);
}

const getBadgeClass = (status) => {
    const map = { finalizado: 'success', en_proceso: 'warning', pendiente: 'danger', cancelado: 'secondary' };
    return map[status] || 'secondary';
};

const formatStatus = (status) => {
    if (!status) return 'N/A';
    return status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return 'Fecha inválida';
    }
};

// =================================================================================
// FUNCIONES DE ACCIÓN
// =================================================================================

async function viewTicket(ticketId) {
    window.location.href = `../verTicket/verTicket.html?id=${ticketId}`;
}

async function editTicket(ticketId) {
    window.location.href = `../editar-ticket/editar-ticket.html?id=${ticketId}`;
}

async function generatePdfPage(ticketId) {
    window.location.href = `/vista/nav-mesa-admin/Tickets/generar-pdf/generar-pdf.html?id=${ticketId}`;
}

async function deleteTicket(ticketId) {
    try {
        const result = await Swal.fire({
            title: '¿Mover a la papelera?',
            text: "Esta acción moverá el ticket a la papelera",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, mover',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6C43E0'
        });

        if (result.isConfirmed) {
            const ticketRef = db.collection('ticketsmesa').doc(ticketId);
            const ticketDoc = await ticketRef.get();
            
            if (ticketDoc.exists) {
                await db.collection('ticketsmesaPapelera').doc(ticketId).set({
                    ...ticketDoc.data(),
                    fechaEliminacion: firebase.firestore.FieldValue.serverTimestamp(),
                    eliminadoPor: appState.currentUser?.nombre || 'Sistema'
                });
                
                await ticketRef.delete();
                
                Swal.fire('¡Movido!', 'El ticket ha sido movido a la papelera', 'success');
                
                if (appState.isSearchActive) {
                    await searchTickets(appState.filters.searchTerm);
                } else {
                    await loadTotalTickets();
                    await loadTicketsPage(appState.pagination.currentPage);
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showError('No se pudo mover el ticket');
    }
}

function showError(message) {
    Swal.fire({ title: 'Error', text: message, icon: 'error', confirmButtonColor: '#6C43E0' });
}

// =================================================================================
// CONFIGURACIÓN DE EVENTOS
// =================================================================================

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            
            if (appState.searchTimeout) clearTimeout(appState.searchTimeout);
            
            appState.searchTimeout = setTimeout(() => {
                if (searchTerm.trim() || hasActiveDateFilters()) {
                    searchTickets(searchTerm);
                } else {
                    clearSearch();
                }
            }, 500);
        });
    }

    const collaboratorFilter = document.getElementById('collaboratorFilter');
    if (collaboratorFilter) {
        collaboratorFilter.addEventListener('change', async (e) => {
            appState.filters.collaboratorId = e.target.value;
            appState.pagination.pages = {};
            appState.allTickets = [];
            
            const searchTerm = document.getElementById('searchInput')?.value || '';
            
            if (appState.isSearchActive || searchTerm.trim() || hasActiveDateFilters()) {
                await searchTickets(searchTerm);
            } else {
                await loadTotalTickets();
                await loadTicketsPage(1);
            }
        });
    }
    
    const dayFilter = document.getElementById('dayFilter');
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    const clearDateBtn = document.getElementById('clearDateFilters');
    
    if (dayFilter) {
        dayFilter.addEventListener('change', () => {
            const searchTerm = document.getElementById('searchInput')?.value || '';
            searchTickets(searchTerm);
        });
    }
    
    if (monthFilter) {
        monthFilter.addEventListener('change', () => {
            const searchTerm = document.getElementById('searchInput')?.value || '';
            searchTickets(searchTerm);
        });
    }
    
    if (yearFilter) {
        yearFilter.addEventListener('change', () => {
            const searchTerm = document.getElementById('searchInput')?.value || '';
            searchTickets(searchTerm);
        });
    }
    
    if (clearDateBtn) {
        clearDateBtn.addEventListener('click', () => {
            clearDateFilters();
        });
    }
}

// =================================================================================
// INICIALIZACIÓN
// =================================================================================
document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        if (user) {
            initialLoad();
        } else {
            window.location.href = '../nav-visitantes/inicio-de-sesion.html';
        }
    });
});

// Hacer funciones globales
window.viewTicket = viewTicket;
window.editTicket = editTicket;
window.generatePdfPage = generatePdfPage;
window.deleteTicket = deleteTicket;
window.changePage = changePage;
window.clearSearch = clearSearch;
window.clearDateFilters = clearDateFilters;
window.clearAllFilters = clearAllFilters;