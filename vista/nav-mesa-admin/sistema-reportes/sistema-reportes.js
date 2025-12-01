// js/modules/admin-reportes-sistema.js
(function() {
    'use strict';

    // Función de inicialización que espera a firebase-init.js
    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        const tableBody = document.getElementById('reportsTableBody');

        // Validar que estemos en la página correcta (que tenga la tabla)
        if (!tableBody) return;

        // 1. CARGAR REPORTES
        async function loadSystemReports() {
            try {
                // Mostrar estado de carga
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;"><div class="spinner-border text-primary"></div> Cargando...</td></tr>';

                const snapshot = await db.collection('reportes_sistema')
                    .orderBy('createdAt', 'desc')
                    .limit(50)
                    .get();

                if (snapshot.empty) {
                    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;" class="text-muted">No hay reportes de sistema. ¡Todo funciona bien! 🎉</td></tr>';
                    updateCounters([]);
                    return;
                }

                let reports = [];
                snapshot.forEach(doc => {
                    reports.push({ id: doc.id, ...doc.data() });
                });

                renderReports(reports);
                updateCounters(reports);

            } catch (error) {
                console.error("Error:", error);
                tableBody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Error al cargar: ${error.message}</td></tr>`;
            }
        }

        // 2. RENDERIZAR
        function renderReports(reports) {
            tableBody.innerHTML = '';

            reports.forEach(r => {
                // Formato de fecha
                let date = 'N/A';
                if(r.createdAt && r.createdAt.seconds) {
                    date = new Date(r.createdAt.seconds * 1000).toLocaleDateString() + ' ' + new Date(r.createdAt.seconds * 1000).toLocaleTimeString();
                }
                
                // Clases CSS según datos (Mapeo a badges de Bootstrap si usas ese framework, o tus clases custom)
                let typeBadge = `<span class="badge bg-secondary">${r.type}</span>`;
                if(r.type === 'Bug') typeBadge = `<span class="badge bg-danger">Bug</span>`;
                if(r.type === 'UX') typeBadge = `<span class="badge bg-info text-dark">UX</span>`;
                if(r.type === 'Mejora') typeBadge = `<span class="badge bg-success">Mejora</span>`;

                let statusBadge = `<span class="badge bg-warning text-dark">${r.status}</span>`;
                if(r.status === 'En Revisión') statusBadge = `<span class="badge bg-primary">En Revisión</span>`;
                if(r.status === 'Resuelto') statusBadge = `<span class="badge bg-success">Resuelto</span>`;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${date}</td>
                    <td><strong>${r.user || 'Anónimo'}</strong><br><small class="text-muted">${r.module || 'General'}</small></td>
                    <td>${typeBadge}</td>
                    <td style="max-width: 300px; white-space: normal;">${r.description}</td>
                    <td>
                        ${r.image ? `<button onclick="window.viewEvidence('${r.image}')" class="btn btn-sm btn-outline-secondary"><i class="fas fa-image"></i></button>` : '<span class="text-muted">-</span>'}
                    </td>
                    <td>${r.priority}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="window.updateStatus('${r.id}', '${r.status}')" title="Cambiar Estado">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        // 3. CONTADORES
        function updateCounters(reports) {
            const pending = reports.filter(r => r.status === 'Pendiente').length;
            const review = reports.filter(r => r.status === 'En Revisión').length;
            const solved = reports.filter(r => r.status === 'Resuelto').length;

            const elPending = document.getElementById('countPending');
            const elReview = document.getElementById('countReview');
            const elSolved = document.getElementById('countSolved');

            if(elPending) elPending.textContent = pending;
            if(elReview) elReview.textContent = review;
            if(elSolved) elSolved.textContent = solved;
        }

        // --- FUNCIONES GLOBALES (Asignadas a window para que el HTML las vea) ---

        // Actualizar Estado
        window.updateStatus = async (id, currentStatus) => {
            const { value: newStatus } = await Swal.fire({
                title: 'Actualizar Estado',
                input: 'select',
                inputOptions: {
                    'Pendiente': 'Pendiente',
                    'En Revisión': 'En Revisión',
                    'Resuelto': 'Resuelto ✅'
                },
                inputValue: currentStatus,
                showCancelButton: true,
                background: getComputedStyle(document.body).getPropertyValue('--card-bg'),
                color: getComputedStyle(document.body).getPropertyValue('--text-color')
            });

            if (newStatus && newStatus !== currentStatus) {
                try {
                    await db.collection('reportes_sistema').doc(id).update({
                        status: newStatus
                    });
                    
                    const Toast = Swal.mixin({
                        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
                    });
                    Toast.fire({ icon: 'success', title: 'Estado actualizado' });
                    
                    loadSystemReports(); // Recargar tabla
                } catch (error) {
                    Swal.fire('Error', error.message, 'error');
                }
            }
        };

        // Ver Evidencia
        window.viewEvidence = (base64) => {
            Swal.fire({
                imageUrl: base64,
                imageAlt: 'Evidencia',
                showConfirmButton: false,
                showCloseButton: true,
                width: 'auto',
                background: getComputedStyle(document.body).getPropertyValue('--card-bg')
            });
        };

        // Crear Reporte (Botón Flotante o de Acción)
        window.crearReporteDemo = async () => {
            // Verificar usuario actual
            const user = firebase.auth().currentUser;
            const userEmail = user ? user.email : 'Anónimo';

            const { value: formValues } = await Swal.fire({
                title: 'Reportar Incidencia',
                html: `
                    <div class="text-start">
                        <label class="small text-muted">Tipo</label>
                        <select id="swal-type" class="swal2-input mt-1">
                            <option value="Bug">🐛 Error de Sistema</option>
                            <option value="UX">🎨 Diseño / Visual</option>
                            <option value="Mejora">💡 Sugerencia</option>
                        </select>
                        <label class="small text-muted">Módulo</label>
                        <input id="swal-module" class="swal2-input mt-1" placeholder="Ej: Ventas, Login...">
                        <label class="small text-muted">Descripción</label>
                        <textarea id="swal-desc" class="swal2-textarea mt-1" placeholder="Describe qué pasó..."></textarea>
                        <label class="small text-muted">Prioridad</label>
                        <select id="swal-prio" class="swal2-input mt-1">
                            <option value="Baja">Baja</option>
                            <option value="Media" selected>Media</option>
                            <option value="Alta">Alta</option>
                        </select>
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Enviar',
                background: getComputedStyle(document.body).getPropertyValue('--card-bg'),
                color: getComputedStyle(document.body).getPropertyValue('--text-color'),
                preConfirm: () => {
                    return {
                        type: document.getElementById('swal-type').value,
                        module: document.getElementById('swal-module').value,
                        description: document.getElementById('swal-desc').value,
                        priority: document.getElementById('swal-prio').value,
                        user: userEmail,
                        status: 'Pendiente',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }
                }
            });

            if (formValues) {
                try {
                    await db.collection('reportes_sistema').add(formValues);
                    Swal.fire('Enviado', 'Reporte registrado exitosamente.', 'success');
                    loadSystemReports(); 
                } catch (error) {
                    Swal.fire('Error', 'No se pudo enviar el reporte', 'error');
                }
            }
        };

        // Iniciar carga
        loadSystemReports();
    };

    // Arrancar script
    initPage();

})();