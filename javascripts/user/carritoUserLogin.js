// whatsapp-carrito.js - Componente autónomo para botones flotantes (versión mejorada)
(function() {
    // Botón flotante de WhatsApp
    const whatsappBtn = /*html*/ `
        <a href="https://wa.me/5551391533" class="whatsapp-float" target="_blank">
            <img src="https://cdn-icons-png.flaticon.com/512/124/124034.png" alt="WhatsApp">
        </a>
        <style>
            .whatsapp-float {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 60px;
                height: 60px;
                background-color: #25d366;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 20px rgba(37, 211, 102, 0.5);
                z-index: 1000;
                transition: all 0.3s ease;
                animation: pulse-whatsapp 2s infinite;
            }
            .whatsapp-float:hover {
                transform: scale(1.15) rotate(5deg);
                box-shadow: 0 6px 25px rgba(37, 211, 102, 0.7);
                animation: none;
            }
            .whatsapp-float img {
                width: 36px;
                height: 36px;
                transition: transform 0.3s ease;
            }
            .whatsapp-float:hover img {
                transform: scale(1.1);
            }
            @keyframes pulse-whatsapp {
                0% {
                    box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7);
                }
                70% {
                    box-shadow: 0 0 0 12px rgba(37, 211, 102, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
                }
            }
            @media (max-width: 768px) {
                .whatsapp-float {
                    width: 50px;
                    height: 50px;
                    bottom: 20px;
                    right: 20px;
                }
                .whatsapp-float img {
                    width: 30px;
                    height: 30px;
                }
            }
        </style>
    `;

    // Panel del carrito
    const cartPanel = /*html*/ `
        <div id="cart-panel" class="cart-panel">
            <div class="cart-header">
                <h3>Tu Carrito</h3>
                <button id="close-cart" class="close-cart">&times;</button>
            </div>
            <div id="cart-items" class="cart-items">
                <!-- Los productos se insertarán aquí dinámicamente -->
            </div>
            <div class="cart-footer">
                <div class="cart-total">
                    Total: <span id="cart-total">$0.00</span>
                </div>
                <button id="clear-cart-btn" class="clear-cart-btn">
                    <i class="fas fa-trash"></i> Vaciar Carrito
                </button>
                <button id="checkout-btn" class="checkout-btn">
                    <i class="fas fa-sign-in-alt"></i>Finalizar tu compra
                </button>
            </div>
        </div>
        <div id="cart-overlay" class="cart-overlay"></div>
        <style>
            .cart-panel {
                position: fixed;
                top: 0;
                right: -400px;
                width: 380px;
                height: 100vh;
                background-color: white;
                box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
                z-index: 1002;
                display: flex;
                flex-direction: column;
                transition: right 0.4s ease;
                overflow-y: auto;
            }
            .cart-panel.active {
                right: 0;
            }
            .cart-header {
                padding: 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background-color: #f8f9fa;
            }
            .cart-header h3 {
                margin: 0;
                color: #1c1948;
            }
            .close-cart {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6c757d;
                transition: color 0.3s;
            }
            .close-cart:hover {
                color: #1c1948;
            }
            .cart-items {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }
            .cart-item {
                display: flex;
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
                position: relative;
            }
            .cart-item img {
                width: 60px;
                height: 60px;
                object-fit: cover;
                border-radius: 8px;
                margin-right: 15px;
            }
            .cart-item-details {
                flex: 1;
            }
            .cart-item-title {
                font-weight: 600;
                margin-bottom: 5px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.3;
                max-height: 2.6em;
            }
            .cart-item-price {
                color: #4e54c8;
                font-weight: 600;
                margin-bottom: 5px;
            }
            .cart-item-quantity {
                display: flex;
                align-items: center;
                margin-top: 5px;
            }
            .quantity-btn {
                width: 25px;
                height: 25px;
                background: #f1f3f5;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }
            .quantity-input {
                width: 35px;
                text-align: center;
                margin: 0 5px;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 2px;
            }
            .remove-item {
                position: absolute;
                top: 5px;
                right: 5px;
                color: #dc3545;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 14px;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            .remove-item:hover {
                background-color: #f8d7da;
            }
            .cart-footer {
                padding: 20px;
                border-top: 1px solid #eee;
                background-color: #f8f9fa;
            }
            .cart-total {
                font-size: 1.2rem;
                font-weight: 600;
                margin-bottom: 15px;
                text-align: center;
            }
            .clear-cart-btn {
                width: 100%;
                padding: 10px;
                background-color: #dc3545;
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: background-color 0.3s;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .clear-cart-btn:hover {
                background-color: #bb2d3b;
            }
            .checkout-btn {
                width: 100%;
                padding: 12px;
                background-color: #4e54c8;
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: background-color 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .checkout-btn:hover {
                background-color: #1c1948;
            }
            .cart-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 1001;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            .cart-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .empty-cart {
                text-align: center;
                padding: 40px 20px;
                color: #6c757d;
            }
            @media (max-width: 480px) {
                .cart-panel {
                    width: 100%;
                    right: -100%;
                }
                .cart-item-title {
                    -webkit-line-clamp: 1;
                    max-height: 1.3em;
                }
            }
        </style>
    `;

    // Botón flotante del carrito
    const cartBtn = /*html*/ `
        <div id="floating-cart-btn" class="floating-cart-btn">
            <i class="fas fa-shopping-cart"></i>
            <span id="cart-count">0</span>
        </div>
        <style>
            .floating-cart-btn {
                position: fixed;
                bottom: 100px;
                right: 30px;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #1c1948, #4e54c8);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.5rem;
                box-shadow: 0 6px 20px rgba(28, 25, 72, 0.4);
                z-index: 1000;
                cursor: pointer;
                transition: all 0.3s ease;
                animation: bounce 2s infinite;
            }
            .floating-cart-btn:hover {
                transform: scale(1.15) rotate(5deg);
                box-shadow: 0 8px 25px rgba(28, 25, 72, 0.5);
                animation: none;
            }
            #cart-count {
                position: absolute;
                top: -5px;
                right: -5px;
                background: linear-gradient(135deg, #ff4757, #ff6b81);
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                        align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(255, 71, 87, 0.5);
                transition: transform 0.3s ease;
            }
            .floating-cart-btn:hover #cart-count {
                transform: scale(1.2);
            }
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: translateY(0);
                }
                40% {
                    transform: translateY(-10px);
                }
                60% {
                    transform: translateY(-5px);
                }
            }
            @media (max-width: 768px) {
                .floating-cart-btn {
                    width: 50px;
                    height: 50px;
                    bottom: 90px;
                    right: 20px;
                    font-size: 1.3rem;
                }
                #cart-count {
                    width: 20px;
                    height: 20px;
                    font-size: 0.7rem;
                }
            }
            @media (max-width: 480px) {
                .floating-cart-btn {
                    bottom: 80px;
                    right: 15px;
                }
            }
        </style>
    `;

    // Insertar los elementos al final del body
    document.body.insertAdjacentHTML('beforeend', whatsappBtn);
    document.body.insertAdjacentHTML('beforeend', cartPanel);
    document.body.insertAdjacentHTML('beforeend', cartBtn);

    // Definir la imagen por defecto
    const defaultImage = 'https://rsienterprise.com/vista/css/img/Logo-RSI-OFICIAL.png';

    // Funciones para el carrito
    function updateCartCount() {
        try {
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            const totalItems = cart.reduce((total, item) => {
                return total + (item.cantidad || item.quantity || 1);
            }, 0);
            const cartCountElement = document.getElementById("cart-count");
            if (cartCountElement) {
                cartCountElement.textContent = totalItems;
            }
        } catch (e) {
            console.error("Error updating cart count:", e);
            const cartCountElement = document.getElementById("cart-count");
            if (cartCountElement) {
                cartCountElement.textContent = "0";
            }
        }
    }

    function updateCartPanel() {
        try {
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            const cartItems = document.getElementById("cart-items");
            const cartTotal = document.getElementById("cart-total");
            
            if (!cartItems || !cartTotal) return;
            
            // Limpiar el panel
            if (cart.length === 0) {
                cartItems.innerHTML = '<div class="empty-cart">Tu carrito está vacío</div>';
                cartTotal.textContent = "$0.00";
                return;
            }
            
            // Calcular total
            let total = 0;
            
            // Generar HTML para cada producto
            cartItems.innerHTML = cart.map((item, index) => {
                // Compatibilidad con diferentes estructuras de datos
                const itemId = item.id || item.SKU || index;
                const itemName = item.nombre || item['Nombre Producto'] || 'Producto sin nombre';
                const itemImage = item.imagen || item.Imagenes?.[0] || defaultImage;
                const itemPrice = parseFloat(item.precio || item['Precio MXN'] || item['Precio Base'] || 0);
                const itemQuantity = parseInt(item.cantidad || item.quantity || 1);
                
                const itemTotal = itemPrice * itemQuantity;
                total += itemTotal;
                
                return `
                    <div class="cart-item" data-id="${itemId}">
                        <button class="remove-item" data-index="${index}" title="Eliminar producto">
                            <i class="fas fa-trash"></i>
                        </button>
                        <img src="${itemImage}" alt="${itemName}" onerror="this.src='${defaultImage}'">
                        <div class="cart-item-details">
                            <div class="cart-item-title">${itemName}</div>
                            <div class="cart-item-price">$${itemPrice.toFixed(2)}</div>
                            <div class="cart-item-quantity">
                                <button class="quantity-btn minus" data-index="${index}">-</button>
                                <input type="number" class="quantity-input" value="${itemQuantity}" min="1" data-index="${index}">
                                <button class="quantity-btn plus" data-index="${index}">+</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Actualizar total
            cartTotal.textContent = `$${total.toFixed(2)}`;
            
            // Añadir event listeners a los botones
            document.querySelectorAll('.plus').forEach(btn => {
                btn.addEventListener('click', () => adjustQuantity(parseInt(btn.dataset.index), 1));
            });
            
            document.querySelectorAll('.minus').forEach(btn => {
                btn.addEventListener('click', () => adjustQuantity(parseInt(btn.dataset.index), -1));
            });
            
            document.querySelectorAll('.remove-item').forEach(btn => {
                btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.index)));
            });
            
            document.querySelectorAll('.quantity-input').forEach(input => {
                input.addEventListener('change', (e) => setQuantity(parseInt(e.target.dataset.index), parseInt(e.target.value) || 1));
            });
        } catch (e) {
            console.error("Error updating cart panel:", e);
            const cartItems = document.getElementById("cart-items");
            if (cartItems) {
                cartItems.innerHTML = '<div class="empty-cart">Error al cargar el carrito</div>';
            }
        }
    }

    function adjustQuantity(index, change) {
        try {
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            
            if (cart[index]) {
                // Asegurar compatibilidad con diferentes estructuras
                if (cart[index].cantidad !== undefined) {
                    cart[index].cantidad += change;
                } else if (cart[index].quantity !== undefined) {
                    cart[index].quantity += change;
                } else {
                    cart[index].cantidad = 1 + change;
                }
                
                // Eliminar si la cantidad es menor a 1
                const currentQuantity = cart[index].cantidad || cart[index].quantity || 1;
                if (currentQuantity < 1) {
                    cart.splice(index, 1);
                } else {
                    // Asegurar que la cantidad sea al menos 1
                    if (cart[index].cantidad !== undefined) {
                        cart[index].cantidad = Math.max(1, cart[index].cantidad);
                    } else if (cart[index].quantity !== undefined) {
                        cart[index].quantity = Math.max(1, cart[index].quantity);
                    } else {
                        cart[index].cantidad = Math.max(1, 1);
                    }
                }
                
                localStorage.setItem("cart", JSON.stringify(cart));
                updateCartCount();
                updateCartPanel();
            }
        } catch (e) {
            console.error("Error adjusting quantity:", e);
        }
    }

    function setQuantity(index, quantity) {
        if (quantity < 1) return;
        
        try {
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            
            if (cart[index]) {
                // Asegurar compatibilidad con diferentes estructuras
                if (cart[index].cantidad !== undefined) {
                    cart[index].cantidad = quantity;
                } else if (cart[index].quantity !== undefined) {
                    cart[index].quantity = quantity;
                } else {
                    cart[index].cantidad = quantity;
                }
                
                localStorage.setItem("cart", JSON.stringify(cart));
                updateCartCount();
                updateCartPanel();
            }
        } catch (e) {
            console.error("Error setting quantity:", e);
        }
    }

    function removeFromCart(index) {
        try {
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            
            if (cart[index]) {
                // Obtener nombre del producto para el mensaje
                const productName = cart[index].nombre || cart[index]['Nombre Producto'] || 'Producto';
                
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: '¿Eliminar producto?',
                        text: `¿Estás seguro de que quieres eliminar "${productName}" del carrito?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#3085d6',
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            cart.splice(index, 1);
                            localStorage.setItem("cart", JSON.stringify(cart));
                            updateCartCount();
                            updateCartPanel();
                            Swal.fire(
                                '¡Eliminado!',
                                'El producto ha sido eliminado del carrito.',
                                'success'
                            );
                        }
                    });
                } else {
                    // Fallback a confirm nativo
                    if (confirm(`¿Estás seguro de que quieres eliminar "${productName}" del carrito?`)) {
                        cart.splice(index, 1);
                        localStorage.setItem("cart", JSON.stringify(cart));
                        updateCartCount();
                        updateCartPanel();
                    }
                }
            }
        } catch (e) {
            console.error("Error removing from cart:", e);
        }
    }

    function clearCart() {
        try {
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            
            if (cart.length === 0) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'info',
                        title: 'Carrito vacío',
                        text: 'Tu carrito ya está vacío.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
                return;
            }

            // Usar SweetAlert en lugar de confirm nativo
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '¿Vaciar carrito?',
                    text: "¿Estás seguro de que quieres eliminar todos los productos del carrito?",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sí, vaciar carrito',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        localStorage.removeItem("cart");
                        updateCartCount();
                        updateCartPanel();
                        Swal.fire(
                            '¡Carrito Vacio!',
                            'Tu carrito ha sido vaciado.',
                            'success'
                        );
                    }
                });
            } else {
                // Fallback a confirm nativo si SweetAlert no está cargado
                if (confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
                    localStorage.removeItem("cart");
                    updateCartCount();
                    updateCartPanel();
                }
            }
        } catch (e) {
            console.error("Error clearing cart:", e);
        }
    }

    function toggleCartPanel() {
        const panel = document.getElementById("cart-panel");
        const overlay = document.getElementById("cart-overlay");
        
        if (!panel || !overlay) return;
        
        panel.classList.toggle("active");
        overlay.classList.toggle("active");
        
        if (panel.classList.contains("active")) {
            updateCartPanel();
        }
    }

    function redirectToPay() {
        window.location.href = "../pago/pago.html";
    }

    // Función para agregar productos al carrito (expuesta globalmente)
    function addToCart(product) {
        try {
            let cart = JSON.parse(localStorage.getItem("cart")) || [];
            
            // Parsear si viene como string
            if (typeof product === "string") {
                try {
                    product = JSON.parse(product.replace(/&quot;/g, '"'));
                } catch (e) {
                    console.error("Error parsing product string:", e);
                    product = { nombre: "Producto desconocido", precio: 0 };
                }
            }
            
            // Normalizar el producto para tener una estructura consistente
            const normalizedProduct = {
                nombre: product.nombre || product['Nombre Producto'] || 'Producto sin nombre',
                precio: parseFloat(product.precio || product['Precio MXN'] || product['Precio Base'] || 0),
                imagen: product.imagen || product.Imagenes?.[0] || defaultImage,
                cantidad: 1
            };
            
            // Buscar si el producto ya existe en el carrito
            const existingProductIndex = cart.findIndex(item => {
                return (item.nombre && item.nombre === normalizedProduct.nombre) ||
                       (item['Nombre Producto'] && item['Nombre Producto'] === normalizedProduct.nombre);
            });
            
            if (existingProductIndex !== -1) {
                // Si el producto ya existe, incrementar la cantidad
                cart[existingProductIndex].cantidad += 1;
                
                // Mostrar mensaje de actualización
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Producto actualizado',
                        text: `Se ha aumentado la cantidad de "${normalizedProduct.nombre}" en tu carrito.`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            } else {
                // Si el producto no existe, agregarlo al carrito
                cart.push(normalizedProduct);
                
                // Mostrar mensaje de éxito
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Producto agregado',
                        text: `"${normalizedProduct.nombre}" se ha añadido a tu carrito.`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            }
            
            localStorage.setItem("cart", JSON.stringify(cart));
            updateCartCount();
            
            // Si el panel del carrito está abierto, actualizarlo
            const panel = document.getElementById("cart-panel");
            if (panel && panel.classList.contains("active")) {
                updateCartPanel();
            }
            
        } catch (e) {
            console.error("Error adding to cart:", e);
            
            // Mostrar mensaje de error
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo agregar el producto al carrito.',
                });
            }
        }
    }

    // Inicializar carrito
    function initCart() {
        updateCartCount();
        
        // Evento para el botón del carrito
        const cartBtn = document.getElementById("floating-cart-btn");
        if (cartBtn) {
            cartBtn.addEventListener("click", toggleCartPanel);
        }
        
        // Evento para cerrar el carrito
        const closeCart = document.getElementById("close-cart");
        if (closeCart) {
            closeCart.addEventListener("click", toggleCartPanel);
        }
        
        const overlay = document.getElementById("cart-overlay");
        if (overlay) {
            overlay.addEventListener("click", toggleCartPanel);
        }
        
        // Evento para el botón de vaciar carrito
        const clearBtn = document.getElementById("clear-cart-btn");
        if (clearBtn) {
            clearBtn.addEventListener('click', clearCart);
        }
        
        // Evento para el botón de finalizar compra (iniciar sesión)
        const checkoutBtn = document.getElementById("checkout-btn");
        if (checkoutBtn) {
            checkoutBtn.addEventListener("click", redirectToPay);
        }
    }

    // Verificar si SweetAlert2 está cargado, si no, cargarlo
    function ensureSweetAlert() {
        if (typeof Swal === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
            script.onload = function() {
                console.log('SweetAlert2 cargado dinámicamente');
            };
            document.head.appendChild(script);
        }
    }

    // Esperar a que el DOM esté completamente cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            ensureSweetAlert();
            initCart();
        });
    } else {
        ensureSweetAlert();
        initCart();
    }

    // Exponer funciones globalmente para compatibilidad
    window.updateCartCount = updateCartCount;
    window.updateCartPanel = updateCartPanel;
    window.addToCart = addToCart;
    window.toggleCartPanel = toggleCartPanel;
    window.clearCart = clearCart;
})();