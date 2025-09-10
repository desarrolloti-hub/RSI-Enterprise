// carrito.js - Módulo independiente para el carrito de compras

// Variables globales del carrito
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Funciones públicas del carrito
const Cart = {
  init: function() {
    this.loadCart();
    this.setupEventListeners();
    this.updateCartUI();
  },
  
  loadCart: function() {
    cart = JSON.parse(localStorage.getItem("cart")) || [];
  },
  
  saveCart: function() {
    localStorage.setItem("cart", JSON.stringify(cart));
  },
  
  setupEventListeners: function() {
    // Evento para abrir el carrito
    document.getElementById("floating-cart-btn")?.addEventListener("click", () => {
      document.getElementById("cart-sidebar").classList.add("open");
    });
    
    // Evento para cerrar el carrito
    document.getElementById("close-cart")?.addEventListener("click", () => {
      document.getElementById("cart-sidebar").classList.remove("open");
    });
    
    // Evento para finalizar compra
    document.getElementById("checkout")?.addEventListener("click", () => {
      if (cart.length === 0) {
        Swal.fire({
          title: "Carrito vacío",
          text: "No hay productos en tu carrito",
          icon: "warning"
        });
        return;
      }
      
      // Redirigir a la página de proceso de pago
      window.location.href = "pago.html";
    });
  },
  
  updateCartUI: function() {
    this.updateCartCount();
    this.renderCartItems();
  },
  
  updateCartCount: function() {
    const totalItems = cart.reduce((total, item) => total + item.cantidad, 0);
    document.getElementById("cart-count").textContent = totalItems;
  },
  
  updateCartSubtotal: function() {
    const subtotal = cart.reduce((total, item) => total + (parseFloat(item.precio) * item.cantidad), 0);
    document.getElementById("cart-subtotal").textContent = `$${subtotal.toFixed(2)}`;
    return subtotal;
  },
  
  renderCartItems: function() {
    const cartItemsContainer = document.getElementById("cart-items");
    if (!cartItemsContainer) return;
    
    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = "<p>Tu carrito está vacío</p>";
      document.getElementById("checkout").disabled = true;
      return;
    }

    cart.forEach((item, index) => {
      const cartItem = document.createElement("div");
      cartItem.className = "cart-item";
      
      cartItem.innerHTML = `
        <div style="display: flex; align-items: center;">
          <img src="${item.imagen}" alt="${item.nombre}" style="width: 50px; height: 50px; object-fit: cover;">
          <div style="margin-left: 10px;">
            <div class="product-name">${item.nombre}</div>
            <div class="product-price">$${(parseFloat(item.precio) * item.cantidad).toFixed(2)}</div>
          </div>
        </div>
        <div class="quantity-controls">
          <button onclick="Cart.updateQuantity(${index}, ${item.cantidad - 1})">-</button>
          <input type="number" value="${item.cantidad}" min="1" onchange="Cart.updateQuantity(${index}, this.value)">
          <button onclick="Cart.updateQuantity(${index}, ${item.cantidad + 1})">+</button>
          <button class="remove-btn" onclick="Cart.removeFromCart(${index})"><i class="fas fa-trash"></i></button>
        </div>
      `;
      
      cartItemsContainer.appendChild(cartItem);
    });

    this.updateCartSubtotal();
    document.getElementById("checkout").disabled = false;
  },
  
  addToCart: function(producto) {
    if (typeof producto === "string") {
      producto = JSON.parse(producto.replace(/&quot;/g, '"'));
    }

    const existingProductIndex = cart.findIndex(item => item.nombre === producto["Nombre Producto"]);

    if (existingProductIndex !== -1) {
      cart[existingProductIndex].cantidad += 1;
    } else {
      cart.push({
        imagen: producto.Imagenes && producto.Imagenes.length > 0 ? producto.Imagenes[0] : '../../../vista/css/img/Logo-RSI-OFICIAL.png',
        nombre: producto["Nombre Producto"],
        precio: producto["Precio MXN"] || 0,
        cantidad: 1
      });
    }

    this.saveCart();
    this.updateCartUI();
    
    Swal.fire({
      title: "¡Producto agregado!",
      text: `${producto["Nombre Producto"]} se ha añadido al carrito.`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });
  },
  
  updateQuantity: function(index, newQuantity) {
    newQuantity = parseInt(newQuantity);
    if (isNaN(newQuantity) || newQuantity < 1) newQuantity = 1;
    
    cart[index].cantidad = newQuantity;
    this.saveCart();
    this.updateCartUI();
  },
  
  removeFromCart: function(index) {
    cart.splice(index, 1);
    this.saveCart();
    this.updateCartUI();
    
    Swal.fire({
      title: "Producto eliminado",
      text: "El producto se ha quitado del carrito.",
      icon: "info",
      timer: 1500,
      showConfirmButton: false
    });
  },
  
  getCart: function() {
    return cart;
  },
  
  clearCart: function() {
    cart = [];
    this.saveCart();
    this.updateCartUI();
  }
};

// Inicializar el carrito cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function() {
  Cart.init();
});

// Hacer las funciones disponibles globalmente
window.Cart = Cart;
window.addToCart = Cart.addToCart;