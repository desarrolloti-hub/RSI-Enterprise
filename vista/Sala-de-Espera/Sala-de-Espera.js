// Sala-de-Espera.js - VERSIÓN FINAL CON ROLES

// ============================================
// CONFIGURACIÓN FIREBASE
// ============================================
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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================
const AppState = {
    currentUser: null,
    colaboradorData: null,
    tickets: [],
    metrics: {
        efficiency: 0,
        hoursToday: 4.5,
        pendingTickets: 0,
        closedTickets: 0,
        totalTickets: 0,
        inProgress: 0,
        completed: 0
    },
    charts: {},
    attendanceTime: { hours: 8, minutes: 30 }
};

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const DOM = {
    motivationalScreen: document.getElementById('motivationalScreen'),
    waitingRoomScreen: document.getElementById('waitingRoomScreen'),
    verEficienciaBtn: document.getElementById('verEficienciaBtn'),
    attendanceBtn: document.getElementById('attendanceBtn'),
    
    userName: document.getElementById('userName'),
    userRole: document.getElementById('userRole'),
    userEmail: document.getElementById('userEmail'),
    userAvatar: document.getElementById('userAvatar'),
    
    hoursUntil: document.getElementById('hoursUntil'),
    minutesUntil: document.getElementById('minutesUntil'),
    secondsUntil: document.getElementById('secondsUntil'),
    
    efficiencyValue: document.getElementById('efficiencyValue'),
    efficiencyBar: document.getElementById('efficiencyBar'),
    efficiencyVsGoal: document.getElementById('efficiencyVsGoal'),
    hoursToday: document.getElementById('hoursToday'),
    hoursBar: document.getElementById('hoursBar'),
    hoursRemaining: document.getElementById('hoursRemaining'),
    pendingTickets: document.getElementById('pendingTickets'),
    closedTickets: document.getElementById('closedTickets'),
    
    statusChart: document.getElementById('statusChart'),
    distributionChart: document.getElementById('distributionChart'),
    performanceChart: document.getElementById('performanceChart'),
    pendingMiniChart: document.getElementById('pendingMiniChart'),
    closedMiniChart: document.getElementById('closedMiniChart'),
    
    recentTicketsBody: document.getElementById('recentTicketsBody'),
    mobileTicketsContainer: document.getElementById('mobileTicketsContainer')
};

// ============================================
// FUNCIONES DE LOCAL STORAGE
// ============================================
function getUserFromLocalStorage() {
    try {
        const sessionData = localStorage.getItem('rsi_session');
        if (sessionData) {
            return JSON.parse(sessionData);
        }
        
        return {
            uid: localStorage.getItem('userUID'),
            email: localStorage.getItem('userEmail'),
            nombreCompleto: localStorage.getItem('userName'),
            rol: localStorage.getItem('userRole')
        };
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        return null;
    }
}

function getColaboradorDataFromLocalStorage() {
    try {
        const data = localStorage.getItem('colaboradorData');
        if (data) {
            const parsed = JSON.parse(data);
            console.log('📦 Datos de colaborador desde localStorage:', parsed);
            return parsed;
        }
        return null;
    } catch (error) {
        console.error('Error al obtener colaborador:', error);
        return null;
    }
}

// ============================================
// MANEJADOR DE ROLES (NUEVO)
// ============================================
function getAsistenciaUrl() {
    const user = AppState.currentUser || getUserFromLocalStorage();
    const rol = user?.rol || 'colaborador';
    
    console.log('🎯 Rol detectado para asistencia:', rol);
    
    if (rol === 'admincolaborador') {
        return '/vista/nav-mesa-admin/asistencia/asistencia.html';
    } else {
        return '/vista/nav-mesa-operadores/asistencia/asistencia.html';
    }
}

function updateAttendanceButton() {
    if (DOM.attendanceBtn) {
        DOM.attendanceBtn.href = getAsistenciaUrl();
        console.log('✅ Botón de asistencia actualizado a:', DOM.attendanceBtn.href);
    }
}

