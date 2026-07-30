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
// 1. EVENTOS DEL DOM
// ==========================================

document.getElementById('btnMenuAnfitrion').addEventListener('click', () => { document.getElementById('formAnfitrion').style.display = 'block'; document.getElementById('formUnirse').style.display = 'none'; });
document.getElementById('btnMenuUnirse').addEventListener('click', () => { document.getElementById('formUnirse').style.display = 'block'; document.getElementById('formAnfitrion').style.display = 'none'; });

document.getElementById('btnCrearSala').addEventListener('click', () => { 
    const n = document.getElementById('crearNombreSala').value; 
    const esPub = !document.getElementById('checkSalaPrivada').checked;
    if(n) { state.miSalaActual = n; socket.emit('crear_sala', { nombreSala: n, esPublica: esPub }); }
});

// NUEVO: Copiar datos de la sala al portapapeles (Corregido)
document.getElementById('btnCopiarSala')?.addEventListener('click', async (e) => {
    e.preventDefault();
    // Lo obtenemos directamente por su ID para evitar el error de "null"
    const btn = document.getElementById('btnCopiarSala'); 
    const titulo = document.getElementById('tituloSala').innerText;
    const codigo = document.getElementById('codigoSalaTexto').innerText;
    
    if (!titulo || !codigo) return; 

    try {
        const textoACopiar = `${titulo}\n${codigo}`;
        await navigator.clipboard.writeText(textoACopiar);
        
        const iconoOriginal = btn.innerHTML;
        btn.innerHTML = '✅';
        
        setTimeout(() => { 
            btn.innerHTML = iconoOriginal; 
        }, 2000); 
    } catch (err) {
        console.error('No se pudo copiar al portapapeles:', err);
    }
});

document.getElementById('btnUnirseSala').addEventListener('click', () => {
    const n = document.getElementById('unirNombreSala').value; 
    const c = document.getElementById('unirCodigoSala').value.toUpperCase(); 
    const r = document.querySelector('input[name="rolIngreso"]:checked').value;
    if(n && c) { state.miSalaActual = n; socket.emit('unirse_sala', { nombreSala: n, codigoSala: c, rolElegido: r }); }
});

document.getElementById('btnPartidaRapida').addEventListener('click', () => { socket.emit('partida_rapida'); });

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

// Panel arrastrable y minimizar
document.getElementById('btnMinimizarPanel').addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    const panel = document.getElementById('panelEspectadorUI');
    const contenido = document.getElementById('contenidoPanelEspectador');
    const btn = e.target;
    if (panel.classList.contains('minimizado')) { panel.classList.remove('minimizado'); contenido.style.display = 'block'; btn.textContent = '-'; } 
    else { panel.classList.add('minimizado'); contenido.style.display = 'none'; btn.textContent = '+'; }
});

// ==========================================
// RECUPERADO: Hacer el panel "Mostrar juego de:" arrastrable y LIMITADO
// ==========================================
const panelEspectador = document.getElementById('panelEspectadorUI');
let isDraggingPanel = false;
let dragStartPanelX, dragStartPanelY;

panelEspectador.style.cursor = 'grab';

panelEspectador.addEventListener('pointerdown', (e) => {
    // Evita arrastrar si se toca un botón, checkbox o las herramientas de la tablilla
    if (e.target.closest('button') || e.target.closest('#listaChecksJugadores') || e.target.classList.contains('resizer-handle') || e.target.classList.contains('arrastrable-header')) {
        return; 
    }

    isDraggingPanel = true;
    dragStartPanelX = e.clientX;
    dragStartPanelY = e.clientY;

    const rect = panelEspectador.getBoundingClientRect();
    
    // ¡EL TRUCO PARA QUE NO SALTE! Lo anclamos a la cámara (fixed)
    panelEspectador.style.position = 'fixed';
    panelEspectador.style.left = rect.left + 'px';
    panelEspectador.style.top = rect.top + 'px';
    panelEspectador.style.right = 'auto';
    panelEspectador.style.bottom = 'auto';
    panelEspectador.style.transform = 'none';
    panelEspectador.style.margin = '0';
    panelEspectador.style.zIndex = '9999'; // Asegurar que flote sobre todo lo demás
    
    panelEspectador.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none'; 
});

document.addEventListener('pointermove', (e) => {
    if (!isDraggingPanel) return;
    e.preventDefault();

    const deltaX = e.clientX - dragStartPanelX;
    const deltaY = e.clientY - dragStartPanelY;

    const rect = panelEspectador.getBoundingClientRect();
    
    let newLeft = rect.left + deltaX;
    let newTop = rect.top + deltaY;

    // MATEMÁTICAS DE BORDES: Evitamos que se salga de la pantalla
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    // Math.max evita que sea menor a 0, Math.min evita que sobrepase el límite máximo
    newLeft = Math.max(0, Math.min(newLeft, maxX));
    newTop = Math.max(0, Math.min(newTop, maxY));

    panelEspectador.style.left = newLeft + 'px';
    panelEspectador.style.top = newTop + 'px';

    dragStartPanelX = e.clientX;
    dragStartPanelY = e.clientY;
});

