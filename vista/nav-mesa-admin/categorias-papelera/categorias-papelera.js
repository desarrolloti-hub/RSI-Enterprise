// admin-categorias-papelera.js
(function() {
    'use strict';

    const initPage = () => {
        // Verificar carga de Firebase
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        const listaPapelera = document.getElementById("categorias-papelera-lista");

        // 1. Cargar datos
        async function cargarPapelera() {
            try {
                const snapshot = await db.collection("categoriasPapelera").get();
                
                listaPapelera.innerHTML = "";

                if (snapshot.empty) {
                    listaPapelera.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center p-4 text-muted">La papelera está vacía.</td>
                        </tr>`;
                    return;
                }

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    // Formatear fecha si existe
                    let fechaEliminado = "Desconocida";
                    if (data.eliminado) {
                        try {
                            const dateObj = new Date(data.eliminado);
                            fechaEliminado = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
                        } catch(e) { fechaEliminado = data.eliminado; }
                    }

                    const row = `
                        <tr>
                            <td class="align-middle">${doc.id}</td>
                            <td class="align-middle fw-bold">${data.nombre}</td>
                            <td class="align-middle">
                                ${data.imagen 
                                    ? `<img src="${data.imagen}" class="imagen-categoria" alt="${data.nombre}">` 
                                    : '<span class="badge bg-secondary">Sin imagen</span>'}
                            </td>
                            <td class="align-middle small">${fechaEliminado}</td>
                            <td class="align-middle">
                                <button class="btn btn-sm btn-outline-success btn-recuperar" data-id="${doc.id}" title="Restaurar">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger btn-eliminar-perm" data-id="${doc.id}" title="Eliminar para siempre">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    listaPapelera.innerHTML += row;
                });

                asignarEventos();

            } catch (error) {
                console.error("Error cargando papelera:", error);
                listaPapelera.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Error al cargar datos.</td></tr>`;
            }
        }

        function asignarEventos() {
            // Botones Recuperar
            document.querySelectorAll(".btn-recuperar").forEach(btn => {
                btn.addEventListener("click", () => restaurarCategoria(btn.dataset.id));
            });

            // Botones Eliminar Permanente
            document.querySelectorAll(".btn-eliminar-perm").forEach(btn => {
                btn.addEventListener("click", () => eliminarPermanentemente(btn.dataset.id));
            });
        }

        // 2. Restaurar (Mover de Papelera -> Categorías)
        async function restaurarCategoria(id) {
            try {
                // Confirmación visual rápida
                const confirmFn = window.showCustomConfirm || Swal.fire;
                const result = await (window.showCustomConfirm 
                    ? window.showCustomConfirm("¿Restaurar?", "La categoría volverá a estar activa.") 
                    : Swal.fire({title: "¿Restaurar?", showCancelButton: true, icon: "question"}));

                if (!result.isConfirmed) return;

                const papeleraRef = db.collection("categoriasPapelera").doc(id);
                const docSnap = await papeleraRef.get();

                if (docSnap.exists) {
                    const data = docSnap.data();
                    // Eliminar la marca de tiempo de eliminación al restaurar
                    delete data.eliminado; 

                    // Transacción manual: Copiar a 'categorias' -> Borrar de 'categoriasPapelera'
                    await db.collection("categorias").doc(id).set(data);
                    await papeleraRef.delete();

                    const successFn = window.showCustomSuccess || Swal.fire;
                    successFn("Restaurada", "La categoría está activa nuevamente.", "success");
                    
                    cargarPapelera();
                }
            } catch (error) {
                console.error(error);
                const errorFn = window.showCustomError || Swal.fire;
                errorFn("Error", "No se pudo restaurar la categoría.");
            }
        }

        // 3. Eliminar Permanentemente
        async function eliminarPermanentemente(id) {
            try {
                const confirmFn = window.showCustomConfirm || Swal.fire;
                const result = await (window.showCustomConfirm 
                    ? window.showCustomConfirm("¿Eliminar Definitivamente?", "Esta acción NO se puede deshacer.", "Eliminar", "Cancelar") 
                    : Swal.fire({title: "¿Eliminar?", text: "Irreversible", icon: "warning", showCancelButton: true, confirmButtonColor: "#d33"}));

                if (!result.isConfirmed) return;

                await db.collection("categoriasPapelera").doc(id).delete();

                const successFn = window.showCustomSuccess || Swal.fire;
                successFn("Eliminado", "La categoría fue borrada permanentemente.", "success");
                
                cargarPapelera();

            } catch (error) {
                console.error(error);
                const errorFn = window.showCustomError || Swal.fire;
                errorFn("Error", "No se pudo eliminar la categoría.");
            }
        }

        // Iniciar
        cargarPapelera();
    };

    initPage();
})();