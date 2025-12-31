// admin-clientes.js
(function() {
    'use strict';

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        
        // Elementos DOM
        const clientesBody = document.getElementById('clientes-body');
        const modalElement = document.getElementById('cliente-modal');
        const modalInstance = new bootstrap.Modal(modalElement);
        const form = document.getElementById('cliente-form');
        
        // Variables de Estado
        let allClientes = [];
        let currentPage = 1;
        const itemsPerPage = 10;
        let searchTerm = '';
        let editingId = null;

        // --- Carga Inicial ---
        loadAllClientes();

        // --- Event Listeners ---
        document.getElementById('btn-add-cliente').addEventListener('click', () => openModal());
        document.getElementById('submit-btn').addEventListener('click', saveCliente);
        
        // Buscador con Debounce (Evita sobrecarga al escribir)
        let searchTimeout;
        document.getElementById('search-input').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchTerm = e.target.value.trim().toLowerCase();
                currentPage = 1;
                renderTable();
            }, 300);
        });

        // Paginación
        document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
        document.getElementById('next-page').addEventListener('click', () => changePage(1));
        document.getElementById('first-page').addEventListener('click', () => setPage(1));
        document.getElementById('last-page').addEventListener('click', () => setPage(Math.ceil(filterClientes().length / itemsPerPage)));


        // --- Funciones Lógicas ---

        async function loadAllClientes() {
            try {
                const snapshot = await db.collection("clientes").orderBy("fechaCreacion", "desc").get();
                allClientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderTable();
            } catch (error) {
                console.error("Error cargando clientes:", error);
                clientesBody.innerHTML = '<tr><td colspan="7" class="text-danger text-center">Error al cargar datos</td></tr>';
            }
        }

        function filterClientes() {
            if (!searchTerm) return allClientes;
            return allClientes.filter(c => {
                const searchStr = `${c.razonSocialNombre} ${c.RFC} ${c.numeroCliente} ${c.Correo}`.toLowerCase();
                return searchStr.includes(searchTerm);
            });
        }

        function renderTable() {
            const filtered = filterClientes();
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
            
            // Validar página actual
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageData = filtered.slice(start, end);

            clientesBody.innerHTML = '';
            
            if (pageData.length === 0) {
                clientesBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No se encontraron registros</td></tr>';
                updatePaginationUI(0, 0, 0);
                return;
            }

            pageData.forEach(c => {
                const idCliente = c.numeroCliente || c["Numero de Cliente"] || 'N/A';
                
                const razonSocial = c.razonSocialNombre || c["Razon Social / Nombre"] || 'Sin Nombre';
                
                const rfc = c.RFC || 'Sin RFC'; // RFC usualmente no cambia
                
                const telefono = c.Telefono || 'N/A';
                const movil = c.Movil || '';
                
                const correo = c.Correo || c["Correos"] || 'N/A'; // A veces cambia el nombre del campo correo
                
                const estatus = c.Estatus || 'Desconocido';

               

                const row = `
                    <tr>
                        <td><span class="badge bg-light text-dark border">${idCliente}</span></td>
                        <td class="fw-bold text-primary">${razonSocial}</td>
                        <td>${rfc}</td>
                        <td class="small">
                            ${telefono !== 'N/A' ? `<div><i class="fas fa-phone-alt text-muted"></i> ${telefono}</div>` : ''}
                            ${movil ? `<div><i class="fas fa-mobile-alt text-muted"></i> ${movil}</div>` : ''}
                            ${telefono === 'N/A' && !movil ? '<span class="text-muted">-</span>' : ''}
                        </td>
                        <td>${correo}</td>
                        <td>
                            <span class="badge ${estatus === 'Activo' ? 'bg-success' : 'bg-secondary'}">
                                ${estatus}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary me-1 btn-edit" data-id="${c.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${c.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
                clientesBody.innerHTML += row;
            });

            updatePaginationUI(start + 1, Math.min(end, totalItems), totalItems);
            
            // Asignar eventos a botones dinámicos
            document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => openModal(b.dataset.id)));
            document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', () => deleteCliente(b.dataset.id)));
        }

        function updatePaginationUI(start, end, total) {
            document.getElementById('pagination-info').innerText = `Mostrando ${start}-${end} de ${total}`;
            document.getElementById('prev-page').disabled = currentPage === 1;
            document.getElementById('first-page').disabled = currentPage === 1;
            
            const totalPages = Math.ceil(total / itemsPerPage);
            document.getElementById('next-page').disabled = currentPage === totalPages || total === 0;
            document.getElementById('last-page').disabled = currentPage === totalPages || total === 0;
            
            // Renderizar números de página simples
            const pageNumbers = document.getElementById('page-numbers');
            pageNumbers.innerHTML = `<span class="btn btn-sm btn-light disabled border mx-1">${currentPage} / ${totalPages || 1}</span>`;
        }

        function changePage(delta) {
            currentPage += delta;
            renderTable();
        }
        function setPage(page) {
            currentPage = page;
            renderTable();
        }

       async function openModal(id = null) {
            // 1. Limpiar el formulario y variables
            form.reset();
            editingId = id;
            
            // 2. Cambiar título del modal
            document.getElementById('form-title').innerHTML = id 
                ? '<i class="fas fa-user-edit"></i> Editar Cliente' 
                : '<i class="fas fa-user-plus"></i> Nuevo Cliente';

            // 3. Si hay ID, es edición: Llenar datos
            if (id) {
                // Buscar el cliente en el array local (ya cargado)
                const cliente = allClientes.find(c => c.id === id);
                
                if (cliente) {
                    // === MAPEO HÍBRIDO (Compatibilidad Nuevo || Viejo) ===
                    
                    // Información General
                    document.getElementById('numeroCliente').value = 
                        cliente.numeroCliente || cliente["Numero de Cliente"] || '';
                        
                    document.getElementById('razonSocialNombre').value = 
                        cliente.razonSocialNombre || cliente["Razon Social / Nombre"] || '';
                        
                    document.getElementById('RFC').value = 
                        cliente.RFC || '';
                        
                    document.getElementById('nombreComercial').value = 
                        cliente.nombreComercial || cliente["Nombre Comercial"] || '';

                    // Contacto
                    document.getElementById('Telefono').value = 
                        cliente.Telefono || ''; // El nombre no cambió
                        
                    document.getElementById('Movil').value = 
                        cliente.Movil || '';
                        
                    document.getElementById('Correo').value = 
                        cliente.Correo || '';

                    // Dirección Fiscal
                    document.getElementById('Calle').value = 
                        cliente.Calle || '';
                        
                    document.getElementById('noExterior').value = 
                        cliente.noExterior || cliente["No.Exterior"] || '';
                        
                    document.getElementById('noInterior').value = 
                        cliente.noInterior || cliente["No.Interior"] || '';
                        
                    document.getElementById('Colonia').value = 
                        cliente.Colonia || '';
                        
                    document.getElementById('codigoPostal').value = 
                        cliente.codigoPostal || cliente["Codigo Postal"] || '';
                        
                    document.getElementById('Municipio').value = 
                        cliente.Municipio || '';
                        
                    document.getElementById('Estado').value = 
                        cliente.Estado || '';
                        
                    document.getElementById('Pais').value = 
                        cliente.Pais || 'MEX';

                    // Datos Comerciales
                    document.getElementById('Estatus').value = 
                        cliente.Estatus || 'Activo';
                        
                    document.getElementById('tipoPersona').value = 
                        cliente.tipoPersona || cliente["Tipo de Persona"] || 'Física';
                        
                    document.getElementById('regimenFiscal').value = 
                        cliente.regimenFiscal || cliente["Regimen fiscal"] || '';
                    
                    // Checkboxes (Verificamos si es "SI" en cualquiera de los dos formatos)
                    document.getElementById('vendeACredito').checked = 
                        (cliente.vendeACredito === "SI") || (cliente["Vende a Credito"] === "SI");
                        
                    document.getElementById('permiteFactoraje').checked = 
                        (cliente.permiteFactoraje === "SI") || (cliente["Permite factoraje financiero"] === "SI");
                        
                    document.getElementById('esTercero').checked = 
                        (cliente.esTercero === "SI") || (cliente["¿Es tercero?"] === "SI");
                }
            }
            
            // 4. Mostrar el modal usando la instancia de Bootstrap guardada
            modalInstance.show();
        }
        async function saveCliente() {
            const btn = document.getElementById('submit-btn');
            const originalText = btn.innerHTML;
            
            try {
                // Validación básica
                const razonSocial = document.getElementById('razonSocialNombre').value.trim();
                if (!razonSocial) {
                    Swal.fire('Error', 'La Razón Social es obligatoria', 'warning');
                    return;
                }

                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

                // Recolección de datos
                const data = {
                    numeroCliente: document.getElementById('numeroCliente').value,
                    razonSocialNombre: razonSocial,
                    RFC: document.getElementById('RFC').value,
                    nombreComercial: document.getElementById('nombreComercial').value,
                    Telefono: document.getElementById('Telefono').value,
                    Movil: document.getElementById('Movil').value,
                    Correo: document.getElementById('Correo').value,
                    Calle: document.getElementById('Calle').value,
                    noExterior: document.getElementById('noExterior').value,
                    noInterior: document.getElementById('noInterior').value,
                    Colonia: document.getElementById('Colonia').value,
                    codigoPostal: document.getElementById('codigoPostal').value,
                    Municipio: document.getElementById('Municipio').value,
                    Estado: document.getElementById('Estado').value,
                    Pais: document.getElementById('Pais').value,
                    Estatus: document.getElementById('Estatus').value,
                    tipoPersona: document.getElementById('tipoPersona').value,
                    regimenFiscal: document.getElementById('regimenFiscal').value,
                    vendeACredito: document.getElementById('vendeACredito').checked ? "SI" : "NO",
                    permiteFactoraje: document.getElementById('permiteFactoraje').checked ? "SI" : "NO",
                    esTercero: document.getElementById('esTercero').checked ? "SI" : "NO",
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (editingId) {
                    await db.collection("clientes").doc(editingId).update(data);
                } else {
                    data.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection("clientes").add(data);
                }

                modalInstance.hide();
                
                // Mostrar alerta personalizada
                if(window.showCustomSuccess) {
                    window.showCustomSuccess('Éxito', 'Cliente guardado correctamente');
                } else {
                    Swal.fire('Guardado', 'Operación exitosa', 'success');
                }

                loadAllClientes(); // Recargar tabla

            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo guardar el cliente', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }

        async function deleteCliente(id) {
            const confirm = await Swal.fire({
                title: '¿Eliminar cliente?',
                text: "Esta acción no se puede deshacer",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminar'
            });

            if (confirm.isConfirmed) {
                try {
                    await db.collection("clientes").doc(id).delete();
                    Swal.fire('Eliminado', 'Cliente eliminado correctamente', 'success');
                    loadAllClientes();
                } catch (error) {
                    console.error(error);
                    Swal.fire('Error', 'No se pudo eliminar', 'error');
                }
            }
        }
    };

    initPage();
})();