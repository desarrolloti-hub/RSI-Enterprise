// productoServicioCotizaciones.js - VERSIÓN v8
import { db } from '/config/firebase-config.js';
// Importar la clase de categorías para obtener nombres
import { CategoriaCotizaciones } from './categoriaCotizaciones.js';

class ProductoServicioCotizaciones {
    constructor(nombre = '', precioUnitario = 0, imagen = '', categoriaId = '') {
        this.nombre = nombre;
        this.precioUnitario = precioUnitario;
        this.imagen = imagen;
        this.categoriaId = categoriaId;
    }

    // Método para validar los datos del producto/servicio
    validate() {
        if (!this.nombre || this.nombre.trim() === '') {
            throw new Error('El nombre del producto/servicio es requerido');
        }
        
        if (this.nombre.length > 100) {
            throw new Error('El nombre del producto/servicio no puede exceder los 100 caracteres');
        }
        
        if (this.precioUnitario === undefined || this.precioUnitario === null) {
            throw new Error('El precio unitario es requerido');
        }
        
        if (typeof this.precioUnitario !== 'number' || isNaN(this.precioUnitario)) {
            throw new Error('El precio unitario debe ser un número válido');
        }
        
        if (this.precioUnitario < 0) {
            throw new Error('El precio unitario no puede ser negativo');
        }
        
        if (this.precioUnitario > 1000000000) {
            throw new Error('El precio unitario es demasiado alto');
        }
        
        if (!this.categoriaId || this.categoriaId.trim() === '') {
            throw new Error('La categoría es requerida');
        }
        
        if (this.imagen && this.imagen.length > 5000000) {
            throw new Error('La imagen es demasiado grande (máximo 5MB)');
        }
        
        return true;
    }

