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
let editingAreaId = null;
let currentUser = null;
let subareas = {}; // Objeto (mapa) para almacenar subáreas con ID único

// Elementos del DOM
const formTitle = document.getElementById('formTitle');
const areaNombre = document.getElementById('areaNombre');
const areaDescripcion = document.getElementById('areaDescripcion');
const subareasList = document.getElementById('subareasList');
const addSubareaForm = document.getElementById('addSubareaForm');
const subareaNombre = document.getElementById('subareaNombre');
const btnMostrarAgregarSubarea = document.getElementById('btnMostrarAgregarSubarea');
const btnCancelarSubarea = document.getElementById('btnCancelarSubarea');
const btnGuardarSubarea = document.getElementById('btnGuardarSubarea');
const btnGuardarArea = document.getElementById('btnGuardarArea');
const areaForm = document.getElementById('areaForm');

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
        textColor: styles.getPropertyValue('--text-color').trim() || '#333',
        borderColor: styles.getPropertyValue('--border-color').trim() || 'rgba(0,0,0,0.1)'
    };
}

// Inicialización
document.addEventListener('DOMContentLoaded', init);

function init() {
    esperarUsuarioYIniciar();
    verificarEdicion();
    configurarEventListeners();
}

function esperarUsuarioYIniciar() {
    const intervalo = setInterval(() => {
        const usuario = obtenerUsuarioActual();
        if (usuario && usuario.nombre !== 'Usuario Desconocido') {
            clearInterval(intervalo);
            currentUser = usuario;
        }
    }, 500);

    setTimeout(() => {
        clearInterval(intervalo);
        if (!currentUser) {
            console.warn('No se pudo obtener información del usuario');
            currentUser = { nombre: 'Sistema', email: 'sistema@rsi.com', id: 'system' };
        }
    }, 5000);
}

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

function configurarEventListeners() {
    btnMostrarAgregarSubarea.addEventListener('click', mostrarFormularioSubarea);
    btnCancelarSubarea.addEventListener('click', ocultarFormularioSubarea);
    btnGuardarSubarea.addEventListener('click', guardarSubarea);
    areaForm.addEventListener('submit', guardarArea);
}

function verificarEdicion() {
    const urlParams = new URLSearchParams(window.location.search);
    const areaId = urlParams.get('id');
    
    if (areaId) {
        editingAreaId = areaId;
        formTitle.textContent = 'Editar Área';
        cargarAreaParaEdicion(areaId);
    }
}

async function cargarAreaParaEdicion(areaId) {
    try {
        const doc = await db.collection('areasRSI').doc(areaId).get();
        
        if (doc.exists) {
            const data = doc.data();
            areaNombre.value = data.nombre || '';
            areaDescripcion.value = data.descripcion || '';
            
            // Cargar subáreas como mapa (objeto)
            subareas = data.subareas || {};
            actualizarListaSubareas();
        }
    } catch (error) {
        console.error('Error al cargar área:', error);
        mostrarError('Error al cargar los datos del área');
    }
}

function mostrarFormularioSubarea() {
    addSubareaForm.classList.add('show');
    subareaNombre.value = '';
    subareaNombre.focus();
}

function ocultarFormularioSubarea() {
    addSubareaForm.classList.remove('show');
    subareaNombre.value = '';
}

function guardarSubarea() {
    const nombre = subareaNombre.value.trim();
    const colors = getCustomColors();
    
    if (!nombre) {
        Swal.fire({
            title: 'Campo vacío',
            text: 'El nombre de la subárea es obligatorio',
            icon: 'warning',
            confirmButtonColor: colors.primary,
            background: colors.cardBg,
            color: colors.textColor
        });
        return;
    }
    
    // Verificar si ya existe una subárea con el mismo nombre
    const existe = Object.values(subareas).some(subarea => 
        subarea.nombre.toLowerCase() === nombre.toLowerCase()
    );
    
    if (existe) {
        Swal.fire({
            title: 'Nombre duplicado',
            text: 'Ya existe una subárea con ese nombre',
            icon: 'warning',
            confirmButtonColor: colors.primary,
            background: colors.cardBg,
            color: colors.textColor
        });
        return;
    }
    
    // Generar ID único para la subárea
    const subareaId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Crear objeto de subárea con ID y nombre
    subareas[subareaId] = {
        id: subareaId,
        nombre: nombre
    };
    
    actualizarListaSubareas();
    ocultarFormularioSubarea();
    
    // Mostrar confirmación
    Swal.fire({
        title: 'Subárea agregada',
        text: `La subárea "${nombre}" ha sido agregada`,
        icon: 'success',
        confirmButtonColor: colors.primary,
        background: colors.cardBg,
        color: colors.textColor,
        timer: 1500,
        showConfirmButton: false
    });
}

