// admin-nueva-categoria.js
(function() {
    'use strict';

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        
        // Elementos DOM
        const form = document.getElementById("registro-categoria-form");
        const nombreInput = document.getElementById("nombreCategoria");
        const imagenInput = document.getElementById("imagenCategoria");
        const btnGuardar = document.getElementById("btn-guardar");

        // Helper: Convertir a Base64
        const toBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });

        // Evento Submit
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nombre = nombreInput.value.trim();
            const archivo = imagenInput.files[0];

            if (!nombre || !archivo) {
                Swal.fire('Error', 'Todos los campos son obligatorios', 'warning');
                return;
            }

            // Validar tamaño imagen (Máx 1MB para no saturar Firestore)
            if (archivo.size > 1024 * 1024) {
                Swal.fire('Imagen muy pesada', 'Por favor usa una imagen menor a 1MB', 'warning');
                return;
            }

            // UI Loading
            const btnOriginal = btnGuardar.innerHTML;
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

            try {
                // 1. Convertir imagen
                const imagenBase64 = await toBase64(archivo);

                // 2. Guardar en Firestore
                await db.collection("categorias").add({
                    nombre: nombre,
                    imagen: imagenBase64,
                    fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 3. Éxito
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: 'Categoría registrada correctamente',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = "../categorias/categorias.html";
                });

                form.reset();

            } catch (error) {
                console.error("Error:", error);
                Swal.fire('Error', 'No se pudo registrar la categoría', 'error');
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = btnOriginal;
            }
        });
    };

    initPage();
})();