document.addEventListener('pointerup', () => {
    if (isDraggingPanel) {
        isDraggingPanel = false;
        panelEspectador.style.cursor = 'grab';
        document.body.style.userSelect = 'auto';
    }
});

// ==========================================
// NUEVO: Lógica para redimensionar y MOVER la Tablilla + EL GRITÓN
// ==========================================
let isResizingTablilla = false;
let startYResizer = 0; let startXResizer = 0;
let startScaleY = 1; let startScaleX = 1;

let isDraggingMiTablilla = false;
let dragTabStartX = 0; let dragTabStartY = 0;
let currentOffsetX = 0; let currentOffsetY = 0;

// Físicas del Gritón
let isDraggingGriton = false;
let dragGritonStartX = 0; let dragGritonStartY = 0;
let currentGritonOffsetX = 0; let currentGritonOffsetY = 0;

const contenedorTabs = document.getElementById('contenedorTablillas');

document.addEventListener('pointerdown', (e) => {
    // 1. Si toca la barra azul de la Tablilla (Resizer)
    if (e.target.classList.contains('resizer-handle')) {
        e.preventDefault(); 
        e.stopPropagation();
        isResizingTablilla = true;
        startXResizer = e.clientX;
        startYResizer = e.clientY;
        
        startScaleX = parseFloat(contenedorTabs.style.getPropertyValue('--escala-x')) || (window.innerWidth <= 768 ? 1.18 : 1.35);
        startScaleY = parseFloat(contenedorTabs.style.getPropertyValue('--escala-y')) || (window.innerWidth <= 768 ? 1.18 : 1.35);
        document.body.style.cursor = 'move';
    }
    // 2. Si toca el título de la tablilla (Mover Tablilla)
    else if (e.target.classList.contains('arrastrable-header')) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingMiTablilla = true;
        dragTabStartX = e.clientX;
        dragTabStartY = e.clientY;
        
        currentOffsetX = parseFloat(contenedorTabs.style.getPropertyValue('--offset-x')) || 0;
        currentOffsetY = parseFloat(contenedorTabs.style.getPropertyValue('--offset-y')) || 0;
    }
    // 3. Si toca el texto del Gritón (Mover Gritón completo)
    else if (e.target.id === 'textoCartaGriton') {
        e.preventDefault();
        e.stopPropagation();
        isDraggingGriton = true;
        dragGritonStartX = e.clientX;
        dragGritonStartY = e.clientY;
        
        const zonaGriton = document.querySelector('.zona-griton');
        currentGritonOffsetX = parseFloat(zonaGriton.style.getPropertyValue('--griton-x')) || 0;
        currentGritonOffsetY = parseFloat(zonaGriton.style.getPropertyValue('--griton-y')) || 0;
    }
});

document.addEventListener('pointermove', (e) => {
    // Lógica para Escalar Tablilla
    if (isResizingTablilla) {
        e.preventDefault();
        const deltaX = e.clientX - startXResizer; 
        const deltaY = startYResizer - e.clientY; 
        
        const newScaleX = Math.max(0.6, Math.min(startScaleX + (deltaX * 0.005), 2.5));
        const newScaleY = Math.max(0.6, Math.min(startScaleY + (deltaY * 0.005), 2.5));
        
        contenedorTabs.style.setProperty('--escala-x', newScaleX);
        contenedorTabs.style.setProperty('--escala-y', newScaleY);
    }
    
    // Lógica para Mover Tablilla
    if (isDraggingMiTablilla) {
        e.preventDefault();
        const deltaX = e.clientX - dragTabStartX;
        const deltaY = e.clientY - dragTabStartY;
        
        contenedorTabs.style.setProperty('--offset-x', (currentOffsetX + deltaX) + 'px');
        contenedorTabs.style.setProperty('--offset-y', (currentOffsetY + deltaY) + 'px');
        
        dragTabStartX = e.clientX;
        dragTabStartY = e.clientY;
        currentOffsetX += deltaX;
        currentOffsetY += deltaY;
    }

    // Lógica para Mover el Gritón (Todo el conjunto)
    if (isDraggingGriton) {
        e.preventDefault();
        const deltaX = e.clientX - dragGritonStartX;
        const deltaY = e.clientY - dragGritonStartY;
        
        const zonaGriton = document.querySelector('.zona-griton');
        zonaGriton.style.setProperty('--griton-x', (currentGritonOffsetX + deltaX) + 'px');
        zonaGriton.style.setProperty('--griton-y', (currentGritonOffsetY + deltaY) + 'px');
        
        dragGritonStartX = e.clientX;
        dragGritonStartY = e.clientY;
        currentGritonOffsetX += deltaX;
        currentGritonOffsetY += deltaY;
    }
});

document.addEventListener('pointerup', () => {
    if (isResizingTablilla) {
        isResizingTablilla = false;
        document.body.style.cursor = 'auto';
    }
    if (isDraggingMiTablilla) isDraggingMiTablilla = false;
    if (isDraggingGriton) isDraggingGriton = false;
});

// Chat In-Game
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