function editarSubarea(subareaId) {
    const subarea = subareas[subareaId];
    const colors = getCustomColors();
    
    // SweetAlert2 para editar nombre
    Swal.fire({
        title: 'Editar nombre de la subárea',
        input: 'text',
        inputValue: subarea.nombre,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: colors.primary,
        cancelButtonColor: colors.secondary,
        background: colors.cardBg,
        color: colors.textColor,
        inputValidator: (value) => {
            if (!value) {
                return 'El nombre no puede estar vacío';
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const nuevoNombre = result.value.trim();
            
            // Verificar si ya existe otra subárea con el mismo nombre
            const existe = Object.values(subareas).some(s => 
                s.id !== subareaId && s.nombre.toLowerCase() === nuevoNombre.toLowerCase()
            );
            
            if (existe) {
                Swal.fire({
                    title: 'Nombre duplicado',
                    text: 'Ya existe otra subárea con ese nombre',
                    icon: 'warning',
                    confirmButtonColor: colors.primary,
                    background: colors.cardBg,
                    color: colors.textColor
                });
                return;
            }
            
            // Actualizar el nombre manteniendo el mismo ID
            subareas[subareaId] = {
                ...subarea,
                nombre: nuevoNombre
            };
            
            actualizarListaSubareas();
            
            Swal.fire({
                title: 'Subárea actualizada',
                text: `El nombre ha sido cambiado a "${nuevoNombre}"`,
                icon: 'success',
                confirmButtonColor: colors.primary,
                background: colors.cardBg,
                color: colors.textColor,
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
}

function eliminarSubarea(subareaId) {
    const subarea = subareas[subareaId];
    const colors = getCustomColors();
    
    Swal.fire({
        title: '¿Eliminar subárea?',
        html: `¿Estás seguro de eliminar la subárea <strong>"${subarea.nombre}"</strong>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: colors.danger,
        cancelButtonColor: colors.primary,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: colors.cardBg,
        color: colors.textColor
    }).then((result) => {
        if (result.isConfirmed) {
            delete subareas[subareaId];
            actualizarListaSubareas();
            
            Swal.fire({
                title: 'Subárea eliminada',
                text: 'La subárea ha sido eliminada correctamente',
                icon: 'success',
                confirmButtonColor: colors.primary,
                background: colors.cardBg,
                color: colors.textColor,
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
}

function actualizarListaSubareas() {
    const subareasArray = Object.values(subareas);
    
    if (subareasArray.length === 0) {
        subareasList.innerHTML = '<div class="no-subareas">No hay subáreas agregadas</div>';
        return;
    }
    
    let html = '';
    subareasArray.forEach((subarea) => {
        html += `
            <div class="subarea-item">
                <div class="subarea-info">
                    <i class="fas fa-circle subarea-icon"></i>
                    <span class="subarea-name">${subarea.nombre}</span>
                </div>
                <div class="subarea-actions">
                    <button type="button" class="subarea-btn edit" onclick="editarSubarea('${subarea.id}')" title="Editar subárea">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="subarea-btn delete" onclick="eliminarSubarea('${subarea.id}')" title="Eliminar subárea">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    subareasList.innerHTML = html;
}

async function guardarArea(event) {
    event.preventDefault();
    
    const nombre = areaNombre.value.trim();
    const descripcion = areaDescripcion.value.trim();
    const colors = getCustomColors();
    
    if (!nombre) {
        Swal.fire({
            title: 'Campo obligatorio',
            text: 'El nombre del área es obligatorio',
            icon: 'warning',
            confirmButtonColor: colors.primary,
            background: colors.cardBg,
            color: colors.textColor
        });
        areaNombre.focus();
        return;
    }
    
    try {
        const usuario = currentUser || obtenerUsuarioActual();
        
        // Verificar si el nombre ya existe
        const nombreExistente = await verificarNombreExistente(nombre, editingAreaId);
        if (nombreExistente) {
            Swal.fire({
                title: 'Nombre duplicado',
                text: 'Ya existe un área con ese nombre',
                icon: 'warning',
                confirmButtonColor: colors.primary,
                background: colors.cardBg,
                color: colors.textColor
            });
            return;
        }
        
        const areaData = {
            nombre: nombre,
            descripcion: descripcion,
            subareas: subareas, // Guardar como mapa (objeto)
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
            actualizadoPor: usuario.nombre
        };
        
        if (editingAreaId) {
            await db.collection('areasRSI').doc(editingAreaId).update(areaData);
            
            Swal.fire({
                title: '¡Actualizado!',
                text: 'Área actualizada correctamente',
                icon: 'success',
                confirmButtonColor: colors.primary,
                background: colors.cardBg,
                color: colors.textColor,
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            areaData.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            areaData.creadoPor = usuario.nombre;
            areaData.actualizadoPor = usuario.nombre;
            await db.collection('areasRSI').add(areaData);
            
            Swal.fire({
                title: '¡Creada!',
                text: 'Área creada correctamente',
                icon: 'success',
                confirmButtonColor: colors.primary,
                background: colors.cardBg,
                color: colors.textColor,
                timer: 1500,
                showConfirmButton: false
            });
        }
        
        // Redirigir a la página de gestión después de guardar
        setTimeout(() => {
            window.location.href = '/vista/nav-mesa-admin/e-comerce/gestion-areas/gestion-areas.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error al guardar área:', error);
        
        Swal.fire({
            title: 'Error',
            text: 'Error al guardar el área: ' + error.message,
            icon: 'error',
            confirmButtonColor: colors.danger,
            background: colors.cardBg,
            color: colors.textColor
        });
    }
}

async function verificarNombreExistente(nombre, excludeId = null) {
    const query = db.collection('areasRSI').where('nombre', '==', nombre);
    const snapshot = await query.get();
    
    if (snapshot.empty) return false;
    
    if (excludeId) {
        return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return true;
}

// Exponer funciones globalmente para los onclick
window.editarSubarea = editarSubarea;
window.eliminarSubarea = eliminarSubarea;