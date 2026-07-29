// public/js/app.js
import state from './state.js';
import { CARTAS_LOTERIA } from './cartas.js';
import * as ui from './ui.js';

const socket = io();
state.socketId = socket.id;

// ==========================================
// 1. EVENTOS DEL DOM (Cero 'onclick' en HTML)
// ==========================================

// Navegación Básica
document.getElementById('btnMenuAnfitrion').addEventListener('click', () => { document.getElementById('formAnfitrion').style.display = 'block'; document.getElementById('formUnirse').style.display = 'none'; });
document.getElementById('btnMenuUnirse').addEventListener('click', () => { document.getElementById('formUnirse').style.display = 'block'; document.getElementById('formAnfitrion').style.display = 'none'; });

// Creación y Conexión a Salas
document.getElementById('btnCrearSala').addEventListener('click', () => { 
    const n = document.getElementById('crearNombreSala').value; 
    const esPub = !document.getElementById('checkSalaPrivada').checked;
    if(n) { state.miSalaActual = n; socket.emit('crear_sala', { nombreSala: n, esPublica: esPub }); }
});

document.getElementById('btnUnirseSala').addEventListener('click', () => {
    const n = document.getElementById('unirNombreSala').value; 
    const c = document.getElementById('unirCodigoSala').value.toUpperCase(); 
    const r = document.querySelector('input[name="rolIngreso"]:checked').value;
    if(n && c) { state.miSalaActual = n; socket.emit('unirse_sala', { nombreSala: n, codigoSala: c, rolElegido: r }); }
});

document.getElementById('btnPartidaRapida').addEventListener('click', () => { socket.emit('partida_rapida'); });

// Event Delegation para botones dinámicos (Unirse a tabla pública y Expulsar)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-unirse-tabla')) {
        const sala = e.target.getAttribute('data-sala');
        const codigo = e.target.getAttribute('data-codigo');
        state.miSalaActual = sala;
        socket.emit('unirse_sala', { nombreSala: sala, codigoSala: codigo, rolElegido: 'jugador' });
    }
    if (e.target.classList.contains('btn-kick')) {
        const id = e.target.getAttribute('data-id');
        const nombre = e.target.getAttribute('data-nombre');
        ui.mostrarModalExpulsion(nombre, () => {
            socket.emit('expulsar_jugador', { nombreSala: state.miSalaActual, idJugador: id });
        });
    }
});

// Herramientas del Lobby
document.getElementById('inputFoto').addEventListener('change', (e) => {
    const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
    reader.onload = (event) => { socket.emit('subir_foto', { nombreSala: state.miSalaActual, fotoBase64: event.target.result }); }; reader.readAsDataURL(file);
});

document.getElementById('nombreTiempoReal').addEventListener('input', (e) => socket.emit('escribiendo_nombre', { nombreSala: state.miSalaActual, nuevoNombre: e.target.value }));
document.getElementById('btnCambiarRol').addEventListener('click', () => socket.emit('cambiar_rol', { nombreSala: state.miSalaActual, nuevoRol: state.miRol === 'jugador' ? 'espectador' : 'jugador' }));
document.getElementById('btnBloquear').addEventListener('click', () => socket.emit('bloquear_tablilla', state.miSalaActual));
document.getElementById('btnDesbloquear').addEventListener('click', () => socket.emit('desbloquear_tablilla', state.miSalaActual));
document.getElementById('btnAgregarBot').addEventListener('click', () => {
    const nBot = document.getElementById('nombreBotInput').value;
    socket.emit('agregar_bot', { nombreSala: state.miSalaActual, nombreBot: nBot });
    document.getElementById('nombreBotInput').value = "";
});

// Chat
const enviarMsjChat = () => {
    const input = document.getElementById('chatInput');
    if(input.value.trim() !== "") { socket.emit('enviar_mensaje', { nombreSala: state.miSalaActual, mensaje: input.value }); input.value = ""; }
};
document.getElementById('btnEnviarChat').addEventListener('click', enviarMsjChat);
document.getElementById('chatInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') enviarMsjChat(); });

