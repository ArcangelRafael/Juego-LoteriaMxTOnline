// public/js/events.js
import state from './state.js';
import * as ui from './ui.js';
import { guardarSnapshot, restaurarSnapshot } from './physics.js';

export function setupUIEvents(socket) {
    
    function bloquearZoomMovil() {
        let meta = document.getElementById('anti-zoom-meta');
        if (!meta) {
            meta = document.createElement('meta');
            meta.id = 'anti-zoom-meta';
            meta.name = 'viewport';
            meta.content = 'width=980, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(meta);
        }
    }

    function liberarZoomMovil() {
        const meta = document.getElementById('anti-zoom-meta');
        if (meta) meta.remove(); 
    }

    let currentLobbyAction = '';
    let isPreviewing = false; 

    function setLobbyAction(action) {
        const modal = document.getElementById('modalCreador');
        const isModalOpen = modal && modal.style.display === 'flex';

        if (isModalOpen && action !== 'Creando su propia tablilla') return; 
        
        // FIX MAESTRO: Si estamos ensayando, bloquear cualquier otra cosa
        if (isPreviewing && action !== 'En modo previsualización') return;
        
        if (currentLobbyAction !== action) {
            currentLobbyAction = action;
            if (state.miSalaActual && !state.juegoEnCurso) {
                socket.emit('actualizar_estado_lobby', { nombreSala: state.miSalaActual, estado: action });
            }
        }
    }

    document.getElementById('btnPrevisualizar')?.addEventListener('click', () => {
        guardarSnapshot();
        isPreviewing = true;
        setLobbyAction('En modo previsualización');
        document.dispatchEvent(new Event('iniciar_preview'));
    });
    
    document.getElementById('btnCancelarPreview')?.addEventListener('click', () => {
        restaurarSnapshot();
        isPreviewing = false;
        setLobbyAction('');
        document.dispatchEvent(new Event('cerrar_preview'));
    });
    
    document.getElementById('btnGuardarPreview')?.addEventListener('click', () => {
        isPreviewing = false;
        setLobbyAction('');
        document.dispatchEvent(new Event('cerrar_preview'));
    });

    const inputNombre = document.getElementById('nombreTiempoReal');
    if (inputNombre) {
        inputNombre.addEventListener('focus', () => setLobbyAction('Escribiendo nombre...'));
        inputNombre.addEventListener('blur', () => setLobbyAction(''));
    }

    const selectFicha = document.getElementById('selectFicha');
    if (selectFicha) {
        selectFicha.addEventListener('focus', () => setLobbyAction('Seleccionando ficha...'));
        selectFicha.addEventListener('blur', () => setLobbyAction(''));
        selectFicha.addEventListener('mouseenter', () => setLobbyAction('Seleccionando ficha...'));
        selectFicha.addEventListener('mouseleave', () => { if(document.activeElement !== selectFicha) setLobbyAction(''); });
    }

    const btnFoto = document.querySelector('.btn-subir-foto');
    if (btnFoto) {
        btnFoto.addEventListener('click', () => setLobbyAction('Buscando foto...'));
    }
    window.addEventListener('focus', () => {
        if (currentLobbyAction === 'Buscando foto...') setLobbyAction('');
    });

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('focus', () => setLobbyAction('En el chat...'));
        chatInput.addEventListener('blur', () => setLobbyAction(''));
    }

    const contTablillas = document.getElementById('contenedorTablillas');
    if (contTablillas) {
        contTablillas.addEventListener('mouseover', (e) => {
            if (e.target.closest('.tablilla')) setLobbyAction('Seleccionando tablilla...');
        });
        contTablillas.addEventListener('mouseout', (e) => {
            const tab = e.target.closest('.tablilla');
            if (tab && !tab.contains(e.relatedTarget)) {
                setLobbyAction('');
            }
        });
    }

    const btnAbrirCreador = document.getElementById('btnAbrirCreador');
    if (btnAbrirCreador) {
        btnAbrirCreador.addEventListener('pointerdown', () => {
            setTimeout(() => setLobbyAction('Creando su propia tablilla'), 50);
        });
    }

    const btnCerrarCreador = document.getElementById('btnCerrarCreador');
    if (btnCerrarCreador) {
        btnCerrarCreador.addEventListener('pointerdown', () => {
            setTimeout(() => setLobbyAction(''), 50);
        });
    }

    const btnGuardarCreador = document.getElementById('btnGuardarCreador');
    if (btnGuardarCreador) {
        btnGuardarCreador.addEventListener('pointerdown', () => {
            setTimeout(() => setLobbyAction(''), 50);
        });
    }

    const modalCreador = document.getElementById('modalCreador');
    if (modalCreador) {
        modalCreador.addEventListener('pointerdown', (e) => {
            if (e.target === modalCreador) {
                modalCreador.style.display = 'none'; 
                setTimeout(() => setLobbyAction(''), 50);
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-unirse-tabla')) {
            const target = e.target.closest('.btn-unirse-tabla');
            const sala = target.getAttribute('data-sala');
            const codigo = target.getAttribute('data-codigo');
            state.miSalaActual = sala;
            sessionStorage.setItem('loteria_sala_actual', sala); 
            socket.emit('unirse_sala', { nombreSala: sala, codigoSala: codigo, rolElegido: 'jugador', sessionId: state.sessionId });
        }
        if (e.target.closest('.btn-kick')) {
            const target = e.target.closest('.btn-kick');
            const id = target.getAttribute('data-id');
            const nombre = target.getAttribute('data-nombre');
            ui.mostrarModalExpulsion(nombre, () => {
                socket.emit('expulsar_jugador', { nombreSala: state.miSalaActual, idJugador: id });
            });
        }
    });

    document.getElementById('btnMenuAnfitrion').addEventListener('click', () => { document.getElementById('formAnfitrion').style.display = 'block'; document.getElementById('formUnirse').style.display = 'none'; });
    document.getElementById('btnMenuUnirse').addEventListener('click', () => { document.getElementById('formUnirse').style.display = 'block'; document.getElementById('formAnfitrion').style.display = 'none'; });

    document.getElementById('btnCrearSala').addEventListener('click', () => { 
        const n = document.getElementById('crearNombreSala').value; 
        const esPub = !document.getElementById('checkSalaPrivada').checked;
        if(n) { 
            state.miSalaActual = n; 
            sessionStorage.setItem('loteria_sala_actual', n); 
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
            sessionStorage.setItem('loteria_sala_actual', n); 
            socket.emit('unirse_sala', { nombreSala: n, codigoSala: c, rolElegido: r, sessionId: state.sessionId }); 
        }
    });

    document.getElementById('btnPartidaRapida').addEventListener('click', () => { socket.emit('partida_rapida'); });

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

    document.getElementById('btnAbandonarLobby').addEventListener('click', () => {
        socket.emit('salir_sala');
    });

    document.getElementById('btnDestruirLobby').addEventListener('click', () => {
        ui.mostrarModalDestruirLobby(() => {
            socket.emit('destruir_sala', state.miSalaActual);
        });
    });

    const btnSalirEsp = document.getElementById('btnSalirEspectador');
    if (btnSalirEsp) {
        btnSalirEsp.addEventListener('click', () => {
            socket.emit('salir_sala');
        });
    }

    document.getElementById('btnTorneoEspectar')?.addEventListener('click', () => {
        document.getElementById('modalEliminadoTorneo').style.display = 'none';
    });

    document.getElementById('btnTorneoSalir')?.addEventListener('click', () => {
        document.getElementById('modalEliminadoTorneo').style.display = 'none';
        socket.emit('salir_sala');
    });

    document.getElementById('btnAbrirChatMovil').addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const cont = document.getElementById('chatIngameContenedor'); 
        const input = document.getElementById('chatIngameInput');
        
        if (cont.style.display === 'none') {
            const miFoto = state.estadoJugadores[socket.id]?.foto; 
            const imgEl = document.getElementById('chatIngameFoto');
            imgEl.src = miFoto || ''; 
            imgEl.style.display = miFoto ? 'block' : 'none';
            cont.style.display = 'flex'; 
            
            bloquearZoomMovil();
            input.focus();       
            
        } else {
            cont.style.display = 'none';
            liberarZoomMovil();
        }
    });

    document.getElementById('chatIngameInput').addEventListener('blur', () => {
        liberarZoomMovil(); 
    });
    
    document.getElementById('btnEnviarChatIngame').addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const input = document.getElementById('chatIngameInput'); 
        const cont = document.getElementById('chatIngameContenedor');
        
        if (input.value.trim() !== '') { 
            socket.emit('enviar_mensaje', { nombreSala: state.miSalaActual, mensaje: input.value }); 
            input.value = ''; 
        }
        cont.style.display = 'none';
        liberarZoomMovil(); 
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && state.juegoEnCurso && state.miRol === 'jugador') {
            const cont = document.getElementById('chatIngameContenedor'); 
            const input = document.getElementById('chatIngameInput');
            
            if (cont.style.display === 'none') {
                const miFoto = state.estadoJugadores[socket.id]?.foto; 
                const imgEl = document.getElementById('chatIngameFoto');
                imgEl.src = miFoto || ''; imgEl.style.display = miFoto ? 'block' : 'none';
                cont.style.display = 'flex'; 
                
                bloquearZoomMovil();
                input.focus();
                
            } else {
                if (input.value.trim() !== '') { 
                    socket.emit('enviar_mensaje', { nombreSala: state.miSalaActual, mensaje: input.value }); 
                    input.value = ''; 
                }
                cont.style.display = 'none';
                input.blur();
                liberarZoomMovil();
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
        
        const mT = document.getElementById('checkModoTorneo')?.checked || false;
        
        state.configSala = { velocidadGriton: vG, tiempoMarcar: tM, ayudaNinos: aN, sinEspectadores: sE, maxJugadores: maxJ, modoTorneo: mT };
        socket.emit('cambiar_config', { nombreSala: state.miSalaActual, config: state.configSala });
    };

    document.querySelectorAll('input[name="velGriton"]').forEach(r => r.addEventListener('change', enviarConfiguracion));
    document.getElementById('checkAyudaNinos').addEventListener('change', enviarConfiguracion);
    document.getElementById('checkSinEspectadores').addEventListener('change', enviarConfiguracion);
    document.getElementById('selectMaxJugadores').addEventListener('change', enviarConfiguracion); 
    document.getElementById('checkModoTorneo')?.addEventListener('change', enviarConfiguracion); 

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