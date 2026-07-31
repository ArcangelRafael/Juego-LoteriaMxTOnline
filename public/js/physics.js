// public/js/physics.js

export function setupPhysics() {
    
    // Función auxiliar para guardar las posiciones en memoria
    function guardarLayout() {
        const contenedorTabs = document.getElementById('contenedorTablillas');
        const zonaGriton = document.querySelector('.zona-griton');
        const panelEspectador = document.getElementById('panelEspectadorUI');
        
        const layoutState = {
            tabScaleX: contenedorTabs.style.getPropertyValue('--escala-x') || '',
            tabScaleY: contenedorTabs.style.getPropertyValue('--escala-y') || '',
            tabOffsetX: contenedorTabs.style.getPropertyValue('--offset-x') || '',
            tabOffsetY: contenedorTabs.style.getPropertyValue('--offset-y') || '',
            gritonX: zonaGriton ? zonaGriton.style.getPropertyValue('--griton-x') : '',
            gritonY: zonaGriton ? zonaGriton.style.getPropertyValue('--griton-y') : '',
            panelLeft: panelEspectador.style.left || '',
            panelTop: panelEspectador.style.top || '',
            panelPos: panelEspectador.style.position || '',
            panelZ: panelEspectador.style.zIndex || ''
        };
        sessionStorage.setItem('loteria_layout', JSON.stringify(layoutState));
    }

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
    // Hacer el panel "Mostrar juego de:" arrastrable
    // ==========================================
    const panelEspectador = document.getElementById('panelEspectadorUI');
    let isDraggingPanel = false;
    let dragStartPanelX, dragStartPanelY;

    panelEspectador.style.cursor = 'grab';

    panelEspectador.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || e.target.closest('#listaChecksJugadores') || e.target.classList.contains('resizer-handle') || e.target.classList.contains('arrastrable-header')) {
            return; 
        }
        isDraggingPanel = true;
        dragStartPanelX = e.clientX;
        dragStartPanelY = e.clientY;

        const rect = panelEspectador.getBoundingClientRect();
        
        panelEspectador.style.position = 'fixed';
        panelEspectador.style.left = rect.left + 'px';
        panelEspectador.style.top = rect.top + 'px';
        panelEspectador.style.right = 'auto';
        panelEspectador.style.bottom = 'auto';
        panelEspectador.style.transform = 'none';
        panelEspectador.style.margin = '0';
        panelEspectador.style.zIndex = '9999'; 
        
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

        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

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
            guardarLayout(); // Guardamos al soltar
        }
    });

    // ==========================================
    // Lógica para redimensionar y MOVER la Tablilla + EL GRITÓN
    // ==========================================
    let isResizingTablilla = false;
    let startYResizer = 0; let startXResizer = 0;
    let startScaleY = 1; let startScaleX = 1;

    let isDraggingMiTablilla = false;
    let dragTabStartX = 0; let dragTabStartY = 0;
    let currentOffsetX = 0; let currentOffsetY = 0;

    let isDraggingGriton = false;
    let dragGritonStartX = 0; let dragGritonStartY = 0;
    let currentGritonOffsetX = 0; let currentGritonOffsetY = 0;

    const contenedorTabs = document.getElementById('contenedorTablillas');

    document.addEventListener('pointerdown', (e) => {
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
        else if (e.target.classList.contains('arrastrable-header')) {
            e.preventDefault();
            e.stopPropagation();
            isDraggingMiTablilla = true;
            dragTabStartX = e.clientX;
            dragTabStartY = e.clientY;
            
            currentOffsetX = parseFloat(contenedorTabs.style.getPropertyValue('--offset-x')) || 0;
            currentOffsetY = parseFloat(contenedorTabs.style.getPropertyValue('--offset-y')) || 0;
        }
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
        if (isResizingTablilla) {
            e.preventDefault();
            const deltaX = e.clientX - startXResizer; 
            const deltaY = startYResizer - e.clientY; 
            
            const newScaleX = Math.max(0.6, Math.min(startScaleX + (deltaX * 0.005), 2.5));
            const newScaleY = Math.max(0.6, Math.min(startScaleY + (deltaY * 0.005), 2.5));
            
            contenedorTabs.style.setProperty('--escala-x', newScaleX);
            contenedorTabs.style.setProperty('--escala-y', newScaleY);
        }
        
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
        let changed = false;
        if (isResizingTablilla) {
            isResizingTablilla = false;
            document.body.style.cursor = 'auto';
            changed = true;
        }
        if (isDraggingMiTablilla) { isDraggingMiTablilla = false; changed = true; }
        if (isDraggingGriton) { isDraggingGriton = false; changed = true; }
        
        // Guardamos al soltar cualquier pieza
        if (changed) guardarLayout();
    });
}