// productos.js - Versión corregida y optimizada

// Variables globales
let db;
const appState = {
    currentPage: 1,
    lastVisible: null,
    filterCategoria: 'todas',
    filterDescuento: 'todos',
    searchTerm: '',
    productos: [],
    categorias: [],
    currentImages: [],
    MAX_IMAGES: 3,
    itemsPerPage: 10,
    
    // Cache para búsquedas
    cacheProductos: [],
    isInitialLoad: true,
    
    // Estadísticas
    totalProductos: 0,
    productosDescuento: 0,
    productosIndex: 0,
    productosConImagen: 0
};

// Esperar a que Firebase esté listo
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            db = firebase.firestore();
            console.log('✅ Firebase inicializado para productos');
            resolve(true);
        } else {
            const checkInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(checkInterval);
                    db = firebase.firestore();
                    console.log('✅ Firebase inicializado para productos (retardado)');
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

// Función de seguridad para HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Formatear precio
function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(precio || 0);
}

// Calcular precio final
function calcularPrecioFinal() {
    const precio = parseFloat(document.getElementById("precio").value) || 0;
    const descuento = parseFloat(document.getElementById("descuento").value) || 0;
    
    if (descuento < 0) {
        document.getElementById("descuento").value = 0;
        return calcularPrecioFinal();
    }
    if (descuento > 100) {
        document.getElementById("descuento").value = 100;
        return calcularPrecioFinal();
    }
    
    const precioFinal = precio * (1 - descuento/100);
    document.getElementById("precioFinal").value = precioFinal.toFixed(2);
}

// Cargar todas las categorías
async function cargarCategorias() {
    try {
        const snapshot = await db.collection("categorias").orderBy("nombre").get();
        appState.categorias = snapshot.docs.map(doc => doc.data().nombre);
        
        // Actualizar selects de categorías
        updateCategorySelects();
        
        console.log('✅ Categorías cargadas:', appState.categorias.length);
        return true;
    } catch (error) {
        console.error("Error cargando categorías:", error);
        appState.categorias = [];
        updateCategorySelects();
        return false;
    }
}

// Actualizar selects de categorías
function updateCategorySelects() {
    const categorySelects = [
        document.getElementById('categoria'),
        document.getElementById('selectedCategory'),
        document.getElementById('filterCategoria')
    ];
    
    categorySelects.forEach(select => {
        if (select) {
            const currentValue = select.value;
            select.innerHTML = `
                <option value="todas">Todas las categorías</option>
                ${appState.categorias.map(categoria => 
                    `<option value="${categoria}">${categoria}</option>`
                ).join('')}
            `;
            select.value = currentValue || 'todas';
        }
    });
}

// Cargar TODOS los productos para búsqueda en cache (una sola vez)
async function cargarTodosProductos() {
    try {
        console.log('🔄 Cargando todos los productos para cache...');
        const querySnapshot = await db.collection("Productos")
            .orderBy("Nombre Producto")
            .get();
        
        appState.cacheProductos = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                // Normalizar campos para búsqueda
                searchString: `${data["Nombre Producto"] || ''} ${data.SKU || ''} ${data.Marca || ''} ${data.Categoria || ''} ${data.Modelo || ''} ${data.Tipo || ''}`.toLowerCase()
            };
        });
        
        console.log(`✅ ${appState.cacheProductos.length} productos cargados en cache`);
        appState.isInitialLoad = false;
        return true;
    } catch (error) {
        console.error("Error cargando todos los productos:", error);
        appState.cacheProductos = [];
        return false;
    }
}

