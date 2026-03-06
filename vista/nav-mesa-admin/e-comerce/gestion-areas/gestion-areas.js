// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Variables globales
let areas = [];
let currentUser = null;

// Elementos del DOM
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const areasTable = document.getElementById('areasTable');
const areasTableBody = document.getElementById('areasTableBody');
const areasCards = document.getElementById('areasCards');
const searchInput = document.getElementById('searchInput');

// Función para obtener colores personalizados
function getCustomColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
        primary: styles.getPropertyValue('--primary-color').trim() || '#6C43E0',
        secondary: styles.getPropertyValue('--secondary-color').trim() || '#5a35c7',
        success: styles.getPropertyValue('--success-color').trim() || '#2ecc71',
        warning: styles.getPropertyValue('--warning-color').trim() || '#f39c12',
        danger: styles.getPropertyValue('--danger-color').trim() || '#e74c3c',
        cardBg: styles.getPropertyValue('--card-bg').trim() || '#ffffff',
        textColor: styles.getPropertyValue('--text-color').trim() || '#333'
    };
}

// Inicialización
document.addEventListener('DOMContentLoaded', init);

function init() {
    esperarUsuarioYIniciar();
}

function esperarUsuarioYIniciar() {
    const intervalo = setInterval(() => {
        const usuario = obtenerUsuarioActual();
        if (usuario && usuario.nombre !== 'Usuario Desconocido') {
            clearInterval(intervalo);
            currentUser = usuario;
            cargarAreas();
            configurarEventListeners();
            actualizarVistaResponsive();
        }
    }, 500);

    setTimeout(() => {
        clearInterval(intervalo);
        if (!currentUser) {
            console.warn('No se pudo obtener información del usuario después de 5 segundos');
            currentUser = { nombre: 'Sistema', email: 'sistema@rsi.com', id: 'system' };
            cargarAreas();
            configurarEventListeners();
            actualizarVistaResponsive();
        }
    }, 5000);
}

function configurarEventListeners() {
    searchInput.addEventListener('input', filtrarAreas);
    window.addEventListener('resize', actualizarVistaResponsive);
}

// Funciones de usuario
function obtenerUsuarioActual() {
    if (typeof menuState !== 'undefined' && menuState.userData) {
        const userData = menuState.userData;
        if (userData.nombre && userData.nombre !== 'Cargando...') {
            return {
                nombre: userData.nombre,
                email: userData.correoEmpresarial || userData.email,
                id: userData.id
            };
        }
    }

    const user = auth.currentUser;
    if (user && user.email) {
        buscarColaboradorPorEmail(user.email)
            .then(colaborador => {
                if (colaborador) {
                    currentUser = {
                        nombre: colaborador.NOMBRE || colaborador.nombre,
                        email: user.email,
                        id: user.uid
                    };
                }
            })
            .catch(error => {
                console.warn('Error al buscar colaborador:', error);
            });
    }

    if (user) {
        return {
            nombre: user.displayName || user.email.split('@')[0],
            email: user.email,
            id: user.uid
        };
    }
    
    return {
        nombre: 'Usuario Desconocido',
        email: 'desconocido@rsi.com',
        id: 'unknown'
    };
}

async function buscarColaboradorPorEmail(email) {
    try {
        const snapshot = await db.collection('colaboradores')
            .where('CORREO ELECTRÓNICO EMPRESARIAL', '==', email)
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return doc.data();
        }
        
        const snapshotPersonal = await db.collection('colaboradores')
            .where('CORREO ELECTRÓNICO PERSONAL', '==', email)
            .limit(1)
            .get();
        
        if (!snapshotPersonal.empty) {
            const doc = snapshotPersonal.docs[0];
            return doc.data();
        }
        
        return null;
    } catch (error) {
        console.error('Error al buscar colaborador:', error);
        return null;
    }
}

