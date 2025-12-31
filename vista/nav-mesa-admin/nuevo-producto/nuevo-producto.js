// admin-registro-producto.js
(function() {
    'use strict';

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        
        // Elementos DOM
        const form = document.getElementById("registro-producto-form");
        const selectCategoria = document.getElementById("categoria");
        const imageContainer = document.getElementById("image-container");
        const addImageBtn = document.getElementById("add-image-btn");
        const fileInput = document.getElementById("file-input");
        const btnGuardar = document.getElementById("btn-guardar");
        
        let imagenes = []; // Array de Base64

        // 1. Cargar Categorías Dinámicamente
        async function cargarCategorias() {
            try {
                const snapshot = await db.collection("categorias").orderBy("nombre").get();
                
                if (snapshot.empty) {
                    // Fallback si no hay categorías en BD
                    const opcionesDefault = ["CCTV", "Alarma intrusion", "Multimedia", "Control de Acceso"];
                    opcionesDefault.forEach(cat => {
                        const option = document.createElement("option");
                        option.value = cat;
                        option.textContent = cat;
                        selectCategoria.appendChild(option);
                    });
                } else {
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const option = document.createElement("option");
                        option.value = data.nombre; // Usamos el nombre como valor (según tu DB actual)
                        option.textContent = data.nombre;
                        selectCategoria.appendChild(option);
                    });
                }
            } catch (error) {
                console.error("Error cargando categorías:", error);
            }
        }

        // 2. Gestión de Imágenes
        function renderizarImagenes() {
            imageContainer.innerHTML = "";
            
            if (imagenes.length === 0) {
                imageContainer.innerHTML = '<p class="text-muted small fst-italic w-100 text-center m-0 py-4">No hay imágenes seleccionadas</p>';
                return;
            }

            imagenes.forEach((src, index) => {
                const wrapper = document.createElement("div");
                wrapper.className = "img-thumbnail-wrapper position-relative";
                
                wrapper.innerHTML = `
                    <img src="${src}" class="img-fluid rounded" alt="Preview ${index + 1}">
                    <button type="button" class="btn-remove-img" data-index="${index}" title="Eliminar">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                imageContainer.appendChild(wrapper);
            });

            // Asignar eventos de eliminar
            document.querySelectorAll(".btn-remove-img").forEach(btn => {
                btn.addEventListener("click", () => {
                    imagenes.splice(parseInt(btn.dataset.index), 1);
                    renderizarImagenes();
                    verificarLimiteImagenes();
                });
            });
            
            verificarLimiteImagenes();
        }

        function verificarLimiteImagenes() {
            addImageBtn.style.display = imagenes.length >= 3 ? 'none' : 'inline-block';
        }

        // Agregar Nueva Imagen
        addImageBtn.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 1024 * 1024) { // 1MB límite
                Swal.fire('Imagen muy pesada', 'Máximo 1MB por imagen', 'warning');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                imagenes.push(reader.result);
                renderizarImagenes();
                fileInput.value = ""; 
            };
            reader.readAsDataURL(file);
        });

        // 3. Guardar Producto
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            // Validaciones extra
            if (imagenes.length === 0) {
                const confirm = await Swal.fire({
                    title: '¿Sin imágenes?',
                    text: "Estás registrando el producto sin imágenes. ¿Continuar?",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, guardar',
                    cancelButtonText: 'No, agregar imagen'
                });
                if (!confirm.isConfirmed) return;
            }

            const btnOriginal = btnGuardar.innerHTML;
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

            try {
                const producto = {
                    "Nombre Producto": document.getElementById("nombreProducto").value.trim(),
                    Categoria: document.getElementById("categoria").value,
                    Marca: document.getElementById("marca").value.trim(),
                    Modelo: document.getElementById("modelo").value.trim(),
                    "Precio MXN": parseFloat(document.getElementById("precio").value),
                    SKU: document.getElementById("sku").value.trim(),
                    Tipo: document.getElementById("tipo").value.trim(),
                    Estructura: document.getElementById("estructura").value.trim(),
                    "Link de producto": document.getElementById("linkProducto").value.trim(),
                    Especificaciones: document.getElementById("especificaciones").value.trim(),
                    Imagenes: imagenes,
                    FechaIngreso: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Guardar en Firestore
                await db.collection("Productos").add(producto);

                Swal.fire({
                    icon: "success",
                    title: "¡Éxito!",
                    text: "Producto registrado correctamente.",
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    // Opcional: Redirigir a lista o limpiar
                    form.reset();
                    imagenes = [];
                    renderizarImagenes();
                    window.scrollTo(0, 0);
                });

            } catch (error) {
                console.error("Error:", error);
                Swal.fire("Error", "No se pudo registrar el producto", "error");
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = btnOriginal;
            }
        });

        // Iniciar
        cargarCategorias();
    };

    initPage();
})();