// Configuraciones (Host)
const enviarConfiguracion = () => {
    if(!state.soyAnfitrion) return;
    const val = document.querySelector('input[name="velGriton"]:checked').value;
    let vG = 3000, tM = 5000;
    if(val === '5') { vG = 5000; tM = 6000; } else if(val === '2') { vG = 2000; tM = 4000; }
    const aN = document.getElementById('checkAyudaNinos').checked; 
    const sE = document.getElementById('checkSinEspectadores').checked;
    state.configSala = { velocidadGriton: vG, tiempoMarcar: tM, ayudaNinos: aN, sinEspectadores: sE };
    socket.emit('cambiar_config', { nombreSala: state.miSalaActual, config: state.configSala });
};
document.querySelectorAll('input[name="velGriton"]').forEach(r => r.addEventListener('change', enviarConfiguracion));
document.getElementById('checkAyudaNinos').addEventListener('change', enviarConfiguracion);
document.getElementById('checkSinEspectadores').addEventListener('change', enviarConfiguracion);

// Acciones de Juego (Botones Base)
document.getElementById('btnIniciar').addEventListener('click', () => socket.emit('solicitar_iniciar_juego', state.miSalaActual));
document.getElementById('btnLoteria').addEventListener('click', () => { document.getElementById('btnLoteria').disabled = true; socket.emit('cantar_loteria', state.miSalaActual); });
document.getElementById('btnVolverLobby').addEventListener('click', () => socket.emit('volver_lobby', state.miSalaActual));
document.getElementById('btnFinalizarPartida').addEventListener('click', () => socket.emit('salir_sala'));

// Modales Votación y AFK
document.getElementById('btnIniciarForzadoAFK').addEventListener('click', () => { document.getElementById('modalAFK').style.display = 'none'; socket.emit('iniciar_juego_confirmado', state.miSalaActual); });
document.getElementById('btnCancelarAFK').addEventListener('click', () => { document.getElementById('modalAFK').style.display = 'none'; });
document.getElementById('btnVotoSi').addEventListener('click', () => { document.getElementById('botonesVotacion').style.display = 'none'; document.getElementById('mensajeEsperaVotacion').style.display = 'block'; socket.emit('votar_continuar', { nombreSala: state.miSalaActual, voto: true }); });
document.getElementById('btnVotoNo').addEventListener('click', () => { document.getElementById('botonesVotacion').style.display = 'none'; document.getElementById('mensajeEsperaVotacion').style.display = 'block'; socket.emit('votar_continuar', { nombreSala: state.miSalaActual, voto: false }); });
document.getElementById('btnVotoRevolver').addEventListener('click', () => { document.getElementById('botonesSinCartas').style.display = 'none'; document.getElementById('msgEsperaRevolver').style.display = 'block'; socket.emit('votar_revolver', state.miSalaActual); });


// ==========================================
// 2. LÓGICA DE DIBUJO COMPLEJA (Callbacks)
// ==========================================
function renderizarTablillasCallback(t) {
    const cont = document.getElementById('contenedorTablillas'); cont.innerHTML = ''; 
    t.forEach(tab => {
        const divTab = document.createElement('div'); divTab.className = 'tablilla';
        if (tab.bloqueadaPor) { if (tab.bloqueadaPor === socket.id) divTab.classList.add('bloqueada-mia'); else divTab.classList.add('bloqueada-otros'); } 
        else if (tab.viendoPor.length > 0) { if (tab.viendoPor.includes(socket.id)) divTab.classList.add('viendo-mia'); else divTab.classList.add('viendo-otros'); }
        divTab.innerHTML = `<h4>Tablilla ${tab.id}</h4><div class="grid-cartas"></div>`;
        const grid = divTab.querySelector('.grid-cartas');
        tab.cartas.forEach(c => { 
            const divC = document.createElement('div'); 
            divC.className = 'carta'; 
            
            const numCarta = c.split(' ')[1]; // Sacamos el número
            divC.dataset.numero = numCarta; // <-- Asignamos el data-attribute
            const infoCarta = CARTAS_LOTERIA[numCarta];

            // Si tienes la imagen en el diccionario, la pinta, sino pone el número por default
            if (infoCarta) {
                divC.innerHTML = `<img src="${infoCarta.img}" alt="${infoCarta.nombre}" style="width:100%; height:100%; object-fit:cover; border-radius:3px;">`;
            } else {
                divC.textContent = numCarta; 
            }
            
            grid.appendChild(divC); 
        });
        divTab.addEventListener('click', () => { if (state.miRol === 'jugador' && !tab.bloqueadaPor) socket.emit('ver_tablilla', { nombreSala: state.miSalaActual, idTablilla: tab.id }); });
        cont.appendChild(divTab);
    });
}