// Cargar productos con filtros y paginación
async function cargarProductos(direction = 'next') {
    const tablaContainer = document.getElementById("productos-lista");
    const cardsContainer = document.getElementById("productos-cards");
    
    if (!db) {
        mostrarError('Firebase no está inicializado. Recarga la página.');
        return;
    }
    
    // Mostrar loading
    const loadingHTML = `
        <tr class="loading-state">
            <td colspan="8">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando productos...</p>
            </td>
        </tr>
    `;
    
    if (tablaContainer) {
        tablaContainer.innerHTML = loadingHTML;
    }
    
    if (cardsContainer) {
        cardsContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando productos...</p>
            </div>
        `;
    }
    
    try {
        // Si hay término de búsqueda, usar cache en lugar de consulta Firestore
        if (appState.searchTerm) {
            await filtrarYMostrarProductos();
            return;
        }
        
        // Construir consulta base
        let queryRef = db.collection("Productos");
        
        // Aplicar filtro de categoría si no es "todas"
        if (appState.filterCategoria !== 'todas') {
            try {
                // Consulta optimizada: Filtrar por categoría y ordenar por nombre
                queryRef = queryRef
                    .where("Categoria", "==", appState.filterCategoria)
                    .orderBy("Nombre Producto");
            } catch (error) {
                console.warn("Índice no creado, usando filtro en memoria:", error);
                // Si no hay índice, cargamos todo y filtramos en memoria
                return cargarYFiltrarEnMemoria();
            }
        } else {
            // Si no hay filtro de categoría, solo ordenar por nombre
            queryRef = queryRef.orderBy("Nombre Producto");
        }
        
        // Aplicar paginación
        if (direction === 'next' && appState.lastVisible) {
            queryRef = queryRef.startAfter(appState.lastVisible);
        }
        
        // Limitar resultados
        queryRef = queryRef.limit(appState.itemsPerPage);
        
        const querySnapshot = await queryRef.get();
        
        if (querySnapshot.empty) {
            mostrarSinProductos();
            return;
        }
        
        // Actualizar referencia para paginación
        appState.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        // Procesar y mostrar productos
        await procesarYMostrarProductos(querySnapshot, direction);
        
    } catch (error) {
        console.error("Error cargando productos:", error);
        
        // Si es error de índice, mostrar ayuda
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            mostrarErrorIndice(error);
        } else {
            mostrarError('Error al cargar productos: ' + error.message);
        }
    }
}

// Cargar y filtrar en memoria (cuando no hay índice)
async function cargarYFiltrarEnMemoria() {
    try {
        // Si no tenemos cache, cargarlo primero
        if (appState.cacheProductos.length === 0) {
            await cargarTodosProductos();
        }
        
        // Filtrar productos en memoria
        let productosFiltrados = [...appState.cacheProductos];
        
        // Aplicar filtro de categoría
        if (appState.filterCategoria !== 'todas') {
            productosFiltrados = productosFiltrados.filter(p => 
                p.Categoria === appState.filterCategoria
            );
        }
        
        // Aplicar filtro de descuento
        if (appState.filterDescuento === 'con') {
            productosFiltrados = productosFiltrados.filter(p => 
                parseFloat(p.Descuento) > 0
            );
        } else if (appState.filterDescuento === 'sin') {
            productosFiltrados = productosFiltrados.filter(p => 
                parseFloat(p.Descuento) === 0
            );
        }
        
        // Paginación en memoria
        const startIndex = (appState.currentPage - 1) * appState.itemsPerPage;
        const endIndex = startIndex + appState.itemsPerPage;
        const productosPagina = productosFiltrados.slice(startIndex, endIndex);
        
        if (productosPagina.length === 0) {
            mostrarSinProductos();
            return;
        }
        
        // Actualizar controles de paginación
        const totalPaginas = Math.ceil(productosFiltrados.length / appState.itemsPerPage);
        actualizarControlesPaginacion(totalPaginas);
        
        // Mostrar productos
        mostrarProductos(productosPagina);
        
    } catch (error) {
        console.error("Error filtrando en memoria:", error);
        mostrarError('Error al filtrar productos: ' + error.message);
    }
}

// Filtrar y mostrar productos con búsqueda
async function filtrarYMostrarProductos() {
    try {
        // Si no tenemos cache, cargarlo primero
        if (appState.cacheProductos.length === 0) {
            await cargarTodosProductos();
        }
        
        let productosFiltrados = [...appState.cacheProductos];
        
        // Aplicar filtro de categoría
        if (appState.filterCategoria !== 'todas') {
            productosFiltrados = productosFiltrados.filter(p => 
                p.Categoria === appState.filterCategoria
            );
        }
        
        // Aplicar filtro de descuento
        if (appState.filterDescuento === 'con') {
            productosFiltrados = productosFiltrados.filter(p => 
                parseFloat(p.Descuento) > 0
            );
        } else if (appState.filterDescuento === 'sin') {
            productosFiltrados = productosFiltrados.filter(p => 
                parseFloat(p.Descuento) === 0
            );
        }
        
        // Aplicar búsqueda por texto
        if (appState.searchTerm) {
            const searchLower = appState.searchTerm.toLowerCase();
            productosFiltrados = productosFiltrados.filter(p => 
                p.searchString.includes(searchLower)
            );
        }
        
        // Paginación
        const startIndex = (appState.currentPage - 1) * appState.itemsPerPage;
        const endIndex = startIndex + appState.itemsPerPage;
        const productosPagina = productosFiltrados.slice(startIndex, endIndex);
        
        if (productosPagina.length === 0) {
            mostrarSinProductos();
            return;
        }
        
        // Actualizar controles de paginación
        const totalPaginas = Math.ceil(productosFiltrados.length / appState.itemsPerPage);
        actualizarControlesPaginacion(totalPaginas);
        
        // Mostrar productos
        mostrarProductos(productosPagina);
        
    } catch (error) {
        console.error("Error en búsqueda:", error);
        mostrarError('Error en búsqueda: ' + error.message);
    }
}

// Procesar y mostrar productos desde Firestore
async function procesarYMostrarProductos(querySnapshot, direction) {
    // Obtener productos indexados
    let productosIndexados = [];
    try {
        const indexSnapshot = await db.collection("indexproductos").get();
        productosIndexados = indexSnapshot.docs.map(doc => doc.data().productId);
    } catch (error) {
        console.error("Error obteniendo productos indexados:", error);
    }
    
    // Preparar datos
    const productos = [];
    
    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        
        productos.push({ 
            id, 
            ...data,
            searchString: `${data["Nombre Producto"] || ''} ${data.SKU || ''} ${data.Marca || ''} ${data.Categoria || ''} ${data.Modelo || ''} ${data.Tipo || ''}`.toLowerCase()
        });
    });
    
    // Actualizar cache con estos productos
    productos.forEach(producto => {
        const index = appState.cacheProductos.findIndex(p => p.id === producto.id);
        if (index === -1) {
            appState.cacheProductos.push(producto);
        } else {
            appState.cacheProductos[index] = producto;
        }
    });
    
    // Mostrar productos
    mostrarProductos(productos, productosIndexados);
    
    // Actualizar controles de paginación
    actualizarControlesPaginacion(querySnapshot.size);
    
    // Cargar estadísticas
    await cargarEstadisticas();
}

// Mostrar productos en tabla y tarjetas
function mostrarProductos(productos, productosIndexados = []) {
    // Obtener IDs indexados si no se proporcionan
    if (productosIndexados.length === 0) {
        try {
            productosIndexados = productos.filter(p => 
                appState.cacheProductos.find(cp => cp.id === p.id && cp.indexed)
            ).map(p => p.id);
        } catch (error) {
            console.error("Error obteniendo productos indexados de cache:", error);
        }
    }
    
    // Generar HTML para ambas vistas
    let tablaHTML = '';
    let cardsHTML = '';
    
    productos.forEach(producto => {
        const data = producto;
        const id = producto.id;
        
        // Calcular precios
        const precioOriginal = parseFloat(data["Precio MXN"]) || 0;
        const descuento = parseFloat(data.Descuento) || 0;
        const precioFinal = descuento > 0 ? (precioOriginal * (1 - descuento/100)) : precioOriginal;
        
        // Verificar si está indexado
        const isIndexed = productosIndexados.includes(id);
        
        // HTML para TABLA (desktop)
        tablaHTML += `
            <tr data-id="${id}" class="${isIndexed ? 'indexed' : ''}">
                <td>
                    <div class="producto-info-tabla">
                        <strong>${escapeHtml(data["Nombre Producto"] || 'Sin nombre')}</strong>
                        <br>
                        <small class="sku-tabla">SKU: ${escapeHtml(data.SKU || 'N/A')}</small>
                    </div>
                </td>
                <td>${escapeHtml(data.Categoria || 'Sin categoría')}</td>
                <td class="image-indicator">
                    <span class="${data.Imagenes?.length ? 'has-images' : 'no-images'}">
                        ${data.Imagenes?.length || 0}
                    </span>
                </td>
                <td>
                    ${descuento > 0 ? 
                        `<span class="original-price">${formatearPrecio(precioOriginal)}</span>` : 
                        formatearPrecio(precioOriginal)
                    }
                </td>
                <td>
                    ${descuento > 0 ? 
                        `<span class="discount-badge">-${descuento}%</span>` : 
                        '0%'
                    }
                </td>
                <td class="final-price">
                    ${formatearPrecio(precioFinal)}
                </td>
                <td>${escapeHtml(data.Marca || 'Sin marca')}</td>
                <td>
                    <div class="acciones-tabla">
                        <button class="btn-accion btn-accion-small btn-editar" 
                                onclick="editarProducto('${id}')"
                                title="Editar producto">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-accion btn-accion-small btn-eliminar" 
                                onclick="eliminarProducto('${id}', '${escapeHtml(data["Nombre Producto"])}')"
                                title="Eliminar producto">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <button class="btn-accion btn-accion-small btn-index ${isIndexed ? 'indexed' : ''}" 
                                onclick="toggleIndex('${id}', '${escapeHtml(data["Nombre Producto"])}')"
                                title="${isIndexed ? 'Quitar del índice' : 'Agregar al índice'}">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        // HTML para TARJETAS (móvil)
        cardsHTML += `
            <div class="producto-card ${isIndexed ? 'indexed' : ''}" data-id="${id}">
                <div class="card-header-producto">
                    <div>
                        <h3 class="producto-nombre">${escapeHtml(data["Nombre Producto"] || 'Sin nombre')}</h3>
                        <span class="producto-sku">SKU: ${escapeHtml(data.SKU || 'N/A')}</span>
                        ${isIndexed ? '<div class="producto-index">★</div>' : ''}
                    </div>
                </div>
                
                <div class="card-content-producto">
                    <div class="card-imagenes">
                        ${data.Imagenes?.length ? `
                            <div class="imagenes-slider">
                                ${data.Imagenes.slice(0, 3).map((img, index) => `
                                    <img src="${img}" 
                                         class="imagen-miniatura" 
                                         alt="Imagen ${index + 1}"
                                         onclick="ampliarImagen('${img}', '${escapeHtml(data["Nombre Producto"])}')">
                                `).join('')}
                            </div>
                        ` : '<div class="sin-imagenes">Sin imágenes</div>'}
                    </div>
                    
                    <div class="card-detalle">
                        <div class="detalle-item">
                            <span class="detalle-label">Categoría:</span>
                            <span class="detalle-value">${escapeHtml(data.Categoria || 'Sin categoría')}</span>
                        </div>
                        <div class="detalle-item">
                            <span class="detalle-label">Marca:</span>
                            <span class="detalle-value">${escapeHtml(data.Marca || 'Sin marca')}</span>
                        </div>
                        <div class="detalle-item">
                            <span class="detalle-label">Modelo:</span>
                            <span class="detalle-value">${escapeHtml(data.Modelo || 'Sin modelo')}</span>
                        </div>
                    </div>
                    
                    <div class="card-detalle">
                        <div class="detalle-item">
                            <span class="detalle-label">Precio:</span>
                            <span class="detalle-value">
                                ${descuento > 0 ? 
                                    `<span style="text-decoration: line-through; color: #999; margin-right: 8px;">
                                        ${formatearPrecio(precioOriginal)}
                                    </span>` : 
                                    ''
                                }
                                <span class="precio-final">${formatearPrecio(precioFinal)}</span>
                            </span>
                        </div>
                        ${descuento > 0 ? `
                            <div class="detalle-item">
                                <span class="detalle-label">Descuento:</span>
                                <span class="detalle-value discount-badge">-${descuento}%</span>
                            </div>
                        ` : ''}
                        <div class="detalle-item">
                            <span class="detalle-label">Tipo:</span>
                            <span class="detalle-value">${escapeHtml(data.Tipo || 'Sin tipo')}</span>
                        </div>
                    </div>
                </div>
                
                <div class="card-footer-producto">
                    <div class="card-acciones">
                        <button class="btn-accion btn-accion-small btn-editar" 
                                onclick="editarProducto('${id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-accion btn-accion-small btn-eliminar" 
                                onclick="eliminarProducto('${id}', '${escapeHtml(data["Nombre Producto"])}')">
                            <i class="fas fa-trash-alt"></i> Eliminar
                        </button>
                        <button class="btn-accion btn-accion-small btn-index ${isIndexed ? 'indexed' : ''}" 
                                onclick="toggleIndex('${id}', '${escapeHtml(data["Nombre Producto"])}')">
                            <i class="fas fa-star"></i> ${isIndexed ? 'En índice' : 'Indexar'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Actualizar tabla
    const tablaContainer = document.getElementById("productos-lista");
    if (tablaContainer) {
        tablaContainer.innerHTML = tablaHTML;
    }
    
    // Actualizar contenedor de tarjetas
    crearContenedorTarjetas(cardsHTML);
}

// Crear contenedor de tarjetas dinámicamente
function crearContenedorTarjetas(cardsHTML) {
    let cardsContainer = document.getElementById("productos-cards");
    
    if (!cardsContainer) {
        cardsContainer = document.createElement('div');
        cardsContainer.id = 'productos-cards';
        cardsContainer.className = 'productos-cards-container';
        
        const tableContainer = document.querySelector('.productos-table-container');
        if (tableContainer) {
            tableContainer.parentNode.insertBefore(cardsContainer, tableContainer.nextSibling);
        }
    }
    
    cardsContainer.innerHTML = cardsHTML;
}

// Mostrar sin productos
function mostrarSinProductos() {
    const tablaContainer = document.getElementById("productos-lista");
    const cardsContainer = document.getElementById("productos-cards");
    
    const emptyHTML = `
        <tr class="empty-state">
            <td colspan="8">
                <i class="fas fa-box"></i>
                <h3>No hay productos</h3>
                <p>No se encontraron productos con los filtros aplicados.</p>
                <button onclick="resetFilters()" class="btn-action" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Restablecer filtros
                </button>
            </td>
        </tr>
    `;
    
    if (tablaContainer) {
        tablaContainer.innerHTML = emptyHTML;
    }
    
    if (cardsContainer) {
        cardsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box"></i>
                <h3>No hay productos</h3>
                <p>No se encontraron productos con los filtros aplicados.</p>
                <button onclick="resetFilters()" class="btn-action" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Restablecer filtros
                </button>
            </div>
        `;
    }
    
    actualizarControlesPaginacion(0);
}

