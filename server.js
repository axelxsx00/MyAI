const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Permite que tu index.html se comunique con este servidor

// 1. Configuración de tu transporte SMTP con tus datos reales de Gmail
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true para puerto seguro 465
    auth: {
        user: "axelxsvc@gmail.com",
        pass: "ekpuxeazccyzglfv" // Tu contraseña de aplicación de 16 caracteres
    }
});

// Verificación inicial de conexión con el servidor SMTP
transporter.verify((error, success) => {
    if (error) {
        console.log("Error de configuración SMTP:", error);
    } else {
        console.log("Servidor listo para enviar correos de manera segura");
    }
});

// 2. Ruta que recibe los datos dinámicos desde la página web
app.post('/enviar-correo', (req, res) => {
    const { para, asunto, mensaje } = req.body;

    // Validación básica
    if (!para || !asunto || !mensaje) {
        return res.status(400).send('Faltan campos obligatorios.');
    }

    // 3. Opciones del correo electrónico
    const mailOptions = {
        from: '"Mi Plataforma MyAI" <axelxsvc@gmail.com>',
        to: para,       // El destinatario que escribiste en la web
        subject: asunto, // El asunto que escribiste en la web
        html: mensaje    // El cuerpo del correo (acepta texto plano o etiquetas HTML)
    };

    // 4. Enviar el correo usando SMTP
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error al enviar correo:", error);
            return res.status(500).send(error.message);
        }
        console.log('Correo enviado con éxito. ID:', info.messageId);
        res.status(200).send('Correo enviado de forma segura.');
    });
});

// Iniciar el servidor local en el puerto 3000
const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log(`Servidor de MyAI corriendo en http://localhost:${PUERTO}`);
});