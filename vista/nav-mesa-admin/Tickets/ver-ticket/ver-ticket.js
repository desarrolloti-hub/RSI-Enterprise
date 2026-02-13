// ============================================
// VER-TICKET.JS - Con validación automática de abandono
// ============================================

// ELEMENTOS DEL DOM
const DOM = {
    backBtn: document.getElementById('backBtn'),
    pageTitle: document.getElementById('pageTitle'),
    historyBtn: document.getElementById('historyBtn'),
    loadingContainer: document.getElementById('loadingContainer'),
    ticketDetailsContainer: document.getElementById('ticketDetailsContainer'),
    errorContainer: document.getElementById('errorContainer'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    imageModal: document.getElementById('imageModal'),
    modalImage: document.getElementById('modalImage'),
    closeImageModal: document.getElementById('closeImageModal')
};

// ESTADO DE LA APLICACIÓN
const AppState = {
    userData: null,
    currentTicket: null,
    ticketId: null,
    isModalOpen: false,
    db: null,
    timerInterval: null,
    abandonmentCheckInterval: null
};

// CONSTANTES DE TIEMPO
const TimeConstants = {
    MAX_TICKET_DURATION: 5 * 24 * 60 * 60 * 1000, // 5 días en milisegundos
    PAUSE_DURATION: 3 * 24 * 60 * 60 * 1000, // 3 días adicionales para pausa
    CHECK_INTERVAL: 60 * 1000 // Revisar cada minuto (60 segundos)
};

// UTILIDADES
const Utils = {
    showLoading: () => {
        if (DOM.loadingContainer) DOM.loadingContainer.style.display = 'block';
        if (DOM.ticketDetailsContainer) DOM.ticketDetailsContainer.style.display = 'none';
        if (DOM.errorContainer) DOM.errorContainer.style.display = 'none';
    },
    
    hideLoading: () => {
        if (DOM.loadingContainer) DOM.loadingContainer.style.display = 'none';
    },
    
    showError: (message) => {
        Utils.hideLoading();
        if (DOM.errorMessage) DOM.errorMessage.textContent = message;
        if (DOM.errorContainer) DOM.errorContainer.style.display = 'block';
        if (DOM.ticketDetailsContainer) DOM.ticketDetailsContainer.style.display = 'none';
    },
    
    showContent: () => {
        Utils.hideLoading();
        if (DOM.errorContainer) DOM.errorContainer.style.display = 'none';
        if (DOM.ticketDetailsContainer) DOM.ticketDetailsContainer.style.display = 'block';
    },
    
    formatDate: (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            let date;
            if (timestamp.toDate) {
                date = timestamp.toDate();
            } else if (timestamp.seconds) {
                date = new Date(timestamp.seconds * 1000);
            } else {
                return 'Fecha inválida';
            }
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
        if (!timestamp) return 'N/A';
        try {
            let date;
            if (timestamp.toDate) {
                date = timestamp.toDate();
            } else if (timestamp.seconds) {
                date = new Date(timestamp.seconds * 1000);
            } else {
                return 'Fecha inválida';
            }
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
    
    calculateAbandonmentTime: (creationTimestamp, status) => {
        if (!creationTimestamp) return { expired: true };
        
        let creationTime;
        try {
            if (creationTimestamp.toDate) {
                creationTime = creationTimestamp.toDate().getTime();
            } else if (timestamp.seconds) {
                creationTime = creationTimestamp.seconds * 1000;
            } else {
                return { expired: true };
            }
        } catch (error) {
            return { expired: true };
        }
        
        const now = Date.now();
        let maxDuration = TimeConstants.MAX_TICKET_DURATION;
        
        if (status === 'en_proceso') {
            maxDuration += TimeConstants.PAUSE_DURATION;
        }
        
        let remainingTime = creationTime + maxDuration - now;
        
        if (remainingTime <= 0) {
            return { expired: true };
        }
        
        const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        
        return {
            expired: false,
            days: days,
            hours: hours,
            minutes: minutes,
            totalMs: remainingTime
        };
    },
    
    checkAndUpdateAbandonmentStatus: async function(ticketId, ticketData) {
        try {
            // Solo verificar tickets que no estén en estado final
            const finalStatuses = ['finalizado', 'cerrado', 'cancelado', 'completado', 'abandono_de_actividades'];
            if (finalStatuses.includes(ticketData.estado)) {
                return false; // No hacer nada con tickets finalizados
            }
            
            const abandonmentTime = this.calculateAbandonmentTime(ticketData.fechaCreacion, ticketData.estado);
            
            if (abandonmentTime.expired) {
                console.log(`Ticket ${ticketId} ha expirado. Cambiando a estado de abandono...`);
                
                // Actualizar el estado del ticket a "abandono_de_actividades"
                const ticketRef = AppState.db.collection('ticketsmesa').doc(ticketId);
                
                await ticketRef.update({
                    estado: 'abandono_de_actividades',
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
                    motivoAbandono: 'Cambio automático por tiempo de inactividad excedido'
                });
                
                // Registrar en el historial
                await AppState.db.collection('historialTicket').add({
                    ticketId: ticketId,
                    fechaCambio: firebase.firestore.FieldValue.serverTimestamp(),
                    colaboradorId: 'sistema_automatico',
                    colaboradorNombre: 'Sistema Automático',
                    estadoAnterior: ticketData.estado,
                    estadoNuevo: 'abandono_de_actividades',
                    motivo: 'El ticket ha sido marcado como "Abandono de Actividades" automáticamente por exceder el tiempo máximo permitido sin actividad.'
                });
                
                console.log(`Ticket ${ticketId} actualizado a estado de abandono.`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Error verificando estado de abandono:', error);
            return false;
        }
    },
    
    getBadgeClass: (status) => {
        if (!status) return 'badge-info';
        switch(status.toLowerCase()) {
            case 'finalizado': 
            case 'cerrado': 
            case 'cancelado': 
            case 'completado':
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
        if (!status) return 'fa-question-circle';
        switch(status.toLowerCase()) {
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
        if (!priority) return 'priority-medium';
        switch(priority.toLowerCase()) {
            case 'alta': return 'priority-high';
            case 'media': return 'priority-medium';
            case 'baja': return 'priority-low';
            default: return 'priority-medium';
        }
    },
    
    showImageModal: (imageSrc) => {
        if (AppState.isModalOpen || !DOM.imageModal || !DOM.modalImage) return;
        
        AppState.isModalOpen = true;
        DOM.modalImage.src = imageSrc;
        DOM.imageModal.style.display = 'block';
    },
    
    closeImageModal: () => {
        AppState.isModalOpen = false;
        if (DOM.imageModal) {
            DOM.imageModal.style.display = 'none';
        }
    },
    
    // Función para iniciar la verificación periódica de abandono
    startAbandonmentCheck: function(ticketId, ticketData) {
        // Limpiar intervalo anterior si existe
        if (AppState.abandonmentCheckInterval) {
            clearInterval(AppState.abandonmentCheckInterval);
        }
        
        // Verificar inmediatamente al cargar
        this.checkAndUpdateAbandonmentStatus(ticketId, ticketData);
        
        // Configurar verificación periódica
        AppState.abandonmentCheckInterval = setInterval(async () => {
            try {
                // Obtener datos actualizados del ticket
                const ticketRef = AppState.db.collection('ticketsmesa').doc(ticketId);
                const ticketDoc = await ticketRef.get();
                
                if (ticketDoc.exists) {
                    const updatedData = ticketDoc.data();
                    const changed = await this.checkAndUpdateAbandonmentStatus(ticketId, updatedData);
                    
                    // Si el estado cambió, recargar la página
                    if (changed) {
                        console.log('Estado cambiado a abandono, recargando página...');
                        TicketController.loadTicketFromURL();
                    }
                }
            } catch (error) {
                console.error('Error en verificación periódica de abandono:', error);
            }
        }, TimeConstants.CHECK_INTERVAL);
    },
    
    // Función para detener la verificación de abandono
    stopAbandonmentCheck: function() {
        if (AppState.abandonmentCheckInterval) {
            clearInterval(AppState.abandonmentCheckInterval);
            AppState.abandonmentCheckInterval = null;
        }
    }
};

// TICKET CONTROLLER
const TicketController = {
    init: async function() {
        console.log('Inicializando controlador de ticket...');
        
        // Configurar Firebase desde firebase-init.js
        if (typeof firebaseInit !== 'undefined') {
            AppState.db = firebaseInit.db;
            console.log('Firebase configurado desde firebase-init.js');
        } else {
            // Fallback a Firebase global
            AppState.db = firebase.firestore();
            console.log('Firebase configurado desde global');
        }
        
        this.setupEventListeners();
        await this.loadUserData();
        await this.loadTicketFromURL();
    },
    
    setupEventListeners: function() {
        // Botón de regreso
        if (DOM.backBtn) {
            DOM.backBtn.addEventListener('click', () => window.history.back());
        }
        
        // Botón de historial
        if (DOM.historyBtn) {
            DOM.historyBtn.addEventListener('click', () => {
                if (AppState.ticketId) this.showTicketHistory();
            });
        }
        
        // Botón de reintentar
        if (DOM.retryBtn) {
            DOM.retryBtn.addEventListener('click', () => this.loadTicketFromURL());
        }
        
        // Modal de imágenes
        if (DOM.closeImageModal) {
            DOM.closeImageModal.addEventListener('click', Utils.closeImageModal);
        }
        
        if (DOM.imageModal) {
            DOM.imageModal.addEventListener('click', (e) => {
                if (e.target === DOM.imageModal) Utils.closeImageModal();
            });
        }
        
        // Cerrar modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && AppState.isModalOpen) {
                Utils.closeImageModal();
            }
        });
        
        // Limpiar intervalos al salir de la página
        window.addEventListener('beforeunload', () => {
            Utils.stopAbandonmentCheck();
        });
    },
    
    loadUserData: async function() {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('Usuario no autenticado');
            }
            
            const colaboradoresRef = AppState.db.collection('colaboradores');
            const querySnapshot = await colaboradoresRef
                .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email)
                .get();
            
            if (querySnapshot.empty) {
                throw new Error('No se encontraron tus datos de colaborador');
            }
            
            querySnapshot.forEach(doc => {
                AppState.userData = doc.data();
                AppState.userData.colaboradorId = doc.id;
                AppState.userData.nombreCompleto = AppState.userData.NOMBRE || AppState.userData['NOMBRE'] || 'Sin nombre';
                AppState.userData.NOMBRE = AppState.userData.NOMBRE || AppState.userData['NOMBRE'] || 'Sin nombre';
                AppState.userData.ÁREA = AppState.userData.ÁREA || AppState.userData['ÁREA'] || 'General';
            });
            
            console.log('Datos de usuario cargados:', AppState.userData.nombreCompleto);
            return true;
            
        } catch (error) {
            console.error('Error cargando datos de usuario:', error);
            Utils.showError('Error de autenticación: ' + error.message);
            setTimeout(() => {
                window.location.replace('/vista/nav-visitantes/inicio-de-sesion.html');
            }, 3000);
            return false;
        }
    },
    
    loadTicketFromURL: async function() {
        try {
            Utils.showLoading();
            
            const urlParams = new URLSearchParams(window.location.search);
            const ticketId = urlParams.get('ticketId');
            
            if (!ticketId) {
                throw new Error('No se especificó un ID de ticket');
            }
            
            AppState.ticketId = ticketId;
            await this.loadTicketDetails(ticketId);
            
        } catch (error) {
            console.error('Error cargando ticket:', error);
            Utils.showError('Error al cargar el ticket: ' + error.message);
        }
    },
    
    loadTicketDetails: async function(ticketId) {
        try {
            // Detener cualquier verificación previa
            Utils.stopAbandonmentCheck();
            
            const ticketRef = AppState.db.collection('ticketsmesa').doc(ticketId);
            const ticketDoc = await ticketRef.get();
            
            if (!ticketDoc.exists) {
                throw new Error('El ticket no existe o ha sido eliminado');
            }
            
            const data = ticketDoc.data();
            AppState.currentTicket = data;
            
            // Actualizar título con ID COMPLETO
            if (DOM.pageTitle) {
                DOM.pageTitle.textContent = `Ticket #${ticketId}`;
            }
            
            // VERIFICAR SI EL TICKET HA EXPIRADO
            const abandonmentTime = Utils.calculateAbandonmentTime(data.fechaCreacion, data.estado);
            const finalStatuses = ['finalizado', 'cerrado', 'cancelado', 'completado', 'abandono_de_actividades'];
            
            if (abandonmentTime.expired && !finalStatuses.includes(data.estado)) {
                console.log('Ticket expirado detectado, actualizando estado...');
                await Utils.checkAndUpdateAbandonmentStatus(ticketId, data);
                
                // Recargar datos después de la actualización
                const updatedDoc = await ticketRef.get();
                const updatedData = updatedDoc.data();
                AppState.currentTicket = updatedData;
                
                // Cargar datos adicionales
                await this.loadAdditionalData(updatedData, ticketId);
                
                // Renderizar
                this.renderTicketDetails(updatedData, ticketId);
                
                // Iniciar verificación periódica (aunque ya esté en abandono, por si acaso)
                Utils.startAbandonmentCheck(ticketId, updatedData);
            } else {
                // Cargar datos adicionales
                await this.loadAdditionalData(data, ticketId);
                
                // Renderizar
                this.renderTicketDetails(data, ticketId);
                
                // INICIAR VERIFICACIÓN PERIÓDICA DE ABANDONO
                if (!finalStatuses.includes(data.estado)) {
                    Utils.startAbandonmentCheck(ticketId, data);
                }
            }
            
            Utils.showContent();
            
        } catch (error) {
            console.error('Error cargando detalles:', error);
            throw error;
        }
    },
    
    loadAdditionalData: async function(ticketData, ticketId) {
        try {
            // Cargar nombres de colaboradores
            if (ticketData.colaboradores && ticketData.colaboradores.length > 0) {
                const colaboradoresPromises = ticketData.colaboradores.map(async colabId => {
                    const colabRef = AppState.db.collection('colaboradores').doc(colabId);
                    const colabDoc = await colabRef.get();
                    return colabDoc.exists ? { 
                        id: colabId, 
                        nombre: colabDoc.data().NOMBRE || colabDoc.data()['NOMBRE'] || 'Colaborador desconocido' 
                    } : { 
                        id: colabId, 
                        nombre: 'Colaborador desconocido' 
                    };
                });
                ticketData.nombresColaboradores = await Promise.all(colaboradoresPromises);
            }
            
            // Cargar evidencias
            const evidenciasSnapshot = await AppState.db.collection('evidenciatickets')
                .where("ticketId", "==", ticketId)
                .get();
            
            ticketData.evidencias = [];
            evidenciasSnapshot.forEach(doc => {
                ticketData.evidencias.push({ id: doc.id, ...doc.data() });
            });
            
        } catch (error) {
            console.warn('Error cargando datos adicionales:', error);
        }
    },
    
    renderTicketDetails: function(data, ticketId) {
        const userUid = AppState.userData?.colaboradorId;
        
        // Determinar estado del usuario
        const isColaborator = data.colaboradores && userUid && data.colaboradores.includes(userUid);
        const isAccepted = data.colaboradoresAceptados && userUid && data.colaboradoresAceptados.includes(userUid);
        const userEvidence = data.evidencias?.find(ev => ev.colaboradorId === userUid);
        const ticketEstaFinalizado = ['finalizado', 'cerrado', 'cancelado', 'completado', 'abandono_de_actividades']
            .includes(data.estado);
        
        // HTML de botones de acción
        let actionButtons = this.generateActionButtons(data, ticketId, userUid, isColaborator, isAccepted, userEvidence, ticketEstaFinalizado);
        
        // HTML de colaboradores
        const collaboratorsHTML = this.generateCollaboratorsHTML(data);
        
        // HTML de progreso
        const progressHTML = this.generateProgressHTML(data);
        
        // HTML de timer de abandono (SIEMPRE visible si aplica)
        const timerHTML = this.generateTimerHTML(data);
        
        // HTML de razón de pausa
        const pauseReasonHTML = this.generatePauseReasonHTML(data);
        
        // HTML de razón de abandono (si aplica)
        const abandonmentReasonHTML = this.generateAbandonmentReasonHTML(data);
        
        // HTML de evidencias del usuario
        const userEvidenceHTML = this.generateUserEvidenceHTML(userEvidence);
        
        // Construir HTML completo
        const html = `
            <!-- Información principal -->
            <div class="ticket-info-main">
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">ID Completo</span>
                        <span class="info-value">#${ticketId}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Estado</span>
                        <span class="info-value">
                            <span class="badge ${Utils.getBadgeClass(data.estado)}">
                                <i class="fas ${Utils.getStatusIcon(data.estado)}"></i> ${(data.estado || '').replace(/_/g, ' ')}
                            </span>
                        </span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Prioridad</span>
                        <span class="info-value">
                            <span class="badge badge-primary">
                                <span class="priority-indicator ${Utils.getPriorityClass(data.prioridad)}"></span>
                                ${data.prioridad || 'Media'}
                            </span>
                        </span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Área</span>
                        <span class="info-value">
                            <span class="badge badge-primary">
                                <i class="fas fa-layer-group"></i> ${data.area || 'General'}
                            </span>
                        </span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Responsable</span>
                        <span class="info-value">${data.responsableNombre || 'No asignado'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Fecha creación</span>
                        <span class="info-value">${Utils.formatDate(data.fechaCreacion)}</span>
                    </div>
                    
                    ${data.fechaActualizacion ? `
                    <div class="info-item">
                        <span class="info-label">Última actualización</span>
                        <span class="info-value">${Utils.formatDate(data.fechaActualizacion)}</span>
                    </div>
                    ` : ''}
                    
                    ${data.fechaFinalizacion ? `
                    <div class="info-item">
                        <span class="info-label">Fecha finalización</span>
                        <span class="info-value">${Utils.formatDate(data.fechaFinalizacion)}</span>
                    </div>
                    ` : ''}
                    
                    ${data.fechaAbandono ? `
                    <div class="info-item">
                        <span class="info-label">Fecha de abandono</span>
                        <span class="info-value">${Utils.formatDate(data.fechaAbandono)}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${timerHTML}
                ${pauseReasonHTML}
                ${abandonmentReasonHTML}
            </div>
            
            <!-- Colaboradores y aceptación -->
            ${collaboratorsHTML}
            
            <!-- Progreso de evidencias -->
            ${progressHTML}
            
            <!-- Descripción -->
            <div class="detail-section-ticket">
                <h3 class="section-title">
                    <i class="fas fa-align-left"></i> Descripción
                </h3>
                <div class="description-text">
                    ${data.descripcionActividades || 'Sin descripción'}
                </div>
            </div>
            
            <!-- Información adicional -->
            ${this.generateAdditionalInfoHTML(data)}
            
            <!-- Evidencias del usuario -->
            ${userEvidenceHTML}
            
            <!-- Botones de acción -->
            <div class="action-buttons-container">
                ${actionButtons}
            </div>
            
            <!-- Nota de verificación automática -->
            <div style="margin-top: 20px; padding: 10px; background-color: rgba(255, 255, 255, 0.05); border-radius: 8px; font-size: 0.85rem; color: #aaa; text-align: center;">
                <i class="fas fa-robot"></i>
                Los tickets inactivos por más de 5 días serán marcados como "Abandono de Actividades" en caso de requerir mas tiempo para el cierre de ticket comunicate con tu superior.
            </div>
        `;
        
        if (DOM.ticketDetailsContainer) {
            DOM.ticketDetailsContainer.innerHTML = html;
        }
        
        // Configurar listeners dinámicos
        this.setupDynamicEventListeners();
    },
    
    generateActionButtons: function(data, ticketId, userUid, isColaborator, isAccepted, userEvidence, ticketEstaFinalizado) {
        let buttons = '';
        
        if (isColaborator && !ticketEstaFinalizado) {
            // Botón de aceptar
            if (!isAccepted) {
                buttons += `
                    <button class="action-btn-ticket btn-primary" id="acceptTicketBtn">
                        <i class="fas fa-handshake"></i> Aceptar Ticket
                    </button>
                `;
            } else {
                buttons += `
                    <span class="badge badge-success" style="padding: 12px 20px;">
                        <i class="fas fa-check-double"></i> Aceptado
                    </span>
                `;
            }
            
            // Botón de finalizar/modificar
            if (isAccepted) {
                if (!userEvidence) {
                    buttons += `
                        <a href="/vista/nav-mesa-admin/Tickets/finalizar-ticket/finalizar-ticket.html?ticketId=${ticketId}" class="action-btn-ticket btn-success">
                            <i class="fas fa-check-circle"></i> Finalizar Ticket
                        </a>
                    `;
                } else {
                    buttons += `
                        <a href="/vista/nav-mesa-admin/Tickets/finalizar-ticket/finalizar-ticket.html?ticketId=${ticketId}&edit=true" class="action-btn-ticket btn-info">
                            <i class="fas fa-edit"></i> Modificar Finalización
                        </a>
                    `;
                }
            }
        }
        
        // Botón de historial (solo para responsable)
        if (AppState.userData && data.responsableNombre === AppState.userData.nombreCompleto) {
            buttons += `
                <button class="action-btn-ticket btn-info" id="showHistoryBtn">
                    <i class="fas fa-history"></i> Ver Historial Completo
                </button>
            `;
        }
        
        // Botón de cerrar
        buttons += `
            <button class="action-btn-ticket btn-danger" id="closeDetailsBtn">
                <i class="fas fa-times"></i> Cerrar
            </button>
        `;
        
        return buttons;
    },
    
    generateCollaboratorsHTML: function(data) {
        if (!data.colaboradores || data.colaboradores.length === 0) return '';
        
        const acceptanceDetails = (data.nombresColaboradores || []).map(colab => {
            const isColabAccepted = data.colaboradoresAceptados && 
                data.colaboradoresAceptados.includes(colab.id);
            
            let statusText = `Pendiente de aceptar`;
            let statusClass = 'pending';

            if (isColabAccepted) {
                statusText = `Aceptado`;
                statusClass = 'completed';
            }

            return `
                <div class="progress-item-ticket">
                    <span class="progress-name-ticket">${colab.nombre}</span>
                    <span class="progress-status-ticket">
                        <span class="status-badge-ticket status-${statusClass}">
                            <i class="fas ${isColabAccepted ? 'fa-check-circle' : 'fa-clock'}"></i>
                            ${statusText}
                        </span>
                    </span>
                </div>
            `;
        }).join('') || '';

        return `
            <div class="detail-section-ticket">
                <h3 class="section-title">
                    <i class="fas fa-users"></i> Estado de Aceptación Individual
                    <span style="font-size: 0.9rem; color: var(--text-color, #888);">
                        (${data.colaboradoresAceptados ? data.colaboradoresAceptados.length : 0}/${data.colaboradores.length})
                    </span>
                </h3>
                <div class="progress-container-ticket">
                    ${acceptanceDetails}
                </div>
            </div>
        `;
    },
    
    generateProgressHTML: function(data) {
        if (!data.colaboradores || data.colaboradores.length <= 1) return '';
        
        const progressDetails = (data.nombresColaboradores || []).map(colab => {
            const evidenciaColab = data.evidencias?.find(ev => ev.colaboradorId === colab.id);
            const completado = !!evidenciaColab;
            
            return `
                <div class="progress-item-ticket">
                    <span class="progress-name-ticket">${colab.nombre}</span>
                    <span class="progress-status-ticket">
                        <span class="status-badge-ticket ${completado ? 'status-completed' : 'status-pending'}">
                            <i class="fas ${completado ? 'fa-check-circle' : 'fa-clock'}"></i>
                            ${completado ? 'Completado' : 'Pendiente'}
                        </span>
                    </span>
                    ${completado ? `
                        <button class="action-btn-ticket btn-info view-evidence-btn" 
                                data-colab-id="${colab.id}" 
                                data-colab-nombre="${colab.nombre}">
                            <i class="fas fa-eye"></i> Ver Evidencia
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('') || '';

        return `
            <div class="detail-section-ticket">
                <h3 class="section-title">
                    <i class="fas fa-tasks"></i> Progreso de Evidencias
                </h3>
                <div class="progress-container-ticket">
                    ${progressDetails}
                </div>
            </div>
        `;
    },
    
    generateTimerHTML: function(data) {
        // SIEMPRE mostrar timer si el ticket no está finalizado
        const ticketFinalizado = ['finalizado', 'cerrado', 'cancelado', 'completado', 'abandono_de_actividades'].includes(data.estado);
        
        if (ticketFinalizado) {
            return ''; // No mostrar timer para tickets finalizados
        }
        
        if (data.estado === 'abandono_de_actividades') {
            return `
                <div class="abandonment-timer" style="border: 2px solid #dc3545; background-color: rgba(220, 53, 69, 0.1);">
                    <div class="timer-header">
                        <i class="fas fa-exclamation-triangle"></i> Estado de Alerta
                    </div>
                    <div class="timer-display" style="color: #dc3545;">
                        ¡TICKET EN ABANDONO DE ACTIVIDADES!
                    </div>
                    <div class="timer-subtext" style="font-size: 0.9rem; color: #dc3545; margin-top: 5px;">
                        (Cambio automático por tiempo de inactividad excedido)
                    </div>
                </div>
            `;
        }
        
        // Calcular tiempo de abandono para tickets activos
        const abandonmentTime = Utils.calculateAbandonmentTime(data.fechaCreacion, data.estado);
        
        let timerContent = '';
        let timerClass = '';
        
        if (abandonmentTime.expired) {
            timerContent = `
                <div class="timer-display" style="color: #dc3545;">
                    <i class="fas fa-exclamation-circle"></i> Tiempo expirado
                </div>
                <div class="timer-subtext" style="color: #dc3545; font-size: 0.9rem;">
                    El ticket será marcado como "Abandono de Actividades" en cualquier momento
                </div>
            `;
            timerClass = 'timer-expired';
        } else {
            // Calcular porcentaje de tiempo restante
            const totalDuration = data.estado === 'en_proceso' ? 
                TimeConstants.MAX_TICKET_DURATION + TimeConstants.PAUSE_DURATION : 
                TimeConstants.MAX_TICKET_DURATION;
            const percentage = Math.max(0, Math.min(100, (abandonmentTime.totalMs / totalDuration) * 100));
            
            // Determinar color según tiempo restante
            let barColor = '#28a745'; // Verde (mucho tiempo)
            if (percentage < 30) barColor = '#ffc107'; // Amarillo (poco tiempo)
            if (percentage < 10) barColor = '#dc3545'; // Rojo (muy poco tiempo)
            
            timerContent = `
                <div class="timer-display">
                    ${abandonmentTime.days} Días, ${abandonmentTime.hours} Horas, ${abandonmentTime.minutes} Minutos
                </div>
                <div class="progress" style="height: 8px; margin-top: 10px; background-color: rgba(255, 255, 255, 0.1); border-radius: 4px;">
                    <div class="progress-bar" role="progressbar" 
                         style="width: ${percentage}%; background-color: ${barColor}; border-radius: 4px;" 
                         aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                    </div>
                </div>
                <div class="timer-subtext" style="margin-top: 5px; font-size: 0.85rem; color: #aaa;">
                    Tiempo restante para cierre automático
                </div>
            `;
        }
        
        return `
            <div class="abandonment-timer ${timerClass}">
                <div class="timer-header">
                    <i class="fas fa-hourglass-half"></i> Cierre por Inactividad Automático
                </div>
                ${timerContent}
            </div>
        `;
    },
    
    generatePauseReasonHTML: function(data) {
        if (data.estado !== 'en_proceso' || !data.pauseComment) return '';
        
        return `
            <div style="margin-top: 20px; padding: 15px; border-left: 5px solid #fd7e14; background-color: rgba(253, 126, 20, 0.1); border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-weight: 600; color: #fd7e14;">
                    <i class="fas fa-pause-circle"></i> Razón de Pausa:
                </p>
                <p style="margin-top: 5px; font-style: italic;">${data.pauseComment}</p>
            </div>
        `;
    },
    
    generateAbandonmentReasonHTML: function(data) {
        if (data.estado !== 'abandono_de_actividades' || !data.motivoAbandono) return '';
        
        return `
            <div style="margin-top: 20px; padding: 15px; border-left: 5px solid #dc3545; background-color: rgba(220, 53, 69, 0.1); border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-weight: 600; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i> Razón de Abandono:
                </p>
                <p style="margin-top: 5px; font-style: italic;">${data.motivoAbandono}</p>
                ${data.fechaAbandono ? `
                    <p style="margin-top: 5px; font-size: 0.9rem; color: #aaa;">
                        <i class="fas fa-calendar-alt"></i> Fecha de cambio automático: ${Utils.formatDate(data.fechaAbandono)}
                    </p>
                ` : ''}
            </div>
        `;
    },
    
    generateUserEvidenceHTML: function(userEvidence) {
        if (!userEvidence) return '';
        
        const imagesHTML = userEvidence.imagenes && userEvidence.imagenes.length > 0 ? `
            <h4 style="margin-top: 20px; margin-bottom: 10px; color: var(--text-color, #f5f5f5);">Imágenes de evidencia:</h4>
            <div class="evidence-grid-ticket">
                ${userEvidence.imagenes.map((img, index) => `
                    <img src="${img}" 
                         class="evidence-image" 
                         data-image-src="${img}"
                         alt="Evidencia ${index + 1}"
                         onclick="Utils.showImageModal('${img}')">
                `).join('')}
            </div>
        ` : '';
        
        return `
            <div class="detail-section-ticket">
                <h3 class="section-title">
                    <i class="fas fa-file-upload"></i> Mis Evidencias
                </h3>
                <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    ${userEvidence.descripcion || 'Sin descripción'}
                </div>
                ${imagesHTML}
            </div>
        `;
    },
    
    generateAdditionalInfoHTML: function(data) {
        let html = '';
        let hasAdditionalInfo = false;
        
        // Información de servicio/proyecto
        if (data.servicio || data.proyecto || data.ordenServicio) {
            html += `
                <div class="detail-section-ticket">
                    <h3 class="section-title">
                        <i class="fas fa-info-circle"></i> Información del Servicio
                    </h3>
                    ${data.servicio ? `<p><strong>Servicio:</strong> ${data.servicio}</p>` : ''}
                    ${data.proyecto ? `<p><strong>Proyecto:</strong> ${data.proyecto}</p>` : ''}
                    ${data.ordenServicio ? `<p><strong>Orden de Servicio:</strong> ${data.ordenServicio}</p>` : ''}
                </div>
            `;
            hasAdditionalInfo = true;
        }
        
        // Información fiscal
        if (data.rfc || data.direccionFiscal || data.cuenta) {
            html += `
                <div class="detail-section-ticket">
                    <h3 class="section-title">
                        <i class="fas fa-file-invoice-dollar"></i> Información Fiscal
                    </h3>
                    ${data.rfc ? `<p><strong>RFC:</strong> ${data.rfc}</p>` : ''}
                    ${data.direccionFiscal ? `<p><strong>Dirección Fiscal:</strong> ${data.direccionFiscal}</p>` : ''}
                    ${data.cuenta ? `<p><strong>Cuenta:</strong> ${data.cuenta}</p>` : ''}
                </div>
            `;
            hasAdditionalInfo = true;
        }
        
        // Sistemas relacionados
        if (data.sistemas && Object.keys(data.sistemas).length > 0) {
            html += `
                <div class="detail-section-ticket">
                    <h3 class="section-title">
                        <i class="fas fa-laptop-code"></i> Sistemas Relacionados
                    </h3>
                    <ul style="list-style-type: none; padding-left: 0;">
                        ${Object.entries(data.sistemas).map(([key, value]) => `
                            <li style="padding: 5px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                <strong>${key}:</strong> ${value}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
            hasAdditionalInfo = true;
        }
        
        return hasAdditionalInfo ? html : '';
    },
    
    setupDynamicEventListeners: function() {
        // Botón de aceptar ticket
        const acceptBtn = document.getElementById('acceptTicketBtn');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                this.acceptTicket();
            });
        }
        
        // Botón de ver historial
        const historyBtn = document.getElementById('showHistoryBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.showTicketHistory();
            });
        }
        
        // Botón de cerrar
        const closeBtn = document.getElementById('closeDetailsBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                window.history.back();
            });
        }
        
        // Botones de ver evidencia de colaboradores
        document.querySelectorAll('.view-evidence-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const colabId = e.currentTarget.dataset.colabId;
                const colabNombre = e.currentTarget.dataset.colabNombre;
                this.showCollaboratorEvidence(colabId, colabNombre);
            });
        });
    },
    
    async acceptTicket() {
        try {
            const result = await Swal.fire({
                title: '¿Aceptar ticket?',
                text: '¿Estás seguro de que deseas aceptar este ticket?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, aceptar',
                cancelButtonText: 'Cancelar'
            });
            
            if (!result.isConfirmed) return;
            
            const loadingSwal = Swal.fire({
                title: 'Aceptando ticket...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            const userUid = AppState.userData.colaboradorId;
            const ticketRef = AppState.db.collection('ticketsmesa').doc(AppState.ticketId);
            
            // Obtener datos actuales
            const ticketDoc = await ticketRef.get();
            const ticketData = ticketDoc.data();
            
            if (!ticketData.colaboradores || !ticketData.colaboradores.includes(userUid)) {
                throw new Error('No eres colaborador de este ticket');
            }
            
            const currentAccepted = ticketData.colaboradoresAceptados || [];
            if (currentAccepted.includes(userUid)) {
                await loadingSwal.close();
                Swal.fire({ 
                    icon: 'info', 
                    title: 'Ya Aceptado', 
                    text: 'Ya has aceptado este ticket.' 
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
                    historyMotivo = `Aceptación individual registrada (${newAccepted.length}/${totalColaboradores}).`;
                }
            }
            
            // Actualizar ticket
            await ticketRef.update({
                colaboradoresAceptados: newAccepted,
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            if (newStatus !== oldStatus) {
                await ticketRef.update({
                    estado: newStatus
                });
            }
            
            // Registrar en historial
            await AppState.db.collection('historialTicket').add({
                ticketId: AppState.ticketId,
                fechaCambio: firebase.firestore.FieldValue.serverTimestamp(),
                colaboradorId: userUid,
                colaboradorNombre: AppState.userData.nombreCompleto,
                estadoAnterior: oldStatus,
                estadoNuevo: newStatus,
                motivo: historyMotivo
            });
            
            await loadingSwal.close();
            
            Swal.fire({
                icon: 'success',
                title: '¡Aceptación Registrada!',
                text: 'Tu aceptación ha sido registrada correctamente.',
                confirmButtonColor: '#3085d6'
            }).then(() => {
                // Recargar la página
                this.loadTicketFromURL();
            });
            
        } catch (error) {
            console.error('Error aceptando ticket:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo aceptar el ticket: ' + error.message
            });
        }
    },
    
    async showCollaboratorEvidence(colabId, colabNombre) {
        try {
            const loadingSwal = Swal.fire({
                title: 'Cargando evidencias...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            const evidenciasSnapshot = await AppState.db.collection('evidenciatickets')
                .where("ticketId", "==", AppState.ticketId)
                .where("colaboradorId", "==", colabId)
                .get();
            
            await loadingSwal.close();
            
            if (evidenciasSnapshot.empty) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin Evidencias',
                    text: `${colabNombre} no ha subido evidencias aún.`,
                    confirmButtonColor: '#3085d6'
                });
                return;
            }
            
            const evidencia = evidenciasSnapshot.docs[0].data();
            
            let imagesHTML = '';
            if (evidencia.imagenes && evidencia.imagenes.length > 0) {
                imagesHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 15px;">
                        ${evidencia.imagenes.map((img, index) => `
                            <img src="${img}" 
                                 style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; cursor: pointer;" 
                                 onclick="Utils.showImageModal('${img}')"
                                 alt="Evidencia ${index + 1} de ${colabNombre}">
                        `).join('')}
                    </div>
                `;
            }
            
            Swal.fire({
                title: `Evidencias de ${colabNombre}`,
                html: `
                    <div style="text-align: left;">
                        <p><strong>Descripción:</strong></p>
                        <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; color: #333;">
                            ${evidencia.descripcion || 'Sin descripción'}
                        </div>
                        ${evidencia.imagenes && evidencia.imagenes.length > 0 ? 
                            `<p><strong>Imágenes:</strong></p>` : ''}
                        ${imagesHTML}
                    </div>
                `,
                width: '80%',
                showConfirmButton: true,
                confirmButtonText: 'Cerrar'
            });
            
        } catch (error) {
            console.error("Error mostrando evidencias:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar las evidencias del colaborador.'
            });
        }
    },
    
    async showTicketHistory() {
        try {
            const loadingSwal = Swal.fire({
                title: 'Cargando historial...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            const historySnapshot = await AppState.db.collection('historialTicket')
                .where("ticketId", "==", AppState.ticketId)
                .orderBy("fechaCambio", "desc")
                .get();
            
            let historyDataArray = [];
            historySnapshot.forEach(doc => {
                historyDataArray.push({ id: doc.id, ...doc.data() });
            });
            
            await loadingSwal.close();
            
            let historyHTML = `
                <style>
                    .history-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 15px; 
                        font-size: 0.9em; 
                    }
                    .history-table th, .history-table td { 
                        padding: 8px; 
                        text-align: left; 
                        border-bottom: 1px solid #ddd; 
                    }
                    .history-table th { 
                        background-color: #f2f2f2; 
                        color: #333; 
                        font-weight: bold; 
                    }
                    .status-badge { 
                        padding: 4px 8px; 
                        border-radius: 12px; 
                        font-weight: bold; 
                        color: white; 
                    }
                    
                    @media (max-width: 768px) {
                        .history-table thead { display: none; }
                        .history-table tbody, .history-table tr { display: block; width: 100%; }
                        .history-table tr { 
                            margin-bottom: 15px; 
                            border: 1px solid rgba(255, 255, 255, 0.2); 
                            border-radius: 8px; 
                            padding: 10px; 
                        }
                        .history-table td { 
                            display: block; 
                            text-align: right !important; 
                            padding-left: 50% !important; 
                            position: relative; 
                            border-bottom: none; 
                        }
                        .history-table td::before { 
                            content: attr(data-label); 
                            position: absolute; 
                            left: 10px; 
                            width: 45%; 
                            padding-right: 10px; 
                            white-space: nowrap; 
                            font-weight: bold; 
                            text-align: left; 
                            color: #e74c3c; 
                        }
                        .history-table tr td:nth-of-type(1)::before { content: "Fecha/Hora:"; }
                        .history-table tr td:nth-of-type(2)::before { content: "Est. Anterior:"; }
                        .history-table tr td:nth-of-type(3)::before { content: "Est. Nuevo:"; }
                        .history-table tr td:nth-of-type(4)::before { content: "Colaborador:"; }
                        .history-table tr td:nth-of-type(5)::before { content: "Motivo:"; }
                    }
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
                    const estadoAnterior = data.estadoAnterior || 'Desconocido';
                    const estadoNuevo = data.estadoNuevo || 'Desconocido';
                    
                    historyHTML += `
                        <tr>
                            <td data-label="Fecha/Hora">${date}</td>
                            <td data-label="Estado Anterior">
                                <span class="status-badge" style="background-color: ${Utils.getBadgeClass(estadoAnterior) === 'badge-success' ? '#28a745' : 
                                    Utils.getBadgeClass(estadoAnterior) === 'badge-danger' ? '#dc3545' : 
                                    Utils.getBadgeClass(estadoAnterior) === 'badge-warning' ? '#ffc107' : '#17a2b8'}">
                                    ${estadoAnterior.replace(/_/g, ' ')}
                                </span>
                            </td>
                            <td data-label="Estado Nuevo">
                                <span class="status-badge" style="background-color: ${Utils.getBadgeClass(estadoNuevo) === 'badge-success' ? '#28a745' : 
                                    Utils.getBadgeClass(estadoNuevo) === 'badge-danger' ? '#dc3545' : 
                                    Utils.getBadgeClass(estadoNuevo) === 'badge-warning' ? '#ffc107' : '#17a2b8'}">
                                    ${estadoNuevo.replace(/_/g, ' ')}
                                </span>
                            </td>
                            <td data-label="Colaborador">${data.colaboradorNombre || 'Sistema'}</td>
                            <td data-label="Motivo">${data.motivo || 'Sin motivo especificado'}</td>
                        </tr>
                    `;
                });
            }
            
            historyHTML += `</tbody></table>`;
            
            Swal.fire({
                title: 'Historial de Cambios de Estado',
                html: historyHTML,
                width: '90%',
                confirmButtonText: 'Cerrar'
            });
            
        } catch (error) {
            console.error("Error cargando historial:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar el historial de cambios.'
            });
        }
    }
};

// INICIALIZACIÓN DE LA APLICACIÓN
function initializeApp() {
    console.log('Inicializando aplicación de visualización de ticket...');
    
    // Verificar autenticación
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('Usuario autenticado:', user.email);
            await TicketController.init();
        } else {
            console.log('Usuario no autenticado. Redirigiendo...');
            const mensajeAcceso = document.getElementById('mensajeAcceso');
            if (mensajeAcceso) {
                mensajeAcceso.style.display = 'block';
                mensajeAcceso.innerHTML = `
                    <div style="color: red; padding: 20px; text-align: center;">
                        Acceso denegado. Redirigiendo a inicio de sesión...
                    </div>
                `;
            }
            setTimeout(() => {
                window.location.replace('/vista/nav-visitantes/inicio-de-sesion.html');
            }, 3000);
        }
    });
}

// INICIAR CUANDO EL DOM ESTÉ LISTO
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// EXPORTAR FUNCIONALIDADES
window.TicketController = TicketController;
window.Utils = Utils;