// Resetear filtros
function resetFilters() {
    appState.filterCategoria = 'todas';
    appState.filterDescuento = 'todos';
    appState.searchTerm = '';
    appState.currentPage = 1;
    appState.lastVisible = null;
    
    document.getElementById('filterCategoria').value = 'todas';
    document.getElementById('filterDescuento').value = 'todos';
    document.getElementById('searchProducto').value = '';
    
    cargarProductos();
}

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        if (appState.cacheProductos.length === 0) {
            await cargarTodosProductos();
        }
        
        appState.totalProductos = appState.cacheProductos.length;
        appState.productosDescuento = appState.cacheProductos.filter(p => 
            parseFloat(p.Descuento) > 0
        ).length;
        appState.productosConImagen = appState.cacheProductos.filter(p => 
            p.Imagenes && p.Imagenes.length > 0
        ).length;
        
        // Contar productos en índice
        try {
            const indexSnapshot = await db.collection("indexproductos").get();
            appState.productosIndex = indexSnapshot.size;
        } catch (error) {
            console.error("Error contando productos indexados:", error);
            appState.productosIndex = 0;
        }
        
        // Actualizar UI
        document.getElementById('totalProductos').textContent = appState.totalProductos;
        document.getElementById('productosDescuento').textContent = appState.productosDescuento;
        document.getElementById('productosIndex').textContent = appState.productosIndex;
        document.getElementById('productosConImagen').textContent = appState.productosConImagen;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Configurar filtros
