/* =========================================
   CODEX_IUS - MOTOR DE LEYES ESTABLE (VER_01)
   Logica: Segmentación, Lazy Load y Rangos
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const renderArea = document.getElementById('render-area');
    const leyTitulo = document.getElementById('ley-titulo');
    const artInput = document.getElementById('art-input');
    const artBtn = document.getElementById('art-btn');
    const botonesLeyes = document.querySelectorAll('.lista-leyes button');

    // 1. UTILIDAD: Extraer rango de artículos para el Summary
    function extraerRangoArticulos(texto) {
        const regexArt = /\bArt(?:ículo|\.\s*|iculo)?\s*(\d+)/gi;
        const coincidencias = [...texto.matchAll(regexArt)];
        
        if (coincidencias.length > 0) {
            const inicio = coincidencias[0][1];
            const fin = coincidencias[coincidencias.length - 1][1];
            return inicio === fin ? `Art. ${inicio}` : `Arts. ${inicio} a ${fin}`;
        }
        return "";
    }

    // 2. MOTOR PRINCIPAL: Carga y Segmentación
    async function cargarNorma(name) {
        if (!name) return;
        const loader = document.getElementById('global-loader');
        
        if (loader) loader.classList.remove('loader-hidden');
        await new Promise(r => requestAnimationFrame(r));

        try {
            // Nota: He usado name.toUpperCase() por consistencia con tus archivos
            const response = await fetch(`legislacion/${name}.md`);
            if (!response.ok) throw new Error("No se pudo obtener el archivo");
            
            const md = await response.text();
            renderArea.innerHTML = "";

            // Dividimos por encabezados ## o ###
            const partes = md.split(/(?=^##+\s)/m);

            partes.forEach((bloque, index) => {
                const trimmed = bloque.trim();
                if (!trimmed) return;

                const lineas = trimmed.split('\n');
                const encabezado = lineas[0];
                const cuerpo = lineas.slice(1).join('\n').trim();

                const esTituloPuro = cuerpo === "" || cuerpo.startsWith('#');

                if (esTituloPuro) {
                    const nivel = (encabezado.match(/#/g) || []).length;
                    const h = document.createElement(`h${nivel}`);
                    h.innerText = encabezado.replace(/#/g, '').trim();
                    h.className = nivel === 2 ? "titulo-maestro" : "titulo-secundario";
                    renderArea.appendChild(h);
                } else {
                    const det = document.createElement('details');
                    const sum = document.createElement('summary');
                    const art = document.createElement('article');
                    
                    const rango = extraerRangoArticulos(cuerpo);
                    const tituloLimpio = encabezado.replace(/#/g, '').trim();

                    // Summary con Título y Badge de Rango
                    sum.innerHTML = `
                        <span class="sum-titulo">${tituloLimpio}</span>
                        ${rango ? `<mark class="sum-rango">${rango}</mark>` : ''}
                    `;

                    // Lazy loading: solo renderiza MD al abrir
                    det.addEventListener('toggle', () => {
                        if (det.open && art.innerHTML === "") {
                            art.innerHTML = marked.parse(cuerpo);
                        }
                    }, { once: true });

                    det.appendChild(sum);
                    det.appendChild(art);
                    renderArea.appendChild(det);
                }
            });

            leyTitulo.innerText = name.toUpperCase();
            if (loader) loader.classList.add('loader-hidden');
            renderArea.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            if (loader) loader.classList.add('loader-hidden');
            renderArea.innerHTML = `<article><cite>Error: No se pudo cargar la norma solicitada.</cite></article>`;
            console.error(err);
        }
    }

    // 3. BUSCADOR: Compatible con secciones cerradas
    function buscarArticulo() {
        const numArt = artInput.value.trim();
        if (!numArt) return;

        const regex = new RegExp(`\\bArt(?:ículo|\\.\\s*|iculo)?\\s*${numArt}\\b`, 'i');
        
        // Buscamos en todos los details del renderArea
        const todosLosDetails = Array.from(renderArea.querySelectorAll('details'));
        let encontradoEnDet = null;

        // Primero buscamos si el artículo está en el Summary (Rango) o ya renderizado
        for (let det of todosLosDetails) {
            if (regex.test(det.innerText)) {
                encontradoEnDet = det;
                break;
            }
        }

        if (encontradoEnDet) {
            encontradoEnDet.open = true;
            
            // Esperamos un instante a que el Lazy Load renderice el contenido
            setTimeout(() => {
                const elementosInteriores = encontradoEnDet.querySelectorAll('p, b, strong, li');
                const elementoExacto = Array.from(elementosInteriores).find(el => regex.test(el.innerText));

                if (elementoExacto) {
                    elementoExacto.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    elementoExacto.style.transition = "background 0.5s";
                    elementoExacto.style.background = "var(--accent-red)";                    
                    setTimeout(() => elementoExacto.style.background = "transparent", 2500);
                } else {
                    encontradoEnDet.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 150);
        } else {
            alert(`El Artículo ${numArt} no fue localizado en las secciones actuales.`);
        }
    }

    // 4. EVENTOS
    artBtn.addEventListener('click', buscarArticulo);
    artInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') buscarArticulo(); });

    botonesLeyes.forEach(btn => {
        btn.addEventListener('click', () => {
            cargarNorma(btn.value);
            window.history.pushState({}, '', `?ley=${btn.value}`);
        });
    });

    const initialLey = new URLSearchParams(window.location.search).get('ley');
    if (initialLey) cargarNorma(initialLey);
});
