import { CARTAS_LOTERIA } from './cartas.js';

// public/js/ui.js
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
    
    document.getElementById('btnConfirmarExpulsion').onclick = () => {
        document.getElementById('modalExpulsar').style.display = 'none';
        onConfirm();
    };
    document.getElementById('btnCancelarExpulsion').onclick = () => {
        document.getElementById('modalExpulsar').style.display = 'none';
    };
}

export function actualizarUIConfig(cfg, state) {
    state.configSala = cfg;
    if(cfg.velocidadGriton === 3000) document.querySelector('input[value="3"]').checked = true;
    else if(cfg.velocidadGriton === 5000) document.querySelector('input[value="5"]').checked = true;
    else if(cfg.velocidadGriton === 2000) document.querySelector('input[value="2"]').checked = true;
    
    document.getElementById('checkAyudaNinos').checked = cfg.ayudaNinos;
    document.getElementById('checkSinEspectadores').checked = cfg.sinEspectadores;

    if(cfg.sinEspectadores) document.getElementById('btnCambiarRol').style.display = 'none';
    else if(!state.juegoEnCurso) document.getElementById('btnCambiarRol').style.display = 'inline-block';

    // Actualizar select de máximo de jugadores
    const selectMax = document.getElementById('selectMaxJugadores');
    if (selectMax && cfg.maxJugadores) {
        selectMax.value = cfg.maxJugadores;
    }
}

export function initLobby(n, c, t, renderizarTablillasCb) {
    document.getElementById('pantallaMenu').classList.remove('activa');
    document.getElementById('pantallaResultados').classList.remove('activa');
    document.getElementById('pantallaLobby').classList.add('activa');
    document.getElementById('tituloSala').textContent = `Sala: ${n}`;
    document.getElementById('codigoSalaTexto').textContent = `Código: ${c}`;
    renderizarTablillasCb(t);
}