// Config y Juego
// Config y Juego
const enviarConfiguracion = () => {
    if(!state.soyAnfitrion) return;
    const val = document.querySelector('input[name="velGriton"]:checked').value;
    let vG = 3000, tM = 5000;
    if(val === '5') { vG = 5000; tM = 6000; } else if(val === '2') { vG = 2000; tM = 4000; }
    const aN = document.getElementById('checkAyudaNinos').checked; 
    const sE = document.getElementById('checkSinEspectadores').checked;
    
    // NUEVO: Capturar el límite de jugadores
    const maxJ = parseInt(document.getElementById('selectMaxJugadores').value);
    
    state.configSala = { velocidadGriton: vG, tiempoMarcar: tM, ayudaNinos: aN, sinEspectadores: sE, maxJugadores: maxJ };
    socket.emit('cambiar_config', { nombreSala: state.miSalaActual, config: state.configSala });
};

document.querySelectorAll('input[name="velGriton"]').forEach(r => r.addEventListener('change', enviarConfiguracion));
document.getElementById('checkAyudaNinos').addEventListener('change', enviarConfiguracion);
document.getElementById('checkSinEspectadores').addEventListener('change', enviarConfiguracion);
document.getElementById('selectMaxJugadores').addEventListener('change', enviarConfiguracion); // NUEVO LISTENER
document.querySelectorAll('input[name="velGriton"]').forEach(r => r.addEventListener('change', enviarConfiguracion));
document.getElementById('checkAyudaNinos').addEventListener('change', enviarConfiguracion);
document.getElementById('checkSinEspectadores').addEventListener('change', enviarConfiguracion);

document.getElementById('btnIniciar').addEventListener('click', () => socket.emit('solicitar_iniciar_juego', state.miSalaActual));
document.getElementById('btnLoteria').addEventListener('click', () => { document.getElementById('btnLoteria').disabled = true; socket.emit('cantar_loteria', state.miSalaActual); });
document.getElementById('btnVolverLobby').addEventListener('click', () => socket.emit('volver_lobby', state.miSalaActual));
document.getElementById('btnFinalizarPartida').addEventListener('click', () => socket.emit('salir_sala'));

document.getElementById('btnIniciarForzadoAFK').addEventListener('click', () => { document.getElementById('modalAFK').style.display = 'none'; socket.emit('iniciar_juego_confirmado', state.miSalaActual); });
document.getElementById('btnCancelarAFK').addEventListener('click', () => { document.getElementById('modalAFK').style.display = 'none'; });
document.getElementById('btnVotoSi').addEventListener('click', () => { document.getElementById('botonesVotacion').style.display = 'none'; document.getElementById('mensajeEsperaVotacion').style.display = 'block'; socket.emit('votar_continuar', { nombreSala: state.miSalaActual, voto: true }); });
document.getElementById('btnVotoNo').addEventListener('click', () => { document.getElementById('botonesVotacion').style.display = 'none'; document.getElementById('mensajeEsperaVotacion').style.display = 'block'; socket.emit('votar_continuar', { nombreSala: state.miSalaActual, voto: false }); });
document.getElementById('btnVotoRevolver').addEventListener('click', () => { document.getElementById('botonesSinCartas').style.display = 'none'; document.getElementById('msgEsperaRevolver').style.display = 'block'; socket.emit('votar_revolver', state.miSalaActual); });


// ==========================================
// NUEVO: SISTEMA DEL CREADOR DE TABLILLAS
// ==========================================

// Apertura y Cierre
document.getElementById('btnAbrirCreador').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    state.creadorCartas.fill(null); // Empezamos en limpio
    document.getElementById('modalCreador').style.display = 'flex';
    ui.inicializarCreador(state, CARTAS_LOTERIA);
});

document.getElementById('btnCerrarCreador').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    document.getElementById('modalCreador').style.display = 'none';
});

// Vaciado y Guardado
document.getElementById('btnReiniciarCreador').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    state.creadorCartas.fill(null);
    ui.actualizarCreadorUI(state, CARTAS_LOTERIA);
});

document.getElementById('btnGuardarCreador').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state.creadorCartas.includes(null)) return; // Prevención si no está llena
    
    const cartasMapeadas = state.creadorCartas.map(num => `Carta ${num}`);
    socket.emit('guardar_tablilla_custom', { 
        nombreSala: state.miSalaActual, 
        cartas: cartasMapeadas 
    });
    
    document.getElementById('modalCreador').style.display = 'none';
});

// NUEVO: Helper para animación de vuelo (FLIP)
function volarCarta(origenRect, destinoRect, imgSrc) {
    const ghost = document.createElement('img');
    ghost.src = imgSrc;
    ghost.className = 'ghost-carta-vuelo';
    
    // 1. Estado inicial (Donde dimos clic)
    ghost.style.left = origenRect.left + 'px';
    ghost.style.top = origenRect.top + 'px';
    ghost.style.width = origenRect.width + 'px';
    ghost.style.height = origenRect.height + 'px';
    document.body.appendChild(ghost);

    // 2. Forzar al navegador a registrar el estado inicial (Reflow)
    void ghost.offsetWidth;

    // 3. Estado final (A donde va la carta)
    ghost.style.left = destinoRect.left + 'px';
    ghost.style.top = destinoRect.top + 'px';
    ghost.style.width = destinoRect.width + 'px';
    ghost.style.height = destinoRect.height + 'px';
    ghost.style.opacity = '0.4';
    ghost.style.transform = 'scale(1.05)';

    // 4. Autodestruir el clon al terminar la transición
    setTimeout(() => {
        if (ghost.parentNode) ghost.remove();
    }, 350); // Mismo tiempo que el transition de CSS
}

