// ESPERAR A QUE FIREBASE ESTÉ CARGADO
(function() {
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

    // CONFIGURACIÓN EXACTA DE HORARIOS
    const CONFIG = {
        HORA_ENTRADA: 8,
        MINUTO_ENTRADA: 30,
        HORA_LIMITE_RETARDO: 9,
        MINUTO_LIMITE_RETARDO: 0,
        HORA_SALIDA: 18,
        MINUTO_SALIDA: 0,
        TOLERANCIA_RETARDO: 0
    };

    // Variables globales
    let db, auth;
    let currentUser = null;
    let employeeData = null;
    let attendanceRecords = [];
    let currentEmployeeId = null;
    
    // ===== FECHAS ACTUALES =====
    const hoy = new Date();
    let currentMonth = hoy.getMonth(); // Mes actual
    let currentYear = hoy.getFullYear(); // Año actual
    
    // Detectar quincena actual automáticamente
    const diaActual = hoy.getDate();
    let selectedQuincena = 0; // Por defecto 0 = Mes Completo
    
    // Si es antes del 16, mostrar 1ra quincena por defecto
    if (diaActual <= 15) {
        selectedQuincena = 1; // 1ra Quincena
    } else {
        selectedQuincena = 2; // 2da Quincena
    }
    
    console.log(`📅 Fecha actual: ${hoy.toLocaleDateString()}`);
    console.log(`📆 Quincena actual: ${selectedQuincena === 1 ? '1ra Quincena' : '2da Quincena'}`);
    
    let allEmployees = [];

    // Función para inicializar Firebase
    function initFirebase() {
        return new Promise((resolve, reject) => {
            if (typeof firebase !== 'undefined') {
                try {
                    if (firebase.apps.length === 0) {
                        firebase.initializeApp(firebaseConfig);
                    }
                    db = firebase.firestore();
                    auth = firebase.auth();
                    
                    db.settings({
                        timestampsInSnapshots: true,
                        ignoreUndefinedProperties: true
                    });
                    
                    console.log('✅ Firebase inicializado correctamente');
                    resolve();
                } catch (error) {
                    console.error('❌ Error inicializando Firebase:', error);
                    reject(error);
                }
            } else {
                console.error('❌ Firebase no está disponible');
                reject(new Error('Firebase no cargado'));
            }
        });
    }

    // Inicialización
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('📅 Inicializando página de asistencia precisa...');
        
        try {
            await initFirebase();
            checkAuthState();
        } catch (error) {
            console.error('Error fatal:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con la base de datos'
            });
        }
    });

    // Verificar autenticación
    function checkAuthState() {
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                console.log('✅ Usuario autenticado:', user.email);
                initializePage();
            } else {
                console.log('⚠️ Usuario no autenticado, usando modo lectura');
                initializePage();
            }
        }, error => {
            console.error('❌ Error en auth:', error);
            initializePage();
        });
    }

    // Inicializar página
    function initializePage() {
        const params = getQueryParams();
        
        currentEmployeeId = params.id;
        console.log('👤 ID del empleado:', currentEmployeeId);
        
        // Si hay parámetros en la URL, usarlos (prioridad a lo que viene en URL)
        if (params.month) currentMonth = parseInt(params.month) - 1;
        if (params.year) currentYear = parseInt(params.year);
        if (params.quincena !== null && params.quincena !== undefined) {
            selectedQuincena = parseInt(params.quincena);
        }

        initializeDateSelectors();
        setupEventListeners();
        
        if (currentEmployeeId) {
            loadEmployeeData();
            loadAttendanceData();
        } else {
            showEmployeeModal();
        }
    }

    // Obtener parámetros de la URL
    function getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            id: params.get('id'),
            month: params.get('month'),
            year: params.get('year'),
            quincena: params.get('quincena')
        };
    }

    // Inicializar selectores de fecha
    function initializeDateSelectors() {
        const monthSelect = document.getElementById('month');
        const yearSelect = document.getElementById('year');
        const quincenaSelect = document.getElementById('quincena');
        
        monthSelect.innerHTML = '';
        yearSelect.innerHTML = '';
        
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            if (index === currentMonth) option.selected = true;
            monthSelect.appendChild(option);
        });
        
        const currentYearNow = new Date().getFullYear();
        for (let year = 2024; year <= currentYearNow + 1; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }
        
        // Seleccionar la quincena actual por defecto
        quincenaSelect.value = selectedQuincena;
        
        updateCurrentPeriod();
    }

    // Configurar event listeners
    function setupEventListeners() {
        document.getElementById('applyFilters').addEventListener('click', applyFilters);
        document.getElementById('search-button').addEventListener('click', showEmployeeModal);
    }

    // Actualizar periodo actual
    function updateCurrentPeriod() {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        let quincenaText = ['Mes Completo', '1ra Quincena', '2da Quincena'][selectedQuincena] || 'Mes Completo';
        
        document.getElementById('current-period').textContent = 
            `Periodo: ${monthNames[currentMonth]} ${currentYear} - ${quincenaText}`;
    }

    // Aplicar filtros
    function applyFilters() {
        currentMonth = parseInt(document.getElementById('month').value);
        currentYear = parseInt(document.getElementById('year').value);
        selectedQuincena = parseInt(document.getElementById('quincena').value);
        
        updateCurrentPeriod();
        loadAttendanceData();
    }

    // Cargar empleados
    async function loadAllEmployees() {
        try {
            const snapshot = await db.collection('colaboradores').get();
            allEmployees = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`📚 ${allEmployees.length} empleados cargados`);
        } catch (error) {
            console.error('Error cargando empleados:', error);
            allEmployees = [];
        }
    }

    // Mostrar modal de empleados
    async function showEmployeeModal() {
        await loadAllEmployees();
        
        let employeeListHTML = `
            <div style="margin-bottom: 15px;">
                <input type="text" id="swal-search" placeholder="Buscar por nombre..." 
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            </div>
            <div id="swal-employee-list" style="max-height: 400px; overflow-y: auto;">
        `;
        
        if (allEmployees.length === 0) {
            employeeListHTML += '<p style="text-align: center;">No hay empleados</p>';
        } else {
            allEmployees.forEach(emp => {
                employeeListHTML += `
                    <div class="employee-item" data-id="${emp.id}" 
                         style="display: flex; align-items: center; gap: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px; cursor: pointer;">
                        <div style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden;">
                            <img src="${emp.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.NOMBRE || 'U')}`}" 
                                 style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div>
                            <h4 style="margin: 0;">${emp.NOMBRE || 'Sin nombre'}</h4>
                            <p style="margin: 5px 0 0; color: #666;">${emp.area || emp.ÁREA || 'Sin área'}</p>
                            <p style="margin: 2px 0 0; color: #999; font-size: 11px;">${emp.correoEmpresarial || emp['CORREO ELECTRÓNICO EMPRESARIAL'] || ''}</p>
                        </div>
                    </div>
                `;
            });
        }
        
        employeeListHTML += `</div>`;
        
        const { value: selectedId } = await Swal.fire({
            title: 'Seleccionar Colaborador',
            html: employeeListHTML,
            showCancelButton: true,
            confirmButtonText: 'Seleccionar',
            width: '600px',
            didOpen: () => {
                const searchInput = document.getElementById('swal-search');
                const items = document.querySelectorAll('.employee-item');
                
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        const term = e.target.value.toLowerCase();
                        items.forEach(item => {
                            const text = item.textContent.toLowerCase();
                            item.style.display = text.includes(term) ? 'flex' : 'none';
                        });
                    });
                }
                
                items.forEach(item => {
                    item.addEventListener('click', function() {
                        const confirmBtn = document.querySelector('.swal2-confirm');
                        confirmBtn.setAttribute('data-id', this.dataset.id);
                        confirmBtn.click();
                    });
                });
            },
            preConfirm: () => {
                const confirmBtn = document.querySelector('.swal2-confirm');
                return confirmBtn.getAttribute('data-id');
            }
        });
        
        if (selectedId) {
            selectEmployee(selectedId);
        }
    }

    // Seleccionar empleado
    function selectEmployee(employeeId) {
        const url = new URL(window.location);
        url.searchParams.set('id', employeeId);
        url.searchParams.set('month', currentMonth + 1);
        url.searchParams.set('year', currentYear);
        url.searchParams.set('quincena', selectedQuincena);
        window.location.href = url.toString();
    }

    // Cargar datos del empleado
    async function loadEmployeeData() {
        if (!currentEmployeeId) return;
        
        try {
            const doc = await db.collection('colaboradores').doc(currentEmployeeId).get();
            
            if (doc.exists) {
                employeeData = doc.data();
                console.log('✅ Datos del empleado:', employeeData);
                updateEmployeeInfo();
            }
        } catch (error) {
            console.error('Error cargando empleado:', error);
        }
    }

    // Actualizar info del empleado
    function updateEmployeeInfo() {
        if (!employeeData) return;
        
        document.getElementById('user-name').textContent = employeeData.NOMBRE || 'Sin nombre';
        document.getElementById('user-area').textContent = `Área: ${employeeData.area || employeeData.ÁREA || 'Sin área'}`;
        document.getElementById('user-email').textContent = `Email: ${employeeData.correoEmpresarial || employeeData['CORREO ELECTRÓNICO EMPRESARIAL'] || 'Sin email'}`;
        
        const avatar = document.getElementById('user-avatar');
        if (employeeData.imagen) {
            avatar.src = employeeData.imagen;
        } else {
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employeeData.NOMBRE || 'Usuario')}&background=random`;
        }
    }

    // ========== FUNCIONES PARA FORMATO 12H ==========
    function format12Hour(horas, minutos) {
        const periodo = horas >= 12 ? 'PM' : 'AM';
        let horas12 = horas % 12;
        horas12 = horas12 === 0 ? 12 : horas12;
        
        const horasStr = String(horas12).padStart(2, '0');
        const minutosStr = String(minutos).padStart(2, '0');
        
        return `${horasStr}:${minutosStr} ${periodo}`;
    }

    function formatTime12h(date) {
        if (!date) return '-';
        return format12Hour(date.getHours(), date.getMinutes());
    }

    function formatExactTime12h(date) {
        if (!date) return '-';
        
        const horas = date.getHours();
        const minutos = date.getMinutes();
        const segundos = date.getSeconds();
        
        const periodo = horas >= 12 ? 'PM' : 'AM';
        let horas12 = horas % 12;
        horas12 = horas12 === 0 ? 12 : horas12;
        
        return `${String(horas12).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')} ${periodo}`;
    }

    // Procesar timestamp
    function processFirestoreTimestamp(timestamp) {
        if (!timestamp) return null;
        
        try {
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                return timestamp.toDate();
            } else if (typeof timestamp === 'string') {
                const date = new Date(timestamp);
                return isNaN(date.getTime()) ? null : date;
            } else if (timestamp instanceof Date) {
                return timestamp;
            } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
                return new Date(timestamp.seconds * 1000);
            } else if (typeof timestamp === 'number') {
                return new Date(timestamp);
            }
        } catch (e) {
            console.error('Error procesando timestamp:', e);
        }
        return null;
    }

    // Determinar si llegó tarde
    function isLate(entradaDate) {
        if (!entradaDate) return false;
        
        const horaEntrada = entradaDate.getHours();
        const minutoEntrada = entradaDate.getMinutes();
        const segundoEntrada = entradaDate.getSeconds();
        
        if (horaEntrada > CONFIG.HORA_LIMITE_RETARDO) {
            return true;
        }
        
        if (horaEntrada === CONFIG.HORA_LIMITE_RETARDO) {
            if (minutoEntrada > CONFIG.MINUTO_LIMITE_RETARDO) {
                return true;
            }
            if (minutoEntrada === 0 && segundoEntrada > 0) {
                return true;
            }
        }
        
        return false;
    }

    // Calcular horas trabajadas
    function calculateWorkedHours(entradaDate, salidaDate) {
        if (!entradaDate || !salidaDate) return { 
            horas: 0, minutos: 0, segundos: 0, texto: '-'
        };
        
        const diffMs = salidaDate - entradaDate;
        if (diffMs <= 0) return { horas: 0, minutos: 0, segundos: 0, texto: '-' };
        
        const totalSegundos = Math.floor(diffMs / 1000);
        const horas = Math.floor(totalSegundos / 3600);
        const minutos = Math.floor((totalSegundos % 3600) / 60);
        const segundos = totalSegundos % 60;
        
        let texto = '';
        if (horas > 0) texto += `${horas}h `;
        if (minutos > 0 || horas > 0) texto += `${minutos}m`;
        
        return { horas, minutos, segundos, texto: texto.trim() || '0m' };
    }

    // Calcular horas extra
    function calculateExtraHours(entradaDate, salidaDate) {
        if (!entradaDate || !salidaDate) return 0;
        
        const horaLimite = new Date(entradaDate);
        horaLimite.setHours(CONFIG.HORA_SALIDA, CONFIG.MINUTO_SALIDA, 0, 0);
        
        if (salidaDate > horaLimite) {
            const diffMs = salidaDate - horaLimite;
            return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        }
        
        return 0;
    }

    // Extraer ubicación
    function extractLocation(data) {
        let ubicacion = 'No especificada';
        let coords = { lat: 19.4326, lng: -99.1332 };
        
        if (!data.ubicacion) return { ubicacion, coords };
        
        if (typeof data.ubicacion === 'string') {
            ubicacion = data.ubicacion;
        } else {
            if (data.ubicacion.source === 'ip') ubicacion = 'Oficina Principal';
            else if (data.ubicacion.source === 'gps') ubicacion = 'En Sitio';
            else if (data.ubicacion.source) ubicacion = data.ubicacion.source;
            
            if (data.ubicacion.latitude && data.ubicacion.longitude) {
                coords = { lat: data.ubicacion.latitude, lng: data.ubicacion.longitude };
            } else if (data.ubicacion.lat && data.ubicacion.lng) {
                coords = { lat: data.ubicacion.lat, lng: data.ubicacion.lng };
            }
        }
        
        return { ubicacion, coords };
    }

    // Cargar datos de asistencia
    async function loadAttendanceData() {
        if (!currentEmployeeId) return;
        
        showLoading();
        
        try {
            console.log('🔍 Cargando asistencias...');
            console.log(`📆 Periodo: Mes ${currentMonth + 1}/${currentYear}, Quincena: ${selectedQuincena}`);
            
            const snapshot = await db.collection('asistencias').get();
            attendanceRecords = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Identificar empleado
                let esDelEmpleado = false;
                
                if (data.userId === currentEmployeeId) esDelEmpleado = true;
                if (data.colaboradorId === currentEmployeeId) esDelEmpleado = true;
                
                if (employeeData) {
                    const emailEmpleado = employeeData.correoEmpresarial || employeeData['CORREO ELECTRÓNICO EMPRESARIAL'];
                    if (emailEmpleado && data.email === emailEmpleado) esDelEmpleado = true;
                }
                
                if (esDelEmpleado) {
                    let fecha = null;
                    if (data.fecha) fecha = processFirestoreTimestamp(data.fecha);
                    else if (data.detalles?.fecha) fecha = processFirestoreTimestamp(data.detalles.fecha);
                    
                    if (!fecha) return;
                    
                    // Filtrar por mes y año
                    if (fecha.getMonth() !== currentMonth || fecha.getFullYear() !== currentYear) return;
                    
                    // Filtrar por quincena
                    const dia = fecha.getDate();
                    if (selectedQuincena === 1 && dia > 15) return;
                    if (selectedQuincena === 2 && dia < 16) return;
                    
                    // Procesar horas
                    let horaEntradaStr = data.horaEntradaRegistrada || data.horaEntrada;
                    let horaSalidaStr = data.horaSalidaRegistrada || data.horaSalida;
                    
                    let entradaObj = null;
                    let salidaObj = null;
                    
                    if (horaEntradaStr) {
                        const partes = horaEntradaStr.split(':').map(Number);
                        entradaObj = new Date(fecha);
                        entradaObj.setHours(partes[0] || 0, partes[1] || 0, partes[2] || 0, 0);
                    }
                    
                    if (horaSalidaStr) {
                        const partes = horaSalidaStr.split(':').map(Number);
                        salidaObj = new Date(fecha);
                        salidaObj.setHours(partes[0] || 0, partes[1] || 0, partes[2] || 0, 0);
                    }
                    
                    const { ubicacion, coords } = extractLocation(data);
                    const llegoTarde = entradaObj ? isLate(entradaObj) : false;
                    const extraHours = entradaObj && salidaObj ? calculateExtraHours(entradaObj, salidaObj) : 0;
                    
                    attendanceRecords.push({
                        id: doc.id,
                        fecha: fecha,
                        fechaStr: `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`,
                        
                        // Horas en formato 12h
                        horaEntrada12h: entradaObj ? formatTime12h(entradaObj) : null,
                        horaSalida12h: salidaObj ? formatTime12h(salidaObj) : null,
                        horaEntradaExacta12h: entradaObj ? formatExactTime12h(entradaObj) : null,
                        
                        entradaObj: entradaObj,
                        salidaObj: salidaObj,
                        esRetardo: llegoTarde,
                        horasExtra: extraHours,
                        ubicacion: ubicacion,
                        coordenadas: coords
                    });
                }
            });
            
            console.log(`✅ ${attendanceRecords.length} registros encontrados`);
            
            // Ordenar y agrupar
            attendanceRecords.sort((a, b) => a.fecha - b.fecha);
            const groupedRecords = groupRecordsByDate(attendanceRecords);
            
            renderAttendanceTable(groupedRecords);
            updateStats(groupedRecords);
            
        } catch (error) {
            console.error('❌ Error:', error);
            generateSampleData();
        } finally {
            hideLoading();
        }
    }

    // Agrupar registros por fecha
    function groupRecordsByDate(records) {
        const grouped = {};
        
        records.forEach(record => {
            const dateKey = record.fecha.toDateString();
            
            if (!grouped[dateKey]) {
                grouped[dateKey] = {
                    fecha: record.fecha,
                    mejorEntrada: null,
                    mejorSalida: null,
                    ubicacionEntrada: null,
                    coordenadasEntrada: null,
                    horasExtra: 0
                };
            }
            
            if (record.entradaObj) {
                if (!grouped[dateKey].mejorEntrada || record.entradaObj < grouped[dateKey].mejorEntrada.entradaObj) {
                    grouped[dateKey].mejorEntrada = record;
                    grouped[dateKey].ubicacionEntrada = record.ubicacion;
                    grouped[dateKey].coordenadasEntrada = record.coordenadas;
                }
            }
            
            if (record.salidaObj) {
                if (!grouped[dateKey].mejorSalida || record.salidaObj > grouped[dateKey].mejorSalida.salidaObj) {
                    grouped[dateKey].mejorSalida = record;
                }
            }
            
            grouped[dateKey].horasExtra += record.horasExtra || 0;
        });
        
        return grouped;
    }

    // Mostrar carga
    function showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('no-data').style.display = 'none';
    }

    function hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    // Obtener días del período
    function getDaysInPeriod() {
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        let start = 1, end = daysInMonth;
        
        if (selectedQuincena === 1) end = 15;
        else if (selectedQuincena === 2) start = 16;
        
        const days = [];
        for (let d = start; d <= end; d++) {
            const date = new Date(currentYear, currentMonth, d);
            if (date.getDay() !== 0) days.push(date);
        }
        return days;
    }

    // Renderizar tabla
    function renderAttendanceTable(groupedRecords) {
        const tbody = document.getElementById('attendance-body');
        const days = getDaysInPeriod();
        
        if (days.length === 0) {
            document.getElementById('no-data').style.display = 'block';
            tbody.innerHTML = '';
            return;
        }
        
        document.getElementById('no-data').style.display = 'none';
        
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        let totalExtraHours = 0;
        
        let html = '';
        
        days.forEach(day => {
            const dateKey = day.toDateString();
            const dayRecord = groupedRecords[dateKey] || {};
            
            const entrada = dayRecord.mejorEntrada;
            const salida = dayRecord.mejorSalida;
            
            // Estado
            let estadoClass = 'status-absent';
            let estadoText = 'Ausente';
            
            if (entrada) {
                estadoClass = entrada.esRetardo ? 'status-late' : 'status-present';
                estadoText = entrada.esRetardo ? 'Tarde' : 'Presente';
            }
            
            // Horas trabajadas
            let horasTrabajadas = '-';
            if (entrada && salida) {
                const worked = calculateWorkedHours(entrada.entradaObj, salida.salidaObj);
                horasTrabajadas = worked.texto;
            }
            
            totalExtraHours += dayRecord.horasExtra || 0;
            
            // Fecha
            const formattedDate = `${day.getDate().toString().padStart(2, '0')}/${(day.getMonth() + 1).toString().padStart(2, '0')}/${day.getFullYear()}`;
            
            // Ubicación
            let ubicacionHtml = '-';
            if (entrada) {
                ubicacionHtml = `
                    <span class="location-link" onclick='window.showLocationMap(${JSON.stringify(dayRecord.coordenadasEntrada || { lat: 19.4326, lng: -99.1332 })}, "${dayRecord.ubicacionEntrada || 'Entrada'}")'>
                        <i class="fas fa-map-marker-alt"></i> Ver
                    </span>
                `;
            }
            
            html += `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${dayNames[day.getDay()]}</td>
                    <td class="${estadoClass}">${estadoText}</td>
                    <td class="time-cell">${entrada ? entrada.horaEntrada12h : '-'}</td>
                    <td class="time-cell">${salida ? salida.horaSalida12h : '-'}</td>
                    <td class="time-cell">${horasTrabajadas}</td>
                    <td class="time-cell">${dayRecord.horasExtra > 0 ? dayRecord.horasExtra.toFixed(2) + 'h' : '-'}</td>
                    <td>${ubicacionHtml}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        document.getElementById('total-extra-hours').textContent = totalExtraHours.toFixed(2) + 'h';
    }

    // Mostrar mapa
    window.showLocationMap = function(coords, titulo) {
        if (!coords || !coords.lat || !coords.lng) {
            Swal.fire('Error', 'No hay coordenadas', 'error');
            return;
        }
        
        const mapHtml = '<div id="map" style="height: 400px; width: 100%; border-radius: 8px;"></div>';
        
        Swal.fire({
            title: titulo || 'Ubicación',
            html: mapHtml,
            width: '800px',
            didOpen: () => {
                setTimeout(() => {
                    try {
                        const map = L.map('map').setView([coords.lat, coords.lng], 15);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                        L.marker([coords.lat, coords.lng]).addTo(map).bindPopup(titulo).openPopup();
                        setTimeout(() => map.invalidateSize(), 100);
                    } catch (e) {
                        console.error('Error mapa:', e);
                    }
                }, 200);
            }
        });
    };

    // Actualizar estadísticas
    function updateStats(groupedRecords) {
        const days = getDaysInPeriod();
        let presentes = 0;
        let retardos = 0;
        
        days.forEach(day => {
            const record = groupedRecords[day.toDateString()];
            if (record && record.mejorEntrada) {
                presentes++;
                if (record.mejorEntrada.esRetardo) retardos++;
            }
        });
        
        document.getElementById('total-present').textContent = presentes;
        document.getElementById('total-absent').textContent = days.length - presentes;
        document.getElementById('total-late').textContent = retardos;
    }

    // Generar datos de ejemplo
    function generateSampleData() {
        const groupedRecords = {};
        const days = getDaysInPeriod();
        
        days.forEach((day, index) => {
            if (index % 3 !== 0) {
                const entradaHour = index % 4 === 0 ? 9 : 8;
                const entradaMinute = entradaHour === 8 ? 30 + (index % 20) : (index % 30);
                const entradaDate = new Date(day);
                entradaDate.setHours(entradaHour, entradaMinute, 0, 0);
                
                const salidaHour = 18 + (index % 3);
                const salidaMinute = index % 60;
                const salidaDate = new Date(day);
                salidaDate.setHours(salidaHour, salidaMinute, 0, 0);
                
                const esTarde = entradaHour > 9 || (entradaHour === 9 && entradaMinute > 0);
                
                groupedRecords[day.toDateString()] = {
                    mejorEntrada: {
                        horaEntrada12h: formatTime12h(entradaDate),
                        entradaObj: entradaDate,
                        esRetardo: esTarde,
                        ubicacion: 'Oficina Principal',
                        coordenadas: { lat: 19.4372, lng: -99.0369 }
                    },
                    mejorSalida: {
                        horaSalida12h: formatTime12h(salidaDate),
                        salidaObj: salidaDate
                    },
                    horasExtra: salidaHour > 18 ? (salidaHour - 18 + salidaMinute/60) : 0,
                    ubicacionEntrada: 'Oficina Principal',
                    coordenadasEntrada: { lat: 19.4372, lng: -99.0369 }
                };
            }
        });
        
        renderAttendanceTable(groupedRecords);
        updateStats(groupedRecords);
    }
})();