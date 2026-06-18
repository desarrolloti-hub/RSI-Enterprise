// Sala-de-Espera.js - VERSIÓN FINAL SIN CONSOLE.LOG, CON CONTADOR EXACTO Y DATOS DINÁMICOS

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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
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
        hoursToday: 0,
        pendingTickets: 0,
        closedTickets: 0,
        totalTickets: 0,
        inProgress: 0,
        completed: 0
    },
    charts: {},
    attendanceTime: { hours: 12, minutes: 0 },
    unsubscribeTickets: null,
    unsubscribeAsistencias: null
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
    } catch {
        return null;
    }
}

function getColaboradorDataFromLocalStorage() {
    try {
        const data = localStorage.getItem('colaboradorData');
        if (data) {
            return JSON.parse(data);
        }
        return null;
    } catch {
        return null;
    }
}

// ============================================
// MANEJADOR DE ROLES
// ============================================
function getAsistenciaUrl() {
    const user = AppState.currentUser || getUserFromLocalStorage();
    const rol = user?.rol || 'colaborador';
    if (rol === 'admincolaborador') {
        return '/vista/nav-mesa-admin/asistencia/asistencia.html';
    } else {
        return '/vista/nav-mesa-admin/asistencia/asistencia.html';
    }
}

function updateAttendanceButton() {
    if (DOM.attendanceBtn) {
        DOM.attendanceBtn.href = getAsistenciaUrl();
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
            const localColab = getColaboradorDataFromLocalStorage();
            if (localColab) {
                AppState.colaboradorData = localColab;
                renderUserProfile();
                updateAttendanceButton();
                await loadAttendanceTimeFromColaborador(localColab.id);
                return true;
            }
            return false;
        }

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
            
            localStorage.setItem('colaboradorData', JSON.stringify(AppState.colaboradorData));
            
            renderUserProfile();
            updateAttendanceButton();
            await loadAttendanceTimeFromColaborador(doc.id);
            return true;
        } else {
            const localColab = getColaboradorDataFromLocalStorage();
            if (localColab) {
                AppState.colaboradorData = localColab;
                renderUserProfile();
                updateAttendanceButton();
                await loadAttendanceTimeFromColaborador(localColab.id);
                return true;
            }
            return false;
        }
    } catch {
        const localColab = getColaboradorDataFromLocalStorage();
        if (localColab) {
            AppState.colaboradorData = localColab;
            renderUserProfile();
            updateAttendanceButton();
            await loadAttendanceTimeFromColaborador(localColab.id);
            return true;
        }
        return false;
    }
}

// ============================================
// OBTENER HORA DE SALIDA DEL COLABORADOR (dinámico)
// ============================================
async function loadAttendanceTimeFromColaborador(colaboradorId) {
    try {
        const doc = await db.collection('colaboradores').doc(colaboradorId).get();
        if (doc.exists) {
            const data = doc.data();
            let horaSalida = data.horaSalida || data.HORA_SALIDA || data.horarioSalida || '12:00';
            if (typeof horaSalida === 'string') {
                const parts = horaSalida.split(':');
                if (parts.length === 2) {
                    AppState.attendanceTime.hours = parseInt(parts[0], 10) || 12;
                    AppState.attendanceTime.minutes = parseInt(parts[1], 10) || 0;
                }
            } else if (horaSalida && typeof horaSalida === 'object') {
                const date = horaSalida.toDate ? horaSalida.toDate() : new Date(horaSalida);
                AppState.attendanceTime.hours = date.getHours();
                AppState.attendanceTime.minutes = date.getMinutes();
            }
            startCountdown();
        }
    } catch {
        // Mantener 12:00 por defecto
    }
}

// ============================================
// RENDERIZADO DE PERFIL
// ============================================
function renderUserProfile() {
    const colaborador = AppState.colaboradorData;
    const user = AppState.currentUser || getUserFromLocalStorage();
    
    DOM.userName.textContent = colaborador?.NOMBRE || 
                               colaborador?.nombreCompleto || 
                               user?.nombreCompleto || 
                               'Usuario';
    
    DOM.userEmail.textContent = user?.email || 
                                colaborador?.['CORREO ELECTRÓNICO EMPRESARIAL'] || 
                                'correo@ejemplo.com';
    
    let roleText = 'Colaborador';
    if (user?.rol === 'admincolaborador') roleText = 'Administrador';
    else if (user?.rol === 'colaborador') roleText = 'Colaborador';
    DOM.userRole.textContent = roleText;
    
    let imagenUrl = '/vista/css/img/Logo-RSI-OFICIAL.png';
    if (colaborador?.imagen) {
        imagenUrl = colaborador.imagen;
    } else if (colaborador?.foto) {
        imagenUrl = colaborador.foto;
    } else if (colaborador?.avatar) {
        imagenUrl = colaborador.avatar;
    } else if (colaborador?.fotoPerfil) {
        imagenUrl = colaborador.fotoPerfil;
    }
    
    DOM.userAvatar.src = imagenUrl;
    DOM.userAvatar.onerror = function() {
        this.src = '/vista/css/img/Logo-RSI-OFICIAL.png';
    };
}