// LÓGICA DE TAP (Híbrido Celulares y PC) CON ANIMACIÓN
document.addEventListener('pointerdown', (e) => {
    // Si toca una carta del catálogo...
    const cartaCat = e.target.closest('.carta-catalogo');
    if (cartaCat) {
        const num = cartaCat.dataset.numero.toString();
        const index = state.creadorCartas.indexOf(num);
        const infoCarta = CARTAS_LOTERIA[num];
        const origenRect = cartaCat.getBoundingClientRect();
        
        if (index !== -1) {
            // Eliminar: Volar de Tablilla -> Catálogo
            const slotDOM = document.querySelector(`.creador-slot[data-index="${index}"]`);
            if(slotDOM && infoCarta) volarCarta(slotDOM.getBoundingClientRect(), origenRect, infoCarta.img);
            
            state.creadorCartas[index] = null;
        } else {
            // Agregar: Volar de Catálogo -> Tablilla
            const hueco = state.creadorCartas.indexOf(null);
            if (hueco !== -1) {
                const slotDOM = document.querySelector(`.creador-slot[data-index="${hueco}"]`);
                if(slotDOM && infoCarta) volarCarta(origenRect, slotDOM.getBoundingClientRect(), infoCarta.img);
                
                state.creadorCartas[hueco] = num;
            }
        }
        ui.actualizarCreadorUI(state, CARTAS_LOTERIA);
        return;
    }

    // Si toca directamente un espacio ocupado de su tablilla
    const slot = e.target.closest('.creador-slot');
    if (slot) {
        const slotIdx = slot.dataset.index;
        const num = state.creadorCartas[slotIdx];
        if (num !== null) {
            const infoCarta = CARTAS_LOTERIA[num];
            const origenRect = slot.getBoundingClientRect();
            const cartaCatDOM = document.querySelector(`.carta-catalogo[data-numero="${num}"]`);
            
            // Volar de Tablilla -> Catálogo
            if (cartaCatDOM && infoCarta) volarCarta(origenRect, cartaCatDOM.getBoundingClientRect(), infoCarta.img);
            
            state.creadorCartas[slotIdx] = null; 
            ui.actualizarCreadorUI(state, CARTAS_LOTERIA);
        }
    }
});

// LÓGICA DE DRAG & DROP (Nativo para PC)
document.addEventListener('dragstart', (e) => {
    if (e.target.closest('.carta-catalogo')) {
        e.dataTransfer.setData('text/plain', e.target.closest('.carta-catalogo').dataset.numero);
    } else if (e.target.closest('.creador-slot')) {
        const slot = e.target.closest('.creador-slot');
        if (state.creadorCartas[slot.dataset.index] !== null) {
            e.dataTransfer.setData('text/plain', state.creadorCartas[slot.dataset.index]);
            e.dataTransfer.setData('source-index', slot.dataset.index); // Saber de dónde venía
        }
    }
});

document.addEventListener('dragover', (e) => {
    if (e.target.closest('.creador-slot') || e.target.closest('.creador-catalogo-area')) {
        e.preventDefault(); // Indispensable para permitir el "drop"
    }
});

document.addEventListener('drop', (e) => {
    const num = e.dataTransfer.getData('text/plain');
    if (!num) return;

    // Si soltó encima de un slot de la tablilla
    const slot = e.target.closest('.creador-slot');
    if (slot) {
        e.preventDefault();
        const targetIndex = slot.dataset.index;
        
        // Evitar duplicados (borramos la vieja posición si la estamos moviendo)
        const idxExistente = state.creadorCartas.indexOf(num);
        if (idxExistente !== -1) {
            state.creadorCartas[idxExistente] = null; 
        }
        
        // Reemplazar: Simplemente aplastamos lo que haya en ese slot nuevo
        state.creadorCartas[targetIndex] = num; 
        ui.actualizarCreadorUI(state, CARTAS_LOTERIA);
        return;
    }

    // Si arrastró la carta de vuelta al catálogo (para eliminar)
    const catalogo = e.target.closest('.creador-catalogo-area');
    if (catalogo) {
        e.preventDefault();
        const sourceIndex = e.dataTransfer.getData('source-index');
        if (sourceIndex !== "") {
            state.creadorCartas[sourceIndex] = null;
            ui.actualizarCreadorUI(state, CARTAS_LOTERIA);
        }
    }
});

