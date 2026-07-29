// public/js/app.js
import state from './state.js';
import { CARTAS_LOTERIA } from './cartas.js';
import * as ui from './ui.js';

const socket = io();
state.socketId = socket.id;
const TEXTO_LOBBY = `
    <div style="display:flex; flex-direction:column; align-items:center; gap: 10px;">
        <span>Selección y bloqueo de tablillas</span>
        <span style="font-size: 16px; font-weight: normal; color: var(--text-muted);">Selecciona la tablilla de tu agrado y bloquéala antes que alguien más te la gane.</span>
    </div>
`;

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

// NUEVO: Lógica del chat con "Enter" IN-GAME
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && state.juegoEnCurso && state.miRol === 'jugador') {
        const cont = document.getElementById('chatIngameContenedor');
        const input = document.getElementById('chatIngameInput');
        
        if (cont.style.display === 'none') {
            // Mostrar input flotante y ponerle focus
            const miFoto = state.estadoJugadores[socket.id]?.foto;
            const imgEl = document.getElementById('chatIngameFoto');
            imgEl.src = miFoto || '';
            imgEl.style.display = miFoto ? 'block' : 'none';
            
            cont.style.display = 'flex';
            input.focus();
        } else {
            // Enviar mensaje y ocultar
            if (input.value.trim() !== '') {
                socket.emit('enviar_mensaje', { nombreSala: state.miSalaActual, mensaje: input.value });
                input.value = '';
            }
            cont.style.display = 'none';
        }
    }
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
    // 1. Rescatamos el contenedor de botones antes de limpiar el HTML
    const contBotones = document.getElementById('botonesTablilla');
    if (contBotones && contBotones.parentNode !== document.body) {
        document.body.appendChild(contBotones); 
        contBotones.style.display = 'none';
    }

    const cont = document.getElementById('contenedorTablillas'); cont.innerHTML = ''; 
    t.forEach(tab => {
        const divTab = document.createElement('div'); divTab.className = 'tablilla';
        divTab.id = 'tablilla-dom-' + tab.id; // <-- ID ÚNICO
        
        if (tab.bloqueadaPor) { if (tab.bloqueadaPor === socket.id) divTab.classList.add('bloqueada-mia'); else divTab.classList.add('bloqueada-otros'); } 
        else if (tab.viendoPor.length > 0) { if (tab.viendoPor.includes(socket.id)) divTab.classList.add('viendo-mia'); else divTab.classList.add('viendo-otros'); }
        
        divTab.innerHTML = `<h4>Tablilla ${tab.id}</h4><div class="grid-cartas"></div>`;
        const grid = divTab.querySelector('.grid-cartas');
        
        tab.cartas.forEach(c => { 
            const divC = document.createElement('div'); 
            divC.className = 'carta'; 
            
            const numCarta = c.split(' ')[1];
            divC.dataset.numero = numCarta;
            const infoCarta = CARTAS_LOTERIA[numCarta];

            if (infoCarta) {
                divC.innerHTML = `<img src="${infoCarta.img}" alt="${infoCarta.nombre}" style="width:100%; height:100%; object-fit:cover; border-radius:3px;">`;
            } else {
                divC.textContent = numCarta; 
            }
            grid.appendChild(divC); 
        });

        // Usamos pointerdown en lugar de click para la selección táctil y de mouse
        divTab.addEventListener('pointerdown', (e) => { 
            e.preventDefault();
            if (state.miRol === 'jugador' && !tab.bloqueadaPor) {
                socket.emit('ver_tablilla', { nombreSala: state.miSalaActual, idTablilla: tab.id }); 
            }
        });
        cont.appendChild(divTab);
    });
}

function construirPanelEspectadorCb() {
    document.getElementById('panelEspectadorUI').style.display = 'block'; 
    const contChecks = document.getElementById('listaChecksJugadores'); contChecks.innerHTML = '';
    
    for (const id in state.estadoJugadores) {
        if (id !== socket.id) {
            contChecks.innerHTML += `<label class="checkbox-label"><input type="checkbox" class="check-jugador" value="${id}"> ${state.estadoJugadores[id].nombre || 'Anónimo'}</label>`;
        }
    }
    
    const cTodos = document.getElementById('checkTodos'); const cInd = document.querySelectorAll('.check-jugador');
    cTodos.addEventListener('change', (e) => { cInd.forEach(c => c.checked = e.target.checked); renderTabEspectadoresCb(); });
    cInd.forEach(c => c.addEventListener('change', () => { if(!c.checked) cTodos.checked = false; renderTabEspectadoresCb(); }));
}

