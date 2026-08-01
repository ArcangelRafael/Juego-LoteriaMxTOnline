import { CARTAS_LOTERIA } from './cartas.js';

// public/js/ui.js

let tutorialBalloons = [];
let reqAnimFrameId = null;

function updateBalloons() {
    tutorialBalloons.forEach(item => {
        if(!item.target) return;
        const rect = item.target.getBoundingClientRect();
        const bRect = item.balloon.getBoundingClientRect();
        
        if (rect.width === 0 && rect.height === 0) {
            item.balloon.style.opacity = '0';
            item.balloon.style.pointerEvents = 'none';
            return;
        } else {
            item.balloon.style.opacity = '1';
            item.balloon.style.pointerEvents = 'auto';
        }

        let top = 0, left = 0;
        if (item.placement === 'top') {
            top = rect.top - bRect.height - 12;
            left = rect.left + (rect.width / 2) - (bRect.width / 2);
        } else if (item.placement === 'bottom') {
            top = rect.bottom + 12;
            left = rect.left + (rect.width / 2) - (bRect.width / 2);
        }
        item.balloon.style.top = top + 'px';
        item.balloon.style.left = left + 'px';
    });
    if (tutorialBalloons.length > 0) {
        reqAnimFrameId = requestAnimationFrame(updateBalloons);
    }
}

function crearGloboTutorial(targetEl, text, placement) {
    if (!targetEl) return;
    const b = document.createElement('div');
    b.className = `tutorial-balloon ${placement}`;
    b.innerHTML = `<span>${text}</span><button class="btn-ok-tutorial">OK</button>`;
    document.body.appendChild(b);
    
    b.querySelector('.btn-ok-tutorial').addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault();
        const idx = tutorialBalloons.findIndex(item => item.balloon === b);
        if(idx !== -1) tutorialBalloons.splice(idx, 1);
        b.remove();
    });

    tutorialBalloons.push({ balloon: b, target: targetEl, placement });
}

