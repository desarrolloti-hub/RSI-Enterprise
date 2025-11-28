// admin-categorias.js
(function() {
    'use strict';

    // Función de inicialización segura
    const initPage = () => {
        // Verificar que Firebase esté cargado por firebase-init.js
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100); // Reintentar en 100ms
            return;
        }

        const db = firebase.firestore();
        const categoriasLista = document.getElementById("categorias-lista");

        // 1. Cargar Categorías
        async function cargarCategorias() {
            try {
                const querySnapshot = await db.collection("categorias").get();
                
                categoriasLista.innerHTML = ""; // Limpiar tabla

                if (querySnapshot.empty) {
                    categoriasLista.innerHTML = `
                        <tr>
                            <td colspan="4" class="text-center p-4">No hay categorías registradas.</td>
                        </tr>`;
                    return;
                }

                querySnapshot.forEach((doc) => {
                    const categoria = doc.data();
                    // Usamos estilos de bootstrap + clases propias
                    const row = `
                        <tr>
                            <td class="align-middle">${doc.id}</td>
                            <td class="align-middle fw-bold">${categoria.nombre}</td>
                            <td class="align-middle">
                                ${categoria.imagen 
                                    ? `<img src="${categoria.imagen}" class="imagen-categoria" alt="${categoria.nombre}">` 
                                    : '<span class="badge bg-secondary">Sin imagen</span>'}
                            </td>
                            <td class="align-middle">
                                <button class="btn btn-sm btn-outline-primary btn-editar" data-id="${doc.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${doc.id}" data-nombre="${categoria.nombre}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    categoriasLista.innerHTML += row;
                });

                // Asignar eventos después de crear el HTML
                asignarEventos();

            } catch (error) {
                console.error("Error cargando categorías:", error);
                categoriasLista.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Error al cargar datos.</td></tr>`;
            }
        }

        function asignarEventos() {
            // Evento Editar
            document.querySelectorAll(".btn-editar").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const categoriaId = btn.dataset.id;
                    window.location.href = `../editar-categoria/editar-categoria.html?id=${categoriaId}`;
                });
            });

            // Evento Eliminar
            document.querySelectorAll(".btn-eliminar").forEach((btn) => {
                btn.addEventListener("click", () => manejarEliminacion(btn.dataset.id, btn.dataset.nombre));
            });
        }

        // 2. Lógica de Eliminación (Soft Delete)
        async function manejarEliminacion(id, nombre) {
            try {
                // A. Verificar si hay productos asociados
                const productosQuery = await db.collection("Productos")
                    .where("Categoria", "==", nombre)
                    .get();

                if (!productosQuery.empty) {
                    // Si hay productos, mostrar error
                    const alertFn = window.showCustomError || Swal.fire;
                    alertFn("No se puede eliminar", "Hay productos asociados a esta categoría.", "error");
                    return;
                }

                // B. Confirmar eliminación
                const confirmFn = window.showCustomConfirm || Swal.fire;
                const result = await (window.showCustomConfirm 
                    ? window.showCustomConfirm("¿Mover a papelera?", "La categoría se archivará.") 
                    : Swal.fire({
                        title: "¿Mover a papelera?",
                        text: "La categoría se archivará.",
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Sí, archivar"
                    }));

                if (result.isConfirmed) {
                    await moverAPapelera(id);
                }

            } catch (error) {
                console.error("Error en proceso de eliminación:", error);
                const alertFn = window.showCustomError || Swal.fire;
                alertFn("Error", "Hubo un problema al procesar la solicitud.", "error");
            }
        }

        async function moverAPapelera(id) {
            try {
                const categoriaRef = db.collection("categorias").doc(id);
                const docSnap = await categoriaRef.get();

                if (docSnap.exists) {
                    const data = docSnap.data();
                    data.eliminado = new Date().toISOString(); // Timestamp ISO

                    // 1. Copiar a papelera
                    await db.collection("categoriasPapelera").doc(id).set(data);
                    
                    // 2. Borrar de original
                    await categoriaRef.delete();

                    const successFn = window.showCustomSuccess || Swal.fire;
                    successFn("Archivado", "La categoría está en la papelera.", "success");
                    
                    cargarCategorias(); // Recargar tabla
                } else {
                    Swal.fire("Error", "La categoría no existe.", "error");
                }
            } catch (error) {
                console.error("Error moviendo a papelera:", error);
                Swal.fire("Error", "Fallo al mover a papelera.", "error");
            }
        }

        // Iniciar carga
        cargarCategorias();
    };

    // Arrancar script
    initPage();

})();