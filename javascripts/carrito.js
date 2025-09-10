// Función para inicializar el carrito
function initCart() {
    const floatingCartBtn = document.getElementById("floating-cart-btn");
    const cartSidebar = document.getElementById("cart-sidebar");
    const closeCart = document.getElementById("close-cart");
    const cartItemsContainer = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const checkoutButton = document.getElementById("checkout");

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    function updateCartCount() {
        cartCount.textContent = cart.length;
        floatingCartBtn.style.display = "flex";
    }

    function renderCartItems() {
        cartItemsContainer.innerHTML = "";
        let subtotal = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart-message">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Tu carrito está vacío</p>
                </div>
            `;
            return;
        }

        cart.forEach((item, index) => {
            const cartItem = document.createElement("div");
            cartItem.classList.add("cart-item");
            const precio = parseFloat(item.precio) || 0;
            const totalItem = precio * item.cantidad;
            subtotal += totalItem;

            cartItem.innerHTML = `
                <img src="${item.imagen}" alt="${item.nombre}" style="width: 50px; height: 50px;">
                <span class="product-name">${item.nombre}</span>
                <div class="quantity-controls">
                    <button onclick="updateQuantity(${index}, ${item.cantidad - 1})">-</button>
                    <input type="number" value="${item.cantidad}" min="1" onchange="updateQuantity(${index}, this.value)">
                    <button onclick="updateQuantity(${index}, ${item.cantidad + 1})">+</button>
                </div>
                <span class="item-price">$${(precio * item.cantidad).toFixed(2)}</span>
                <button class="remove-btn" onclick="removeFromCart(${index})"><i class="fas fa-trash"></i></button>
            `;
            cartItemsContainer.appendChild(cartItem);
        });

        cartItemsContainer.innerHTML += `
            <div class="cart-subtotal">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
            </div>
        `;
    }

    window.addToCart = function (producto) {
        if (typeof producto === "string") {
            producto = JSON.parse(producto.replace(/&quot;/g, '"'));
        }

        const existingProductIndex = cart.findIndex(item => item.nombre === producto["Nombre Producto"]);

        if (existingProductIndex !== -1) {
            cart[existingProductIndex].cantidad += 1;
        } else {
            const precioBase = Number(producto['Precio Base'] || producto['Precio MXN']) || 0;
            const descuento = Number(producto.Descuento) || 0;
            const precioFinal = descuento > 0 ? precioBase * (1 - descuento/100) : precioBase;

            cart.push({
                imagen: producto.Imagenes && producto.Imagenes.length > 0 ? producto.Imagenes[0] : defaultImage,
                nombre: producto["Nombre Producto"],
                precio: precioFinal || "No disponible",
                precioOriginal: precioBase,
                descuento: descuento,
                cantidad: 1,
                id: producto.id || Date.now().toString()
            });
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();
        renderCartItems();
        Swal.fire("¡Producto agregado!", `${producto["Nombre Producto"]} se ha añadido al carrito.`, "success");
    };

    window.updateQuantity = function (index, newQuantity) {
        if (newQuantity < 1) newQuantity = 1;
        cart[index].cantidad = parseInt(newQuantity, 10);
        localStorage.setItem("cart", JSON.stringify(cart));
        renderCartItems();
    };

    window.removeFromCart = function (index) {
        const removedItem = cart[index];
        cart.splice(index, 1);
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();
        renderCartItems();
        Swal.fire("Producto eliminado", `${removedItem.nombre} se ha removido del carrito.`, "info");
    };

    floatingCartBtn.addEventListener("click", function () {
        cartSidebar.classList.toggle("open");
    });

    closeCart.addEventListener("click", function () {
        cartSidebar.classList.remove("open");
    });

    checkoutButton.addEventListener("click", function () {
        if (cart.length === 0) {
            Swal.fire("Carrito vacío", "Agrega productos al carrito antes de finalizar la compra.", "warning");
        } else {
            // Guardar el carrito como pendiente antes de redirigir
            localStorage.setItem('pendingCheckoutCart', JSON.stringify(cart));
            
            // Redirigir a la página de inicio de sesión
            window.location.href = '../vista/nav-visitantes/inicio-de-sesion.html';
        }
    });

    // Actualizar interfaz al cargar
    updateCartCount();  
    renderCartItems();
}

// Inicializar el carrito cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", initCart);