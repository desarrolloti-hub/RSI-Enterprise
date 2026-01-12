// admin-pedidos-finalizados.js
(function() {
    'use strict';

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        const tBody = document.getElementById("finalizados-body");
        const btnPrev = document.getElementById("btnAnterior");
        const btnNext = document.getElementById("btnSiguiente");
        const pageLabel = document.getElementById("paginaActual");

        // Configuración: Asumimos que los finalizados están en 'entregas'
        // Si tienes otra colección para "archivados", cámbiala aquí.
        const COLLECTION_NAME = "entregas"; 
        const LIMIT = 10;
        
        let firstDocsStack = [];
        let lastDoc = null;
        let currentPage = 1;

        const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
        
        const formatDate = (timestamp) => {
            if (!timestamp) return 'N/A';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('es-MX', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        };

        // Cargar Datos
        async function cargarFinalizados(direction = 'init') {
            tBody.innerHTML = '<tr><td colspan="8" class="text-center p-4"><div class="spinner-border text-primary"></div></td></tr>';

            try {
                // Ordenar por fecha de entrega
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
                        tBody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-muted">No hay pedidos finalizados.</td></tr>';
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
                tBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error al cargar: ${error.message}</td></tr>`;
            }
        }

        function renderizarTabla(docs) {
            tBody.innerHTML = "";
            
            docs.forEach(doc => {
                const data = doc.data();
                const orderId = data.order_id || 'N/A';
                const fechaFinal = formatDate(data.delivered_at);
                const cliente = data.user_email || 'N/A';
                const total = formatCurrency(data.amount);
                const sucursal = data.branch || 'N/A';
                
                const itemsCount = data.items ? data.items.length : 0;
                const itemsLabel = `${itemsCount} producto(s)`;

                const row = `
                    <tr>
                        <td class="fw-bold" style="white-space: nowrap;">${orderId}</td>
                        <td>${fechaFinal}</td>
                        <td class="text-truncate" style="max-width: 150px;" title="${cliente}">${cliente}</td>
                        <td>${itemsLabel}</td>
                        <td>${total}</td>
                        <td>${sucursal}</td>
                        <td><span class="badge bg-success">Finalizado</span></td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-secondary btn-detalles" data-id="${doc.id}" title="Ver Detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tBody.innerHTML += row;
            });

            document.querySelectorAll(".btn-detalles").forEach(b => 
                b.addEventListener("click", () => verDetalles(b.dataset.id)));
        }

        function actualizarPaginacion(size) {
            currentPage = firstDocsStack.length;
            pageLabel.innerText = `Página ${currentPage}`;
            btnPrev.disabled = currentPage === 1;
            btnNext.disabled = size < LIMIT;
        }

        // Ver Detalles (Reutilizando la lógica mejorada del modal)
        async function verDetalles(id) {
            try {
                Swal.fire({
                    title: 'Cargando...',
                    didOpen: () => Swal.showLoading(),
                    background: getComputedStyle(document.body).getPropertyValue('--card-bg'),
                    color: getComputedStyle(document.body).getPropertyValue('--text-color')
                });

                const docSnap = await db.collection(COLLECTION_NAME).doc(id).get();
                if (!docSnap.exists) { Swal.close(); return; }
                
                const data = docSnap.data();
                
                const itemsRows = (data.items || []).map(item => `
                    <tr>
                        <td class="text-start" style="white-space: normal; max-width: 300px; word-wrap: break-word;">${item.name || 'Producto'}</td>
                        <td class="text-end" style="white-space: nowrap;">${item.quantity || 1}</td>
                        <td class="text-end" style="white-space: nowrap;">${formatCurrency(item.price)}</td>
                        <td class="text-end fw-bold" style="white-space: nowrap;">${formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
                    </tr>
                `).join('');

                const primaryColor = 'var(--primary-color)';

                Swal.fire({
                    title: `<h4 class="border-bottom pb-2" style="color: ${primaryColor}">Orden Finalizada ${data.order_id || 'N/A'}</h4>`,
                    width: '900px',
                    background: getComputedStyle(document.body).getPropertyValue('--card-bg'),
                    color: getComputedStyle(document.body).getPropertyValue('--text-color'),
                    html: `
                        <div class="container-fluid text-start custom-modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6 border-end border-secondary">
                                    <h6 class="mb-3" style="color: ${primaryColor}"><i class="fas fa-info-circle"></i> Info Entrega</h6>
                                    <div class="d-flex justify-content-between mb-1"><span class="text-muted">Entregado el:</span> <span class="fw-bold">${formatDate(data.delivered_at)}</span></div>
                                    <div class="d-flex justify-content-between mb-1"><span class="text-muted">Sucursal:</span> ${data.branch || 'N/A'}</div>
                                    <div class="d-flex justify-content-between mb-1"><span class="text-muted">Repartidor:</span> ${data.delivered_by || 'N/A'}</div>
                                </div>
                                <div class="col-md-6 ps-md-4">
                                    <h6 class="mb-3" style="color: ${primaryColor}"><i class="fas fa-user"></i> Cliente</h6>
                                    <div class="mb-2"><div class="text-muted small">Email:</div><div class="fw-bold text-break">${data.user_email || 'N/A'}</div></div>
                                    <div class="mb-2"><div class="text-muted small">ID:</div><div class="small text-break">${data.user_id || 'N/A'}</div></div>
                                </div>
                            </div>

                            <h6 class="mb-3" style="color: ${primaryColor}"><i class="fas fa-box"></i> Productos Entregados</h6>
                            <div class="table-responsive mb-3 border rounded p-2" style="background: rgba(255,255,255,0.05);">
                                <table class="table table-sm table-borderless text-light mb-0 w-100">
                                    <thead class="border-bottom border-secondary" style="color: ${primaryColor}">
                                        <tr><th class="text-start">Descripción</th><th class="text-end">Cant.</th><th class="text-end">Precio</th><th class="text-end">Total</th></tr>
                                    </thead>
                                    <tbody style="color: inherit;">${itemsRows}</tbody>
                                </table>
                            </div>

                            <div class="text-end border-top border-secondary pt-3">
                                <div class="small text-muted">Total Final:</div>
                                <div class="fs-3 fw-bold text-success">${formatCurrency(data.amount)}</div>
                            </div>
                        </div>
                    `,
                    showConfirmButton: true,
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#6c757d'
                });

            } catch (error) {
                console.error(error);
                Swal.fire("Error", "No se pudieron cargar los detalles", "error");
            }
        }

        // Eventos
        btnNext.addEventListener("click", () => cargarFinalizados('next'));
        btnPrev.addEventListener("click", () => cargarFinalizados('prev'));
        
        // Iniciar
        cargarFinalizados();
    };

    initPage();
})();