// admin-contactos.js
(function() {
    'use strict';

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        const container = document.getElementById("contactos-container");
        const btnPrev = document.getElementById("btnAnterior");
        const btnNext = document.getElementById("btnSiguiente");
        const pageLabel = document.getElementById("paginaActual");

        // Variables de Paginación
        const LIMIT = 6;
        let currentPage = 1;
        let lastDoc = null;     // Cursor para ir adelante
        let firstDocsStack = []; // Pila para guardar el inicio de cada página (para ir atrás)

        // Seguridad XSS
        function escapeHtml(text) {
            if (!text) return "";
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Cargar Datos
        async function cargarMensajes(direction = 'init') {
            container.innerHTML = '<div class="col-12 text-center p-5"><div class="spinner-border text-primary"></div></div>';
            
            try {
                let queryBase = db.collection("contactanos").orderBy('fecha', 'desc').limit(LIMIT);

                if (direction === 'next' && lastDoc) {
                    queryBase = queryBase.startAfter(lastDoc);
                } else if (direction === 'prev' && firstDocsStack.length > 1) {
                    // Sacamos el actual
                    firstDocsStack.pop(); 
                    // El anterior es el inicio de la página previa
                    const prevStartDoc = firstDocsStack[firstDocsStack.length - 1]; 
                    queryBase = db.collection("contactanos").orderBy('fecha', 'desc').startAt(prevStartDoc).limit(LIMIT);
                } else {
                    // Init: limpiar stack
                    firstDocsStack = [];
                }

                const snapshot = await queryBase.get();

                if (snapshot.empty) {
                    if (direction === 'init') {
                        container.innerHTML = '<div class="text-center w-100 p-4 text-muted">No hay mensajes de contacto.</div>';
                    } else {
                        // Si intentamos ir a next y no hay, deshabilitar
                        btnNext.disabled = true;
                    }
                    return;
                }

                // Actualizar cursores
                lastDoc = snapshot.docs[snapshot.docs.length - 1];
                
                // Si vamos adelante o inicio, guardamos el primer doc de esta página en el stack
                if (direction !== 'prev') {
                    firstDocsStack.push(snapshot.docs[0]);
                }

                // Renderizar
                renderizarMensajes(snapshot.docs);
                actualizarBotonesPaginacion(snapshot.size);

            } catch (error) {
                window.manejarErrorGlobal(error);
                container.innerHTML = `<div class="alert alert-danger">Error al cargar datos: ${error.message}</div>`;
            }
        }

        function renderizarMensajes(docs) {
            container.innerHTML = "";
            
            docs.forEach(doc => {
                const data = doc.data();
                const estado = data.estado || "Sin contestar";
                const telefono = data.telefono || 'No proporcionado';
                
                // Formatear fecha
                let fechaStr = "Fecha desconocida";
                if (data.fecha && data.fecha.seconds) {
                    fechaStr = new Date(data.fecha.seconds * 1000).toLocaleDateString('es-ES', { 
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'
                    });
                }

                // Clase para el borde/color según estado
                const estadoClass = estado === 'Contestado' ? 'border-success' : 'border-warning';
                const badgeClass = estado === 'Contestado' ? 'bg-success' : 'bg-warning text-dark';

                const card = document.createElement('div');
                card.className = `mensaje-card card h-100 ${estadoClass}`;
                card.innerHTML = `
                    <div class="card-body position-relative">
                        <button class="btn-eliminar" data-id="${doc.id}" title="Eliminar mensaje">
                            <i class="fas fa-times"></i>
                        </button>

                        <div class="d-flex align-items-center mb-3 pe-4">
                            <h5 class="card-title fw-bold mb-0" title="${escapeHtml(data.nombre)}">
                                ${escapeHtml(data.nombre)}
                            </h5>
                            <span class="badge ${badgeClass} ms-2">${estado}</span>
                        </div>

                        <div class="info-contacto">
                            <div>
                                <i class="fas fa-envelope"></i> 
                                <span>${escapeHtml(data.email)}</span>
                            </div>
                            <div>
                                <i class="fas fa-phone"></i> 
                                <span>${escapeHtml(telefono)}</span>
                            </div>
                        </div>

                        <div class="mensaje-contenido">
                            "${escapeHtml(data.mensaje)}"
                        </div>

                        <div class="card-footer-custom">
                            <span class="fecha-texto">
                                <i class="far fa-calendar-alt"></i> ${fechaStr}
                            </span>
                            
                            <select class="form-select form-select-sm w-auto selector-estado" data-id="${doc.id}">
                                <option value="Sin contestar" ${estado === 'Sin contestar' ? 'selected' : ''}>Pendiente</option>
                                <option value="Contestado" ${estado === 'Contestado' ? 'selected' : ''}>Contestado</option>
                            </select>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });

            // Asignar eventos
            container.querySelectorAll('.btn-eliminar').forEach(b => 
                b.addEventListener('click', () => eliminarMensaje(b.dataset.id)));
            
            container.querySelectorAll('.selector-estado').forEach(s => 
                s.addEventListener('change', (e) => actualizarEstado(e.target.dataset.id, e.target.value)));
        }

        function actualizarBotonesPaginacion(docsCount) {
            btnPrev.disabled = firstDocsStack.length <= 1;
            // Si trajimos menos del límite, es la última página
            btnNext.disabled = docsCount < LIMIT;
            
            // Calculamos página basado en el stack
            currentPage = firstDocsStack.length;
            pageLabel.innerText = `Página ${currentPage}`;
        }

        // --- Acciones ---

        async function actualizarEstado(id, nuevoEstado) {
            try {
                await db.collection("contactanos").doc(id).update({ estado: nuevoEstado });
                
                // Feedback sutil
                const toast = Swal.mixin({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
                });
                toast.fire({ icon: 'success', title: 'Estado actualizado' });
                
                // Recargar para actualizar colores (opcional, o manipular DOM directo)
                cargarMensajes(null); // Recarga la página actual (lógica simplificada)

            } catch (error) {
                window.manejarErrorGlobal(error);
                Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
            }
        }

        async function eliminarMensaje(id) {
            const result = await (window.showCustomConfirm 
                ? window.showCustomConfirm('¿Eliminar?', 'Esta acción es irreversible') 
                : Swal.fire({title: '¿Eliminar?', icon:'warning', showCancelButton:true}));

            if (result.isConfirmed) {
                try {
                    await db.collection("contactanos").doc(id).delete();
                    
                    // Ajustar stack si es necesario y recargar
                    // Para simplificar, recargamos la vista actual (o anterior si se vacía)
                    cargarMensajes(firstDocsStack.length > 1 ? 'current' : 'init'); 
                    
                    if(window.showCustomSuccess) window.showCustomSuccess('Eliminado', 'Mensaje borrado');

                } catch (error) {
                    window.manejarErrorGlobal(error);
                    window.showCustomError('Error', 'No se pudo eliminar');
                }
            }
        }

        // Eventos Paginación
        btnNext.addEventListener('click', () => cargarMensajes('next'));
        btnPrev.addEventListener('click', () => cargarMensajes('prev'));

        // Iniciar
        cargarMensajes();
    };

    initPage();
})();