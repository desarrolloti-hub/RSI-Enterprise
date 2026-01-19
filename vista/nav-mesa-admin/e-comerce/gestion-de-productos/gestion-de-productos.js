// gestion-de-productos.js

// 1. CONFIGURACIÓN DE FIREBASE (Conexión directa)
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
};

// Inicializar Firebase si no se ha hecho
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Estado Global de la aplicación
let products = [];
let filteredProducts = [];
let categories = [];
let currentPage = 1;
const itemsPerPage = 10;

// 2. INICIALIZACIÓN Y CARGA DE DATOS
document.addEventListener('DOMContentLoaded', async () => {
    renderLoading(); // Mostrar spinner mientras carga
    try {
        await loadCategories();
        await loadProducts();
    } catch (error) {
        console.error("Error en el arranque del sistema:", error);
    }
});

// Función para mostrar el Spinner de carga en la tabla
function renderLoading() {
    const tbody = document.getElementById("productsBody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 50px;">
                    <div class="spinner"></div>
                    <p style="margin-top: 15px; opacity: 0.7;">Recolectando datos de la nube...</p>
                </td>
            </tr>
        `;
    }
}

// Cargar categorías de la colección "categorias"
async function loadCategories() {
    const snap = await db.collection("categorias").get();
    categories = snap.docs.map(doc => doc.data().nombre);
}

// Cargar productos de la colección "Productos"
async function loadProducts() {
    const snap = await db.collection("Productos").get();
    products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    filteredProducts = [...products];
    renderTable();
}

// 3. LÓGICA DEL BUSCADOR (CORREGIDA)
window.filterProducts = function() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

    if (searchTerm === "") {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(p => {
            // Buscador "Deep Search" en todas las propiedades clave
            return (
                (p["Nombre Producto"] && p["Nombre Producto"].toLowerCase().includes(searchTerm)) ||
                (p.Categoria && p.Categoria.toLowerCase().includes(searchTerm)) ||
                (p.Marca && p.Marca.toLowerCase().includes(searchTerm)) ||
                (p.Modelo && p.Modelo.toLowerCase().includes(searchTerm)) ||
                (p.SKU && p.SKU.toLowerCase().includes(searchTerm))
            );
        });
    }

    currentPage = 1; // Reiniciar a la primera página al buscar
    renderTable();
};

// 4. RENDERIZADO DE LA TABLA (CON COLORES PERSONALIZADOS)
function renderTable() {
    const tbody = document.getElementById("productsBody");
    if (!tbody) return;

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filteredProducts.slice(start, start + itemsPerPage);

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 20px;">No se encontraron resultados para la búsqueda.</td></tr>`;
        return;
    }

    tbody.innerHTML = paginated.map(p => {
        const precio = parseFloat(p["Precio MXN"]) || 0;
        const desc = parseFloat(p.Descuento) || 0;
        const final = precio * (1 - desc / 100);

        return `
            <tr>
                <td><strong>${p["Nombre Producto"] || 'S/N'}</strong></td>
                <td>${p.Categoria || 'General'}</td>
                <td>$${precio.toFixed(2)}</td>
                <td><span class="badge-primary" style="background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem;">${desc}%</span></td>
                <td style="color: var(--primary-color)"><strong>$${final.toFixed(2)}</strong></td>
                <td>${p.Marca || '-'}</td>
                <td>${p.Modelo || '-'}</td>
                <td><small>${p.SKU || '-'}</small></td>
                <td class="action-icons">
                    <button class="action-btn" title="Editar" onclick="openProductForm('${p.id}')" style="color: var(--primary-color); background:none; border:none; cursor:pointer;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" title="Eliminar" onclick="deleteProduct('${p.id}')" style="color: var(--accent-color); background:none; border:none; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Actualizar indicador de paginación
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    document.getElementById("pageNumber").textContent = `Página ${currentPage} de ${totalPages || 1}`;
}

// 5. FUNCIONALIDADES ORIGINALES: FORMULARIO Y DESCUENTOS
// Función para calcular precio final en tiempo real dentro del Swal
window.updateFinalPrice = function() {
    const p = parseFloat(document.getElementById('sw-price').value) || 0;
    const d = parseFloat(document.getElementById('sw-disc').value) || 0;
    const final = p * (1 - d / 100);
    document.getElementById('sw-final').value = final.toFixed(2);
};

window.openProductForm = async function(id = null) {
    const isEdit = !!id;
    const p = isEdit ? products.find(prod => prod.id === id) : {};

    const { value: formValues } = await Swal.fire({
        title: isEdit ? 'Editar Producto' : 'Nuevo Producto',
        width: '800px',
        html: `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; text-align:left;">
                <div>
                    <label>Nombre del Producto</label><input id="sw-name" class="swal2-input" value="${p["Nombre Producto"] || ''}">
                    <label>Precio MXN</label><input id="sw-price" type="number" class="swal2-input" oninput="updateFinalPrice()" value="${p["Precio MXN"] || ''}">
                    <label>Descuento (%)</label><input id="sw-disc" type="number" class="swal2-input" oninput="updateFinalPrice()" value="${p.Descuento || 0}">
                    <label>Precio Final Estimado</label><input id="sw-final" class="swal2-input" readonly value="0.00">
                </div>
                <div>
                    <label>Categoría</label>
                    <select id="sw-cat" class="swal2-input">
                        ${categories.map(c => `<option value="${c}" ${p.Categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                    <label>Marca</label><input id="sw-brand" class="swal2-input" value="${p.Marca || ''}">
                    <label>Modelo</label><input id="sw-model" class="swal2-input" value="${p.Modelo || ''}">
                    <label>SKU</label><input id="sw-sku" class="swal2-input" value="${p.SKU || ''}">
                </div>
                <div style="grid-column: span 2;">
                    <label>Acción Masiva de Descuento:</label>
                    <select id="sw-apply-to" class="swal2-input">
                        <option value="single">Aplicar solo a este producto</option>
                        <option value="category">Aplicar este % a toda la categoría</option>
                    </select>
                </div>
            </div>
        `,
        didOpen: () => updateFinalPrice(),
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        preConfirm: () => {
            const data = {
                "Nombre Producto": document.getElementById('sw-name').value,
                "Precio MXN": parseFloat(document.getElementById('sw-price').value) || 0,
                "Descuento": parseFloat(document.getElementById('sw-disc').value) || 0,
                "Categoria": document.getElementById('sw-cat').value,
                "Marca": document.getElementById('sw-brand').value,
                "Modelo": document.getElementById('sw-model').value,
                "SKU": document.getElementById('sw-sku').value,
                "ApplyTo": document.getElementById('sw-apply-to').value,
                "_timestamp": Date.now()
            };
            if (!data["Nombre Producto"]) return Swal.showValidationMessage('El nombre es obligatorio');
            return data;
        }
    });

    if (formValues) {
        const { ApplyTo, ...productData } = formValues;
        
        try {
            // Guardar producto
            if (isEdit) {
                await db.collection("Productos").doc(id).update(productData);
            } else {
                await db.collection("Productos").add(productData);
            }

            // Aplicar descuento masivo si se seleccionó
            if (ApplyTo === 'category') {
                const batch = db.batch();
                const categoryItems = await db.collection("Productos").where("Categoria", "==", productData.Categoria).get();
                categoryItems.forEach(doc => {
                    batch.update(doc.ref, { "Descuento": productData.Descuento });
                });
                await batch.commit();
            }

            // Usar alerta de éxito del script de colores
            if (window.showCustomSuccess) window.showCustomSuccess('¡Éxito!', 'Base de datos sincronizada');
            else Swal.fire('¡Éxito!', 'Base de datos sincronizada', 'success');
            
            loadProducts();
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    }
};

// 6. ELIMINAR (Usando confirmación personalizada)
window.deleteProduct = async function(id) {
    const res = await window.showCustomConfirm('¿Eliminar producto?', 'Esta acción borrará el registro permanentemente.');
    if (res.isConfirmed) {
        await db.collection("Productos").doc(id).delete();
        loadProducts();
        window.showCustomSuccess('Eliminado', 'El producto ha sido removido');
    }
};

// 7. PAGINACIÓN
window.nextPage = () => { 
    if ((currentPage * itemsPerPage) < filteredProducts.length) { 
        currentPage++; 
        renderTable(); 
    } 
};

window.previousPage = () => { 
    if (currentPage > 1) { 
        currentPage--; 
        renderTable(); 
    } 
};