// Funciones de áreas
async function cargarAreas() {
    try {
        mostrarLoading(true);
        
        const snapshot = await db.collection('areasRSI').orderBy('fechaCreacion', 'desc').get();
        areas = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            areas.push({
                id: doc.id,
                ...data,
                fechaCreacion: data.fechaCreacion || null,
                fechaActualizacion: data.fechaActualizacion || data.fechaCreacion || null,
                creadoPor: data.creadoPor || 'Sistema',
                actualizadoPor: data.actualizadoPor || data.creadoPor || 'Sistema'
            });
        });
        
        mostrarAreas(areas);
        
    } catch (error) {
        console.error('Error al cargar áreas:', error);
        mostrarError('Error al cargar las áreas');
    } finally {
        mostrarLoading(false);
    }
}

// Función para normalizar subáreas (soporte para arrays y mapas)
function normalizarSubareas(subareas) {
    if (!subareas) return [];
    
    // Si es un array (formato antiguo)
    if (Array.isArray(subareas)) {
        return subareas;
    }
    
    // Si es un objeto/mapa (formato nuevo)
    if (typeof subareas === 'object') {
        return Object.values(subareas).map(item => {
            // Si cada item tiene propiedad 'nombre'
            if (item && typeof item === 'object' && item.nombre) {
                return item.nombre;
            }
            // Si el item es directamente el nombre
            return String(item);
        });
    }
    
    return [];
}

// Función para obtener el conteo de subáreas
function contarSubareas(subareas) {
    if (!subareas) return 0;
    
    if (Array.isArray(subareas)) {
        return subareas.length;
    }
    
    if (typeof subareas === 'object') {
        return Object.keys(subareas).length;
    }
    
    return 0;
}

