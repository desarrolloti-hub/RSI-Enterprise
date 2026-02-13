// Configuración de Firebase
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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Variables globales
let attendanceRecords = [];
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedQuincena = 1;
let allEmployees = [];
let activeEmployees = [];
let currentUser = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    initializeDateSelectors();
    setupEventListeners();
    checkViewMode();
});

window.manejadorErrorGlobal = function(error) {
    console.error('Error:', error);
    if (error && error.message) {
        console.error('Mensaje:', error.message);
    }
};

// Verificar autenticación
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserProfile();
            loadEmployees();
            setupFirebaseListener();
        } else {
            window.location.href = '../nav-visitantes/inicio-de-sesion.html';
        }
    });
}

// Cargar perfil de usuario
async function loadUserProfile() {
    try {
        const querySnapshot = await db.collection("colaboradores")
            .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", currentUser.email)
            .get();
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const userData = doc.data();
            currentUser = {
                id: doc.id,
                nombre: userData.NOMBRE,
                area: userData.ÁREA,
                imagen: userData.imagen || 'https://randomuser.me/api/portraits/men/32.jpg'
            };
            
            const nameElement = document.querySelector('.user-info .name');
            const roleElement = document.querySelector('.user-info .role');
            const avatarImg = document.querySelector('.avatar img');

            if (nameElement) nameElement.textContent = currentUser.nombre;
            if (roleElement) roleElement.textContent = 'Administrador';
            if (currentUser.imagen && avatarImg) avatarImg.src = currentUser.imagen;
        }
    } catch (error) {
        window.manejadorErrorGlobal(error);
    }
}

// Cargar empleados desde Firebase
async function loadEmployees() {
    try {
        const snapshot = await db.collection('colaboradores').get();
        allEmployees = [];
        activeEmployees = [];
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const trabajo = data['trabajo'] || 'Activo';
            
            const employee = {
                id: doc.id,
                name: data.NOMBRE || 'Sin nombre',
                area: data.ÁREA || 'Sin área',
                email: data['CORREO ELECTRÓNICO EMPRESARIAL'] || 'Sin email',
                trabajo: trabajo
            };
            
            allEmployees.push(employee);
            if (trabajo === 'Activo') activeEmployees.push(employee);
        });
        
        activeEmployees.sort((a, b) => a.name.localeCompare(b.name));
        
        const weeklyAttendance = document.getElementById('weekly-attendance');
        if (weeklyAttendance) weeklyAttendance.textContent = activeEmployees.length;
        
        if (window.innerWidth <= 992) {
            renderMobileCards(activeEmployees);
        } else {
            renderCalendar(activeEmployees);
        }
    } catch (error) {
        console.error('Error al cargar empleados:', error);
        window.manejadorErrorGlobal(error);
    }
}

// Inicializar selectores de fecha
function initializeDateSelectors() {
    const monthSelect = document.getElementById('month');
    const yearSelect = document.getElementById('year');
    if (!monthSelect || !yearSelect) return;
    
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        if (index === currentMonth) option.selected = true;
        monthSelect.appendChild(option);
    });
    
    const currentYearNow = new Date().getFullYear();
    for (let year = 2025; year <= currentYearNow; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYearNow) option.selected = true;
        yearSelect.appendChild(option);
    }
}

// Configurar event listeners
function setupEventListeners() {
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
    
    const quincenaSelect = document.getElementById('quincena');
    if (quincenaSelect) {
        quincenaSelect.addEventListener('change', function() {
            selectedQuincena = parseInt(this.value);
            renderActiveEmployees();
        });
    }
    
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', searchEmployees);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') searchEmployees();
        });
    }
    
    const showAllBtn = document.getElementById('show-all-btn');
    if (showAllBtn) {
        showAllBtn.addEventListener('click', function() {
            document.getElementById('search-input').value = '';
            renderActiveEmployees();
        });
    }

    window.addEventListener('resize', checkViewMode);
}

function searchEmployees() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    if (!searchTerm) {
        renderActiveEmployees();
        return;
    }
    
    let searchResults = activeEmployees.filter(employee => 
        employee.name.toLowerCase().includes(searchTerm) || 
        employee.area.toLowerCase().includes(searchTerm)
    );
    
    searchResults.sort((a, b) => a.name.localeCompare(b.name));
    
    if (window.innerWidth <= 992) {
        renderMobileCards(searchResults);
    } else {
        renderCalendar(searchResults);
    }
}