function construirPanelEspectadorCb() {
    document.getElementById('panelEspectadorUI').style.display = 'block'; document.getElementById('tituloEspectando').style.display = 'block';
    const contChecks = document.getElementById('listaChecksJugadores'); contChecks.innerHTML = '';
    for (const id in state.estadoJugadores) if (id !== socket.id) contChecks.innerHTML += `<label style="margin-right:15px;"><input type="checkbox" class="check-jugador" value="${id}"> ${state.estadoJugadores[id].nombre || 'Anónimo'}</label>`;
    const cTodos = document.getElementById('checkTodos'); const cInd = document.querySelectorAll('.check-jugador');
    cTodos.addEventListener('change', (e) => { cInd.forEach(c => c.checked = e.target.checked); renderTabEspectadoresCb(); });
    cInd.forEach(c => c.addEventListener('change', () => { if(!c.checked) cTodos.checked = false; renderTabEspectadoresCb(); }));
}

function renderTabEspectadoresCb() {
    const cont = document.getElementById('contenedorEspectador'); cont.innerHTML = '';
    document.querySelectorAll('.check-jugador:checked').forEach(chk => {
        const id = chk.value; const d = state.estadoJugadores[id];
        const divTab = document.createElement('div'); divTab.className = 'tablilla'; divTab.id = `tablilla-espectador-${id}`;
        let img = d.foto ? `<img src="${d.foto}" class="foto-perfil">` : '';
        divTab.innerHTML = `<h4>Juego de: ${d.nombre} ${img}</h4><div class="grid-cartas"></div>`;
        const grid = divTab.querySelector('.grid-cartas');
        d.cartas.forEach(c => {
            const divC = document.createElement('div'); 
            divC.className = 'carta'; 
            
            const numCarta = c.split(' ')[1];
            divC.dataset.numero = numCarta; // <-- Asignamos el data-attribute
            const infoCarta = CARTAS_LOTERIA[numCarta];

            if (infoCarta) {
                divC.innerHTML = `<img src="${infoCarta.img}" style="width:100%; height:100%; object-fit:cover; border-radius:3px;">`;
            } else {
                divC.textContent = numCarta;
            }

            if(d.marcas.includes(c)) { 
                divC.classList.add('marcada'); 
                divC.innerHTML += '<div class="palomita">✔</div>'; 
            }
            grid.appendChild(divC);
        });
        cont.appendChild(divTab);
    });
}


// ==========================================
// 3. EVENTOS DE SOCKET.IO
// ==========================================
socket.on('salas_publicas_actualizadas', (salas) => ui.pintarSalasPublicas(salas));
socket.on('partida_rapida_encontrada', (d) => { state.miSalaActual = d.nombreSala; socket.emit('unirse_sala', { nombreSala: d.nombreSala, codigoSala: d.codigoSala, rolElegido: 'jugador' }); });
socket.on('partida_rapida_crear', (n) => { state.miSalaActual = n; socket.emit('crear_sala', { nombreSala: n, esPublica: true }); });

socket.on('sala_destruida_inactividad', (minutos) => {
    ui.mostrarModalError(`La sala fue cerrada por inactividad (${minutos} Minutos).`, () => window.location.reload());
});

socket.on('mensaje_chat', (datos) => ui.pintarMensajeChat(datos));
socket.on('config_actualizada', (cfg) => { if(!state.soyAnfitrion) ui.actualizarUIConfig(cfg, state); });
socket.on('confirmar_afk', (nombres) => { document.getElementById('listaNombresAFK').textContent = nombres.join(', '); document.getElementById('modalAFK').style.display = 'flex'; });
socket.on('salida_exitosa', () => { window.location.reload(); });
socket.on('expulsado_de_sala', () => ui.mostrarModalError("Has sido expulsado de la sala.", true));

