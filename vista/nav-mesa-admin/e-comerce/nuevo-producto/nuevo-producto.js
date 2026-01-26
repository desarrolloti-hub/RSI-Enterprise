// nuevo-producto.js
import { initializeFirebase, db, storage } from './firebase-config.js';

class ProductEditor {
    constructor() {
        this.productId = null;
        this.isEditing = false;
        this.currentImages = [];
        this.MAX_IMAGES = 3;
        this.productData = null;
        
        this.init();
    }
    
    async init() {
        try {
            await initializeFirebase();
            await this.loadCategories();
            await this.checkEditMode();
            this.setupEventListeners();
            this.calculatePrice();
        } catch (error) {
            console.error('Error inicializando editor:', error);
            this.showError('Error al cargar el editor');
        }
    }
    
    async checkEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        
        if (editId) {
            this.isEditing = true;
            this.productId = editId;
            await this.loadProductData(editId);
            document.getElementById('formTitle').textContent = 'Editar Producto';
            document.getElementById('formSubtitle').textContent = 'Modifique los campos necesarios';
            document.getElementById('submitText').textContent = 'Actualizar Producto';
        }
    }
    
    async loadCategories() {
        try {
            const snapshot = await db.collection("categoria").get();
            const categories = snapshot.docs.map(doc => doc.data().nombre);
            
            const select = document.getElementById('categoria');
            select.innerHTML = '<option value="">Seleccione una categoría</option>' +
                categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        } catch (error) {
            console.error("Error cargando categorías:", error);
        }
    }
    
    async loadProductData(productId) {
        try {
            const doc = await db.collection("indexproductos").doc(productId).get();
            
            if (doc.exists) {
                this.productData = { id: doc.id, ...doc.data() };
                this.populateForm(this.productData);
            } else {
                this.showError('Producto no encontrado');
                setTimeout(() => window.location.href = 'gestion-de-productos.html', 2000);
            }
        } catch (error) {
            console.error("Error cargando producto:", error);
            this.showError('Error al cargar datos del producto');
        }
    }
    
    populateForm(data) {
        // Información básica
        document.getElementById('nombre').value = data["nombre"] || '';
        document.getElementById('categoria').value = data.categoria || '';
        document.getElementById('marca').value = data.marca || '';
        document.getElementById('modelo').value = data.modelo || '';
        document.getElementById('sku').value = data.sku || '';
        document.getElementById('descripcion').value = data.descripcion || '';
        
        // Precios
        document.getElementById('precio').value = data["precio"] || 0;
        document.getElementById('descuento').value = data.descuento || 0;
        
        // Inventario
        document.getElementById('stock').value = data.stock || 0;
        document.getElementById('minStock').value = data.minStock || 5;
        document.getElementById('activo').checked = data.activo !== false;
        document.getElementById('statusLabel').textContent = data.activo !== false ? 'Activo' : 'Inactivo';
        
        // Imágenes
        this.currentImages = data.imagenes || [];
        this.updateImagePreviews();
        
        // Calcular precio final
        this.calculatePrice();
    }
    
    async saveProduct(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }
        
        const formData = this.collectFormData();
        
        try {
            // Subir imágenes si hay nuevas
            if (this.hasNewImages()) {
                const uploadedUrls = await this.uploadImages();
                formData.imagenes = [...this.currentImages.filter(img => typeof img === 'string'), ...uploadedUrls];
            }
            
            // Guardar en Firestore
            if (this.isEditing) {
                await db.collection("indexproductos").doc(this.productId).update(formData);
                this.showSuccess('Producto actualizado correctamente');
            } else {
                await db.collection("indexproductos").add(formData);
                this.showSuccess('Producto creado correctamente');
            }
            
            // Redirigir después de 2 segundos
            setTimeout(() => {
                window.location.href = 'gestion-de-productos.html';
            }, 2000);
            
        } catch (error) {
            console.error("Error guardando producto:", error);
            this.showError('Error al guardar producto: ' + error.message);
        }
    }
    
    validateForm() {
        const requiredFields = ['nombre', 'categoria', 'marca', 'modelo', 'precio'];
        
        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                this.showError(`El campo "${field.previousElementSibling.textContent}" es requerido`);
                field.focus();
                return false;
            }
        }
        
        const price = parseFloat(document.getElementById('precio').value);
        if (price < 0) {
            this.showError('El precio no puede ser negativo');
            return false;
        }
        
        return true;
    }
    
    collectFormData() {
        return {
            "nombre": document.getElementById('nombre').value.trim(),
            "categoria": document.getElementById('categoria').value,
            "marca": document.getElementById('marca').value.trim(),
            "modelo": document.getElementById('modelo').value.trim(),
            "sku": document.getElementById('sku').value.trim(),
            "descripcion": document.getElementById('descripcion').value.trim(),
            "precio": parseFloat(document.getElementById('precio').value),
            "descuento": parseFloat(document.getElementById('descuento').value) || 0,
            "stock": parseInt(document.getElementById('stock').value) || 0,
            "minStock": parseInt(document.getElementById('minStock').value) || 5,
            "activo": document.getElementById('activo').checked,
            "imagenes": this.currentImages,
            "ultimaActualizacion": firebase.firestore.FieldValue.serverTimestamp()
        };
    }
    
    async uploadImages() {
        const uploadPromises = [];
        
        for (const image of this.currentImages) {
            if (typeof image === 'object') {
                // Es un archivo nuevo, subirlo
                const uploadPromise = this.uploadImageToStorage(image);
                uploadPromises.push(uploadPromise);
            }
        }
        
        return Promise.all(uploadPromises);
    }
    
    async uploadImageToStorage(file) {
        return new Promise((resolve, reject) => {
            const storageRef = storage.ref();
            const fileName = `products/${Date.now()}_${file.name}`;
            const uploadTask = storageRef.child(fileName).put(file);
            
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progreso de subida
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Subida: ' + progress + '%');
                },
                (error) => {
                    reject(error);
                },
                async () => {
                    // Subida completada
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    resolve(downloadURL);
                }
            );
        });
    }
    
    hasNewImages() {
        return this.currentImages.some(img => typeof img === 'object');
    }
    
    calculatePrice() {
        const precio = parseFloat(document.getElementById("precio").value) || 0;
        const descuento = parseFloat(document.getElementById("descuento").value) || 0;
        
        // Validar descuento
        if (descuento < 0) {
            document.getElementById("descuento").value = 0;
            return this.calculatePrice();
        }
        if (descuento > 100) {
            document.getElementById("descuento").value = 100;
            return this.calculatePrice();
        }
        
        const descuentoMonto = precio * (descuento / 100);
        const precioFinal = precio - descuentoMonto;
        
        // Actualizar displays
        document.getElementById("basePriceDisplay").textContent = `$${precio.toFixed(2)}`;
        document.getElementById("discountDisplay").textContent = 
            `${descuento}% ($${descuentoMonto.toFixed(2)})`;
        document.getElementById("finalPriceDisplay").textContent = `$${precioFinal.toFixed(2)}`;
    }
    
    handleImageUpload(event) {
        const files = Array.from(event.target.files).slice(0, this.MAX_IMAGES - this.currentImages.length);
        
        files.forEach(file => {
            if (this.currentImages.length < this.MAX_IMAGES) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.currentImages.push({
                        file: file,
                        preview: e.target.result
                    });
                    this.updateImagePreviews();
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Limpiar input
        event.target.value = '';
    }
    
    updateImagePreviews() {
        const container = document.getElementById('imagePreviews');
        
        if (this.currentImages.length === 0) {
            container.innerHTML = `
                <div class="empty-preview">
                    <i class="fas fa-images"></i>
                    <p>No hay imágenes seleccionadas</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.currentImages.map((img, index) => `
            <div class="preview-item">
                <img src="${typeof img === 'object' ? img.preview : img}" alt="Preview ${index + 1}">
                <button class="remove-image" onclick="productEditor.removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    removeImage(index) {
        this.currentImages.splice(index, 1);
        this.updateImagePreviews();
    }
    
    async saveDraft() {
        const formData = this.collectFormData();
        formData.estado = 'borrador';
        
        try {
            if (this.isEditing) {
                await db.collection("indexproductos").doc(this.productId).update(formData);
                this.showSuccess('Borrador guardado');
            } else {
                await db.collection("borradores").add(formData);
                this.showSuccess('Borrador guardado en borradores');
            }
        } catch (error) {
            console.error("Error guardando borrador:", error);
            this.showError('Error al guardar borrador');
        }
    }
    
    cancel() {
        Swal.fire({
            title: '¿Cancelar cambios?',
            text: 'Los cambios no guardados se perderán',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'Seguir editando'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'gestion-de-productos.html';
            }
        });
    }
    
    showSuccess(message) {
        Swal.fire({
            title: '¡Éxito!',
            text: message,
            icon: 'success',
            timer: 2000
        });
    }
    
    showError(message) {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error'
        });
    }
    
    setupEventListeners() {
        document.getElementById('productForm').addEventListener('submit', (e) => this.saveProduct(e));
        document.getElementById('precio').addEventListener('input', () => this.calculatePrice());
        document.getElementById('descuento').addEventListener('input', () => this.calculatePrice());
        
        // Toggle activo/inactivo
        document.getElementById('activo').addEventListener('change', function() {
            document.getElementById('statusLabel').textContent = this.checked ? 'Activo' : 'Inactivo';
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.productEditor = new ProductEditor();
});

// Funciones globales
window.handleImageUpload = (event) => productEditor.handleImageUpload(event);
window.cancel = () => productEditor.cancel();
window.saveDraft = () => productEditor.saveDraft();