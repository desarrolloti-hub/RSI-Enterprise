(function() {
    'use strict';

    const auth = firebase.auth();

    const tableBody = document.getElementById('reportsTableBody');
    let allReports = []; 

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }
        loadSystemReports();
    };

    // 1. CARGAR REPORTES
    async function loadSystemReports() {
        const db = firebase.firestore();
        try {
            // Ordenamos por fecha de creación descendente
            let query = db.collection('reportesSistema').orderBy('fechaCreacion', 'desc').limit(50);
            
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
            tableBody.innerHTML = `<tr><td colspan="5" class="text-error">Error: ${error.message}</td></tr>`;
        }
    }

    // 2. RENDERIZADO DE TABLA (Ajustado a tus columnas)
    function renderReports(reports) {
        tableBody.innerHTML = '';

        reports.forEach(r => {
            // A. FECHA
            let fechaStr = '---';
            if (r.fechaCreacion && r.fechaCreacion.seconds) {
                fechaStr = new Date(r.fechaCreacion.seconds * 1000).toLocaleDateString('es-MX', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                });
            }

            // B. PROYECTO (Lógica a futuro: si el campo existe úsalo, si no 'General')
            const proyecto = r.proyecto || 'RSI Enterprise'; // Puedes cambiar el default aquí
            const proyectoBadge = `<span class="badge badge-secondary" style="font-size: 0.75rem;">${proyecto}</span>`;

            // C. USUARIO
            const userEmail = r.creadoPor?.email || 'Anónimo';
            const userName = r.creadoPor?.displayName || userEmail.split('@')[0];

            //D. Evidencia
            const tieneEvidencia = r.capturaPantallaBase64 || r.capturaPantallaUrl ? true : false;

            // E. ESTADO (Clase para el color del puntito o texto)
            let statusColor = 'var(--text-color)';
            if (r.estado === 'Pendiente') statusColor = 'var(--danger)'; 
            if (r.estado === 'En Proceso') statusColor = 'var(--warning)';
            if (r.estado === 'Resuelto') statusColor = 'var(--success)';

            // --- CONSTRUCCIÓN DE FILA ---
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><small>${fechaStr}</small></td>

                <td>
                    <div style="display:flex; align-items:flex-start; gap:10px;">
                        <div>
                            <strong>${r.tipo || 'Error'}:</strong> <span class="desc-truncate">${r.descripcion}</span>
                            <br>
                            <small class="text-muted"><i class="fas fa-layer-group"></i> ${r.moduloUsuario || 'Módulo desconocido'}</small>
                        </div>
                        ${r.capturaPantallaUrl ? 
                            `<i class="fas fa-image" style="cursor:pointer; color:var(--primary-color); margin-top:3px;" 
                                onclick="window.verEvidencia('${r.capturaPantallaUrl}')" title="Ver evidencia"></i>` 
                            : ''}
                    </div>
                </td>

                <td>${proyectoBadge}</td>

                <td>
                    <div class="user-cell">
                        <i class="fas fa-user-circle"></i> 
                        <span title="${userEmail}">${userName}</span>
                    </div>
                </td>

                <td class="text-center">
                    <div class="action-group">
                        <button class="btn-action" onclick="window.verDetallesTecnicos('${r.id}')" title="Ver Detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        
                        <button class="btn-status-pill" onclick="window.cambiarEstado('${r.id}', '${r.estado}')" style="border-color: ${statusColor}; color: ${statusColor}">
                            ${r.estado} <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // 3. ACTUALIZAR KPIs
    function updateKPIs(data) {
        const count = (statusArr) => data.filter(r => statusArr.includes(r.estado)).length;
        document.getElementById('countPending').textContent = count(['Pendiente']);
        document.getElementById('countProcess').textContent = count(['En Revisión', 'En Proceso']);
        document.getElementById('countSolved').textContent = count(['Resuelto', 'Finalizado']);
    }

    function renderEmptyState() {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px;">No hay reportes.</td></tr>`;
        updateKPIs([]);
    }

    // --- FUNCIONES GLOBALES ---

    window.verEvidenciaPorId = (id) => {
        const report = allReports.find(r => r.id === id);
        if (report) {
            // Prioridad: Base64 (Opción 1) > URL (Opción antigua)
            const evidencia = report.capturaPantallaBase64 || report.capturaPantallaUrl;
            if (evidencia) {
                window.verEvidencia(evidencia);
            } else {
                Swal.fire('Info', 'No se encontró la imagen.', 'info');
            }
        }
    };

    //Visualzador de evidencia
    window.verEvidencia = (data) => {
        const config = {
            imageUrl: data,
            imageAlt: 'Evidencia',
            width: '90%', // Más grande para ver bien
            showConfirmButton: false,
            showCloseButton: true,
            background: '#fff' // Fallback
        };
        if (window.showCustomAlert) {
            window.showCustomAlert(config);
        }else{
            Swal.fire(config);
        }
    }

    window.verDetallesTecnicos = (id) => {
        const report = allReports.find(r => r.id === id);
        if(!report) return;
        const ctx = report.contextoTecnico || {};

        const tieneEvidencia = report.capturaPantallaBase64 || report.capturaPantallaUrl ? true : false;
        
        const htmlDetails = `
            <div style="text-align: left; font-size: 0.9rem;">
                <p><strong>Origen:</strong> ${report.origenDetectado}</p>
                <hr class="separator">
                <p><strong>Navegador:</strong> ${ctx.navegador || 'N/A'}</p>
                <p><strong>Resolución:</strong> ${ctx.resolucionPantalla || 'N/A'}</p>
                <hr class="separator">
                <p><strong>Descripción Completa:</strong></p>
                <div class="content-box" style="padding:10px; border-radius:4px; max-height:150px; overflow-y:auto; border:1px solid var(--secondary-color);">
                    ${report.descripcion}
                </div>

                ${tieneEvidencia ? `<div style="text-align: center;">
                        <button class="btn-secondary" style="width: 100%; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 20px;" 
                            onclick="window.verEvidenciaPorId('${id}')">
                            <i class="fas fa-camera"></i> Ver Captura de Pantalla
                        </button>
                    </div>
                ` : '<div style="text-align:center; color:#999; font-style:italic;">Sin evidencia visual adjunta</div>'}
              </div>             
        `;

        const config = { title: 'Detalles Técnicos', html: htmlDetails, confirmButtonText: 'Cerrar' };
        window.showCustomAlert ? window.showCustomAlert(config) : Swal.fire(config);
    };

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
            confirmButtonColor: '#6C43E0' // Fallback si no carga personalización
        });

        if (nuevoEstado && nuevoEstado !== estadoActual) {
            try {
                await firebase.firestore().collection('reportesSistema').doc(id).update({
                    estado: nuevoEstado
                });
                
                // Recargar
                loadSystemReports(); 
                
                const toastConfig = {
                    toast: true, position: 'top-end', icon: 'success', 
                    title: 'Estado actualizado', showConfirmButton: false, timer: 1500
                };
                window.showCustomAlert ? window.showCustomAlert(toastConfig) : Swal.fire(toastConfig);

            } catch (e) {
                console.error(e);
            }
        }
    };

    document.addEventListener('DOMContentLoaded', initPage);
})();