// ==========================================
// 2. LÓGICA DE DIBUJO COMPLEJA (Callbacks)
// ==========================================
function renderizarTablillasCallback(t) {
    const contBotones = document.getElementById('botonesTablilla');
    if (contBotones && contBotones.parentNode !== document.body) {
        document.body.appendChild(contBotones); contBotones.style.display = 'none';
    }

    const cont = document.getElementById('contenedorTablillas'); cont.innerHTML = ''; 
    t.forEach(tab => {
        const divTab = document.createElement('div'); divTab.className = 'tablilla';
        divTab.id = 'tablilla-dom-' + tab.id;
        
        let handleHTML = ''; 
        let claseHeader = ''; // Controla el diseño del título
        
        if (tab.bloqueadaPor) { 
            if (tab.bloqueadaPor === socket.id) {
                divTab.classList.add('bloqueada-mia');
                // IMPORTANTE: Siempre lo inyectamos. El CSS lo ocultará en el Lobby.
                handleHTML = `<div class="resizer-handle" title="Arrastra en cualquier dirección">⤡ Arrastrar para ajustar tamaño</div>`;
                claseHeader = 'arrastrable-header';
            } else {
                divTab.classList.add('bloqueada-otros');
            }
        } 
        else if (tab.viendoPor.length > 0) { 
            if (tab.viendoPor.includes(socket.id)) divTab.classList.add('viendo-mia'); 
            else divTab.classList.add('viendo-otros'); 
        }
        
        let nombreTablilla = tab.isCustom ? '¡Tu Tablilla!' : `Tablilla ${tab.id}`;
        
        // Inyectamos todo junto aplicando la clase de arrastre si corresponde
        divTab.innerHTML = `${handleHTML}<h4 class="${claseHeader}">${nombreTablilla}</h4><div class="grid-cartas"></div>`;
        const grid = divTab.querySelector('.grid-cartas');
        
        tab.cartas.forEach(c => { 
            const divC = document.createElement('div'); divC.className = 'carta'; 
            const numCarta = c.split(' ')[1]; divC.dataset.numero = numCarta;
            const infoCarta = CARTAS_LOTERIA[numCarta];
            
            if (infoCarta) {
                divC.innerHTML = `
                    <img src="${infoCarta.img}" alt="${infoCarta.nombre}" class="img-carta-adentro">
                    <div class="nombre-carta-tablilla" title="${infoCarta.nombre}">${infoCarta.nombre}</div>
                `;
            } else {
                divC.textContent = numCarta; 
            }
            grid.appendChild(divC); 
        });

        divTab.addEventListener('pointerdown', (e) => { 
            if(e.target.classList.contains('resizer-handle')) return; // No ver tablilla si se tocó la barra
            e.preventDefault();
            if (state.miRol === 'jugador' && !tab.bloqueadaPor) socket.emit('ver_tablilla', { nombreSala: state.miSalaActual, idTablilla: tab.id }); 
        });
        cont.appendChild(divTab);
    });
}

function construirPanelEspectadorCb() {
    document.getElementById('panelEspectadorUI').style.display = 'block'; 
    const contChecks = document.getElementById('listaChecksJugadores'); contChecks.innerHTML = '';
    
    for (const id in state.estadoJugadores) {
        if (id !== socket.id) contChecks.innerHTML += `<label class="checkbox-label"><input type="checkbox" class="check-jugador" value="${id}" checked> ${state.estadoJugadores[id].nombre || 'Anónimo'}</label>`;
    }
    
    const cTodos = document.getElementById('checkTodos'); const cInd = document.querySelectorAll('.check-jugador');
    cTodos.checked = true;
    cTodos.addEventListener('change', (e) => { cInd.forEach(c => c.checked = e.target.checked); renderTabEspectadoresCb(); });
    cInd.forEach(c => c.addEventListener('change', () => { if(!c.checked) cTodos.checked = false; renderTabEspectadoresCb(); }));
    
    renderTabEspectadoresCb(); 
}