function applyFilters() {
    const monthSelect = document.getElementById('month');
    const yearSelect = document.getElementById('year');
    if (monthSelect) currentMonth = parseInt(monthSelect.value);
    if (yearSelect) currentYear = parseInt(yearSelect.value);
    renderActiveEmployees();
}

function renderActiveEmployees() {
    const sortedEmployees = [...activeEmployees].sort((a, b) => a.name.localeCompare(b.name));
    if (window.innerWidth <= 992) {
        renderMobileCards(sortedEmployees);
    } else {
        renderCalendar(sortedEmployees);
    }
}

function checkViewMode() {
    const isMobile = window.innerWidth <= 992;
    const calendarContainer = document.getElementById('calendarContainer');
    const mobileCardsView = document.getElementById('mobileCardsView');
    if (!calendarContainer || !mobileCardsView) return;
    
    if (isMobile) {
        calendarContainer.style.display = 'none';
        mobileCardsView.style.display = 'block';
        renderMobileCards(activeEmployees);
    } else {
        calendarContainer.style.display = 'block';
        mobileCardsView.style.display = 'none';
        renderCalendar(activeEmployees);
    }
}

function formatTo12Hour(timeString) {
    if (!timeString || timeString === 'Sin hora') return 'Sin hora';
    
    let hours, minutes;
    if (typeof timeString === 'string') {
        const parts = timeString.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    } else {
        return 'Sin hora';
    }
    
    if (isNaN(hours)) return 'Sin hora';
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    let hours12 = hours % 12;
    hours12 = hours12 === 0 ? 12 : hours12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours12}:${minutesStr} ${ampm}`;
}

/**
 * ============================================
 * CORREGIDO: AMBAS ENTRADA Y SALIDA TIENEN EL MISMO CAMPO horaRegistro
 * DIFERENCIAMOS POR LA HORA DEL DÍA
 * ============================================
 */

/**
 * Obtiene TODOS los registros del día para un empleado
 * Los ordena por hora
 * El MÁS TEMPRANO = ENTRADA
 * El MÁS TARDÍO = SALIDA
 */
function getRegistrosDelDia(employeeName, fecha) {
    // Filtrar todos los registros del empleado en esa fecha
    const registrosDelDia = attendanceRecords.filter(record => 
        record.nombre === employeeName && 
        record.fecha === fecha &&
        record.rawData?.horaRegistro // TODOS tienen horaRegistro
    );
    
    if (registrosDelDia.length === 0) {
        return { entrada: null, salida: null, totalRegistros: 0 };
    }
    
    // Ordenar por horaRegistro (de más temprano a más tarde)
    const ordenados = [...registrosDelDia].sort((a, b) => {
        const horaA = a.rawData?.horaRegistro || '00:00:00';
        const horaB = b.rawData?.horaRegistro || '00:00:00';
        return horaA.localeCompare(horaB); // Ascendente (temprano → tarde)
    });
    
    // El PRIMERO (más temprano) = ENTRADA
    const entrada = ordenados[0];
    
    // El ÚLTIMO (más tarde) = SALIDA
    const salida = ordenados.length > 1 ? ordenados[ordenados.length - 1] : null;
    
    return { 
        entrada, 
        salida, 
        totalRegistros: registrosDelDia.length 
    };
}

// Renderizar calendario (DESKTOP) - VERSIÓN FINAL CORREGIDA
function renderCalendar(employeesToShow) {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthYear = document.getElementById('currentMonthYear');
    
    if (!calendarGrid || !currentMonthYear) return;
    
    calendarGrid.innerHTML = '';
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const quincenaText = selectedQuincena === 1 ? '1ra Quincena' : '2da Quincena';
    currentMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear} - ${quincenaText}`;
    
    if (!employeesToShow || employeesToShow.length === 0) {
        const noDataRow = document.createElement('div');
        noDataRow.className = 'no-data-row';
        noDataRow.innerHTML = '<div class="no-data-message">No hay colaboradores activos</div>';
        calendarGrid.appendChild(noDataRow);
        updateStats(0, 0, 0, 0);
        return;
    }
    
    const sortedEmployees = [...employeesToShow].sort((a, b) => a.name.localeCompare(b.name));
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let startDay, endDay;
    
    if (selectedQuincena === 1) {
        startDay = 1;
        endDay = Math.min(15, daysInMonth);
    } else {
        startDay = 16;
        endDay = daysInMonth;
    }
    
    const workDays = [];
    for (let day = startDay; day <= endDay; day++) {
        const date = new Date(currentYear, currentMonth, day);
        if (date.getDay() !== 0) {
            workDays.push({ day, dayOfWeek: date.getDay() });
        }
    }
    
    calendarGrid.style.gridTemplateColumns = `250px repeat(${workDays.length}, 1fr) 100px 100px 100px 120px`;
    
    // HEADER ROW
    const headerRow = document.createElement('div');
    headerRow.className = 'calendar-row';
    
    const employeeHeader = document.createElement('div');
    employeeHeader.className = 'calendar-cell header-cell employee-header';
    employeeHeader.textContent = 'Colaborador / Área';
    headerRow.appendChild(employeeHeader);
    
    workDays.forEach(({ day, dayOfWeek }) => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-cell header-cell';
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        dayHeader.textContent = `${dayNames[dayOfWeek]} ${day}`;
        headerRow.appendChild(dayHeader);
    });
    
    const summaryHeaders = ['Asistencias', 'Faltas', 'Retardos', 'Horas Trab.'];
    summaryHeaders.forEach(header => {
        const summaryHeader = document.createElement('div');
        summaryHeader.className = 'calendar-cell header-cell';
        summaryHeader.textContent = header;
        headerRow.appendChild(summaryHeader);
    });
    
    calendarGrid.appendChild(headerRow);
    
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalHours = 0;
    
    // EMPLOYEE ROWS - CORREGIDO: Entrada = más temprano, Salida = más tarde
    sortedEmployees.forEach(employee => {
        const employeeRow = document.createElement('div');
        employeeRow.className = 'calendar-row';
        
        const employeeCell = document.createElement('div');
        employeeCell.className = 'calendar-cell employee-cell';
        employeeCell.innerHTML = `
            <div class="employee-name" data-id="${employee.id}">${employee.name}</div>
            <div class="employee-area">${employee.area}</div>
        `;
        employeeRow.appendChild(employeeCell);
        
        let employeePresent = 0;
        let employeeAbsent = 0;
        let employeeLate = 0;
        let employeeHours = 0;
        
        workDays.forEach(({ day }) => {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // ===== CORRECCIÓN DEFINITIVA =====
            // Obtener TODOS los registros del día y separar por hora
            const { entrada, salida } = getRegistrosDelDia(employee.name, dateStr);
            
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-cell';
            
            const attendanceInfo = document.createElement('div');
            attendanceInfo.className = 'attendance-info';
            
            // ===== 1. MOSTRAR ENTRADA (el registro MÁS TEMPRANO) =====
            if (entrada) {
                const horaEntrada = entrada.rawData?.horaRegistro;
                
                if (horaEntrada) {
                    const isLate = isRetardo(horaEntrada);
                    const entryElement = document.createElement('p');
                    entryElement.textContent = `E: ${formatTo12Hour(horaEntrada)}`;
                    entryElement.className = isLate ? 'late' : 'present';
                    attendanceInfo.appendChild(entryElement);
                    
                    if (isLate) {
                        employeeLate++;
                    } else {
                        employeePresent++;
                    }
                }
            }
            
            // ===== 2. MOSTRAR SALIDA (el registro MÁS TARDÍO, si es diferente al de entrada) =====
            if (salida && salida !== entrada) {
                const horaSalida = salida.rawData?.horaRegistro;
                
                if (horaSalida) {
                    const exitElement = document.createElement('p');
                    exitElement.textContent = `S: ${formatTo12Hour(horaSalida)}`;
                    exitElement.className = 'present';
                    attendanceInfo.appendChild(exitElement);
                }
            }
            
            // ===== 3. CALCULAR HORAS TRABAJADAS =====
            if (entrada && salida && salida !== entrada) {
                const horaEntrada = entrada.rawData?.horaRegistro;
                const horaSalida = salida.rawData?.horaRegistro;
                
                if (horaEntrada && horaSalida) {
                    try {
                        const entryTime = parseTimeString(horaEntrada);
                        const exitTime = parseTimeString(horaSalida);
                        
                        if (!isNaN(entryTime) && !isNaN(exitTime)) {
                            let hoursWorked = (exitTime - entryTime) / (1000 * 60 * 60);
                            if (hoursWorked < 0) hoursWorked += 24;
                            if (hoursWorked > 0 && hoursWorked < 24) {
                                employeeHours += hoursWorked;
                            }
                        }
                    } catch (e) {
                        console.error('Error calculando horas:', e);
                    }
                }
            }
            
            // ===== 4. SI NO HAY ENTRADA = FALTA =====
            if (!entrada) {
                const absentElement = document.createElement('p');
                absentElement.textContent = 'Falta';
                absentElement.className = 'absent';
                attendanceInfo.appendChild(absentElement);
                employeeAbsent++;
            }
            
            dayCell.appendChild(attendanceInfo);
            employeeRow.appendChild(dayCell);
        });
        
        const summaryData = [
            { value: employeePresent, className: 'asistencias' },
            { value: employeeAbsent, className: 'faltas' },
            { value: employeeLate, className: 'retardos' },
            { value: employeeHours.toFixed(1), className: 'horas' }
        ];
        
        summaryData.forEach(data => {
            const summaryCell = document.createElement('div');
            summaryCell.className = `calendar-cell summary-cell ${data.className}`;
            summaryCell.textContent = data.value;
            employeeRow.appendChild(summaryCell);
        });
        
        calendarGrid.appendChild(employeeRow);
        
        totalPresent += employeePresent;
        totalAbsent += employeeAbsent;
        totalLate += employeeLate;
        totalHours += employeeHours;
    });
    
    updateStats(totalPresent, totalAbsent, totalLate, totalHours);
    
    document.querySelectorAll('.employee-name').forEach(name => {
        name.addEventListener('click', function() {
            const employeeId = this.getAttribute('data-id');
            const month = currentMonth + 1;
            const year = currentYear;
            const quincena = selectedQuincena;
            
            window.location.href = `../asistenciaUsuarioEspecifico/asistenciaUsuarioEspecifico.html?id=${employeeId}&month=${month}&year=${year}&quincena=${quincena}`;
        });
    });
}

