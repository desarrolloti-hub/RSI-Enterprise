// Sistema de gestión de usuarios - Versión completa
// gestion-usuarios.js

// Variables globales
let db;
const appState = {
    usuarios: [],
    usuariosFiltrados: [],
    totalUsuarios: 0,
    usuariosActivos: 0,
    usuariosRecientes: 0,
    currentPage: 1,
    pageSize: 15,
    totalPages: 1,
    filtros: {
        nombre: '',
        email: '',
        fechaInicio: null,
        fechaFin: null
    }
};

// Esperar a que Firebase esté listo
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            db = firebase.firestore();
            console.log('✅ Firebase Firestore inicializado');
            resolve(true);
        } else {
            const checkInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(checkInterval);
                    db = firebase.firestore();
                    console.log('✅ Firebase Firestore inicializado (retardado)');
                    resolve(true);
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                console.error('❌ Firebase no se cargó después de 10 segundos');
                mostrarError('Firebase no se pudo inicializar. Recarga la página.');
                resolve(false);
            }, 10000);
        }
    });
}

// Formatear fecha
function formatearFecha(timestamp) {
    if (!timestamp) return 'Sin fecha';
    
    try {
        let fecha;
        if (timestamp.toDate) {
            fecha = timestamp.toDate();
        } else if (timestamp.seconds) {
            fecha = new Date(timestamp.seconds * 1000);
        } else {
            fecha = new Date(timestamp);
        }
        
        return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

// Obtener badge de rol
function getRolBadge(rol) {
    if (!rol) rol = 'user';
    
    const rolMap = {
        'user': { text: 'Usuario', class: 'badge-user' },
        'admin': { text: 'Administrador', class: 'badge-admin' },
        'puntoVenta': { text: 'Punto de Venta', class: 'badge-puntoVenta' },
        'facturas': { text: 'Facturas', class: 'badge-facturas' },
        'colaborador': { text: 'Colaborador', class: 'badge-colaborador' },
        'admincolaborador': { text: 'Admin Colaborador', class: 'badge-admincolaborador' }
    };
    
    const badgeInfo = rolMap[rol] || { text: rol, class: 'badge-user' };
    return `<span class="badge ${badgeInfo.class}">${badgeInfo.text}</span>`;
}

// Extraer datos de usuario
function extraerDatosUsuario(data, docId) {
    // Nombre
    const nombre = data.nombreCompleto || data.displayName || data.name || 
                  `${data.firstName || ''} ${data.lastName || ''}`.trim() || 
                  'Usuario sin nombre';
    
    // Email
    const email = data.email || data.correo || data.mail || 'Sin correo';
    
    // Rol
    const rol = data.rol || data.role || data.userType || 'user';
    
    // Fecha de registro
    const fechaRegistro = data.fechaRegistro || data.createdAt || data.registrationDate || 
                         data.dateCreated || data.timestamp || new Date();
    
    // Estado
    const estado = data.estado || data.status || data.accountStatus || 'active';
    
    // Teléfono
    const telefono = data.telefono || data.phone || data.phoneNumber || 'No especificado';
    
    return {
        id: docId,
        nombre: nombre,
        email: email,
        rol: rol,
        fechaRegistro: fechaRegistro,
        estado: estado,
        telefono: telefono,
        foto: data.foto || data.photoURL || data.profilePicture || null,
        direccion: data.direccion || data.address || 'No especificada',
        ciudad: data.ciudad || data.city || 'No especificada',
        pais: data.pais || data.country || 'No especificado'
    };
}

// Cargar estadísticas
function cargarEstadisticas(usuarios) {
    try {
        // Filtrar solo usuarios con rol "user"
        const usuariosUser = usuarios.filter(user => user.rol === 'user');
        
        // Contar usuarios activos (asumimos que todos están activos si no hay campo estado)
        const usuariosActivos = usuariosUser.length;
        
        // Contar usuarios registrados este mes
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const usuariosRecientes = usuariosUser.filter(user => {
            const fechaUsuario = user.fechaRegistro instanceof Date ? 
                user.fechaRegistro : new Date(user.fechaRegistro);
            return fechaUsuario >= inicioMes;
        }).length;
        
        appState.totalUsuarios = usuariosUser.length;
        appState.usuariosActivos = usuariosActivos;
        appState.usuariosRecientes = usuariosRecientes;
        
        // Actualizar UI
        document.getElementById('totalUsuarios').textContent = appState.totalUsuarios;
        document.getElementById('usuariosActivos').textContent = usuariosActivos;
        document.getElementById('usuariosRecientes').textContent = usuariosRecientes;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Aplicar filtros
function aplicarFiltrosLocales() {
    let usuariosFiltrados = appState.usuarios;
    
    // Filtrar por rol "user" (SOLO USUARIOS CON ROL "user")
    usuariosFiltrados = usuariosFiltrados.filter(user => user.rol === 'user');
    
    // Aplicar filtro de nombre
    if (appState.filtros.nombre) {
        const nombreBusqueda = appState.filtros.nombre.toLowerCase();
        usuariosFiltrados = usuariosFiltrados.filter(user => 
            user.nombre.toLowerCase().includes(nombreBusqueda)
        );
    }
    
    // Aplicar filtro de email
    if (appState.filtros.email) {
        const emailBusqueda = appState.filtros.email.toLowerCase();
        usuariosFiltrados = usuariosFiltrados.filter(user => 
            user.email.toLowerCase().includes(emailBusqueda)
        );
    }
    
    // Aplicar filtro de fecha
    if (appState.filtros.fechaInicio) {
        const fechaInicio = new Date(appState.filtros.fechaInicio);
        fechaInicio.setHours(0, 0, 0, 0);
        usuariosFiltrados = usuariosFiltrados.filter(user => {
            const fechaUsuario = user.fechaRegistro instanceof Date ? 
                user.fechaRegistro : new Date(user.fechaRegistro);
            return fechaUsuario >= fechaInicio;
        });
    }
    
    if (appState.filtros.fechaFin) {
        const fechaFin = new Date(appState.filtros.fechaFin);
        fechaFin.setHours(23, 59, 59, 999);
        usuariosFiltrados = usuariosFiltrados.filter(user => {
            const fechaUsuario = user.fechaRegistro instanceof Date ? 
                user.fechaRegistro : new Date(user.fechaRegistro);
            return fechaUsuario <= fechaFin;
        });
    }
    
    // Ordenar por nombre (A-Z)
    usuariosFiltrados.sort((a, b) => {
        const nombreA = a.nombre.toLowerCase();
        const nombreB = b.nombre.toLowerCase();
        return nombreA.localeCompare(nombreB, 'es');
    });
    
    appState.usuariosFiltrados = usuariosFiltrados;
    
    // Recalcular paginación
    appState.totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / appState.pageSize));
    appState.currentPage = 1;
}

// Cargar usuarios con paginación
async function cargarUsuarios() {
    const tablaContainer = document.getElementById("usuarios-lista");
    
    if (!db) {
        mostrarError('Firebase no está inicializado. Recarga la página.');
        return;
    }
    
    // Mostrar loading
    tablaContainer.innerHTML = `
        <tr class="loading-state">
            <td colspan="6">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando usuarios...</p>
            </td>
        </tr>
    `;
    
    try {
        console.log('🔍 Buscando usuarios en Firebase...');
        
        // Intentar diferentes colecciones
        const colecciones = ["usuarios", "Users", "users", "Usuarios"];
        let usuariosEncontrados = [];
        
        for (const coleccion of colecciones) {
            try {
                const snapshot = await db.collection(coleccion).get();
                
                if (!snapshot.empty) {
                    console.log(`✅ Encontrados ${snapshot.size} usuarios en ${coleccion}`);
                    
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        usuariosEncontrados.push(
                            extraerDatosUsuario(data, doc.id)
                        );
                    });
                }
            } catch (error) {
                console.log(`⚠️ No se pudo acceder a ${coleccion}: ${error.message}`);
            }
        }
        
        if (usuariosEncontrados.length === 0) {
            const emptyHTML = `
                <tr class="empty-state">
                    <td colspan="6">
                        <i class="fas fa-users"></i>
                        <h3>No hay usuarios registrados</h3>
                        <p>No se encontraron usuarios en la base de datos.</p>
                        <button onclick="cargarUsuarios()" class="btn-accion" style="margin-top: 15px;">
                            <i class="fas fa-redo"></i> Reintentar
                        </button>
                    </td>
                </tr>
            `;
            
            tablaContainer.innerHTML = emptyHTML;
            actualizarPaginacion();
            cargarEstadisticas([]);
            return;
        }
        
        console.log(`📊 Total de usuarios encontrados: ${usuariosEncontrados.length}`);
        
        // Guardar todos los usuarios
        appState.usuarios = usuariosEncontrados;
        
        // Aplicar filtros (incluye filtro por rol "user")
        aplicarFiltrosLocales();
        
        // Verificar si hay usuarios después del filtro por rol "user"
        if (appState.usuariosFiltrados.length === 0) {
            const emptyHTML = `
                <tr class="empty-state">
                    <td colspan="6">
                        <i class="fas fa-user-slash"></i>
                        <h3>No hay usuarios con rol "Usuario"</h3>
                        <p>Solo se muestran usuarios con rol "Usuario".</p>
                        <p><small>Usuarios encontrados con otros roles: ${appState.usuarios.length}</small></p>
                        <button onclick="limpiarFiltros()" class="btn-accion" style="margin-top: 15px;">
                            <i class="fas fa-times"></i> Mostrar todos los usuarios
                        </button>
                    </td>
                </tr>
            `;
            
            tablaContainer.innerHTML = emptyHTML;
            actualizarPaginacion();
            cargarEstadisticas([]);
            return;
        }
        
        // Obtener usuarios para la página actual
        const startIndex = (appState.currentPage - 1) * appState.pageSize;
        const endIndex = startIndex + appState.pageSize;
        const usuariosPagina = appState.usuariosFiltrados.slice(startIndex, endIndex);
        
        // Generar HTML para la tabla
        let tablaHTML = '';
        
        usuariosPagina.forEach((usuario, index) => {
            const numeroUsuario = startIndex + index + 1;
            
            tablaHTML += `
                <tr data-id="${usuario.id}">
                    <td>
                        <strong>${usuario.id.substring(0, 15)}${usuario.id.length > 15 ? '...' : ''}</strong>
                    </td>
                    <td>
                        <strong>${escapeHtml(usuario.nombre)}</strong>
                        ${usuario.telefono !== 'No especificado' ? 
                            `<br><small style="color: #aaa;">📱 ${escapeHtml(usuario.telefono)}</small>` : ''}
                    </td>
                    <td>${escapeHtml(usuario.email)}</td>
                    <td>${getRolBadge(usuario.rol)}</td>
                    <td>${formatearFecha(usuario.fechaRegistro)}</td>
                    <td>
                        <div class="acciones-container">
                            <button class="btn-accion btn-ver" 
                                    data-id="${usuario.id}"
                                    title="Ver detalles">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-accion btn-eliminar" 
                                    data-id="${usuario.id}"
                                    data-nombre="${escapeHtml(usuario.nombre)}"
                                    title="Eliminar usuario">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        // Actualizar tabla
        tablaContainer.innerHTML = tablaHTML;
        
        // Configurar eventos
        configurarEventos();
        
        // Actualizar estadísticas
        cargarEstadisticas(appState.usuariosFiltrados);
        
        // Actualizar paginación
        actualizarPaginacion();
        
    } catch (error) {
        console.error("Error cargando usuarios:", error);
        mostrarError('Error al cargar usuarios: ' + error.message);
    }
}

// Mostrar modal de detalles
async function mostrarModalDetalles(usuarioId) {
    try {
        // Buscar el usuario en la lista ya cargada
        const usuario = appState.usuarios.find(u => u.id === usuarioId);
        
        if (!usuario) {
            // Intentar buscar directamente en Firebase
            const colecciones = ["usuarios", "Users", "users", "Usuarios"];
            let usuarioEncontrado = null;
            
            for (const coleccion of colecciones) {
                try {
                    const doc = await db.collection(coleccion).doc(usuarioId).get();
                    if (doc.exists) {
                        usuarioEncontrado = extraerDatosUsuario(doc.data(), doc.id);
                        break;
                    }
                } catch (error) {
                    console.log(`⚠️ No se pudo buscar en ${coleccion}: ${error.message}`);
                }
            }
            
            if (!usuarioEncontrado) {
                Swal.fire({
                    title: 'Error',
                    text: 'No se encontró el usuario',
                    icon: 'error',
                    background: '#2d2d2d',
                    color: '#ffffff'
                });
                return;
            }
            
            mostrarDetallesUsuario(usuarioEncontrado);
            return;
        }
        
        mostrarDetallesUsuario(usuario);
        
    } catch (error) {
        console.error("Error al mostrar detalle:", error);
        Swal.fire({
            title: 'Error',
            html: `
                <div style="text-align: left;">
                    <p><strong>Error al cargar los detalles:</strong></p>
                    <p>${error.message}</p>
                    <p><small>Verifica tu conexión e intenta nuevamente.</small></p>
                </div>
            `,
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Mostrar detalles del usuario
function mostrarDetallesUsuario(usuario) {
    // Llenar modal con información
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="info-section">
            <h4><i class="fas fa-info-circle"></i> Información del Usuario</h4>
            <div class="info-row">
                <strong>ID:</strong>
                <span><strong>${usuario.id}</strong></span>
            </div>
            <div class="info-row">
                <strong>Nombre:</strong>
                <span>${escapeHtml(usuario.nombre)}</span>
            </div>
            <div class="info-row">
                <strong>Email:</strong>
                <span>${escapeHtml(usuario.email)}</span>
            </div>
            <div class="info-row">
                <strong>Rol:</strong>
                <span>${getRolBadge(usuario.rol)}</span>
            </div>
            <div class="info-row">
                <strong>Estado:</strong>
                <span style="color: ${usuario.estado === 'active' ? '#28a745' : '#dc3545'};">
                    ${usuario.estado === 'active' ? '✅ Activo' : '❌ Inactivo'}
                </span>
            </div>
        </div>
        
        <div class="info-section">
            <h4><i class="fas fa-address-card"></i> Información de Contacto</h4>
            <div class="info-row">
                <strong>Teléfono:</strong>
                <span>${escapeHtml(usuario.telefono)}</span>
            </div>
            ${usuario.direccion !== 'No especificada' ? `
            <div class="info-row">
                <strong>Dirección:</strong>
                <span>${escapeHtml(usuario.direccion)}</span>
            </div>
            ` : ''}
            ${usuario.ciudad !== 'No especificada' ? `
            <div class="info-row">
                <strong>Ciudad:</strong>
                <span>${escapeHtml(usuario.ciudad)}</span>
            </div>
            ` : ''}
            ${usuario.pais !== 'No especificado' ? `
            <div class="info-row">
                <strong>País:</strong>
                <span>${escapeHtml(usuario.pais)}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="info-section">
            <h4><i class="fas fa-calendar-alt"></i> Información de Registro</h4>
            <div class="info-row">
                <strong>Fecha de registro:</strong>
                <span>${formatearFecha(usuario.fechaRegistro)}</span>
            </div>
            <div class="info-row">
                <strong>Tiempo registrado:</strong>
                <span>${calcularTiempoRegistro(usuario.fechaRegistro)}</span>
            </div>
        </div>
    `;
    
    // Configurar botón de eliminar
    const eliminarBtn = document.getElementById('eliminarUsuarioBtn');
    eliminarBtn.dataset.id = usuario.id;
    eliminarBtn.dataset.nombre = usuario.nombre;
    
    // Mostrar modal
    document.getElementById('detalleModal').style.display = 'flex';
}

// Calcular tiempo de registro
function calcularTiempoRegistro(fechaRegistro) {
    try {
        const fechaUsuario = fechaRegistro instanceof Date ? 
            fechaRegistro : new Date(fechaRegistro);
        const ahora = new Date();
        
        const diferencia = ahora - fechaUsuario;
        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        
        if (dias < 1) {
            return 'Hoy';
        } else if (dias === 1) {
            return 'Ayer';
        } else if (dias < 7) {
            return `${dias} días`;
        } else if (dias < 30) {
            const semanas = Math.floor(dias / 7);
            return `${semanas} semana${semanas > 1 ? 's' : ''}`;
        } else if (dias < 365) {
            const meses = Math.floor(dias / 30);
            return `${meses} mes${meses > 1 ? 'es' : ''}`;
        } else {
            const años = Math.floor(dias / 365);
            return `${años} año${años > 1 ? 's' : ''}`;
        }
    } catch (error) {
        return 'No disponible';
    }
}

// Eliminar usuario
async function eliminarUsuario(usuarioId, usuarioNombre) {
    try {
        // Buscar en qué colección está el usuario
        const colecciones = ["usuarios", "Users", "users", "Usuarios"];
        let coleccionEncontrada = null;
        
        for (const coleccion of colecciones) {
            try {
                const doc = await db.collection(coleccion).doc(usuarioId).get();
                if (doc.exists) {
                    coleccionEncontrada = coleccion;
                    break;
                }
            } catch (error) {
                console.log(`⚠️ No se pudo buscar en ${coleccion}: ${error.message}`);
            }
        }
        
        if (!coleccionEncontrada) {
            Swal.fire({
                title: 'Error',
                text: 'No se pudo encontrar el usuario en la base de datos',
                icon: 'error',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        // Confirmar eliminación
        const confirmacion = await Swal.fire({
            title: '¿Eliminar usuario?',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 15px;"></i>
                    <p><strong>¿Estás seguro de eliminar a ${escapeHtml(usuarioNombre)}?</strong></p>
                    <p>Esta acción no se puede deshacer.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        if (!confirmacion.isConfirmed) {
            return;
        }
        
        // Mostrar loading
        Swal.fire({
            title: 'Eliminando usuario...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        // Eliminar de Firebase
        await db.collection(coleccionEncontrada).doc(usuarioId).delete();
        
        // Cerrar modal si está abierto
        document.getElementById('detalleModal').style.display = 'none';
        
        // Mostrar éxito
        Swal.fire({
            title: '¡Usuario eliminado!',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #28a745; margin-bottom: 15px;"></i>
                    <p>El usuario <strong>${escapeHtml(usuarioNombre)}</strong> ha sido eliminado exitosamente.</p>
                </div>
            `,
            icon: 'success',
            background: '#2d2d2d',
            color: '#ffffff',
            timer: 2000,
            showConfirmButton: false
        });
        
        // Recargar usuarios
        cargarUsuarios();
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar el usuario: ' + error.message,
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Exportar a Excel
function exportarExcel() {
    try {
        if (appState.usuariosFiltrados.length === 0) {
            Swal.fire({
                title: 'Sin datos',
                text: 'No hay usuarios para exportar',
                icon: 'warning',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        // Crear hoja de cálculo
        const wsData = [
            ['ID', 'Nombre', 'Email', 'Rol', 'Teléfono', 'Fecha Registro', 'Estado']
        ];
        
        appState.usuariosFiltrados.forEach(usuario => {
            wsData.push([
                usuario.id,
                usuario.nombre,
                usuario.email,
                usuario.rol === 'user' ? 'Usuario' : usuario.rol,
                usuario.telefono,
                formatearFecha(usuario.fechaRegistro),
                usuario.estado
            ]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
        
        // Ajustar ancho de columnas
        const wscols = [
            {wch: 25}, // ID
            {wch: 25}, // Nombre
            {wch: 30}, // Email
            {wch: 15}, // Rol
            {wch: 15}, // Teléfono
            {wch: 20}, // Fecha Registro
            {wch: 15}  // Estado
        ];
        ws['!cols'] = wscols;
        
        // Generar y descargar archivo
        const fecha = new Date().toISOString().split('T')[0];
        const hora = new Date().getHours().toString().padStart(2, '0') + 
                    new Date().getMinutes().toString().padStart(2, '0');
        XLSX.writeFile(wb, `usuarios_${fecha}_${hora}.xlsx`);
        
        Swal.fire({
            title: 'Exportado exitosamente',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-file-excel" style="font-size: 3rem; color: #28a745; margin-bottom: 15px;"></i>
                    <p>Se exportaron ${appState.usuariosFiltrados.length} usuarios</p>
                    <p><small>Archivo: usuarios_${fecha}_${hora}.xlsx</small></p>
                </div>
            `,
            icon: 'success',
            background: '#2d2d2d',
            color: '#ffffff',
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('Error exportando Excel:', error);
        Swal.fire({
            title: 'Error en exportación',
            html: `
                <div style="text-align: left;">
                    <p><strong>No se pudo exportar el archivo:</strong></p>
                    <p>${error.message}</p>
                    <p><small>Asegúrate de tener permisos para descargar archivos.</small></p>
                </div>
            `,
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Actualizar paginación
function actualizarPaginacion() {
    const btnAnterior = document.getElementById('btnAnterior');
    const btnSiguiente = document.getElementById('btnSiguiente');
    const paginaInfo = document.getElementById('paginaInfo');
    
    btnAnterior.disabled = appState.currentPage <= 1;
    btnSiguiente.disabled = appState.currentPage >= appState.totalPages;
    
    paginaInfo.textContent = `Página ${appState.currentPage} de ${appState.totalPages} (${appState.usuariosFiltrados.length} usuarios)`;
}

// Aplicar filtros
function aplicarFiltros() {
    appState.filtros.nombre = document.getElementById('filtroNombre').value || '';
    appState.filtros.email = document.getElementById('filtroEmail').value || '';
    appState.filtros.fechaInicio = document.getElementById('filtroFechaInicio').value || null;
    appState.filtros.fechaFin = document.getElementById('filtroFechaFin').value || null;
    
    // Aplicar filtros locales
    aplicarFiltrosLocales();
    
    // Recargar tabla
    cargarTablaPaginada();
    
    // Ocultar filtros
    document.getElementById('filtrosContainer').style.display = 'none';
    
    Swal.fire({
        title: 'Filtros aplicados',
        text: 'Los filtros se aplicaron correctamente',
        icon: 'success',
        background: '#2d2d2d',
        color: '#ffffff',
        timer: 1500,
        showConfirmButton: false
    });
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroNombre').value = '';
    document.getElementById('filtroEmail').value = '';
    document.getElementById('filtroFechaInicio').value = '';
    document.getElementById('filtroFechaFin').value = '';
    
    appState.filtros = {
        nombre: '',
        email: '',
        fechaInicio: null,
        fechaFin: null
    };
    
    appState.currentPage = 1;
    
    // Aplicar solo el filtro por rol "user"
    aplicarFiltrosLocales();
    
    // Recargar tabla
    cargarTablaPaginada();
    
    Swal.fire({
        title: 'Filtros limpiados',
        text: 'Todos los filtros se han limpiado',
        icon: 'success',
        background: '#2d2d2d',
        color: '#ffffff',
        timer: 1500,
        showConfirmButton: false
    });
}

// Cargar tabla paginada
function cargarTablaPaginada() {
    const tablaContainer = document.getElementById("usuarios-lista");
    
    if (appState.usuariosFiltrados.length === 0) {
        const emptyHTML = `
            <tr class="empty-state">
                <td colspan="6">
                    <i class="fas fa-user-slash"></i>
                    <h3>No hay usuarios con rol "Usuario"</h3>
                    <p>Solo se muestran usuarios con rol "Usuario".</p>
                    <p><small>Usuarios encontrados con otros roles: ${appState.usuarios.length}</small></p>
                    <button onclick="limpiarFiltros()" class="btn-accion" style="margin-top: 15px;">
                        <i class="fas fa-times"></i> Mostrar todos los usuarios
                    </button>
                </td>
            </tr>
        `;
        
        tablaContainer.innerHTML = emptyHTML;
        actualizarPaginacion();
        cargarEstadisticas([]);
        return;
    }
    
    // Obtener usuarios para la página actual
    const startIndex = (appState.currentPage - 1) * appState.pageSize;
    const endIndex = startIndex + appState.pageSize;
    const usuariosPagina = appState.usuariosFiltrados.slice(startIndex, endIndex);
    
    // Generar HTML para la tabla
    let tablaHTML = '';
    
    usuariosPagina.forEach((usuario, index) => {
        const numeroUsuario = startIndex + index + 1;
        
        tablaHTML += `
            <tr data-id="${usuario.id}">
                <td>
                    <strong>${usuario.id.substring(0, 15)}${usuario.id.length > 15 ? '...' : ''}</strong>
                </td>
                <td>
                    <strong>${escapeHtml(usuario.nombre)}</strong>
                    ${usuario.telefono !== 'No especificado' ? 
                        `<br><small style="color: #aaa;">📱 ${escapeHtml(usuario.telefono)}</small>` : ''}
                </td>
                <td>${escapeHtml(usuario.email)}</td>
                <td>${getRolBadge(usuario.rol)}</td>
                <td>${formatearFecha(usuario.fechaRegistro)}</td>
                <td>
                    <div class="acciones-container">
                        <button class="btn-accion btn-ver" 
                                data-id="${usuario.id}"
                                title="Ver detalles">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn-accion btn-eliminar" 
                                data-id="${usuario.id}"
                                data-nombre="${escapeHtml(usuario.nombre)}"
                                title="Eliminar usuario">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    // Actualizar tabla
    tablaContainer.innerHTML = tablaHTML;
    
    // Configurar eventos
    configurarEventos();
    
    // Actualizar estadísticas
    cargarEstadisticas(appState.usuariosFiltrados);
    
    // Actualizar paginación
    actualizarPaginacion();
}

// Configurar eventos
function configurarEventos() {
    // Evento para ver detalles
    document.querySelectorAll('.btn-ver').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            mostrarModalDetalles(id);
        });
    });
    
    // Evento para eliminar usuario desde tabla
    document.querySelectorAll('.btn-eliminar').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const nombre = e.currentTarget.dataset.nombre;
            eliminarUsuario(id, nombre);
        });
    });
    
    // Eventos de paginación
    document.getElementById('btnAnterior').addEventListener('click', () => {
        if (appState.currentPage > 1) {
            appState.currentPage--;
            cargarTablaPaginada();
        }
    });
    
    document.getElementById('btnSiguiente').addEventListener('click', () => {
        if (appState.currentPage < appState.totalPages) {
            appState.currentPage++;
            cargarTablaPaginada();
        }
    });
    
    // Evento para cerrar modal
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('detalleModal').style.display = 'none';
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('detalleModal').style.display = 'none';
    });
    
    // Evento para eliminar desde modal
    document.getElementById('eliminarUsuarioBtn').addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const nombre = e.currentTarget.dataset.nombre;
        eliminarUsuario(id, nombre);
    });
    
    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('detalleModal').style.display === 'flex') {
            document.getElementById('detalleModal').style.display = 'none';
        }
    });
    
    // Evento para mostrar/ocultar filtros
    document.getElementById('btnMostrarFiltros').addEventListener('click', () => {
        const filtrosContainer = document.getElementById('filtrosContainer');
        const isVisible = filtrosContainer.style.display === 'block';
        filtrosContainer.style.display = isVisible ? 'none' : 'block';
        
        // Cambiar icono
        const icon = document.getElementById('btnMostrarFiltros').querySelector('i');
        icon.className = isVisible ? 'fas fa-filter' : 'fas fa-times';
    });
    
    // Evento para aplicar filtros
    document.getElementById('btnAplicarFiltros').addEventListener('click', aplicarFiltros);
    
    // Evento para limpiar filtros
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
    
    // Evento para actualizar
    document.getElementById('btnRefresh').addEventListener('click', () => {
        cargarUsuarios();
        Swal.fire({
            title: 'Actualizando',
            text: 'Lista de usuarios actualizada',
            icon: 'success',
            background: '#2d2d2d',
            color: '#ffffff',
            timer: 1500,
            showConfirmButton: false
        });
    });
    
    // Evento para exportar Excel
    document.getElementById('btnExportExcel').addEventListener('click', exportarExcel);
}

// Función de seguridad para HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mostrar error
function mostrarError(mensaje) {
    const tablaContainer = document.getElementById("usuarios-lista");
    
    const errorHTML = `
        <tr class="error-state">
            <td colspan="6">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarUsuarios()" class="btn-accion" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
                <button onclick="location.reload()" class="btn-accion" style="margin-top: 10px; background: #6c757d;">
                    <i class="fas fa-sync-alt"></i> Recargar página
                </button>
            </td>
        </tr>
    `;
    
    tablaContainer.innerHTML = errorHTML;
}

// Inicializar la aplicación
async function initApp() {
    console.log('🚀 Inicializando gestión de usuarios...');
    
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
        return;
    }
    
    // Cargar datos iniciales
    await cargarUsuarios();
    
    // Configurar eventos principales
    configurarEventos();
    
    console.log('✅ Gestión de usuarios inicializado correctamente');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Hacer funciones disponibles globalmente
window.cargarUsuarios = cargarUsuarios;
window.mostrarModalDetalles = mostrarModalDetalles;
window.exportarExcel = exportarExcel;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.eliminarUsuario = eliminarUsuario;