function configurarFiltros() {
    const filterCategoria = document.getElementById('filterCategoria');
    const filterDescuento = document.getElementById('filterDescuento');
    const searchInput = document.getElementById('searchProducto');
    
    filterCategoria.addEventListener('change', (e) => {
        appState.filterCategoria = e.target.value;
        appState.currentPage = 1;
        appState.lastVisible = null;
        cargarProductos();
    });
    
    filterDescuento.addEventListener('change', (e) => {
        appState.filterDescuento = e.target.value;
        appState.currentPage = 1;
        appState.lastVisible = null;
        cargarProductos();
    });
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            appState.searchTerm = e.target.value.trim();
            appState.currentPage = 1;
            appState.lastVisible = null;
            
            if (appState.searchTerm) {
                // Usar búsqueda en cache
                filtrarYMostrarProductos();
            } else {
                // Sin búsqueda, cargar normal
                cargarProductos();
            }
        }, 300); // Reducido a 300ms para mejor respuesta
    });
}

// Configurar paginación
function configurarPaginacion() {
    document.getElementById('btnPaginaAnterior').addEventListener('click', () => {
        if (appState.currentPage > 1) {
            appState.currentPage--;
            appState.lastVisible = null;
            cargarProductos();
        }
    });
    
    document.getElementById('btnPaginaSiguiente').addEventListener('click', () => {
        appState.currentPage++;
        cargarProductos('next');
    });
}