// ============================================
// UTILIDADES
// ============================================
const Utils = {
    formatNumber: (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    
    calculateEfficiency: (total, completados) => {
        if (total === 0) return 0;
        return Math.round((completados / total) * 100);
    },
    
    formatDate: (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    },
    
    safeToDate: (timestamp) => {
        if (!timestamp) return null;
        return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    },
    
    getBadgeClass: (status) => {
        const map = { 
            finalizado: 'badge-success', 
            cerrado: 'badge-success',
            cancelado: 'badge-danger',
            abandono_de_actividades: 'badge-danger',
            en_proceso: 'badge-warning',
            en_camino: 'badge-primary',
            pendiente: 'badge-danger',
            pendiente_de_aceptación: 'badge-danger',
            aceptado: 'badge-info'
        };
        return map[status] || 'badge-info';
    },
    
    getStatusIcon: (status) => {
        const map = {
            finalizado: 'fa-check-circle',
            cerrado: 'fa-check-circle',
            cancelado: 'fa-times-circle',
            abandono_de_actividades: 'fa-exclamation-triangle',
            en_proceso: 'fa-pause-circle',
            en_camino: 'fa-truck',
            pendiente: 'fa-clock',
            pendiente_de_aceptación: 'fa-clock',
            aceptado: 'fa-check'
        };
        return map[status] || 'fa-question-circle';
    },
    
    getPriorityClass: (priority) => {
        const map = { alta: 'priority-high', media: 'priority-medium', baja: 'priority-low' };
        return map[priority] || 'priority-medium';
    },
    
    isFinalized: (status) => {
        const finalizedStates = ['finalizado', 'cerrado', 'cancelado', 'completado', 'abandono_de_actividades'];
        return finalizedStates.includes(status);
    }
};

// ============================================
// CARGA DE DATOS DEL COLABORADOR
// ============================================
async function loadCollaboratorData() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.warn('Usuario no autenticado');
            
            const localColab = getColaboradorDataFromLocalStorage();
            if (localColab) {
                AppState.colaboradorData = localColab;
                console.log('✅ Usando datos de colaborador desde localStorage');
                renderUserProfile();
                updateAttendanceButton();
                return true;
            }
            return false;
        }

        console.log('🔍 Buscando colaborador con email:', user.email);
        
        const colaboradoresRef = db.collection('colaboradores');
        const q = colaboradoresRef.where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email);
        const snapshot = await q.get();
        
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();
            
            AppState.colaboradorData = {
                id: doc.id,
                ...data,
                nombreCompleto: data.NOMBRE || data.nombre,
                NOMBRE: data.NOMBRE || data.nombre,
                imagen: data.imagen || data.foto || null
            };
            
            console.log('✅ Colaborador encontrado:', AppState.colaboradorData);
            console.log('🖼️ Imagen:', AppState.colaboradorData.imagen);
            
            try {
                localStorage.setItem('colaboradorData', JSON.stringify(AppState.colaboradorData));
            } catch (e) {
                console.warn('No se pudo guardar en localStorage');
            }
            
            renderUserProfile();
            updateAttendanceButton();
            return true;
        } else {
            console.warn('No se encontró colaborador con ese email');
            
            const localColab = getColaboradorDataFromLocalStorage();
            if (localColab) {
                AppState.colaboradorData = localColab;
                renderUserProfile();
                updateAttendanceButton();
                return true;
            }
            return false;
        }
    } catch (error) {
        console.error('Error cargando colaborador:', error);
        
        const localColab = getColaboradorDataFromLocalStorage();
        if (localColab) {
            AppState.colaboradorData = localColab;
            renderUserProfile();
            updateAttendanceButton();
            return true;
        }
        return false;
    }
}

// ============================================
// RENDERIZADO DE PERFIL
// ============================================
function renderUserProfile() {
    const colaborador = AppState.colaboradorData;
    const user = AppState.currentUser || getUserFromLocalStorage();
    
    // Nombre
    DOM.userName.textContent = colaborador?.NOMBRE || 
                               colaborador?.nombreCompleto || 
                               user?.nombreCompleto || 
                               'Usuario';
    
    // Email
    DOM.userEmail.textContent = user?.email || 
                                colaborador?.['CORREO ELECTRÓNICO EMPRESARIAL'] || 
                                'correo@ejemplo.com';
    
    // Rol
    let roleText = 'Colaborador';
    if (user?.rol === 'admincolaborador') roleText = 'Administrador';
    else if (user?.rol === 'colaborador') roleText = 'Colaborador';
    DOM.userRole.textContent = roleText;
    
    // Imagen
    let imagenUrl = '/vista/css/img/Logo-RSI-OFICIAL.png';
    
    if (colaborador?.imagen) {
        imagenUrl = colaborador.imagen;
        console.log('🖼️ Usando imagen del campo "imagen":', imagenUrl);
    } else if (colaborador?.foto) {
        imagenUrl = colaborador.foto;
        console.log('🖼️ Usando imagen del campo "foto":', imagenUrl);
    } else if (colaborador?.avatar) {
        imagenUrl = colaborador.avatar;
        console.log('🖼️ Usando imagen del campo "avatar":', imagenUrl);
    } else if (colaborador?.fotoPerfil) {
        imagenUrl = colaborador.fotoPerfil;
        console.log('🖼️ Usando imagen del campo "fotoPerfil":', imagenUrl);
    }
    
    DOM.userAvatar.src = imagenUrl;
    console.log('🖼️ Imagen asignada:', DOM.userAvatar.src);
    
    DOM.userAvatar.onerror = function() {
        console.log('⚠️ Error cargando imagen, usando default');
        this.src = '/vista/css/img/Logo-RSI-OFICIAL.png';
    };
}