// Renderizar vista de tarjetas móviles
function renderMobileCards(employeesToShow) {
    const mobileCardsView = document.getElementById('mobileCardsView');
    if (!mobileCardsView) return;
    
    mobileCardsView.innerHTML = '';
    
    if (!employeesToShow || employeesToShow.length === 0) {
        mobileCardsView.innerHTML = '<div class="no-results">No hay colaboradores activos</div>';
        updateStats(0, 0, 0, 0);
        return;
    }
    
    const sortedEmployees = [...employeesToShow].sort((a, b) => a.name.localeCompare(b.name));
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let startDay, endDay;
    
    if (selectedQuincena === 1) {
        startDay = 1;
        endDay = Math.min(15, daysInMonth);
    } else {
        startDay = 16;
        endDay = daysInMonth;
    }
    
    const workDays = [];
    for (let day = startDay; day <= endDay; day++) {
        const date = new Date(currentYear, currentMonth, day);
        if (date.getDay() !== 0) {
            workDays.push({ day, dayOfWeek: date.getDay() });
        }
    }
    
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalHours = 0;
    
    sortedEmployees.forEach(employee => {
        let employeePresent = 0;
        let employeeAbsent = 0;
        let employeeLate = 0;
        let employeeHours = 0;
        
        workDays.forEach(({ day }) => {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            const { entrada, salida } = getRegistrosDelDia(employee.name, dateStr);
            
            if (entrada) {
                const horaEntrada = entrada.rawData?.horaRegistro;
                
                if (horaEntrada) {
                    const isLate = isRetardo(horaEntrada);
                    if (isLate) {
                        employeeLate++;
                    } else {
                        employeePresent++;
                    }
                }
                
                if (salida && salida !== entrada) {
                    const horaSalida = salida.rawData?.horaRegistro;
                    
                    if (horaEntrada && horaSalida) {
                        try {
                            const entryTime = parseTimeString(horaEntrada);
                            const exitTime = parseTimeString(horaSalida);
                            
                            if (!isNaN(entryTime) && !isNaN(exitTime)) {
                                let hoursWorked = (exitTime - entryTime) / (1000 * 60 * 60);
                                if (hoursWorked < 0) hoursWorked += 24;
                                if (hoursWorked > 0 && hoursWorked < 24) {
                                    employeeHours += hoursWorked;
                                }
                            }
                        } catch (e) {
                            console.error('Error calculando horas:', e);
                        }
                    }
                }
            } else {
                employeeAbsent++;
            }
        });
        
        const card = document.createElement('div');
        card.className = 'mobile-card';
        card.innerHTML = `
            <div class="mobile-card-header">
                <h4 class="employee-name-mobile" data-id="${employee.id}">${employee.name}</h4>
                <span class="employee-area-mobile">${employee.area}</span>
            </div>
            <div class="mobile-card-stats">
                <div class="mobile-stat-item">
                    <span class="stat-label">Asistencias</span>
                    <span class="stat-value present-mobile">${employeePresent}</span>
                </div>
                <div class="mobile-stat-item">
                    <span class="stat-label">Faltas</span>
                    <span class="stat-value absent-mobile">${employeeAbsent}</span>
                </div>
                <div class="mobile-stat-item">
                    <span class="stat-label">Retardos</span>
                    <span class="stat-value late-mobile">${employeeLate}</span>
                </div>
                <div class="mobile-stat-item">
                    <span class="stat-label">Horas Trab.</span>
                    <span class="stat-value hours-mobile">${employeeHours.toFixed(1)}</span>
                </div>
            </div>
        `;
        
        mobileCardsView.appendChild(card);
        
        totalPresent += employeePresent;
        totalAbsent += employeeAbsent;
        totalLate += employeeLate;
        totalHours += employeeHours;
    });
    
    updateStats(totalPresent, totalAbsent, totalLate, totalHours);
}