socket.on('error_sala', (msg) => {
    ui.mostrarModalError(msg);
    document.getElementById('btnBloquear').style.display = 'none'; 
    document.getElementById('btnDesbloquear').style.display = 'none';
});

socket.on('sala_creada', (d) => { 
    state.soyAnfitrion = true; state.miRol = 'jugador'; ui.actualizarUIConfig(d.config, state); ui.initLobby(d.nombreSala, d.codigoSala, d.tablillas, renderizarTablillasCallback); 
    document.getElementById('etiquetaHost').style.display='inline'; document.getElementById('btnIniciar').style.display = 'inline-block'; 
    document.getElementById('panelConfiguracion').classList.add('es-host'); document.getElementById('controlesBot').style.display = 'block';
});

socket.on('sala_unida', (d) => { 
    state.soyAnfitrion = false; state.miRol = d.rol; ui.actualizarUIConfig(d.config, state); ui.initLobby(d.nombreSala, "Oculto", d.tablillas, renderizarTablillasCallback); 
    document.getElementById('btnCambiarRol').textContent = state.miRol === 'jugador' ? 'Cambiar a Espectador' : 'Cambiar a Jugador';
    const cont = document.getElementById('contenedorTablillas');
    if (state.miRol === 'espectador') { cont.style.opacity = '0.5'; cont.style.pointerEvents = 'none'; } else { cont.style.opacity = '1'; cont.style.pointerEvents = 'auto'; }
});

socket.on('unido_como_espectador', (d) => { 
    state.juegoEnCurso = false; state.misCartasMarcadas = 0; document.getElementById('btnLoteria').disabled = true; document.getElementById('btnLoteria').style.display = 'none';
    document.getElementById('cartaActual').textContent = 'Esperando a que inicie el juego...'; document.getElementById('cartaActual').style.color = "blue";
    state.miRol = 'espectador'; state.soyAnfitrion = false; ui.actualizarUIConfig(d.config, state); state.estadoJugadores = d.infoJugadores; 
    ui.initLobby(state.miSalaActual, "Espectador", [], renderizarTablillasCallback); 
    ui.prepararInterfazJuego(state, construirPanelEspectadorCb); 
});

socket.on('rol_cambiado', (r) => { 
    state.miRol = r; 
    document.getElementById('btnCambiarRol').textContent = state.miRol === 'jugador' ? 'Cambiar a Espectador' : 'Cambiar a Jugador';
    const cont = document.getElementById('contenedorTablillas');
    if (state.miRol === 'espectador') { cont.style.opacity = '0.5'; cont.style.pointerEvents = 'none'; } else { cont.style.opacity = '1'; cont.style.pointerEvents = 'auto'; }
    if (state.configSala.sinEspectadores) document.getElementById('btnCambiarRol').style.display = 'none';
    document.getElementById('btnBloquear').style.display = 'none'; document.getElementById('btnDesbloquear').style.display = 'none';
});

socket.on('actualizar_listas', (listas) => ui.actualizarListas(listas, state));

socket.on('estado_boton_iniciar', (listos) => { 
    if (state.soyAnfitrion && !state.juegoEnCurso) { 
        const b = document.getElementById('btnIniciar'); b.style.display = 'inline-block'; b.disabled = !listos; b.style.backgroundColor = listos ? 'lightgreen' : 'lightgray'; 
    } 
});

socket.on('nuevo_anfitrion', () => {
    state.soyAnfitrion = true; document.getElementById('etiquetaHost').style.display = 'inline'; 
    if(!state.juegoEnCurso) { document.getElementById('btnIniciar').style.display = 'inline-block'; document.getElementById('panelConfiguracion').classList.add('es-host'); document.getElementById('controlesBot').style.display = 'block'; }
});