// ============================================
// OBTENER HORAS TRABAJADAS HOY DESDE ASISTENCIAS
// ============================================
async function loadHoursToday(colaboradorId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const snapshot = await db.collection('asistencias')
            .where('userId', '==', colaboradorId)
            .get();
        
        let totalMs = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            const fecha = data.fecha;
            if (fecha && fecha.toDate) {
                const fechaDate = fecha.toDate();
                if (fechaDate >= today && fechaDate < tomorrow) {
                    if (data.horaEntradaRegistrada && data.horaSalidaRegistrada) {
                        const entrada = new Date(fechaDate);
                        const salida = new Date(fechaDate);
                        const [hEnt, mEnt, sEnt] = data.horaEntradaRegistrada.split(':').map(Number);
                        const [hSal, mSal, sSal] = data.horaSalidaRegistrada.split(':').map(Number);
                        entrada.setHours(hEnt || 0, mEnt || 0, sEnt || 0, 0);
                        salida.setHours(hSal || 0, mSal || 0, sSal || 0, 0);
                        totalMs += (salida - entrada);
                    }
                }
            }
        });
        
        const hours = totalMs / (1000 * 60 * 60);
        AppState.metrics.hoursToday = Math.round(hours * 10) / 10;
        renderMetrics();
    } catch {
        AppState.metrics.hoursToday = 0;
    }
}

// ============================================
// SUSCRIPCIÓN EN TIEMPO REAL A TICKETS
// ============================================
function subscribeToTickets() {
    if (AppState.unsubscribeTickets) {
        AppState.unsubscribeTickets();
        AppState.unsubscribeTickets = null;
    }

    const colaboradorData = AppState.colaboradorData;
    if (!colaboradorData) return;

    const ticketsRef = db.collection('ticketsmesa');
    const nombreResponsable = colaboradorData.NOMBRE || colaboradorData.nombreCompleto;
    const colaboradorId = colaboradorData.id;

    const queryResponsable = ticketsRef.where("responsableNombre", "==", nombreResponsable);
    const queryColaborador = ticketsRef.where("colaboradores", "array-contains", colaboradorId);

    let ticketsMap = new Map();
    let isFirstLoad = true;

    const onUpdate = () => {
        const ticketsArray = Array.from(ticketsMap.values());
        AppState.tickets = ticketsArray;
        calculateMetrics();
        renderMetrics();
        renderRecentTickets();
        renderMobileTickets();
        updateCharts();
        if (isFirstLoad) {
            isFirstLoad = false;
            initCharts();
        }
    };

    const unsubResponsable = queryResponsable.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(change => {
            const doc = change.doc;
            const data = doc.data();
            if (change.type === 'removed') {
                ticketsMap.delete(doc.id);
            } else {
                ticketsMap.set(doc.id, { id: doc.id, ...data });
            }
        });
        onUpdate();
    }, () => {});

    const unsubColaborador = queryColaborador.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(change => {
            const doc = change.doc;
            const data = doc.data();
            if (change.type === 'removed') {
                ticketsMap.delete(doc.id);
            } else {
                ticketsMap.set(doc.id, { id: doc.id, ...data });
            }
        });
        onUpdate();
    }, () => {});

    AppState.unsubscribeTickets = () => {
        unsubResponsable();
        unsubColaborador();
    };
}

// ============================================
// SUSCRIPCIÓN A ASISTENCIAS PARA ACTUALIZAR HORAS
// ============================================
function subscribeToAsistencias() {
    if (AppState.unsubscribeAsistencias) {
        AppState.unsubscribeAsistencias();
        AppState.unsubscribeAsistencias = null;
    }

    const colaboradorId = AppState.colaboradorData?.id;
    if (!colaboradorId) return;

    const query = db.collection('asistencias')
        .where('userId', '==', colaboradorId);

    AppState.unsubscribeAsistencias = query.onSnapshot(() => {
        loadHoursToday(colaboradorId);
    }, () => {});
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

    AppState.metrics.efficiency = efficiency;
    AppState.metrics.pendingTickets = pending;
    AppState.metrics.closedTickets = closedToday;
    AppState.metrics.totalTickets = tickets.length;
    AppState.metrics.inProgress = inProgress;
    AppState.metrics.completed = completed;
}

// ============================================
// RENDERIZADO DE MÉTRICAS
// ============================================
function renderMetrics() {
    const m = AppState.metrics;
    
    if(DOM.efficiencyValue) DOM.efficiencyValue.textContent = m.efficiency + '%';
    if(DOM.efficiencyBar) DOM.efficiencyBar.style.width = m.efficiency + '%';
    
    if(DOM.efficiencyVsGoal) {
        const vsGoal = m.efficiency - 80;
        DOM.efficiencyVsGoal.textContent = vsGoal >= 0 ? `+${vsGoal}%` : `${vsGoal}%`;
        DOM.efficiencyVsGoal.style.color = vsGoal >= 0 ? '#28a745' : '#dc3545';
    }
    
    if(DOM.hoursToday) DOM.hoursToday.textContent = m.hoursToday.toFixed(1);
    if(DOM.hoursBar) {
        const hoursPercent = Math.min((m.hoursToday / 8) * 100, 100);
        DOM.hoursBar.style.width = hoursPercent + '%';
    }
    
    if(DOM.hoursRemaining) {
        const remaining = Math.max(8 - m.hoursToday, 0);
        DOM.hoursRemaining.textContent = `Restan ${remaining.toFixed(1)}h`;
    }
    
    if(DOM.pendingTickets) DOM.pendingTickets.textContent = m.pendingTickets;
    if(DOM.closedTickets) DOM.closedTickets.textContent = m.closedTickets;
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
}

