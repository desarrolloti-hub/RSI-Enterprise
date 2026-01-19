// admin-editar-categoria.js
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
        const categoriaId = urlParams.get('id');

        if (!categoriaId) {
            Swal.fire('Error', 'No se especificó una categoría para editar', 'error')
                .then(() => window.location.href = "../categorias/categorias.html");
            return;
        }

        // Elementos DOM
        const nombreInput = document.getElementById("nombreCategoria");
        const imagenActualImg = document.getElementById("imagen-actual");
        const contenedorImagen = document.getElementById("imagen-actual-container");
        const btnEliminarImagen = document.getElementById("eliminar-imagen");
        const inputNuevaImagen = document.getElementById("imagenCategoria");
        const form = document.getElementById("editar-categoria-form");
        const btnGuardar = document.getElementById("btn-guardar");

        // 1. Cargar Datos
        async function cargarCategoria() {
            try {
                const docSnap = await db.collection("categorias").doc(categoriaId).get();

                if (!docSnap.exists) {
                    Swal.fire('Error', 'La categoría no existe', 'error')
                        .then(() => window.location.href = ".../categorias/categorias.html");
                    return;
                }

                const data = docSnap.data();
                nombreInput.value = data.nombre;

                // Mostrar imagen
                if (data.imagen) {
                    imagenActualImg.src = data.imagen;
                    contenedorImagen.style.display = "block";
                } else {
                    contenedorImagen.style.display = "none";
                }

                // Verificar productos asociados
                verificarProductosAsociados(data.nombre);

            } catch (error) {
                console.error("Error cargando categoría:", error);
                Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
            }
        }

        async function verificarProductosAsociados(nombreCategoria) {
            try {
                const productosSnap = await db.collection("Productos")
                    .where("Categoria", "==", nombreCategoria)
                    .get();

                if (!productosSnap.empty) {
                    nombreInput.disabled = true;
                    const alert = document.createElement('div');
                    alert.className = 'alert alert-warning mt-2 small';
                    alert.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No puedes cambiar el nombre porque hay productos asociados. Solo puedes cambiar la imagen.';
                    nombreInput.parentNode.after(alert);
                }
            } catch (error) {
                console.error("Error verificando productos:", error);
            }
        }

        // 2. Eliminar Imagen
        btnEliminarImagen.addEventListener("click", async () => {
            const confirm = await Swal.fire({
                title: '¿Eliminar imagen?',
                text: "La imagen se borrará inmediatamente.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminar'
            });

            if (confirm.isConfirmed) {
                try {
                    await db.collection("categorias").doc(categoriaId).update({ imagen: null });
                    imagenActualImg.src = "";
                    contenedorImagen.style.display = "none";
                    Swal.fire('Eliminada', 'La imagen ha sido eliminada', 'success');
                } catch (error) {
                    console.error(error);
                    Swal.fire('Error', 'No se pudo eliminar la imagen', 'error');
                }
            }
        });

        // 3. Guardar Cambios
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const btnOriginal = btnGuardar.innerHTML;
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

            try {
                const nombre = nombreInput.value.trim();
                const archivo = inputNuevaImagen.files[0];
                
                const updateData = {};
                
                // Solo actualizar nombre si no está deshabilitado
                if (!nombreInput.disabled) {
                    updateData.nombre = nombre;
                }

                // Procesar nueva imagen si existe
                if (archivo) {
                    // Validar tamaño (ej: 1MB)
                    if (archivo.size > 1024 * 1024) {
                        throw new Error("La imagen es demasiado grande. Máximo 1MB.");
                    }
                    updateData.imagen = await toBase64(archivo);
                }

                if (Object.keys(updateData).length > 0) {
                    await db.collection("categorias").doc(categoriaId).update(updateData);
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Actualizado',
                        text: 'Categoría guardada correctamente',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = "../categorias/categorias.html";
                    });
                } else {
                    Swal.fire('Info', 'No hubo cambios para guardar', 'info');
                }

            } catch (error) {
                console.error(error);
                Swal.fire('Error', error.message || 'Error al guardar', 'error');
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = btnOriginal;
            }
        });

        // Helper Base64
        const toBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });

        // Iniciar
        cargarCategoria();
    };

    initPage();
})();