const facturama = require("../services/facturama.service");

exports.obtenerClientes = async (req, res) => {

    try {

        const clientes = await facturama.obtenerClientes();

        console.log("CLIENTES RECIBIDOS:");
        console.log(JSON.stringify(clientes, null, 2));

        return res.status(200).json(clientes);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

exports.crearCliente = async (req, res) => {

    try {

        console.log("====================================");
        console.log("BODY RECIBIDO");
        console.log(JSON.stringify(req.body, null, 2));

        const cliente = await facturama.crearCliente(req.body);

        console.log("CLIENTE CREADO:");
        console.log(JSON.stringify(cliente, null, 2));

        return res.status(201).json(cliente);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};
//crear factura
exports.crearFactura = async (req, res) => {

    try {

        console.log("========== FACTURA RECIBIDA ==========");
        console.log(JSON.stringify(req.body, null, 2));

        const respuesta = await facturama.crearFactura(req.body);

        console.log("========== RESPUESTA FACTURAMA ==========");
        console.log(JSON.stringify(respuesta, null, 2));

        return res.status(201).json(respuesta);

    } catch (error) {

        console.error("========== ERROR FACTURAMA ==========");

        if (error.response) {

            console.error(error.response.status);
            console.error(JSON.stringify(error.response.data, null, 2));

            return res.status(error.response.status).json(error.response.data);

        }

        console.error(error.message);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

exports.validarCliente = async (req, res) => {

    try {

        console.log("========== VALIDAR CLIENTE ==========");
        console.log(JSON.stringify(req.body, null, 2));

        const respuesta = await facturama.validarCliente(req.body);

        console.log("========== RESPUESTA ==========");
        console.log(JSON.stringify(respuesta, null, 2));

        return res.status(200).json(respuesta);

    } catch (error) {

        console.error("========== ERROR ==========");

        if (error.response) {

            console.error(JSON.stringify(error.response.data, null, 2));

            return res.status(error.response.status).json(error.response.data);

        }

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};