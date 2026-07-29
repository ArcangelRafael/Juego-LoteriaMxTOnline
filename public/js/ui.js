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

// NUEVA FUNCIÓN PARA EL MODAL DE EXPULSIÓN
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
    document.getElementById('contadorJugadores').textContent = `${listas.jugadores.length}/8`;
    document.getElementById('contadorEspectadores').textContent = `${listas.espectadores.length}/4`;

    ulJ.innerHTML = '';
    listas.jugadores.forEach(j => {
        let img = j.foto ? `<img src="${j.foto}" class="foto-perfil">` : '';
        // AÑADIDO: Guardar el nombre en data-nombre
        let btnKick = (state.soyAnfitrion && j.id !== state.socketId) ? `<button class="btn-kick" data-id="${j.id}" data-nombre="${j.nombre}">Expulsar</button>` : '';
        let esperando = (!j.enLobby && !j.isBot) ? '<span class="estado-esperando">(esperando)</span>' : '';
        ulJ.innerHTML += `<li><span>${img}${j.nombre}${esperando} ${j.listo ? '<span class="listo-true"> (¡Listo!)</span>' : ''}</span> ${btnKick}</li>`;
    });
    ulE.innerHTML = '';
    listas.espectadores.forEach(e => {
        let img = e.foto ? `<img src="${e.foto}" class="foto-perfil">` : '';
        // AÑADIDO: Guardar el nombre en data-nombre
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
    
    const header = document.querySelector('.header-sala');
    const cajasListas = document.getElementById('cajasListas');
    const panelConfig = document.getElementById('panelConfiguracion');
    
    if(header) header.classList.add('oculto-juego');
    if(cajasListas) cajasListas.classList.add('oculto-juego');
    if(panelConfig) panelConfig.classList.add('oculto-juego');

    // Activar la Mesa Circular
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
        
        // Verificar si existen cartas perdidas en el arreglo "perdidas"
        if (jugador.perdidas && jugador.perdidas.length > 0) {
            // Mapeamos el arreglo ['Carta 42', 'Carta 34'] para sacar los nombres reales
            let listaBullets = jugador.perdidas.map(carta => {
                let num = carta.split(' ')[1]; // Extrae el número después del espacio
                let nombreReal = CARTAS_LOTERIA[num] ? CARTAS_LOTERIA[num].nombre : carta;
                return `<li>${nombreReal}</li>`;
            }).join(''); // Los unimos todos

            detallesCartas = `
                <div class="analisis-scroll">
                    <p style="margin: 0 0 8px 0; color: #f87171; font-weight: 600;">Se le fueron tarjetas: Sí</p>
                    <ul>
                        ${listaBullets}
                    </ul>
                </div>
            `;
        }

        let imgH = jugador.foto ? `<img src="${jugador.foto}" class="foto-ranking">` : '';
        
        ul.innerHTML += `
            <li>
                <div style="display:flex; align-items:center; width:100%;">
                    <b style="width:100px;">Lugar #${i + 1}:</b> 
                    ${imgH} <span style="flex:1;">${jugador.nombre}</span> 
                    <i>(${jugador.marcas} marcas)</i>
                </div>
                <details style="width:100%; box-sizing:border-box;">
                    <summary>Análisis</summary>
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
            let btnDisabled = s.jugadores >= 8 ? 'disabled' : '';
            let btnText = s.jugadores >= 8 ? 'Llena' : 'Unirse';
            tbody.innerHTML += `<tr>
                <td><b>${s.nombreSala}</b></td><td>${s.anfitrion}</td><td>${s.jugadores}/8</td>
                <td><button class="btn-unirse-tabla" ${btnDisabled} data-sala="${s.nombreSala}" data-codigo="${s.codigo}">${btnText}</button></td>
            </tr>`;
        });
    }
}