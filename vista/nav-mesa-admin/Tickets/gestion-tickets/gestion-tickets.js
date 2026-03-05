// ESQUEMAS DE DATOS COMPLETOS
const DataSchemas = {
    EVIDENCIA: {
        ticketId: '',
        colaboradorId: '',
        colaboradorNombre: '',
        descripcion: '',
        imagenes: [],
        fechaCreacion: null,
        fechaActualizacion: null,
        estado: 'pendiente'
    },
    TICKET: {
        evidenciasCompletadas: [],
        colaboradoresAceptados: [],
        todosCompletados: false
    },
    HISTORIAL: {
        ticketId: '',
        fechaCambio: null,
        colaboradorId: '',
        colaboradorNombre: '',
        estadoAnterior: '',
        estadoNuevo: '',
        motivo: ''
    }
};

// CLASE TICKET MANAGER COMPLETO
class TicketManager {
    constructor() {
        this.currentTicketId = null;
        this.currentTicketStatus = null;
        this.showFinalized = false;
        this.selectedMonth = null;
        this.activeModal = null;
    }

    setCurrentTicket(ticketId, status) {
        this.currentTicketId = ticketId;
        this.currentTicketStatus = status;
    }

    clearCurrentTicket() {
        this.currentTicketId = null;
        this.currentTicketStatus = null;
    }

    toggleFilter() {
        this.showFinalized = !this.showFinalized;
        return this.showFinalized;
    }

    setSelectedMonth(month) {
        this.selectedMonth = month;
    }

    setActiveModal(modalInstance) {
        // Cerrar modal anterior si existe
        if (this.activeModal && typeof this.activeModal.close === 'function') {
            this.activeModal.close();
        }
        this.activeModal = modalInstance;
    }

    clearActiveModal() {
        this.activeModal = null;
    }
}

const ticketManager = new TicketManager();

// IMPORTS DE FIREBASE V9 COMPLETOS
import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where,
    getDocs,
    orderBy,
    doc,
    getDoc,
    limit,
    updateDoc,
    addDoc,
    serverTimestamp,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DOM = {
    ticketsContainer: document.getElementById('ticketsContainer'),
    filterBtn: document.getElementById('filterBtn'),
    filterText: document.getElementById('filterText'),
};

const AppState = {
    userData: null,
    lastCheckedTicketId: null,
    allTickets: [],
    unsubscribe: null,
    isModalOpen: false,
    currentListeners: []
};

window.AppState = AppState;

// UTILIDADES COMPLETAS
const Utils = {
    showLoading: (message = 'Cargando...') => {
        // Evitar múltiples modales de carga
        if (Swal.isVisible() && Swal.getPopup()?.classList.contains('swal2-loading')) {
            return;
        }
        
        return Swal.fire({
            title: message,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: {
                popup: 'swal2-loading'
            }
        });
    },
    
    hideLoading: () => {
        if (Swal.isVisible() && Swal.getPopup()?.classList.contains('swal2-loading')) {
            Swal.close();
        }
    },
    
    showError: (message, title = 'Error') => {
        // Cerrar modales de carga primero
        Utils.hideLoading();
        
        return Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            confirmButtonColor: '#3085d6',
            allowOutsideClick: true
        });
    },
    
    formatDate: (timestamp) => {
        if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
        try {
            const date = timestamp.toDate();
            return date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error("Error formateando fecha:", error);
            return 'Fecha inválida';
        }
    },

    formatDetailedDate: (timestamp) => {
        if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
        try {
            const date = timestamp.toDate();
            return date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    },
    
    calculateAbandonmentTime: (creationTimestamp) => {
        if (!creationTimestamp || typeof creationTimestamp.toDate !== 'function') return { expired: true };

        const creationTime = creationTimestamp.toDate().getTime(); 
        const now = Date.now();
        const maxDuration = 5 * 24 * 60 * 60 * 1000;
        const abandonmentTime = creationTime + maxDuration;
        let remainingTime = abandonmentTime - now;

        const pauseDuration = 3 * 24 * 60 * 60 * 1000; 
        
        if (ticketManager.currentTicketStatus === 'en_proceso') {
            remainingTime = (creationTime + maxDuration + pauseDuration) - now;
        } else if (remainingTime <= 0) {
            return { expired: true };
        }

        const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

        return {
            expired: false,
            days: days,
            hours: hours,
            minutes: minutes
        };
    },

    getBadgeClass: (status) => {
        switch(status) {
            case 'finalizado': 
            case 'cerrado': 
            case 'cancelado': 
                return 'badge-success';
            case 'abandono_de_actividades': 
                return 'badge-danger';
            case 'en_proceso': 
                return 'badge-warning';
            case 'en_camino': 
                return 'badge-primary'; 
            case 'pendiente': 
            case 'pendiente_de_aceptación': 
                return 'badge-danger';
            case 'aceptado': 
                return 'badge-info';
            default: 
                return 'badge-info';
        }
    },
    
    getStatusIcon: (status) => {
        switch(status) {
            case 'finalizado': 
            case 'cerrado': 
            case 'completado': 
                return 'fa-check-circle';
            case 'abandono_de_actividades': 
                return 'fa-exclamation-triangle';
            case 'en_proceso': 
                return 'fa-pause-circle'; 
            case 'en_camino': 
                return 'fa-truck';
            case 'pendiente': 
            case 'pendiente_de_aceptación': 
                return 'fa-clock';
            case 'aceptado': 
                return 'fa-check';
            case 'cancelado': 
                return 'fa-times-circle'; 
            default: 
                return 'fa-question-circle';
        }
    },
    
    getPriorityClass: (priority) => {
        switch(priority) {
            case 'alta': return 'priority-high';
            case 'media': return 'priority-medium';
            case 'baja': return 'priority-low';
            default: return 'priority-medium';
        }
    }
};