    // CREATE: Crear un nuevo producto/servicio
    async create() {
        try {
            this.validate();
            
            // Verificar que la categoría exista
            const categoriaResult = await CategoriaCotizaciones.getById(this.categoriaId);
            if (!categoriaResult.success) {
                throw new Error('La categoría seleccionada no existe');
            }
            
            const productData = {
                nombre: this.nombre.trim(),
                precioUnitario: Number(this.precioUnitario),
                imagen: this.imagen || null,
                categoriaId: this.categoriaId,
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await db.collection("productosServiciosCotizaciones").add(productData);
            return {
                success: true,
                id: docRef.id,
                message: 'Producto/Servicio creado exitosamente'
            };
        } catch (error) {
            console.error('Error al crear producto/servicio:', error);
            return {
                success: false,
                error: error.message || 'Error al crear el producto/servicio'
            };
        }
    }

    // READ: Obtener todos los productos/servicios con nombres de categoría
    static async getAll() {
        try {
            // Primero obtener todas las categorías para mapear nombres
            const categoriasResult = await CategoriaCotizaciones.getAll();
            const categoriasMap = {};
            
            if (categoriasResult.success) {
                categoriasResult.data.forEach(cat => {
                    categoriasMap[cat.id] = cat.nombreCategoria;
                });
            }
            
            // Obtener productos
            const querySnapshot = await db.collection("productosServiciosCotizaciones").get();
            
            const products = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const categoriaId = data.categoriaId || '';
                const categoriaNombre = categoriasMap[categoriaId] || 'Sin categoría';
                
                products.push({
                    id: doc.id,
                    ...data,
                    precioUnitario: data.precioUnitario || 0,
                    categoriaId: categoriaId,
                    categoriaNombre: categoriaNombre
                });
            });
            
            // Ordenar por fecha de creación (manualmente)
            products.sort((a, b) => {
                const dateA = a.fechaCreacion ? (a.fechaCreacion.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion)) : new Date(0);
                const dateB = b.fechaCreacion ? (b.fechaCreacion.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion)) : new Date(0);
                return dateB - dateA; // Orden descendente
            });
            
            return {
                success: true,
                data: products,
                message: 'Productos/Servicios obtenidos exitosamente',
                count: products.length
            };
        } catch (error) {
            console.error('Error al obtener productos/servicios:', error);
            return {
                success: false,
                error: error.message || 'Error al obtener los productos/servicios',
                data: [],
                count: 0
            };
        }
    }

    // READ: Obtener un producto/servicio por ID con nombre de categoría
    static async getById(id) {
        try {
            const docRef = db.collection("productosServiciosCotizaciones").doc(id);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                const data = docSnap.data();
                const categoriaId = data.categoriaId || '';
                let categoriaNombre = 'Sin categoría';
                
                // Obtener nombre de la categoría
                if (categoriaId) {
                    const categoriaResult = await CategoriaCotizaciones.getById(categoriaId);
                    if (categoriaResult.success) {
                        categoriaNombre = categoriaResult.data.nombreCategoria || 'Sin categoría';
                    }
                }
                
                return {
                    success: true,
                    data: {
                        id: docSnap.id,
                        ...data,
                        precioUnitario: data.precioUnitario || 0,
                        categoriaId: categoriaId,
                        categoriaNombre: categoriaNombre
                    },
                    message: 'Producto/Servicio obtenido exitosamente'
                };
            } else {
                return {
                    success: false,
                    error: 'Producto/Servicio no encontrado'
                };
            }
        } catch (error) {
            console.error('Error al obtener producto/servicio:', error);
            return {
                success: false,
                error: error.message || 'Error al obtener el producto/servicio'
            };
        }
    }

    // UPDATE: Actualizar un producto/servicio existente
    static async update(id, updatedData) {
        try {
            // Validar datos si se están actualizando
            if (updatedData.nombre !== undefined) {
                if (updatedData.nombre.trim() === '') {
                    throw new Error('El nombre del producto/servicio es requerido');
                }
                
                if (updatedData.nombre.length > 100) {
                    throw new Error('El nombre del producto/servicio no puede exceder los 100 caracteres');
                }
            }
            
            if (updatedData.precioUnitario !== undefined) {
                const precio = Number(updatedData.precioUnitario);
                if (isNaN(precio)) {
                    throw new Error('El precio unitario debe ser un número válido');
                }
                
                if (precio < 0) {
                    throw new Error('El precio unitario no puede ser negativo');
                }
                
                if (precio > 1000000000) {
                    throw new Error('El precio unitario es demasiado alto');
                }
                
                updatedData.precioUnitario = precio;
            }
            
            if (updatedData.categoriaId !== undefined) {
                if (updatedData.categoriaId.trim() === '') {
                    throw new Error('La categoría es requerida');
                }
                
                // Verificar que la categoría exista
                const categoriaResult = await CategoriaCotizaciones.getById(updatedData.categoriaId);
                if (!categoriaResult.success) {
                    throw new Error('La categoría seleccionada no existe');
                }
            }
            
            const productRef = db.collection("productosServiciosCotizaciones").doc(id);
            const dataToUpdate = {
                ...updatedData,
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await productRef.update(dataToUpdate);
            
            return {
                success: true,
                message: 'Producto/Servicio actualizado exitosamente'
            };
        } catch (error) {
            console.error('Error al actualizar producto/servicio:', error);
            return {
                success: false,
                error: error.message || 'Error al actualizar el producto/servicio'
            };
        }
    }

    // Método para obtener productos por categoría
    static async getByCategoriaId(categoriaId) {
        try {
            const querySnapshot = await db.collection("productosServiciosCotizaciones")
                .where("categoriaId", "==", categoriaId)
                .get();
            
            const products = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                products.push({
                    id: doc.id,
                    ...data,
                    precioUnitario: data.precioUnitario || 0
                });
            });
            
            return {
                success: true,
                data: products,
                message: 'Productos/Servicios obtenidos exitosamente',
                count: products.length
            };
        } catch (error) {
            console.error('Error al obtener productos por categoría:', error);
            return {
                success: false,
                error: error.message || 'Error al obtener productos por categoría',
                data: [],
                count: 0
            };
        }
    }

    // Método para obtener todas las categorías disponibles
    static async getCategorias() {
        try {
            const result = await CategoriaCotizaciones.getAll();
            return result;
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            return {
                success: false,
                error: error.message || 'Error al obtener categorías',
                data: [],
                count: 0
            };
        }
    }

    toJSON() {
        return {
            nombre: this.nombre,
            precioUnitario: this.precioUnitario,
            imagen: this.imagen,
            categoriaId: this.categoriaId
        };
    }

    loadFromObject(obj) {
        this.nombre = obj.nombre || '';
        this.precioUnitario = obj.precioUnitario !== undefined ? Number(obj.precioUnitario) : 0;
        this.imagen = obj.imagen || '';
        this.categoriaId = obj.categoriaId || '';
        return this;
    }

    static fromObject(obj) {
        return new ProductoServicioCotizaciones(
            obj.nombre || '',
            obj.precioUnitario !== undefined ? Number(obj.precioUnitario) : 0,
            obj.imagen || '',
            obj.categoriaId || ''
        );
    }
}

export { ProductoServicioCotizaciones };