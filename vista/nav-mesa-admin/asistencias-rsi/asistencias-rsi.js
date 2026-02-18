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
let attendanceRecords = []; // Aquí guardaremos los documentos de 'asistencias'
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedQuincena = 1; // 1 = Primera, 2 = Segunda
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

// Manejador de errores global
window.manejadorErrorGlobal = function(error) {
    console.error('Error:', error);
    if (error && error.message) {
        console.error('Mensaje:', error.message);
    }
};

// Función para determinar la quincena actual basada en el día
function getCurrentQuincena() {
    const today = new Date();
    const day = today.getDate();
    // Si es día 15 o antes, es primera quincena, si no, segunda
    return day <= 15 ? 1 : 2;
}

// Verificar autenticación
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserProfile();
            loadEmployees(); // Carga colaboradores y luego configura el listener de asistencias
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

        // Después de cargar empleados, configurar el listener de asistencias
        setupFirebaseListener();

    } catch (error) {
        console.error('Error al cargar empleados:', error);
        window.manejadorErrorGlobal(error);
    }
}

// Inicializar selectores de fecha
function initializeDateSelectors() {
    const monthSelect = document.getElementById('month');
    const yearSelect = document.getElementById('year');
    const quincenaSelect = document.getElementById('quincena');
    
    if (!monthSelect || !yearSelect || !quincenaSelect) return;

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

    // Establecer la quincena actual
    selectedQuincena = getCurrentQuincena();
    quincenaSelect.value = selectedQuincena;
}

