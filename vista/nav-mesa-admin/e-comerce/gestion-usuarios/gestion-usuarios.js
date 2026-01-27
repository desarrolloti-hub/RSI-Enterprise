// usuarios.js - Gestión de usuarios con Firebase Modular

// Importar configuración de Firebase
import { db } from '/config/firebase-config.js';

// Variables globales
let usuariosUnsubscribe = null;

// Formateador de fecha
function formatearFecha(timestamp) {
    if (!timestamp) return 'Sin fecha';
    
    try {
        const fecha = timestamp.toDate();
        return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formateando fecha:', error);
        return 'Fecha inválida';
    }
}

// Función para capitalizar texto
function capitalizarTexto(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// Mostrar estado de carga
function mostrarCarga() {
    const tbody = document.getElementById('usuariosBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando usuarios...</p>
                </td>
            </tr>
        `;
    }
}

// Mostrar estado vacío
function mostrarEstadoVacio() {
    const tbody = document.getElementById('usuariosBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <p>No hay usuarios registrados</p>
                </td>
            </tr>
        `;
    }
}

// Mostrar error
function mostrarError(mensaje) {
    const tbody = document.getElementById('usuariosBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state" style="color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${mensaje}</p>
                </td>
            </tr>
        `;
    }
}

// Renderizar usuarios en la tabla
function renderizarUsuarios(usuarios) {
    const tbody = document.getElementById('usuariosBody');
    
    if (!tbody) {
        console.error('No se encontró el elemento tbody');
        return;
    }
    
    if (!usuarios || usuarios.length === 0) {
        mostrarEstadoVacio();
        return;
    }
    
    let html = '';
    
    usuarios.forEach((usuario, index) => {
        const id = usuario.id || `user-${index}`;
        const nombre = usuario.nombreCompleto || 'Usuario sin nombre';
        const email = usuario.email || 'Sin correo';
        const rol = usuario.rol || 'Usuario';
        const fecha = formatearFecha(usuario.fechaRegistro);
        
        html += `
            <tr data-id="${id}">
                <td>
                    <span class="user-id" title="${id}">${id.substring(0, 8)}...</span>
                </td>
                <td>
                    <div class="user-name">${capitalizarTexto(nombre)}</div>
                </td>
                <td>
                    <div class="user-email" title="${email}">
                        <i class="fas fa-envelope"></i> ${email}
                    </div>
                </td>
                <td>
                    <span class="rol-usuario" title="${rol}">
                        ${capitalizarTexto(rol)}
                    </span>
                </td>
                <td>
                    <div class="user-date">${fecha}</div>
                </td>
                <td class="acciones-container">
                    <button class="btn-detalles" data-id="${id}" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-eliminar" data-id="${id}" title="Eliminar usuario">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Agregar event listeners después de renderizar
    agregarEventListeners();
}

// Cargar usuarios desde Firebase
async function cargarUsuarios() {
    try {
        mostrarCarga();
        
        const snapshot = await db.collection('usuarios').get();
        
        const usuarios = [];
        snapshot.forEach(doc => {
            usuarios.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`${usuarios.length} usuarios cargados`);
        renderizarUsuarios(usuarios);
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        mostrarError('Error al cargar usuarios. Verifica tu conexión.');
        
        // Mostrar alerta al usuario
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudieron cargar los usuarios. Verifica tu conexión a internet.',
            confirmButtonColor: '#FFD700',
            background: '#1e1e1e',
            color: '#ffffff'
        });
    }
}

// Escuchar cambios en tiempo real
function escucharCambiosUsuarios() {
    try {
        // Cancelar suscripción anterior si existe
        if (usuariosUnsubscribe) {
            usuariosUnsubscribe();
        }
        
        usuariosUnsubscribe = db.collection('usuarios').onSnapshot(
            (snapshot) => {
                const usuarios = [];
                snapshot.forEach(doc => {
                    usuarios.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                console.log(`Cambios detectados: ${usuarios.length} usuarios`);
                renderizarUsuarios(usuarios);
            },
            (error) => {
                console.error('Error en listener de usuarios:', error);
                mostrarError('Error en conexión en tiempo real');
            }
        );
        
    } catch (error) {
        console.error('Error configurando listener:', error);
    }
}

// Mostrar detalles del usuario
async function mostrarDetalles(id) {
    try {
        const doc = await db.collection('usuarios').doc(id).get();
        
        if (!doc.exists) {
            Swal.fire({
                icon: 'warning',
                title: 'Usuario no encontrado',
                text: 'El usuario ya no existe en la base de datos.',
                confirmButtonColor: '#FFD700'
            });
            return;
        }
        
        const usuario = doc.data();
        const fechaRegistro = formatearFecha(usuario.fechaRegistro);
        const ultimoAcceso = formatearFecha(usuario.ultimoAcceso);
        
        // Crear contenido HTML para el modal
        const htmlContent = `
            <div style="text-align: left; color: #e0e0e0;">
                <p><b><i class="fas fa-id-card"></i> ID:</b> ${doc.id}</p>
                <hr>
                <p><b><i class="fas fa-user"></i> Nombre:</b> ${usuario.nombreCompleto || 'No especificado'}</p>
                <p><b><i class="fas fa-envelope"></i> Email:</b> ${usuario.email || 'No especificado'}</p>
                <hr>
                <p><b><i class="fas fa-user-tag"></i> Rol:</b> ${capitalizarTexto(usuario.rol || 'Usuario')}</p>
                <p><b><i class="fas fa-calendar-plus"></i> Fecha Registro:</b> ${fechaRegistro}</p>
                <p><b><i class="fas fa-clock"></i> Último Acceso:</b> ${ultimoAcceso || 'No disponible'}</p>
                ${usuario.telefono ? `<p><b><i class="fas fa-phone"></i> Teléfono:</b> ${usuario.telefono}</p>` : ''}
                ${usuario.direccion ? `<p><b><i class="fas fa-map-marker-alt"></i> Dirección:</b> ${usuario.direccion}</p>` : ''}
                ${usuario.notas ? `<hr><p><b><i class="fas fa-sticky-note"></i> Notas:</b><br>${usuario.notas}</p>` : ''}
            </div>
        `;
        
        Swal.fire({
            title: `<strong>${usuario.nombreCompleto || 'Detalles del Usuario'}</strong>`,
            html: htmlContent,
            icon: 'info',
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#FFD700',
            background: '#1e1e1e',
            color: '#ffffff',
            width: '600px',
            customClass: {
                popup: 'swal2-popup-custom'
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron obtener los detalles del usuario.',
            confirmButtonColor: '#FFD700'
        });
    }
}

// Eliminar usuario
async function eliminarUsuario(id, nombre) {
    try {
        const result = await Swal.fire({
            title: '¿Eliminar usuario?',
            html: `
                <div style="color: #e0e0e0; text-align: left;">
                    <p><b>Usuario:</b> ${nombre}</p>
                    <p><b>ID:</b> ${id.substring(0, 12)}...</p>
                    <p class="mt-3" style="color: #ff6b6b;">
                        <i class="fas fa-exclamation-triangle"></i> Esta acción no se puede deshacer
                    </p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: '#1e1e1e',
            reverseButtons: true
        });
        
        if (result.isConfirmed) {
            // Mostrar loading
            Swal.fire({
                title: 'Eliminando...',
                text: 'Por favor espera',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            await db.collection('usuarios').doc(id).delete();
            
            Swal.fire({
                icon: 'success',
                title: '¡Eliminado!',
                text: 'Usuario eliminado correctamente',
                confirmButtonColor: '#FFD700',
                timer: 2000,
                timerProgressBar: true
            });
        }
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar el usuario. Verifica los permisos.',
            confirmButtonColor: '#FFD700'
        });
    }
}

// Agregar event listeners a los botones
function agregarEventListeners() {
    // Botón de detalles
    document.querySelectorAll('.btn-detalles').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            mostrarDetalles(id);
        });
    });
    
    // Botón de eliminar
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const nombre = btn.closest('tr').querySelector('.user-name').textContent;
            await eliminarUsuario(id, nombre);
        });
    });
    
    // Hover en filas
    document.querySelectorAll('.tabla-usuarios tbody tr').forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#252525';
        });
        
        row.addEventListener('mouseleave', () => {
            const isEven = Array.from(row.parentNode.children).indexOf(row) % 2 === 1;
            row.style.backgroundColor = isEven ? '#1E1E1E' : 'transparent';
        });
    });
}

// Inicializar la aplicación
async function init() {
    try {
        console.log('Inicializando gestión de usuarios...');
        
        // Cargar usuarios inicialmente
        await cargarUsuarios();
        
        // Configurar listener en tiempo real
        escucharCambiosUsuarios();
        
        console.log('Gestión de usuarios inicializada correctamente');
        
    } catch (error) {
        console.error('Error inicializando aplicación:', error);
        mostrarError('Error al inicializar la aplicación');
    }
}

// Limpiar recursos al salir
function limpiarRecursos() {
    if (usuariosUnsubscribe) {
        usuariosUnsubscribe();
        usuariosUnsubscribe = null;
    }
}

// Event listeners globales
document.addEventListener('DOMContentLoaded', init);

// Limpiar recursos cuando la página se descargue
window.addEventListener('beforeunload', limpiarRecursos);

// Manejar errores no capturados
window.addEventListener('error', (event) => {
    console.error('Error no capturado:', event.error);
    
    Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un error inesperado. Por favor recarga la página.',
        confirmButtonColor: '#FFD700',
        background: '#1e1e1e'
    });
});

// Exportar funciones necesarias para debugging
window.UsuariosManager = {
    recargar: cargarUsuarios,
    mostrarDetalles,
    eliminarUsuario
};

console.log('Módulo de usuarios cargado correctamente');