function renderTabEspectadoresCb() {
    const cont = document.getElementById('contenedorEspectador'); cont.innerHTML = '';
    const checks = document.querySelectorAll('.check-jugador:checked');
    const checkedIds = Array.from(checks).map(c => c.value);
    
    const allIds = Object.keys(state.estadoJugadores).sort();
    let myIndex = allIds.indexOf(socket.id); if (myIndex === -1) myIndex = 0;
    
    const orderedOtherIds = [];
    for (let i = 1; i < allIds.length; i++) {
        const idx = (myIndex + i) % allIds.length; orderedOtherIds.push(allIds[idx]);
    }
    const totalAsientos = orderedOtherIds.length;

    checkedIds.forEach((id) => {
        const d = state.estadoJugadores[id]; if(!d) return;
        const asientoIndex = orderedOtherIds.indexOf(id);
        const divTab = document.createElement('div'); divTab.className = 'tablilla tablilla-enemiga'; divTab.id = `tablilla-espectador-${id}`;
        
        let img = d.foto ? `<img src="${d.foto}" class="foto-perfil">` : '';
        divTab.innerHTML = `<h4>Juego de: ${d.nombre} ${img}</h4><div class="grid-cartas"></div>`;
        const grid = divTab.querySelector('.grid-cartas');
        
        d.cartas.forEach(c => {
            const divC = document.createElement('div'); divC.className = 'carta'; 
            const numCarta = c.split(' ')[1]; divC.dataset.numero = numCarta;
            const infoCarta = CARTAS_LOTERIA[numCarta];

            if (infoCarta) {
                divC.innerHTML = `
                    <img src="${infoCarta.img}" class="img-carta-adentro">
                    <div class="nombre-carta-tablilla" title="${infoCarta.nombre}">${infoCarta.nombre}</div>
                `;
            } else {
                divC.textContent = numCarta;
            }

            if(d.marcas.includes(c)) { divC.classList.add('marcada'); divC.innerHTML += '<div class="palomita">✔</div>'; }
            grid.appendChild(divC);
        });

        if (state.juegoEnCurso) {
            let angle;
            if (totalAsientos === 1) angle = Math.PI * 1.1; 
            else {
                const mitadIzquierda = Math.ceil(totalAsientos / 2); const mitadDerecha = totalAsientos - mitadIzquierda;
                if (asientoIndex < mitadIzquierda) { const step = mitadIzquierda > 1 ? (Math.PI * 1.3 - Math.PI * 0.75) / (mitadIzquierda - 1) : 0; angle = Math.PI * 0.75 + (step * asientoIndex); } 
                else { const idxDer = asientoIndex - mitadIzquierda; const step = mitadDerecha > 1 ? (Math.PI * 2.25 - Math.PI * 1.7) / (mitadDerecha - 1) : 0; angle = Math.PI * 1.7 + (step * idxDer); }
            }
            const radiusX = 44; const radiusY = 40; 
            divTab.style.left = `${50 + (radiusX * Math.cos(angle))}%`; divTab.style.top = `${45 + (radiusY * Math.sin(angle))}%`; 
            const gradosRotacion = (angle * 180 / Math.PI) - 90; divTab.style.setProperty('--rotacion', `${gradosRotacion}deg`);
        } else {
            divTab.style.position = 'relative'; divTab.style.transform = 'none'; divTab.style.setProperty('--rotacion', `0deg`);
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

socket.on('sala_destruida_inactividad', (minutos) => { ui.mostrarModalError(`La sala fue cerrada por inactividad (${minutos} Minutos).`, () => window.location.reload()); });
socket.on('mensaje_chat', (datos) => {
    ui.pintarMensajeChat(datos); 
    if (state.juegoEnCurso) {
        let senderId = null;
        for (let id in state.estadoJugadores) { if (state.estadoJugadores[id].nombre === datos.nombre) { senderId = id; break; } }
        if (senderId) {
            let targetDiv = null;
            if (senderId === socket.id) targetDiv = document.getElementById('contenedorTablillas'); 
            else targetDiv = document.getElementById(`tablilla-espectador-${senderId}`); 
            if (targetDiv) {
                const burbuja = document.createElement('div'); burbuja.className = 'burbuja-chat';
                const fotoUsuario = state.estadoJugadores[senderId]?.foto;
                const imgHTML = fotoUsuario ? `<img src="${fotoUsuario}" class="burbuja-foto">` : '';
                burbuja.innerHTML = `<div class="burbuja-chat-contenido">${imgHTML}<span>${datos.mensaje}</span></div>`;
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
socket.on('error_sala', (msg) => { ui.mostrarModalError(msg); document.getElementById('btnBloquear').style.display = 'none'; document.getElementById('btnDesbloquear').style.display = 'none'; });

// NUEVO: El servidor nos pregunta si queremos entrar de espectadores
socket.on('confirmar_espectador', (datos) => {
    document.getElementById('textoConfirmarEspectador').textContent = datos.mensaje;
    const modal = document.getElementById('modalConfirmarEspectador');
    modal.style.display = 'flex';
    
    // Si dice que SÍ
    document.getElementById('btnAceptarEspectador').onclick = () => {
        modal.style.display = 'none';
        // Reintentamos unirnos pero forzando el rol de espectador
        socket.emit('unirse_sala', { nombreSala: datos.nombreSala, codigoSala: datos.codigoSala, rolElegido: 'espectador' });
    };
    
    // Si dice que NO (Cancelar)
    document.getElementById('btnRechazarEspectador').onclick = () => {
        modal.style.display = 'none';
        // Se queda en el menú principal sin hacer nada más
    };
});

socket.on('sala_creada', (d) => { 
    state.soyAnfitrion = true; state.miRol = 'jugador'; ui.actualizarUIConfig(d.config, state); ui.initLobby(d.nombreSala, d.codigoSala, d.tablillas, renderizarTablillasCallback); 
    document.getElementById('etiquetaHost').style.display='inline'; document.getElementById('btnIniciar').style.display = 'inline-block'; 
    document.getElementById('panelConfiguracion').classList.add('es-host'); document.getElementById('controlesBot').style.display = 'block';
    
    // Habilitar Creador al entrar
    const btnCreador = document.getElementById('contenedorBtnCreador');
    if (btnCreador) btnCreador.style.display = 'block';
});

socket.on('sala_unida', (d) => { 
    state.soyAnfitrion = false; state.miRol = d.rol; ui.actualizarUIConfig(d.config, state); ui.initLobby(d.nombreSala, "Oculto", d.tablillas, renderizarTablillasCallback); 
    document.getElementById('btnCambiarRol').textContent = state.miRol === 'jugador' ? 'Cambiar a Espectador' : 'Cambiar a Jugador';
    const cont = document.getElementById('contenedorTablillas');
    if (state.miRol === 'espectador') { cont.style.opacity = '0.5'; cont.style.pointerEvents = 'none'; } else { cont.style.opacity = '1'; cont.style.pointerEvents = 'auto'; }
    
    // Habilitar o Deshabilitar Creador por rol
    const btnCreador = document.getElementById('contenedorBtnCreador');
    if (btnCreador) btnCreador.style.display = (d.rol === 'jugador') ? 'block' : 'none';
});

socket.on('unido_como_espectador', (d) => { 
    state.juegoEnCurso = false; state.misCartasMarcadas = 0; document.getElementById('btnLoteria').disabled = true; document.getElementById('btnLoteria').style.display = 'none';
    document.getElementById('cartaActual').innerHTML = TEXTO_LOBBY; document.getElementById('cartaActual').style.color = "";
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
    document.getElementById('botonesTablilla').style.display = 'none'; 
    
    // Creador
    const btnCreador = document.getElementById('contenedorBtnCreador');
    if (btnCreador) btnCreador.style.display = (state.miRol === 'jugador') ? 'block' : 'none';
});

socket.on('actualizar_listas', (listas) => ui.actualizarListas(listas, state));
socket.on('estado_boton_iniciar', (data) => { 
    if (state.soyAnfitrion && !state.juegoEnCurso) { 
        const b = document.getElementById('btnIniciar'); 
        const wrapper = document.getElementById('wrapperBtnIniciar');
        b.style.display = 'inline-block'; 
        
        // Manejador de compatibilidad (por si llega booleano o el nuevo objeto)
        const listos = typeof data === 'object' ? data.listos : data;
        const faltantes = typeof data === 'object' ? data.faltantes : [];
        
        b.disabled = !listos; 
        b.style.backgroundColor = listos ? 'lightgreen' : 'lightgray'; 
        
        // INYECCIÓN DEL TOOLTIP
        if (!listos && faltantes.length > 0) {
            const msj = 'Faltan de elegir tablilla:\n' + faltantes.join(', ');
            wrapper.setAttribute('data-tooltip', msj);
        } else {
            wrapper.removeAttribute('data-tooltip'); // Se borra si ya están todos
        }
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
        const btnBloquear = document.getElementById('btnBloquear'); const btnDesbloquear = document.getElementById('btnDesbloquear'); const contBotones = document.getElementById('botonesTablilla');
        if (idActiva) {
            const tabNode = document.getElementById('tablilla-dom-' + idActiva);
            if (tabNode) tabNode.appendChild(contBotones);
            contBotones.style.display = 'flex';
            btnBloquear.style.display = (viendo && !bloqueada) ? 'inline-block' : 'none';
            btnDesbloquear.style.display = bloqueada ? 'inline-block' : 'none';
        } else { contBotones.style.display = 'none'; }
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
socket.on('actualizar_texto_carta', (texto) => { 
    const cartaContenedor = document.getElementById('cartaActual'); 
    let pila = document.getElementById('pilaCartasGriton'); 
    let textoSpan = document.getElementById('textoCartaGriton');

    // Si la mesa 3D y el mazo aún no existen, los construimos desde la cuenta regresiva
    if (!pila) {
        cartaContenedor.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <span id="textoCartaGriton" style="font-size: 1.4em; font-weight: 900; z-index: 310; text-shadow: 0 4px 15px rgba(0,0,0,0.8); background: rgba(15,23,42,0.85); padding: 8px 25px; border-radius: 12px; color: #38bdf8; border: 1px solid rgba(255,255,255,0.1);"></span>
                <div class="griton-mesa-container">
                    <!-- Pila de cartas reveladas (Izquierda) -->
                    <div id="pilaCartasGriton" style="position: relative; width: 220px; height: 310px; z-index: 2;"></div>
                    
                    <!-- Mazo de cartas ocultas (Derecha) -->
                    <div id="mazoCartasGriton" style="position: relative; width: 220px; height: 310px; z-index: 1;">
                        <img src="/assets/img/backards.webp" class="mazo-estatico" style="transform: rotate(-2deg) translate(2px, 2px);">
                        <img src="/assets/img/backards.webp" class="mazo-estatico" style="transform: rotate(1deg) translate(-2px, -2px);">
                        <img src="/assets/img/backards.webp" class="mazo-estatico">
                    </div>
                </div>
            </div>`;
        textoSpan = document.getElementById('textoCartaGriton');
    }
    
    // Inyectamos el texto de la cuenta regresiva en el letrero arrastrable
    textoSpan.textContent = texto; 
});

// LA LÓGICA DE ILUMINACIÓN Y CLICK DE CARTAS 
socket.on('nueva_carta', (carta) => {
    const numCarta = carta.split(' ')[1]; 
    const infoCarta = CARTAS_LOTERIA[numCarta];
    
    const cartaContenedor = document.getElementById('cartaActual'); 
    let pila = document.getElementById('pilaCartasGriton'); 
    let texto = document.getElementById('textoCartaGriton');

    // Si es la primera carta del juego, construimos la "Mesa 3D" del Gritón
    if (!pila) {
        cartaContenedor.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <span id="textoCartaGriton" style="font-size: 1.4em; font-weight: 900; z-index: 310; text-shadow: 0 4px 15px rgba(0,0,0,0.8); background: rgba(15,23,42,0.85); padding: 8px 25px; border-radius: 12px; color: #38bdf8; border: 1px solid rgba(255,255,255,0.1);"></span>
                <div class="griton-mesa-container">
                    <!-- Pila de cartas reveladas (Izquierda) -->
                    <div id="pilaCartasGriton" style="position: relative; width: 220px; height: 310px; z-index: 2;"></div>
                    
                    <!-- Mazo de cartas ocultas (Derecha) -->
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

        // Creamos el contenedor 3D de la carta
        const carta3D = document.createElement('div'); 
        carta3D.className = 'carta-3d-container';
        
        // Matemáticas de desorden en la pila
        const rot = (Math.random() * 30 - 15).toFixed(1); 
        const offsetX = (Math.random() * 24 - 12).toFixed(1); 
        const offsetY = (Math.random() * 24 - 12).toFixed(1);
        
        carta3D.style.setProperty('--rot-final', `${rot}deg`); 
        carta3D.style.setProperty('--x-final', `${offsetX}px`); 
        carta3D.style.setProperty('--y-final', `${offsetY}px`);

        // Inyectamos el reverso y el frente de la carta
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
    const notif = document.getElementById('notificacionFlotante'); notif.textContent = `¡${d.nombre} ha completado su tablilla (Lugar #${d.posicion})!`;
    notif.style.display = 'block'; setTimeout(() => { notif.style.display = 'none'; }, 4000);
});
socket.on('juego_terminado', (datos) => { state.juegoEnCurso = false; ui.mostrarResultados(datos); });

socket.on('regreso_al_lobby_exitoso', () => {

    // Resetear posiciones customizadas al volver al Lobby
    const zonaGriton = document.querySelector('.zona-griton');
    if(zonaGriton) {
        zonaGriton.style.setProperty('--griton-x', '0px');
        zonaGriton.style.setProperty('--griton-y', '0px');
    }
    if(contenedorTabs) {
        contenedorTabs.style.setProperty('--offset-x', '0px');
        contenedorTabs.style.setProperty('--offset-y', '0px');
    }
    
    // NUEVO: Limpiamos la memoria de posición del panel de espectadores
    const panelEsp = document.getElementById('panelEspectadorUI');
    if(panelEsp) {
        panelEsp.style.position = '';
        panelEsp.style.left = '';
        panelEsp.style.top = '';
        panelEsp.style.right = '';
        panelEsp.style.bottom = '';
        panelEsp.style.transform = '';
        panelEsp.style.margin = '';
    }

    state.juegoEnCurso = false; state.misCartasMarcadas = 0;
    document.getElementById('cartaActual').innerHTML = TEXTO_LOBBY; document.getElementById('cartaActual').style.color = "";
    document.getElementById('pantallaResultados').classList.remove('activa'); document.getElementById('pantallaLobby').classList.add('activa');
    document.getElementById('pantallaLobby').classList.remove('mesa-activa');
    
    const btnLoteria = document.getElementById('btnLoteria'); btnLoteria.disabled = true; btnLoteria.style.display = 'none';
    document.querySelector('.zona-griton').insertBefore(btnLoteria, document.getElementById('cartaActual'));
    
    const header = document.querySelector('.header-sala'); const cajasListas = document.getElementById('cajasListas'); const panelConfig = document.getElementById('panelConfiguracion');
    const columnaHerramientas = document.getElementById('herramientasSala'); const chat = document.getElementById('cajaChat');

    if(header) header.classList.remove('oculto-juego'); if(cajasListas) cajasListas.classList.remove('oculto-juego'); if(panelConfig) panelConfig.classList.remove('oculto-juego');
    if(columnaHerramientas) columnaHerramientas.style.display = 'flex'; if(chat) chat.style.display = 'flex';
    if(chat && columnaHerramientas) { chat.classList.remove('chat-juego'); columnaHerramientas.appendChild(chat); }

    if(!state.configSala.sinEspectadores) document.getElementById('btnCambiarRol').style.display = 'inline-block'; 
    document.getElementById('nombreTiempoReal').disabled = false;
    document.getElementById('panelEspectadorUI').style.display = 'none'; 
    document.getElementById('btnAbrirChatMovil').style.display = 'none'; document.getElementById('chatIngameContenedor').style.display = 'none';
    
    const tituloEsp = document.getElementById('tituloEspectando'); if(tituloEsp) tituloEsp.style.display = 'none';
    document.getElementById('contenedorEspectador').innerHTML = '';
    
    if (state.soyAnfitrion) {
        document.getElementById('btnIniciar').style.display = 'inline-block';
        document.getElementById('panelConfiguracion').classList.add('es-host');
        document.getElementById('controlesBot').style.display = 'block';
    }
    
    const btnCreador = document.getElementById('contenedorBtnCreador');
    if(btnCreador && state.miRol === 'jugador') btnCreador.style.display = 'block';
});
socket.on('actualizar_timer_inactividad', (segs) => {
    const min = Math.floor(segs / 60).toString().padStart(2, '0'); const sec = (segs % 60).toString().padStart(2, '0');
    document.getElementById('tiempoInactividadUI').textContent = `${min}:${sec}`; document.getElementById('relojInactividad').style.display = 'inline-block';
});