// Initialize data handling from either LocalStorage or default file
let sourceCatalog = window.AppCatalog;
const savedCatalog = localStorage.getItem('perfumes_catalog');
if (savedCatalog) {
    try {
        sourceCatalog = JSON.parse(savedCatalog);
    } catch(e) {
        console.error("Local storage parsing failed", e);
    }
}
const perfumesData = sourceCatalog.perfumesData;
const editorContainer = document.getElementById('editor-container');

function renderEditor() {
    editorContainer.innerHTML = '';

    for (const [brand, perfumes] of Object.entries(perfumesData)) {
        
        const brandDiv = document.createElement('div');
        brandDiv.className = 'brand-section';
        brandDiv.innerHTML = `
            <h2>${brand}</h2>
            <div class="perfumes-list" id="list-${brand.replace(/\s+/g, '')}"></div>
            <button class="btn" style="margin-top:10px;" onclick="addPerfume('${brand}')">+ Añadir nuevo a ${brand}</button>
        `;
        editorContainer.appendChild(brandDiv);

        const listDiv = brandDiv.querySelector('.perfumes-list');

        perfumes.forEach((perfume, index) => {
            // Parse and display Stock
            const formatStr = perfume.formats.map(f => `${f.size}ml:${f.price}:${f.stock || 0}`).join(', ');
            
            const card = document.createElement('div');
            card.className = 'perfume-editor';

            // Build video preview HTML
            const videoUrl = perfume.videoUrl || '';
            let videoPreviewHTML = '';
            if (videoUrl && videoUrl.trim() !== '') {
                videoPreviewHTML = `
                    <div class="video-preview">
                        <video src="${videoUrl}" controls preload="metadata" muted></video>
                    </div>
                `;
            }

            card.innerHTML = `
                <img src="${perfume.img}" alt="preview">
                <div class="perfume-fields">
                    <div class="form-row">
                        <label>Nombre:</label>
                        <input type="text" value="${perfume.name}" data-brand="${brand}" data-index="${index}" data-field="name" class="editor-input">
                    </div>
                    <div class="form-row">
                        <label>Notas:</label>
                        <input type="text" value="${perfume.notes}" data-brand="${brand}" data-index="${index}" data-field="notes" class="editor-input">
                    </div>
                    <div class="form-row">
                        <label>Descripción:</label>
                        <textarea data-brand="${brand}" data-index="${index}" data-field="description" class="editor-input">${perfume.description || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <label>Img:</label>
                        <input type="text" value="${perfume.img}" data-brand="${brand}" data-index="${index}" data-field="img" class="editor-input">
                    </div>
                    <div class="form-row">
                        <label>Formatos:</label>
                        <input type="text" value="${formatStr}" data-brand="${brand}" data-index="${index}" data-field="formats" class="editor-input" title="Ejemplo: 50ml:195000:5 (El último número es el stock)">
                    </div>
                    <div class="form-row">
                        <label>🎬 Video:</label>
                        <input type="text" value="${videoUrl}" data-brand="${brand}" data-index="${index}" data-field="videoUrl" class="editor-input" placeholder="assets/videos/mi_reseña.mp4">
                    </div>
                    <p class="video-hint">Coloca tu archivo .mp4 en <code>assets/videos/</code> y escribe la ruta aquí.</p>
                    ${videoPreviewHTML}
                    <div style="text-align: right; margin-top: 5px;">
                        <button class="btn btn-danger" onclick="deletePerfume('${brand}', ${index})">Eliminar</button>
                    </div>
                </div>
            `;
            listDiv.appendChild(card);
        });
    }

    // Attach listeners
    document.querySelectorAll('.editor-input').forEach(input => {
        input.addEventListener('change', handleEdit);
    });
}

function handleEdit(e) {
    const input = e.target;
    const brand = input.getAttribute('data-brand');
    const index = input.getAttribute('data-index');
    const field = input.getAttribute('data-field');
    const val = input.value;

    if (field === 'formats') {
        try {
            // "50ml:150000:5, 100ml:250000:2"
            const arr = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const formatsObj = arr.map(pair => {
                const parts = pair.split(':');
                return { 
                    size: parts[0].replace('ml','').trim(), 
                    price: parseInt(parts[1]? parts[1].trim() : 0),
                    stock: parseInt(parts[2]? parts[2].trim() : 0)
                };
            });
            perfumesData[brand][index].formats = formatsObj;
        } catch(err) {
            alert('Formato INVÁLIDO. Debes usar exactamente la sintaxis: 50ml:195000:5 (Tamaño : Precio : Stock) y separar por comas si hay más de uno.');
        }
    } else if (field === 'description') {
        perfumesData[brand][index].description = val;
    } else if (field === 'videoUrl') {
        perfumesData[brand][index].videoUrl = val;
        renderEditor(); // Re-render to show/hide video preview
    } else {
        perfumesData[brand][index][field] = val;
        if(field === 'img') renderEditor(); // Re-render to show new image
    }
}

window.deletePerfume = function(brand, index) {
    if(confirm('¿Eliminar este perfume?')) {
        perfumesData[brand].splice(index, 1);
        renderEditor();
    }
}

window.addPerfume = function(brand) {
    perfumesData[brand].push({
        id: brand.substring(0,2).toLowerCase() + '-' + Date.now(),
        name: 'Nuevo Perfume',
        notes: 'Nota 1, Nota 2',
        description: 'Descripción del perfume...',
        img: 'assets/images/xerjoff.png',
        videoUrl: '',
        formats: [ { size: '50', price: 100000, stock: 10 } ]
    });
    renderEditor();
}

// Export logic (Now uses instant LocalStorage)
document.getElementById('export-btn').addEventListener('click', () => {
    // We rebuild the catalog object
    const exportData = {
        brandsData: sourceCatalog.brandsData,
        perfumesData: perfumesData
    };
    
    // Save offline instantly
    localStorage.setItem('perfumes_catalog', JSON.stringify(exportData));
    
    alert('¡Cambios guardados con éxito!\n\nVe a tu otra pestaña de la tienda de Perfumes y simplemente recárgala para ver los cambios aplicados al instante.');
});

renderEditor();
