(function() {
    'use strict';

    const tableBody = document.getElementById('reportsTableBody');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const pageIndicator = document.getElementById('pageIndicator');

    // Estado Local
    let allReports = []; 
    let filteredReports = [];
    let allCollaborators = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }
        loadCollaborators();
        loadSystemReports();
        setupEventListeners();
    };

    function setupEventListeners() {
        searchInput.addEventListener('keyup', () => applyFilters());
        statusFilter.addEventListener('change', () => applyFilters());
        btnPrev.addEventListener('click', () => changePage(-1));
        btnNext.addEventListener('click', () => changePage(1));
    }

    async function loadCollaborators() {
        try {
            const db = firebase.firestore();
            const snapshot = await db.collection('colaboradores').get();
            allCollaborators = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().NOMBRE,
                area: doc.data().ÁREA
            }));
        } catch (error) { console.error("Error colaboradores:", error); }
    }

    async function loadSystemReports() {
        const db = firebase.firestore();
        try {
            let query = db.collection('reportesSistema').orderBy('fechaCreacion', 'desc').limit(100);
            const snapshot = await query.get();

            if (snapshot.empty) {
                renderEmptyState();
                return;
            }

            allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            applyFilters(); 
            updateKPIs(allReports);

        } catch (error) {
            console.error("Error cargando reportes:", error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-error">Error: ${error.message}</td></tr>`;
        }
    }

    function applyFilters() {
        const term = searchInput.value.toLowerCase();
        const status = statusFilter.value;

        filteredReports = allReports.filter(r => {
            const matchesSearch = 
                (r.descripcion || '').toLowerCase().includes(term) ||
                (r.tipo || '').toLowerCase().includes(term) ||
                (r.moduloUsuario || '').toLowerCase().includes(term) ||
                (r.creadoPor?.email || '').toLowerCase().includes(term);

            const matchesStatus = status === 'todos' || r.estado === status;

            return matchesSearch && matchesStatus;
        });

        currentPage = 1;
        renderPagination();
    }

    function changePage(direction) {
        const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
        const newPage = currentPage + direction;

        if (newPage > 0 && newPage <= totalPages) {
            currentPage = newPage;
            renderPagination();
        }
    }

    function renderPagination() {
        const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedData = filteredReports.slice(start, end);

        renderReports(paginatedData);

        pageIndicator.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        btnPrev.disabled = currentPage === 1;
        btnNext.disabled = currentPage === totalPages || totalPages === 0;
    }

   function renderReports(reports) {
    const tableBody = document.getElementById('reportsTableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    
    // Limpiar ambos contenedores
    tableBody.innerHTML = '';
    mobileContainer.innerHTML = '';

    if (reports.length === 0) {
        const emptyMessage = '<tr><td colspan="5" style="text-align:center; padding: 30px;">No se encontraron coincidencias.</td></tr>';
        tableBody.innerHTML = emptyMessage;
        mobileContainer.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No se encontraron reportes</p></div>';
        return;
    }

    reports.forEach(r => {
        // 1. Formato de Fecha
        let fechaStr = '---';
        if (r.fechaCreacion && r.fechaCreacion.seconds) {
            fechaStr = new Date(r.fechaCreacion.seconds * 1000).toLocaleDateString('es-MX', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });
        }

        // 2. Variables de Datos
        const proyecto = r.proyecto || 'RSI Enterprise'; 
        const userEmail = r.creadoPor?.email || 'Anónimo';
        const userName = r.creadoPor?.displayName || userEmail.split('@')[0];
        const tieneEvidencia = r.capturaPantallaUrl || r.capturaPantallaBase64;
        
        // 3. Badges (Etiquetas)
        const ticketBadge = r.ticketAsociado ? 
            `<div style="margin-top:5px;"><span class="badge" style="background:var(--primary); color:white; font-size:0.7rem;">
                <i class="fas fa-ticket-alt"></i> ${r.ticketAsociado}
             </span></div>` : '';

        // Prioridad
        const prioridad = r.prioridad || 'Media'; 
        let priorityClass = 'priority-media';
        if(prioridad === 'Alta') priorityClass = 'priority-alta';
        if(prioridad === 'Baja') priorityClass = 'priority-baja';
        
        const priorityBadge = `<span class="badge-priority ${priorityClass}">${prioridad}</span>`;

        // Color Estado
        let statusColor = 'var(--text-color)';
        if (r.estado === 'Pendiente') statusColor = 'var(--danger)'; 
        if (r.estado === 'En Proceso' || r.estado === 'En Revisión') statusColor = '#ffc107';
        if (r.estado === 'Resuelto' || r.estado === 'Finalizado') statusColor = 'var(--success)';
        if(r.estado === 'Descartado') statusColor = 'White';

        // ========== TABLA DESKTOP ==========
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Fecha">
                <span style="font-weight:500;">${fechaStr}</span>
            </td>
            
            <td data-label="Incidencia">
                <div style="text-align: right;">
                    <div style="margin-bottom: 4px;">
                        ${priorityBadge} 
                        <strong>${r.tipo || 'Error'}</strong>
                    </div>
                    
                    <div class="desc-truncate" style="margin-left: auto;">
                        ${r.descripcion}
                    </div>
                    
                    <div class="text-muted" style="font-size: 0.85em; margin-top: 2px;">
                        ${r.moduloUsuario || 'Módulo N/A'}
                    </div>
                    
                    ${ticketBadge}
                    
                    ${tieneEvidencia ? 
                        `<div style="margin-top:5px;">
                            <i class="fas fa-paperclip" style="color:var(--primary-color); cursor:pointer;" onclick="window.verEvidenciaPorId('${r.id}')"></i> 
                            <span style="font-size:0.8em; color:var(--primary);">Evidencia</span>
                         </div>` 
                        : ''}
                </div>
            </td>
            
            <td data-label="Proyecto">
                <span class="badge badge-secondary">${proyecto}</span>
            </td>
            
            <td data-label="Usuario">
                <div class="user-cell">
                    <div style="text-align:right; line-height:1.2;">
                        <span style="font-weight:600; display:block;">${userName}</span>
                        <span style="font-size:0.75em; opacity:0.7;">${userEmail}</span>
                    </div>
                    <i class="fas fa-user-circle" style="font-size:1.5rem; color:#ccc;"></i> 
                </div>
            </td>
            
            <td data-label="Acciones">
                <div class="action-group">
                    <button class="btn-icon" onclick="window.verDetallesTecnicos('${r.id}')" title="Ver Detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    
                    <button class="btn-status-pill" onclick="window.cambiarEstado('${r.id}', '${r.estado}')" 
                            style="border-color: ${statusColor}; color: ${statusColor}; ">
                        ${r.estado} <i class="fas fa-chevron-down" style="font-size:0.8em; margin-left:5px;"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);

        // ========== TARJETAS MÓVIL ==========
        const card = document.createElement('div');
        card.className = 'ticket-card';
        card.innerHTML = `
            <div class="card-row">
                <div class="card-label">Fecha</div>
                <div class="card-value">${fechaStr}</div>
            </div>
            
            <div class="card-row">
                <div class="card-label">Prioridad</div>
                <div class="card-value">${priorityBadge}</div>
            </div>
            
            <div class="card-row">
                <div class="card-label">Tipo</div>
                <div class="card-value"><strong>${r.tipo || 'Error'}</strong></div>
            </div>
            
            <div class="card-row">
                <div class="card-label">Incidencia</div>
                <div class="card-value">
                    <div style="text-align: right; line-height: 1.4;">
                        <div class="desc-truncate" style="white-space: normal;">${r.descripcion}</div>
                        <div class="text-muted" style="font-size: 0.85em; margin-top: 2px;">
                            ${r.moduloUsuario || 'Módulo N/A'}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card-row">
                <div class="card-label">Proyecto</div>
                <div class="card-value"><span class="badge badge-secondary">${proyecto}</span></div>
            </div>
            
            <div class="card-row">
                <div class="card-label">Usuario</div>
                <div class="card-value">
                    <div style="text-align: right;">
                        <span style="font-weight:600;">${userName}</span><br>
                        <span style="font-size:0.8em; opacity:0.7;">${userEmail}</span>
                    </div>
                </div>
            </div>
            
            <div class="card-row">
                <div class="card-label">Estado</div>
                <div class="card-value">
                    <button class="btn-status-pill" onclick="window.cambiarEstado('${r.id}', '${r.estado}')" 
                            style="border-color: ${statusColor}; color: ${statusColor};">
                        ${r.estado}
                    </button>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="action-btn" onclick="window.verDetallesTecnicos('${r.id}')" title="Ver Detalles">
                    <i class="fas fa-eye"></i> Detalles
                </button>
                
                ${tieneEvidencia ? 
                    `<button class="action-btn" onclick="window.verEvidenciaPorId('${r.id}')" title="Ver Evidencia">
                        <i class="fas fa-paperclip"></i> Evidencia
                    </button>` 
                    : ''}
                
                ${r.ticketAsociado ? 
                    `<span class="badge" style="background:var(--primary); color:white;">
                        <i class="fas fa-ticket-alt"></i> Ticket
                    </span>` 
                    : ''}
            </div>
        `;
        mobileContainer.appendChild(card);
    });
}
    // --- ACCIONES ASÍNCRONAS ---

    window.cambiarEstado = async (id, estadoActual) => {
        const { value: nuevoEstado } = await Swal.fire({
            title: 'Actualizar Estado',
            input: 'select',
            inputOptions: {
                'Pendiente': '🔴 Pendiente',
                'En Proceso': '🟡 En Proceso',
                'Resuelto': '🟢 Resuelto',
                'Descartado': '⚪ Descartado'
            },
            inputValue: estadoActual,
            showCancelButton: true,
            confirmButtonColor: '#6C43E0'
        });

        if (nuevoEstado && nuevoEstado !== estadoActual) {
            // 1. ACTUALIZACIÓN LOCAL (UI OPTIMISTA)
            const reportIndex = allReports.findIndex(r => r.id === id);
            
            if (reportIndex !== -1) {
                // Actualizamos la memoria local
                allReports[reportIndex].estado = nuevoEstado;
                
                // Repintamos SOLO la tabla (manteniendo filtros)
                // ¡SIN RECARGAR LA PÁGINA NI FETCH AL SERVIDOR!
                applyFilters(); 
                updateKPIs(allReports);
                
                const Toast = Swal.mixin({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
                });
                Toast.fire({ icon: 'success', title: 'Estado actualizado' });
            }

            // 2. ACTUALIZACIÓN EN SEGUNDO PLANO
            try {
                await firebase.firestore().collection('reportesSistema').doc(id).update({
                    estado: nuevoEstado
                });
                console.log("✅ Sync Firebase OK");
            } catch (e) {
                console.error("Error sincronizando:", e);
                // Si falla, revertimos el cambio visual
                if (reportIndex !== -1) {
                    allReports[reportIndex].estado = estadoActual;
                    applyFilters(); // Revertir visualmente
                }
                Swal.fire('Error', 'No se pudo guardar el cambio', 'error');
            }
        }
    };

    // Funciones auxiliares
    function updateKPIs(data) {
        const count = (statusArr) => data.filter(r => statusArr.includes(r.estado)).length;
        document.getElementById('countPending').textContent = count(['Pendiente']);
        document.getElementById('countProcess').textContent = count(['En Revisión', 'En Proceso']);
        document.getElementById('countSolved').textContent = count(['Resuelto', 'Finalizado']);
        document.getElementById('countDescarted').textContent = count(['Descartado']);
    }

    function renderEmptyState() {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px;">No hay reportes.</td></tr>`;
        updateKPIs([]);
    }

    window.verEvidenciaPorId = (id) => {
        const report = allReports.find(r => r.id === id);
        if (report) {
            const evidencia = report.capturaPantallaBase64 || report.capturaPantallaUrl;
            evidencia ? window.verEvidencia(evidencia) : Swal.fire('Info', 'No se encontró la imagen.', 'info');
        }
    };

    window.verEvidencia = (data) => {
        const config = { imageUrl: data, imageAlt: 'Evidencia', width: '90%', showConfirmButton: false, showCloseButton: true, background: '#fff' };
        window.showCustomAlert ? window.showCustomAlert(config) : Swal.fire(config);
    };

    window.verDetallesTecnicos = (id) => {
        const report = allReports.find(r => r.id === id);
        if(!report) return;
        const ctx = report.contextoTecnico || {};
        const tieneEvidencia = report.capturaPantallaBase64 || report.capturaPantallaUrl;

        let botonTicketHtml = '';
        if (report.ticketAsociado) {
            botonTicketHtml = `<div style=" padding:10px; border-radius:6px; border:1px solid #c8e6c9; margin-bottom:15px; text-align:center;"><strong style="color: #2e7d32;"><i class="fas fa-check-circle"></i> Gestionado</strong><br><small>Ticket: <b>${report.ticketAsociado}</b></small></div>`;
        } else {
            botonTicketHtml = `<button class="btn-primary" style="width:100%; padding:12px; border-radius:6px; font-weight:bold; margin-bottom:15px; border:none; background-color:var(--primary-color); color:white;" onclick="window.prepararTicketAdmin('${id}')"><i class="fas fa-ticket-alt"></i> LEVANTAR TICKET</button>`;
        }

        const htmlDetails = `
            <div style="text-align:left; font-size:0.9rem;">
                ${botonTicketHtml}
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div><strong>Prioridad:</strong><br> ${report.prioridad || 'Media'}</div>
                    <div><strong>Origen:</strong><br> ${report.origenDetectado}</div>
                </div>
                <p><strong>Navegador:</strong> <span class="text-muted">${ctx.navegador || 'N/A'}</span></p>
                <hr class="separator">
                <p><strong>Descripción:</strong></p>
                <div class="content-box" style="padding:10px; border-radius:4px; max-height:120px; overflow-y:auto; border:1px solid var(--secondary-color); margin-bottom:15px;">${report.descripcion}</div>
                ${tieneEvidencia ? `<div style="text-align:center;"><button class="btn-secondary" style="width:100%; padding:10px; border-radius:6px; font-weight:bold; border:none; background-color:var(--secondary-color); color:white;" onclick="window.verEvidenciaPorId('${id}')"><i class="fas fa-camera"></i> Ver Captura</button></div>` : ''}
            </div>
        `;
        const config = { title: `Reporte #${id.substr(0,5)}`, html: htmlDetails, showConfirmButton: false, showCloseButton: true };
        window.showCustomAlert ? window.showCustomAlert(config) : Swal.fire(config);
    };

    window.prepararTicketAdmin = (reportId) => {
        const report = allReports.find(r => r.id === reportId);
        if (!report) return;
        
        // --- AQUÍ ASEGURAMOS QUE LA PRIORIDAD PASE ---
        console.log("Enviando prioridad:", report.prioridad); // Debug

        const prefillData = {
            origenReporteId: report.id,
            titulo: `[SOPORTE] ${report.tipo} en ${report.moduloUsuario || 'Sistema'}`,
            descripcion: `Ticket generado desde Reporte de Sistema.\n\n📝 Descripción Original:\n${report.descripcion}\n\n📍 Origen: ${report.origenDetectado}`,
            // Usamos la prioridad del reporte, si no tiene, default 'Media'
            prioridad: report.prioridad || 'Media',
            tipoTicket: 'administracion' 
        };
        sessionStorage.setItem('ticketPrefillData', JSON.stringify(prefillData));
        window.location.href = '../nuevo-ticket/nuevo-ticket.html';
    };

    document.addEventListener('DOMContentLoaded', initPage);
})();