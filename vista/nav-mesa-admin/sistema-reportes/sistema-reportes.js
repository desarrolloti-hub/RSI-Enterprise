(function() {
    'use strict';

    const tableBody = document.getElementById('reportsTableBody');
    let allReports = []; // Cache local para filtrado rápido

    // Inicialización
    const initPage = () => {
        // Esperar a que Firebase cargue
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }
        loadSystemReports();
    };

    // 1. CARGAR REPORTES DE FIRESTORE
    async function loadSystemReports() {
        const db = firebase.firestore();
        
        try {
            // Referencia a la colección PLURAL correcta
            let query = db.collection('reportesSistemas').orderBy('fechaCreacion', 'desc').limit(50);

            /* // --- FUTURO: FILTRO POR PROYECTO ---
            // const projectID = document.getElementById('projectFilter')?.value;
            // if(projectID && projectID !== 'all') {
            //    query = query.where('projectId', '==', projectID);
            // }
            */

            const snapshot = await query.get();

            if (snapshot.empty) {
                renderEmptyState();
                return;
            }

            allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderReports(allReports);
            updateKPIs(allReports);

        } catch (error) {
            console.error("Error cargando reportes:", error);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-error">Error de conexión: ${error.message}</td></tr>`;
        }
    }

    // 2. RENDERIZADO DE TABLA
    function renderReports(reports) {
        tableBody.innerHTML = '';

        reports.forEach(r => {
            // Procesar Fechas
            let fechaStr = 'Sin fecha';
            if (r.fechaCreacion && r.fechaCreacion.seconds) {
                fechaStr = new Date(r.fechaCreacion.seconds * 1000).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                });
            }

            // Badges de Estado
            let statusClass = 'status-pendiente';
            if (r.estado === 'En Revisión' || r.estado === 'En Proceso') statusClass = 'status-revisando';
            if (r.estado === 'Resuelto' || r.estado === 'Finalizado') statusClass = 'status-resuelto';

            // Usuario
            const userEmail = r.creadoPor?.email || 'Anónimo';
            const userBadge = r.creadoPor?.uid ? '<i class="fas fa-user-check text-success"></i>' : '<i class="fas fa-user-secret"></i>';

            // Fila HTML
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><small>${fechaStr}</small></td>
                <td>
                    <div class="user-cell">
                        ${userBadge} <span>${userEmail}</span>
                    </div>
                </td>
                <td>
                    <strong>${r.moduloUsuario || r.origenReporte}</strong><br>
                    <small class="text-muted">${r.tipo} • ${r.prioridad}</small>
                </td>
                <td style="max-width: 300px;">
                    <div class="desc-truncate">${r.descripcion}</div>
                </td>
                <td class="text-center">
                    ${r.capturaPantallaUrl 
                        ? `<button class="btn-icon" onclick="window.verEvidencia('${r.capturaPantallaUrl}')"><i class="fas fa-image"></i></button>` 
                        : '<span class="text-muted">-</span>'}
                </td>
                <td><span class="badge ${statusClass}">${r.estado}</span></td>
                <td class="text-center">
                    <button class="btn-action" onclick="window.verDetallesTecnicos('${r.id}')" title="Ver Info Técnica">
                        <i class="fas fa-microchip"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="window.cambiarEstado('${r.id}', '${r.estado}')" title="Gestionar">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // 3. ACTUALIZAR KPIs
    function updateKPIs(data) {
        // Normalizamos los strings para contar bien
        const count = (statusArr) => data.filter(r => statusArr.includes(r.estado)).length;

        document.getElementById('countPending').textContent = count(['Pendiente']);
        document.getElementById('countProcess').textContent = count(['En Revisión', 'En Proceso']);
        document.getElementById('countSolved').textContent = count(['Resuelto', 'Finalizado']);
    }

    function renderEmptyState() {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 40px;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #2ecc71; margin-bottom:10px;"></i>
                    <p>No hay reportes activos. ¡Buen trabajo!</p>
                </td>
            </tr>`;
        updateKPIs([]);
    }

    // --- FUNCIONES GLOBALES (Expuestas a window) ---

    // A. Ver Evidencia (Imagen)
    window.verEvidencia = (url) => {
        Swal.fire({
            imageUrl: url,
            imageAlt: 'Captura de pantalla',
            width: '80%',
            showConfirmButton: false,
            showCloseButton: true,
            background: '#fff'
        });
    };

    // B. Ver Detalles Técnicos (JSON Viewer Bonito)
    window.verDetallesTecnicos = (id) => {
        const report = allReports.find(r => r.id === id);
        if(!report) return;

        const ctx = report.contextoTecnico || {};
        
        // Creamos una tabla HTML para el modal
        const htmlDetails = `
            <div style="text-align: left; font-size: 0.9rem;">
                <p><strong>🆔 ID Reporte:</strong> ${id}</p>
                <p><strong>🌐 URL Origen:</strong> <a href="${ctx.urlActual || '#'}" target="_blank">Link</a></p>
                <hr>
                <table style="width:100%; border-collapse: collapse;">
                    <tr><td style="padding:4px;"><strong>💻 Resolución:</strong></td><td>${ctx.resolucionPantalla || 'N/A'}</td></tr>
                    <tr><td style="padding:4px;"><strong>🌍 Navegador:</strong></td><td>${ctx.navegador || 'N/A'}</td></tr>
                    <tr><td style="padding:4px;"><strong>📱 Plataforma:</strong></td><td>${ctx.plataforma || 'N/A'}</td></tr>
                    <tr><td style="padding:4px;"><strong>📡 Online:</strong></td><td>${ctx.online !== undefined ? ctx.online : '?'}</td></tr>
                </table>
                <hr>
                <p><strong>📝 Descripción completa:</strong></p>
                <div style="background:#f5f5f5; padding:10px; border-radius:4px; max-height:100px; overflow-y:auto;">
                    ${report.descripcion}
                </div>
            </div>
        `;

        Swal.fire({
            title: 'Diagnóstico Técnico',
            html: htmlDetails,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#333'
        });
    };

    // C. Cambiar Estado
    window.cambiarEstado = async (id, estadoActual) => {
        const { value: nuevoEstado } = await Swal.fire({
            title: 'Actualizar Estado',
            input: 'select',
            inputOptions: {
                'Pendiente': '🔴 Pendiente',
                'En Proceso': '🟡 En Proceso / Revisión',
                'Resuelto': '🟢 Resuelto / Cerrado',
                'Descartado': '⚪ Descartado (No es bug)'
            },
            inputValue: estadoActual,
            showCancelButton: true,
            confirmButtonColor: '#6C43E0',
            confirmButtonText: 'Guardar Cambio'
        });

        if (nuevoEstado && nuevoEstado !== estadoActual) {
            try {
                await firebase.firestore().collection('reportesSistemas').doc(id).update({
                    estado: nuevoEstado,
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                Swal.fire({
                    toast: true, position: 'top-end', 
                    icon: 'success', title: 'Estado actualizado', 
                    showConfirmButton: false, timer: 1500
                });
                
                loadSystemReports(); // Recargar tabla
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    };

    // Iniciar
    document.addEventListener('DOMContentLoaded', initPage);

})();