// public/js/app.js
import state from './state.js';
import { CARTAS_LOTERIA } from './cartas.js';

// Módulos Refactorizados
import { setupSocketClient } from './socketClient.js';
import { setupPhysics } from './physics.js';
import { setupCreador } from './creador.js';
import { setupUIEvents } from './events.js';

const socket = io();
state.socketId = socket.id;

// ==========================================
// LÓGICA DE DIBUJO COMPLEJA (Callbacks)
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
        
        let controlesTop = ''; 
        let contenedorLoteria = ''; 
        let nombreTablilla = tab.isCustom ? '¡Tu Tablilla!' : `Tablilla ${tab.id}`;
        
        // CORRECCIÓN: El título siempre existe en el HTML para que se vea bien en el lobby
        let tituloHTML = `<h4>${nombreTablilla}</h4>`;
        
        if (tab.bloqueadaPor) { 
            if (tab.bloqueadaPor === socket.id) {
                divTab.classList.add('bloqueada-mia');
                // Esto asegura que NO haya título cuando es tu turno
                tituloHTML = ''; 
                
                controlesTop = `
                    <div class="controles-superiores-tablilla">
                        <div class="resizer-handle" title="Arrastra para ajustar tamaño">⤡ TAMAÑO</div>
                        <div class="mover-handle" title="Arrastra para mover">✥ MOVER</div>
                    </div>
                `;
                contenedorLoteria = `<div class="contenedor-titulo-loteria"></div>`;
            } else {
                divTab.classList.add('bloqueada-otros');
            }
        } 
        else if (tab.viendoPor.length > 0) { 
            if (tab.viendoPor.includes(socket.id)) divTab.classList.add('viendo-mia'); 
            else divTab.classList.add('viendo-otros'); 
        }
        
        divTab.innerHTML = `
            ${controlesTop}
            <div class="tablilla-header-container">
                ${tituloHTML}
                ${contenedorLoteria}
            </div>
            <div class="grid-cartas"></div>
        `;

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
            if(e.target.classList.contains('resizer-handle') || e.target.classList.contains('mover-handle')) return; 
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

// INICIALIZACIÓN GLOBAL DE MÓDULOS
setupUIEvents(socket);
setupPhysics(); 
setupCreador(socket);
setupSocketClient(socket, { renderizarTablillasCallback, construirPanelEspectadorCb });