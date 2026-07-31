// public/js/events.js
import state from './state.js';
import * as ui from './ui.js';

export function setupUIEvents(socket) {
    document.getElementById('btnMenuAnfitrion').addEventListener('click', () => { document.getElementById('formAnfitrion').style.display = 'block'; document.getElementById('formUnirse').style.display = 'none'; });
    document.getElementById('btnMenuUnirse').addEventListener('click', () => { document.getElementById('formUnirse').style.display = 'block'; document.getElementById('formAnfitrion').style.display = 'none'; });

    document.getElementById('btnCrearSala').addEventListener('click', () => { 
        const n = document.getElementById('crearNombreSala').value; 
        const esPub = !document.getElementById('checkSalaPrivada').checked;
        if(n) { 
            state.miSalaActual = n; 
            sessionStorage.setItem('loteria_sala_actual', n); // Guardar sala
            socket.emit('crear_sala', { nombreSala: n, esPublica: esPub, sessionId: state.sessionId }); 
        }
    });

    document.getElementById('btnCopiarSala')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnCopiarSala'); 
        const titulo = document.getElementById('tituloSala').innerText;
        const codigo = document.getElementById('codigoSalaTexto').innerText;
        
        if (!titulo || !codigo) return; 

        try {
            const textoACopiar = `${titulo}\n${codigo}`;
            await navigator.clipboard.writeText(textoACopiar);
            const iconoOriginal = btn.innerHTML;
            btn.innerHTML = '✅';
            setTimeout(() => { btn.innerHTML = iconoOriginal; }, 2000); 
        } catch (err) {
            console.error('No se pudo copiar al portapapeles:', err);
        }
    });

    document.getElementById('btnUnirseSala').addEventListener('click', () => {
        const n = document.getElementById('unirNombreSala').value; 
        const c = document.getElementById('unirCodigoSala').value.toUpperCase(); 
        const r = document.querySelector('input[name="rolIngreso"]:checked').value;
        if(n && c) { 
            state.miSalaActual = n; 
            sessionStorage.setItem('loteria_sala_actual', n); // Guardar sala
            socket.emit('unirse_sala', { nombreSala: n, codigoSala: c, rolElegido: r, sessionId: state.sessionId }); 
        }
    });

    document.getElementById('btnPartidaRapida').addEventListener('click', () => { socket.emit('partida_rapida'); });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-unirse-tabla')) {
            const sala = e.target.getAttribute('data-sala');
            const codigo = e.target.getAttribute('data-codigo');
            state.miSalaActual = sala;
            sessionStorage.setItem('loteria_sala_actual', sala); // Guardar sala
            socket.emit('unirse_sala', { nombreSala: sala, codigoSala: codigo, rolElegido: 'jugador', sessionId: state.sessionId });
        }
        if (e.target.classList.contains('btn-kick')) {
            const id = e.target.getAttribute('data-id');
            const nombre = e.target.getAttribute('data-nombre');
            ui.mostrarModalExpulsion(nombre, () => {
                socket.emit('expulsar_jugador', { nombreSala: state.miSalaActual, idJugador: id });
            });
        }
    });

    document.getElementById('inputFoto').addEventListener('change', (e) => {
        const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
        reader.onload = (event) => { socket.emit('subir_foto', { nombreSala: state.miSalaActual, fotoBase64: event.target.result }); }; reader.readAsDataURL(file);
    });

    document.getElementById('nombreTiempoReal').addEventListener('input', (e) => socket.emit('escribiendo_nombre', { nombreSala: state.miSalaActual, nuevoNombre: e.target.value }));

    state.miFicha = 'palomita'; 
    document.getElementById('selectFicha').addEventListener('change', (e) => { state.miFicha = e.target.value; });

    document.getElementById('btnCambiarRol').addEventListener('click', () => socket.emit('cambiar_rol', { nombreSala: state.miSalaActual, nuevoRol: state.miRol === 'jugador' ? 'espectador' : 'jugador' }));
    document.getElementById('btnBloquear').addEventListener('pointerdown', (e) => { e.stopPropagation(); socket.emit('bloquear_tablilla', state.miSalaActual); });
    document.getElementById('btnDesbloquear').addEventListener('pointerdown', (e) => { e.stopPropagation(); socket.emit('desbloquear_tablilla', state.miSalaActual); });
    document.getElementById('btnAgregarBot').addEventListener('click', () => {
        const nBot = document.getElementById('nombreBotInput').value;
        socket.emit('agregar_bot', { nombreSala: state.miSalaActual, nombreBot: nBot });
        document.getElementById('nombreBotInput').value = "";
    });

    document.getElementById('btnAbrirChatMovil').addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const cont = document.getElementById('chatIngameContenedor'); const input = document.getElementById('chatIngameInput');
        if (cont.style.display === 'none') {
            const miFoto = state.estadoJugadores[socket.id]?.foto; const imgEl = document.getElementById('chatIngameFoto');
            imgEl.src = miFoto || ''; imgEl.style.display = miFoto ? 'block' : 'none';
            cont.style.display = 'flex'; input.focus(); 
        } else cont.style.display = 'none';
    });
    
    document.getElementById('btnEnviarChatIngame').addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const input = document.getElementById('chatIngameInput'); const cont = document.getElementById('chatIngameContenedor');
        if (input.value.trim() !== '') { socket.emit('enviar_mensaje', { nombreSala: state.miSalaActual, mensaje: input.value }); input.value = ''; }
        cont.style.display = 'none';
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && state.juegoEnCurso && state.miRol === 'jugador') {
            const cont = document.getElementById('chatIngameContenedor'); const input = document.getElementById('chatIngameInput');
            if (cont.style.display === 'none') {
                const miFoto = state.estadoJugadores[socket.id]?.foto; const imgEl = document.getElementById('chatIngameFoto');
                imgEl.src = miFoto || ''; imgEl.style.display = miFoto ? 'block' : 'none';
                cont.style.display = 'flex'; input.focus();
            } else {
                if (input.value.trim() !== '') { socket.emit('enviar_mensaje', { nombreSala: state.miSalaActual, mensaje: input.value }); input.value = ''; }
                cont.style.display = 'none';
            }
        }
    });

    const enviarMsjChat = () => {
        const input = document.getElementById('chatInput');
        if(input.value.trim() !== "") { socket.emit('enviar_mensaje', { nombreSala: state.miSalaActual, mensaje: input.value }); input.value = ""; }
    };
    document.getElementById('btnEnviarChat').addEventListener('click', enviarMsjChat);
    document.getElementById('chatInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') enviarMsjChat(); });

    const enviarConfiguracion = () => {
        if(!state.soyAnfitrion) return;
        const val = document.querySelector('input[name="velGriton"]:checked').value;
        let vG = 3000, tM = 5000;
        if(val === '5') { vG = 5000; tM = 6000; } else if(val === '2') { vG = 2000; tM = 4000; }
        const aN = document.getElementById('checkAyudaNinos').checked; 
        const sE = document.getElementById('checkSinEspectadores').checked;
        const maxJ = parseInt(document.getElementById('selectMaxJugadores').value);
        
        state.configSala = { velocidadGriton: vG, tiempoMarcar: tM, ayudaNinos: aN, sinEspectadores: sE, maxJugadores: maxJ };
        socket.emit('cambiar_config', { nombreSala: state.miSalaActual, config: state.configSala });
    };

    document.querySelectorAll('input[name="velGriton"]').forEach(r => r.addEventListener('change', enviarConfiguracion));
    document.getElementById('checkAyudaNinos').addEventListener('change', enviarConfiguracion);
    document.getElementById('checkSinEspectadores').addEventListener('change', enviarConfiguracion);
    document.getElementById('selectMaxJugadores').addEventListener('change', enviarConfiguracion); 

    document.getElementById('btnIniciar').addEventListener('click', () => socket.emit('solicitar_iniciar_juego', state.miSalaActual));
    document.getElementById('btnLoteria').addEventListener('click', () => { document.getElementById('btnLoteria').disabled = true; socket.emit('cantar_loteria', state.miSalaActual); });
    document.getElementById('btnVolverLobby').addEventListener('click', () => socket.emit('volver_lobby', state.miSalaActual));
    document.getElementById('btnFinalizarPartida').addEventListener('click', () => socket.emit('salir_sala'));

    document.getElementById('btnIniciarForzadoAFK').addEventListener('click', () => { document.getElementById('modalAFK').style.display = 'none'; socket.emit('iniciar_juego_confirmado', state.miSalaActual); });
    document.getElementById('btnCancelarAFK').addEventListener('click', () => { document.getElementById('modalAFK').style.display = 'none'; });
    document.getElementById('btnVotoSi').addEventListener('click', () => { document.getElementById('botonesVotacion').style.display = 'none'; document.getElementById('mensajeEsperaVotacion').style.display = 'block'; socket.emit('votar_continuar', { nombreSala: state.miSalaActual, voto: true }); });
    document.getElementById('btnVotoNo').addEventListener('click', () => { document.getElementById('botonesVotacion').style.display = 'none'; document.getElementById('mensajeEsperaVotacion').style.display = 'block'; socket.emit('votar_continuar', { nombreSala: state.miSalaActual, voto: false }); });
    document.getElementById('btnVotoRevolver').addEventListener('click', () => { document.getElementById('botonesSinCartas').style.display = 'none'; document.getElementById('msgEsperaRevolver').style.display = 'block'; socket.emit('votar_revolver', state.miSalaActual); });
}