// admin-pedidos.js
(function() {
    'use strict';

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        
        // Config OpenPay
        if (typeof OpenPay !== 'undefined') {
            OpenPay.setId('mfxzk8dtsjsaqscngyxp');
            OpenPay.setApiKey('pk_92a7dde47c53491a828e3edba6e2704c');
            OpenPay.setSandboxMode(true);
        }

        // Elementos DOM
        const tBody = document.getElementById("pedidos-body");
        const btnPrev = document.getElementById("btnAnterior");
        const btnNext = document.getElementById("btnSiguiente");
        const pageLabel = document.getElementById("paginaActual");
        const btnRefreshAll = document.getElementById("refresh-all");

        // Configuración
        const COLLECTION_NAME = "orders"; // Colección de pedidos activos
        const LIMIT = 10;
        
        // Paginación
        let firstDocsStack = [];
        let lastDoc = null;
        let currentPage = 1;

        // --- Helpers ---
        const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
        
        const formatDate = (timestamp) => {
            if (!timestamp) return 'N/A';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('es-MX', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        };

        const getStatusBadge = (status) => {
            const map = {
                'completed': { label: 'Completado', class: 'bg-success' },
                'paid': { label: 'Pagado', class: 'bg-success' },
                'pending': { label: 'Pendiente', class: 'bg-warning text-dark' },
                'in_progress': { label: 'En proceso', class: 'bg-info text-dark' },
                'cancelled': { label: 'Cancelado', class: 'bg-danger' },
                'failed': { label: 'Fallido', class: 'bg-danger' },
                'unknown': { label: 'Desconocido', class: 'bg-secondary' }
            };
            const config = map[status] || map['unknown'];
            return `<span class="badge ${config.class}">${config.label}</span>`;
        };

        // --- Carga de Datos ---
        async function cargarPedidos(direction = 'init') {
            tBody.innerHTML = '<tr><td colspan="8" class="text-center p-4"><div class="spinner-border text-primary"></div></td></tr>';

            try {
                let queryBase = db.collection(COLLECTION_NAME).orderBy('created_at', 'desc').limit(LIMIT);

                if (direction === 'next' && lastDoc) {
                    queryBase = queryBase.startAfter(lastDoc);
                } else if (direction === 'prev' && firstDocsStack.length > 1) {
                    firstDocsStack.pop(); 
                    const prevDoc = firstDocsStack[firstDocsStack.length - 1];
                    queryBase = db.collection(COLLECTION_NAME).orderBy('created_at', 'desc').startAt(prevDoc).limit(LIMIT);
                } else {
                    firstDocsStack = []; 
                }

                const snapshot = await queryBase.get();

                if (snapshot.empty) {
                    if (direction === 'init') {
                        tBody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-muted">No hay pedidos activos.</td></tr>';
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
                tBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error al cargar datos: ${error.message}</td></tr>`;
            }
        }

        function renderizarTabla(docs) {
            tBody.innerHTML = "";
            
            docs.forEach(doc => {
                const data = doc.data();
                const orderId = data.order_id || data.metadata?.order_id || 'N/A';
                const createdDate = formatDate(data.created_at);
                const clientEmail = data.user_email || 'N/A';
                const total = formatCurrency(data.amount);
                const sucursal = data.branch || 'N/A';
                const itemsCount = data.items ? data.items.length : 0;
                const itemsLabel = `${itemsCount} producto${itemsCount !== 1 ? 's' : ''}`;
                
                const paymentStatus = data.payment_status || data.status || 'unknown';
                const statusBadge = getStatusBadge(paymentStatus);

                const row = `
                    <tr data-id="${doc.id}" data-order="${orderId}">
                        <td class="fw-bold">${orderId}</td>
                        <td>${createdDate}</td>
                        <td class="text-truncate" style="max-width: 150px;" title="${clientEmail}">${clientEmail}</td>
                        <td>${itemsLabel}</td>
                        <td>${total}</td>
                        <td>${sucursal}</td>
                        <td class="status-cell">${statusBadge}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-secondary btn-detalles mx-1" data-id="${doc.id}" title="Ver Detalles">                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-success btn-entregar mx-1" data-id="${doc.id}" title="Marcar como Entregado">
                                <i class="fas fa-check"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tBody.innerHTML += row;
            });

            // Asignar eventos
            document.querySelectorAll(".btn-detalles").forEach(b => 
                b.addEventListener("click", () => verDetalles(b.dataset.id)));
            
            document.querySelectorAll(".btn-entregar").forEach(b => 
                b.addEventListener("click", () => marcarComoEntregado(b.dataset.id)));
        }

        function actualizarPaginacion(size) {
            currentPage = firstDocsStack.length;
            pageLabel.innerText = `Página ${currentPage}`;
            btnPrev.disabled = currentPage === 1;
            btnNext.disabled = size < LIMIT;
        }

        // --- Acciones ---

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
                
                // Filas de productos
                const itemsRows = (data.items || []).map(item => `
                    <tr>
                        <td class="text-start" style="white-space: normal; max-width: 300px; word-wrap: break-word;">${item.name || 'Producto'}</td>
                        <td class="text-end" style="white-space: nowrap;">${item.quantity || 1}</td>
                        <td class="text-end" style="white-space: nowrap;">${formatCurrency(item.price)}</td>
                        <td class="text-end fw-bold" style="white-space: nowrap;">${formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
                    </tr>
                `).join('');

                const linkOpenPay = data.checkout_link 
                    ? `<a href="${data.checkout_link}" target="_blank" class="btn btn-sm btn-outline-light"><i class="fas fa-external-link-alt"></i> Ver Pago</a>` 
                    : '';

                const primaryColor = 'var(--primary-color)';

                Swal.fire({
                    title: `<h4 class="border-bottom pb-2" style="color: ${primaryColor}">Orden ${data.order_id || 'N/A'}</h4>`,
                    width: '900px',
                    background: getComputedStyle(document.body).getPropertyValue('--card-bg'),
                    color: getComputedStyle(document.body).getPropertyValue('--text-color'),
                    html: `
                        <div class="container-fluid text-start custom-modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6 border-end border-secondary">
                                    <h6 class="mb-3" style="color: ${primaryColor}"><i class="fas fa-info-circle"></i> Info Pedido</h6>
                                    <div class="d-flex justify-content-between mb-1"><span class="text-muted">Fecha:</span> <span class="fw-bold">${formatDate(data.created_at)}</span></div>
                                    <div class="d-flex justify-content-between mb-1"><span class="text-muted">Estado Pago:</span> ${getStatusBadge(data.payment_status || data.status)}</div>
                                </div>
                                <div class="col-md-6 ps-md-4">
                                    <h6 class="mb-3" style="color: ${primaryColor}"><i class="fas fa-user"></i> Cliente</h6>
                                    <div class="mb-2"><div class="text-muted small">Email:</div><div class="fw-bold text-break">${data.user_email || 'N/A'}</div></div>
                                    <div class="mb-2"><div class="text-muted small">ID:</div><div class="small text-break">${data.user_id || 'N/A'}</div></div>
                                </div>
                            </div>
                            
                            <div class="row mb-4 bg-opacity-10 bg-white p-2 rounded mx-0">
                                <div class="col-md-6"><small class="text-muted">Sucursal:</small><br><strong>${data.branch || 'N/A'}</strong></div>
                                <div class="col-md-6"><small class="text-muted">Entrega:</small><br><strong>Pendiente</strong></div>
                            </div>

                            <h6 class="mb-3" style="color: ${primaryColor}"><i class="fas fa-box"></i> Productos</h6>
                            <div class="table-responsive mb-3 border rounded p-2" style="background: rgba(255,255,255,0.05);">
                                <table class="table table-sm table-borderless text-light mb-0 w-100">
                                    <thead class="border-bottom border-secondary" style="color: ${primaryColor}">
                                        <tr><th class="text-start">Descripción</th><th class="text-end">Cant.</th><th class="text-end">Precio</th><th class="text-end">Total</th></tr>
                                    </thead>
                                    <tbody style="color: inherit;">${itemsRows || '<tr><td colspan="4">Sin productos</td></tr>'}</tbody>
                                </table>
                            </div>

                            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary">
                                <div>${linkOpenPay}</div>
                                <div class="text-end"><div class="small text-muted">Total:</div><div class="fs-3 fw-bold text-success">${formatCurrency(data.amount)}</div></div>
                            </div>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: '<i class="fas fa-check"></i> Marcar Entregado',
                    cancelButtonText: 'Cerrar',
                    confirmButtonColor: '#28a745'
                }).then((result) => {
                    if (result.isConfirmed) {
                        marcarComoEntregado(id);
                    }
                });

            } catch (error) {
                console.error(error);
                Swal.fire("Error", "No se pudieron cargar los detalles", "error");
            }
        }

        // Lógica de Negocio: Mover de 'orders' a 'entregas'
        async function marcarComoEntregado(docId) {
            try {
                // Pedir confirmación (si viene directo del botón de la tabla)
                // Si viene del modal de detalles, Swal ya confirmó, pero validamos de nuevo por seguridad visual
                /* Nota: Si la llamada viene del modal de 'verDetalles', ya se hizo un clic en "Marcar Entregado". 
                   Si quieres doble confirmación, descomenta el bloque siguiente. 
                   Si no, puedes proceder directo. Aquí dejaremos una confirmación rápida.
                */
               
                const result = await Swal.fire({
                    title: '¿Confirmar entrega?',
                    text: "El pedido se moverá al historial de entregas.",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#28a745',
                    confirmButtonText: 'Sí, confirmar'
                });

                if (!result.isConfirmed) return;

                Swal.fire({title: 'Procesando...', didOpen: () => Swal.showLoading()});

                const docRef = db.collection(COLLECTION_NAME).doc(docId);
                const docSnap = await docRef.get();

                if (!docSnap.exists) { throw new Error("El pedido ya no existe"); }

                const orderData = docSnap.data();
                
                // Agregar metadatos de entrega
                orderData.delivered_at = firebase.firestore.FieldValue.serverTimestamp();
                orderData.delivery_status = 'delivered';
                orderData.delivered_by = 'Admin'; // O usuario actual si tienes auth

                // Transacción manual: Copiar -> Borrar
                await db.collection("entregas").doc(docId).set(orderData);
                await docRef.delete();

                Swal.fire({
                    icon: 'success',
                    title: '¡Entregado!',
                    text: 'El pedido se movió al historial exitosamente.',
                    timer: 2000
                });

                // Recargar tabla
                cargarPedidos(firstDocsStack.length > 1 ? 'current' : 'init');

            } catch (error) {
                console.error("Error al entregar:", error);
                Swal.fire("Error", "No se pudo procesar la entrega.", "error");
            }
        }

        // Actualizar estados masivamente (OpenPay)
        btnRefreshAll.addEventListener("click", () => {
            const rows = document.querySelectorAll('#pedidos-body tr');
            if(rows.length === 0) return;

            Swal.fire({title: 'Actualizando...', didOpen: () => Swal.showLoading()});

            let promises = [];
            rows.forEach(row => {
                const docId = row.dataset.id;
                const orderId = row.dataset.order;
                if(docId && orderId && orderId !== 'N/A') {
                    promises.push(checkAndUpdateStatus(docId, orderId, row));
                }
            });

            Promise.all(promises).then(() => {
                Swal.close();
                const Toast = Swal.mixin({toast: true, position: 'top-end', showConfirmButton: false, timer: 3000});
                Toast.fire({ icon: 'success', title: 'Estados actualizados' });
            });
        });

        async function checkAndUpdateStatus(docId, orderId, rowElement) {
            try {
                if (typeof OpenPay === 'undefined' || !OpenPay.charges) return;

                return new Promise((resolve) => {
                    OpenPay.charges.get(orderId, async (charge) => {
                        const status = charge.status;
                        await db.collection(COLLECTION_NAME).doc(docId).update({
                            payment_status: status,
                            status: status,
                            updated_at: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        if(rowElement) {
                            const cell = rowElement.querySelector('.status-cell');
                            if(cell) cell.innerHTML = getStatusBadge(status);
                        }
                        resolve(status);
                    }, (err) => { console.error(err); resolve(null); });
                });
            } catch (e) { console.error(e); }
        }

        // Eventos Paginación
        btnNext.addEventListener("click", () => cargarPedidos('next'));
        btnPrev.addEventListener("click", () => cargarPedidos('prev'));
        
        // Iniciar
        cargarPedidos();
    };

    initPage();
})();