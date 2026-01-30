// gestionCategoriaCotizaciones.js - Controlador/Vista SIN CLASE
import { db } from '/config/firebase-config.js';

// =================================================================================
// ESTADO DE LA APLICACIÓN
// =================================================================================
const appState = {
    categorias: [],
    filteredCategorias: [],
    editingCategoriaId: null,
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalPages: 1
    }
};

// =================================================================================
// FUNCIONES DE VALIDACIÓN
// =================================================================================

function validateCategoria(nombreCategoria, imagen) {
    if (!nombreCategoria || nombreCategoria.trim() === '') {
        throw new Error('El nombre de la categoría es requerido');
    }
    
    if (nombreCategoria.length > 100) {
        throw new Error('El nombre de la categoría no puede exceder los 100 caracteres');
    }
    
    if (imagen && imagen.length > 5000000) { // 5MB en bytes
        throw new Error('La imagen es demasiado grande (máximo 5MB)');
    }
    
    return true;
}

// =================================================================================
// FUNCIONES DE FIREBASE (CRUD)
// =================================================================================

// CREATE: Crear una nueva categoría
async function createCategoria(nombreCategoria, imagen = '') {
    try {
        validateCategoria(nombreCategoria, imagen);
        
        const categoryData = {
            nombreCategoria: nombreCategoria.trim(),
            imagen: imagen || null,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection("categoriasProductoServicio").add(categoryData);
        return {
            success: true,
            id: docRef.id,
            message: 'Categoría creada exitosamente'
        };
    } catch (error) {
        console.error('Error al crear categoría:', error);
        return {
            success: false,
            error: error.message || 'Error al crear la categoría'
        };
    }
}

// READ: Obtener todas las categorías
async function getAllCategorias() {
    try {
        const querySnapshot = await db.collection("categoriasProductoServicio")
            .orderBy("fechaCreacion", "desc")
            .get();
        
        const categories = [];
        querySnapshot.forEach((doc) => {
            categories.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return {
            success: true,
            data: categories,
            message: 'Categorías obtenidas exitosamente',
            count: categories.length
        };
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener las categorías',
            data: [],
            count: 0
        };
    }
}

// READ: Obtener una categoría por ID
async function getCategoriaById(id) {
    try {
        const docRef = db.collection("categoriasProductoServicio").doc(id);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            return {
                success: true,
                data: {
                    id: docSnap.id,
                    ...docSnap.data()
                },
                message: 'Categoría obtenida exitosamente'
            };
        } else {
            return {
                success: false,
                error: 'Categoría no encontrada'
            };
        }
    } catch (error) {
        console.error('Error al obtener categoría:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener la categoría'
        };
    }
}

// UPDATE: Actualizar una categoría existente
async function updateCategoria(id, updatedData) {
    try {
        // Validar datos mínimos
        if (updatedData.nombreCategoria && updatedData.nombreCategoria.trim() === '') {
            throw new Error('El nombre de la categoría es requerido');
        }
        
        if (updatedData.nombreCategoria && updatedData.nombreCategoria.length > 100) {
            throw new Error('El nombre de la categoría no puede exceder los 100 caracteres');
        }
        
        const categoryRef = db.collection("categoriasProductoServicio").doc(id);
        const dataToUpdate = {
            ...updatedData,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await categoryRef.update(dataToUpdate);
        
        return {
            success: true,
            message: 'Categoría actualizada exitosamente'
        };
    } catch (error) {
        console.error('Error al actualizar categoría:', error);
        return {
            success: false,
            error: error.message || 'Error al actualizar la categoría'
        };
    }
}

// DELETE: Eliminar una categoría
async function deleteCategoriaById(id) {
    try {
        await db.collection("categoriasProductoServicio").doc(id).delete();
        
        return {
            success: true,
            message: 'Categoría eliminada exitosamente'
        };
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        return {
            success: false,
            error: error.message || 'Error al eliminar la categoría'
        };
    }
}

// =================================================================================
// FUNCIONES PRINCIPALES DE LA INTERFAZ
// =================================================================================

async function initialLoad() {
    try {
        console.log('Iniciando carga de gestión de categorías...');
        setupEventListeners();
        console.log('Event listeners configurados');
        await loadCategorias();
        console.log('Categorías cargadas');
    } catch (error) {
        console.error("Error en la carga inicial:", error);
        showError('No se pudieron cargar los datos iniciales.');
    }
}

async function loadCategorias() {
    try {
        const result = await getAllCategorias();
        
        if (result.success) {
            appState.categorias = result.data;
            appState.filteredCategorias = [...appState.categorias];
            applySearchAndDisplay();
        } else {
            showError(result.error || 'Error al cargar categorías');
        }
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        showError('No se pudieron cargar las categorías.');
    }
}

function applySearchAndDisplay() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm) {
        appState.filteredCategorias = appState.categorias.filter(categoria => 
            categoria.nombreCategoria.toLowerCase().includes(searchTerm)
        );
    } else {
        appState.filteredCategorias = [...appState.categorias];
    }
    
    displayCategorias();
}