socket.on('actualizar_tablillas', (t) => { 
    renderizarTablillasCallback(t); 
    
    if (state.miRol === 'jugador') {
        let viendo = false; let bloqueada = false;
        t.forEach(tb => { if (tb.viendoPor.includes(socket.id)) viendo = true; if (tb.bloqueadaPor === socket.id) bloqueada = true; });
        document.getElementById('btnBloquear').style.display = (viendo && !bloqueada) ? 'inline-block' : 'none';
        document.getElementById('btnDesbloquear').style.display = bloqueada ? 'inline-block' : 'none';
    }

    if (state.juegoEnCurso) {
        document.querySelectorAll('.tablilla').forEach(el => {
            if(!el.classList.contains('bloqueada-mia') && state.miRol === 'jugador') el.style.display = 'none';
            else if (state.miRol === 'espectador') el.style.display = 'none'; else el.classList.remove('bloqueada-mia'); 
        });
    }
});

socket.on('juego_iniciado', (info) => { state.estadoJugadores = info; ui.prepararInterfazJuego(state, construirPanelEspectadorCb); });
socket.on('actualizar_texto_carta', (texto) => { document.getElementById('cartaActual').textContent = texto; });

// LA LÓGICA DE ILUMINACIÓN Y CLICK DE CARTAS 
socket.on('nueva_carta', (carta) => {
    const numCarta = carta.split(' ')[1];
    const infoCarta = CARTAS_LOTERIA[numCarta];

    // Mostrar el nombre real y la foto en el gritón
    if (infoCarta) {
        document.getElementById('cartaActual').innerHTML = `
            <img src="${infoCarta.img}" style="height: 120px; vertical-align: middle; border-radius: 10px; margin-right: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
            <span>¡${infoCarta.nombre}!</span>
        `;
    } else {
        document.getElementById('cartaActual').textContent = carta;
    }
    const tsLlegada = Date.now();
    
    if (state.miRol === 'espectador') {
        document.querySelectorAll('#contenedorEspectador .carta').forEach(div => {
            if (div.dataset.numero === numCarta && !div.classList.contains('marcada')) { // <-- Actualizado
                div.classList.add('marcable-visual'); setTimeout(() => div.classList.remove('marcable-visual'), state.configSala.tiempoMarcar);
            }
        });
    }

    if (state.miRol === 'jugador') {
        document.querySelectorAll('#contenedorTablillas .carta').forEach(div => {
            if (div.dataset.numero === numCarta && !div.classList.contains('marcada')) { // <-- Actualizado
                div.dataset.activa = "true"; div.style.cursor = "pointer";
                if(state.configSala.ayudaNinos) div.classList.add('marcable-visual');

                const t = setTimeout(() => { div.dataset.activa = "false"; div.style.cursor = "default"; div.classList.remove('marcable-visual'); }, state.configSala.tiempoMarcar);
                
                div.onclick = function() {
                    if (div.dataset.activa === "true" && !div.classList.contains('marcada')) {
                        const msReaccion = Date.now() - tsLlegada;
                        clearTimeout(t); div.dataset.activa = "false"; div.classList.remove('marcable-visual'); div.style.cursor = "default"; 
                        div.classList.add('marcada'); div.innerHTML += '<div class="palomita">✔</div>';
                        state.misCartasMarcadas++;
                        if(state.misCartasMarcadas === 16) document.getElementById('btnLoteria').disabled = false;
                        socket.emit('marcar_casilla', { nombreSala: state.miSalaActual, carta: carta, ms: msReaccion });
                    }
                };
            }
        });
    }
});

socket.on('casilla_marcada', (d) => {
    if (state.estadoJugadores[d.idJugador]) state.estadoJugadores[d.idJugador].marcas.push(d.carta);
    const divTab = document.getElementById(`tablilla-espectador-${d.idJugador}`);
    if (divTab) {
        divTab.querySelectorAll('.carta').forEach(divC => {
            if (divC.dataset.numero === d.carta.split(' ')[1] && !divC.classList.contains('marcada')) { // <-- Actualizado
                divC.classList.add('marcada'); divC.innerHTML += '<div class="palomita">✔</div>';
            }
        });
    }
});

