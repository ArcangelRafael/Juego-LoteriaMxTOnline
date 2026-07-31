// public/js/creador.js
import state from './state.js';
import { CARTAS_LOTERIA } from './cartas.js';
import * as ui from './ui.js';

export function setupCreador(socket) {
    // Apertura y Cierre
    document.getElementById('btnAbrirCreador').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        state.creadorCartas.fill(null); 
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
        if (state.creadorCartas.includes(null)) return; 
        
        const cartasMapeadas = state.creadorCartas.map(num => `Carta ${num}`);
        socket.emit('guardar_tablilla_custom', { 
            nombreSala: state.miSalaActual, 
            cartas: cartasMapeadas 
        });
        
        document.getElementById('modalCreador').style.display = 'none';
    });

    function volarCarta(origenRect, destinoRect, imgSrc) {
        const ghost = document.createElement('img');
        ghost.src = imgSrc;
        ghost.className = 'ghost-carta-vuelo';
        
        ghost.style.left = origenRect.left + 'px';
        ghost.style.top = origenRect.top + 'px';
        ghost.style.width = origenRect.width + 'px';
        ghost.style.height = origenRect.height + 'px';
        document.body.appendChild(ghost);

        void ghost.offsetWidth;

        ghost.style.left = destinoRect.left + 'px';
        ghost.style.top = destinoRect.top + 'px';
        ghost.style.width = destinoRect.width + 'px';
        ghost.style.height = destinoRect.height + 'px';
        ghost.style.opacity = '0.4';
        ghost.style.transform = 'scale(1.05)';

        setTimeout(() => {
            if (ghost.parentNode) ghost.remove();
        }, 350); 
    }

    // LÓGICA DE TAP CON ANIMACIÓN
    document.addEventListener('pointerdown', (e) => {
        const cartaCat = e.target.closest('.carta-catalogo');
        if (cartaCat) {
            const num = cartaCat.dataset.numero.toString();
            const index = state.creadorCartas.indexOf(num);
            const infoCarta = CARTAS_LOTERIA[num];
            const origenRect = cartaCat.getBoundingClientRect();
            
            if (index !== -1) {
                const slotDOM = document.querySelector(`.creador-slot[data-index="${index}"]`);
                if(slotDOM && infoCarta) volarCarta(slotDOM.getBoundingClientRect(), origenRect, infoCarta.img);
                
                state.creadorCartas[index] = null;
            } else {
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

        const slot = e.target.closest('.creador-slot');
        if (slot) {
            const slotIdx = slot.dataset.index;
            const num = state.creadorCartas[slotIdx];
            if (num !== null) {
                const infoCarta = CARTAS_LOTERIA[num];
                const origenRect = slot.getBoundingClientRect();
                const cartaCatDOM = document.querySelector(`.carta-catalogo[data-numero="${num}"]`);
                
                if (cartaCatDOM && infoCarta) volarCarta(origenRect, cartaCatDOM.getBoundingClientRect(), infoCarta.img);
                
                state.creadorCartas[slotIdx] = null; 
                ui.actualizarCreadorUI(state, CARTAS_LOTERIA);
            }
        }
    });

    // LÓGICA DE DRAG & DROP
    document.addEventListener('dragstart', (e) => {
        if (e.target.closest('.carta-catalogo')) {
            e.dataTransfer.setData('text/plain', e.target.closest('.carta-catalogo').dataset.numero);
        } else if (e.target.closest('.creador-slot')) {
            const slot = e.target.closest('.creador-slot');
            if (state.creadorCartas[slot.dataset.index] !== null) {
                e.dataTransfer.setData('text/plain', state.creadorCartas[slot.dataset.index]);
                e.dataTransfer.setData('source-index', slot.dataset.index);
            }
        }
    });

    document.addEventListener('dragover', (e) => {
        if (e.target.closest('.creador-slot') || e.target.closest('.creador-catalogo-area')) {
            e.preventDefault(); 
        }
    });

    document.addEventListener('drop', (e) => {
        const num = e.dataTransfer.getData('text/plain');
        if (!num) return;

        const slot = e.target.closest('.creador-slot');
        if (slot) {
            e.preventDefault();
            const targetIndex = slot.dataset.index;
            
            const idxExistente = state.creadorCartas.indexOf(num);
            if (idxExistente !== -1) {
                state.creadorCartas[idxExistente] = null; 
            }
            
            state.creadorCartas[targetIndex] = num; 
            ui.actualizarCreadorUI(state, CARTAS_LOTERIA);
            return;
        }

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
}