// ============================================
// RENDERIZADO DE TARJETAS MÓVILES
// ============================================
function renderMobileTickets() {
    const tickets = AppState.tickets;
    const mobileContainer = DOM.mobileTicketsContainer;
    
    if (!mobileContainer) return;
    
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
        
        return `
            <div class="ticket-mobile-card">
                <div class="ticket-mobile-header">
                    <span class="ticket-mobile-id">#${ticket.id?.substring(0, 8) || 'N/A'}</span>
                    <span class="badge ${Utils.getBadgeClass(estado)}">
                        <i class="fas ${Utils.getStatusIcon(estado)}"></i> ${estado.replace(/_/g, ' ')}
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
// GRÁFICAS (CREACIÓN Y ACTUALIZACIÓN)
// ============================================
function initCharts() {
    updateCharts();
}

function updateCharts() {
    const m = AppState.metrics;
    
    // Status Chart (Doughnut)
    if (DOM.statusChart) {
        if (!AppState.charts.statusChart) {
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
        } else {
            AppState.charts.statusChart.data.datasets[0].data = [m.completed, m.inProgress, m.pendingTickets];
            AppState.charts.statusChart.update();
        }
    }
    
    // Distribution Chart (Bar)
    if (DOM.distributionChart) {
        if (!AppState.charts.distributionChart) {
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
        } else {
            AppState.charts.distributionChart.data.datasets[0].data = [m.pendingTickets, m.inProgress, m.completed];
            AppState.charts.distributionChart.update();
        }
    }
    
    // Performance Chart (Radar)
    if (DOM.performanceChart) {
        if (!AppState.charts.performanceChart) {
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
        } else {
            AppState.charts.performanceChart.data.datasets[0].data = [
                m.efficiency,
                Math.min(100, (m.completed / 5) * 100) || 0,
                75, 70, 80
            ];
            AppState.charts.performanceChart.update();
        }
    }
    
    // Pending Mini Chart (Line)
    if (DOM.pendingMiniChart) {
        if (!AppState.charts.pendingMiniChart) {
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
        } else {
            AppState.charts.pendingMiniChart.data.datasets[0].data = [8, 10, 7, m.pendingTickets, 9];
            AppState.charts.pendingMiniChart.update();
        }
    }
    
    // Closed Mini Chart (Line)
    if (DOM.closedMiniChart) {
        if (!AppState.charts.closedMiniChart) {
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
        } else {
            AppState.charts.closedMiniChart.data.datasets[0].data = [5, 8, 12, m.closedTickets, 15];
            AppState.charts.closedMiniChart.update();
        }
    }
}

// ============================================
// COUNTDOWN (CON HORA DINÁMICA Y SEGUNDOS EXACTOS)
// ============================================
let countdownInterval = null;

function startCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    const updateCountdown = () => {
        const now = new Date();
        const target = new Date();
        target.setHours(AppState.attendanceTime.hours, AppState.attendanceTime.minutes, 0, 0);
        
        if (now > target) target.setDate(target.getDate() + 1);
        
        const diff = target - now;
        
        if (diff <= 0 || diff < 1000) {
            window.location.href = getAsistenciaUrl();
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if(DOM.hoursUntil) DOM.hoursUntil.textContent = String(hours).padStart(2, '0');
        if(DOM.minutesUntil) DOM.minutesUntil.textContent = String(minutes).padStart(2, '0');
        if(DOM.secondsUntil) DOM.secondsUntil.textContent = String(seconds).padStart(2, '0');
    };
    
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

// ============================================
// INICIALIZACIÓN
// ============================================
async function init() {
    try {
        AppState.currentUser = getUserFromLocalStorage();
        
        await loadCollaboratorData();
        startCountdown();
        
        if (AppState.colaboradorData?.id) {
            await loadHoursToday(AppState.colaboradorData.id);
        }
        
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                AppState.currentUser = user;
                await loadCollaboratorData();
                subscribeToTickets();
                subscribeToAsistencias();
            } else {
                await loadCollaboratorData();
                if (AppState.colaboradorData) {
                    subscribeToTickets();
                    subscribeToAsistencias();
                }
            }
        });
        
    } catch {
        // Error silencioso
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
        updateCharts();
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
                    if (AppState.unsubscribeTickets) AppState.unsubscribeTickets();
                    if (AppState.unsubscribeAsistencias) AppState.unsubscribeAsistencias();
                    auth.signOut().then(() => {
                        window.location.href = "../../index.html";
                    });
                }
            });
        });
    }
});