// TICKETS CONTROLLER COMPLETO
const TicketsController = {
    processTickets: (querySnapshot) => {
        const tickets = [];
        querySnapshot.forEach((doc) => {
            try {
                const data = doc.data();
                tickets.push({
                    id: doc.id,
                    ...data,
                    fechaCreacion: data.fechaCreacion,
                    fechaActualizacion: data.fechaActualizacion || null
                });
            } catch (error) {
                console.error("Error procesando ticket:", error);
            }
        });
        return tickets;
    },

    filterTickets: (tickets, showFinalized) => {
        const finalizedStates = ['finalizado', 'cerrado', 'cancelado', 'completado', 'abandono_de_actividades']; 
        let filteredTickets;
        
        if (showFinalized) {
            filteredTickets = tickets.filter(ticket => finalizedStates.includes(ticket.estado));
            
            filteredTickets.sort((a, b) => {
                const dateA = (a.fechaFinalizacion && typeof a.fechaFinalizacion.toDate === 'function') ? a.fechaFinalizacion.toDate().getTime() : 0;
                const dateB = (b.fechaFinalizacion && typeof b.fechaFinalizacion.toDate === 'function') ? b.fechaFinalizacion.toDate().getTime() : 0;
                return dateB - dateA;
            });

        } else {
            filteredTickets = tickets.filter(ticket => !finalizedStates.includes(ticket.estado));
        }

        return filteredTickets;
    },

    renderTickets: (tickets) => {
        try {
            const filteredTickets = TicketsController.filterTickets(tickets, ticketManager.showFinalized);
            
            const finalizedFiltersDiv = document.getElementById('finalizedFilters');
            if (finalizedFiltersDiv) {
                finalizedFiltersDiv.style.display = ticketManager.showFinalized ? 'block' : 'none';
            }

            DOM.ticketsContainer.innerHTML = '';
            
            if (!filteredTickets || filteredTickets.length === 0) {
                const message = ticketManager.showFinalized 
                    ? 'No tienes tickets finalizados, cerrados o cancelados'
                    : 'No tienes tickets pendientes, aceptados o en proceso';
                    
                DOM.ticketsContainer.innerHTML = `
                    <div class="no-tickets">
                        <i class="fas fa-ticket-alt"></i>
                        <h3>${message}</h3>
                        <p>Cuando ${ticketManager.showFinalized ? 'finalices' : 'te asignen'} tickets, aparecerán aquí</p>
                    </div>
                `;
                return;
            }

            let html = '';
            filteredTickets.forEach(ticket => {
                try {
                    const ticketId = ticket.id || 'ID-NO-DISPONIBLE';
                    const estado = ticket.estado || 'desconocido';
                    const titulo = ticket.titulo || 'Sin título';
                    const descripcion = ticket.descripcionActividades || 'Sin descripción';
                    const prioridad = ticket.prioridad || 'media';
                    const area = ticket.area || 'General';
                    const fechaCreacion = ticket.fechaCreacion || null;
                    
                    const colaboradorInfo = ticket.colaborador ? `
                        <div class="ticket-meta">
                            <span class="badge badge-primary">
                                <i class="fas fa-user"></i> ${ticket.colaborador.nombre || 'Sin nombre'}
                            </span>
                            <span class="badge badge-primary">
                                <i class="fas fa-briefcase"></i> ${ticket.colaborador.puesto || 'Rsi Enterprice'}
                            </span>
                        </div>
                    ` : '';
                    
                    html += `
                        <div class="ticket-card">
                            <div class="ticket-header">
                                <span class="ticket-id">#${ticketId.toUpperCase()}</span> 
                                <span class="badge ${Utils.getBadgeClass(estado)}">
                                    <i class="fas ${Utils.getStatusIcon(estado)}"></i> ${estado.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <h3 class="ticket-title">${titulo}</h3>
                            <p class="ticket-desc">${descripcion.substring(0, 120)}${descripcion.length > 120 ? '...' : ''}</p>
                            
                            <div class="ticket-meta">
                                <span class="badge badge-primary">
                                    <span class="priority-indicator ${Utils.getPriorityClass(prioridad)}"></span>
                                    ${prioridad}
                                </span>
                                <span class="badge badge-primary">
                                    <i class="fas fa-layer-group"></i> ${area}
                                </span>
                            </div>
                            
                            ${colaboradorInfo}
                            
                            <div class="ticket-date">
                                <i class="fas fa-calendar-alt"></i> ${Utils.formatDate(fechaCreacion)}
                            </div>
                            
                            <button class="action-btn view" data-id="${ticketId}">
                                <i class="fas fa-eye"></i> Ver detalles
                            </button>
                        </div>
                    `;
                } catch (error) {
                    console.error("Error renderizando ticket:", error);
                }
            });
            
            DOM.ticketsContainer.innerHTML = html;
            
            // Agregar event listeners de forma segura
            document.querySelectorAll('.action-btn.view').forEach(btn => {
                // Remover listeners anteriores para evitar duplicados
                btn.removeEventListener('click', TicketsController.handleViewClick);
                btn.addEventListener('click', TicketsController.handleViewClick);
            });
        } catch (error) {
            console.error("Error renderizando tickets:", error);
            Utils.showError("Error al mostrar los tickets");
        }
    },
        handleViewClick: function(event) {
            const ticketId = event.currentTarget.dataset.id;
            // Redirigir a la nueva página de visualización de ticket
            window.location.href = '/vista/nav-mesa-admin/Tickets/ver-ticket/ver-ticket.html?ticketId=' + ticketId;
        },

    async loadUserTickets() {
        try {
            Utils.showLoading('Cargando tickets...');
            
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('Usuario no autenticado.');
            }

            const colaboradoresRef = collection(db, 'colaboradores');
            const q2 = query(colaboradoresRef, where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email));
            const collabSnapshot = await getDocs(q2);
            
            if (collabSnapshot.empty) {
                throw new Error('No se encontraron tus datos de colaborador en la base de datos.');
            }
            
            collabSnapshot.forEach(doc => {
                AppState.userData = doc.data();
                AppState.userData.colaboradorId = doc.id;
                AppState.userData.nombreCompleto = doc.data()['NOMBRE'];
                AppState.userData.NOMBRE = doc.data()['NOMBRE']; 
                AppState.userData.ÁREA = doc.data()['ÁREA']; 
            });
            
            const ticketsRef = collection(db, 'ticketsmesa');
            const nombreResponsable = AppState.userData.nombreCompleto;
            const colaboradorId = AppState.userData.colaboradorId;
            
            let querySnapshot;
            try {
                const qResponsable = query(
                    ticketsRef,
                    where("responsableNombre", "==", nombreResponsable),
                    orderBy("fechaCreacion", "desc")
                );
                
                const qColaborador = query(
                    ticketsRef,
                    where("colaboradores", "array-contains", colaboradorId),
                    orderBy("fechaCreacion", "desc")
                );
                
                const [snapshotResponsable, snapshotColaborador] = await Promise.all([
                    getDocs(qResponsable),
                    getDocs(qColaborador)
                ]);
                
                const allTickets = new Map();
                snapshotResponsable.forEach(doc => { allTickets.set(doc.id, doc); });
                snapshotColaborador.forEach(doc => { allTickets.set(doc.id, doc); });
                
                querySnapshot = {
                    docs: Array.from(allTickets.values()),
                    empty: allTickets.size === 0,
                    size: allTickets.size,
                    forEach: function(callback) { this.docs.forEach(doc => callback(doc)); }
                };
                
            } catch (error) {
                if (error.code === 'failed-precondition') {
                    const qResponsable = query(ticketsRef, where("responsableNombre", "==", nombreResponsable));
                    const qColaborador = query(ticketsRef, where("colaboradores", "array-contains", colaboradorId));
                    
                    const [snapshotResponsable, snapshotColaborador] = await Promise.all([
                        getDocs(qResponsable),
                        getDocs(qColaborador)
                    ]);
                    
                    const allTickets = new Map();
                    snapshotResponsable.forEach(doc => { allTickets.set(doc.id, doc); });
                    snapshotColaborador.forEach(doc => { allTickets.set(doc.id, doc); });
                    
                    querySnapshot = {
                        docs: Array.from(allTickets.values()),
                        empty: allTickets.size === 0,
                        size: allTickets.size,
                        forEach: function(callback) { this.docs.forEach(doc => callback(doc)); }
                    };
                } else {
                    throw error;
                }
            }
            
            const tickets = this.processTickets(querySnapshot);
            
            const updatedTickets = await TicketsController.checkAndFlagAbandonedTickets(tickets);

            const ticketsEnriquecidos = await this.enriquecerTicketsConColaborador(updatedTickets);
            
            AppState.allTickets = ticketsEnriquecidos;
            this.renderTickets(ticketsEnriquecidos);
            
            if (updatedTickets.length > 0) {
                AppState.lastCheckedTicketId = updatedTickets[0].id;
            }
            
        } catch (error) {
            console.error("Error cargando tickets:", error);
            Utils.showError("No se pudieron cargar los tickets. " + error.message);
            DOM.ticketsContainer.innerHTML = `
                <div class="no-tickets">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar tickets</h3>
                    <p>No se pudieron cargar los tickets: ${error.message}</p>
                </div>
            `;
            if (error.message.includes('autenticado') || error.message.includes('colaborador')) {
                window.location.replace('/vista/nav-visitantes/inicio-de-sesion.html');
            }
        } finally {
            Utils.hideLoading();
        }
    },
    
    async checkAndFlagAbandonedTickets(tickets) {
        const now = Date.now();
        const fiveDaysInMillis = 5 * 24 * 60 * 60 * 1000;
        const ticketsToUpdate = [];
        const nonActiveStatuses = ['finalizado', 'cerrado', 'cancelado', 'abandono_de_actividades', 'completado', 'en_proceso']; 

        for (const ticket of tickets) {
            const status = ticket.estado;
            const creationDate = (ticket.fechaCreacion && typeof ticket.fechaCreacion.toDate === 'function') ? ticket.fechaCreacion.toDate().getTime() : 0;

            if (creationDate > 0 && 
                (now - creationDate) >= fiveDaysInMillis && 
                !nonActiveStatuses.includes(status)) 
            {
                ticketsToUpdate.push(ticket);
            }
        }

        if (ticketsToUpdate.length > 0) {
            console.log(`⚠️ Se encontraron ${ticketsToUpdate.length} tickets para marcar como abandono.`);
            
            const updatePromises = ticketsToUpdate.map(async (ticket) => {
                const ticketRef = doc(db, 'ticketsmesa', ticket.id);
                
                await updateDoc(ticketRef, {
                    estado: 'abandono_de_actividades',
                    fechaActualizacion: serverTimestamp(),
                    fechaFinalizacion: serverTimestamp() 
                });

                await TicketsController.recordHistory(
                    ticket.id,
                    ticket.estado,
                    'abandono_de_actividades',
                    'Sistema: Abandono de actividades por inactividad de 5 días',
                    'SISTEMA',
                    'Sistema Automatizado'
                );

                ticket.estado = 'abandono_de_actividades';
                ticket.fechaFinalizacion = serverTimestamp(); 
            });

            await Promise.all(updatePromises);
            
            // Mostrar solo si no hay otro modal abierto
            if (!Swal.isVisible()) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Tickets en Abandono',
                    text: `El sistema ha marcado ${ticketsToUpdate.length} tickets con más de 5 días sin cerrar como "Abandono de Actividades".`,
                    confirmButtonColor: '#3085d6'
                });
            }
        }

        return tickets;
    },

    async enriquecerTicketsConColaborador(tickets) {
        if (!tickets || tickets.length === 0 || !AppState.userData) return tickets;
        
        const datosColaborador = AppState.userData;
            
        return tickets.map(ticket => ({
            ...ticket,
            colaborador: {
                nombre: datosColaborador.NOMBRE,
                area: datosColaborador.ÁREA,
                puesto: datosColaborador.PUESTO,
                imagen: datosColaborador.imagen || null
            }
        }));
    },

    async showTicketDetails(ticketId) {
        // Verificar si ya hay un modal abierto
        if (AppState.isModalOpen) {
            return;
        }

        try {
            AppState.isModalOpen = true;
            Utils.showLoading('Cargando detalles...');
            
            const ticketRef = doc(db, 'ticketsmesa', ticketId);
            const ticketSnap = await getDoc(ticketRef);
            
            if (!ticketSnap.exists()) {
                throw new Error('El ticket no existe');
            }
            
            const data = ticketSnap.data();
            const shortId = ticketId.substring(0, 8); 
            
            ticketManager.setCurrentTicket(ticketId, data.estado); 
            
            let nombresColaboradores = [];
            if (data.colaboradores && data.colaboradores.length > 0) {
                const colaboradoresPromises = data.colaboradores.map(async colabId => {
                    const colabRef = doc(db, 'colaboradores', colabId);
                    const colabSnap = await getDoc(colabRef);
                    return colabSnap.exists() ? { id: colabId, nombre: colabSnap.data().NOMBRE } : { id: colabId, nombre: 'Colaborador desconocido' };
                });
                nombresColaboradores = await Promise.all(colaboradoresPromises);
            }
            
            const historyRef = collection(db, 'historialTicket');
            const acceptanceMotivos = [
                "Colaborador individual aceptó el ticket.", 
                "Aceptación individual registrada (el ticket ya estaba Aceptado).", 
                "Ticket aceptado por el último colaborador, cambiando estado a Aceptado."
            ];

            const acceptanceHistoryMap = new Map();
            try {
                const qAcceptance = query(
                    historyRef,
                    where("ticketId", "==", ticketId),
                    where("motivo", "in", acceptanceMotivos),
                    orderBy("fechaCambio", "asc")
                );
                const acceptanceSnap = await getDocs(qAcceptance);
                
                acceptanceSnap.forEach(doc => {
                    if (!acceptanceHistoryMap.has(doc.data().colaboradorId)) {
                        acceptanceHistoryMap.set(doc.data().colaboradorId, doc.data());
                    }
                });
            } catch (error) {
                console.warn("Advertencia: No se pudo cargar el historial de aceptación:", error);
            }

            const evidenciasRef = collection(db, 'evidenciatickets');
            const q = query(evidenciasRef, where("ticketId", "==", ticketId));
            const evidenciasSnap = await getDocs(q);
            
            const evidencias = [];
            evidenciasSnap.forEach(doc => {
                evidencias.push(doc.data());
            });
            
            const userUid = AppState.userData.colaboradorId;
            const userEvidence = evidencias.find(ev => ev.colaboradorId === userUid);
            
            const ticketEstaFinalizado = ['finalizado', 'cerrado', 'cancelado', 'completado', 'abandono_de_actividades'].includes(data.estado);
            const usuarioYaCompleto = !!userEvidence;
            const isColaborator = data.colaboradores && data.colaboradores.includes(userUid);
            const isAccepted = data.colaboradoresAceptados && data.colaboradoresAceptados.includes(userUid);
            
            let acceptBtnHTML = '';
            let finishBtnHTML = '';
            let editBtnHTML = '';
            let responsableButtons = '';
            
            if (isColaborator && !ticketEstaFinalizado) {
                
                if (!isAccepted) {
                    acceptBtnHTML = `
                        <button class="action-btn accept-btn btn-success" id="acceptTicketBtn" data-id="${ticketId}" style="margin-right: 10px;">
                            <i class="fas fa-handshake"></i> Aceptar Ticket
                        </button>
                    `;
                } else {
                    acceptBtnHTML = `
                        <span class="badge badge-success" style="padding: 10px; margin-right: 10px; background-color: #28a745; color: white;">
                            <i class="fas fa-check-double"></i> Aceptado
                        </span>
                    `;
                }
                
                if (isAccepted) {
                    if (!usuarioYaCompleto) {
                        finishBtnHTML = `
                            <a href="../finalizar-ticket/finalizar-ticket.html?ticketId=${ticketId}" class="action-btn finish-btn" style="margin-right: 10px;">
                                <i class="fas fa-check-circle"></i> Finalizar Ticket
                            </a>
                        `;
                    } else {
                        editBtnHTML = `
                            <button class="action-btn edit-btn" onclick="window.location.href='../finalizar-ticket/finalizar-ticket.html?ticketId=${ticketId}&edit=true'" style="margin-right: 10px;">
                                <i class="fas fa-edit"></i> Modificar Finalización
                            </button>
                        `;
                    }
                }
            }
            
            if (data.responsableNombre === AppState.userData.nombreCompleto) {
                responsableButtons = `
                    <button class="action-btn info-btn" onclick="TicketsController.showTicketHistory('${ticketId}')" style="margin-right: 10px;">
                        <i class="fas fa-history"></i> Ver Historial
                    </button>
                `;
            }
            
            let collaboratorsAcceptanceHTML = '';
            if (data.colaboradores && data.colaboradores.length > 0) {
                const acceptanceDetails = nombresColaboradores.map(colab => {
                    const isColabAccepted = data.colaboradoresAceptados && data.colaboradoresAceptados.includes(colab.id);
                    const history = acceptanceHistoryMap.get(colab.id);
                    
                    let statusText = `Pendiente de aceptar`;
                    let statusClass = 'pending';
                    let dateText = '';

                    if (isColabAccepted) {
                        statusText = `Aceptado`;
                        statusClass = 'completed';
                        if (history && history.fechaCambio) {
                            dateText = ` (${Utils.formatDetailedDate(history.fechaCambio)})`;
                        }
                    }

                    return `
                        <div class="progress-item">
                            <span class="progress-name">${colab.nombre}</span>
                            <span class="progress-status ${statusClass}">
                                <i class="fas ${isColabAccepted ? 'fa-check-circle' : 'fa-clock'}"></i>
                                ${statusText}${dateText}
                            </span>
                        </div>
                    `;
                }).join('');

                collaboratorsAcceptanceHTML = `
                    <div class="detail-section">
                        <strong>Estado de Aceptación Individual (${data.colaboradoresAceptados ? data.colaboradoresAceptados.length : 0}/${data.colaboradores.length})</strong>
                        <div class="progress-container">
                            ${acceptanceDetails}
                        </div>
                    </div>
                `;
            }
            
            let abandonmentTimerHTML = '';
            const abandonmentTime = Utils.calculateAbandonmentTime(data.fechaCreacion);

            if (data.estado !== 'abandono_de_actividades' && data.estado !== 'cerrado' && data.estado !== 'finalizado' && !abandonmentTime.expired) {
                abandonmentTimerHTML = `
                    <div class="detail-section" style="border: 2px dashed #fd7e14; padding: 15px; border-radius: 8px;">
                        <strong>Cierre por Inactividad Automático</strong>
                        <p style="font-size: 1.1em; color: #fd7e14; font-weight: bold;">
                            <i class="fas fa-hourglass-half"></i> Tiempo restante para Abandono:
                        </p>
                        <div style="font-size: 1.4em; text-align: center; color: #ffc107;">
                            ${abandonmentTime.days} Días, ${abandonmentTime.hours} Horas, ${abandonmentTime.minutes} Minutos
                        </div>
                    </div>
                `;
            } else if (data.estado === 'abandono_de_actividades') {
                abandonmentTimerHTML = `
                    <div class="detail-section" style="border: 2px solid #dc3545; padding: 15px; border-radius: 8px; background-color: rgba(220, 53, 69, 0.1);">
                        <strong>Estado de Alerta</strong>
                        <p style="font-size: 1.1em; color: #dc3545; font-weight: bold;">
                            <i class="fas fa-exclamation-triangle"></i> ¡TICKET EN ABANDONO DE ACTIVIDADES!
                        </p>
                    </div>
                `;
            }
            
            let pauseReasonHTML = '';
            if (data.estado === 'en_proceso' && data.pauseComment) {
                pauseReasonHTML = `
                    <div class="detail-section" style="border-left: 5px solid #fd7e14; padding-left: 10px; background-color: rgba(253, 126, 20, 0.1);">
                        <strong><i class="fas fa-pause-circle"></i> Razón de Pausa:</strong>
                        <p style="margin-top: 5px; font-style: italic;">${data.pauseComment}</p>
                    </div>
                `;
            }
            
            let progressHTML = '';
            if (data.colaboradores && data.colaboradores.length > 1) {
                progressHTML = `
                    <div class="detail-section">
                        <strong>Progreso de Evidencias</strong>
                        <div class="progress-container">
                            ${nombresColaboradores.map(colab => {
                                const evidenciaColab = evidencias.find(ev => ev.colaboradorId === colab.id);
                                const completado = !!evidenciaColab;
                                
                                return `
                                    <div class="progress-item">
                                        <span class="progress-name">${colab.nombre}</span>
                                        <span class="progress-status ${completado ? 'completed' : 'pending'}">
                                            <i class="fas ${completado ? 'fa-check-circle' : 'fa-clock'}"></i>
                                            ${completado ? 'Completado' : 'Pendiente'}
                                        </span>
                                        ${completado ? `
                                            <button class="view-evidence-btn" data-colab-id="${colab.id}" data-colab-nombre="${colab.nombre}" data-ticket-id="${ticketId}">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
            
            let userEvidenceHTML = '';
            if (userEvidence) {
                userEvidenceHTML = `
                    <div class="detail-section">
                        <strong>Mis Evidencias</strong>
                        <div class="description-text">${userEvidence.descripcion}</div>
                        <div class="evidence-grid">
                            ${userEvidence.imagenes.map(img => `
                                <img src="${img}" class="evidence-img clickable-image" style="cursor: pointer; max-height: 150px;" data-image-src="${img}">
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            const modalHtmlContent = `
                <div id="detailContentContainer" style="text-align: left;">
                    
                    <div class="detail-section">
                        <strong>Información Básica</strong>
                        <p><span class="detail-label">ID Corto:</span> #${shortId.toUpperCase()}</p>
                        <p><span class="detail-label">Título:</span> ${data.titulo}</p>
                        <p><span class="detail-label">Estado:</span> 
                            <span class="badge ${Utils.getBadgeClass(data.estado)}">
                                <i class="fas ${Utils.getStatusIcon(data.estado)}"></i> ${data.estado.replace(/_/g, ' ')}
                            </span>
                        </p>
                        ${abandonmentTimerHTML}
                        ${pauseReasonHTML}
                        <p><span class="detail-label">Prioridad:</span> 
                            <span class="badge badge-primary">
                                <span class="priority-indicator ${Utils.getPriorityClass(data.prioridad)}"></span> 
                                ${data.prioridad}
                            </span>
                        </p>
                        <p><span class="detail-label">Área:</span> 
                            <span class="badge badge-primary">
                                <i class="fas fa-layer-group"></i> ${data.area || 'General'}
                            </span>
                        </p>
                        <p><span class="detail-label">Responsable:</span> ${data.responsableNombre}</p>
                        <p><span class="detail-label">Colaboradores:</span> ${nombresColaboradores.map(c => c.nombre).join(', ')}</p>
                        <p><span class="detail-label">Fecha creación:</span> ${Utils.formatDate(data.fechaCreacion)}</p>
                        ${data.fechaActualizacion ? `<p><span class="detail-label">Última actualización:</span> ${Utils.formatDate(data.fechaActualizacion)}</p>` : ''}
                        ${data.fechaFinalizacion ? `<p><span class="detail-label">Fecha finalización:</span> ${Utils.formatDate(data.fechaFinalizacion)}</p>` : ''}
                    </div>
                    
                    ${collaboratorsAcceptanceHTML}
                    ${progressHTML}
                    
                    <div class="detail-section">
                        <strong>Descripción</strong>
                        <div class="description-text">${data.descripcionActividades}</div>
                    </div>
                    
                    ${data.servicio || data.proyecto || data.ordenServicio || data.descripcionActividades ? `
                        <div class="detail-section">
                            <strong>Información Adicional</strong>
                            ${data.servicio ? `<p><span class="detail-label">Servicio:</span> ${data.servicio}</p>` : ''}
                            ${data.proyecto ? `<p><span class="detail-label">Proyecto:</span> ${data.proyecto}</p>` : ''}
                            ${data.ordenServicio ? `<p><span class="detail-label">Orden de Servicio:</span> ${data.ordenServicio}</p>` : ''}
                            ${data.descripcionActividades ? `<p><span class="detail-label">Actividades:</span> ${data.descripcionActividades}</p>` : ''}
                        </div>
                    ` : ''}

                    ${data.rfc || data.direccionFiscal || data.cuenta ? `
                        <div class="detail-section">
                            <strong>Información Fiscal</strong>
                            ${data.rfc ? `<p><span class="detail-label">RFC:</span> ${data.rfc}</p>` : ''}
                            ${data.direccionFiscal ? `<p><span class="detail-label">Dirección Fiscal:</span> ${data.direccionFiscal}</p>` : ''}
                            ${data.cuenta ? `<p><span class="detail-label">Cuenta:</span> ${data.cuenta}</p>` : ''}
                        </div>
                    ` : ''}

                    ${data.sistemas && Object.keys(data.sistemas).length > 0 ? `
                        <div class="detail-section">
                            <strong>Sistemas Relacionados</strong>
                            <ul>
                                ${Object.entries(data.sistemas).map(([key, value]) => `
                                    <li>${key}: ${value}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${userEvidenceHTML}
                </div>
            `;

            const footerHTML = `
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${acceptBtnHTML}
                    ${finishBtnHTML}
                    ${editBtnHTML}
                    ${responsableButtons}
                    <button class="action-btn close-btn" id="closeDetailsBtn">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            `;

            Utils.hideLoading();
            
            const modal = await Swal.fire({
                title: `Detalles del Ticket #${ticketId}`,
                html: modalHtmlContent,
                width: '90%',
                showCancelButton: false,
                showConfirmButton: false,
                showCloseButton: true,
                footer: footerHTML,
                allowOutsideClick: true,
                didOpen: () => {
                    // Configurar botón de aceptar
                    const acceptBtn = document.getElementById('acceptTicketBtn');
                    if (acceptBtn) {
                        acceptBtn.addEventListener('click', () => TicketsController.acceptTicket(ticketId));
                    }
                    
                    // Configurar botón de cerrar
                    const closeBtn = document.getElementById('closeDetailsBtn');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', () => Swal.close());
                    }
                    
                    // Configurar botones de ver evidencias
                    document.querySelectorAll('.view-evidence-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const colabId = e.currentTarget.dataset.colabId;
                            const colabNombre = e.currentTarget.dataset.colabNombre;
                            const ticketId = e.currentTarget.dataset.ticketId;
                            TicketsController.showCollaboratorEvidence(colabId, colabNombre, ticketId);
                        });
                    });
                    
                    // Configurar imágenes clickeables
                    document.querySelectorAll('.clickable-image').forEach(img => {
                        img.addEventListener('click', (e) => {
                            TicketsController.showImageModal(e.currentTarget.dataset.imageSrc || e.currentTarget.src);
                        });
                    });
                    
                    // Configurar botón de historial
                    const historyBtn = document.querySelector('.info-btn');
                    if (historyBtn) {
                        historyBtn.addEventListener('click', () => TicketsController.showTicketHistory(ticketId));
                    }
                },
                willClose: () => {
                    AppState.isModalOpen = false;
                    ticketManager.clearCurrentTicket();
                }
            });

            ticketManager.setActiveModal(modal);

        } catch (error) {
            console.error("Error mostrando detalles:", error);
            AppState.isModalOpen = false;
            Utils.showError("No se pudieron cargar los detalles del ticket: " + error.message);
        }
    },

    async showCollaboratorEvidence(colabId, colabNombre, ticketId) {
        try {
            Utils.showLoading('Cargando evidencias...');
            
            const evidenciasRef = collection(db, 'evidenciatickets');
            const q = query(
                evidenciasRef,
                where("ticketId", "==", ticketId),
                where("colaboradorId", "==", colabId)
            );
            
            const evidenciasSnap = await getDocs(q);
            
            if (evidenciasSnap.empty) {
                Utils.hideLoading();
                Swal.fire({
                    icon: 'info',
                    title: 'Sin Evidencias',
                    text: `${colabNombre} no ha subido evidencias aún.`,
                    confirmButtonColor: '#3085d6'
                });
                return;
            }
            
            const evidencia = evidenciasSnap.docs[0].data();
            Utils.hideLoading();
            
            let imagesHTML = '';
            if (evidencia.imagenes && evidencia.imagenes.length > 0) {
                imagesHTML = `
                    <div class="evidence-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 15px;">
                        ${evidencia.imagenes.map(img => `
                            <img src="${img}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 5px; cursor: pointer;" 
                                 onclick="TicketsController.showImageModal('${img}')">
                        `).join('')}
                    </div>
                `;
            }
            
            Swal.fire({
                title: `Evidencias de ${colabNombre}`,
                html: `
                    <div style="text-align: left;">
                        <p><strong>Descripción:</strong></p>
                        <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                            ${evidencia.descripcion || 'Sin descripción'}
                        </div>
                        ${imagesHTML}
                    </div>
                `,
                width: '80%',
                showConfirmButton: true,
                confirmButtonText: 'Cerrar'
            });
            
        } catch (error) {
            console.error("Error mostrando evidencias:", error);
            Utils.hideLoading();
            Utils.showError("No se pudieron cargar las evidencias del colaborador.");
        }
    },

    async showImageModal(imageSrc) {
        // Evitar abrir múltiples modales de imagen
        if (AppState.isModalOpen) {
            return;
        }
        
        AppState.isModalOpen = true;
        
        const modal = await Swal.fire({
            imageUrl: imageSrc,
            imageAlt: 'Evidencia en tamaño completo',
            background: '#1e1e1e',
            padding: '1em',
            showConfirmButton: false,
            showCloseButton: true,
            width: 'auto',
            willClose: () => {
                AppState.isModalOpen = false;
            }
        });
        
        ticketManager.setActiveModal(modal);
    },
    
    async showTicketHistory(ticketId) {
        // Verificar si ya hay un modal abierto
        if (AppState.isModalOpen) {
            return;
        }
        
        try {
            AppState.isModalOpen = true;
            Utils.showLoading('Cargando historial...');
            
            const historyRef = collection(db, 'historialTicket');
            const q = query(
                historyRef,
                where("ticketId", "==", ticketId)
            );
            const historySnap = await getDocs(q);
            
            let historyDataArray = [];
            historySnap.forEach(doc => {
                historyDataArray.push(doc.data());
            });

            historyDataArray.sort((a, b) => {
                try {
                    const dateA = (a.fechaCambio && typeof a.fechaCambio.toMillis === 'function') ? a.fechaCambio.toMillis() : 0;
                    const dateB = (b.fechaCambio && typeof b.fechaCambio.toMillis === 'function') ? b.fechaCambio.toMillis() : 0;
                    return dateB - dateA;
                } catch (e) {
                    return 0;
                }
            });
            
            let historyHTML = `
                <style>
                    .history-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.9em; }
                    .history-table th, .history-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                    .history-table th { background-color: #f2f2f2; color: #333; font-weight: bold; }
                    .status-badge { padding: 4px 8px; border-radius: 12px; font-weight: bold; color: white; white-space: nowrap; }
                    .status-aceptado, .status-completado { background-color: #17a2b8; }
                    .status-pendiente_de_aceptación, .status-pendiente { background-color: #ffc107; color: #333; }
                    .status-en_proceso { background-color: #fd7e14; }
                    .status-en_camino { background-color: #007bff; }
                    .status-abandono_de_actividades { background-color: #dc3545; }
                    .status-cerrado, .status-finalizado { background-color: #28a745; }
                    .status-cancelado { background-color: #dc3545; }
                </style>
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>Estado Anterior</th>
                            <th>Estado Nuevo</th>
                            <th>Colaborador</th>
                            <th>Motivo</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            if (historyDataArray.length === 0) {
                historyHTML += `
                    <tr><td colspan="5" style="text-align: center;">No hay historial de cambios registrado para este ticket.</td></tr>
                `;
            } else {
                historyDataArray.forEach(data => {
                    const date = Utils.formatDetailedDate(data.fechaCambio);
                    
                    historyHTML += `
                        <tr>
                            <td>${date}</td>
                            <td><span class="status-badge status-${data.estadoAnterior.toLowerCase().replace(/_/g, '-')}">${data.estadoAnterior.replace(/_/g, ' ')}</span></td>
                            <td><span class="status-badge status-${data.estadoNuevo.toLowerCase().replace(/_/g, '-')}">${data.estadoNuevo.replace(/_/g, ' ')}</span></td>
                            <td>${data.colaboradorNombre}</td>
                            <td>${data.motivo}</td>
                        </tr>
                    `;
                });
            }
            
            historyHTML += `</tbody></table>`;

            Utils.hideLoading();

            const modal = await Swal.fire({
                title: 'Historial de Cambios de Estado',
                html: historyHTML,
                width: '90%',
                confirmButtonText: 'Cerrar',
                willClose: () => {
                    AppState.isModalOpen = false;
                }
            });
            
            ticketManager.setActiveModal(modal);

        } catch (error) {
            console.error("Error cargando historial:", error);
            AppState.isModalOpen = false;
            Utils.hideLoading();
            Utils.showError("No se pudo cargar el historial de cambios.");
        }
    },
    
    async acceptTicket(ticketId) {
        try {
            Utils.showLoading('Aceptando ticket...');

            const userUid = AppState.userData.colaboradorId;
            const ticketRef = doc(db, 'ticketsmesa', ticketId);
            const ticketSnap = await getDoc(ticketRef);
            const ticketData = ticketSnap.data();

            if (!ticketData.colaboradores || !ticketData.colaboradores.includes(userUid)) {
                throw new Error('No eres un colaborador asignado a este ticket.');
            }

            const currentAccepted = ticketData.colaboradoresAceptados || [];
            if (currentAccepted.includes(userUid)) {
                Utils.hideLoading();
                Swal.fire({ 
                    icon: 'info', 
                    title: 'Ya Aceptado', 
                    text: 'Ya has aceptado este ticket.', 
                    confirmButtonColor: '#3085d6' 
                });
                return;
            }
            
            const newAccepted = [...currentAccepted, userUid];
            const totalColaboradores = ticketData.colaboradores.length;
            const oldStatus = ticketData.estado;
            
            let newStatus = oldStatus;
            let historyMotivo = `Colaborador individual aceptó el ticket.`;

            if (oldStatus === 'pendiente_de_aceptación' || oldStatus === 'pendiente') {
                if (newAccepted.length === totalColaboradores) {
                    newStatus = 'aceptado';
                    historyMotivo = 'Ticket aceptado por el último colaborador, cambiando estado a Aceptado.';
                } else {
                    newStatus = oldStatus;
                    historyMotivo = `Aceptación individual registrada (${newAccepted.length}/${totalColaboradores}).`;
                }
            }

            await updateDoc(ticketRef, {
                colaboradoresAceptados: newAccepted,
                fechaActualizacion: serverTimestamp()
            });

            if (newStatus !== oldStatus) {
                await updateDoc(ticketRef, {
                    estado: newStatus
                });
            }

            await this.recordHistory(
                ticketId,
                oldStatus,
                newStatus,
                historyMotivo,
                userUid,
                AppState.userData.NOMBRE
            );
            
            Utils.hideLoading();
            
            Swal.fire({
                icon: 'success',
                title: '¡Aceptación Registrada!',
                text: 'Tu aceptación ha sido registrada correctamente.',
                confirmButtonColor: '#3085d6'
            }).then(() => {
                // Recargar detalles del ticket
                TicketsController.showTicketDetails(ticketId);
            });

        } catch (error) {
            console.error('Error aceptando ticket:', error);
            Utils.showError('No se pudo aceptar el ticket: ' + error.message);
        }
    },

    async recordHistory(ticketId, oldStatus, newStatus, motivo, collaboratorId, collaboratorName) {
        try {
            const historyData = {
                ticketId: ticketId,
                fechaCambio: serverTimestamp(),
                colaboradorId: collaboratorId,
                colaboradorNombre: collaboratorName,
                estadoAnterior: oldStatus,
                estadoNuevo: newStatus,
                motivo: motivo || `Aceptación individual del colaborador`
            };
            
            await addDoc(collection(db, 'historialTicket'), historyData);
            console.log('Historial de ticket registrado exitosamente.');
        } catch (error) {
            console.error('Error registrando historial:', error);
        }
    },
    
    cleanupListeners() {
        // Limpiar todos los listeners de Firebase
        if (AppState.unsubscribe && typeof AppState.unsubscribe === 'function') {
            AppState.unsubscribe();
            AppState.unsubscribe = null;
        }
        
        // Limpiar listeners del DOM
        document.querySelectorAll('.action-btn.view').forEach(btn => {
            btn.removeEventListener('click', TicketsController.handleViewClick);
        });
        
        console.log('✅ Todos los listeners han sido limpiados');
    },
    
    setupRealtimeListener() {
        // Limpiar listener anterior
        this.cleanupListeners();
        
        if (!AppState.userData || !AppState.userData.colaboradorId) {
            console.log("No hay datos de usuario para configurar el listener en tiempo real.");
            return;
        }

        const ticketsRef = collection(db, 'ticketsmesa');
        const colaboradorId = AppState.userData.colaboradorId;

        const q = query(
            ticketsRef,
            where("colaboradores", "array-contains", colaboradorId)
        );

        AppState.unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("🔥 Evento de cambio en tickets detectado. Recargando tickets...");
            
            // Solo recargar si no hay modales abiertos
            if (!AppState.isModalOpen) {
                TicketsController.loadUserTickets();
            }
        }, (error) => {
            console.error("Error en el listener de tickets en tiempo real:", error);
        });

        console.log("✅ Listener de tickets en tiempo real configurado.");
    }
};

async function initializeAppLogic() {
    console.log('Inicializando lógica de la aplicación...');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('👤 Usuario autenticado detectado:', user.email);
            await TicketsController.loadUserTickets();
            TicketsController.setupRealtimeListener();
        } else {
            console.log('🚫 No hay usuario autenticado. Redirigiendo...');
            
            // Limpiar listeners antes de redirigir
            TicketsController.cleanupListeners();
            
            document.getElementById('mensajeAcceso').style.display = 'block';
            document.getElementById('mensajeAcceso').innerHTML = `<div style="color: red; padding: 20px; text-align: center;">Acceso denegado. Redirigiendo...</div>`;
            setTimeout(() => {
                window.location.replace('/vista/nav-visitantes/inicio-de-sesion.html');
            }, 3000);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, configurando listeners...');
    
    if (DOM.filterBtn) {
        // Remover listener anterior para evitar duplicados
        DOM.filterBtn.removeEventListener('click', handleFilterClick);
        DOM.filterBtn.addEventListener('click', handleFilterClick);
    }
    
    function handleFilterClick() {
        const showFinalized = ticketManager.toggleFilter();
        if (DOM.filterText) {
            DOM.filterText.textContent = showFinalized ? 'Ver Activos' : 'Ver Finalizados';
        }
        
        if (AppState.allTickets.length > 0) {
            TicketsController.renderTickets(AppState.allTickets);
        }
    }
    
    initializeAppLogic();
    
    // Limpiar al cerrar la página
    window.addEventListener('beforeunload', () => {
        TicketsController.cleanupListeners();
    });
    
    window.Swal = Swal;
    window.TicketsController = TicketsController;
    window.Utils = Utils;
    window.ticketManager = ticketManager;
});