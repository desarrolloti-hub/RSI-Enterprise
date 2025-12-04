// admin-ventas.js
(function() {
    'use strict';

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        
        // DOM Elements
        const tBody = document.getElementById("ventas-body");
        const btnPrev = document.getElementById("btnAnterior");
        const btnNext = document.getElementById("btnSiguiente");
        const pageLabel = document.getElementById("paginaActual");
        const btnNuevaVenta = document.getElementById("btn-nueva-venta");
        const btnExportar = document.getElementById("btn-exportar");

        // Configuración
        const COLLECTION_NAME = "orders"; // O "ventas" si tienes una colección separada
        const LIMIT = 10;
        
        let firstDocsStack = [];
        let lastDoc = null;
        let currentPage = 1;

        // Helpers
        const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
        
        const formatDate = (timestamp) => {
            if (!timestamp) return 'N/A';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('es-MX', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        };

        const getPaymentMethodBadge = (method) => {
            const icons = {
                'card': '<i class="fas fa-credit-card"></i> Tarjeta',
                'cash': '<i class="fas fa-money-bill-wave"></i> Efectivo',
                'transfer': '<i class="fas fa-university"></i> Transferencia',
                'unknown': '<i class="fas fa-question-circle"></i> Otro'
            };
            return icons[method] || icons['unknown'];
        };

        // 1. Cargar Ventas
        async function cargarVentas(direction = 'init') {
            tBody.innerHTML = '<tr><td colspan="8" class="text-center p-4"><div class="spinner-border text-primary"></div></td></tr>';

            try {
                // Filtramos por payment_status 'paid' o 'completed' si quisiéramos solo ventas reales
                // Por ahora traemos todo ordenado por fecha
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
                        tBody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-muted">No se encontraron registros de ventas.</td></tr>';
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
                const idVenta = data.order_id || data.metadata?.order_id || doc.id.substr(0,8);
                const fecha = formatDate(data.created_at);
                const cliente = data.user_email || 'Cliente Mostrador';
                const total = formatCurrency(data.amount);
                const metodo = data.payment_method || 'unknown';
                const itemsCount = data.items ? data.items.length : 0;
                
                // Estado de pago
                const status = data.payment_status || 'pending';
                let badgeClass = 'bg-secondary';
                if(status === 'paid' || status === 'completed') badgeClass = 'bg-success';
                else if(status === 'pending') badgeClass = 'bg-warning text-dark';
                else if(status === 'cancelled') badgeClass = 'bg-danger';

                const row = `
                    <tr>
                        <td class="fw-bold" style="white-space: nowrap;">${idVenta}</td>
                        <td>${fecha}</td>
                        <td class="text-truncate" style="max-width: 150px;" title="${cliente}">${cliente}</td>
                        <td>${itemsCount} art.</td>
                        <td class="fw-bold text-success">${total}</td>
                        <td>${getPaymentMethodBadge(metodo)}</td>
                        <td class="text-center"><span class="badge ${badgeClass}">${status}</span></td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-secondary btn-detalles mx-1" data-id="${doc.id}" title="Ver Recibo">
                                <i class="fas fa-file-invoice-dollar"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-eliminar mx-1" data-id="${doc.id}" title="Eliminar/Cancelar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tBody.innerHTML += row;
            });

            // Asignar eventos
            document.querySelectorAll(".btn-detalles").forEach(b => b.addEventListener("click", () => verDetalles(b.dataset.id)));
            document.querySelectorAll(".btn-eliminar").forEach(b => b.addEventListener("click", () => eliminarVenta(b.dataset.id)));
        }

        function actualizarPaginacion(size) {
            currentPage = firstDocsStack.length;
            pageLabel.innerText = `Página ${currentPage}`;
            btnPrev.disabled = currentPage === 1;
            btnNext.disabled = size < LIMIT;
        }

        // 2. Ver Detalles (Modal Mejorado)
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
                const primaryColor = 'var(--primary-color)';

                const itemsRows = (data.items || []).map(item => `
                    <tr>
                        <td class="text-start" style="white-space: normal; max-width: 250px; word-wrap: break-word;">${item.name || 'Articulo'}</td>
                        <td class="text-end" style="white-space: nowrap;">${item.quantity || 1}</td>
                        <td class="text-end" style="white-space: nowrap;">${formatCurrency(item.price)}</td>
                        <td class="text-end fw-bold" style="white-space: nowrap;">${formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
                    </tr>
                `).join('');

                Swal.fire({
                    title: `<h4 class="border-bottom pb-2" style="color: ${primaryColor}">Detalle de Venta</h4>`,
                    width: '800px',
                    background: getComputedStyle(document.body).getPropertyValue('--card-bg'),
                    color: getComputedStyle(document.body).getPropertyValue('--text-color'),
                    html: `
                        <div class="container-fluid text-start custom-modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6 border-end border-secondary">
                                    <h6 class="mb-3" style="color: ${primaryColor}"><i class="fas fa-receipt"></i> Datos de Venta</h6>
                                    <div class="d-flex justify-content-between mb-1"><span class="text-muted">ID:</span> <span class="fw-bold">${data.order_id || 'N/A'}</span></div>
                                    <div class="d-flex justify-content-between mb-1"><span class="text-muted">Fecha:</span> <span>${formatDate(data.created_at)}</span></div>
                                    <div class="d-flex justify-content-between mb-1"><span class="text-muted">Método:</span> <span>${data.payment_method || 'N/A'}</span></div>
                                </div>
                                <div class="col-md-6 ps-md-4">
                                    <h6 class="mb-3" style="color: ${primaryColor}"><i class="fas fa-user"></i> Cliente</h6>
                                    <div class="mb-1"><div class="text-muted small">Email:</div><div class="fw-bold text-break">${data.user_email || 'N/A'}</div></div>
                                    <div class="mb-1"><div class="text-muted small">Tel:</div><div>${data.phone_number || 'N/A'}</div></div>
                                </div>
                            </div>

                            <h6 class="mb-3" style="color: ${primaryColor}"><i class="fas fa-shopping-cart"></i> Artículos</h6>
                            <div class="table-responsive mb-3 border rounded p-2" style="background: rgba(255,255,255,0.05);">
                                <table class="table table-sm table-borderless text-light mb-0 w-100">
                                    <thead class="border-bottom border-secondary" style="color: ${primaryColor}">
                                        <tr><th class="text-start">Concepto</th><th class="text-end">Cant.</th><th class="text-end">P.Unit</th><th class="text-end">Importe</th></tr>
                                    </thead>
                                    <tbody style="color: inherit;">${itemsRows}</tbody>
                                </table>
                            </div>

                            <div class="row mt-3 pt-2 border-top border-secondary">
                                <div class="col-6">
                                    <button class="btn btn-sm btn-outline-light" onclick="window.print()"><i class="fas fa-print"></i> Imprimir Recibo</button>
                                </div>
                                <div class="col-6 text-end">
                                    <div class="d-flex justify-content-end align-items-center">
                                        <span class="fs-5 me-3">Total:</span>
                                        <span class="fs-2 fw-bold text-success">${formatCurrency(data.amount)}</span>
                                    </div>
                                </div>
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

        // Acciones Adicionales
        btnNuevaVenta.addEventListener("click", () => {
            Swal.fire({
                icon: 'info',
                title: 'Punto de Venta',
                text: 'La funcionalidad de caja (POS) para nuevas ventas manuales estará disponible en la próxima actualización.',
                background: getComputedStyle(document.body).getPropertyValue('--card-bg'),
                color: getComputedStyle(document.body).getPropertyValue('--text-color')
            });
        });

        // --- FUNCIÓN DE EXPORTACIÓN A EXCEL (CSV) ---
        btnExportar.addEventListener("click", async () => {
            try {
                // 1. Feedback visual
                Swal.fire({
                    title: 'Generando reporte...',
                    text: 'Recopilando las últimas ventas',
                    didOpen: () => Swal.showLoading(),
                    background: getComputedStyle(document.body).getPropertyValue('--card-bg'),
                    color: getComputedStyle(document.body).getPropertyValue('--text-color')
                });

                // 2. Traer datos reales (Limitamos a 1000 para no saturar el navegador)
                const snapshot = await db.collection(COLLECTION_NAME)
                    .orderBy('created_at', 'desc')
                    .limit(1000) 
                    .get();

                if (snapshot.empty) {
                    Swal.fire('Atención', 'No hay datos para exportar', 'info');
                    return;
                }

                // 3. Construir el CSV
                // \uFEFF es el BOM para que Excel reconozca acentos y caracteres especiales (UTF-8)
                let csvContent = "\uFEFF"; 
                
                // Encabezados
                const headers = ["ID Venta", "Fecha", "Cliente", "Teléfono", "Sucursal", "Productos (Cant)", "Total", "Método Pago", "Estado"];
                csvContent += headers.join(",") + "\n";

                snapshot.forEach(doc => {
                    const data = doc.data();
                    
                    // Preparar datos limpios (sin comas que rompan el CSV)
                    const id = (data.order_id || doc.id).replace(/,/g, "");
                    const fecha = formatDate(data.created_at).replace(/,/g, "");
                    const cliente = (data.user_email || "N/A").replace(/,/g, "");
                    const telefono = (data.phone_number || "N/A").replace(/,/g, "");
                    const sucursal = (data.branch || "N/A").replace(/,/g, "");
                    const total = data.amount || 0;
                    const metodo = (data.payment_method || "N/A").replace(/,/g, "");
                    const estado = (data.payment_status || "N/A").replace(/,/g, "");
                    
                    // Resumen de productos: "Cámara (1) | Cable (2)"
                    const productosResumen = (data.items || []).map(i => 
                        `${i.name || 'Item'} (${i.quantity})`
                    ).join(" | ").replace(/,/g, " "); // Reemplazar comas internas por espacios

                    // Construir fila
                    const row = [
                        id, 
                        fecha, 
                        cliente, 
                        telefono, 
                        sucursal, 
                        `"${productosResumen}"`, // Entre comillas por si acaso
                        total, 
                        metodo, 
                        estado
                    ];
                    
                    csvContent += row.join(",") + "\n";
                });

                // 4. Crear Blob y Descargar
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                
                // Crear link invisible
                const link = document.createElement("a");
                link.setAttribute("href", url);
                const fechaHoy = new Date().toISOString().slice(0,10);
                link.setAttribute("download", `Reporte_Ventas_RSI_${fechaHoy}.csv`);
                document.body.appendChild(link);
                
                // Clic y limpieza
                link.click();
                document.body.removeChild(link);
                
                Swal.close();
                
                // Notificación final pequeña
                const Toast = Swal.mixin({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
                });
                Toast.fire({ icon: 'success', title: 'Reporte descargado' });

            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo generar el reporte', 'error');
            }
        });

        async function eliminarVenta(id) {
            const result = await Swal.fire({
                title: '¿Cancelar Venta?',
                text: "Esto cambiará el estado a 'Cancelado' y afectará los reportes.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, cancelar venta',
                cancelButtonText: 'Volver',
                background: getComputedStyle(document.body).getPropertyValue('--card-bg'),
                color: getComputedStyle(document.body).getPropertyValue('--text-color')
            });

            if (result.isConfirmed) {
                try {
                    await db.collection(COLLECTION_NAME).doc(id).update({
                        status: 'cancelled',
                        payment_status: 'cancelled'
                    });
                    cargarVentas('current');
                    Swal.fire('Cancelada', 'La venta ha sido marcada como cancelada.', 'success');
                } catch (e) {
                    Swal.fire('Error', 'No se pudo cancelar la venta.', 'error');
                }
            }
        }

        // Paginación Listeners
        btnNext.addEventListener("click", () => cargarVentas('next'));
        btnPrev.addEventListener("click", () => cargarVentas('prev'));
        
        // Iniciar
        cargarVentas();
    };

    initPage();
})();