// Configurar event listeners
function setupEventListeners() {
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);

    const quincenaSelect = document.getElementById('quincena');
    if (quincenaSelect) {
        quincenaSelect.addEventListener('change', function() {
            selectedQuincena = parseInt(this.value);
            console.log('Quincena cambiada a:', selectedQuincena);
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
    
    console.log('Filtros aplicados - Mes:', currentMonth + 1, 'Año:', currentYear, 'Quincena:', selectedQuincena);
    renderActiveEmployees();
}

function renderActiveEmployees() {
    console.log('Renderizando empleados - Quincena:', selectedQuincena);
    console.log('Mes/Año:', currentMonth + 1, currentYear);
    console.log('Total empleados activos:', activeEmployees.length);
    
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
 * Obtiene la entrada y salida del documento de un empleado en una fecha específica.
 * @param {string} employeeName - Nombre del empleado.
 * @param {string} fecha - Fecha en formato YYYY-MM-DD.
 * @returns {object} - Objeto con las propiedades 'entrada' y 'salida'.
 */
function getRegistrosDelDia(employeeName, fecha) {
    // Busca el documento que coincida con el nombre y la fecha
    const registro = attendanceRecords.find(record =>
        record.nombre === employeeName && record.fecha === fecha
    );

    if (!registro) {
        return { entrada: null, salida: null };
    }

    const data = registro.rawData;
    let entrada = null;
    let salida = null;

    if (data.horaEntradaRegistrada) {
        entrada = {
            hora: data.horaEntradaRegistrada,
            rawData: data
        };
    }

    if (data.horaSalidaRegistrada) {
        salida = {
            hora: data.horaSalidaRegistrada,
            rawData: data
        };
    }

    return { entrada, salida };
}

// Renderizar calendario (DESKTOP)
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
        calendarGrid.innerHTML = '<div class="no-data-row"><div class="no-data-message">No hay colaboradores activos</div></div>';
        updateStats(0, 0, 0, 0);
        return;
    }

    const sortedEmployees = [...employeesToShow].sort((a, b) => a.name.localeCompare(b.name));

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let startDay, endDay;

    // Calcular días de la quincena seleccionada
    if (selectedQuincena === 1) {
        startDay = 1;
        endDay = Math.min(15, daysInMonth);
    } else {
        startDay = 16;
        endDay = daysInMonth;
    }

    // Validar que los días sean números válidos
    if (startDay > daysInMonth) {
        startDay = 1;
        endDay = daysInMonth;
    }

    console.log('Días a mostrar en calendario:', startDay, 'a', endDay);

    // Filtrar días domingo (0)
    const workDays = [];
    for (let day = startDay; day <= endDay; day++) {
        const date = new Date(currentYear, currentMonth, day);
        if (date.getDay() !== 0) { // 0 = Domingo
            workDays.push({ day, dayOfWeek: date.getDay() });
        }
    }

    calendarGrid.style.gridTemplateColumns = `250px repeat(${workDays.length}, 1fr) 100px 100px 100px 120px`;

    // --- HEADER ROW ---
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

    // --- EMPLOYEE ROWS ---
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalHours = 0;

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

            // Obtener los registros del día para este empleado
            const { entrada, salida } = getRegistrosDelDia(employee.name, dateStr);

            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-cell';
            const attendanceInfo = document.createElement('div');
            attendanceInfo.className = 'attendance-info';

            // Procesar ENTRADA
            if (entrada) {
                const horaEntrada = entrada.hora;
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

            // Procesar SALIDA
            if (salida) {
                const horaSalida = salida.hora;
                const exitElement = document.createElement('p');
                exitElement.textContent = `S: ${formatTo12Hour(horaSalida)}`;
                exitElement.className = 'present';
                attendanceInfo.appendChild(exitElement);
            }

            // Calcular horas si hay ambos registros
            if (entrada && salida) {
                const hoursWorked = calculateHoursWorked(entrada.hora, salida.hora);
                if (hoursWorked > 0) {
                    employeeHours += hoursWorked;
                }
            }

            // Si no hay entrada, es falta
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

        // Celdas de resumen para el empleado
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

        // Acumular totales
        totalPresent += employeePresent;
        totalAbsent += employeeAbsent;
        totalLate += employeeLate;
        totalHours += employeeHours;
    });

    updateStats(totalPresent, totalAbsent, totalLate, totalHours);

    // Event listeners para redirigir al detalle del empleado
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

    // Calcular días de la quincena seleccionada
    if (selectedQuincena === 1) {
        startDay = 1;
        endDay = Math.min(15, daysInMonth);
    } else {
        startDay = 16;
        endDay = daysInMonth;
    }

    // Validar que los días sean números válidos
    if (startDay > daysInMonth) {
        startDay = 1;
        endDay = daysInMonth;
    }

    console.log('Días a mostrar en móvil:', startDay, 'a', endDay);

    // Obtener días laborales (sin domingo)
    const workDays = [];
    for (let day = startDay; day <= endDay; day++) {
        const date = new Date(currentYear, currentMonth, day);
        if (date.getDay() !== 0) {
            workDays.push(day);
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

        workDays.forEach(day => {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const { entrada, salida } = getRegistrosDelDia(employee.name, dateStr);

            if (entrada) {
                const isLate = isRetardo(entrada.hora);
                if (isLate) {
                    employeeLate++;
                } else {
                    employeePresent++;
                }

                if (salida) {
                    const hoursWorked = calculateHoursWorked(entrada.hora, salida.hora);
                    if (hoursWorked > 0) {
                        employeeHours += hoursWorked;
                    }
                }
            } else {
                employeeAbsent++;
            }
        });

        // Crear tarjeta
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

    // Event listeners para redirigir al detalle del empleado en móvil
    document.querySelectorAll('.employee-name-mobile').forEach(name => {
        name.addEventListener('click', function() {
            const employeeId = this.getAttribute('data-id');
            const month = currentMonth + 1;
            const year = currentYear;
            const quincena = selectedQuincena;

            window.location.href = `../asistenciaUsuarioEspecifico/asistenciaUsuarioEspecifico.html?id=${employeeId}&month=${month}&year=${year}&quincena=${quincena}`;
        });
    });
}

/**
 * Calcula las horas trabajadas entre dos horas en formato "HH:MM:SS".
 * @param {string} entrada - Hora de entrada.
 * @param {string} salida - Hora de salida.
 * @returns {number} - Horas trabajadas (ej. 8.5 para 8 horas 30 minutos).
 */
function calculateHoursWorked(entrada, salida) {
    if (!entrada || !salida) return 0;

    const parseTime = (timeStr) => {
        const parts = timeStr.split(':');
        return new Date(1970, 0, 1, parseInt(parts[0]), parseInt(parts[1] || 0), parseInt(parts[2] || 0)).getTime();
    };

    const entryTime = parseTime(entrada);
    const exitTime = parseTime(salida);

    if (isNaN(entryTime) || isNaN(exitTime)) return 0;

    let diffMs = exitTime - entryTime;
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // Cruzó la medianoche

    return diffMs / (1000 * 60 * 60); // Convertir a horas
}

// Configurar listener de Firebase para asistencias
function setupFirebaseListener() {
    db.collection("asistencias").onSnapshot((querySnapshot) => {
        attendanceRecords = [];

        querySnapshot.forEach((doc) => {
            const registro = doc.data();

            // Formatear la fecha del documento a YYYY-MM-DD
            let fecha = 'Sin fecha';
            if (registro.fecha) {
                if (registro.fecha.toDate) {
                    const dateObj = registro.fecha.toDate();
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    fecha = `${year}-${month}-${day}`;
                } else if (typeof registro.fecha === 'string') {
                    // Intentar parsear si es string (por si acaso)
                    fecha = registro.fecha.split('T')[0];
                }
            }

            attendanceRecords.push({
                id: doc.id,
                nombre: registro.nombre || "Sin nombre",
                fecha: fecha,
                rawData: registro
            });
        });

        console.log('Registros de asistencia cargados:', attendanceRecords.length);
        
        // Volver a renderizar la vista actual
        renderActiveEmployees();
        updateStatsCards(); // Actualiza las tarjetas de tipo (office, iztapaluca, etc.)
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

    // Considera retardo si es después de las 8:45
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
    // Esto depende de cómo quieras contar los tipos (office, iztapaluca, site)
    // Asumiendo que cada documento de asistencia tiene un campo 'tipo'
    const officeCount = attendanceRecords.filter(record => record.rawData.tipo === 'office').length;
    const iztapalucaCount = attendanceRecords.filter(record => record.rawData.tipo === 'iztapaluca').length;
    const onsiteCount = attendanceRecords.filter(record => record.rawData.tipo === 'site').length;

    const officeElement = document.getElementById('office-attendance');
    const iztapalucaElement = document.getElementById('iztapaluca-attendance');
    const onsiteElement = document.getElementById('onsite-attendance');

    if (officeElement) officeElement.textContent = officeCount;
    if (iztapalucaElement) iztapalucaElement.textContent = iztapalucaCount;
    if (onsiteElement) onsiteElement.textContent = onsiteCount;
}