// editar-producto.js

// 1. Obtener el ID del producto de la URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
    window.location.href = "../gestion-de-productos/gestion-de-productos.html";
}

// 2. Cargar datos del producto al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const doc = await db.collection("Productos").doc(productId).get();
        if (doc.exists) {
            const data = doc.data();
            // Llenar todos los campos del formulario
            document.getElementById('nombre').value = data["Nombre Producto"];
            document.getElementById('precio').value = data["Precio MXN"];
            document.getElementById('descuento').value = data.Descuento;
            document.getElementById('sku').value = data.SKU;
            document.getElementById('marca').value = data.Marca;
            document.getElementById('modelo').value = data.Modelo;
            document.getElementById('categoria').value = data.Categoria;
            document.getElementById('especificaciones').value = data.Especificaciones;
            
            // Mostrar imágenes si existen
            renderImagePreviews(data.Imagenes || []);
        }
    } catch (error) {
        console.error("Error al obtener producto:", error);
    }
});

// 3. Función para Guardar Cambios
async function updateProduct(e) {
    e.preventDefault();
    const newData = {
        "Nombre Producto": document.getElementById('nombre').value,
        "Precio MXN": parseFloat(document.getElementById('precio').value),
        "Descuento": parseFloat(document.getElementById('descuento').value),
        // ... recolectar el resto de campos
        "_timestamp": Date.now()
    };

    await db.collection("Productos").doc(productId).update(newData);
    window.showCustomSuccess('Actualizado', 'Producto guardado correctamente');
    setTimeout(() => window.location.href = "../gestion-de-productos/gestion-de-productos.html", 1500);
}