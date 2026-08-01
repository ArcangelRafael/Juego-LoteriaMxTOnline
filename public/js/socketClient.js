// public/js/socketClient.js
import state from './state.js';
import { CARTAS_LOTERIA } from './cartas.js';
import * as ui from './ui.js';
import { reproducirAnimacionMezcla } from './mezcla.js';

const TEXTO_LOBBY = `
    <div style="display:flex; flex-direction:column; align-items:center; gap: 10px;">
        <span>Selección y bloqueo de tablillas</span>
        <span style="font-size: 16px; font-weight: normal; color: var(--text-muted);">Selecciona la tablilla de tu agrado y bloquéala antes que alguien más te la gane.</span>
    </div>
`;

export function setupSocketClient(socket, callbacks) {
    const { renderizarTablillasCallback, construirPanelEspectadorCb } = callbacks;

    window.addEventListener('offline', () => {
        if (state.miSalaActual) document.getElementById('modalReconexion').style.display = 'flex';
    });

    window.addEventListener('online', () => {
        if (state.miSalaActual && socket.connected) socket.emit('intento_reconexion', { nombreSala: state.miSalaActual, sessionId: state.sessionId });
    });

    socket.on('disconnect', () => {
        if (state.miSalaActual) document.getElementById('modalReconexion').style.display = 'flex';
    });

    socket.on('connect', () => {
        if (state.miSalaActual) {
            document.getElementById('modalReconexion').style.display = 'flex';
            socket.emit('intento_reconexion', { nombreSala: state.miSalaActual, sessionId: state.sessionId });
        }
    });

    socket.on('reconexion_exitosa', (datos) => {
        state.socketId = socket.id;
        state.tablillasActuales = datos.tablillas;
        
        document.getElementById('modalReconexion').style.display = 'none';

        const panelEsp = document.getElementById('panelEspectadorUI'); if(panelEsp) document.body.appendChild(panelEsp);
        const btnChat = document.getElementById('btnAbrirChatMovil'); if(btnChat) document.body.appendChild(btnChat);
        const btnLoteria = document.getElementById('btnLoteria'); if(btnLoteria) document.body.appendChild(btnLoteria);

        state.miSalaActual = datos.nombreSala;
        state.miRol = datos.rol;
        state.soyAnfitrion = datos.esAnfitrion;
        state.configSala = datos.config;
        state.estadoJugadores = datos.infoJugadores;
        
        ui.actualizarUIConfig(datos.config, state);
        
        document.getElementById('modalAFK').style.display = 'none';
        document.getElementById('modalVotacion').style.display = 'none';
        document.getElementById('modalSinCartas').style.display = 'none';
        
        const modalTorneo = document.getElementById('modalEliminadoTorneo');
        if (modalTorneo) modalTorneo.style.display = 'none';

        document.getElementById('pantallaMenu').classList.remove('activa');
        document.getElementById('pantallaResultados').classList.remove('activa');
        document.getElementById('pantallaLobby').classList.add('activa');
        
        document.getElementById('pantallaLobby').classList.remove('mesa-activa');
        document.querySelector('.header-sala').classList.remove('oculto-juego');
        document.getElementById('cajasListas').classList.remove('oculto-juego');
        document.getElementById('panelConfiguracion').classList.remove('oculto-juego');
        document.getElementById('cajaChat').style.display = 'flex';
        document.getElementById('herramientasSala').style.display = 'flex';

        ui.initLobby(datos.nombreSala, datos.esAnfitrion ? datos.codigoSala : "Oculto", datos.tablillas, renderizarTablillasCallback);
        
        document.getElementById('btnCambiarRol').textContent = state.miRol === 'jugador' ? 'Cambiar a Espectador' : 'Cambiar a Jugador';
        const cont = document.getElementById('contenedorTablillas');
        if (state.miRol === 'espectador') { cont.style.opacity = '0.5'; cont.style.pointerEvents = 'none'; } 
        else { cont.style.opacity = '1'; cont.style.pointerEvents = 'auto'; }

        if (datos.esAnfitrion) {
            document.getElementById('etiquetaHost').style.display = 'inline';
            document.getElementById('btnIniciar').style.display = 'inline-block';
            document.getElementById('panelConfiguracion').classList.add('es-host');
            document.getElementById('controlesBot').style.display = 'block';
            const btnCreador = document.getElementById('contenedorBtnCreador');
            if (btnCreador) btnCreador.style.display = 'block';
            
            document.getElementById('btnDestruirLobby').style.display = 'inline-block';
            document.getElementById('btnAbandonarLobby').style.display = 'none';
        } else {
            document.getElementById('btnDestruirLobby').style.display = 'none';
            document.getElementById('btnAbandonarLobby').style.display = 'inline-block';
        }

        if (['jugando', 'gracia', 'votando', 'votando_revolver'].includes(datos.estadoSala)) {
            
            const footer = document.querySelector('.app-footer');
            if (footer) {
                footer.classList.remove('footer-delay');
                footer.classList.add('footer-oculto');
            }

            state.juegoEnCurso = true;
            ui.prepararInterfazJuego(state, construirPanelEspectadorCb);
            
            state.misCartasMarcadas = datos.misMarcas ? datos.misMarcas.length : 0;
            if(state.misCartasMarcadas === 16) document.getElementById('btnLoteria').disabled = false;
            
            if (state.miRol === 'jugador' && datos.misMarcas && datos.misMarcas.length > 0) {
                setTimeout(() => {
                    document.querySelectorAll('#contenedorTablillas .carta').forEach(div => {
                        const numCartaStr = 'Carta ' + div.dataset.numero;
                        if (datos.misMarcas.includes(numCartaStr) && !div.querySelector('.palomita')) {
                            div.classList.add('marcada');
                            let marcador = '<div class="palomita">✔</div>';
                            if (state.miFicha === 'peso') marcador = '<div class="palomita"><img src="/assets/img/unpeso.webp" class="ficha-img"></div>';
                            else if (state.miFicha === 'frijol') marcador = '<div class="palomita"><img src="/assets/img/gfrijol.webp" class="ficha-img"></div>';
                            else if (state.miFicha === 'arroz') marcador = '<div class="palomita"><img src="/assets/img/garroz.webp" class="ficha-img"></div>';
                            div.innerHTML += marcador;
                        }
                    });
                }, 200);
            }

            if (datos.cartasJugadas && datos.cartasJugadas.length > 0) {
                const ultimaCarta = datos.cartasJugadas[datos.cartasJugadas.length - 1];
                const numCarta = ultimaCarta.split(' ')[1];
                const infoCarta = CARTAS_LOTERIA[numCarta];
                const cartaContenedor = document.getElementById('cartaActual');
                
                if (infoCarta) {
                    cartaContenedor.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                            <span id="textoCartaGriton" style="font-size: 1.4em; font-weight: 900; z-index: 310; text-shadow: 0 4px 15px rgba(0,0,0,0.8); background: rgba(15,23,42,0.85); padding: 8px 25px; border-radius: 12px; color: #38bdf8; border: 1px solid rgba(255,255,255,0.1);">¡${infoCarta.nombre}!</span>
                            <div class="griton-mesa-container">
                                <div id="pilaCartasGriton" style="position: relative; width: 220px; height: 310px; z-index: 2;">
                                    <div class="carta-3d-container" style="--rot-final:0deg; --x-final:0px; --y-final:0px; animation: none; transform: scale(1);">
                                        <img src="${infoCarta.img}" class="carta-cara carta-frente">
                                    </div>
                                </div>
                                <div id="mazoCartasGriton" style="position: relative; width: 220px; height: 310px; z-index: 1;">
                                    <img src="/assets/img/backards.webp" class="mazo-estatico" style="transform: rotate(-2deg) translate(2px, 2px);">
                                    <img src="/assets/img/backards.webp" class="mazo-estatico" style="transform: rotate(1deg) translate(-2px, -2px);">
                                    <img src="/assets/img/backards.webp" class="mazo-estatico">
                                </div>
                            </div>
                        </div>`;
                }
            }

            const savedLayout = sessionStorage.getItem('loteria_layout');
            if (savedLayout) {
                try {
                    const l = JSON.parse(savedLayout);
                    const contenedorTabs = document.getElementById('contenedorTablillas');
                    const zonaGriton = document.querySelector('.zona-griton');

                    if (l.tabScaleX) contenedorTabs?.style.setProperty('--escala-x', l.tabScaleX);
                    if (l.tabScaleY) contenedorTabs?.style.setProperty('--escala-y', l.tabScaleY);
                    if (l.tabOffsetX) contenedorTabs?.style.setProperty('--offset-x', l.tabOffsetX);
                    if (l.tabOffsetY) contenedorTabs?.style.setProperty('--offset-y', l.tabOffsetY);
                    
                    if (zonaGriton) {
                        if (l.gritonX) zonaGriton.style.setProperty('--griton-x', l.gritonX);
                        if (l.gritonY) zonaGriton.style.setProperty('--griton-y', l.gritonY);
                    }
                } catch (e) { console.error('Error restaurando layout:', e); }
            }
        } 
        else {
            const nombreTiempoReal = document.getElementById('nombreTiempoReal');
            if (nombreTiempoReal) nombreTiempoReal.disabled = false;
            
            const btnLoteriaRef = document.getElementById('btnLoteria');
            const zg = document.querySelector('.zona-griton');
            const cartaActual = document.getElementById('cartaActual');

            if (btnLoteriaRef) {
                btnLoteriaRef.disabled = true;
                btnLoteriaRef.style.display = 'none';
                if (zg && cartaActual) {
                    zg.insertBefore(btnLoteriaRef, cartaActual);
                }
            }

            if(zg) { 
                zg.style.setProperty('--griton-x', '0px'); 
                zg.style.setProperty('--griton-y', '0px'); 
            }
            
            const contenedorTabs = document.getElementById('contenedorTablillas');
            if(contenedorTabs) { 
                contenedorTabs.style.setProperty('--offset-x', '0px'); 
                contenedorTabs.style.setProperty('--offset-y', '0px'); 
            }
            
            const contEsp = document.getElementById('contenedorEspectador');
            if(contEsp) contEsp.innerHTML = '';
            
            if(cartaActual) {
                cartaActual.innerHTML = TEXTO_LOBBY;
                cartaActual.style.color = "";
            }

            if (datos.estadoSala === 'finalizado') {
                socket.emit('volver_lobby', datos.nombreSala);
            }
        }
    });

    socket.on('reconexion_fallida', () => {
        sessionStorage.removeItem('loteria_sala_actual');
        sessionStorage.removeItem('loteria_layout');
        state.miSalaActual = '';
        window.location.reload(); 
    });

    socket.on('salas_publicas_actualizadas', (salas) => ui.pintarSalasPublicas(salas));
    
    socket.on('sala_destruida_por_anfitrion', () => {
        sessionStorage.removeItem('loteria_sala_actual');
        sessionStorage.removeItem('loteria_layout');
        ui.mostrarModalError("El anfitrión ha destruido la sala.", () => window.location.reload());
    });

    socket.on('partida_rapida_encontrada', (d) => { 
        state.miSalaActual = d.nombreSala; 
        sessionStorage.setItem('loteria_sala_actual', d.nombreSala);
        socket.emit('unirse_sala', { nombreSala: d.nombreSala, codigoSala: d.codigoSala, rolElegido: 'jugador', sessionId: state.sessionId }); 
    });
    
    socket.on('partida_rapida_crear', (n) => { 
        state.miSalaActual = n; 
        sessionStorage.setItem('loteria_sala_actual', n);
        socket.emit('crear_sala', { nombreSala: n, esPublica: true, sessionId: state.sessionId }); 
    });

    socket.on('sala_destruida_inactividad', (minutos) => { 
        sessionStorage.removeItem('loteria_sala_actual');
        sessionStorage.removeItem('loteria_layout');
        ui.mostrarModalError(`La sala fue cerrada por inactividad (${minutos} Minutos).`, () => window.location.reload()); 
    });
    
    socket.on('mensaje_chat', (datos) => {
        ui.pintarMensajeChat(datos); 
        
        if (state.juegoEnCurso || state.enPrevisualizacion) {
            let senderId = datos.idJugador;
            let targetDiv = null;
            
            if (senderId === socket.id) {
                targetDiv = document.querySelector('.bloqueada-mia'); 
                if(!targetDiv) targetDiv = document.getElementById('contenedorTablillas');
            } 
            else {
                targetDiv = document.getElementById(`tablilla-espectador-${senderId}`); 
            }
            
            if (targetDiv) {
                const burbuja = document.createElement('div'); burbuja.className = 'burbuja-chat';
                const fotoUsuario = datos.foto;
                const imgHTML = fotoUsuario ? `<img src="${fotoUsuario}" class="burbuja-foto">` : '';
                burbuja.innerHTML = `<div class="burbuja-chat-contenido">${imgHTML}<span>${datos.mensaje}</span></div>`;
                targetDiv.appendChild(burbuja);
                
                setTimeout(() => { if (burbuja.parentNode) burbuja.remove(); }, 5500);
            }
        }
    });

    socket.on('config_actualizada', (cfg) => { if(!state.soyAnfitrion) ui.actualizarUIConfig(cfg, state); });
    socket.on('confirmar_afk', (nombres) => { document.getElementById('listaNombresAFK').textContent = nombres.join(', '); document.getElementById('modalAFK').style.display = 'flex'; });
    
    socket.on('salida_exitosa', () => { 
        sessionStorage.removeItem('loteria_sala_actual');
        sessionStorage.removeItem('loteria_layout');
        window.location.reload(); 
    });
    
    socket.on('expulsado_de_sala', (msjEspecial) => {
        sessionStorage.removeItem('loteria_sala_actual');
        sessionStorage.removeItem('loteria_layout');
        let textoFinal = typeof msjEspecial === 'string' ? msjEspecial : "Has sido expulsado de la sala.";
        ui.mostrarModalError(textoFinal, () => window.location.reload());
    });
    
    socket.on('error_sala', (msg) => { ui.mostrarModalError(msg); document.getElementById('btnBloquear').style.display = 'none'; document.getElementById('btnDesbloquear').style.display = 'none'; });

    socket.on('confirmar_espectador', (datos) => {
        document.getElementById('textoConfirmarEspectador').textContent = datos.mensaje;
        const modal = document.getElementById('modalConfirmarEspectador');
        modal.style.display = 'flex';
        
        document.getElementById('btnAceptarEspectador').onclick = () => {
            modal.style.display = 'none';
            state.miSalaActual = datos.nombreSala;
            sessionStorage.setItem('loteria_sala_actual', datos.nombreSala);
            socket.emit('unirse_sala', { nombreSala: datos.nombreSala, codigoSala: datos.codigoSala, rolElegido: 'espectador', sessionId: state.sessionId });
        };
        document.getElementById('btnRechazarEspectador').onclick = () => { modal.style.display = 'none'; };
    });

    socket.on('sala_creada', (d) => { 
        state.soyAnfitrion = true; state.miRol = 'jugador'; state.tablillasActuales = d.tablillas;
        ui.actualizarUIConfig(d.config, state); ui.initLobby(d.nombreSala, d.codigoSala, d.tablillas, renderizarTablillasCallback); 
        document.getElementById('etiquetaHost').style.display='inline'; document.getElementById('btnIniciar').style.display = 'inline-block'; 
        document.getElementById('panelConfiguracion').classList.add('es-host'); document.getElementById('controlesBot').style.display = 'block';
        const btnCreador = document.getElementById('contenedorBtnCreador'); if (btnCreador) btnCreador.style.display = 'block';
        
        document.getElementById('btnDestruirLobby').style.display = 'inline-block';
        document.getElementById('btnAbandonarLobby').style.display = 'none';
    });

    socket.on('sala_unida', (d) => { 
        state.soyAnfitrion = false; state.miRol = d.rol; state.tablillasActuales = d.tablillas;
        ui.actualizarUIConfig(d.config, state); ui.initLobby(d.nombreSala, "Oculto", d.tablillas, renderizarTablillasCallback); 
        document.getElementById('btnCambiarRol').textContent = state.miRol === 'jugador' ? 'Cambiar a Espectador' : 'Cambiar a Jugador';
        const cont = document.getElementById('contenedorTablillas');
        if (state.miRol === 'espectador') { cont.style.opacity = '0.5'; cont.style.pointerEvents = 'none'; } else { cont.style.opacity = '1'; cont.style.pointerEvents = 'auto'; }
        const btnCreador = document.getElementById('contenedorBtnCreador'); if (btnCreador) btnCreador.style.display = (d.rol === 'jugador') ? 'block' : 'none';
        
        document.getElementById('btnDestruirLobby').style.display = 'none';
        document.getElementById('btnAbandonarLobby').style.display = 'inline-block';
    });

    socket.on('unido_como_espectador', (d) => { 
        state.juegoEnCurso = false; state.misCartasMarcadas = 0; document.getElementById('btnLoteria').disabled = true; document.getElementById('btnLoteria').style.display = 'none';
        document.getElementById('cartaActual').innerHTML = TEXTO_LOBBY; document.getElementById('cartaActual').style.color = "";
        state.miRol = 'espectador'; state.soyAnfitrion = false; ui.actualizarUIConfig(d.config, state); state.estadoJugadores = d.infoJugadores; 
        ui.initLobby(state.miSalaActual, "Espectador", [], renderizarTablillasCallback); 
        ui.prepararInterfazJuego(state, construirPanelEspectadorCb); 
        
        document.getElementById('btnDestruirLobby').style.display = 'none';
        document.getElementById('btnAbandonarLobby').style.display = 'inline-block';
    });

    socket.on('rol_cambiado', (r) => { 
        state.miRol = r; 
        document.getElementById('btnCambiarRol').textContent = state.miRol === 'jugador' ? 'Cambiar a Espectador' : 'Cambiar a Jugador';
        const cont = document.getElementById('contenedorTablillas');
        if (state.miRol === 'espectador') { cont.style.opacity = '0.5'; cont.style.pointerEvents = 'none'; } else { cont.style.opacity = '1'; cont.style.pointerEvents = 'auto'; }
        if (state.configSala.sinEspectadores) document.getElementById('btnCambiarRol').style.display = 'none';
        document.getElementById('botonesTablilla').style.display = 'none'; 
        const btnCreador = document.getElementById('contenedorBtnCreador'); if (btnCreador) btnCreador.style.display = (state.miRol === 'jugador') ? 'block' : 'none';
        
        const btnSalirEsp = document.getElementById('btnSalirEspectador');
        if (btnSalirEsp && state.juegoEnCurso) {
            btnSalirEsp.style.display = (state.miRol === 'espectador') ? 'inline-block' : 'none';
        }
    });

    socket.on('actualizar_listas', (listas) => {
        if (!state.juegoEnCurso) {
            const syncJugadores = {};
            listas.jugadores.forEach(j => {
                const existing = state.estadoJugadores[j.id] || { cartas: [], marcas: [] };
                const cleanName = j.nombre.split('<')[0].trim() || 'Anónimo';
                syncJugadores[j.id] = {
                    nombre: cleanName,
                    foto: j.foto,
                    rol: 'jugador',
                    cartas: existing.cartas,
                    marcas: existing.marcas
                };
            });
            state.estadoJugadores = syncJugadores;
        }

        ui.actualizarListas(listas, state);
        if (state.enPrevisualizacion || state.juegoEnCurso) {
            callbacks.construirPanelEspectadorCb();
        }
    });
    
    socket.on('estado_boton_iniciar', (data) => { 
        if (state.soyAnfitrion && !state.juegoEnCurso) { 
            const b = document.getElementById('btnIniciar'); 
            const wrapper = document.getElementById('wrapperBtnIniciar');
            b.style.display = 'inline-block'; 
            
            const listos = typeof data === 'object' ? data.listos : data;
            const faltantes = typeof data === 'object' ? data.faltantes : [];
            
            b.disabled = !listos; 
            b.style.backgroundColor = listos ? 'lightgreen' : 'lightgray'; 
            
            if (!listos && faltantes.length > 0) {
                const msj = 'Faltan de elegir tablilla:\n' + faltantes.join(', ');
                wrapper.setAttribute('data-tooltip', msj);
            } else {
                wrapper.removeAttribute('data-tooltip'); 
            }
        } 
    });
    
    socket.on('nuevo_anfitrion', () => {
        state.soyAnfitrion = true; document.getElementById('etiquetaHost').style.display = 'inline'; 
        if(!state.juegoEnCurso) { document.getElementById('btnIniciar').style.display = 'inline-block'; document.getElementById('panelConfiguracion').classList.add('es-host'); document.getElementById('controlesBot').style.display = 'block'; }
        
        document.getElementById('btnDestruirLobby').style.display = 'inline-block';
        document.getElementById('btnAbandonarLobby').style.display = 'none';
    });

    socket.on('actualizar_tablillas', (t) => { 
        state.tablillasActuales = t; 

        const panelEsp = document.getElementById('panelEspectadorUI'); 
        if(panelEsp) document.body.appendChild(panelEsp);
        
        const btnChat = document.getElementById('btnAbrirChatMovil'); 
        if(btnChat) document.body.appendChild(btnChat);
        
        const btnLoteria = document.getElementById('btnLoteria'); 
        if(btnLoteria) document.body.appendChild(btnLoteria);

        renderizarTablillasCallback(t); 
        
        if (state.miRol === 'jugador' && !state.juegoEnCurso && !state.enPrevisualizacion) {
            let viendo = false; let bloqueada = false; let idActiva = null;
            t.forEach(tb => { 
                if (tb.viendoPor.includes(socket.id)) { viendo = true; idActiva = tb.id; }
                if (tb.bloqueadaPor === socket.id) { bloqueada = true; idActiva = tb.id; }
            });
            const btnBloquear = document.getElementById('btnBloquear'); const btnDesbloquear = document.getElementById('btnDesbloquear'); const contBotones = document.getElementById('botonesTablilla');
            if (idActiva) {
                const tabNode = document.getElementById('tablilla-dom-' + idActiva);
                if (tabNode) tabNode.appendChild(contBotones);
                contBotones.style.display = 'flex';
                btnBloquear.style.display = (viendo && !bloqueada) ? 'inline-block' : 'none';
                btnDesbloquear.style.display = bloqueada ? 'inline-block' : 'none';
            } else { contBotones.style.display = 'none'; }
        }
        
        if (state.juegoEnCurso || state.enPrevisualizacion) {
            document.querySelectorAll('.tablilla').forEach(el => {
                if(!el.classList.contains('bloqueada-mia') && state.miRol === 'jugador') el.style.display = 'none';
                else if (state.miRol === 'espectador') el.style.display = 'none'; 
            });
            document.getElementById('botonesTablilla').style.display = 'none';
            
            if (state.enPrevisualizacion) {
                ui.iniciarPrevisualizacion(state, callbacks.construirPanelEspectadorCb);
            } else {
                ui.prepararInterfazJuego(state, callbacks.construirPanelEspectadorCb);
            }
        }
    });

    socket.on('juego_iniciado', (info) => { 
        document.getElementById('pantallaResultados').classList.remove('activa');
        document.getElementById('pantallaLobby').classList.add('activa');
        
        document.querySelectorAll('.carta').forEach(c => {
            c.classList.remove('marcada', 'marcable-visual');
            c.dataset.activa = "false";
            c.style.cursor = "default";
            const palomita = c.querySelector('.palomita');
            if (palomita) palomita.remove();
        });
        
        const pilaGriton = document.getElementById('pilaCartasGriton');
        if (pilaGriton) pilaGriton.innerHTML = '';
        const textoGriton = document.getElementById('textoCartaGriton');
        if (textoGriton) textoGriton.textContent = '¡PREPARANDO...!';

        state.misCartasMarcadas = 0;
        const btnLoteriaRef = document.getElementById('btnLoteria');
        if (btnLoteriaRef) btnLoteriaRef.disabled = true;

        const modalTorneo = document.getElementById('modalEliminadoTorneo');
        if (modalTorneo) modalTorneo.style.display = 'none';
        
        if (state.enPrevisualizacion) {
            state.enPrevisualizacion = false;
            document.getElementById('controlesPrevisualizacion').style.display = 'none';
        }

        // FIX MAESTRO: Retrasamos el ocultado del footer a 18 segundos (15s de prep + 3 de cortesía)
        setTimeout(() => {
            const footer = document.querySelector('.app-footer');
            if (footer && state.juegoEnCurso) {
                footer.classList.add('footer-oculto');
            }
        }, 15000);

        state.estadoJugadores = info; 
        ui.prepararInterfazJuego(state, construirPanelEspectadorCb); 
    });
    
    socket.on('actualizar_texto_carta', (texto) => { 
        const cartaContenedor = document.getElementById('cartaActual'); 
        let pila = document.getElementById('pilaCartasGriton'); 
        let textoSpan = document.getElementById('textoCartaGriton');

        if (!pila) {
            cartaContenedor.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <span id="textoCartaGriton" style="font-size: 1.4em; font-weight: 900; z-index: 310; text-shadow: 0 4px 15px rgba(0,0,0,0.8); background: rgba(15,23,42,0.85); padding: 8px 25px; border-radius: 12px; color: #38bdf8; border: 1px solid rgba(255,255,255,0.1);"></span>
                    <div class="griton-mesa-container">
                        <div id="pilaCartasGriton" style="position: relative; width: 220px; height: 310px; z-index: 2;"></div>
                        <div id="mazoCartasGriton" style="position: relative; width: 220px; height: 310px; z-index: 1;">
                            <img src="/assets/img/backards.webp" class="mazo-estatico" style="transform: rotate(-2deg) translate(2px, 2px);">
                            <img src="/assets/img/backards.webp" class="mazo-estatico" style="transform: rotate(1deg) translate(-2px, -2px);">
                            <img src="/assets/img/backards.webp" class="mazo-estatico">
                        </div>
                    </div>
                </div>`;
            textoSpan = document.getElementById('textoCartaGriton');
        }
        
        // FIX MAESTRO: Activamos la animación de la Obertura en el segundo 15
        if (texto === "¡CORRE Y SE VA CON... 15") {
            reproducirAnimacionMezcla();
        }

        textoSpan.textContent = texto; 
    });

    socket.on('reactivar_ultima_carta', (datos) => {
        const numCarta = datos.carta.split(' ')[1]; 
        const tiempoMarcar = datos.tiempo;
        const tsLlegada = Date.now(); 
        
        if (state.miRol === 'espectador') {
            document.querySelectorAll('#contenedorEspectador .carta').forEach(div => {
                if (div.dataset.numero === numCarta && !div.classList.contains('marcada')) {
                    div.classList.add('marcable-visual'); 
                    setTimeout(() => div.classList.remove('marcable-visual'), tiempoMarcar);
                }
            });
        }

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
                    }, tiempoMarcar);
                    
                    div.onpointerdown = function(e) {
                        e.preventDefault(); 
                        if (div.dataset.activa === "true" && !div.classList.contains('marcada')) {
                            const msReaccion = Date.now() - tsLlegada; 
                            clearTimeout(t); 
                            div.dataset.activa = "false"; 
                            div.classList.remove('marcable-visual'); 
                            div.style.cursor = "default"; 
                            div.classList.add('marcada'); 
                            
                            let marcador = '<div class="palomita">✔</div>';
                            if (state.miFicha === 'peso') marcador = '<div class="palomita"><img src="/assets/img/unpeso.webp" class="ficha-img"></div>';
                            else if (state.miFicha === 'frijol') marcador = '<div class="palomita"><img src="/assets/img/gfrijol.webp" class="ficha-img"></div>';
                            else if (state.miFicha === 'arroz') marcador = '<div class="palomita"><img src="/assets/img/garroz.webp" class="ficha-img"></div>';
                            
                            div.innerHTML += marcador; 
                            state.misCartasMarcadas++;
                            if(state.misCartasMarcadas === 16) document.getElementById('btnLoteria').disabled = false;
                            socket.emit('marcar_casilla', { nombreSala: state.miSalaActual, carta: datos.carta, ms: msReaccion });
                        }
                    };
                }
            });
        }
    });

    socket.on('nueva_carta', (carta) => {
        const numCarta = carta.split(' ')[1]; 
        const infoCarta = CARTAS_LOTERIA[numCarta];
        
        const cartaContenedor = document.getElementById('cartaActual'); 
        let pila = document.getElementById('pilaCartasGriton'); 
        let texto = document.getElementById('textoCartaGriton');

        if (!pila) {
            cartaContenedor.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <span id="textoCartaGriton" style="font-size: 1.4em; font-weight: 900; z-index: 310; text-shadow: 0 4px 15px rgba(0,0,0,0.8); background: rgba(15,23,42,0.85); padding: 8px 25px; border-radius: 12px; color: #38bdf8; border: 1px solid rgba(255,255,255,0.1);"></span>
                    <div class="griton-mesa-container">
                        <div id="pilaCartasGriton" style="position: relative; width: 220px; height: 310px; z-index: 2;"></div>
                        <div id="mazoCartasGriton" style="position: relative; width: 220px; height: 310px; z-index: 1;">
                            <img src="/assets/img/backards.webp" class="mazo-estatico" style="transform: rotate(-2deg) translate(2px, 2px);">
                            <img src="/assets/img/backards.webp" class="mazo-estatico" style="transform: rotate(1deg) translate(-2px, -2px);">
                            <img src="/assets/img/backards.webp" class="mazo-estatico">
                        </div>
                    </div>
                </div>`;
            pila = document.getElementById('pilaCartasGriton'); 
            texto = document.getElementById('textoCartaGriton');
        }

        if (infoCarta) {
            texto.textContent = `¡${infoCarta.nombre}!`;

            const carta3D = document.createElement('div'); 
            carta3D.className = 'carta-3d-container';
            
            const rot = (Math.random() * 30 - 15).toFixed(1); 
            const offsetX = (Math.random() * 24 - 12).toFixed(1); 
            const offsetY = (Math.random() * 24 - 12).toFixed(1);
            
            carta3D.style.setProperty('--rot-final', `${rot}deg`); 
            carta3D.style.setProperty('--x-final', `${offsetX}px`); 
            carta3D.style.setProperty('--y-final', `${offsetY}px`);

            carta3D.innerHTML = `
                <img src="/assets/img/backards.webp" class="carta-cara carta-dorso">
                <img src="${infoCarta.img}" class="carta-cara carta-frente">
            `;

            pila.appendChild(carta3D);
            if (pila.children.length > 6) pila.removeChild(pila.firstChild);
        } else { 
            if(texto) texto.textContent = carta; 
        }
        
        state.ultimaCartaRecibida = numCarta; const tsLlegada = Date.now(); state.tsLlegadaCarta = tsLlegada;
        
        if (state.miRol === 'espectador') {
            document.querySelectorAll('#contenedorEspectador .carta').forEach(div => {
                if (div.dataset.numero === numCarta && !div.classList.contains('marcada')) {
                    div.classList.add('marcable-visual'); 
                    setTimeout(() => div.classList.remove('marcable-visual'), state.configSala.tiempoMarcar);
                }
            });
        }

        if (state.miRol === 'jugador') {
            document.querySelectorAll('#contenedorTablillas .carta').forEach(div => {
                if (div.dataset.numero === numCarta && !div.classList.contains('marcada')) {
                    div.dataset.activa = "true"; div.style.cursor = "pointer";
                    if (state.configSala.ayudaNinos) div.classList.add('marcable-visual');
                    const t = setTimeout(() => { div.dataset.activa = "false"; div.style.cursor = "default"; div.classList.remove('marcable-visual'); }, state.configSala.tiempoMarcar);
                    
                    div.onpointerdown = function(e) {
                        e.preventDefault(); 
                        if (div.dataset.activa === "true" && !div.classList.contains('marcada')) {
                            const msReaccion = Date.now() - tsLlegada; clearTimeout(t); 
                            div.dataset.activa = "false"; div.classList.remove('marcable-visual'); div.style.cursor = "default"; div.classList.add('marcada'); 
                            
                            let marcador = '<div class="palomita">✔</div>';
                            if (state.miFicha === 'peso') marcador = '<div class="palomita"><img src="/assets/img/unpeso.webp" class="ficha-img"></div>';
                            else if (state.miFicha === 'frijol') marcador = '<div class="palomita"><img src="/assets/img/gfrijol.webp" class="ficha-img"></div>';
                            else if (state.miFicha === 'arroz') marcador = '<div class="palomita"><img src="/assets/img/garroz.webp" class="ficha-img"></div>';
                            
                            div.innerHTML += marcador; state.misCartasMarcadas++;
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
                if (divC.dataset.numero === d.carta.split(' ')[1] && !divC.classList.contains('marcada')) { divC.classList.add('marcada'); divC.innerHTML += '<div class="palomita">✔</div>'; }
            });
        }
    });

    socket.on('torneo_eliminado', (datos) => {
        const modal = document.getElementById('modalEliminadoTorneo');
        const lugarUI = document.getElementById('lugarTorneoUI');
        if (modal && lugarUI) {
            lugarUI.textContent = `#${datos.lugar}`;
            modal.style.display = 'flex';
        }
    });

    socket.on('torneo_tick', (tiempo) => {
        const span = document.getElementById('contadorTorneo');
        if (span) span.textContent = tiempo;
    });

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
    socket.on('votacion_cerrada', (continuar) => { document.getElementById('modalVotacion').style.display = 'none'; });
    
    socket.on('iniciar_votacion_revolver', (datos) => {
        document.getElementById('modalSinCartas').style.display = 'flex'; document.getElementById('tiempoSinCartas').textContent = datos.tiempo;
        if(state.miRol !== 'jugador') { document.getElementById('botonesSinCartas').style.display = 'none'; document.getElementById('msgEsperaRevolver').style.display = 'block'; } 
        else { document.getElementById('botonesSinCartas').style.display = 'block'; document.getElementById('msgEsperaRevolver').style.display = 'none'; }
    });
    
    socket.on('tick_votacion_revolver', (tiempo) => { document.getElementById('tiempoSinCartas').textContent = tiempo; });
    socket.on('votacion_revolver_cerrada', (revolver) => { document.getElementById('modalSinCartas').style.display = 'none'; });
    
    socket.on('nuevo_ganador_notificacion', (d) => {
        const notif = document.getElementById('notificacionFlotante'); notif.textContent = `¡${d.nombre} ha completado su tablilla (Lugar #${d.posicion})!`;
        notif.style.display = 'block'; setTimeout(() => { notif.style.display = 'none'; }, 4000);
    });
    
    socket.on('juego_terminado', (datos) => { 
        state.juegoEnCurso = false; 
        sessionStorage.removeItem('loteria_layout'); 
        ui.mostrarResultados(datos); 
    });

    socket.on('regreso_al_lobby_exitoso', () => {
        sessionStorage.removeItem('loteria_layout'); 

        const footer = document.querySelector('.app-footer');
        if (footer) {
            footer.classList.remove('footer-oculto', 'footer-delay');
        }

        const panelEsp = document.getElementById('panelEspectadorUI'); 
        if(panelEsp) document.body.appendChild(panelEsp);
        
        const btnChat = document.getElementById('btnAbrirChatMovil'); 
        if(btnChat) document.body.appendChild(btnChat);
        
        const btnLoteria = document.getElementById('btnLoteria'); 
        if(btnLoteria) document.body.appendChild(btnLoteria);

        const zonaGriton = document.querySelector('.zona-griton');
        if(zonaGriton) { 
            zonaGriton.style.setProperty('--griton-x', '0px'); 
            zonaGriton.style.setProperty('--griton-y', '0px'); 
        }
        
        const contenedorTabs = document.getElementById('contenedorTablillas');
        if(contenedorTabs) { 
            contenedorTabs.style.setProperty('--offset-x', '0px'); 
            contenedorTabs.style.setProperty('--offset-y', '0px'); 
        }
        
        if(panelEsp) { 
            panelEsp.style.position = ''; 
            panelEsp.style.left = ''; 
            panelEsp.style.top = ''; 
            panelEsp.style.right = ''; 
            panelEsp.style.bottom = ''; 
            panelEsp.style.transform = ''; 
            panelEsp.style.margin = ''; 
            panelEsp.style.zIndex = '';
        }

        state.juegoEnCurso = false; 
        state.misCartasMarcadas = 0;
        
        const cartaActual = document.getElementById('cartaActual');
        if(cartaActual) {
            cartaActual.innerHTML = TEXTO_LOBBY; 
            cartaActual.style.color = "";
        }
        
        document.getElementById('pantallaResultados')?.classList.remove('activa'); 
        document.getElementById('pantallaLobby')?.classList.add('activa');
        document.getElementById('pantallaLobby')?.classList.remove('mesa-activa');
        
        const btnLoteriaRef = document.getElementById('btnLoteria'); 
        if (btnLoteriaRef) {
            btnLoteriaRef.disabled = true; 
            btnLoteriaRef.style.display = 'none';
            if (zonaGriton && cartaActual) zonaGriton.insertBefore(btnLoteriaRef, cartaActual);
        }
        
        const header = document.querySelector('.header-sala'); 
        const cajasListas = document.getElementById('cajasListas'); 
        const panelConfig = document.getElementById('panelConfiguracion');
        const columnaHerramientas = document.getElementById('herramientasSala'); 
        const chat = document.getElementById('cajaChat');

        if(header) header.classList.remove('oculto-juego'); 
        if(cajasListas) cajasListas.classList.remove('oculto-juego'); 
        if(panelConfig) panelConfig.classList.remove('oculto-juego');
        
        if(columnaHerramientas) columnaHerramientas.style.display = 'flex'; 
        if(chat) { 
            chat.style.display = 'flex';
            chat.classList.remove('chat-juego'); 
            if(columnaHerramientas) columnaHerramientas.appendChild(chat); 
        }

        const btnCambiarRol = document.getElementById('btnCambiarRol');
        if(btnCambiarRol && state.configSala && !state.configSala.sinEspectadores) {
            btnCambiarRol.style.display = 'inline-block'; 
        }
        
        const nombreTiempoReal = document.getElementById('nombreTiempoReal');
        if(nombreTiempoReal) nombreTiempoReal.disabled = false;
        
        const btnAbrirChatMovil2 = document.getElementById('btnAbrirChatMovil');
        if(btnAbrirChatMovil2) btnAbrirChatMovil2.style.display = 'none'; 
        
        const chatIngameContenedor = document.getElementById('chatIngameContenedor');
        if(chatIngameContenedor) chatIngameContenedor.style.display = 'none';
        
        const tituloEsp = document.getElementById('tituloEspectando'); 
        if(tituloEsp) tituloEsp.style.display = 'none';
        
        const contenedorEspectador = document.getElementById('contenedorEspectador');
        if(contenedorEspectador) contenedorEspectador.innerHTML = '';
        
        if (state.soyAnfitrion) {
            const btnIniciar = document.getElementById('btnIniciar');
            if(btnIniciar) btnIniciar.style.display = 'inline-block';
            if(panelConfig) panelConfig.classList.add('es-host');
            const controlesBot = document.getElementById('controlesBot');
            if(controlesBot) controlesBot.style.display = 'block';
        }
        
        const btnCreador = document.getElementById('contenedorBtnCreador');
        if(btnCreador && state.miRol === 'jugador') btnCreador.style.display = 'block';
        
        const contenedorPreview = document.getElementById('contenedorBtnPreview');
        if(contenedorPreview) contenedorPreview.style.display = 'flex';
    });
    
    socket.on('actualizar_timer_inactividad', (segs) => {
        const min = Math.floor(segs / 60).toString().padStart(2, '0'); const sec = (segs % 60).toString().padStart(2, '0');
        document.getElementById('tiempoInactividadUI').textContent = `${min}:${sec}`; document.getElementById('relojInactividad').style.display = 'inline-block';
    });
}