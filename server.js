// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Importar nuestro controlador de Sockets modular
const socketController = require('./src/socketController');

app.use(express.static('public'));

// Inyectar el controlador principal
io.on('connection', (socket) => {
    socketController(io, socket);
});

// Reemplazar la última línea con esto:
const PORT = process.env.PORT || 3000; // <--- Toma el puerto de Railway, o usa 3000 en local
server.listen(PORT, '0.0.0.0', () => { // <--- El '0.0.0.0' asegura que escuche conexiones externas
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});