// ============================================
// CARGA DE TICKETS
// ============================================
async function loadUserTickets() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.warn('Usuario no autenticado en Firebase');
            return;
        }

        console.log('🔍 Cargando tickets para:', user.email);

        if (!AppState.colaboradorData) {
            await loadCollaboratorData();
        }

        const colaboradorData = AppState.colaboradorData;
        if (!colaboradorData) {
            console.warn('No hay datos de colaborador');
            return;
        }

        const ticketsRef = db.collection('ticketsmesa');
        const nombreResponsable = colaboradorData.NOMBRE || colaboradorData.nombreCompleto;
        const colaboradorId = colaboradorData.id;

        console.log('🎯 Buscando por responsable:', nombreResponsable);
        console.log('🎯 Buscando por ID:', colaboradorId);

        let snapshotResponsable, snapshotColaborador;
        
        try {
            snapshotResponsable = await ticketsRef
                .where("responsableNombre", "==", nombreResponsable)
                .orderBy("fechaCreacion", "desc")
                .get();
        } catch (e) {
            console.log('⚠️ Error con orderBy, intentando sin orden');
            snapshotResponsable = await ticketsRef
                .where("responsableNombre", "==", nombreResponsable)
                .get();
        }

        try {
            snapshotColaborador = await ticketsRef
                .where("colaboradores", "array-contains", colaboradorId)
                .orderBy("fechaCreacion", "desc")
                .get();
        } catch (e) {
            console.log('⚠️ Error con orderBy, intentando sin orden');
            snapshotColaborador = await ticketsRef
                .where("colaboradores", "array-contains", colaboradorId)
                .get();
        }
        
        const ticketsMap = new Map();
        
        snapshotResponsable.forEach(doc => {
            ticketsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
        
        snapshotColaborador.forEach(doc => {
            if (!ticketsMap.has(doc.id)) {
                ticketsMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
        });
        
        AppState.tickets = Array.from(ticketsMap.values());
        console.log(`✅ Tickets cargados: ${AppState.tickets.length}`);
        
        calculateMetrics();
        renderMetrics();
        renderRecentTickets();
        renderMobileTickets();
        initCharts();
        
    } catch (error) {
        console.error('❌ Error cargando tickets:', error);
    }
}

// ============================================
// CÁLCULO DE MÉTRICAS
// ============================================
function calculateMetrics() {
    const tickets = AppState.tickets;
    
    const completed = tickets.filter(t => Utils.isFinalized(t.estado)).length;
    const inProgress = tickets.filter(t => t.estado === 'en_proceso' || t.estado === 'en_camino' || t.estado === 'aceptado').length;
    const pending = tickets.filter(t => t.estado === 'pendiente' || t.estado === 'pendiente_de_aceptación').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const closedToday = tickets.filter(t => {
        if (!t.fechaFinalizacion) return false;
        try {
            const fechaFin = Utils.safeToDate(t.fechaFinalizacion);
            return fechaFin >= today && Utils.isFinalized(t.estado);
        } catch {
            return false;
        }
    }).length;

    const efficiency = Utils.calculateEfficiency(tickets.length, completed);

    AppState.metrics = {
        efficiency,
        hoursToday: 4.5,
        pendingTickets: pending,
        closedTickets: closedToday,
        totalTickets: tickets.length,
        inProgress,
        completed
    };

    console.log('📊 Métricas:', AppState.metrics);
}

// ============================================
// RENDERIZADO DE MÉTRICAS
// ============================================
function renderMetrics() {
    const m = AppState.metrics;
    
    DOM.efficiencyValue.textContent = m.efficiency + '%';
    DOM.efficiencyBar.style.width = m.efficiency + '%';
    
    const vsGoal = m.efficiency - 80;
    DOM.efficiencyVsGoal.textContent = vsGoal >= 0 ? `+${vsGoal}%` : `${vsGoal}%`;
    DOM.efficiencyVsGoal.style.color = vsGoal >= 0 ? '#28a745' : '#dc3545';
    
    DOM.hoursToday.textContent = m.hoursToday.toFixed(1);
    const hoursPercent = (m.hoursToday / 8) * 100;
    DOM.hoursBar.style.width = hoursPercent + '%';
    
    const remaining = 8 - m.hoursToday;
    DOM.hoursRemaining.textContent = `Restan ${remaining.toFixed(1)}h`;
    
    DOM.pendingTickets.textContent = m.pendingTickets;
    DOM.closedTickets.textContent = m.closedTickets;
}

// ============================================
// RENDERIZADO DE TICKETS (TABLA)
// ============================================
function renderRecentTickets() {
    const tickets = AppState.tickets;
    
    if (!DOM.recentTicketsBody) return;
    
    if (tickets.length === 0) {
        DOM.recentTicketsBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-inbox fa-3x" style="margin-bottom: 15px; opacity: 0.5;"></i>
                    <h3>No hay tickets asignados</h3>
                </td>
            </tr>
        `;
        
        renderMobileTickets();
        return;
    }
    
    const recent = [...tickets]
        .sort((a, b) => {
            const dateA = Utils.safeToDate(a.fechaCreacion) || new Date(0);
            const dateB = Utils.safeToDate(b.fechaCreacion) || new Date(0);
            return dateB - dateA;
        })
        .slice(0, 10);
    
    DOM.recentTicketsBody.innerHTML = recent.map(ticket => {
        const estado = ticket.estado || 'N/A';
        const prioridad = ticket.prioridad || 'N/A';
        const fecha = ticket.fechaCreacion ? Utils.formatDate(ticket.fechaCreacion) : 'N/A';
        
        return `
            <tr>
                <td><strong>${ticket.id?.substring(0, 8) || 'N/A'}</strong></td>
                <td>${ticket.titulo || 'Sin título'}</td>
                <td><span class="badge ${Utils.getBadgeClass(estado)}"><i class="fas ${Utils.getStatusIcon(estado)}"></i> ${estado.replace(/_/g, ' ')}</span></td>
                <td><span class="priority-indicator ${Utils.getPriorityClass(prioridad)}"></span> ${prioridad}</td>
                <td>${fecha}</td>
            </tr>
        `;
    }).join('');
    
    renderMobileTickets();
}

// ============================================
// RENDERIZADO DE TARJETAS MÓVILES
// ============================================
function renderMobileTickets() {
    const tickets = AppState.tickets;
    const mobileContainer = DOM.mobileTicketsContainer;
    
    if (!mobileContainer) {
        console.warn('No se encontró el contenedor de tarjetas móviles');
        return;
    }
    
    if (tickets.length === 0) {
        mobileContainer.innerHTML = `
            <div class="ticket-mobile-card" style="text-align: center; padding: 30px;">
                <i class="fas fa-inbox fa-3x" style="color: #ccc; margin-bottom: 15px;"></i>
                <h3 style="color: #666;">No hay tickets asignados</h3>
            </div>
        `;
        return;
    }
    
    const recent = [...tickets]
        .sort((a, b) => {
            const dateA = Utils.safeToDate(a.fechaCreacion) || new Date(0);
            const dateB = Utils.safeToDate(b.fechaCreacion) || new Date(0);
            return dateB - dateA;
        })
        .slice(0, 10);
    
    mobileContainer.innerHTML = recent.map(ticket => {
        const estado = ticket.estado || 'N/A';
        const prioridad = ticket.prioridad || 'N/A';
        const fecha = ticket.fechaCreacion ? Utils.formatDate(ticket.fechaCreacion) : 'N/A';
        
        let estadoClass = Utils.getBadgeClass(estado);
        let estadoIcon = Utils.getStatusIcon(estado);
        let estadoTexto = estado.replace(/_/g, ' ');
        
        return `
            <div class="ticket-mobile-card">
                <div class="ticket-mobile-header">
                    <span class="ticket-mobile-id">#${ticket.id?.substring(0, 8) || 'N/A'}</span>
                    <span class="badge ${estadoClass}">
                        <i class="fas ${estadoIcon}"></i> ${estadoTexto}
                    </span>
                </div>
                
                <div class="ticket-mobile-title">${ticket.titulo || 'Sin título'}</div>
                
                <div class="ticket-mobile-details">
                    <div class="ticket-mobile-row">
                        <span class="ticket-mobile-label">Prioridad:</span>
                        <span class="ticket-mobile-value">
                            <span class="priority-indicator ${Utils.getPriorityClass(prioridad)}"></span>
                            ${prioridad}
                        </span>
                    </div>
                    
                    <div class="ticket-mobile-row">
                        <span class="ticket-mobile-label">Fecha:</span>
                        <span class="ticket-mobile-value">${fecha}</span>
                    </div>
                    
                    <div class="ticket-mobile-row">
                        <span class="ticket-mobile-label">Área:</span>
                        <span class="ticket-mobile-value">${ticket.area || 'General'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// GRÁFICAS
// ============================================
function initCharts() {
    Object.values(AppState.charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') chart.destroy();
    });
    
    setTimeout(() => {
        try {
            const m = AppState.metrics;
            
            if (DOM.statusChart) {
                const ctx = DOM.statusChart.getContext('2d');
                AppState.charts.statusChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Finalizados', 'En Proceso', 'Pendientes'],
                        datasets: [{
                            data: [m.completed, m.inProgress, m.pendingTickets],
                            backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
            }
            
            if (DOM.distributionChart) {
                const ctx = DOM.distributionChart.getContext('2d');
                AppState.charts.distributionChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Pendientes', 'En Proceso', 'Finalizados'],
                        datasets: [{
                            label: 'Tickets',
                            data: [m.pendingTickets, m.inProgress, m.completed],
                            backgroundColor: ['#dc3545', '#ffc107', '#28a745'],
                            borderRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            }
            
            if (DOM.performanceChart) {
                const ctx = DOM.performanceChart.getContext('2d');
                AppState.charts.performanceChart = new Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: ['Eficiencia', 'Cumplimiento', 'Rapidez', 'Calidad', 'Productividad'],
                        datasets: [{
                            label: 'Rendimiento',
                            data: [
                                m.efficiency,
                                Math.min(100, (m.completed / 5) * 100) || 0,
                                75, 70, 80
                            ],
                            backgroundColor: 'rgba(108, 67, 224, 0.2)',
                            borderColor: '#6C43E0',
                            pointBackgroundColor: '#6C43E0'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { r: { beginAtZero: true, max: 100 } }
                    }
                });
            }
            
            if (DOM.pendingMiniChart) {
                const ctx = DOM.pendingMiniChart.getContext('2d');
                AppState.charts.pendingMiniChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['L', 'M', 'M', 'J', 'V'],
                        datasets: [{
                            data: [8, 10, 7, m.pendingTickets, 9],
                            borderColor: '#dc3545',
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false }, y: { display: false } }
                    }
                });
            }
            
            if (DOM.closedMiniChart) {
                const ctx = DOM.closedMiniChart.getContext('2d');
                AppState.charts.closedMiniChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['L', 'M', 'M', 'J', 'V'],
                        datasets: [{
                            data: [5, 8, 12, m.closedTickets, 15],
                            borderColor: '#28a745',
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false }, y: { display: false } }
                    }
                });
            }
            
            console.log('✅ Gráficas listas');
        } catch (error) {
            console.error('❌ Error en gráficas:', error);
        }
    }, 200);
}