function parseTimeString(timeStr) {
    if (!timeStr) return NaN;
    
    let hours = 0, minutes = 0;
    if (typeof timeStr === 'string') {
        const parts = timeStr.split(':');
        hours = parseInt(parts[0], 10) || 0;
        minutes = parts[1] ? parseInt(parts[1], 10) || 0 : 0;
    }
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
}

// Configurar listener de Firebase para asistencias
function setupFirebaseListener() {
    db.collection("asistencias").onSnapshot((querySnapshot) => {
        attendanceRecords = [];
        
        querySnapshot.forEach((doc) => {
            const registro = doc.data();
            let fecha = 'Sin fecha';
            let dateObj = new Date(0);
            
            if (registro.fecha) {
                if (registro.fecha.toDate) {
                    dateObj = registro.fecha.toDate();
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    fecha = `${year}-${month}-${day}`;
                }
            }
            
            // SOLO GUARDAMOS SI TIENE horaRegistro (todos los registros)
            if (registro.horaRegistro) {
                attendanceRecords.push({
                    id: doc.id,
                    nombre: registro.nombre || registro.colaboradorNombre || "Sin nombre",
                    email: registro.email || 'Sin email',
                    area: registro.area || 'Sin área',
                    tipo: registro.tipo || 'office',
                    fecha: fecha,
                    hora: registro.horaRegistro,
                    rawData: registro,
                    dateObj: dateObj
                });
            }
        });
        
        renderActiveEmployees();
        updateStatsCards();
    }, (error) => {
        console.error("Error al leer datos de asistencias:", error);
        window.manejadorErrorGlobal(error);
    });
}

function isRetardo(hora) {
    if (!hora) return false;
    
    let hours, minutes;
    if (typeof hora === 'string') {
        const parts = hora.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    } else {
        return false;
    }
    
    if (isNaN(hours)) return false;
    
    return hours > 8 || (hours === 8 && minutes > 45);
}

function updateStats(totalPresent, totalAbsent, totalLate, totalHours) {
    const summaryPresent = document.getElementById('summary-present');
    const summaryAbsent = document.getElementById('summary-absent');
    const summaryLate = document.getElementById('summary-late');
    const summaryHours = document.getElementById('summary-hours');
    
    if (summaryPresent) summaryPresent.textContent = totalPresent;
    if (summaryAbsent) summaryAbsent.textContent = totalAbsent;
    if (summaryLate) summaryLate.textContent = totalLate;
    if (summaryHours) summaryHours.textContent = totalHours.toFixed(1);
}

function updateStatsCards() {
    // No necesitamos esto realmente, pero lo dejamos
}