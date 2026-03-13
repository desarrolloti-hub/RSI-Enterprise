// Configuración de Firebase (debe coincidir EXACTAMENTE con personalizacion-colores.js)
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.firebasestorage.app", // ¡Coincide con personalizacion-colores.js!
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
};

// Inicializar Firebase solo si no hay ninguna app (evita duplicados)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Variables para control de vista
let currentView = 'table';
let allColaboradores = [];
let currentFilter = 'all';
let searchTerm = '';

// Formateador de fecha
function formatearFecha(timestamp) {
    if (!timestamp) return 'Sin fecha';
    const fecha = timestamp.toDate();
    return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Función para obtener el nombre del rol
function obtenerNombreRol(rol) {
    const roles = {
        'admin': 'Administrador',
        'puntoVenta': 'Punto de Venta',
        'facturas': 'Facturas',
        'colaborador': 'Colaborador',
        'admincolaborador': 'Admin Colaborador'
    };
    return roles[rol] || rol;
}

// Función para renderizar foto
function renderizarFoto(imagenBase64, nombre, tamaño = 'small') {
    if (imagenBase64) {
        return `<img src="${imagenBase64}" alt="${nombre}" class="${tamaño === 'small' ? 'user-photo' : tamaño === 'large' ? 'card-user-photo' : 'card-user-photo-large'}">`;
    } else {
        return `
            <div class="${tamaño === 'small' ? 'user-photo' : tamaño === 'large' ? 'card-user-photo' : 'card-user-photo-large'}">
                <i class="fas fa-user"></i>
            </div>
        `;
    }
}

// Función para renderizar el estado (Activo/Inactivo)
function renderizarEstado(estado) {
    const esActivo = estado === 'Activo';
    const claseEstado = esActivo ? 'estado-activo' : 'estado-inactivo';
    const textoEstado = esActivo ? 'Activo' : 'Inactivo';
    const icono = esActivo ? 'fa-check-circle' : 'fa-times-circle';
    
    return `
        <span class="estado-trabajo ${claseEstado}">
            <i class="fas ${icono}"></i>
            ${textoEstado}
        </span>
    `;
}

// Cambiar vista
function cambiarVista(vista) {
    currentView = vista;
    const tableViewBtn = document.getElementById('tableViewBtn');
    const cardViewBtn = document.getElementById('cardViewBtn');
    const desktopTable = document.getElementById('desktopTable');
    const cardsGrid = document.getElementById('cardsGrid');
    const mobileCards = document.getElementById('mobileCardsContainer');

    if (vista === 'table') {
        tableViewBtn.classList.add('active');
        cardViewBtn.classList.remove('active');
        desktopTable.style.display = 'table';
        cardsGrid.classList.remove('active');
        mobileCards.style.display = 'none';
    } else {
        tableViewBtn.classList.remove('active');
        cardViewBtn.classList.add('active');
        desktopTable.style.display = 'none';
        cardsGrid.classList.add('active');
        mobileCards.style.display = 'none';
    }
}

// NUEVA FUNCIÓN: Filtrar colaboradores
function filtrarColaboradores() {
    let colaboradoresFiltrados = allColaboradores;

    // Aplicar filtro de estado
    if (currentFilter !== 'all') {
        colaboradoresFiltrados = colaboradoresFiltrados.filter(colaborador => {
            const estado = colaborador.trabajo || 'Inactivo';
            return estado.toLowerCase() === currentFilter;
        });
    }

    // Aplicar búsqueda
    if (searchTerm) {
        colaboradoresFiltrados = colaboradoresFiltrados.filter(colaborador => {
            const nombre = colaborador.NOMBRE || '';
            const correo = colaborador['CORREO ELECTRÓNICO EMPRESARIAL'] || '';
            const area = colaborador['ÁREA'] || '';
            const estado = colaborador.trabajo || '';
            
            return nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   area.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   estado.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }

    // Actualizar contador
    actualizarContador(colaboradoresFiltrados.length);

    renderizarColaboradores(colaboradoresFiltrados);
}

// NUEVA FUNCIÓN: Actualizar contador de resultados
function actualizarContador(cantidad) {
    const currentCount = document.getElementById('currentCount');
    const totalCount = document.getElementById('totalCount');
    
    currentCount.textContent = cantidad;
    totalCount.textContent = allColaboradores.length;
}

// Renderizar colaboradores
function renderizarColaboradores(colaboradoresData) {
    const tbody = document.getElementById('usuariosTableBody');
    const cardsGrid = document.getElementById('cardsGrid');
    const mobileContainer = document.getElementById('mobileCardsContainer');

    // Si no hay colaboradores
    if (colaboradoresData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No se encontraron colaboradores</h3>
                    <p>No hay resultados para tu búsqueda.</p>
                </td>
            </tr>
        `;
        cardsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No se encontraron colaboradores</h3>
                <p>No hay resultados para tu búsqueda.</p>
            </div>
        `;
        mobileContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No se encontraron colaboradores</h3>
                <p>No hay resultados para tu búsqueda.</p>
            </div>
        `;
        return;
    }

    // Generar tabla para escritorio
    tbody.innerHTML = '';
    colaboradoresData.forEach(colaborador => {
        const correo = colaborador['CORREO ELECTRÓNICO EMPRESARIAL'] || 'Sin correo';
        const estado = colaborador.trabajo || 'Inactivo';
        const esActivo = estado === 'Activo';
        const textoBoton = esActivo ? 'Deshabilitar' : 'Habilitar';
        const iconoBoton = esActivo ? 'fa-user-slash' : 'fa-user-check';
        
        tbody.innerHTML += `
            <tr>
                <td>
                    ${renderizarFoto(colaborador.imagen, colaborador.NOMBRE || 'Colaborador', 'small')}
                </td>
                <td>${colaborador.NOMBRE || 'Sin nombre'}</td>
                <td>${correo}</td>
                <td>${colaborador['ÁREA'] || 'Sin área'}</td>
                <td>${renderizarEstado(estado)}</td>
                <td>
                    <select class="select-rol" data-id="${colaborador.usuarioId || colaborador.id}" data-colaborador-id="${colaborador.id}">
                        <option value="admin" ${colaborador.rol === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="puntoVenta" ${colaborador.rol === 'puntoVenta' ? 'selected' : ''}>Punto de Venta</option>
                        <option value="facturas" ${colaborador.rol === 'facturas' ? 'selected' : ''}>Facturas</option>
                        <option value="colaborador" ${colaborador.rol === 'colaborador' ? 'selected' : ''}>Colaborador</option>
                        <option value="admincolaborador" ${colaborador.rol === 'admincolaborador' ? 'selected' : ''}>Admin Colaborador</option>
                    </select>
                </td>
                <td>${formatearFecha(colaborador.fechaRegistro)}</td>
                <td>
                    <div class="card-actions">
                        <a href="../detalle-colaborador/detalle-colaborador.html?id=${colaborador.id}&correo=${encodeURIComponent(correo)}" class="action-btn" title="Ver colaborador">
                            <i class="fas fa-eye"></i>
                        </a>
                        <!-- NUEVO BOTÓN: Editar con navegación -->
                        <a href="../editar-colaborador-navegacion/editar-colaborador-navegacion.html?id=${colaborador.id}&correo=${encodeURIComponent(correo)}&nombre=${encodeURIComponent(colaborador.NOMBRE || '')}&area=${encodeURIComponent(colaborador['ÁREA'] || '')}&estado=${encodeURIComponent(estado)}" class="action-btn" title="Editar con navegación">
                            <i class="fas fa-burger"></i>
                        </a>
                        <a href="../editar-colaborador/editar-colaborador.html?id=${colaborador.id}&correo=${encodeURIComponent(correo)}" class="action-btn edit" title="Editar colaborador">
                            <i class="fas fa-edit"></i>
                        </a>
                        <button class="action-btn ${esActivo ? 'delete' : 'edit'}" data-id="${colaborador.id}" data-usuario-id="${colaborador.usuarioId}" title="${textoBoton} acceso">
                            <i class="fas ${iconoBoton}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    // Generar grid de tarjetas para escritorio
    cardsGrid.innerHTML = '';
    colaboradoresData.forEach(colaborador => {
        const correo = colaborador['CORREO ELECTRÓNICO EMPRESARIAL'] || 'Sin correo';
        const estado = colaborador.trabajo || 'Inactivo';
        const esActivo = estado === 'Activo';
        const textoBoton = esActivo ? 'Deshabilitar' : 'Habilitar';
        const iconoBoton = esActivo ? 'fa-user-slash' : 'fa-user-check';
        
        cardsGrid.innerHTML += `
            <div class="ticket-card card-compact">
                <div class="card-header">
                    ${renderizarFoto(colaborador.imagen, colaborador.NOMBRE || 'Colaborador', 'xlarge')}
                    <div class="card-user-name">${colaborador.NOMBRE || 'Sin nombre'}</div>
                    <div class="card-user-email">${correo}</div>
                    <div class="card-user-area">
                        ${colaborador['ÁREA'] || 'Sin área'}
                        ${renderizarEstado(estado)}
                    </div>
                </div>
                <div class="card-details">
                    <div class="card-detail-row">
                    </div>
                    <div class="card-detail-row">
                        <span class="card-detail-label">Rol:</span>
                        <span class="card-detail-value">
                            <select class="select-rol" data-id="${colaborador.usuarioId || colaborador.id}" data-colaborador-id="${colaborador.id}">
                                <option value="admin" ${colaborador.rol === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="puntoVenta" ${colaborador.rol === 'puntoVenta' ? 'selected' : ''}>Punto de Venta</option>
                                <option value="facturas" ${colaborador.rol === 'facturas' ? 'selected' : ''}>Facturas</option>
                                <option value="colaborador" ${colaborador.rol === 'colaborador' ? 'selected' : ''}>Colaborador</option>
                                <option value="admincolaborador" ${colaborador.rol === 'admincolaborador' ? 'selected' : ''}>Admin Colaborador</option>
                            </select>
                        </span>
                    </div>
                    <div class="card-detail-row">
                        <span class="card-detail-label">Registro:</span>
                        <span class="card-detail-value">${formatearFecha(colaborador.fechaRegistro)}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <a href="../detalle-colaborador/detalle-colaborador.html?id=${colaborador.id}&correo=${encodeURIComponent(correo)}" class="action-btn" title="Ver colaborador">
                        <i class="fas fa-eye"></i>
                    </a>
                    <!-- NUEVO BOTÓN: Editar con navegación -->
                    <a href="../editar-colaborador-navegacion/editar-colaborador-navegacion.html?id=${colaborador.id}&correo=${encodeURIComponent(correo)}&nombre=${encodeURIComponent(colaborador.NOMBRE || '')}&area=${encodeURIComponent(colaborador['ÁREA'] || '')}&estado=${encodeURIComponent(estado)}" class="action-btn" title="Editar con navegación">
                        <i class="fas fa-compass"></i>
                    </a>
                    <a href="../editar-colaborador/editar-colaborador.html?id=${colaborador.id}&correo=${encodeURIComponent(correo)}" class="action-btn edit" title="Editar colaborador">
                        <i class="fas fa-edit"></i>
                    </a>
                    <button class="action-btn ${esActivo ? 'delete' : 'edit'}" data-id="${colaborador.id}" data-usuario-id="${colaborador.usuarioId}" title="${textoBoton} acceso">
                        <i class="fas ${iconoBoton}"></i>
                    </button>
                </div>
            </div>
        `;
    });

    // Generar tarjetas para móvil
    mobileContainer.innerHTML = '';
    colaboradoresData.forEach(colaborador => {
        const correo = colaborador['CORREO ELECTRÓNICO EMPRESARIAL'] || 'Sin correo';
        const estado = colaborador.trabajo || 'Inactivo';
        const esActivo = estado === 'Activo';
        const textoBoton = esActivo ? 'Deshabilitar' : 'Habilitar';
        const iconoBoton = esActivo ? 'fa-user-slash' : 'fa-user-check';
        
        mobileContainer.innerHTML += `
            <div class="ticket-card">
                <div class="card-user-info">
                    ${renderizarFoto(colaborador.imagen, colaborador.NOMBRE || 'Colaborador', 'large')}
                    <div class="card-user-details">
                        <div class="card-user-name">${colaborador.NOMBRE || 'Sin nombre'}</div>
                        <div class="card-user-email">${correo}</div>
                    </div>
                </div>
                <div class="card-row">
                    <span class="card-label">Área:</span>
                    <span class="card-value">
                        ${colaborador['ÁREA'] || 'Sin área'}
                        ${renderizarEstado(estado)}
                    </span>
                </div>
                <div class="card-row">
                </div>
                <div class="card-row">
                    <span class="card-label">Rol:</span>
                    <span class="card-value">
                        <select class="select-rol" data-id="${colaborador.usuarioId || colaborador.id}" data-colaborador-id="${colaborador.id}">
                            <option value="admin" ${colaborador.rol === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="puntoVenta" ${colaborador.rol === 'puntoVenta' ? 'selected' : ''}>Punto de Venta</option>
                            <option value="facturas" ${colaborador.rol === 'facturas' ? 'selected' : ''}>Facturas</option>
                            <option value="colaborador" ${colaborador.rol === 'colaborador' ? 'selected' : ''}>Colaborador</option>
                            <option value="admincolaborador" ${colaborador.rol === 'admincolaborador' ? 'selected' : ''}>Admin Colaborador</option>
                        </select>
                    </span>
                </div>
                <div class="card-row">
                    <span class="card-label">Fecha Registro:</span>
                    <span class="card-value">${formatearFecha(colaborador.fechaRegistro)}</span>
                </div>
                <div class="card-actions">
                    <a href="../detalle-colaborador/detalle-colaborador.html?id=${colaborador.id}&correo=${encodeURIComponent(correo)}" class="action-btn" title="Ver colaborador">
                        <i class="fas fa-eye"></i>
                    </a>
                    <!-- NUEVO BOTÓN: Editar con navegación -->
                    <a href="../editar-colaborador-navegacion/editar-colaborador-navegacion.html?id=${colaborador.id}&correo=${encodeURIComponent(correo)}&nombre=${encodeURIComponent(colaborador.NOMBRE || '')}&area=${encodeURIComponent(colaborador['ÁREA'] || '')}&estado=${encodeURIComponent(estado)}" class="action-btn" title="Editar con navegación">
                        <i class="fas fa-compass"></i>
                    </a>
                    <a href="../editar-colaborador/editar-colaborador.html?id=${colaborador.id}&correo=${encodeURIComponent(correo)}" class="action-btn edit" title="Editar colaborador">
                        <i class="fas fa-edit"></i>
                    </a>
                    <button class="action-btn ${esActivo ? 'delete' : 'edit'}" data-id="${colaborador.id}" data-usuario-id="${colaborador.usuarioId}" title="${textoBoton} acceso">
                        <i class="fas ${iconoBoton}"></i>
                    </button>
                </div>
            </div>
        `;
    });

    agregarEventListeners();
}

// Cargar colaboradores - OPTIMIZADO
async function cargarColaboradores() {
    const tbody = document.getElementById('usuariosTableBody');
    const cardsGrid = document.getElementById('cardsGrid');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    
    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando colaboradores...</p>
            </td>
        </tr>
    `;
    cardsGrid.innerHTML = '';
    mobileContainer.innerHTML = '';

    try {
        // Obtener TODOS los colaboradores de la colección colaboradores
        const colaboradoresSnapshot = await db.collection('colaboradores').get();
        const usuariosSnapshot = await db.collection('usuarios').get();

        // Crear mapa de usuarios para buscar por EMAIL
        const usuariosMap = new Map();
        usuariosSnapshot.forEach(doc => {
            usuariosMap.set(doc.id, {
                id: doc.id,
                ...doc.data()
            });
        });

        allColaboradores = [];
        
        // Procesar TODOS los colaboradores
        colaboradoresSnapshot.forEach(doc => {
            const colaborador = doc.data();
            const correoEmpresarial = colaborador['CORREO ELECTRÓNICO EMPRESARIAL'];
            const correoPersonal = colaborador['CORREO ELECTRONICO PERSONAL'] || colaborador['CORREO ELECTRÓNICO PERSONAL'];
            
            // Buscar usuario por correo electrónico
            let usuarioEncontrado = null;
            for (let [usuarioId, usuario] of usuariosMap) {
                if (usuario.email === correoEmpresarial || usuario.email === correoPersonal) {
                    usuarioEncontrado = usuario;
                    break;
                }
            }
            
            // Incluir todos los colaboradores
            allColaboradores.push({
                id: doc.id,
                ...colaborador,
                rol: usuarioEncontrado ? usuarioEncontrado.rol : 'colaborador',
                fechaRegistro: usuarioEncontrado ? usuarioEncontrado.fechaRegistro : colaborador.fecha,
                usuarioId: usuarioEncontrado ? usuarioEncontrado.id : null
            });
        });

        // Si no hay colaboradores
        if (allColaboradores.length === 0) {
            renderizarColaboradores([]);
            return;
        }

        // Ordenar colaboradores por fecha de registro (más recientes primero)
        allColaboradores.sort((a, b) => {
            const fechaA = a.fechaRegistro ? a.fechaRegistro.toDate() : new Date(0);
            const fechaB = b.fechaRegistro ? b.fechaRegistro.toDate() : new Date(0);
            return fechaB - fechaA;
        });

        // Aplicar filtros iniciales
        filtrarColaboradores();

    } catch (error) {
        console.error('Error cargando colaboradores:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar colaboradores</h3>
                    <p>No se pudieron cargar los colaboradores. Intente nuevamente.</p>
                </td>
            </tr>
        `;
        cardsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar colaboradores</h3>
                <p>No se pudieron cargar los colaboradores. Intente nuevamente.</p>
            </div>
        `;
        mobileContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar colaboradores</h3>
                <p>No se pudieron cargar los colaboradores. Intente nuevamente.</p>
            </div>
        `;
    }
}

// Actualizar rol de usuario
async function actualizarRol(usuarioId, colaboradorId, nuevoRol) {
    try {
        // Si tenemos usuarioId, actualizar en la colección usuarios
        if (usuarioId) {
            await db.collection('usuarios').doc(usuarioId).update({
                rol: nuevoRol
            });
        } else {
            // Si no existe el usuario, crear uno básico
            const colaboradorDoc = await db.collection('colaboradores').doc(colaboradorId).get();
            if (colaboradorDoc.exists) {
                const colaborador = colaboradorDoc.data();
                const userRef = await db.collection('usuarios').add({
                    email: colaborador['CORREO ELECTRÓNICO EMPRESARIAL'] || colaborador['CORREO ELECTRONICO PERSONAL'],
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                    nombreCompleto: colaborador.NOMBRE,
                    rol: nuevoRol
                });
                // Actualizar el colaborador con el nuevo usuarioId
                await db.collection('colaboradores').doc(colaboradorId).update({
                    usuarioId: userRef.id
                });
            }
        }
        
        if (typeof showCustomSuccess !== 'undefined') {
            showCustomSuccess('¡Rol actualizado!', `El rol ha sido cambiado a ${obtenerNombreRol(nuevoRol)}`);
        } else {
            Swal.fire({
                title: '¡Rol actualizado!',
                text: `El rol ha sido cambiado a ${obtenerNombreRol(nuevoRol)}`,
                icon: 'success',
                confirmButtonColor: '#FFD700',
                timer: 1500,
                showConfirmButton: false
            });
        }

        // Recargar para reflejar los cambios
        setTimeout(() => {
            cargarColaboradores();
        }, 1000);

    } catch (error) {
        console.error('Error actualizando rol:', error);
        if (typeof showCustomError !== 'undefined') {
            showCustomError('Error', 'No se pudo actualizar el rol');
        } else {
            Swal.fire('Error', 'No se pudo actualizar el rol', 'error');
        }
    }
}

// Función: Cambiar estado Activo/Inactivo
async function cambiarEstadoColaborador(colaboradorId, usuarioId) {
    try {
        // Obtener datos actuales del colaborador
        const colaboradorDoc = await db.collection('colaboradores').doc(colaboradorId).get();
        if (!colaboradorDoc.exists) {
            throw new Error('Colaborador no encontrado');
        }
        
        const colaborador = colaboradorDoc.data();
        const estadoActual = colaborador.trabajo || 'Inactivo';
        const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
        
        // Actualizar el campo "trabajo" en Firestore
        await db.collection('colaboradores').doc(colaboradorId).update({
            trabajo: nuevoEstado,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Si existe usuario, actualizar también su estado
        if (usuarioId) {
            await db.collection('usuarios').doc(usuarioId).update({
                deshabilitado: nuevoEstado === 'Inactivo',
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // Mostrar mensaje de éxito
        if (typeof showCustomSuccess !== 'undefined') {
            showCustomSuccess('¡Estado actualizado!', `El colaborador ahora está ${nuevoEstado}`);
        } else {
            Swal.fire({
                title: '¡Estado actualizado!',
                text: `El colaborador ahora está ${nuevoEstado}`,
                icon: 'success',
                confirmButtonColor: '#FFD700',
                timer: 2000,
                showConfirmButton: false
            });
        }
        
        // Recargar la lista de colaboradores
        cargarColaboradores();
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        if (typeof showCustomError !== 'undefined') {
            showCustomError('Error', 'No se pudo cambiar el estado del colaborador');
        } else {
            Swal.fire('Error', 'No se pudo cambiar el estado del colaborador', 'error');
        }
    }
}

// Event listeners
function agregarEventListeners() {
    // Cambiar estado Activo/Inactivo
    document.querySelectorAll('.action-btn.delete, .action-btn.edit[data-id]').forEach(btn => {
        if (btn.classList.contains('delete') || (btn.classList.contains('edit') && btn.dataset.id)) {
            btn.addEventListener('click', () => {
                const colaboradorId = btn.dataset.id;
                const usuarioId = btn.dataset.usuarioId;
                
                // Obtener el estado actual para el mensaje
                const colaborador = allColaboradores.find(c => c.id === colaboradorId);
                const estadoActual = colaborador ? (colaborador.trabajo || 'Inactivo') : 'Inactivo';
                const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
                const accion = estadoActual === 'Activo' ? 'deshabilitar' : 'habilitar';
                
                if (typeof showCustomConfirm !== 'undefined') {
                    showCustomConfirm(
                        `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} colaborador?`,
                        `El colaborador pasará a estado "${nuevoEstado}".`,
                        `Sí, ${accion}`,
                        'Cancelar'
                    ).then((result) => {
                        if (result.isConfirmed) {
                            cambiarEstadoColaborador(colaboradorId, usuarioId);
                        }
                    });
                } else {
                    Swal.fire({
                        title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} colaborador?`,
                        text: `El colaborador pasará a estado "${nuevoEstado}".`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: nuevoEstado === 'Inactivo' ? '#d33' : '#28a745',
                        cancelButtonColor: '#3085d6',
                        confirmButtonText: `Sí, ${accion}`,
                        cancelButtonText: 'Cancelar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            cambiarEstadoColaborador(colaboradorId, usuarioId);
                        }
                    });
                }
            });
        }
    });

    // Cambio de rol
    document.querySelectorAll('.select-rol').forEach(select => {
        select.addEventListener('change', () => {
            const usuarioId = select.dataset.id;
            const colaboradorId = select.dataset.colaboradorId;
            const nuevoRol = select.value;
            actualizarRol(usuarioId, colaboradorId, nuevoRol);
        });
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Configurar eventos de los botones de vista
    document.getElementById('tableViewBtn').addEventListener('click', () => cambiarVista('table'));
    document.getElementById('cardViewBtn').addEventListener('click', () => cambiarVista('cards'));

    // Configurar buscador con debounce para mejor rendimiento
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTerm = e.target.value;
        searchTimeout = setTimeout(() => {
            filtrarColaboradores();
        }, 300);
    });

    // Configurar filtros rápidos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover clase active de todos los botones
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            // Agregar clase active al botón clickeado
            btn.classList.add('active');
            // Actualizar filtro actual
            currentFilter = btn.dataset.filter;
            // Aplicar filtro
            filtrarColaboradores();
        });
    });

    // Cargar colaboradores
    cargarColaboradores();
    
    // Escuchar cambios en tiempo real (solo cambios importantes)
    db.collection('colaboradores').onSnapshot(() => {
        cargarColaboradores();
    });

    db.collection('usuarios').onSnapshot(() => {
        cargarColaboradores();
    });
});