// ============================================
// COUNTDOWN
// ============================================
function startCountdown() {
    const updateCountdown = () => {
        const now = new Date();
        const target = new Date();
        target.setHours(8, 30, 0);
        
        if (now > target) target.setDate(target.getDate() + 1);
        
        const diff = target - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        DOM.hoursUntil.textContent = String(hours).padStart(2, '0');
        DOM.minutesUntil.textContent = String(minutes).padStart(2, '0');
        DOM.secondsUntil.textContent = String(seconds).padStart(2, '0');
    };
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ============================================
// INICIALIZACIÓN
// ============================================
async function init() {
    try {
        console.log('🚀 Inicializando Sala de Espera...');
        
        AppState.currentUser = getUserFromLocalStorage();
        
        startCountdown();
        
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('👤 Usuario autenticado:', user.email);
                await loadCollaboratorData();
                await loadUserTickets();
            } else {
                console.log('⚠️ Usuario no autenticado, usando localStorage');
                await loadCollaboratorData();
                renderUserProfile();
                updateAttendanceButton();
            }
        });
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    DOM.motivationalScreen.style.display = 'flex';
    DOM.waitingRoomScreen.style.display = 'none';
    
    init();
    
    DOM.verEficienciaBtn.addEventListener('click', () => {
        DOM.motivationalScreen.style.display = 'none';
        DOM.waitingRoomScreen.style.display = 'block';
        setTimeout(() => initCharts(), 100);
    });
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            Swal.fire({
                title: '¿Cerrar sesión?',
                text: '¿Estás seguro que deseas salir?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, cerrar sesión',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    auth.signOut().then(() => {
                        window.location.href = "../../index.html";
                    });
                }
            });
        });
    }
});

// Debug
window.AppState = AppState;