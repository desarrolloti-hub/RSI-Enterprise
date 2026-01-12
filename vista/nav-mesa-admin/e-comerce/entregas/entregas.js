// admin-entregas.js
(function() {
    'use strict';

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        const tBody = document.getElementById("entregas-body");
        const btnPrev = document.getElementById("btnAnterior");
        const btnNext = document.getElementById("btnSiguiente");
        const pageLabel = document.getElementById("paginaActual");

        // Configuración real basada en tu script antiguo
        const COLLECTION_NAME = "entregas"; 
        const LIMIT = 10;
        
        // Estado de Paginación
        let firstDocsStack = [];
        let lastDoc = null;
        let currentPage = 1;

        // Formateadores
        const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
        
        const formatDate = (timestamp) => {
            if (!timestamp) return 'N/A';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('es-MX', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        };

        // 1. Cargar Entregas
        async function cargarEntregas(direction = 'init') {
            tBody.innerHTML = '<tr><td colspan="7" class="text-center p-4"><div class="spinner-border text-primary"></div></td></tr>';

            try {
                // Usamos 'delivered_at' como en tu script original
                let queryBase = db.collection(COLLECTION_NAME).orderBy('delivered_at', 'desc').limit(LIMIT);

                if (direction === 'next' && lastDoc) {
                    queryBase = queryBase.startAfter(lastDoc);
                } else if (direction === 'prev' && firstDocsStack.length > 1) {
                    firstDocsStack.pop(); 
                    const prevDoc = firstDocsStack[firstDocsStack.length - 1];
                    queryBase = db.collection(COLLECTION_NAME).orderBy('delivered_at', 'desc').startAt(prevDoc).limit(LIMIT);
                } else {
                    firstDocsStack = []; 
                }

                const snapshot = await queryBase.get();

                if (snapshot.empty) {
                    if (direction === 'init') {
                        tBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-muted">No hay entregas registradas.</td></tr>';
                    } else {
                        btnNext.disabled = true;
                    }
                    return;
                }

                lastDoc = snapshot.docs[snapshot.docs.length - 1];
                if (direction !== 'prev') {
                    firstDocsStack.push(snapshot.docs[0]);
                }

                renderizarTabla(snapshot.docs);
                actualizarPaginacion(snapshot.size);

            } catch (error) {
                console.error("Error:", error);
                // Si falla por índice, intenta cargar sin ordenamiento específico temporalmente
                if(error.code === 'failed-precondition') {
                    console.warn("Falta índice compuesto. Cargando sin orden estricto.");
                    cargarEntregasSinOrden();
                } else {
                    tBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error al cargar datos: ${error.message}</td></tr>`;
                }
            }
        }

        // Fallback si falta índice en Firestore
        async function cargarEntregasSinOrden() {
            try {
                const snapshot = await db.collection(COLLECTION_NAME).limit(LIMIT).get();
                renderizarTabla(snapshot.docs);
            } catch (e) {
                tBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error crítico: ${e.message}</td></tr>`;
            }
        }

        function renderizarTabla(docs) {
            tBody.innerHTML = "";
            
            docs.forEach(doc => {
                const data = doc.data();
                
                // Mapeo de campos basado en tu script antiguo
                const orderId = data.order_id || data.metadata?.order_id || 'N/A';
                const cliente = data.user_email || 'Cliente Desconocido';
                const productosCount = data.items?.length || 0;
                const productoTexto = productosCount > 0 ? `${productosCount} producto(s)` : 'Sin productos';
                const fechaEntrega = formatDate(data.delivered_at);
                const monto = formatCurrency(data.amount);
                
                // Estado (OpenPay status)
                const status = data.payment_status || data.status || 'pending';
                let estadoBadge = `<span class="badge bg-secondary">${status}</span>`;
                
                if (status === 'completed' || status === 'paid') estadoBadge = `<span class="badge bg-success">Pagado</span>`;
                if (status === 'pending' || status === 'processing') estadoBadge = `<span class="badge bg-warning text-dark">Pendiente</span>`;
                if (status === 'cancelled' || status === 'failed') estadoBadge = `<span class="badge bg-danger">Fallido</span>`;

                const row = `
                    <tr>
                        <td><span class="text-muted small">#${doc.id.substr(0, 6)}</span></td>
                        <td class="fw-bold">${orderId}</td>
                        <td class="text-truncate" style="max-width: 150px;" title="${cliente}">${cliente}</td>
                        <td>${productoTexto} (${monto})</td>
                        <td>${fechaEntrega}</td>
                        <td>${estadoBadge}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-info btn-detalles mx-1" data-id="${doc.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-eliminar mx-1" data-id="${doc.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tBody.innerHTML += row;
            });

            // Eventos
            document.querySelectorAll(".btn-detalles").forEach(b => b.addEventListener("click", () => verDetalles(b.dataset.id)));
            document.querySelectorAll(".btn-eliminar").forEach(b => b.addEventListener("click", () => eliminarEntrega(b.dataset.id)));
        }

        function actualizarPaginacion(size) {
            currentPage = firstDocsStack.length;
            pageLabel.innerText = `Página ${currentPage}`;
            btnPrev.disabled = currentPage === 1;
            btnNext.disabled = size < LIMIT;
        }

        // 2. Ver Detalles (Adaptado a tu estructura de datos)
        async function verDetalles(id) {
            try {
                const docSnap = await db.collection(COLLECTION_NAME).doc(id).get();
                if (!docSnap.exists) return;
                
                const data = docSnap.data();
                const itemsHtml = (data.items || []).map(item => 
                    `<li>${item.name || 'Item'} - ${item.quantity || 1}x ${formatCurrency(item.price)}</li>`
                ).join('');

                const linkPago = data.checkout_link 
                    ? `<a href="${data.checkout_link}" target="_blank" class="btn btn-sm btn-primary mt-2"><i class="fas fa-external-link-alt"></i> Ver en OpenPay</a>` 
                    : '<span class="text-muted small">Sin enlace de pago</span>';

                Swal.fire({
                    title: `<strong>Orden ${data.order_id || 'N/A'}</strong>`,
                    html: `
                        <div class="text-start p-2">
                            <div class="row">
                                <div class="col-6"><strong>Cliente:</strong><br>${data.user_email || 'N/A'}</div>
                                <div class="col-6"><strong>ID Usuario:</strong><br>${data.user_id || 'N/A'}</div>
                            </div>
                            <hr class="my-2">
                            <div class="row">
                                <div class="col-6"><strong>Sucursal:</strong><br>${data.branch || 'N/A'}</div>
                                <div class="col-6"><strong>Repartidor:</strong><br>${data.delivered_by || 'N/A'}</div>
                            </div>
                            <hr class="my-2">
                            <p><strong>Productos:</strong></p>
                            <ul class="small ps-3 mb-2">${itemsHtml || '<li>Sin productos</li>'}</ul>
                            <div class="d-flex justify-content-between align-items-center mt-3 p-2 bg-light rounded text-dark">
                                <strong>Total:</strong>
                                <span class="fs-5 fw-bold text-success">${formatCurrency(data.amount)}</span>
                            </div>
                            <div class="mt-3 text-center">
                                ${linkPago}
                            </div>
                        </div>
                    `,
                    showCloseButton: true,
                    showConfirmButton: false
                });

            } catch (error) {
                console.error(error);
                Swal.fire("Error", "No se pudieron cargar los detalles", "error");
            }
        }

        async function eliminarEntrega(id) {
            const result = await Swal.fire({
                title: "¿Eliminar registro?",
                text: "Esta acción borrará el historial de esta entrega.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d33",
                confirmButtonText: "Sí, eliminar"
            });

            if (result.isConfirmed) {
                try {
                    await db.collection(COLLECTION_NAME).doc(id).delete();
                    Swal.fire("Eliminado", "Registro borrado correctamente.", "success");
                    cargarEntregas(firstDocsStack.length > 1 ? 'current' : 'init');
                } catch (error) {
                    Swal.fire("Error", "No se pudo eliminar.", "error");
                }
            }
        }

        // Eventos Paginación
        btnNext.addEventListener("click", () => cargarEntregas('next'));
        btnPrev.addEventListener("click", () => cargarEntregas('prev'));
        
        // Iniciar
        cargarEntregas();
    };

    initPage();
})();