// Modales Votaciones
socket.on('iniciar_votacion', (datos) => {
    document.getElementById('nombreGanadorModal').textContent = datos.nombre; document.getElementById('modalVotacion').style.display = 'flex'; document.getElementById('tiempoVotacion').textContent = datos.tiempo;
    if(datos.foto) { document.getElementById('fotoGanadorModal').src = datos.foto; document.getElementById('fotoGanadorModal').style.display = 'block'; } else { document.getElementById('fotoGanadorModal').style.display = 'none'; }
    if(state.miRol !== 'jugador') {
        document.getElementById('botonesVotacion').style.display = 'none'; document.getElementById('mensajeEsperaVotacion').style.display = 'block'; document.getElementById('textoPreguntaVotacion').textContent = "Los jugadores deciden si continuar...";
    } else {
        document.getElementById('botonesVotacion').style.display = 'block'; document.getElementById('mensajeEsperaVotacion').style.display = 'none'; document.getElementById('textoPreguntaVotacion').textContent = "¿Deseas continuar con la partida?";
    }
});

socket.on('tick_votacion', (tiempo) => { document.getElementById('tiempoVotacion').textContent = tiempo; });
socket.on('votacion_cerrada', (continuar) => { document.getElementById('modalVotacion').style.display = 'none'; if(continuar) document.getElementById('cartaActual').textContent = '¡El juego continúa!'; });

socket.on('iniciar_votacion_revolver', (datos) => {
    document.getElementById('modalSinCartas').style.display = 'flex'; document.getElementById('tiempoSinCartas').textContent = datos.tiempo;
    if(state.miRol !== 'jugador') { document.getElementById('botonesSinCartas').style.display = 'none'; document.getElementById('msgEsperaRevolver').style.display = 'block'; } 
    else { document.getElementById('botonesSinCartas').style.display = 'block'; document.getElementById('msgEsperaRevolver').style.display = 'none'; }
});
socket.on('tick_votacion_revolver', (tiempo) => { document.getElementById('tiempoSinCartas').textContent = tiempo; });
socket.on('votacion_revolver_cerrada', (revolver) => { document.getElementById('modalSinCartas').style.display = 'none'; if(revolver) document.getElementById('cartaActual').textContent = '¡Mazo revuelto! ¡El juego continúa!'; });

socket.on('nuevo_ganador_notificacion', (d) => {
    const notif = document.getElementById('notificacionFlotante');
    notif.textContent = `¡${d.nombre} ha completado su tablilla (Lugar #${d.posicion})!`;
    notif.style.display = 'block'; setTimeout(() => { notif.style.display = 'none'; }, 4000);
});

socket.on('juego_terminado', (datos) => {
    state.juegoEnCurso = false; 
    ui.mostrarResultados(datos);
});

socket.on('regreso_al_lobby_exitoso', () => {
    state.juegoEnCurso = false; state.misCartasMarcadas = 0; document.getElementById('btnLoteria').disabled = true; document.getElementById('btnLoteria').style.display = 'none';
    document.getElementById('cartaActual').textContent = 'Esperando a que inicie el juego...'; document.getElementById('cartaActual').style.color = "blue";
    document.getElementById('pantallaResultados').classList.remove('activa'); document.getElementById('pantallaLobby').classList.add('activa');
    
    document.getElementById('cajasListas').style.display = 'flex'; document.getElementById('botonesTablilla').style.display = 'block';
    
    if(!state.configSala.sinEspectadores) document.getElementById('btnCambiarRol').style.display = 'inline-block'; 
    document.getElementById('nombreTiempoReal').disabled = false;
    document.getElementById('panelEspectadorUI').style.display = 'none'; document.getElementById('tituloEspectando').style.display = 'none';
    document.getElementById('contenedorEspectador').innerHTML = '';
    
    if (state.soyAnfitrion) {
        document.getElementById('btnIniciar').style.display = 'inline-block';
        document.getElementById('panelConfiguracion').classList.add('es-host');
        document.getElementById('controlesBot').style.display = 'block';
    }
});

socket.on('actualizar_timer_inactividad', (segs) => {
    const min = Math.floor(segs / 60).toString().padStart(2, '0');
    const sec = (segs % 60).toString().padStart(2, '0');
    document.getElementById('tiempoInactividadUI').textContent = `${min}:${sec}`;
    document.getElementById('relojInactividad').style.display = 'inline-block';
});