export function iniciarPrevisualizacion(state, contruirEspectadorCb) {
    state.enPrevisualizacion = true;
    document.getElementById('controlesPrevisualizacion').style.display = 'flex';
    
    document.querySelector('.header-sala')?.classList.add('oculto-juego');
    document.getElementById('cajasListas')?.classList.add('oculto-juego');
    document.getElementById('panelConfiguracion')?.classList.add('oculto-juego');
    document.getElementById('pantallaLobby').classList.add('mesa-activa');
    
    setTimeout(() => {
        const chat = document.getElementById('cajaChat');
        if(chat) {
            chat.classList.add('chat-juego');
            document.getElementById('pantallaLobby').appendChild(chat);
        }
    }, 100);

    let miTablilla = document.querySelector('.bloqueada-mia');
    
    if (!miTablilla && state.miRol === 'jugador') {
        const dummyCont = document.createElement('div');
        dummyCont.className = 'tablilla bloqueada-mia dummy-preview';
        dummyCont.innerHTML = `
            <div class="controles-superiores-tablilla">
                <div class="resizer-handle" title="Arrastra para ajustar tamaño">⤡ TAMAÑO</div>
                <div class="mover-handle" title="Arrastra para mover">✥ MOVER</div>
            </div>
            <div class="tablilla-header-container">
                <h4>¡Tablilla de Ensayo!</h4>
                <div class="contenedor-titulo-loteria"></div>
            </div>
            <div class="grid-cartas"></div>
        `;
        const grid = dummyCont.querySelector('.grid-cartas');
        
        if (!state.dummyCartas) {
            state.dummyCartas = Object.values(CARTAS_LOTERIA).sort(() => 0.5 - Math.random()).slice(0, 16);
        }

        state.dummyCartas.forEach(infoCarta => {
            const divC = document.createElement('div'); divC.className = 'carta';
            divC.innerHTML = `<img src="${infoCarta.img}" class="img-carta-adentro"><div class="nombre-carta-tablilla">${infoCarta.nombre}</div>`;
            grid.appendChild(divC);
        });
        document.getElementById('contenedorTablillas').appendChild(dummyCont);
        miTablilla = dummyCont;
    }

    const panelEsp = document.getElementById('panelEspectadorUI');
    const btnLoteria = document.getElementById('btnLoteria');
    const btnChatMovil = document.getElementById('btnAbrirChatMovil');
    
    if(state.miRol === 'jugador' && miTablilla) {
        if(btnLoteria) {
            btnLoteria.style.display = 'inline-block';
            const contenedorLoteria = miTablilla.querySelector('.contenedor-titulo-loteria');
            if (contenedorLoteria) contenedorLoteria.appendChild(btnLoteria);
        }
        if(btnChatMovil) {
            btnChatMovil.style.display = 'flex';
            miTablilla.appendChild(btnChatMovil);
        }
        if(panelEsp) miTablilla.appendChild(panelEsp);
    } else {
        const lobbyContenedor = document.getElementById('pantallaLobby');
        if (panelEsp && lobbyContenedor) {
            lobbyContenedor.appendChild(panelEsp);
            panelEsp.style.position = 'absolute';
            panelEsp.style.bottom = '30px';
            panelEsp.style.left = '50%';
            panelEsp.style.transform = 'translateX(-50%)';
            panelEsp.style.top = 'auto';
            panelEsp.style.right = 'auto';
            panelEsp.style.margin = '0';
            panelEsp.style.zIndex = '9999';
        }
    }
    if (panelEsp) panelEsp.style.display = 'block';

    const cartaContenedor = document.getElementById('cartaActual'); 
    const dummyCarta = CARTAS_LOTERIA['1']; 
    if (dummyCarta && cartaContenedor) {
        cartaContenedor.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <span id="textoCartaGriton" style="font-size: 1.4em; font-weight: 900; z-index: 310; text-shadow: 0 4px 15px rgba(0,0,0,0.8); background: rgba(15,23,42,0.85); padding: 8px 25px; border-radius: 12px; color: #38bdf8; border: 1px solid rgba(255,255,255,0.1);">¡${dummyCarta.nombre}!</span>
                <div class="griton-mesa-container">
                    <div id="pilaCartasGriton" style="position: relative; width: 220px; height: 310px; z-index: 2;">
                        <div class="carta-3d-container" style="--rot-final:0deg; --x-final:0px; --y-final:0px; animation: none; transform: scale(1);">
                            <img src="${dummyCarta.img}" class="carta-cara carta-frente">
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
    
    document.querySelectorAll('.tablilla').forEach(el => {
        if(!el.classList.contains('bloqueada-mia') && state.miRol === 'jugador') el.style.display = 'none';
        else if (state.miRol === 'espectador') el.style.display = 'none'; 
    });
    
    contruirEspectadorCb();

    // FIX MAESTRO: Si la casilla Omitir Tutorial no está marcada, lanzamos la animación
    const omitirTutorial = document.getElementById('checkOmitirTutorial')?.checked;

    if (!omitirTutorial) {
        setTimeout(() => {
            const gritonText = document.getElementById('textoCartaGriton');
            if (gritonText) gritonText.classList.add('tutorial-glow-griton');
            if (miTablilla) miTablilla.classList.add('tutorial-glow-tablilla');

            setTimeout(() => {
                if (gritonText) gritonText.classList.remove('tutorial-glow-griton');
                if (miTablilla) miTablilla.classList.remove('tutorial-glow-tablilla');
            }, 6000);

            tutorialBalloons.forEach(item => item.balloon.remove());
            tutorialBalloons = [];
            if(reqAnimFrameId) cancelAnimationFrame(reqAnimFrameId);

            crearGloboTutorial(document.getElementById('textoCartaGriton'), "Mueve al griton desde el texto y acomodalo segun tu dispositivo", "top");
            crearGloboTutorial(document.getElementById('btnLoteria'), "Este sera el boton para que cantes victoria una vez completes tu juego", "bottom");
            if(miTablilla) {
                crearGloboTutorial(miTablilla.querySelector('.resizer-handle'), "De aqui podras cambiar el tamaño de tu tablilla, hacerla mas grande o mas chica", "top");
                crearGloboTutorial(miTablilla.querySelector('.mover-handle'), "De aqui podras mover toda tu tablilla y reubicarla a donde mejor te convengan", "top");
            }
            crearGloboTutorial(document.getElementById('btnAbrirChatMovil'), "Pulsa aqui para activar el chat durante el juego o enter si estas en pc", "top");
            crearGloboTutorial(document.getElementById('panelEspectadorUI'), "Aqui podras activar la casilla para ver el juego de tus enemigos, ya sea de todos o solo de alguien en especifico. Tambien puedes ocultar este recuadro en pulsando sobre '-'", "top");
            
            updateBalloons();
        }, 400);
    }
}

export function cerrarPrevisualizacion(state) {
    state.enPrevisualizacion = false;
    state.dummyCartas = null; 
    
    tutorialBalloons.forEach(item => item.balloon.remove());
    tutorialBalloons = [];
    if(reqAnimFrameId) cancelAnimationFrame(reqAnimFrameId);
    
    const gritonText = document.getElementById('textoCartaGriton');
    if (gritonText) gritonText.classList.remove('tutorial-glow-griton');
    const miTab = document.querySelector('.bloqueada-mia');
    if (miTab) miTab.classList.remove('tutorial-glow-tablilla');

    document.getElementById('controlesPrevisualizacion').style.display = 'none';
    document.getElementById('pantallaLobby').classList.remove('mesa-activa');
    
    document.querySelector('.header-sala')?.classList.remove('oculto-juego');
    document.getElementById('cajasListas')?.classList.remove('oculto-juego');
    document.getElementById('panelConfiguracion')?.classList.remove('oculto-juego');

    const chat = document.getElementById('cajaChat');
    const columnaHerramientas = document.getElementById('herramientasSala');
    if (chat && columnaHerramientas) {
        chat.classList.remove('chat-juego');
        columnaHerramientas.appendChild(chat);
    }

    const dummy = document.querySelector('.dummy-preview');
    if (dummy) dummy.remove();

    const cartaActual = document.getElementById('cartaActual');
    if(cartaActual) {
        cartaActual.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap: 10px;">
                <span>Selección y bloqueo de tablillas</span>
                <span style="font-size: 16px; font-weight: normal; color: var(--text-muted);">Selecciona la tablilla de tu agrado y bloquéala antes que alguien más te la gane.</span>
            </div>`;
    }

    document.querySelectorAll('.tablilla').forEach(el => el.style.display = 'block');
    document.getElementById('contenedorEspectador').innerHTML = '';
    
    const panelEsp = document.getElementById('panelEspectadorUI');
    if(panelEsp) {
        document.body.appendChild(panelEsp);
        panelEsp.style.position = '';
        panelEsp.style.left = '';
        panelEsp.style.top = '';
        panelEsp.style.right = '';
        panelEsp.style.bottom = '';
        panelEsp.style.transform = '';
        panelEsp.style.margin = '';
        panelEsp.style.zIndex = '';
        panelEsp.style.display = 'none';
    }
}

export function mostrarModalError(msg, callbackRecarga = null) {
    document.getElementById('textoModalError').textContent = msg;
    document.getElementById('modalError').style.display = 'flex';
    document.getElementById('btnCerrarError').onclick = () => {
        document.getElementById('modalError').style.display = 'none';
        if(callbackRecarga) callbackRecarga();
    };
}

export function mostrarModalExpulsion(nombre, onConfirm) {
    document.getElementById('nombreExpulsarUI').textContent = nombre;
    document.getElementById('modalExpulsar').style.display = 'flex';
    document.getElementById('btnConfirmarExpulsion').onclick = () => { document.getElementById('modalExpulsar').style.display = 'none'; onConfirm(); };
    document.getElementById('btnCancelarExpulsion').onclick = () => { document.getElementById('modalExpulsar').style.display = 'none'; };
}

export function mostrarModalDestruirLobby(onConfirm) {
    document.getElementById('modalDestruirLobby').style.display = 'flex';
    document.getElementById('btnConfirmarDestruir').onclick = () => { 
        document.getElementById('modalDestruirLobby').style.display = 'none'; 
        onConfirm(); 
    };
    document.getElementById('btnCancelarDestruir').onclick = () => { 
        document.getElementById('modalDestruirLobby').style.display = 'none'; 
    };
}

export function actualizarUIConfig(cfg, state) {
    state.configSala = cfg;
    if(cfg.velocidadGriton === 3000) document.querySelector('input[value="3"]').checked = true;
    else if(cfg.velocidadGriton === 5000) document.querySelector('input[value="5"]').checked = true;
    else if(cfg.velocidadGriton === 2000) document.querySelector('input[value="2"]').checked = true;
    
    document.getElementById('checkAyudaNinos').checked = cfg.ayudaNinos;
    document.getElementById('checkSinEspectadores').checked = cfg.sinEspectadores;
    
    const checkTorneo = document.getElementById('checkModoTorneo');
    if (checkTorneo && cfg.modoTorneo !== undefined) checkTorneo.checked = cfg.modoTorneo;

    if(cfg.sinEspectadores) document.getElementById('btnCambiarRol').style.display = 'none';
    else if(!state.juegoEnCurso) document.getElementById('btnCambiarRol').style.display = 'inline-block';

    const selectMax = document.getElementById('selectMaxJugadores');
    if (selectMax && cfg.maxJugadores) selectMax.value = cfg.maxJugadores;
}

export function initLobby(n, c, t, renderizarTablillasCb) {
    document.getElementById('pantallaMenu').classList.remove('activa');
    document.getElementById('pantallaResultados').classList.remove('activa');
    document.getElementById('pantallaLobby').classList.add('activa');
    document.getElementById('tituloSala').textContent = `Sala: ${n}`;
    document.getElementById('codigoSalaTexto').textContent = `Código: ${c}`;
    
    const contenedorPreview = document.getElementById('contenedorBtnPreview');
    if(contenedorPreview) contenedorPreview.style.display = 'flex';

    if (renderizarTablillasCb) renderizarTablillasCb(t);
}

export function actualizarListas(listas, state) {
    const ulJ = document.getElementById('listaJugadoresUI');
    const ulE = document.getElementById('listaEspectadoresUI');
    const limiteJugadores = (state.configSala && state.configSala.maxJugadores) ? state.configSala.maxJugadores : 8;
    
    document.getElementById('contadorJugadores').textContent = `${listas.jugadores.length}/${limiteJugadores}`;
    document.getElementById('contadorEspectadores').textContent = `${listas.espectadores.length}/4`;

    ulJ.innerHTML = '';
    listas.jugadores.forEach(j => {
        let img = j.foto ? `<img src="${j.foto}" class="foto-perfil">` : '';
        let btnKick = (state.soyAnfitrion && j.id !== state.socketId) ? `<button class="btn-kick" data-id="${j.id}" data-nombre="${j.nombre}">Expulsar</button>` : '';
        
        let textoAccion = '';
        if (!j.enLobby && !j.isBot) {
            textoAccion = '<span style="color:#fbbf24; font-size:11px; font-style:italic; margin-left:5px;">(Viendo resultados)</span>';
        } else if (j.estadoLobby) {
            textoAccion = `<span style="color:#38bdf8; font-size:11px; font-style:italic; margin-left:5px;">(${j.estadoLobby})</span>`;
        } else if (!j.listo && !j.isBot) {
            textoAccion = '<span style="color:#94a3b8; font-size:11px; font-style:italic; margin-left:5px;">(AFK)</span>';
        }

        let textoListo = j.listo ? '<span class="listo-true" style="margin-left:5px;">(¡Listo!)</span>' : '';

        ulJ.innerHTML += `<li><span style="display:flex; align-items:center; flex-wrap:wrap;">${img}<span style="font-weight:600;">${j.nombre}</span>${textoAccion}${textoListo}</span> ${btnKick}</li>`;
    });

    ulE.innerHTML = '';
    listas.espectadores.forEach(e => {
        let img = e.foto ? `<img src="${e.foto}" class="foto-perfil">` : '';
        let btnKick = (state.soyAnfitrion && e.id !== state.socketId) ? `<button class="btn-kick" data-id="${e.id}" data-nombre="${e.nombre}">Expulsar</button>` : '';
        ulE.innerHTML += `<li><span>${img}${e.nombre}</span> ${btnKick}</li>`;
    });
}

export function prepararInterfazJuego(state, contruirEspectadorCb) {
    state.juegoEnCurso = true;
    document.getElementById('btnIniciar').style.display = 'none';
    const reloj = document.getElementById('relojInactividad'); if(reloj) reloj.style.display = 'none';
    const btnTablilla = document.getElementById('botonesTablilla'); if(btnTablilla) btnTablilla.style.display = 'none';
    const btnRol = document.getElementById('btnCambiarRol'); if(btnRol) btnRol.style.display = 'none';
    const inputNombre = document.getElementById('nombreTiempoReal'); if(inputNombre) inputNombre.disabled = true;
    const btnCreador = document.getElementById('contenedorBtnCreador'); if(btnCreador) btnCreador.style.display = 'none';
    
    const contenedorPreview = document.getElementById('contenedorBtnPreview'); 
    if (contenedorPreview) contenedorPreview.style.display = 'none';
    
    const btnSalirEsp = document.getElementById('btnSalirEspectador');
    if (btnSalirEsp) {
        btnSalirEsp.style.display = (state.miRol === 'espectador') ? 'inline-block' : 'none';
    }

    const header = document.querySelector('.header-sala');
    const cajasListas = document.getElementById('cajasListas');
    const panelConfig = document.getElementById('panelConfiguracion');
    if(header) header.classList.add('oculto-juego');
    if(cajasListas) cajasListas.classList.add('oculto-juego');
    if(panelConfig) panelConfig.classList.add('oculto-juego');

    document.getElementById('pantallaLobby').classList.add('mesa-activa');
    const tituloEsp = document.getElementById('tituloEspectando'); if(tituloEsp) tituloEsp.style.display = 'none';

    setTimeout(() => {
        const chat = document.getElementById('cajaChat');
        const columnaHerramientas = document.getElementById('herramientasSala');
        if(chat) chat.style.display = 'none';
        if(columnaHerramientas) columnaHerramientas.style.display = 'none';
    }, 100);
    
    const panelEsp = document.getElementById('panelEspectadorUI');
    
    if(state.miRol === 'jugador') {
        const miTablilla = document.querySelector('.bloqueada-mia');
        
        const btnLoteria = document.getElementById('btnLoteria');
        if(btnLoteria && miTablilla) {
            btnLoteria.style.display = 'inline-block';
            const contenedorLoteria = miTablilla.querySelector('.contenedor-titulo-loteria');
            if (contenedorLoteria) contenedorLoteria.appendChild(btnLoteria);
        }
        
        const btnChatMovil = document.getElementById('btnAbrirChatMovil');
        if(btnChatMovil && miTablilla) {
            btnChatMovil.style.display = 'flex';
            miTablilla.appendChild(btnChatMovil);
        }

        if(panelEsp && miTablilla) {
            miTablilla.appendChild(panelEsp);
        }
    } else {
        const lobbyContenedor = document.getElementById('pantallaLobby');
        if (panelEsp && lobbyContenedor) {
            lobbyContenedor.appendChild(panelEsp);
            panelEsp.style.position = 'absolute';
            panelEsp.style.bottom = '30px';
            panelEsp.style.left = '50%';
            panelEsp.style.transform = 'translateX(-50%)';
            panelEsp.style.top = 'auto';
            panelEsp.style.right = 'auto';
            panelEsp.style.margin = '0';
            panelEsp.style.zIndex = '9999';
        }
    }
    
    document.querySelectorAll('.tablilla').forEach(el => {
        if(!el.classList.contains('bloqueada-mia') && state.miRol === 'jugador') el.style.display = 'none';
        else if (state.miRol === 'espectador') el.style.display = 'none'; 
    });
    
    if(contruirEspectadorCb) contruirEspectadorCb();
}

export function mostrarResultados(datos) {
    document.getElementById('pantallaLobby').classList.remove('activa');
    document.getElementById('pantallaResultados').classList.add('activa');
    document.getElementById('modalVotacion').style.display = 'none';
    document.getElementById('modalSinCartas').style.display = 'none';
    document.getElementById('btnAbrirChatMovil').style.display = 'none';
    document.getElementById('chatIngameContenedor').style.display = 'none';

    const footer = document.querySelector('.app-footer');
    if (footer) footer.classList.remove('footer-oculto', 'footer-delay');

    const ranking = datos.ranking; const stats = datos.estadisticas;
    
    const btnVolver = document.getElementById('btnVolverLobby');
    const tituloTorneo = document.getElementById('tituloTorneoResultados');
    const txtGanadorAbsoluto = document.getElementById('ganadorAbsolutoTexto');
    const txtGanadorTorneo = document.getElementById('ganadorTorneoTexto');

    if (datos.torneoFinal) {
        if (txtGanadorAbsoluto) txtGanadorAbsoluto.style.display = 'none';
        if (tituloTorneo) tituloTorneo.style.display = 'none';
        if (btnVolver) btnVolver.style.display = 'none';
        
        if (txtGanadorTorneo) {
            let imgG = datos.ganador.foto ? `<img src="${datos.ganador.foto}" class="foto-ganador-oro">` : '';
            txtGanadorTorneo.innerHTML = `<h2>🏆 ¡FELICIDADES AL GANADOR DEL TORNEO! 🏆</h2>${imgG}<h3 style="margin-top:0;">${datos.ganador.nombre}</h3>`;
            txtGanadorTorneo.style.display = 'block';
        }
    } 
    else if (datos.torneo) {
        if (txtGanadorTorneo) txtGanadorTorneo.style.display = 'none';
        if (txtGanadorAbsoluto) txtGanadorAbsoluto.style.display = 'block';
        if (btnVolver) btnVolver.style.display = 'none';
        
        if (tituloTorneo) {
            tituloTorneo.style.display = 'block';
            const cont = document.getElementById('contadorTorneo');
            if (cont) cont.textContent = datos.tiempo;
        }

        let imgE = datos.eliminado.foto ? `<img src="${datos.eliminado.foto}" style="width: 32px; height: 32px; border-radius: 50%; vertical-align: middle; margin-right: 8px; border: 2px solid #ef4444; object-fit: cover; box-shadow: 0 0 10px rgba(239,68,68,0.6);">` : '';

        if(ranking.length > 0 && ranking[0].marcas === 16) {
            let imgG = ranking[0].foto ? `<img src="${ranking[0].foto}" class="foto-ganador-oro">` : '';
            document.getElementById('ganadorAbsolutoTexto').innerHTML = `${imgG} <h2 style="margin-top:0;">¡Felicidades, ${ranking[0].nombre}!</h2><div class="text-danger" style="margin-top:-10px; display:flex; align-items:center; justify-content:center; font-weight:bold;">¡${imgE}${datos.eliminado.nombre} ha sido eliminado del torneo!</div>`;
        } else {
            document.getElementById('ganadorAbsolutoTexto').innerHTML = `<h2>¡Nadie cantó lotería!</h2><div class="text-danger" style="display:flex; align-items:center; justify-content:center; font-weight:bold;">¡${imgE}${datos.eliminado.nombre} ha sido eliminado por menor puntuación!</div>`;
        }
    } 
    else {
        if (tituloTorneo) tituloTorneo.style.display = 'none';
        if (txtGanadorTorneo) txtGanadorTorneo.style.display = 'none';
        if (txtGanadorAbsoluto) txtGanadorAbsoluto.style.display = 'block';
        if (btnVolver) btnVolver.style.display = 'inline-block';

        if(ranking.length > 0 && ranking[0].marcas === 16) {
            let imgG = ranking[0].foto ? `<img src="${ranking[0].foto}" class="foto-ganador-oro">` : '';
            document.getElementById('ganadorAbsolutoTexto').innerHTML = `${imgG} <h2 style="margin-top:0;">¡Felicidades, ${ranking[0].nombre}!</h2>`;
        } else {
            document.getElementById('ganadorAbsolutoTexto').innerHTML = "<h2>¡Partida finalizada sin Lotería plena!</h2>";
        }
    }

    const ul = document.getElementById('listaRankingFinal'); ul.innerHTML = '';
    
    ranking.forEach((jugador, i) => {
        let detallesCartas = '<p style="margin:5px 0; color:#94a3b8;">Se le fueron tarjetas: <b>NO</b></p>';
        let htmlRondas = '';
        
        if (jugador.historialPerdidas && jugador.historialPerdidas.length > 0) {
            jugador.historialPerdidas.forEach((perdidasRonda, index) => {
                let lista = perdidasRonda.map(carta => {
                    let num = carta.split(' ')[1]; 
                    let nombreReal = CARTAS_LOTERIA[num] ? CARTAS_LOTERIA[num].nombre : carta;
                    return `<li>${nombreReal}</li>`;
                }).join('');
                htmlRondas += `<p style="margin: 8px 0 2px 0; color: #fbbf24; font-size: 0.9em; font-weight: bold;">Vuelta ${index + 1}:</p><ul style="margin-top:0;">${lista}</ul>`;
            });
        }

        if (jugador.perdidas && jugador.perdidas.length > 0) {
            let lista = jugador.perdidas.map(carta => {
                let num = carta.split(' ')[1]; 
                let nombreReal = CARTAS_LOTERIA[num] ? CARTAS_LOTERIA[num].nombre : carta;
                return `<li>${nombreReal}</li>`;
            }).join(''); 
            let tituloRonda = (jugador.historialPerdidas && jugador.historialPerdidas.length > 0) ? `<p style="margin: 8px 0 2px 0; color: #fbbf24; font-size: 0.9em; font-weight: bold;">Vuelta Final:</p>` : '';
            htmlRondas += `${tituloRonda}<ul style="margin-top:0;">${lista}</ul>`;
        }

        if (htmlRondas !== '') {
            detallesCartas = `<div class="analisis-scroll"><p style="margin: 0 0 4px 0; color: #f87171; font-weight: 600;">Se le fueron tarjetas: Sí</p>${htmlRondas}</div>`;
        }

        let imgH = jugador.foto ? `<img src="${jugador.foto}" class="foto-ranking">` : '';
        ul.innerHTML += `
            <li style="display: flex; flex-direction: column; align-items: flex-start; padding: 15px 0; border-bottom: 1px solid var(--border-panel);">
                <div style="display:flex; align-items:center; width:100%; gap: 15px;">
                    <b style="width:85px; flex-shrink:0;">Lugar #${i + 1}:</b> 
                    ${imgH} 
                    <span style="flex:1; font-weight: 700; font-size: 1.1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${jugador.nombre}">${jugador.nombre}</span> 
                    <i style="flex-shrink:0; color:#94a3b8; white-space: nowrap;">(${jugador.marcas} marcas)</i>
                </div>
                <details style="width:100%; box-sizing:border-box; margin-top: 10px;">
                    <summary style="outline: none; cursor: pointer; color: #38bdf8; font-weight: 600; padding: 5px 0;">▶ Análisis</summary>
                    ${detallesCartas}
                </details>
            </li>`;
    });

    const cajaS = document.getElementById('cajaAnalisisGlobal');
    let msjRapido = stats.rapido.nombre ? `${stats.rapido.nombre} (${(stats.rapido.ms / 1000).toFixed(2)}s)` : "Nadie";
    let msjLento = stats.lento.nombre ? `${stats.lento.nombre} (${(stats.lento.ms / 1000).toFixed(2)}s)` : "Nadie";
    
    let maxPerdidas = 0;
    ranking.forEach(j => {
        let p = (j.historialPerdidas?.flat().length || 0) + (j.perdidas?.length || 0);
        if (p > maxPerdidas) maxPerdidas = p;
    });
    let distraidos = ranking.filter(j => ((j.historialPerdidas?.flat().length || 0) + (j.perdidas?.length || 0)) === maxPerdidas).map(j => j.nombre);
    let msjDistraido = maxPerdidas > 0 ? `<p style="color:coral; margin: 8px 0;"><b>Más distraído(s):</b> ${distraidos.join(', ')} (se les pasaron ${maxPerdidas} cartas)</p>` : '';

    let victimasRobo = ranking.filter((j, idx) => idx > 0 && j.marcas === 16).map(j => j.nombre);
    let msjRobo = victimasRobo.length > 0 ? `<p style="color:gold; margin: 8px 0;"><b>Robo de victoria:</b> ${ranking[0].nombre} se la robó por reflejos a ${victimasRobo.join(', ')}</p>` : '';

    cajaS.innerHTML = `<h3>Análisis General de la Partida</h3><p style="margin: 8px 0;">El click más rápido fue de: <b>${msjRapido}</b></p><p style="margin: 8px 0;">El click más lento fue de: <b>${msjLento}</b></p>${msjRobo}${msjDistraido}`;
}

export function pintarMensajeChat(datos) {
    const caja = document.getElementById('chatMensajes');
    let imgHTML = datos.foto ? `<img src="${datos.foto}" class="foto-chat">` : '';
    let estiloNombre = datos.nombre === 'SISTEMA' ? 'color:blue;' : '';
    caja.innerHTML += `<div style="display:flex; align-items:center; margin-bottom:5px;">${imgHTML}<b style="${estiloNombre} margin-right:5px;">${datos.nombre}:</b><span>${datos.mensaje}</span></div>`;
    caja.scrollTop = caja.scrollHeight;
}

export function pintarSalasPublicas(salas) {
    const tbody = document.getElementById('listaSalasPublicasUI'); tbody.innerHTML = '';
    if(salas.length === 0) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No hay salas públicas en espera. ¡Crea una!</td></tr>';
    else {
        salas.forEach(s => {
            const limiteMaximo = s.maxJugadores || 8; 
            let btnText = s.jugadores >= limiteMaximo ? 'Llena (Ver)' : 'Unirse';
            tbody.innerHTML += `<tr><td><b>${s.nombreSala}</b></td><td>${s.anfitrion}</td><td>${s.jugadores}/${limiteMaximo}</td><td><button class="btn-unirse-tabla" data-sala="${s.nombreSala}" data-codigo="${s.codigo}">${btnText}</button></td></tr>`;
        });
    }
}

export function inicializarCreador(state, CARTAS_DICCIONARIO) {
    const gridCat = document.getElementById('creadorCatalogoGrid'); gridCat.innerHTML = '';
    for (let i = 1; i <= 54; i++) {
        const strNum = i.toString(); const info = CARTAS_DICCIONARIO[strNum];
        if (info) gridCat.innerHTML += `<div class="carta-catalogo" data-numero="${strNum}" draggable="true"><img src="${info.img}" draggable="false" title="${info.nombre}"><div class="nombre-carta-catalogo" title="${info.nombre}">${info.nombre}</div></div>`;
    }
    actualizarCreadorUI(state, CARTAS_DICCIONARIO);
}

export function actualizarCreadorUI(state, CARTAS_DICCIONARIO) {
    const gridTab = document.getElementById('creadorTablillaGrid'); gridTab.innerHTML = ''; let llenas = 0;
    for (let i = 0; i < 16; i++) {
        const num = state.creadorCartas[i]; let content = '';
        if (num !== null && CARTAS_DICCIONARIO[num]) { content = `<img src="${CARTAS_DICCIONARIO[num].img}" draggable="false">`; llenas++; }
        gridTab.innerHTML += `<div class="creador-slot" data-index="${i}">${content}</div>`;
    }
    document.getElementById('creadorContador').textContent = `${llenas}/16`; document.getElementById('btnGuardarCreador').disabled = (llenas !== 16);
    document.querySelectorAll('.carta-catalogo').forEach(el => {
        const strNum = el.dataset.numero;
        if (state.creadorCartas.includes(strNum)) el.classList.add('en-tablilla'); else el.classList.remove('en-tablilla');
    });
}