function mostrarAreas(areasMostrar) {
    areasTableBody.innerHTML = '';
    areasCards.innerHTML = '';
    
    if (areasMostrar.length === 0) {
        areasTable.style.display = 'none';
        areasCards.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    actualizarVistaResponsive();
    
    areasMostrar.forEach(area => {
        const row = document.createElement('tr');
        row.innerHTML = generarFilaTabla(area);
        areasTableBody.appendChild(row);
    });
    
    areasMostrar.forEach(area => {
        const card = document.createElement('div');
        card.className = 'area-card';
        card.innerHTML = generarTarjetaMovil(area);
        areasCards.appendChild(card);
    });
}

function generarFilaTabla(area) {
    const subareasCount = contarSubareas(area.subareas);
    const subareasLista = normalizarSubareas(area.subareas);
    
    // Crear tooltip con las subáreas si existen
    let subareasTooltip = '';
    if (subareasLista.length > 0) {
        subareasTooltip = subareasLista.map(s => `• ${s}`).join('\n');
    }
    
    return `
        <td>${area.nombre}</td>
        <td>${area.descripcion || 'Sin descripción'}</td>
        <td>
            ${subareasCount > 0 
                ? `<span class="badge badge-secondary" title="${subareasTooltip}">${subareasCount} subárea(s)</span>` 
                : '<span class="badge badge-warning">Sin subáreas</span>'}
        </td>
        <td>
            <div><strong>${area.creadoPor}</strong></div>
            <small class="text-muted">${formatearFecha(area.fechaCreacion)}</small>
        </td>
        <td>
            <div><strong>${area.actualizadoPor}</strong></div>
            <small class="text-muted">${formatearFecha(area.fechaActualizacion)}</small>
        </td>
        <td>
            <button class="action-btn view" title="Ver detalles" onclick="verArea('${area.id}')">
                <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn edit" title="Editar área" onclick="editarArea('${area.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" title="Eliminar área" onclick="eliminarArea('${area.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
}

function generarTarjetaMovil(area) {
    const subareasCount = contarSubareas(area.subareas);
    const subareasLista = normalizarSubareas(area.subareas);
    
    // Crear texto con las subáreas
    let subareasTexto = '';
    if (subareasLista.length > 0) {
        subareasTexto = subareasLista.slice(0, 3).join(', ');
        if (subareasLista.length > 3) {
            subareasTexto += ` y ${subareasLista.length - 3} más`;
        }
    }
    
    return `
        <div class="card-row">
            <span class="card-label">Nombre:</span>
            <span class="card-value">${area.nombre}</span>
        </div>
        <div class="card-row">
            <span class="card-label">Descripción:</span>
            <span class="card-value">${area.descripcion || 'Sin descripción'}</span>
        </div>
        <div class="card-row">
            <span class="card-label">Subáreas:</span>
            <span class="card-value">
                ${subareasCount > 0 
                    ? `<span class="badge badge-secondary" title="${subareasTexto}">${subareasCount} subárea(s)</span>` 
                    : '<span class="badge badge-warning">Sin subáreas</span>'}
            </span>
        </div>
        <div class="area-info">
            <div class="area-info-item">
                <span class="area-info-label">Creado por:</span>
                <span class="area-info-value">${area.creadoPor}</span>
            </div>
            <div class="area-info-item">
                <span class="area-info-label">Fecha creación:</span>
                <span class="area-info-value">${formatearFecha(area.fechaCreacion)}</span>
            </div>
            <div class="area-info-item">
                <span class="area-info-label">Última modificación:</span>
                <span class="area-info-value">${formatearFecha(area.fechaActualizacion)}</span>
            </div>
            <div class="area-info-item">
                <span class="area-info-label">Modificado por:</span>
                <span class="area-info-value">${area.actualizadoPor}</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn btn-primary" onclick="verArea('${area.id}')" title="Ver detalles">
                <i class="fas fa-eye"></i>
                <span>Ver</span>
            </button>
            <button class="btn btn-warning" onclick="editarArea('${area.id}')" title="Editar área">
                <i class="fas fa-edit"></i>
                <span>Editar</span>
            </button>
            <button class="btn btn-danger" onclick="eliminarArea('${area.id}')" title="Eliminar área">
                <i class="fas fa-trash"></i>
                <span>Eliminar</span>
            </button>
        </div>
    `;
}

function filtrarAreas() {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (searchTerm === '') {
        mostrarAreas(areas);
        return;
    }
    
    const areasFiltradas = areas.filter(area => {
        // Buscar en nombre
        if (area.nombre.toLowerCase().includes(searchTerm)) return true;
        
        // Buscar en descripción
        if (area.descripcion && area.descripcion.toLowerCase().includes(searchTerm)) return true;
        
        // Buscar en subáreas (tanto array como mapa)
        if (area.subareas) {
            const subareasLista = normalizarSubareas(area.subareas);
            if (subareasLista.some(subarea => 
                subarea.toLowerCase().includes(searchTerm)
            )) return true;
        }
        
        // Buscar en creado por
        if (area.creadoPor.toLowerCase().includes(searchTerm)) return true;
        
        // Buscar en actualizado por
        if (area.actualizadoPor.toLowerCase().includes(searchTerm)) return true;
        
        return false;
    });
    
    mostrarAreas(areasFiltradas);
}

function actualizarVistaResponsive() {
    const anchoVentana = window.innerWidth;
    const esMovil = anchoVentana <= 768;
    
    if (esMovil) {
        areasTable.style.display = 'none';
        areasCards.style.display = 'flex';
    } else {
        areasTable.style.display = 'table';
        areasCards.style.display = 'none';
    }
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    
    try {
        const date = fecha.toDate();
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

// Funciones de acciones CRUD
async function verArea(areaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    
    const colors = getCustomColors();
    const subareasLista = normalizarSubareas(area.subareas);
    
    let mensaje = `<strong style="font-size: 1.2rem;">${area.nombre}</strong><br><br>`;
    mensaje += area.descripcion ? `<p>${area.descripcion}</p>` : '<p style="color: #999;">Sin descripción</p>';
    
    if (subareasLista.length > 0) {
        mensaje += '<p><strong style="color: ' + colors.primary + ';">Subáreas:</strong></p><ul style="margin-left: 20px;">';
        subareasLista.forEach(subarea => {
            mensaje += `<li>${subarea}</li>`;
        });
        mensaje += '</ul>';
    } else {
        mensaje += '<p style="color: #999;">No tiene subáreas registradas.</p>';
    }
    
    mensaje += `<div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid ${colors.primary}20; font-size: 0.9rem;">
        <p><strong>📋 Información de Auditoría:</strong></p>
        <p><strong>Creado por:</strong> ${area.creadoPor}</p>
        <p><strong>Fecha de creación:</strong> ${formatearFecha(area.fechaCreacion)}</p>
        <p><strong>Última modificación por:</strong> ${area.actualizadoPor}</p>
        <p><strong>Fecha de última modificación:</strong> ${formatearFecha(area.fechaActualizacion)}</p>
    </div>`;
    
    Swal.fire({
        title: 'Detalles del Área',
        html: mensaje,
        icon: 'info',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: colors.primary,
        background: colors.cardBg,
        color: colors.textColor
    });
}

function editarArea(areaId) {
    const colors = getCustomColors();
    
    // Confirmar antes de redirigir
    Swal.fire({
        title: 'Editar Área',
        text: '¿Quieres editar esta área?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: colors.primary,
        cancelButtonColor: colors.secondary,
        confirmButtonText: 'Sí, editar',
        cancelButtonText: 'Cancelar',
        background: colors.cardBg,
        color: colors.textColor
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `/vista/nav-mesa-admin/nueva-area/nueva-area.html?id=${areaId}`;
        }
    });
}

async function eliminarArea(areaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    
    const colors = getCustomColors();
    
    const tieneColaboradores = await verificarColaboradoresEnArea(area.nombre);
    
    if (tieneColaboradores) {
        Swal.fire({
            title: 'No se puede eliminar',
            text: 'Esta área tiene colaboradores asignados. No se puede eliminar.',
            icon: 'warning',
            confirmButtonColor: colors.primary,
            background: colors.cardBg,
            color: colors.textColor
        });
        return;
    }
    
    Swal.fire({
        title: '¿Estás seguro?',
        html: `Esta acción eliminará el área <strong>"${area.nombre}"</strong> y todas sus subáreas. Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: colors.danger,
        cancelButtonColor: colors.primary,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: colors.cardBg,
        color: colors.textColor
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await db.collection('areasRSI').doc(areaId).delete();
                
                Swal.fire({
                    title: 'Eliminada',
                    text: 'Área eliminada correctamente',
                    icon: 'success',
                    confirmButtonColor: colors.primary,
                    background: colors.cardBg,
                    color: colors.textColor,
                    timer: 1500,
                    showConfirmButton: false
                });
                
                cargarAreas();
            } catch (error) {
                console.error('Error al eliminar área:', error);
                
                Swal.fire({
                    title: 'Error',
                    text: 'Error al eliminar el área',
                    icon: 'error',
                    confirmButtonColor: colors.primary,
                    background: colors.cardBg,
                    color: colors.textColor
                });
            }
        }
    });
}

async function verificarColaboradoresEnArea(nombreArea) {
    try {
        const snapshot = await db.collection('colaboradores')
            .where('AREA', '==', nombreArea)
            .limit(1)
            .get();
        
        return !snapshot.empty;
    } catch (error) {
        console.error('Error al verificar colaboradores:', error);
        return true;
    }
}

// Utilidades de UI
function mostrarLoading(mostrar) {
    loadingState.style.display = mostrar ? 'flex' : 'none';
}

function mostrarError(mensaje) {
    const colors = getCustomColors();
    
    Swal.fire({
        title: 'Error',
        text: mensaje,
        icon: 'error',
        confirmButtonColor: colors.primary,
        background: colors.cardBg,
        color: colors.textColor
    });
}

// Exponer funciones globalmente para los onclick
window.verArea = verArea;
window.editarArea = editarArea;
window.eliminarArea = eliminarArea;