function renderTabEspectadoresCb() {
    const cont = document.getElementById('contenedorEspectador'); cont.innerHTML = '';
    const checks = document.querySelectorAll('.check-jugador:checked');
    const checkedIds = Array.from(checks).map(c => c.value);
    
    // 1. SISTEMA DE ASIENTOS FIJOS
    // Obtenemos todos los IDs ordenados alfabéticamente (mismo orden para todos)
    const allIds = Object.keys(state.estadoJugadores).sort();
    
    // Buscamos nuestra posición en la mesa
    let myIndex = allIds.indexOf(socket.id);
    if (myIndex === -1) myIndex = 0; // Respaldo si solo somos espectadores
    
    // Generamos el anillo de asientos alrededor nuestro
    const orderedOtherIds = [];
    for (let i = 1; i < allIds.length; i++) {
        const idx = (myIndex + i) % allIds.length;
        orderedOtherIds.push(allIds[idx]);
    }
    const totalAsientos = orderedOtherIds.length;

    // 2. DIBUJAR TABLILLAS
    checkedIds.forEach((id) => {
        const d = state.estadoJugadores[id];
        if(!d) return;

        // Buscamos qué asiento fijo le corresponde a este jugador
        const asientoIndex = orderedOtherIds.indexOf(id);

        const divTab = document.createElement('div'); 
        divTab.className = 'tablilla tablilla-enemiga';
        divTab.id = `tablilla-espectador-${id}`;
        
        let img = d.foto ? `<img src="${d.foto}" class="foto-perfil">` : '';
        divTab.innerHTML = `<h4>Juego de: ${d.nombre} ${img}</h4><div class="grid-cartas"></div>`;
        const grid = divTab.querySelector('.grid-cartas');
        
        d.cartas.forEach(c => {
            const divC = document.createElement('div'); divC.className = 'carta'; 
            const numCarta = c.split(' ')[1]; divC.dataset.numero = numCarta;
            const infoCarta = CARTAS_LOTERIA[numCarta];

            if (infoCarta) divC.innerHTML = `<img src="${infoCarta.img}" style="width:100%; height:100%; object-fit:cover; border-radius:3px;">`;
            else divC.textContent = numCarta;

            if(d.marcas.includes(c)) { divC.classList.add('marcada'); divC.innerHTML += '<div class="palomita">✔</div>'; }
            grid.appendChild(divC);
        });

        // 3. POSICIONAMIENTO Y ROTACIÓN (Extremos más bajos)
        if (state.juegoEnCurso) {
            let angle;
            
            if (totalAsientos === 1) {
                angle = Math.PI * 1.1; 
            } else {
                const mitadIzquierda = Math.ceil(totalAsientos / 2);
                const mitadDerecha = totalAsientos - mitadIzquierda;
                
                if (asientoIndex < mitadIzquierda) {
                    // Flanco Izquierdo: Nace más abajo (0.75 PI) y sube hasta (1.3 PI)
                    const step = mitadIzquierda > 1 ? (Math.PI * 1.3 - Math.PI * 0.75) / (mitadIzquierda - 1) : 0;
                    angle = Math.PI * 0.75 + (step * asientoIndex);
                } else {
                    // Flanco Derecho: Nace arriba (1.7 PI) y baja hasta (2.25 PI)
                    const idxDer = asientoIndex - mitadIzquierda;
                    const step = mitadDerecha > 1 ? (Math.PI * 2.25 - Math.PI * 1.7) / (mitadDerecha - 1) : 0;
                    angle = Math.PI * 1.7 + (step * idxDer);
                }
            }
            
            // Aumentamos los radios ligeramente para aprovechar el espacio extra
            const radiusX = 44; 
            const radiusY = 40; 
            
            divTab.style.left = `${50 + (radiusX * Math.cos(angle))}%`;
            divTab.style.top = `${45 + (radiusY * Math.sin(angle))}%`; 
            
            const gradosRotacion = (angle * 180 / Math.PI) - 90;
            divTab.style.setProperty('--rotacion', `${gradosRotacion}deg`);

        } else {
            divTab.style.position = 'relative'; 
            divTab.style.transform = 'none';
            divTab.style.setProperty('--rotacion', `0deg`);
        }
        
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

socket.on('mensaje_chat', (datos) => {
    ui.pintarMensajeChat(datos); // Mantiene el registro en el historial para cuando acabe el juego
    
    if (state.juegoEnCurso) {
        // Buscamos a quién le pertenece el mensaje por su nombre
        let senderId = null;
        for (let id in state.estadoJugadores) {
            if (state.estadoJugadores[id].nombre === datos.nombre) { 
                senderId = id; 
                break; 
            }
        }

        if (senderId) {
            let targetDiv = null;
            if (senderId === socket.id) {
                targetDiv = document.getElementById('contenedorTablillas'); // Mi propia tablilla central
            } else {
                targetDiv = document.getElementById(`tablilla-espectador-${senderId}`); // Enemigo
            }

            if (targetDiv) {
                const burbuja = document.createElement('div');
                burbuja.className = 'burbuja-chat';
                
                // Extraer la foto del usuario que envió el mensaje
                const fotoUsuario = state.estadoJugadores[senderId]?.foto;
                const imgHTML = fotoUsuario ? `<img src="${fotoUsuario}" class="burbuja-foto">` : '';
                
                // Inyectar el diseño con foto y texto
                burbuja.innerHTML = `
                    <div class="burbuja-chat-contenido">
                        ${imgHTML}
                        <span>${datos.mensaje}</span>
                    </div>
                `;
                
                targetDiv.appendChild(burbuja);

                setTimeout(() => { if (burbuja.parentNode) burbuja.remove(); }, 5500);
            }
        }
    }
});

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
    document.getElementById('cartaActual').innerHTML = TEXTO_LOBBY; 
    document.getElementById('cartaActual').style.color = "";
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
    document.getElementById('botonesTablilla').style.display = 'none'; // Ocultar botones
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
    
    if (state.miRol === 'jugador' && !state.juegoEnCurso) {
        let viendo = false; let bloqueada = false; let idActiva = null;
        t.forEach(tb => { 
            if (tb.viendoPor.includes(socket.id)) { viendo = true; idActiva = tb.id; }
            if (tb.bloqueadaPor === socket.id) { bloqueada = true; idActiva = tb.id; }
        });
        
        const btnBloquear = document.getElementById('btnBloquear');
        const btnDesbloquear = document.getElementById('btnDesbloquear');
        const contBotones = document.getElementById('botonesTablilla');

        // Mover los botones al interior de la tablilla seleccionada
        if (idActiva) {
            const tabNode = document.getElementById('tablilla-dom-' + idActiva);
            if (tabNode) tabNode.appendChild(contBotones);
            contBotones.style.display = 'flex';
            btnBloquear.style.display = (viendo && !bloqueada) ? 'inline-block' : 'none';
            btnDesbloquear.style.display = bloqueada ? 'inline-block' : 'none';
        } else {
            contBotones.style.display = 'none';
        }
    }

    if (state.juegoEnCurso) {
        document.querySelectorAll('.tablilla').forEach(el => {
            if(!el.classList.contains('bloqueada-mia') && state.miRol === 'jugador') el.style.display = 'none';
            else if (state.miRol === 'espectador') el.style.display = 'none'; else el.classList.remove('bloqueada-mia'); 
        });
        document.getElementById('botonesTablilla').style.display = 'none';
    }
});

socket.on('juego_iniciado', (info) => { state.estadoJugadores = info; ui.prepararInterfazJuego(state, construirPanelEspectadorCb); });
socket.on('actualizar_texto_carta', (texto) => { document.getElementById('cartaActual').textContent = texto; });

// LA LÓGICA DE ILUMINACIÓN Y CLICK DE CARTAS 
socket.on('nueva_carta', (carta) => {
    const numCarta = carta.split(' ')[1];
    const infoCarta = CARTAS_LOTERIA[numCarta];
    
    const cartaContenedor = document.getElementById('cartaActual');
    let pila = document.getElementById('pilaCartasGriton');
    let texto = document.getElementById('textoCartaGriton');

    // Si es la primera carta del juego, construimos la "Mesa" del Gritón
    if (!pila) {
        cartaContenedor.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <span id="textoCartaGriton" style="font-size: 1.4em; font-weight: 900; z-index: 310; text-shadow: 0 4px 15px rgba(0,0,0,0.8); background: rgba(15,23,42,0.85); padding: 8px 25px; border-radius: 12px; color: #38bdf8; border: 1px solid rgba(255,255,255,0.1);"></span>
                <div id="pilaCartasGriton" style="position: relative; width: 220px; height: 310px;"></div>
            </div>
        `;
        pila = document.getElementById('pilaCartasGriton');
        texto = document.getElementById('textoCartaGriton');
    }

    if (infoCarta) {
        texto.textContent = `¡${infoCarta.nombre}!`;

        const nuevaImg = document.createElement('img');
        nuevaImg.src = infoCarta.img;
        nuevaImg.className = 'imagen-griton carta-lanzada';

        // Matemáticas de desorden: Rotación (-15 a +15 grados) y Desplazamiento (-12 a +12 px)
        const rot = (Math.random() * 30 - 15).toFixed(1);
        const offsetX = (Math.random() * 24 - 12).toFixed(1);
        const offsetY = (Math.random() * 24 - 12).toFixed(1);

        nuevaImg.style.setProperty('--rot-final', `${rot}deg`);
        nuevaImg.style.setProperty('--x-final', `${offsetX}px`);
        nuevaImg.style.setProperty('--y-final', `${offsetY}px`);

        pila.appendChild(nuevaImg);

        // Rendimiento: Mantener solo las últimas 6 cartas en pantalla
        if (pila.children.length > 6) {
            pila.removeChild(pila.firstChild);
        }
    } else {
        if(texto) texto.textContent = carta;
    }
    
    // Lógica para registrar el tiempo de llegada e iluminar
    state.ultimaCartaRecibida = numCarta;
    const tsLlegada = Date.now();
    state.tsLlegadaCarta = tsLlegada;
    
    // Iluminación para espectadores
    if (state.miRol === 'espectador') {
        document.querySelectorAll('#contenedorEspectador .carta').forEach(div => {
            if (div.dataset.numero === numCarta && !div.classList.contains('marcada')) {
                div.classList.add('marcable-visual'); 
                setTimeout(() => div.classList.remove('marcable-visual'), state.configSala.tiempoMarcar);
            }
        });
    }

    // LÓGICA DE MARCADO RECUPERADA PARA JUGADORES
    if (state.miRol === 'jugador') {
        document.querySelectorAll('#contenedorTablillas .carta').forEach(div => {
            if (div.dataset.numero === numCarta && !div.classList.contains('marcada')) {
                div.dataset.activa = "true"; 
                div.style.cursor = "pointer";
                if (state.configSala.ayudaNinos) div.classList.add('marcable-visual');

                const t = setTimeout(() => { 
                    div.dataset.activa = "false"; 
                    div.style.cursor = "default"; 
                    div.classList.remove('marcable-visual'); 
                }, state.configSala.tiempoMarcar);
                
                // Asignamos onpointerdown para registrar toques instantáneos en celular y clics en PC
                div.onpointerdown = function(e) {
                    e.preventDefault(); // Evita scroll o zoom accidental al tocar
                    if (div.dataset.activa === "true" && !div.classList.contains('marcada')) {
                        const msReaccion = Date.now() - tsLlegada;
                        clearTimeout(t); 
                        div.dataset.activa = "false"; 
                        div.classList.remove('marcable-visual'); 
                        div.style.cursor = "default"; 
                        
                        // Añade la palomita sin borrar tu imagen
                        div.classList.add('marcada'); 
                        div.innerHTML += '<div class="palomita">✔</div>';
                        
                        state.misCartasMarcadas++;
                        if(state.misCartasMarcadas === 16) document.getElementById('btnLoteria').disabled = false;
                        
                        // Emite el evento al servidor
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
            if (divC.dataset.numero === d.carta.split(' ')[1] && !divC.classList.contains('marcada')) { 
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
    state.juegoEnCurso = false; state.misCartasMarcadas = 0; 
    
    document.getElementById('cartaActual').innerHTML = TEXTO_LOBBY; 
    document.getElementById('cartaActual').style.color = "";
    document.getElementById('pantallaResultados').classList.remove('activa'); 
    document.getElementById('pantallaLobby').classList.add('activa');
    
    // Desactivar la mesa circular
    document.getElementById('pantallaLobby').classList.remove('mesa-activa');
    
    // Devolver el botón de Lotería a su lugar original oculto
    const btnLoteria = document.getElementById('btnLoteria');
    btnLoteria.disabled = true; 
    btnLoteria.style.display = 'none';
    document.querySelector('.zona-griton').insertBefore(btnLoteria, document.getElementById('cartaActual'));
    
    // Restaurar Paneles y Chat
    const header = document.querySelector('.header-sala');
    const cajasListas = document.getElementById('cajasListas');
    const panelConfig = document.getElementById('panelConfiguracion');
    const columnaHerramientas = document.getElementById('herramientasSala');
    const chat = document.getElementById('cajaChat');

    if(header) header.classList.remove('oculto-juego');
    if(cajasListas) cajasListas.classList.remove('oculto-juego');
    if(panelConfig) panelConfig.classList.remove('oculto-juego');
    
    if(columnaHerramientas) columnaHerramientas.style.display = 'flex';
    if(chat) chat.style.display = 'flex';
    if(chat && columnaHerramientas) {
        chat.classList.remove('chat-juego');
        columnaHerramientas.appendChild(chat); // Devuelve el chat a su columna
    }

    if(!state.configSala.sinEspectadores) document.getElementById('btnCambiarRol').style.display = 'inline-block'; 
    document.getElementById('nombreTiempoReal').disabled = false;
    document.getElementById('panelEspectadorUI').style.display = 'none'; 
    
    const tituloEsp = document.getElementById('tituloEspectando');
    if(tituloEsp) tituloEsp.style.display = 'none';
    
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