// admin-editar-producto.js
(function() {
    'use strict';

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        
        // Obtener ID de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const productoId = urlParams.get("id");

        if (!productoId) {
            Swal.fire('Error', 'No se especificó un producto para editar', 'error')
                .then(() => window.close()); // O redirigir a lista de productos
            return;
        }

        const productoRef = db.collection("Productos").doc(productoId);
        
        // Referencias DOM
        const form = document.getElementById("edit-form");
        const imageContainer = document.getElementById("image-container");
        const addImageBtn = document.getElementById("add-image-btn");
        const fileInput = document.getElementById("file-input");
        let imagenes = [];

        // 1. Cargar Producto
        async function cargarProducto() {
            try {
                const docSnap = await productoRef.get();
                
                if (!docSnap.exists) {
                    Swal.fire('Error', 'El producto no existe', 'error');
                    return;
                }

                const data = docSnap.data();
                
                // Llenar campos (Mapeo de nombres con espacios a IDs sin espacios)
                document.getElementById("nombreProducto").value = data["Nombre Producto"] || "";
                document.getElementById("marca").value = data.Marca || "";
                document.getElementById("modelo").value = data.Modelo || "";
                document.getElementById("precio").value = data["Precio MXN"] || "";
                document.getElementById("sku").value = data.SKU || "";
                document.getElementById("especificaciones").value = data.Especificaciones || "";
                document.getElementById("link").value = data["Link de producto"] || "";
                
                // Manejar Array de Imágenes
                imagenes = data.Imagenes || [];
                renderizarImagenes();

            } catch (error) {
                window.manejarErrorGlobal(error);
                Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
            }
        }

        // 2. Gestión de Imágenes
        function renderizarImagenes() {
            imageContainer.innerHTML = "";
            
            if (imagenes.length === 0) {
                imageContainer.innerHTML = '<p class="text-muted small fst-italic w-100 text-center">Sin imágenes asignadas</p>';
            }

            imagenes.forEach((src, index) => {
                const wrapper = document.createElement("div");
                wrapper.className = "img-thumbnail-wrapper position-relative";
                
                wrapper.innerHTML = `
                    <img src="${src}" class="img-fluid rounded" alt="Producto ${index + 1}">
                    <button type="button" class="btn-remove-img" data-index="${index}" title="Eliminar">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                imageContainer.appendChild(wrapper);
            });

            // Asignar eventos de eliminar
            document.querySelectorAll(".btn-remove-img").forEach(btn => {
                btn.addEventListener("click", () => eliminarImagen(parseInt(btn.dataset.index)));
            });

            // Ocultar botón de agregar si ya hay 3
            addImageBtn.style.display = imagenes.length >= 3 ? 'none' : 'inline-block';
        }

        async function eliminarImagen(index) {
            const result = await Swal.fire({
                title: '¿Eliminar imagen?',
                text: "Se quitará de la lista (debes guardar para confirmar cambios en BD)",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, quitar'
            });

            if (result.isConfirmed) {
                imagenes.splice(index, 1);
                renderizarImagenes();
            }
        }

        // Agregar Nueva Imagen (Lectura Local)
        addImageBtn.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validar tipo y tamaño
            if (!file.type.startsWith('image/')) {
                Swal.fire('Error', 'El archivo debe ser una imagen', 'error');
                return;
            }
            if (file.size > 2 * 1024 * 1024) { // 2MB límite
                Swal.fire('Error', 'La imagen es muy pesada (Máx 2MB)', 'warning');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                imagenes.push(reader.result); // Base64
                renderizarImagenes();
                fileInput.value = ""; // Limpiar input
            };
            reader.readAsDataURL(file);
        });

        // 3. Guardar Cambios
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

            try {
                const productoData = {
                    "Nombre Producto": document.getElementById("nombreProducto").value,
                    Marca: document.getElementById("marca").value,
                    Modelo: document.getElementById("modelo").value,
                    "Precio MXN": document.getElementById("precio").value,
                    SKU: document.getElementById("sku").value,
                    Especificaciones: document.getElementById("especificaciones").value,
                    "Link de producto": document.getElementById("link").value,
                    Imagenes: imagenes,
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                };

                await productoRef.update(productoData);

                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: 'Producto actualizado correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Opcional: Cerrar ventana o redirigir
                    // window.close(); 
                    // O recargar para ver cambios
                    location.reload(); 
                });

            } catch (error) {
                console.error("Error guardando:", error);
                Swal.fire('Error', 'Hubo un problema al actualizar el producto.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });

        // Iniciar
        cargarProducto();
    };

    initPage();
})();