// gestionCategoriaCotizaciones.js - Controlador/Vista
import { CategoriaCotizaciones } from '/classes/categoriaCotizaciones.js';

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
// FUNCIONES PRINCIPALES
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
        const result = await CategoriaCotizaciones.getAll();
        
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
                <td colspan="5" class="empty-state">
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

    // Mostrar tabla para escritorio
    const rowsHtml = currentItems.map(categoria => {
        return `
            <tr>
                <td><strong>${categoria.id.substring(0, 8)}...</strong></td>
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

    // Mostrar tarjetas para móvil
    const cardsHtml = currentItems.map(categoria => {
        return `
            <div class="categoria-card">
                <div class="card-row">
                    <span class="card-label">ID:</span>
                    <span class="card-value"><strong>${categoria.id.substring(0, 8)}...</strong></span>
                </div>
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
// FUNCIONES DE ACCIÓN - CRUD
// =================================================================================

function openModalForNew() {
    appState.editingCategoriaId = null;
    document.getElementById('modalTitle').textContent = 'Nueva Categoría';
    document.getElementById('categoriaId').value = '';
    document.getElementById('nombreCategoria').value = '';
    document.getElementById('imagenBase64').value = '';
    
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.innerHTML = '<i class="fas fa-image"></i><span>Vista previa de la imagen</span>';
    document.getElementById('clearImageBtn').style.display = 'none';
    
    openModal();
}

async function editCategoria(categoriaId) {
    try {
        const result = await CategoriaCotizaciones.getById(categoriaId);
        
        if (result.success) {
            const categoria = result.data;
            appState.editingCategoriaId = categoriaId;
            
            document.getElementById('modalTitle').textContent = 'Editar Categoría';
            document.getElementById('categoriaId').value = categoriaId;
            document.getElementById('nombreCategoria').value = categoria.nombreCategoria || '';
            document.getElementById('imagenBase64').value = categoria.imagen || '';
            
            const imagePreview = document.getElementById('imagePreview');
            const clearImageBtn = document.getElementById('clearImageBtn');
            
            if (categoria.imagen) {
                imagePreview.innerHTML = `<img src="${categoria.imagen}" alt="${categoria.nombreCategoria}" 
                                          onerror="this.parentElement.innerHTML='<i class=\'fas fa-image\'></i><span>Error al cargar imagen</span>'">`;
                clearImageBtn.style.display = 'inline-block';
            } else {
                imagePreview.innerHTML = '<i class="fas fa-image"></i><span>Vista previa de la imagen</span>';
                clearImageBtn.style.display = 'none';
            }
            
            openModal();
        } else {
            showError(result.error || 'Error al cargar la categoría');
        }
    } catch (error) {
        console.error('Error al cargar categoría para editar:', error);
        showError('No se pudo cargar la categoría para editar.');
    }
}

async function saveCategoria(event) {
    event.preventDefault();
    
    const nombreCategoria = document.getElementById('nombreCategoria').value.trim();
    const imagen = document.getElementById('imagenBase64').value.trim();
    const categoriaId = document.getElementById('categoriaId').value;
    
    if (!nombreCategoria) {
        showError('El nombre de la categoría es requerido');
        return;
    }
    
    try {
        const categoria = new CategoriaCotizaciones(nombreCategoria, imagen);
        
        if (categoriaId) {
            // Actualizar categoría existente
            const result = await CategoriaCotizaciones.update(categoriaId, categoria.toJSON());
            
            if (result.success) {
                Swal.fire({
                    title: '¡Actualizado!',
                    text: 'La categoría ha sido actualizada exitosamente.',
                    icon: 'success',
                    confirmButtonColor: '#6C43E0'
                });
                
                closeModal();
                await loadCategorias();
            } else {
                showError(result.error || 'Error al actualizar la categoría');
            }
        } else {
            // Crear nueva categoría
            const result = await categoria.create();
            
            if (result.success) {
                Swal.fire({
                    title: '¡Creado!',
                    text: 'La categoría ha sido creada exitosamente.',
                    icon: 'success',
                    confirmButtonColor: '#6C43E0'
                });
                
                closeModal();
                await loadCategorias();
            } else {
                showError(result.error || 'Error al crear la categoría');
            }
        }
    } catch (error) {
        console.error('Error al guardar categoría:', error);
        showError('No se pudo guardar la categoría.');
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
            confirmButtonColor: '#6C43E0',
            cancelButtonColor: '#dc3545'
        });

        if (result.isConfirmed) {
            const deleteResult = await CategoriaCotizaciones.delete(categoriaId);
            
            if (deleteResult.success) {
                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'La categoría ha sido eliminada exitosamente.',
                    icon: 'success',
                    confirmButtonColor: '#6C43E0'
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
// FUNCIONES DE MODAL
// =================================================================================

function openModal() {
    const modal = document.getElementById('categoriaModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('categoriaModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openImageUpload() {
    document.getElementById('imagenInput').click();
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showError('Por favor, selecciona un archivo de imagen válido.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        document.getElementById('imagenBase64').value = base64Image;
        
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = `<img src="${base64Image}" alt="Vista previa">`;
        document.getElementById('clearImageBtn').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    document.getElementById('imagenBase64').value = '';
    document.getElementById('imagenInput').value = '';
    
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.innerHTML = '<i class="fas fa-image"></i><span>Vista previa de la imagen</span>';
    document.getElementById('clearImageBtn').style.display = 'none';
}

// =================================================================================
// FUNCIONES AUXILIARES
// =================================================================================

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        return new Date(timestamp).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
};

function showError(message) {
    Swal.fire({
        title: 'Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#6C43E0'
    });
}

function showSuccess(message) {
    Swal.fire({
        title: '¡Éxito!',
        text: message,
        icon: 'success',
        confirmButtonColor: '#6C43E0'
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

    // Formulario de categoría
    const categoriaForm = document.getElementById('categoriaForm');
    if (categoriaForm) {
        categoriaForm.addEventListener('submit', saveCategoria);
    }

    // Cerrar modal haciendo clic fuera
    const modal = document.getElementById('categoriaModal');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // Evento en textarea de imagen
    const imagenTextarea = document.getElementById('imagenBase64');
    if (imagenTextarea) {
        imagenTextarea.addEventListener('input', () => {
            const imagePreview = document.getElementById('imagePreview');
            const clearImageBtn = document.getElementById('clearImageBtn');
            const value = imagenTextarea.value.trim();
            
            if (value && value.startsWith('data:image')) {
                imagePreview.innerHTML = `<img src="${value}" alt="Vista previa" 
                                             onerror="this.parentElement.innerHTML='<i class=\'fas fa-image\'></i><span>Imagen inválida</span>'">`;
                clearImageBtn.style.display = 'inline-block';
            } else if (value === '') {
                imagePreview.innerHTML = '<i class="fas fa-image"></i><span>Vista previa de la imagen</span>';
                clearImageBtn.style.display = 'none';
            }
        });
    }
}

// =================================================================================
// EXPORTAR FUNCIONES AL SCOPE GLOBAL
// =================================================================================

// Exportar funciones al scope global para que puedan ser llamadas desde HTML
window.editCategoria = editCategoria;
window.deleteCategoria = deleteCategoria;
window.openImageUpload = openImageUpload;
window.handleImageUpload = handleImageUpload;
window.clearImage = clearImage;
window.closeModal = closeModal;

// También necesitas exportar openModalForNew si se usa desde HTML
window.openModalForNew = openModalForNew;
window.saveCategoria = saveCategoria;

// =================================================================================
// INICIALIZACIÓN
// =================================================================================
document.addEventListener('DOMContentLoaded', initialLoad);