// admin-opiniones.js
(function() {
    'use strict';

    const initPage = () => {
        // Verificar carga de Firebase
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        const opinionesContainer = document.getElementById("comOpiniones");
        const promedioDisplay = document.getElementById("comCalificacionPromedio");
        const estrellasDisplay = document.getElementById("estrellas-promedio");

        // Función para evitar XSS
        function escapeHtml(text) {
            if (!text) return "";
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Cargar Opiniones
        async function cargarOpiniones() {
            try {
                // Sintaxis v8 compatible
                const querySnapshot = await db.collection("comentarios")
                    .orderBy('fecha', 'desc')
                    .get();
                
                let totalCalificacion = 0;
                let cantidad = 0;
                opinionesContainer.innerHTML = "";

                if (querySnapshot.empty) {
                    opinionesContainer.innerHTML = `
                        <div class="col-12 text-center p-5 card w-100">
                            <p class="text-muted mb-0">No hay comentarios registrados aún.</p>
                        </div>`;
                    promedioDisplay.innerText = "0.0";
                    estrellasDisplay.innerHTML = "☆☆☆☆☆";
                    return;
                }

                let opinionesHTML = "";

                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    const calificacion = data.calificacion || 0;
                    
                    totalCalificacion += calificacion;
                    cantidad++;
                    
                    // Formatear fecha
                    let fechaStr = "Fecha desconocida";
                    if (data.fecha && data.fecha.seconds) {
                        fechaStr = new Date(data.fecha.seconds * 1000).toLocaleDateString('es-ES', { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                        });
                    }

                    // Generar estrellas
                    const estrellasLlenas = "★".repeat(Math.floor(calificacion));
                    const estrellasVacias = "☆".repeat(5 - Math.floor(calificacion));

                    opinionesHTML += `
                        <div class="opinion-card card h-100">
                            <div class="card-body">
                                <button class="btn-eliminar" data-id="${doc.id}" title="Eliminar opinión">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                                
                                <div class="opinion-header mb-2">
                                    <div class="estrellas text-warning">${estrellasLlenas}${estrellasVacias}</div>
                                    <h5 class="card-title mt-2 fw-bold text-primary">${escapeHtml(data.nombre || 'Anónimo')}</h5>
                                </div>
                                
                                <p class="card-text opinion-texto">"${escapeHtml(data.comentario)}"</p>
                                
                                <div class="opinion-footer mt-3 pt-2 border-top">
                                    <small class="text-muted"><i class="far fa-calendar-alt"></i> ${fechaStr}</small>
                                </div>
                            </div>
                        </div>
                    `;
                });

                opinionesContainer.innerHTML = opinionesHTML;
                
                // Calcular y mostrar promedio
                const promedio = cantidad > 0 ? (totalCalificacion / cantidad).toFixed(1) : "0.0";
                promedioDisplay.innerText = promedio;
                
                // Actualizar estrellas grandes del promedio
                const promRedondeado = Math.round(promedio);
                estrellasDisplay.innerHTML = "★".repeat(promRedondeado) + "☆".repeat(5 - promRedondeado);

                // Asignar eventos de eliminar
                asignarEventosEliminar();

            } catch (error) {
                window.manejarErrorGlobal(error);
                opinionesContainer.innerHTML = `
                    <div class="alert alert-danger w-100 text-center">
                        ⚠️ Error cargando comentarios. Verifica tu conexión.
                    </div>`;
            }
        }

        function asignarEventosEliminar() {
            document.querySelectorAll('.btn-eliminar').forEach(button => {
                button.addEventListener('click', async () => {
                    const id = button.dataset.id;
                    
                    // Usar alerta personalizada si existe, sino fallback a SweetAlert base
                    const confirmFn = window.showCustomConfirm || Swal.fire;
                    
                    const result = await (window.showCustomConfirm 
                        ? window.showCustomConfirm('¿Eliminar opinión?', 'Esta acción es irreversible', 'Sí, eliminar') 
                        : Swal.fire({
                            title: '¿Eliminar opinión?',
                            text: 'Esta acción no se puede deshacer',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#dc3545',
                            confirmButtonText: 'Eliminar'
                        }));
                    
                    if (result.isConfirmed) {
                        try {
                            await db.collection("comentarios").doc(id).delete();
                            
                            const successFn = window.showCustomSuccess || Swal.fire;
                            successFn('Eliminado', 'El comentario ha sido eliminado');
                            
                            // Recargar lista
                            cargarOpiniones();
                        } catch (error) {
                            window.manejarErrorGlobal(error);
                            const errorFn = window.showCustomError || Swal.fire;
                            errorFn('Error', 'No se pudo eliminar el comentario');
                        }
                    }
                });
            });
        }

        // Iniciar
        cargarOpiniones();
    };

    initPage();
})();