function displayCategorias() {
    const tbody = document.getElementById('categoriasTableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    const paginationContainer = document.querySelector('.pagination-container');
    
    // Calcular paginación
    const startIndex = (appState.pagination.currentPage - 1) * appState.pagination.itemsPerPage;
    const endIndex = startIndex + appState.pagination.itemsPerPage;
    const currentItems = appState.filteredCategorias.slice(startIndex, endIndex);
    appState.pagination.totalPages = Math.ceil(appState.filteredCategorias.length / appState.pagination.itemsPerPage);
    
    tbody.innerHTML = '';
    mobileContainer.innerHTML = '';
    
    if (!currentItems || currentItems.length === 0) {
        const emptyMessage = `
            <tr>
                <td colspan="4" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No hay categorías para mostrar</h3>
                    <p>${document.getElementById('searchInput').value ? 
                        'Intenta ajustar los filtros de búsqueda' : 
                        'No se encontraron categorías en el sistema'}</p>
                </td>
            </tr>
        `;
        tbody.innerHTML = emptyMessage;
        mobileContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No hay categorías para mostrar</h3>
                <p>${document.getElementById('searchInput').value ? 
                    'Intenta ajustar los filtros de búsqueda' : 
                    'No se encontraron categorías en el sistema'}</p>
            </div>
        `;
        
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        return;
    }

    // Mostrar tabla para escritorio (SIN COLUMNA DE ID)
    const rowsHtml = currentItems.map(categoria => {
        return `
            <tr>
                <td>
                    ${categoria.imagen ? 
                        `<img src="${categoria.imagen}" alt="${categoria.nombreCategoria}" 
                              class="table-image" onerror="this.src='../css/img/Logo-RSI-OFICIAL.png'">` : 
                        '<div class="table-image"><i class="fas fa-image"></i></div>'}
                </td>
                <td><strong>${categoria.nombreCategoria || 'Sin nombre'}</strong></td>
                <td>${formatDate(categoria.fechaCreacion)}</td>
                <td>
                    <button class="action-btn edit" onclick="window.editCategoria('${categoria.id}')" title="Editar Categoría">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="window.deleteCategoria('${categoria.id}')" title="Eliminar Categoría">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // Mostrar tarjetas para móvil (SIN ID)
    const cardsHtml = currentItems.map(categoria => {
        return `
            <div class="categoria-card">
                <div class="card-row">
                    <span class="card-label">Imagen:</span>
                    <span class="card-value">
                        ${categoria.imagen ? 
                            `<img src="${categoria.imagen}" alt="${categoria.nombreCategoria}" 
                                  class="card-image" onerror="this.src='../css/img/Logo-RSI-OFICIAL.png'">` : 
                            '<div class="card-image"><i class="fas fa-image"></i></div>'}
                    </span>
                </div>
                <div class="card-row">
                    <span class="card-label">Nombre:</span>
                    <span class="card-value"><strong>${categoria.nombreCategoria || 'Sin nombre'}</strong></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Fecha de Creación:</span>
                    <span class="card-value">${formatDate(categoria.fechaCreacion)}</span>
                </div>
                <div class="card-actions">
                    <button class="action-btn edit" onclick="window.editCategoria('${categoria.id}')" title="Editar Categoría">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="window.deleteCategoria('${categoria.id}')" title="Eliminar Categoría">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    mobileContainer.innerHTML = cardsHtml;
    
    // Mostrar paginación
    if (paginationContainer && appState.pagination.totalPages > 1) {
        renderPagination();
    } else if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
}

function renderPagination() {
    const paginationContainer = document.querySelector('.pagination-container');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    const { currentPage, totalPages } = appState.pagination;
    
    // Botón Anterior
    const prevButton = createPaginationButton(
        '<i class="fas fa-chevron-left"></i>', 
        'prev', 
        currentPage === 1, 
        () => changePage(currentPage - 1)
    );
    paginationContainer.appendChild(prevButton);

    // Números de página
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createPaginationButton(
            i, 
            i === currentPage ? 'active' : '', 
            false, 
            () => changePage(i)
        );
        paginationContainer.appendChild(pageButton);
    }
    
    // Botón Siguiente
    const nextButton = createPaginationButton(
        '<i class="fas fa-chevron-right"></i>', 
        'next', 
        currentPage >= totalPages, 
        () => changePage(currentPage + 1)
    );
    paginationContainer.appendChild(nextButton);
}

function createPaginationButton(text, type, disabled, onClick) {
    const button = document.createElement('button');
    button.className = `pagination-btn ${type}`;
    button.innerHTML = text;
    button.disabled = disabled;
    button.addEventListener('click', onClick);
    return button;
}

function changePage(pageNumber) {
    if (pageNumber < 1 || pageNumber > appState.pagination.totalPages) return;
    appState.pagination.currentPage = pageNumber;
    displayCategorias();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =================================================================================
// FUNCIONES DE ACCIÓN - CRUD (CON SWEETALERT2)
// =================================================================================

async function openModalForNew() {
    appState.editingCategoriaId = null;
    await showCategoriaModal();
}

async function editCategoria(categoriaId) {
    try {
        const result = await getCategoriaById(categoriaId);
        
        if (result.success) {
            const categoria = result.data;
            appState.editingCategoriaId = categoriaId;
            await showCategoriaModal(categoria);
        } else {
            showError(result.error || 'Error al cargar la categoría');
        }
    } catch (error) {
        console.error('Error al cargar categoría para editar:', error);
        showError('No se pudo cargar la categoría para editar.');
    }
}

async function showCategoriaModal(categoria = null) {
    const isEditing = !!categoria;
    const title = isEditing ? 'Editar Categoría' : 'Nueva Categoría';
    const categoriaId = categoria?.id || '';
    
    // Crear el formulario HTML para SweetAlert2
    const formHtml = `
        <form id="categoriaFormSwal" class="categoria-form-swal">
            <input type="hidden" id="categoriaId" value="${categoriaId}">
            
            <div class="form-group-swal">
                <label for="nombreCategoria" class="form-label-swal">
                    <i class="fas fa-tag"></i> Nombre de la Categoría *
                </label>
                <input type="text" id="nombreCategoria" class="form-input-swal" 
                       value="${categoria?.nombreCategoria || ''}" required 
                       placeholder="Ej: Electrónicos, Ropa, Software">
            </div>
            
            <div class="form-group-swal">
                <label class="form-label-swal">
                    <i class="fas fa-image"></i> Imagen de la Categoría
                </label>
                <div class="image-upload-container-swal">
                    <div class="image-preview-swal" id="imagePreviewSwal">
                        ${categoria?.imagen ? 
                            `<img src="${categoria.imagen}" alt="Vista previa" style="max-width: 100%; max-height: 150px; border-radius: 8px;">` : 
                            '<i class="fas fa-image" style="font-size: 3rem; color: var(--primary-color); opacity: 0.7;"></i><br><span style="color: var(--text-color);">Vista previa de la imagen</span>'}
                    </div>
                    <div class="image-upload-controls-swal" style="display: flex; gap: 10px; margin-top: 10px;">
                        <button type="button" class="btn-small-swal" id="openImageUploadBtn" style="flex: 1;">
                            <i class="fas fa-upload"></i> Subir Imagen
                        </button>
                        ${categoria?.imagen ? 
                            '<button type="button" class="btn-small-swal btn-danger-swal" id="clearImageBtnSwal" style="flex: 1;">' +
                            '<i class="fas fa-trash"></i> Eliminar Imagen</button>' : 
                            '<button type="button" class="btn-small-swal btn-danger-swal" id="clearImageBtnSwal" style="flex: 1; display: none;">' +
                            '<i class="fas fa-trash"></i> Eliminar Imagen</button>'}
                    </div>
                    <input type="file" id="imagenInputSwal" accept="image/*" style="display: none;">
                    <textarea id="imagenBase64Swal" style="display: none;">${categoria?.imagen || ''}</textarea>
                </div>
            </div>
        </form>
    `;

    const swalResult = await Swal.fire({
        title: `<h3 style="color: var(--primary-color); margin-bottom: 20px;">${title}</h3>`,
        html: formHtml,
        showCancelButton: true,
        confirmButtonText: isEditing ? 'Actualizar' : 'Crear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--primary-color)',
        cancelButtonColor: 'var(--danger-color)',
        width: 600,
        padding: '2em',
        customClass: {
            container: 'categoria-swal-container',
            popup: 'categoria-swal-popup',
            title: 'categoria-swal-title',
            htmlContainer: 'categoria-swal-html',
            confirmButton: 'categoria-swal-confirm',
            cancelButton: 'categoria-swal-cancel'
        },
        didOpen: () => {
            // Configurar eventos para el formulario dentro de SweetAlert
            const form = document.getElementById('categoriaFormSwal');
            const nombreInput = document.getElementById('nombreCategoria');
            const imagenInput = document.getElementById('imagenInputSwal');
            const imagenBase64 = document.getElementById('imagenBase64Swal');
            const imagePreview = document.getElementById('imagePreviewSwal');
            const openImageBtn = document.getElementById('openImageUploadBtn');
            const clearImageBtn = document.getElementById('clearImageBtnSwal');
            
            // Enfocar el input del nombre
            if (nombreInput) {
                nombreInput.focus();
            }
            
            // Evento para subir imagen
            if (openImageBtn) {
                openImageBtn.addEventListener('click', () => {
                    imagenInput.click();
                });
            }
            
            // Evento para cambiar imagen
            if (imagenInput) {
                imagenInput.addEventListener('change', handleImageUploadSwal);
            }
            
            // Evento para limpiar imagen
            if (clearImageBtn) {
                clearImageBtn.addEventListener('click', () => clearImageSwal());
            }
            
            // Evento para el formulario
            if (form) {
                form.addEventListener('submit', (e) => e.preventDefault());
            }
            
            // Función para manejar subida de imagen en SweetAlert
            function handleImageUploadSwal(event) {
                const file = event.target.files[0];
                if (!file) return;
                
                if (!file.type.startsWith('image/')) {
                    showError('Por favor, selecciona un archivo de imagen válido.');
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    showError('La imagen es demasiado grande. El tamaño máximo es 5MB.');
                    return;
                }
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const base64Image = e.target.result;
                    imagenBase64.value = base64Image;
                    
                    imagePreview.innerHTML = `<img src="${base64Image}" alt="Vista previa" style="max-width: 100%; max-height: 150px; border-radius: 8px;">`;
                    clearImageBtn.style.display = 'block';
                };
                
                reader.readAsDataURL(file);
            }
            
            // Función para limpiar imagen en SweetAlert
            function clearImageSwal() {
                Swal.fire({
                    title: '¿Eliminar imagen?',
                    text: 'Esta acción no se puede deshacer.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: 'var(--primary-color)',
                    cancelButtonColor: 'var(--danger-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-color)',
                    reverseButtons: true
                }).then((result) => {
                    if (result.isConfirmed) {
                        imagenBase64.value = '';
                        imagenInput.value = '';
                        imagePreview.innerHTML = '<i class="fas fa-image" style="font-size: 3rem; color: var(--primary-color); opacity: 0.7;"></i><br><span style="color: var(--text-color);">Vista previa de la imagen</span>';
                        clearImageBtn.style.display = 'none';
                    }
                });
            }
        },
        preConfirm: async () => {
            const nombreCategoria = document.getElementById('nombreCategoria')?.value.trim();
            const imagen = document.getElementById('imagenBase64Swal')?.value.trim();
            const categoriaIdInput = document.getElementById('categoriaId')?.value;
            
            if (!nombreCategoria) {
                Swal.showValidationMessage('El nombre de la categoría es requerido');
                return false;
            }
            
            try {
                // Validar la categoría
                validateCategoria(nombreCategoria, imagen);
                
                const categoriaData = {
                    nombreCategoria: nombreCategoria,
                    imagen: imagen || null
                };
                
                if (categoriaIdInput) {
                    // Actualizar categoría existente
                    const result = await updateCategoria(categoriaIdInput, categoriaData);
                    
                    if (result.success) {
                        return { success: true, message: 'Categoría actualizada exitosamente' };
                    } else {
                        Swal.showValidationMessage(result.error || 'Error al actualizar la categoría');
                        return false;
                    }
                } else {
                    // Crear nueva categoría
                    const result = await createCategoria(nombreCategoria, imagen);
                    
                    if (result.success) {
                        return { success: true, message: 'Categoría creada exitosamente' };
                    } else {
                        Swal.showValidationMessage(result.error || 'Error al crear la categoría');
                        return false;
                    }
                }
            } catch (error) {
                console.error('Error al guardar categoría:', error);
                Swal.showValidationMessage('No se pudo guardar la categoría: ' + error.message);
                return false;
            }
        }
    });

    if (swalResult.isConfirmed && swalResult.value?.success) {
        await Swal.fire({
            title: '¡Éxito!',
            text: swalResult.value.message,
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--card-bg)',
            color: 'var(--text-color)'
        });
        
        await loadCategorias();
    }
}

async function deleteCategoria(categoriaId) {
    try {
        const categoria = appState.categorias.find(c => c.id === categoriaId);
        if (!categoria) return;
        
        const result = await Swal.fire({
            title: '¿Eliminar categoría?',
            html: `¿Estás seguro de que deseas eliminar la categoría<br><strong>"${categoria.nombreCategoria}"</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: 'var(--primary-color)',
            cancelButtonColor: 'var(--danger-color)',
            background: 'var(--card-bg)',
            color: 'var(--text-color)',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            const deleteResult = await deleteCategoriaById(categoriaId);
            
            if (deleteResult.success) {
                await Swal.fire({
                    title: '¡Eliminado!',
                    text: 'La categoría ha sido eliminada exitosamente.',
                    icon: 'success',
                    confirmButtonText: 'Aceptar',
                    confirmButtonColor: 'var(--primary-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-color)'
                });
                
                await loadCategorias();
            } else {
                showError(deleteResult.error || 'Error al eliminar la categoría');
            }
        }
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        showError('No se pudo eliminar la categoría.');
    }
}

// =================================================================================
// FUNCIONES AUXILIARES
// =================================================================================

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
        // Si es un timestamp de Firestore
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        // Si es un string de fecha
        if (typeof timestamp === 'string') {
            return new Date(timestamp).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        // Si es un objeto Date
        if (timestamp instanceof Date) {
            return timestamp.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        return 'Fecha inválida';
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Fecha inválida';
    }
};

function showError(message) {
    Swal.fire({
        title: 'Error',
        text: message,
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: 'var(--primary-color)',
        background: 'var(--card-bg)',
        color: 'var(--text-color)'
    });
}

// =================================================================================
// CONFIGURACIÓN DE EVENTOS
// =================================================================================

function setupEventListeners() {
    // Evento de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            appState.pagination.currentPage = 1;
            applySearchAndDisplay();
        });
    }

    // Botón nueva categoría
    const btnNuevaCategoria = document.getElementById('btnNuevaCategoria');
    if (btnNuevaCategoria) {
        btnNuevaCategoria.addEventListener('click', openModalForNew);
    }
}

// =================================================================================
// EXPORTAR FUNCIONES AL SCOPE GLOBAL
// =================================================================================

// Exportar funciones al scope global para que puedan ser llamadas desde HTML
window.editCategoria = editCategoria;
window.deleteCategoria = deleteCategoria;
window.openModalForNew = openModalForNew;

// =================================================================================
// INICIALIZACIÓN
// =================================================================================
document.addEventListener('DOMContentLoaded', initialLoad);