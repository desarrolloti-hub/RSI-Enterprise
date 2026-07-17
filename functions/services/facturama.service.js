const axios = require("axios");
const config = require("../config/facturama.config");

class FacturamaService {

    constructor() {
        this.client = axios.create({
            baseURL: config.url,
            auth: {
                username: config.user,
                password: config.password
            },
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout: 15000
        });
    }

    async request(method, endpoint, data = null) {

        try {

            console.log("====================================");
            console.log("FACTURAMA REQUEST");
            console.log("Método:", method);
            console.log("Endpoint:", endpoint);

            if (data) {
                console.log("Body:");
                console.log(JSON.stringify(data, null, 2));
            }

            const response = await this.client({
                method,
                url: endpoint,
                data
            });

            console.log("====================================");
            console.log("FACTURAMA RESPONSE");
            console.log("Status:", response.status);
            console.log("Headers:", response.headers);
            console.log("Data:");
            console.log(JSON.stringify(response.data, null, 2));
            console.log("====================================");

            return response.data;

        } catch (error) {

            console.log("====================================");
            console.log("FACTURAMA ERROR");

            if (error.response) {

                console.log("Status:", error.response.status);
                console.log("Data:");
                console.log(JSON.stringify(error.response.data, null, 2));

            } else {

                console.log(error.message);

            }

            console.log("====================================");

            throw error;
        }

    }

    async obtenerClientes() {
        return this.request("GET", "/client");
    }

    async obtenerCliente(id) {
        return this.request("GET", `/client/${id}`);
    }

    async crearCliente(cliente) {
        return this.request("POST", "/client", cliente);
    }

    async actualizarCliente(id, cliente) {
        return this.request("PUT", `/client/${id}`, cliente);
    }

    async eliminarCliente(id) {
        return this.request("DELETE", `/client/${id}`);
    }

    async validarCliente(cliente) {
        return this.request("POST", "/api/customers/validate", cliente);
    }

    async crearFactura(factura) {
        return this.request("POST", "/3/cfdis", factura);
    }
    async cancelarFactura(){}

    async descargarPDF(){}

    async descargarXML(){}
}

module.exports = new FacturamaService();