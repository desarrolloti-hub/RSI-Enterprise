// gestion-de-productos.js

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
};

// Inicializar Firebase si no está inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

class ProductManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.categories = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filters = {
            category: '',
            brand: '',
            discount: ''
        };
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Inicializando ProductManager...');
            
            // Verificar conexión con Firebase
            await db.collection("categorias").limit(1).get();
            console.log('✅ Firebase conectado correctamente');
            
            await this.loadCategories();
            await this.loadProducts();
            this.setupEventListeners();
            this.updateStats();
        } catch (error) {
            console.error('❌ Error inicializando ProductManager:', error);
            this.showError('Error al conectar con la base de datos. Verifica tu conexión.');
        }
    }
    
    async loadCategories() {
        try {
            console.log('📂 Cargando categorías...');
            const snapshot = await db.collection("categoria").get();
            
            if (snapshot.empty) {
                console.log('⚠️ No se encontraron categorías, usando categorías por defecto');
                this.categories = ['CCTV', 'Alarma', 'Intrusión', 'Multimedia'];
            } else {
                this.categories = snapshot.docs.map(doc => doc.data().nombre);
                console.log(`✅ Categorías cargadas: ${this.categories.length}`);
            }
            
            this.updateCategoryFilters();
        } catch (error) {
            console.error("❌ Error cargando categorías:", error);
            this.categories = ['CCTV', 'Alarma', 'Intrusión', 'Multimedia'];
            this.updateCategoryFilters();
        }
    }
    
    async loadProducts() {
        try {
            console.log('📦 Cargando productos...');
            
            // Mostrar loader
            this.showLoading();
            
            // Obtener productos de Firestore
            const snapshot = await db.collection("indexproductos").get();
            
            console.log(`📊 Productos encontrados: ${snapshot.size}`);
            
            if (snapshot.empty) {
                console.log('ℹ️ No se encontraron productos');
                this.products = [];
                this.filteredProducts = [];
                this.renderTable();
                this.hideLoading();
                return;
            }
            
            // Convertir documentos a array de productos
            this.products = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    nombre: data["nombre"] || data.nombre || 'Sin nombre',
                    categoria: data.categoria || data.Categoria || 'Sin categoría',
                    precio: data["precio"] || data.precio || 0,
                    descuento: data.descuento || data.Descuento || 0,
                    marca: data.marca || 'Sin marca',
                    modelo: data.modelo || 'Sin modelo',
                    imagenes: data.imagenes || [],
                    sku: data.sku || '',
                    stock: data.stock || 0,
                    activo: data.activo !== false
                };
            });
            
            // Verificar qué productos están en el índice destacado
            await this.checkIndexedProducts();
            
            this.filteredProducts = [...this.products];
            
            console.log('✅ Productos cargados:', this.products.length);
            
            this.renderTable();
            this.updateStats();
            this.hideLoading();
            
        } catch (error) {
            console.error("❌ Error cargando productos:", error);
            this.showError('Error al cargar productos: ' + error.message);
            this.hideLoading();
        }
    }
    
    async checkIndexedProducts() {
        try {
            console.log('⭐ Verificando productos indexados...');
            const indexSnapshot = await db.collection("indexproductos").get();
            const indexedIds = indexSnapshot.docs.map(doc => doc.data().productId);
            
            // Marcar productos que están en el índice
            this.products.forEach(product => {
                product.inIndex = indexedIds.includes(product.id);
            });
            
            console.log(`✅ Productos en índice: ${indexedIds.length}`);
        } catch (error) {
            console.error("❌ Error verificando índice:", error);
        }
    }
    
    updateCategoryFilters() {
        const filterCategory = document.getElementById('filterCategory');
        if (!filterCategory) return;
        
        const options = '<option value="">Todas las categorías</option>' +
            this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        filterCategory.innerHTML = options;
    }
    
    renderTable() {
        const tbody = document.getElementById("productsBody");
        if (!tbody) {
            console.error('❌ No se encontró el elemento productsBody');
            return;
        }
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedProducts = this.filteredProducts.slice(start, end);
        
        if (paginatedProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-box-open" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                            <h3 style="color: #666; margin: 0;">No se encontraron productos</h3>
                            <p style="color: #888; margin: 10px 0 0;">Agrega tu primer producto haciendo clic en "Agregar Producto"</p>
                        </div>
                    </td>
                </tr>
            `;
            this.updatePagination();
            return;
        }
        
        tbody.innerHTML = paginatedProducts.map(product => this.createProductRow(product)).join('');
        this.updatePagination();
    }
    
    createProductRow(product) {
        const precioOriginal = parseFloat(product.precio) || 0;
        const descuento = parseFloat(product.descuento) || 0;
        const precioFinal = descuento > 0 ? (precioOriginal * (1 - descuento/100)) : precioOriginal;
        const hasImages = product.imagenes && product.imagenes.length > 0;
        
        return `
            <tr data-product-id="${product.id}">
                <td class="product-name">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <strong>${product.nombre}</strong>
                        ${product.inIndex ? '<span class="index-badge" style="background: gold; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;"><i class="fas fa-star"></i> Destacado</span>' : ''}
                    </div>
                </td>
                <td>
                    <span class="category-badge" style="background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                        ${product.categoria}
                    </span>
                </td>
                <td class="image-indicator">
                    <span class="${hasImages ? 'has-images' : 'no-images'}" 
                          style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 5px; background: ${hasImages ? '#e8f5e9' : '#ffebee'}; color: ${hasImages ? '#2e7d32' : '#c62828'};">
                        <i class="fas fa-${hasImages ? 'check-circle' : 'times-circle'}"></i>
                        ${hasImages ? product.imagenes.length : '0'}
                    </span>
                </td>
                <td class="price-cell">
                    ${descuento > 0 ? `
                        <div>
                            <span class="original-price" style="text-decoration: line-through; color: #888; font-size: 14px;">
                                $${precioOriginal.toFixed(2)}
                            </span>
                        </div>
                    ` : `
                        <span class="normal-price">$${precioOriginal.toFixed(2)}</span>
                    `}
                </td>
                <td>
                    ${descuento > 0 ? `
                        <span class="discount-badge" style="background: linear-gradient(135deg, #FF9800, #F57C00); color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                            -${descuento}%
                        </span>
                    ` : '<span class="no-discount" style="color: #666;">0%</span>'}
                </td>
                <td class="final-price">
                    <strong style="color: #4CAF50; font-size: 18px;">$${precioFinal.toFixed(2)}</strong>
                </td>
                <td>
                    <span class="brand-tag" style="background: #f3e5f5; color: #7b1fa2; padding: 4px 10px; border-radius: 4px; font-size: 14px;">
                        ${product.marca}
                    </span>
                </td>
                <td>
                    <code style="background: #f5f5f5; padding: 3px 8px; border-radius: 4px; font-family: monospace;">
                        ${product.modelo}
                    </code>
                </td>
                <td class="actions-cell" style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="btn-edit" onclick="productManager.editProduct('${product.id}')" style="background: #2196F3; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-delete" onclick="productManager.deleteProduct('${product.id}')" style="background: #f44336; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                    <button class="btn-toggle-index ${product.inIndex ? 'indexed' : ''}" 
                            onclick="productManager.toggleIndex('${product.id}')"
                            style="background: ${product.inIndex ? '#4CAF50' : '#9e9e9e'}; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-star"></i> ${product.inIndex ? 'Quitar' : 'Agregar'}
                    </button>
                </td>
            </tr>
        `;
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        
        const pageNumber = document.getElementById("pageNumber");
        const totalProducts = document.getElementById("totalProducts");
        const prevPage = document.getElementById("prevPage");
        const nextPage = document.getElementById("nextPage");
        
        if (pageNumber) {
            pageNumber.textContent = `Página ${this.currentPage}`;
        }
        
        if (totalProducts) {
            totalProducts.textContent = `de ${this.filteredProducts.length} productos`;
        }
        
        if (prevPage) {
            prevPage.disabled = this.currentPage === 1;
        }
        
        if (nextPage) {
            nextPage.disabled = this.currentPage === totalPages;
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
        }
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
        }
    }
    
    changeItemsPerPage() {
        const select = document.getElementById("itemsPerPage");
        if (select) {
            this.itemsPerPage = parseInt(select.value);
            this.currentPage = 1;
            this.renderTable();
        }
    }
    
    filterProducts() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        const query = searchInput.value.toLowerCase();
        
        this.filteredProducts = this.products.filter(product => {
            // Buscar en múltiples campos
            const searchFields = [
                product.nombre,
                product.categoria,
                product.marca,
                product.modelo,
                product.sku
            ].map(field => field ? field.toString().toLowerCase() : '');
            
            const matchesSearch = query === '' || 
                searchFields.some(field => field.includes(query));
            
            const matchesCategory = !this.filters.category || product.categoria === this.filters.category;
            const matchesBrand = !this.filters.brand || 
                (product.marca && product.marca.toLowerCase().includes(this.filters.brand.toLowerCase()));
            const matchesDiscount = !this.filters.discount || 
                (this.filters.discount === 'with' && parseFloat(product.descuento) > 0) ||
                (this.filters.discount === 'without' && (!product.descuento || parseFloat(product.descuento) === 0));
            
            return matchesSearch && matchesCategory && matchesBrand && matchesDiscount;
        });
        
        this.currentPage = 1;
        this.renderTable();
        this.updateStats();
    }
    
    showFilters() {
        const container = document.getElementById('filtersContainer');
        if (container) {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    applyFilters() {
        const categorySelect = document.getElementById('filterCategory');
        const brandInput = document.getElementById('filterBrand');
        const discountSelect = document.getElementById('filterDiscount');
        
        if (categorySelect && brandInput && discountSelect) {
            this.filters = {
                category: categorySelect.value,
                brand: brandInput.value,
                discount: discountSelect.value
            };
            
            this.filterProducts();
            
            // Cerrar filtros
            const container = document.getElementById('filtersContainer');
            if (container) {
                container.style.display = 'none';
            }
        }
    }
    
    clearFilters() {
        const categorySelect = document.getElementById('filterCategory');
        const brandInput = document.getElementById('filterBrand');
        const discountSelect = document.getElementById('filterDiscount');
        const searchInput = document.getElementById('searchInput');
        
        if (categorySelect) categorySelect.value = '';
        if (brandInput) brandInput.value = '';
        if (discountSelect) discountSelect.value = '';
        if (searchInput) searchInput.value = '';
        
        this.filters = {
            category: '',
            brand: '',
            discount: ''
        };
        
        this.filteredProducts = [...this.products];
        this.currentPage = 1;
        this.renderTable();
        this.updateStats();
    }
    
    updateStats() {
        const total = this.products.length;
        const indexed = this.products.filter(p => p.inIndex).length;
        const discounted = this.products.filter(p => parseFloat(p.descuento) > 0).length;
        const withImages = this.products.filter(p => p.imagenes && p.imagenes.length > 0).length;
        
        const totalStat = document.getElementById('totalProductsStat');
        const indexedStat = document.getElementById('indexedProductsStat');
        const discountedStat = document.getElementById('discountedProductsStat');
        const imagesStat = document.getElementById('productsWithImagesStat');
        
        if (totalStat) totalStat.textContent = total;
        if (indexedStat) indexedStat.textContent = indexed;
        if (discountedStat) discountedStat.textContent = discounted;
        if (imagesStat) imagesStat.textContent = withImages;
    }
    
    editProduct(id) {
        // Redirigir a la página de edición con el ID del producto
        window.location.href = `nuevo-producto/nuevo-producto.html?edit=${id}`;
    }
    
    async deleteProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;
        
        const result = await Swal.fire({
            title: '¿Eliminar producto?',
            html: `¿Estás seguro de eliminar <strong>${product.nombre}</strong>?<br>
                  Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        });
        
        if (result.isConfirmed) {
            try {
                // Mostrar loader
                Swal.fire({
                    title: 'Eliminando...',
                    text: 'Por favor espera',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                
                // Eliminar del índice de productos
                await db.collection("indexproductos").doc(id).delete();
                
                // También eliminar del índice destacado si está ahí
                const indexQuery = await db.collection("indexproductos")
                    .where("productId", "==", id)
                    .get();
                
                if (!indexQuery.empty) {
                    const batch = db.batch();
                    indexQuery.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                }
                
                // Recargar productos
                await this.loadProducts();
                
                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'Producto eliminado correctamente',
                    icon: 'success',
                    timer: 2000
                });
                
            } catch (error) {
                console.error("❌ Error eliminando producto:", error);
                Swal.fire({
                    title: 'Error',
                    text: 'Error al eliminar producto: ' + error.message,
                    icon: 'error'
                });
            }
        }
    }
    
    async toggleIndex(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;
        
        const isIndexed = product.inIndex;
        
        try {
            if (isIndexed) {
                // Eliminar del índice destacado
                const querySnapshot = await db.collection("indexproductos")
                    .where("productId", "==", id)
                    .get();
                
                if (!querySnapshot.empty) {
                    const batch = db.batch();
                    querySnapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                }
                
                product.inIndex = false;
                
                Swal.fire({
                    title: '¡Quitado!',
                    text: 'Producto quitado del índice destacado',
                    icon: 'success',
                    timer: 1500
                });
            } else {
                // Agregar al índice destacado
                await db.collection("indexproductos").add({
                    productId: id,
                    nombre: product.nombre,
                    categoria: product.categoria,
                    precio: product.precio,
                    descuento: product.descuento,
                    marca: product.marca,
                    modelo: product.modelo,
                    imagenes: product.imagenes,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                product.inIndex = true;
                
                Swal.fire({
                    title: '¡Agregado!',
                    text: 'Producto agregado al índice destacado',
                    icon: 'success',
                    timer: 1500
                });
            }
            
            this.renderTable();
            this.updateStats();
            
        } catch (error) {
            console.error("❌ Error modificando índice:", error);
            Swal.fire({
                title: 'Error',
                text: 'Error al modificar índice: ' + error.message,
                icon: 'error'
            });
        }
    }
    
    showLoading() {
        const tbody = document.getElementById("productsBody");
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div style="text-align: center; padding: 40px;">
                            <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #6C43E0; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                            <p style="color: #666;">Cargando productos...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    hideLoading() {
        // El spinner se reemplaza cuando se renderizan los productos
    }
    
    showError(message) {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            confirmButtonText: 'Reintentar',
            showCancelButton: true,
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.loadProducts();
            }
        });
    }
    
    setupEventListeners() {
        // Buscador
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterProducts();
            });
        }
        
        // Filtros
        const filterCategory = document.getElementById('filterCategory');
        const filterBrand = document.getElementById('filterBrand');
        const filterDiscount = document.getElementById('filterDiscount');
        
        if (filterCategory) {
            filterCategory.addEventListener('change', () => {
                this.filterProducts();
            });
        }
        
        if (filterBrand) {
            filterBrand.addEventListener('input', () => {
                this.filterProducts();
            });
        }
        
        if (filterDiscount) {
            filterDiscount.addEventListener('change', () => {
                this.filterProducts();
            });
        }
        
        // Items por página
        const itemsPerPage = document.getElementById('itemsPerPage');
        if (itemsPerPage) {
            itemsPerPage.addEventListener('change', () => {
                this.changeItemsPerPage();
            });
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, inicializando ProductManager...');
    window.productManager = new ProductManager();
});

// Funciones globales para los botones
window.previousPage = () => {
    if (window.productManager) window.productManager.previousPage();
};

window.nextPage = () => {
    if (window.productManager) window.productManager.nextPage();
};

window.changeItemsPerPage = () => {
    if (window.productManager) window.productManager.changeItemsPerPage();
};

window.showFilters = () => {
    if (window.productManager) window.productManager.showFilters();
};

window.applyFilters = () => {
    if (window.productManager) window.productManager.applyFilters();
};

window.clearFilters = () => {
    if (window.productManager) window.productManager.clearFilters();
};