// admin-catalogo.js
(function() {
    'use strict';

    const initPage = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(initPage, 100);
            return;
        }

        const db = firebase.firestore();
        
        // Elementos DOM
        const loader = document.getElementById('loader');
        const productsContainer = document.getElementById('products-container');
        const newReleasesContainer = document.getElementById('new-releases');
        const bestSellersContainer = document.getElementById('best-sellers');
        
        // Modales
        const quickViewModal = document.getElementById('quick-view-modal');
        const detailView = document.getElementById('detail-view');
        const defaultImage = "https://rsienterprise.web.app/vista/css/img/Logo-RSI-OFICIAL.png";

        // Formateador de moneda
        const formatMoney = (amount) => {
            return new Intl.NumberFormat('es-MX', { 
                style: 'currency', currency: 'MXN' 
            }).format(amount || 0);
        };

        // 1. Cargar Productos
        async function fetchProducts() {
            try {
                // Nuevos lanzamientos (ordenados por fecha, simulado por ahora si no hay campo fecha)
                // Nota: Usamos 'FechaIngreso' o 'timestamp' según tu BD. Si no existe, ordenamos por defecto.
                const newReleasesSnapshot = await db.collection('Productos')
                    .limit(8)
                    .get();

                // Más vendidos (simulado con limit por ahora)
                const bestSellersSnapshot = await db.collection('Productos')
                    .limit(8)
                    .get();

                const newReleasesData = newReleasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const bestSellersData = bestSellersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Renderizar
                renderProducts(newReleasesData, newReleasesContainer);
                renderProducts(bestSellersData, bestSellersContainer); // Puedes filtrar diferente si tienes campo 'ventas'

                loader.style.display = 'none';
                productsContainer.style.display = 'block';

            } catch (err) {
                console.error("Error:", err);
                loader.innerHTML = `<p class="text-danger">Error al cargar productos.</p>`;
            }
        }

        function renderProducts(products, container) {
            container.innerHTML = '';
            
            if (products.length === 0) {
                container.innerHTML = '<div class="col-12 text-center text-muted">No se encontraron productos</div>';
                return;
            }

            products.forEach(product => {
                const img = (product.Imagenes && product.Imagenes.length > 0) ? product.Imagenes[0] : defaultImage;
                const nombre = product['Nombre Producto'] || 'Producto sin nombre';
                const precio = formatMoney(product['Precio MXN']);

                const card = document.createElement('div');
                card.className = 'product-card card';
                card.innerHTML = `
                    <div class="card-img-top-wrapper">
                        <img src="${img}" alt="${nombre}" onerror="this.src='${defaultImage}'">
                        <button class="quick-view-btn" title="Vista Rápida">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    <div class="card-body p-3">
                        <h6 class="card-title text-truncate" title="${nombre}">${nombre}</h6>
                        <div class="price-tag">${precio}</div>
                    </div>
                `;

                // Eventos
                card.querySelector('.quick-view-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    abrirVistaRapida(product);
                });

                card.addEventListener('click', () => {
                    abrirDetalleCompleto(product);
                });

                container.appendChild(card);
            });
        }

        // 2. Vista Rápida
        function abrirVistaRapida(product) {
            const img = (product.Imagenes && product.Imagenes.length > 0) ? product.Imagenes[0] : defaultImage;
            
            document.getElementById('qv-image').src = img;
            document.getElementById('qv-name').textContent = product['Nombre Producto'] || 'Sin nombre';
            document.getElementById('qv-price').textContent = formatMoney(product['Precio MXN']);
            
            // Configurar botón "Ver más"
            const btnVerMas = document.getElementById('btn-ver-detalle-completo');
            // Clonar para eliminar listeners anteriores
            const newBtn = btnVerMas.cloneNode(true);
            btnVerMas.parentNode.replaceChild(newBtn, btnVerMas);
            
            newBtn.addEventListener('click', () => {
                quickViewModal.classList.remove('active');
                abrirDetalleCompleto(product);
            });

            quickViewModal.classList.add('active');
        }

        document.getElementById('close-quick-view').addEventListener('click', () => {
            quickViewModal.classList.remove('active');
        });

        // Cerrar al hacer clic fuera
        quickViewModal.addEventListener('click', (e) => {
            if (e.target === quickViewModal) quickViewModal.classList.remove('active');
        });

        // 3. Vista Detalle Completo
        function abrirDetalleCompleto(product) {
            const img = (product.Imagenes && product.Imagenes.length > 0) ? product.Imagenes[0] : defaultImage;
            
            // Llenar datos básicos
            document.getElementById('detail-image').src = img;
            document.getElementById('detail-name').textContent = product['Nombre Producto'];
            document.getElementById('detail-sku').textContent = `SKU: ${product.SKU || 'N/A'}`;
            document.getElementById('detail-price').textContent = formatMoney(product['Precio MXN']);
            
            // Datos Técnicos
            document.getElementById('detail-brand').textContent = product.Marca || 'N/A';
            document.getElementById('detail-model').textContent = product.Modelo || 'N/A';
            document.getElementById('detail-category').textContent = product.Categoria || 'N/A';
            document.getElementById('detail-type').textContent = product.Tipo || 'N/A';
            
            // Estructura (Opcional)
            const structContainer = document.getElementById('struct-row');
            if (product.Estructura) {
                document.getElementById('detail-structure').textContent = product.Estructura;
                structContainer.style.display = 'flex';
            } else {
                structContainer.style.display = 'none';
            }

            // Especificaciones
            document.getElementById('detail-specs').textContent = product.Especificaciones || 'Sin especificaciones detalladas.';

            // Link
            const linkDiv = document.getElementById('detail-link-container');
            const linkTag = document.getElementById('detail-link');
            if (product['Link de producto']) {
                linkTag.href = product['Link de producto'];
                linkDiv.style.display = 'block';
            } else {
                linkDiv.style.display = 'none';
            }

            // Galería
            const galleryDiv = document.getElementById('detail-gallery');
            galleryDiv.innerHTML = '';
            if (product.Imagenes && product.Imagenes.length > 1) {
                product.Imagenes.forEach(imgSrc => {
                    const thumb = document.createElement('img');
                    thumb.src = imgSrc;
                    thumb.className = 'gallery-thumb';
                    thumb.onclick = () => document.getElementById('detail-image').src = imgSrc;
                    galleryDiv.appendChild(thumb);
                });
            }

            detailView.classList.add('active');
            document.body.style.overflow = 'hidden'; // Bloquear scroll del body
        }

        function cerrarDetalle() {
            detailView.classList.remove('active');
            document.body.style.overflow = ''; // Restaurar scroll
        }

        document.getElementById('close-detail').addEventListener('click', cerrarDetalle);

        // Iniciar
        fetchProducts();
    };

    initPage();
})();