export function actualizarListas(listas, state) {
    const ulJ = document.getElementById('listaJugadoresUI');
    const ulE = document.getElementById('listaEspectadoresUI');
    
    // Obtenemos el límite dinámico (o 8 por defecto si no lo han puesto)
    const limiteJugadores = (state.configSala && state.configSala.maxJugadores) ? state.configSala.maxJugadores : 8;
    
    document.getElementById('contadorJugadores').textContent = `${listas.jugadores.length}/${limiteJugadores}`;
    document.getElementById('contadorEspectadores').textContent = `${listas.espectadores.length}/4`;

    ulJ.innerHTML = '';
    listas.jugadores.forEach(j => {
        let img = j.foto ? `<img src="${j.foto}" class="foto-perfil">` : '';
        let btnKick = (state.soyAnfitrion && j.id !== state.socketId) ? `<button class="btn-kick" data-id="${j.id}" data-nombre="${j.nombre}">Expulsar</button>` : '';
        let esperando = (!j.enLobby && !j.isBot) ? '<span class="estado-esperando">(esperando)</span>' : '';
        ulJ.innerHTML += `<li><span>${img}${j.nombre}${esperando} ${j.listo ? '<span class="listo-true"> (¡Listo!)</span>' : ''}</span> ${btnKick}</li>`;
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
    const reloj = document.getElementById('relojInactividad');
    if(reloj) reloj.style.display = 'none';
    const btnTablilla = document.getElementById('botonesTablilla');
    if(btnTablilla) btnTablilla.style.display = 'none';
    const btnRol = document.getElementById('btnCambiarRol');
    if(btnRol) btnRol.style.display = 'none';
    const inputNombre = document.getElementById('nombreTiempoReal');
    if(inputNombre) inputNombre.disabled = true;
    
    // Ocultar Botón de Creador
    const btnCreador = document.getElementById('contenedorBtnCreador');
    if(btnCreador) btnCreador.style.display = 'none';
    
    const header = document.querySelector('.header-sala');
    const cajasListas = document.getElementById('cajasListas');
    const panelConfig = document.getElementById('panelConfiguracion');
    
    if(header) header.classList.add('oculto-juego');
    if(cajasListas) cajasListas.classList.add('oculto-juego');
    if(panelConfig) panelConfig.classList.add('oculto-juego');

    document.getElementById('pantallaLobby').classList.add('mesa-activa');
    
    const tituloEsp = document.getElementById('tituloEspectando');
    if(tituloEsp) tituloEsp.style.display = 'none';

    setTimeout(() => {
        const chat = document.getElementById('cajaChat');
        const columnaHerramientas = document.getElementById('herramientasSala');
        
        if(chat) chat.style.display = 'none';
        if(columnaHerramientas) columnaHerramientas.style.display = 'none';
    }, 100);
    
    if(state.miRol === 'jugador') {
        const btnLoteria = document.getElementById('btnLoteria');
        if(btnLoteria) {
            btnLoteria.style.display = 'inline-block';
            document.getElementById('panelEspectadorUI').appendChild(btnLoteria);
        }
        
        const btnChatMovil = document.getElementById('btnAbrirChatMovil');
        if(btnChatMovil) btnChatMovil.style.display = 'flex';
    }
    
    document.querySelectorAll('.tablilla').forEach(el => {
        if(!el.classList.contains('bloqueada-mia') && state.miRol === 'jugador') el.style.display = 'none';
        else if (state.miRol === 'espectador') el.style.display = 'none'; 
        else el.classList.remove('bloqueada-mia'); 
    });
    
    contruirEspectadorCb();
}

export function mostrarResultados(datos) {
    document.getElementById('pantallaLobby').classList.remove('activa');
    document.getElementById('pantallaResultados').classList.add('activa');
    document.getElementById('modalVotacion').style.display = 'none';
    document.getElementById('modalSinCartas').style.display = 'none';
    
    document.getElementById('btnAbrirChatMovil').style.display = 'none';
    document.getElementById('chatIngameContenedor').style.display = 'none';

    const ranking = datos.ranking; const stats = datos.estadisticas;
    
    if(ranking.length > 0 && ranking[0].marcas === 16) {
        let imgG = ranking[0].foto ? `<img src="${ranking[0].foto}" class="foto-ganador-oro">` : '';
        document.getElementById('ganadorAbsolutoTexto').innerHTML = `${imgG} <h2 style="margin-top:0;">¡Felicidades, ${ranking[0].nombre}!</h2>`;
    } else {
        document.getElementById('ganadorAbsolutoTexto').innerHTML = "<h2>¡Partida finalizada sin Lotería plena!</h2>";
    }

    const ul = document.getElementById('listaRankingFinal'); ul.innerHTML = '';
    
    ranking.forEach((jugador, i) => {
        let detallesCartas = '<p style="margin:5px 0; color:#94a3b8;">Se le fueron tarjetas: <b>NO</b></p>';
        let htmlRondas = '';
        
        // 1. Verificar si hay historial de vueltas anteriores (Mazo revuelto)
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

        // 2. Verificar la vuelta final (o la única vuelta si nadie revolvió)
        if (jugador.perdidas && jugador.perdidas.length > 0) {
            let lista = jugador.perdidas.map(carta => {
                let num = carta.split(' ')[1]; 
                let nombreReal = CARTAS_LOTERIA[num] ? CARTAS_LOTERIA[num].nombre : carta;
                return `<li>${nombreReal}</li>`;
            }).join(''); 
            
            let tituloRonda = (jugador.historialPerdidas && jugador.historialPerdidas.length > 0) ? `<p style="margin: 8px 0 2px 0; color: #fbbf24; font-size: 0.9em; font-weight: bold;">Vuelta Final:</p>` : '';
            htmlRondas += `${tituloRonda}<ul style="margin-top:0;">${lista}</ul>`;
        }

        // Si se generó contenido, armamos el bloque completo
        if (htmlRondas !== '') {
            detallesCartas = `
                <div class="analisis-scroll">
                    <p style="margin: 0 0 4px 0; color: #f87171; font-weight: 600;">Se le fueron tarjetas: Sí</p>
                    ${htmlRondas}
                </div>
            `;
        }

        let imgH = jugador.foto ? `<img src="${jugador.foto}" class="foto-ranking">` : '';
        
        // Renderizado del HTML con protección anti-saltos de línea (nowrap)
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
    let msjRobo = stats.robo && stats.robo.victimas.length > 0 ? `<p style="color:gold;"><b>Robo de victoria:</b> ${stats.robo.ganador} se la robó por reflejos a ${stats.robo.victimas.join(', ')}</p>` : '';
    let msjDistraido = stats.distraido && stats.distraido.nombre ? `<p style="color:coral;"><b>Más distraído:</b> ${stats.distraido.nombre} (se le pasaron ${stats.distraido.cantidad} cartas)</p>` : '';

    cajaS.innerHTML = `<h3>Análisis General de la Partida</h3>
        <p>El click más rápido fue de: <b>${msjRapido}</b></p>
        <p>El click más lento fue de: <b>${msjLento}</b></p>
        ${msjRobo}
        ${msjDistraido}`;
}

export function pintarMensajeChat(datos) {
    const caja = document.getElementById('chatMensajes');
    let imgHTML = datos.foto ? `<img src="${datos.foto}" class="foto-chat">` : '';
    let estiloNombre = datos.nombre === 'SISTEMA' ? 'color:blue;' : '';
    caja.innerHTML += `<div style="display:flex; align-items:center; margin-bottom:5px;">${imgHTML}<b style="${estiloNombre} margin-right:5px;">${datos.nombre}:</b><span>${datos.mensaje}</span></div>`;
    caja.scrollTop = caja.scrollHeight;
}

export function pintarSalasPublicas(salas) {
    const tbody = document.getElementById('listaSalasPublicasUI');
    tbody.innerHTML = '';
    if(salas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No hay salas públicas en espera. ¡Crea una!</td></tr>';
    } else {
        salas.forEach(s => {
            // REGLA DE SEGURIDAD: Si no viene el dato, usamos 8 por defecto
            const limiteMaximo = s.maxJugadores || 8; 
            
            let btnText = s.jugadores >= limiteMaximo ? 'Llena (Ver)' : 'Unirse';
            
            tbody.innerHTML += `<tr>
                <td><b>${s.nombreSala}</b></td><td>${s.anfitrion}</td><td>${s.jugadores}/${limiteMaximo}</td>
                <td><button class="btn-unirse-tabla" data-sala="${s.nombreSala}" data-codigo="${s.codigo}">${btnText}</button></td>
            </tr>`;
        });
    }
}

// ==========================================
// NUEVO: FUNCIONES DEL CREADOR DE TABLILLAS
// ==========================================
export function inicializarCreador(state, CARTAS_DICCIONARIO) {
    const gridCat = document.getElementById('creadorCatalogoGrid');
    gridCat.innerHTML = '';
    
    // Iteramos por las 54 cartas para inyectarlas en el panel derecho
    for (let i = 1; i <= 54; i++) {
        const strNum = i.toString();
        const info = CARTAS_DICCIONARIO[strNum];
        if (info) {
            gridCat.innerHTML += `
                <div class="carta-catalogo" data-numero="${strNum}" draggable="true">
                    <img src="${info.img}" draggable="false" title="${info.nombre}">
                    <!-- NUEVO: Nombre de la carta -->
                    <div class="nombre-carta-catalogo" title="${info.nombre}">${info.nombre}</div>
                </div>
            `;
        }
    }
    actualizarCreadorUI(state, CARTAS_DICCIONARIO);
}

export function actualizarCreadorUI(state, CARTAS_DICCIONARIO) {
    // 1. DIBUJAR LA CUADRÍCULA (16 Espacios)
    const gridTab = document.getElementById('creadorTablillaGrid');
    gridTab.innerHTML = '';
    let llenas = 0;

    for (let i = 0; i < 16; i++) {
        const num = state.creadorCartas[i];
        let content = '';
        if (num !== null && CARTAS_DICCIONARIO[num]) {
            content = `<img src="${CARTAS_DICCIONARIO[num].img}" draggable="false">`;
            llenas++;
        }
        gridTab.innerHTML += `<div class="creador-slot" data-index="${i}">
            ${content}
        </div>`;
    }

    // 2. ACTUALIZAR CONTADOR Y BOTÓN GUARDAR
    document.getElementById('creadorContador').textContent = `${llenas}/16`;
    document.getElementById('btnGuardarCreador').disabled = (llenas !== 16);

    // 3. PINTAR BORDES VERDES EN EL CATÁLOGO (Si la carta está seleccionada)
    document.querySelectorAll('.carta-catalogo').forEach(el => {
        const strNum = el.dataset.numero;
        if (state.creadorCartas.includes(strNum)) {
            el.classList.add('en-tablilla');
        } else {
            el.classList.remove('en-tablilla');
        }
    });
}