// Actualizar controles de paginación
function actualizarControlesPaginacion(docsCargados = 0, totalPaginas = null) {
    const btnAnterior = document.getElementById('btnPaginaAnterior');
    const btnSiguiente = document.getElementById('btnPaginaSiguiente');
    const paginaActual = document.getElementById('paginaActual');
    
    if (totalPaginas !== null) {
        btnSiguiente.disabled = appState.currentPage >= totalPaginas;
    } else {
        btnSiguiente.disabled = docsCargados < appState.itemsPerPage;
    }
    
    paginaActual.textContent = `Página ${appState.currentPage}`;
    btnAnterior.disabled = appState.currentPage === 1;
}

// Mostrar error de índice
function mostrarErrorIndice(error) {
    const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
    const indexUrl = urlMatch ? urlMatch[0] : 'https://console.firebase.google.com';
    
    Swal.fire({
        title: 'Índice requerido',
        html: `
            <p>Se necesita crear un índice en Firebase Firestore para usar los filtros por categoría.</p>
            <p>Por favor:</p>
            <ol style="text-align: left; margin: 15px 0;">
                <li>Abre el <a href="${indexUrl}" target="_blank">enlace del índice</a></li>
                <li>Haz clic en "Crear índice"</li>
                <li>Espera unos minutos mientras se crea</li>
                <li>Recarga esta página</li>
            </ol>
            <p><strong>Nota:</strong> Mientras tanto, puedes usar la búsqueda que funciona sin índices.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Abrir enlace',
        cancelButtonText: 'Continuar sin filtro'
    }).then((result) => {
        if (result.isConfirmed) {
            window.open(indexUrl, '_blank');
        } else {
            // Continuar sin usar filtro de categoría en Firestore
            appState.filterCategoria = 'todas';
            document.getElementById('filterCategoria').value = 'todas';
            cargarProductos();
        }
    });
}

// Mostrar error
function mostrarError(mensaje) {
    const tablaContainer = document.getElementById("productos-lista");
    const cardsContainer = document.getElementById("productos-cards");
    
    const errorHTML = `
        <tr class="error-state">
            <td colspan="8">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarProductos()" class="btn-action" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </td>
        </tr>
    `;
    
    if (tablaContainer) {
        tablaContainer.innerHTML = errorHTML;
    }
    
    if (cardsContainer) {
        cardsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarProductos()" class="btn-action" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// ... (EL RESTO DE LAS FUNCIONES SIGUEN IGUAL: showAddModal, closeModal, calcularPrecioFinal,
// handleImages, deleteImage, toggleDiscountOptions, editarProducto, eliminarProducto,
// toggleIndex, ampliarImagen, saveProduct, etc.)
// Solo asegúrate de que estas funciones existan como en tu código original

// Inicializar la aplicación optimizada
async function initApp() {
    console.log('🚀 Inicializando módulo de productos optimizado...');
    
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
        return;
    }
    
    // Configurar eventos
    configurarFiltros();
    configurarPaginacion();
    
    // Cargar categorías
    await cargarCategorias();
    
    // Cargar cache inicial de productos (más rápido para búsquedas)
    cargarTodosProductos().then(() => {
        console.log('✅ Cache de productos cargado');
    });
    
    // Cargar primera página de productos
    await cargarProductos();
    
    console.log('✅ Módulo de productos inicializado correctamente');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ========================================
// FUNCIONES DE REDIRECCIÓN - AGREGAR AL FINAL DE productos.js
// ========================================

// Redirigir a módulo de nuevo producto
function redirigirANuevoProducto() {
    console.log('🆕 Redirigiendo a nuevo producto...');
    
    // Verificar si ya estamos en la página correcta
    const currentPath = window.location.pathname;
    if (currentPath.includes('nuevo-producto')) {
        console.log('ℹ️ Ya estamos en la página de nuevo producto');
        return;
    }
    
    // Redirigir con parámetro de modo
    const url = '/vista/nav-mesa-admin/e-comerce/nuevo-producto/nuevo-producto.html';
    console.log('↪️ Redirigiendo a:', url);
    window.location.href = url;
}

// Redirigir a módulo de edición
function redirigirAEditarProducto(id) {
    if (!id) {
        console.error('❌ ID no proporcionado para editar producto');
        return;
    }
    
    console.log(`✏️ Redirigiendo a editar producto ID: ${id}`);
    
    // Verificar si ya estamos en la página correcta con el mismo ID
    const currentParams = new URLSearchParams(window.location.search);
    const currentId = currentParams.get('id');
    
    if (currentId === id && window.location.pathname.includes('nuevo-producto')) {
        console.log('ℹ️ Ya estamos editando este producto');
        return;
    }
    
    // Redirigir con ID como parámetro
    const url = `/vista/nav-mesa-admin/e-comerce/nuevo-producto/nuevo-producto.html?id=${encodeURIComponent(id)}`;
    console.log('↪️ Redirigiendo a:', url);
    window.location.href = url;
}

// Reemplazar función showAddModal existente
function showAddModal() {
    redirigirANuevoProducto();
}

// Reemplazar función editarProducto existente
function editarProducto(id) {
    redirigirAEditarProducto(id);
}

// Función para probar la redirección
function probarRedireccion() {
    console.log('🧪 Probando redirecciones...');
    console.log('1. Redirigir a nuevo producto:', redirigirANuevoProducto);
    console.log('2. Redirigir a editar producto:', redirigirAEditarProducto);
}
// Eliminar producto con confirmación
async function eliminarProducto(id, nombre) {
    if (!id) {
        console.error('❌ ID no proporcionado para eliminar producto');
        Swal.fire('Error', 'No se proporcionó el ID del producto', 'error');
        return;
    }

    // Mostrar confirmación con SweetAlert2
    const result = await Swal.fire({
        title: `¿Eliminar producto?`,
        html: `¿Estás seguro de que quieres eliminar el producto <strong>"${escapeHtml(nombre)}"</strong>?<br><br>
               <small><i class="fas fa-exclamation-triangle"></i> Esta acción no se puede deshacer</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        reverseButtons: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                // 1. Eliminar de la colección Productos
                await db.collection("Productos").doc(id).delete();
                
                // 2. Verificar si está en indexproductos y eliminarlo si existe
                const indexRef = db.collection("indexproductos");
                const indexQuery = await indexRef.where("productId", "==", id).get();
                
                if (!indexQuery.empty) {
                    const deletePromises = indexQuery.docs.map(doc => doc.ref.delete());
                    await Promise.all(deletePromises);
                }
                
                // 3. Eliminar imágenes del Storage si existen
                try {
                    // Obtener el producto para verificar si tiene imágenes
                    const productoRef = db.collection("Productos").doc(id);
                    const productoSnapshot = await productoRef.get();
                    
                    if (productoSnapshot.exists) {
                        const productoData = productoSnapshot.data();
                        if (productoData.Imagenes && productoData.Imagenes.length > 0) {
                            const storage = firebase.storage();
                            const deleteImagePromises = productoData.Imagenes.map(imgUrl => {
                                try {
                                    // Extraer el path del URL de Firebase Storage
                                    const imgPath = decodeURIComponent(imgUrl.split('/o/')[1].split('?')[0]);
                                    const imageRef = storage.ref().child(imgPath);
                                    return imageRef.delete();
                                } catch (error) {
                                    console.warn(`No se pudo eliminar imagen: ${imgUrl}`, error);
                                    return Promise.resolve();
                                }
                            });
                            
                            await Promise.allSettled(deleteImagePromises);
                        }
                    }
                } catch (storageError) {
                    console.warn("Error al eliminar imágenes del storage:", storageError);
                    // Continuar aunque falle la eliminación de imágenes
                }
                
                return { success: true };
            } catch (error) {
                console.error("Error eliminando producto:", error);
                throw new Error(`Error al eliminar: ${error.message}`);
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    });

    if (result.isConfirmed) {
        if (result.value?.success) {
            // Mostrar éxito
            Swal.fire({
                title: '¡Eliminado!',
                text: `El producto "${escapeHtml(nombre)}" ha sido eliminado correctamente.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                // Actualizar cache
                appState.cacheProductos = appState.cacheProductos.filter(p => p.id !== id);
                
                // Actualizar estadísticas
                cargarEstadisticas();
                
                // Recargar la vista actual
                if (appState.searchTerm || appState.filterCategoria !== 'todas' || appState.filterDescuento !== 'todos') {
                    filtrarYMostrarProductos();
                } else {
                    cargarProductos();
                }
            });
        } else {
            Swal.fire(
                'Error',
                'Hubo un problema al eliminar el producto. Intenta nuevamente.',
                'error'
            );
        }
    } else {
        // Si se cancela
        console.log('❌ Eliminación cancelada por el usuario');
    }
}
// Hacer funciones disponibles globalmente
window.showAddModal = showAddModal;
window.closeModal = closeModal;
window.calcularPrecioFinal = calcularPrecioFinal;
window.handleImages = handleImages;
window.deleteImage = deleteImage;
window.toggleDiscountOptions = toggleDiscountOptions;
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;
window.toggleIndex = toggleIndex;
window.ampliarImagen = ampliarImagen;
window.cargarProductos = cargarProductos;
window.resetFilters = resetFilters;