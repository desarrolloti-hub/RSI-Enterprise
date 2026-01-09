// categoriaCotizaciones.js
import { db } from '/config/firebase-config.js';

// Importar funciones específicas de Firestore desde CDN
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    getDoc
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

class CategoriaCotizaciones {
    constructor(nombreCategoria = '', imagen = '') {
        this.nombreCategoria = nombreCategoria;
        this.imagen = imagen;
    }

    // Método para validar los datos de la categoría
    validate() {
        if (!this.nombreCategoria || this.nombreCategoria.trim() === '') {
            throw new Error('El nombre de la categoría es requerido');
        }
        
        if (this.nombreCategoria.length > 100) {
            throw new Error('El nombre de la categoría no puede exceder los 100 caracteres');
        }
        
        if (this.imagen && this.imagen.length > 5000000) {
            throw new Error('La imagen es demasiado grande (máximo 5MB)');
        }
        
        return true;
    }

    // CREATE: Crear una nueva categoría
    async create() {
        try {
            this.validate();
            
            const categoryData = {
                nombreCategoria: this.nombreCategoria.trim(),
                imagen: this.imagen || null,
                fechaCreacion: serverTimestamp()
            };
            
            const docRef = await addDoc(collection(db, "categoriasProductoServicio"), categoryData);
            return {
                success: true,
                id: docRef.id,
                message: 'Categoría creada exitosamente'
            };
        } catch (error) {
            console.error('Error al crear categoría:', error);
            return {
                success: false,
                error: error.message || 'Error al crear la categoría'
            };
        }
    }

    // READ: Obtener todas las categorías
    static async getAll() {
        try {
            const q = query(
                collection(db, "categoriasProductoServicio"), 
                orderBy("fechaCreacion", "desc")
            );
            const querySnapshot = await getDocs(q);
            
            const categories = [];
            querySnapshot.forEach((doc) => {
                categories.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return {
                success: true,
                data: categories,
                message: 'Categorías obtenidas exitosamente',
                count: categories.length
            };
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            return {
                success: false,
                error: error.message || 'Error al obtener las categorías',
                data: [],
                count: 0
            };
        }
    }

    // READ: Obtener una categoría por ID
    static async getById(id) {
        try {
            const docRef = doc(db, "categoriasProductoServicio", id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    success: true,
                    data: {
                        id: docSnap.id,
                        ...docSnap.data()
                    },
                    message: 'Categoría obtenida exitosamente'
                };
            } else {
                return {
                    success: false,
                    error: 'Categoría no encontrada'
                };
            }
        } catch (error) {
            console.error('Error al obtener categoría:', error);
            return {
                success: false,
                error: error.message || 'Error al obtener la categoría'
            };
        }
    }

    // UPDATE: Actualizar una categoría existente
    static async update(id, updatedData) {
        try {
            // Validar datos mínimos
            if (updatedData.nombreCategoria && updatedData.nombreCategoria.trim() === '') {
                throw new Error('El nombre de la categoría es requerido');
            }
            
            if (updatedData.nombreCategoria && updatedData.nombreCategoria.length > 100) {
                throw new Error('El nombre de la categoría no puede exceder los 100 caracteres');
            }
            
            const categoryRef = doc(db, "categoriasProductoServicio", id);
            const dataToUpdate = {
                ...updatedData,
                fechaActualizacion: serverTimestamp()
            };
            
            await updateDoc(categoryRef, dataToUpdate);
            
            return {
                success: true,
                message: 'Categoría actualizada exitosamente'
            };
        } catch (error) {
            console.error('Error al actualizar categoría:', error);
            return {
                success: false,
                error: error.message || 'Error al actualizar la categoría'
            };
        }
    }

    // DELETE: Eliminar una categoría
    static async delete(id) {
        try {
            await deleteDoc(doc(db, "categoriasProductoServicio", id));
            
            return {
                success: true,
                message: 'Categoría eliminada exitosamente'
            };
        } catch (error) {
            console.error('Error al eliminar categoría:', error);
            return {
                success: false,
                error: error.message || 'Error al eliminar la categoría'
            };
        }
    }

    // Método para buscar categorías por nombre
    static async searchByName(searchTerm) {
        try {
            const q = query(
                collection(db, "categoriasProductoServicio"), 
                orderBy("nombreCategoria")
            );
            const querySnapshot = await getDocs(q);
            
            const categories = [];
            querySnapshot.forEach((doc) => {
                const categoryData = doc.data();
                if (categoryData.nombreCategoria.toLowerCase().includes(searchTerm.toLowerCase())) {
                    categories.push({
                        id: doc.id,
                        ...categoryData
                    });
                }
            });
            
            return {
                success: true,
                data: categories,
                message: 'Búsqueda completada exitosamente',
                count: categories.length
            };
        } catch (error) {
            console.error('Error al buscar categorías:', error);
            return {
                success: false,
                error: error.message || 'Error al buscar categorías',
                data: [],
                count: 0
            };
        }
    }

    toJSON() {
        return {
            nombreCategoria: this.nombreCategoria,
            imagen: this.imagen
        };
    }

    loadFromObject(obj) {
        this.nombreCategoria = obj.nombreCategoria || '';
        this.imagen = obj.imagen || '';
        return this;
    }

    static fromObject(obj) {
        return new CategoriaCotizaciones(obj.nombreCategoria, obj.imagen);
    }
}

export { CategoriaCotizaciones };