// src/socketController.js
const Sala = require('./Sala');
const { MAX_JUGADORES, MAX_ESPECTADORES, TIEMPO_VOTACION_SEC, INACTIVIDAD_SALA_PUBLICA_SEC, INACTIVIDAD_SALA_PRIVADA_SEC, BARAJA_BASE, TIEMPO_GRACIA_MS } = require('./constants');

const partidasActivas = {}; 

module.exports = function (io, socket) {
    
    const emitirListas = (nombreSala) => {
        const sala = partidasActivas[nombreSala];
        if (!sala) return;
        
        const listas = { jugadores: [], espectadores: [] };
        for (const id in sala.jugadores) {
            const j = sala.jugadores[id];
            const info = { id, nombre: j.nombre || "Escribiendo...", enLobby: j.enLobby, foto: j.foto, isBot: j.isBot };
            if (j.rol === 'jugador') listas.jugadores.push({ ...info, listo: j.tablillaBloqueada !== null });
            else listas.espectadores.push(info);
        }
        io.to(nombreSala).emit('actualizar_listas', listas);
        io.to(sala.anfitrion).emit('estado_boton_iniciar', sala.todosEstanListos());
        emitirSalasPublicas();
    };

    const emitirSalasPublicas = () => {
        const publicas = Object.values(partidasActivas)
            .filter(s => s.esPublica && s.estado === 'espera')
            .map(s => ({
                nombreSala: s.nombre, codigo: s.codigo, 
                anfitrion: s.jugadores[s.anfitrion]?.nombre || 'Esperando...', 
                jugadores: s.getJugadoresActivos().length
            }));
        io.emit('salas_publicas_actualizadas', publicas);
    };

    const iniciarTimerInactividad = (nombreSala) => {
        const sala = partidasActivas[nombreSala];
        if (!sala) return;
        detenerTimerInactividad(nombreSala);

        let tiempoSec = sala.esPublica ? INACTIVIDAD_SALA_PUBLICA_SEC : INACTIVIDAD_SALA_PRIVADA_SEC;
        
        sala.timerInactividad = setInterval(() => {
            tiempoSec--;
            io.to(nombreSala).emit('actualizar_timer_inactividad', tiempoSec);

            if (tiempoSec <= 0) {
                detenerTimerInactividad(nombreSala);
                const minutosMostrados = sala.esPublica ? 3 : 5; 
                io.to(nombreSala).emit('sala_destruida_inactividad', minutosMostrados);
                
                setTimeout(() => {
                    io.in(nombreSala).socketsLeave(nombreSala); 
                    delete partidasActivas[nombreSala];
                    emitirSalasPublicas();
                }, 500);
            }
        }, 1000);
    };

    const detenerTimerInactividad = (nombreSala) => {
        const sala = partidasActivas[nombreSala];
        if (sala && sala.timerInactividad) {
            clearInterval(sala.timerInactividad);
            sala.timerInactividad = null;
        }
    };

    const manejarSalidaJugador = (socketId) => {
        for (const nombreSala in partidasActivas) {
            const sala = partidasActivas[nombreSala];
            if (sala.jugadores[socketId]) {
                const eraAnfitrion = (sala.anfitrion === socketId);
                sala.removerJugador(socketId);
                
                const humanosRestantes = Object.keys(sala.jugadores).filter(id => !sala.jugadores[id].isBot);
                
                if (humanosRestantes.length === 0) {
                    detenerTimerInactividad(nombreSala); 
                    delete partidasActivas[nombreSala]; 
                    emitirSalasPublicas();
                } else {
                    if (eraAnfitrion) {
                        sala.anfitrion = humanosRestantes[0]; 
                        io.to(sala.anfitrion).emit('nuevo_anfitrion');
                        io.to(nombreSala).emit('mensaje_chat', { nombre: 'SISTEMA', mensaje: `El anfitrión se fue. El nuevo anfitrión es ${sala.jugadores[sala.anfitrion].nombre}` });
                    }
                    if (sala.estado === 'espera' || sala.estado === 'finalizado') {
                        io.to(nombreSala).emit('actualizar_tablillas', sala.tablillas);
                        emitirListas(nombreSala);
                    }
                }
            }
        }
    };

    const finalizarPartidaVisual = (nombreSala) => {
        const sala = partidasActivas[nombreSala];
        sala.estado = 'finalizado';
        if(sala.intervalo) clearInterval(sala.intervalo); sala.intervalo = null;
        Object.values(sala.jugadores).forEach(j => { if(!j.isBot) j.enLobby = false; });
        io.to(nombreSala).emit('juego_terminado', { ranking: sala.calcularRanking(), estadisticas: sala.estadisticas });
        emitirListas(nombreSala); 
    };

    const iniciarVotacionRevolver = (nombreSala) => {
        const sala = partidasActivas[nombreSala];
        sala.estado = 'votando_revolver';
        sala.votacion = { votosSi: 0, votantes: new Set(), temporizador: null, tiempoRestante: TIEMPO_VOTACION_SEC };
        io.to(nombreSala).emit('iniciar_votacion_revolver', { tiempo: TIEMPO_VOTACION_SEC });
        sala.votacion.temporizador = setInterval(() => {
            sala.votacion.tiempoRestante--; io.to(nombreSala).emit('tick_votacion_revolver', sala.votacion.tiempoRestante);
            if (sala.votacion.tiempoRestante <= 0) procesarResultadoVotacionRevolver(nombreSala);
        }, 1000);
    };

    const procesarResultadoVotacionRevolver = (nombreSala) => {
        const sala = partidasActivas[nombreSala]; clearInterval(sala.votacion.temporizador);
        const numHumanos = sala.getHumanos().filter(j => j.rol === 'jugador').length;
        if (sala.votacion.votosSi > (numHumanos - sala.votacion.votosSi)) {
            sala.estado = 'jugando'; sala.mazo = sala.mezclar(BARAJA_BASE); sala.cartasJugadas = [];
            io.to(nombreSala).emit('votacion_revolver_cerrada', true); io.to(nombreSala).emit('mensaje_chat', { nombre: 'SISTEMA', mensaje: '¡El mazo se ha revuelto!' });
            sala.intervalo = setInterval(() => sacarCarta(nombreSala), sala.config.velocidadGriton);
        } else {
            io.to(nombreSala).emit('votacion_revolver_cerrada', false); finalizarPartidaVisual(nombreSala);
        }
    };

    const iniciarPeriodoDeGracia = (nombreSala) => {
        const sala = partidasActivas[nombreSala]; sala.estado = 'gracia';
        let finMs = Date.now() + sala.config.tiempoMarcar + TIEMPO_GRACIA_MS;
        if(sala.intervalo) clearInterval(sala.intervalo);
        sala.intervalo = setInterval(() => {
            let restante = finMs - Date.now();
            if (restante > 0) io.to(nombreSala).emit('actualizar_texto_carta', `Fin del juego en ${(restante / 1000).toFixed(1)}s...`);
            else {
                clearInterval(sala.intervalo); sala.intervalo = null;
                if (sala.ganadores.length > 0) finalizarPartidaVisual(nombreSala);
                else iniciarVotacionRevolver(nombreSala);
            }
        }, 100);
    };

    const sacarCarta = (nombreSala) => {
        const sala = partidasActivas[nombreSala];
        if (!sala || !['jugando', 'gracia'].includes(sala.estado)) return;
        
        if (sala.mazo.length > 0) {
            const carta = sala.mazo.pop(); sala.cartasJugadas.push(carta);
            io.to(nombreSala).emit('nueva_carta', carta);
            
            const tiempoReaccionBot = Math.max(1000, sala.config.tiempoMarcar - 1000);
            for (let id in sala.jugadores) {
                const j = sala.jugadores[id];
                if (j.isBot && j.rol === 'jugador') {
                    const tablilla = sala.tablillas.find(t => t.id === j.tablillaBloqueada);
                    if (tablilla && tablilla.cartas.includes(carta)) {
                        setTimeout(() => {
                            if (['jugando', 'gracia', 'votando'].includes(sala.estado) && !j.marcas.includes(carta)) {
                                const msReaccionBot = tiempoReaccionBot + Math.floor(Math.random() * 500);
                                if (sala.marcarCartaJugador(id, carta, msReaccionBot)) {
                                    io.to(nombreSala).emit('casilla_marcada', { idJugador: id, carta: carta });
                                    if (j.marcas.length === 16 && !sala.ganadores.includes(id)) {
                                        setTimeout(() => { procesarVictoriaGlobal(nombreSala, id); }, 3000);
                                    }
                                }
                            }
                        }, tiempoReaccionBot);
                    }
                }
            }
            if (sala.mazo.length === 0) {
                clearInterval(sala.intervalo);
                iniciarPeriodoDeGracia(nombreSala);
            }
        } else {
            clearInterval(sala.intervalo);
            if (sala.ganadores.length > 0) finalizarPartidaVisual(nombreSala);
            else iniciarVotacionRevolver(nombreSala);
        }
    };

    const procesarResultadoVotacionContinuar = (nombreSala) => {
        const sala = partidasActivas[nombreSala]; clearInterval(sala.votacion.temporizador);
        const numHumanos = sala.getHumanos().filter(j => j.rol === 'jugador').length;
        const votosNo = numHumanos - sala.votacion.votosSi;
        let continua = sala.votacion.votosSi > votosNo ? true : (sala.votacion.votosSi === votosNo ? sala.votacion.votoAnfitrion : false);

        if (continua) {
            sala.estado = 'jugando'; io.to(nombreSala).emit('votacion_cerrada', true);
            if (sala.mazo.length > 0) sala.intervalo = setInterval(() => sacarCarta(nombreSala), sala.config.velocidadGriton);
            else iniciarPeriodoDeGracia(nombreSala);
        } else {
            io.to(nombreSala).emit('votacion_cerrada', false); finalizarPartidaVisual(nombreSala);
        }
    };

    const procesarVictoriaGlobal = (nombreSala, idJugador) => {
        const sala = partidasActivas[nombreSala];
        if(!sala || !['jugando', 'gracia'].includes(sala.estado)) return;
        
        const jugador = sala.jugadores[idJugador];
        const posicion = sala.registrarVictoria(idJugador); 
        
        if (posicion > 0) {
            if (posicion === 1) {
                clearInterval(sala.intervalo); sala.estado = 'votando';
                sala.votacion = { votosSi: 0, votosNo: 0, votantes: new Set(), tiempoRestante: TIEMPO_VOTACION_SEC, votoAnfitrion: false };
                io.to(nombreSala).emit('iniciar_votacion', { nombre: jugador.nombre, foto: jugador.foto, tiempo: TIEMPO_VOTACION_SEC });
                sala.votacion.temporizador = setInterval(() => {
                    sala.votacion.tiempoRestante--; io.to(nombreSala).emit('tick_votacion', sala.votacion.tiempoRestante);
                    if (sala.votacion.tiempoRestante <= 0) procesarResultadoVotacionContinuar(nombreSala);
                }, 1000);
            } else {
                io.to(nombreSala).emit('mensaje_chat', { nombre: 'SISTEMA', mensaje: `¡${jugador.nombre} es el #${posicion}!` });
                io.to(nombreSala).emit('nuevo_ganador_notificacion', { nombre: jugador.nombre, posicion: posicion });
            }
        }
    };

    const iniciarJuegoReal = (nombreSala) => {
        const sala = partidasActivas[nombreSala];
        if (!sala) return;

        detenerTimerInactividad(nombreSala);
        sala.esPublica = false; 
        emitirSalasPublicas();
        
        sala.prepararJuego();
        
        const infoJugadores = {};
        for(const id in sala.jugadores) {
            if(sala.jugadores[id].rol === 'jugador') {
                const tablilla = sala.tablillas.find(t => t.id === sala.jugadores[id].tablillaBloqueada);
                infoJugadores[id] = { nombre: sala.jugadores[id].nombre, foto: sala.jugadores[id].foto, cartas: tablilla ? tablilla.cartas : [], marcas: [] };
            }
        }
        io.to(nombreSala).emit('juego_iniciado', infoJugadores);
        io.to(nombreSala).emit('mensaje_chat', { nombre: 'SISTEMA', mensaje: '¡La partida va a comenzar!' });

        let tiempoPrep = 5;
        io.to(nombreSala).emit('actualizar_texto_carta', `¡CORRE Y SE VA CON... ${tiempoPrep}`);
        sala.intervalo = setInterval(() => {
            tiempoPrep--;
            if (tiempoPrep > 0) io.to(nombreSala).emit('actualizar_texto_carta', `¡CORRE Y SE VA CON... ${tiempoPrep}`);
            else {
                clearInterval(sala.intervalo); sacarCarta(nombreSala);
                sala.intervalo = setInterval(() => sacarCarta(nombreSala), sala.config.velocidadGriton);
            }
        }, 1000);
    };

    // --- EVENTOS DE SOCKET.IO ---
    socket.emit('salas_publicas_actualizadas', Object.values(partidasActivas).filter(s => s.esPublica && s.estado === 'espera').map(s => ({nombreSala: s.nombre, codigo: s.codigo, anfitrion: s.jugadores[s.anfitrion]?.nombre || 'Esperando...', jugadores: s.getJugadoresActivos().length})));

    socket.on('crear_sala', ({ nombreSala, esPublica }) => {
        if (partidasActivas[nombreSala]) return socket.emit('error_sala', 'El nombre ya existe.');

        const nuevaSala = new Sala(nombreSala, socket.id, esPublica);
        nuevaSala.jugadores[socket.id] = { nombre: '', foto: null, rol: 'jugador', viendoTablilla: null, tablillaBloqueada: null, marcas: [], enLobby: true, isBot: false };
        partidasActivas[nombreSala] = nuevaSala;

        socket.join(nombreSala);
        socket.emit('sala_creada', { nombreSala, codigoSala: nuevaSala.codigo, tablillas: nuevaSala.tablillas, esAnfitrion: true, config: nuevaSala.config });
        
        iniciarTimerInactividad(nombreSala);
        emitirListas(nombreSala);
    });

    socket.on('unirse_sala', (datos) => {
        const sala = partidasActivas[datos.nombreSala];
        if (!sala || sala.codigo !== datos.codigoSala) return socket.emit('error_sala', 'Sala no encontrada.');
        
        const numJugadores = sala.getJugadoresActivos().length;
        const numEspectadores = Object.values(sala.jugadores).filter(j => j.rol === 'espectador').length;
        let rolFinal = datos.rolElegido;

        if (sala.config.sinEspectadores && rolFinal === 'espectador') return socket.emit('error_sala', 'SIN ESPECTADORES.');
        if (rolFinal === 'espectador' && numEspectadores >= MAX_ESPECTADORES) return socket.emit('error_sala', 'Límite de espectadores.');
        if (rolFinal === 'jugador' && numJugadores >= MAX_JUGADORES) {
            if (sala.config.sinEspectadores || numEspectadores >= MAX_ESPECTADORES) return socket.emit('error_sala', 'Sala llena.');
            socket.emit('error_sala', 'Entras como espectador.'); rolFinal = 'espectador';
        }

        socket.join(datos.nombreSala);

        if (['jugando', 'votando', 'votando_revolver', 'gracia', 'finalizado'].includes(sala.estado)) {
            sala.jugadores[socket.id] = { nombre: '', foto: null, rol: 'espectador', viendoTablilla: null, tablillaBloqueada: null, marcas: [], enLobby: true, isBot: false };
            if(sala.estado !== 'finalizado') {
                const infoJugadores = {};
                for(const id in sala.jugadores) {
                    if(sala.jugadores[id].rol === 'jugador') {
                        const t = sala.tablillas.find(tab => tab.id === sala.jugadores[id].tablillaBloqueada);
                        infoJugadores[id] = { nombre: sala.jugadores[id].nombre, foto: sala.jugadores[id].foto, cartas: t ? t.cartas : [], marcas: sala.jugadores[id].marcas };
                    }
                }
                socket.emit('unido_como_espectador', { cartasJugadas: sala.cartasJugadas, infoJugadores, config: sala.config });
            }
            emitirListas(datos.nombreSala);
            return;
        }

        sala.jugadores[socket.id] = { nombre: '', foto: null, rol: rolFinal, viendoTablilla: null, tablillaBloqueada: null, marcas: [], enLobby: true, isBot: false };
        socket.emit('sala_unida', { nombreSala: datos.nombreSala, tablillas: sala.tablillas, rol: rolFinal, esAnfitrion: false, config: sala.config });
        emitirListas(datos.nombreSala);
    });

    socket.on('partida_rapida', () => {
        let bestRoom = null; let maxPlayers = -1;
        for (const nombre in partidasActivas) {
            const s = partidasActivas[nombre];
            if (s.esPublica && s.estado === 'espera') {
                const numJ = s.getJugadoresActivos().length;
                if (numJ < MAX_JUGADORES && numJ > maxPlayers) { maxPlayers = numJ; bestRoom = nombre; }
            }
        }
        if (bestRoom) socket.emit('partida_rapida_encontrada', { nombreSala: bestRoom, codigoSala: partidasActivas[bestRoom].codigo });
        else socket.emit('partida_rapida_crear', "Sala_" + Math.random().toString(36).substr(2, 4).toUpperCase());
    });

    socket.on('enviar_mensaje', (datos) => {
        const sala = partidasActivas[datos.nombreSala];
        if (sala && sala.jugadores[socket.id]) {
            io.to(datos.nombreSala).emit('mensaje_chat', { nombre: sala.jugadores[socket.id].nombre || "Anónimo", mensaje: datos.mensaje, foto: sala.jugadores[socket.id].foto });
        }
    });

    socket.on('agregar_bot', (datos) => {
        const sala = partidasActivas[datos.nombreSala];
        if (sala && sala.estado === 'espera' && sala.anfitrion === socket.id) {
            const resultado = sala.agregarBot(datos.nombreBot);
            if(resultado) {
                io.to(datos.nombreSala).emit('mensaje_chat', { nombre: resultado.bot.nombre, foto: resultado.bot.foto, mensaje: resultado.insultoStr });
                io.to(datos.nombreSala).emit('actualizar_tablillas', sala.tablillas);
                emitirListas(datos.nombreSala);
            }
        }
    });

    socket.on('escribiendo_nombre', (d) => { const s = partidasActivas[d.nombreSala]; if (s && s.jugadores[socket.id]) { s.jugadores[socket.id].nombre = d.nuevoNombre; emitirListas(d.nombreSala); }});
    socket.on('subir_foto', (d) => { const s = partidasActivas[d.nombreSala]; if (s && s.jugadores[socket.id]) { s.jugadores[socket.id].foto = d.fotoBase64; emitirListas(d.nombreSala); }});
    socket.on('cambiar_config', (d) => { const s = partidasActivas[d.nombreSala]; if (s && s.anfitrion === socket.id && s.estado === 'espera') { s.config = d.config; io.to(d.nombreSala).emit('config_actualizada', s.config); }});
    
    socket.on('cambiar_rol', (datos) => {
        const sala = partidasActivas[datos.nombreSala];
        if (!sala || sala.estado !== 'espera') return;
        const jugador = sala.jugadores[socket.id];
        
        if (datos.nuevoRol === 'jugador' && Object.values(sala.jugadores).filter(j => j.rol === 'jugador').length >= MAX_JUGADORES) return socket.emit('error_sala', 'Sala llena (8/8).');
        if (datos.nuevoRol === 'espectador') {
            if (sala.config.sinEspectadores) return socket.emit('error_sala', 'EN ESTA SALA NO SE ADMITEN ESPECTADORES.');
            if (Object.values(sala.jugadores).filter(j => j.rol === 'espectador').length >= MAX_ESPECTADORES) return socket.emit('error_sala', 'Límite de espectadores lleno (4/4).');
        }
        
        if (jugador.rol === 'jugador') {
            sala.tablillas.forEach(t => { t.viendoPor = t.viendoPor.filter(id => id !== socket.id); if (t.bloqueadaPor === socket.id) t.bloqueadaPor = null; });
            jugador.viendoTablilla = null; jugador.tablillaBloqueada = null;
        }
        jugador.rol = datos.nuevoRol;
        io.to(datos.nombreSala).emit('actualizar_tablillas', sala.tablillas); emitirListas(datos.nombreSala); socket.emit('rol_cambiado', datos.nuevoRol);
    });

    socket.on('bloquear_tablilla', (n) => {
        const s = partidasActivas[n]; if(!s || s.estado !== 'espera') return;
        const j = s.jugadores[socket.id]; if(j && j.rol === 'jugador' && j.viendoTablilla) {
            const t = s.tablillas.find(tb => tb.id === j.viendoTablilla);
            if(t && !t.bloqueadaPor) { t.bloqueadaPor = socket.id; t.viendoPor = []; j.tablillaBloqueada = t.id; io.to(n).emit('actualizar_tablillas', s.tablillas); emitirListas(n); }
        }
    });
    
    socket.on('ver_tablilla', (d) => {
        const s = partidasActivas[d.nombreSala]; if(!s || s.estado !== 'espera') return;
        const j = s.jugadores[socket.id]; if(j && j.rol==='jugador' && !j.tablillaBloqueada) {
            s.tablillas.forEach(t => t.viendoPor = t.viendoPor.filter(id => id !== socket.id));
            const t = s.tablillas.find(tb => tb.id === d.idTablilla);
            if(t && !t.bloqueadaPor) { t.viendoPor.push(socket.id); j.viendoTablilla = t.id; io.to(d.nombreSala).emit('actualizar_tablillas', s.tablillas); }
        }
    });

    socket.on('desbloquear_tablilla', (n) => {
        const s = partidasActivas[n]; if(!s || s.estado !== 'espera') return;
        const j = s.jugadores[socket.id]; if(j && j.tablillaBloqueada) {
            const t = s.tablillas.find(tb => tb.id === j.tablillaBloqueada);
            if(t) t.bloqueadaPor = null; j.tablillaBloqueada = null; j.viendoTablilla = null;
            io.to(n).emit('actualizar_tablillas', s.tablillas); emitirListas(n);
        }
    });

    // NUEVO: INTERCEPTOR DEL CREADOR DE TABLILLAS
    socket.on('guardar_tablilla_custom', (d) => {
        const s = partidasActivas[d.nombreSala];
        if (s && s.estado === 'espera') {
            // Validamos que sean 16 cartas exactas y que no haya repetidas
            if (d.cartas.length === 16 && new Set(d.cartas).size === 16) {
                s.asignarTablillaPersonalizada(socket.id, d.cartas);
                io.to(d.nombreSala).emit('actualizar_tablillas', s.tablillas);
                emitirListas(d.nombreSala);
            }
        }
    });

    socket.on('solicitar_iniciar_juego', (nombreSala) => {
        const sala = partidasActivas[nombreSala];
        if (!sala || sala.estado !== 'espera' || sala.anfitrion !== socket.id) return;
        const afks = Object.values(sala.jugadores).filter(j => j.rol === 'jugador' && !j.enLobby && !j.isBot).map(j=>j.nombre);
        
        if (afks.length > 0) socket.emit('confirmar_afk', afks);
        else iniciarJuegoReal(nombreSala);
    });

    socket.on('iniciar_juego_confirmado', (nombreSala) => { iniciarJuegoReal(nombreSala); });

    socket.on('marcar_casilla', (datos) => {
        const sala = partidasActivas[datos.nombreSala];
        if(!sala || !['jugando', 'gracia'].includes(sala.estado)) return;
        
        if (sala.marcarCartaJugador(socket.id, datos.carta, datos.ms)) {
            io.to(datos.nombreSala).emit('casilla_marcada', { idJugador: socket.id, carta: datos.carta });
        }
    });

    socket.on('cantar_loteria', (n) => procesarVictoriaGlobal(n, socket.id));

    socket.on('votar_continuar', (d) => {
        const sala = partidasActivas[d.nombreSala];
        if (!sala || sala.estado !== 'votando') return;
        if (sala.jugadores[socket.id] && !sala.votacion.votantes.has(socket.id) && !sala.jugadores[socket.id].isBot) {
            sala.votacion.votantes.add(socket.id);
            if (d.voto) sala.votacion.votosSi++;
            if (socket.id === sala.anfitrion) sala.votacion.votoAnfitrion = d.voto;
            const numHumanos = sala.getHumanos().filter(j => j.rol === 'jugador').length;
            if (sala.votacion.votantes.size === numHumanos) procesarResultadoVotacionContinuar(d.nombreSala);
        }
    });

    socket.on('votar_revolver', (n) => {
        const sala = partidasActivas[n];
        if (!sala || sala.estado !== 'votando_revolver') return;
        if (sala.jugadores[socket.id] && !sala.votacion.votantes.has(socket.id) && !sala.jugadores[socket.id].isBot) {
            sala.votacion.votantes.add(socket.id); sala.votacion.votosSi++; 
            const numHumanos = sala.getHumanos().filter(j => j.rol === 'jugador').length;
            if (sala.votacion.votantes.size === numHumanos) procesarResultadoVotacionRevolver(n);
        }
    });

    socket.on('volver_lobby', (nombreSala) => {
        const sala = partidasActivas[nombreSala]; if(!sala) return;
        const jugador = sala.jugadores[socket.id];
        
        if (['jugando', 'votando', 'votando_revolver', 'gracia'].includes(sala.estado)) {
            if(jugador) { jugador.rol = 'espectador'; jugador.tablillaBloqueada = null; jugador.viendoTablilla = null; jugador.marcas = []; jugador.enLobby = true; }
            const infoJugadores = {};
            for(const id in sala.jugadores) {
                if(sala.jugadores[id].rol === 'jugador') {
                    const t = sala.tablillas.find(tab => tab.id === sala.jugadores[id].tablillaBloqueada);
                    infoJugadores[id] = { nombre: sala.jugadores[id].nombre, foto: sala.jugadores[id].foto, cartas: t ? t.cartas : [], marcas: sala.jugadores[id].marcas };
                }
            }
            socket.emit('unido_como_espectador', { cartasJugadas: sala.cartasJugadas, infoJugadores, config: sala.config });
            emitirListas(nombreSala); return;
        }

        if(jugador) { jugador.tablillaBloqueada = null; jugador.viendoTablilla = null; jugador.marcas = []; jugador.enLobby = true; }
        
        if(sala.estado === 'finalizado') {
            sala.estado = 'espera'; 
            sala.esPublica = sala.fueCreadaPublica; 
            iniciarTimerInactividad(nombreSala);
            
            sala.tablillas.forEach(t => { t.viendoPor = []; t.bloqueadaPor = null; });
            Object.keys(sala.jugadores).forEach(id => { const j = sala.jugadores[id]; j.marcas = []; j.tablillaBloqueada = null; });

            Object.keys(sala.jugadores).forEach(id => {
                const j = sala.jugadores[id];
                if (j.isBot) {
                    const libres = sala.tablillas.filter(t => t.bloqueadaPor === null);
                    if (libres.length > 0) { const asig = libres[Math.floor(Math.random() * libres.length)]; j.tablillaBloqueada = asig.id; asig.bloqueadaPor = id; }
                }
            });
        }
        socket.emit('regreso_al_lobby_exitoso'); io.to(nombreSala).emit('actualizar_tablillas', sala.tablillas); emitirListas(nombreSala);
    });

    socket.on('expulsar_jugador', (d) => {
        const s = partidasActivas[d.nombreSala];
        if (s && s.anfitrion === socket.id && s.jugadores[d.idJugador]) {
            if(!s.jugadores[d.idJugador].isBot) {
                io.to(d.idJugador).emit('expulsado_de_sala'); 
                io.sockets.sockets.get(d.idJugador)?.leave(d.nombreSala);
            }
            s.removerJugador(d.idJugador);
            if (s.estado === 'espera') io.to(d.nombreSala).emit('actualizar_tablillas', s.tablillas); 
            emitirListas(d.nombreSala);
        }
    });

    socket.on('salir_sala', () => { manejarSalidaJugador(socket.id); socket.emit('salida_exitosa'); });
    socket.on('disconnect', () => { manejarSalidaJugador(socket.id); });
};