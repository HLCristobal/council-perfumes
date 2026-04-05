// Load Data from LocalStorage or fallback to global AppCatalog
let catalog = window.AppCatalog;
const savedCatalog = localStorage.getItem('perfumes_catalog');
if (savedCatalog) {
    try {
        catalog = JSON.parse(savedCatalog);
    } catch(e) {
        console.error("Error parsing local catalog", e);
    }
}
const brandsData = catalog.brandsData;
const perfumesData = catalog.perfumesData;

// Application State
let cart = [];
const formatCurrency = (amount) => `$ ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} CLP`;

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const mainGrid = document.getElementById('main-grid');
    const dynamicTitle = document.getElementById('dynamic-title');
    const backBtn = document.getElementById('back-btn');
    const navbar = document.querySelector('.navbar');
    
    // Cart Elements
    const cartIcon = document.getElementById('cart-icon');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCart = document.getElementById('close-cart');
    const cartItemsContainer = document.getElementById('cart-items');

    // Modal Elements
    const modalOverlay = document.getElementById('perfume-modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const modalImg = document.getElementById('modal-img');
    const modalBrand = document.getElementById('modal-brand');
    const modalName = document.getElementById('modal-name');
    const modalDescription = document.getElementById('modal-description');
    const modalNotes = document.getElementById('modal-notes');
    const modalFormats = document.getElementById('modal-formats');
    const modalSizeSelect = document.getElementById('modal-size-select');
    const modalPrice = document.getElementById('modal-price');
    const modalStock = document.getElementById('modal-stock');
    const modalAddBtn = document.getElementById('modal-add-btn');
    const modalVideoSection = document.getElementById('modal-video-section');
    const modalVideo = document.getElementById('modal-video');
    const modalNoVideo = document.getElementById('modal-no-video');

    // State for currently open modal perfume
    let currentModalPerfume = null;
    let currentModalBrand = null;
    
    // Inject Checkout & Badges directly
    const cartFooter = document.querySelector('.cart-footer');
    cartFooter.innerHTML = `
        <h3>Total: <span id="cart-total">$ 0 CLP</span></h3>
        <button class="btn-checkout" id="checkout-btn">Finalizar Compra</button>
        <div id="wallet_container"></div>
        <div class="secure-badge">
            <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
            Pagos encriptados
        </div>
    `;
    const btnCheckout = document.getElementById('checkout-btn');

    // 1. Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
            navbar.style.background = 'rgba(6, 10, 20, 0.95)';
            navbar.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
            navbar.style.padding = '0.8rem 5%';
        } else {
            navbar.classList.remove('scrolled');
            navbar.style.background = 'rgba(6, 10, 20, 0.75)';
            navbar.style.boxShadow = 'none';
            navbar.style.padding = '1.5rem 5%';
        }
    });

    // 1.5 Scroll Reveal Observer
    const revealOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    // 2. Render functions
    function renderBrands() {
        dynamicTitle.textContent = "Nuestras Casas";
        backBtn.style.display = 'none';
        mainGrid.innerHTML = '';
        
        brandsData.forEach((brand, index) => {
            const card = document.createElement('div');
            card.className = 'product-card brand-card reveal';
            card.style.transitionDelay = `${index * 0.1}s`; // Stagger effect
            card.innerHTML = `
                <div class="img-container">
                    <img src="${brand.img}" alt="${brand.name}">
                </div>
                <div class="product-info">
                    <h3>${brand.name}</h3>
                    <p class="notes">${brand.desc}</p>
                    <button class="btn-secondary view-brand-btn" data-brand="${brand.name}">Ver Catálogo</button>
                </div>
            `;
            card.addEventListener('click', () => renderPerfumes(brand.name));
            mainGrid.appendChild(card);
            scrollObserver.observe(card);
        });
    }

    function renderPerfumes(brandName) {
        dynamicTitle.textContent = brandName;
        backBtn.style.display = 'inline-block';
        mainGrid.innerHTML = '';

        const perfumes = perfumesData[brandName];
        if(!perfumes) return;

        perfumes.forEach((perfume, index) => {
            let optionsHTML = '';
            perfume.formats.forEach((fmt, i) => {
                const selected = i === 0 ? 'selected' : '';
                optionsHTML += `<option value="${fmt.size}" data-price="${fmt.price}" data-stock="${fmt.stock}" ${selected}>${fmt.size} ml</option>`;
            });

            const card = document.createElement('div');
            card.className = 'product-card reveal';
            card.style.transitionDelay = `${index * 0.15}s`;
            card.innerHTML = `
                <div class="img-container">
                    <img src="${perfume.img}" alt="${perfume.name}">
                </div>
                <div class="product-info">
                    <h3>${perfume.name}</h3>
                    <p class="notes">${perfume.notes}</p>
                    
                    <span class="detail-link" data-perfume-id="${perfume.id}">Ver Detalle ›</span>

                    <div class="format-selector">
                        <select class="size-select" onchange="window.updatePriceDisplay(this, '${perfume.id}')">
                            ${optionsHTML}
                        </select>
                    </div>
                    <span class="stock-status" id="stock-${perfume.id}"></span>
                    <span class="price" id="price-${perfume.id}"></span>
                    
                    <button class="btn-secondary add-to-cart-btn" id="btn-${perfume.id}">Añadir al carrito</button>
                </div>
            `;

            const addBtn = card.querySelector('.add-to-cart-btn');
            const selectEl = card.querySelector('.size-select');
            const detailLink = card.querySelector('.detail-link');
            
            // Append to DOM first so getElementById works
            mainGrid.appendChild(card);
            scrollObserver.observe(card);

            // Initialize states now that it is in the DOM
            window.updatePriceDisplay(selectEl, perfume.id, true);

            // Detail link opens modal
            detailLink.addEventListener('click', (e) => {
                e.stopPropagation();
                openPerfumeDetail(perfume, brandName);
            });

            // Clicking image also opens modal
            card.querySelector('.img-container').addEventListener('click', (e) => {
                e.stopPropagation();
                openPerfumeDetail(perfume, brandName);
            });

            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentOpt = selectEl.options[selectEl.selectedIndex];
                const size = currentOpt.value;
                const price = parseInt(currentOpt.getAttribute('data-price'));
                const stock = parseInt(currentOpt.getAttribute('data-stock'));
                addToCart(perfume, size, price, stock, brandName);
            });
        });

        document.getElementById('collection').scrollIntoView({behavior: 'smooth'});
    }

    backBtn.addEventListener('click', renderBrands);

    // ═══════════════════════════════════════════════════════
    // PERFUME DETAIL MODAL
    // ═══════════════════════════════════════════════════════

    function openPerfumeDetail(perfume, brandName) {
        currentModalPerfume = perfume;
        currentModalBrand = brandName;

        // Fill basic info
        modalImg.src = perfume.img;
        modalImg.alt = perfume.name;
        modalBrand.textContent = brandName;
        modalName.textContent = perfume.name;
        modalDescription.textContent = perfume.description || perfume.notes;
        modalNotes.textContent = perfume.notes;

        // Build formats overview grid
        modalFormats.innerHTML = '';
        perfume.formats.forEach(fmt => {
            const card = document.createElement('div');
            card.className = `format-card ${fmt.stock === 0 ? 'out-of-stock' : ''}`;
            card.innerHTML = `
                <div class="format-size">${fmt.size} ml</div>
                <div class="format-price">${formatCurrency(fmt.price)}</div>
                <div class="format-stock ${fmt.stock > 0 ? 'available' : 'sold-out'}">
                    ${fmt.stock > 0 ? `${fmt.stock} disponible${fmt.stock > 1 ? 's' : ''}` : 'Agotado'}
                </div>
            `;
            modalFormats.appendChild(card);
        });

        // Build select dropdown
        modalSizeSelect.innerHTML = '';
        perfume.formats.forEach((fmt, i) => {
            const opt = document.createElement('option');
            opt.value = fmt.size;
            opt.setAttribute('data-price', fmt.price);
            opt.setAttribute('data-stock', fmt.stock);
            opt.textContent = `${fmt.size} ml`;
            if (i === 0) opt.selected = true;
            modalSizeSelect.appendChild(opt);
        });

        // Update price & stock for modal
        updateModalPriceDisplay();

        // Handle Video Section
        const videoUrl = perfume.videoUrl || '';
        if (videoUrl && videoUrl.trim() !== '') {
            modalVideoSection.style.display = 'block';
            modalNoVideo.style.display = 'none';
            modalVideo.src = videoUrl;
            modalVideo.load();
        } else {
            modalVideoSection.style.display = 'none';
            modalNoVideo.style.display = 'block';
        }

        // Show modal
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function updateModalPriceDisplay() {
        const selectedOption = modalSizeSelect.options[modalSizeSelect.selectedIndex];
        if (!selectedOption) return;

        const price = parseInt(selectedOption.getAttribute('data-price'));
        const maxStock = parseInt(selectedOption.getAttribute('data-stock'));
        const size = selectedOption.value;

        // Check cart quantities
        const cartItem = cart.find(item => item.id === `${currentModalPerfume.id}-${size}`);
        const currentQtyInCart = cartItem ? cartItem.qty : 0;
        const availableStock = maxStock - currentQtyInCart;

        modalPrice.textContent = formatCurrency(price);

        if (maxStock === 0) {
            modalStock.textContent = 'Agotado (0 disponibles)';
            modalStock.className = 'stock-status modal-stock stock-out';
            modalAddBtn.disabled = true;
            modalAddBtn.textContent = 'Sin Existencias';
        } else if (availableStock <= 0) {
            modalStock.textContent = `Alcanzaste el límite (${maxStock} en carrito)`;
            modalStock.className = 'stock-status modal-stock stock-out';
            modalAddBtn.disabled = true;
            modalAddBtn.textContent = 'Límite Añadido';
        } else {
            modalStock.textContent = `En Stock: ${availableStock} unid. (Disp. ${maxStock})`;
            modalStock.className = 'stock-status modal-stock stock-ok';
            modalAddBtn.disabled = false;
            modalAddBtn.textContent = 'Añadir al Carrito';
        }
    }

    // Modal size select change
    modalSizeSelect.addEventListener('change', updateModalPriceDisplay);

    // Modal add to cart
    modalAddBtn.addEventListener('click', () => {
        if (!currentModalPerfume) return;
        const selectedOption = modalSizeSelect.options[modalSizeSelect.selectedIndex];
        const size = selectedOption.value;
        const price = parseInt(selectedOption.getAttribute('data-price'));
        const stock = parseInt(selectedOption.getAttribute('data-stock'));
        addToCart(currentModalPerfume, size, price, stock, currentModalBrand);
        updateModalPriceDisplay(); // Refresh stock in modal
    });

    // Close modal
    function closePerfumeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        // Pause video
        modalVideo.pause();
        modalVideo.removeAttribute('src');
        currentModalPerfume = null;
        currentModalBrand = null;
    }

    modalClose.addEventListener('click', closePerfumeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closePerfumeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closePerfumeModal();
        }
    });

    // ═══════════════════════════════════════════════════════
    // END MODAL LOGIC
    // ═══════════════════════════════════════════════════════

    // Dynamic Price & Stock display helper
    window.updatePriceDisplay = function(selectElement, perfumeId, isInit = false) {
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        const newPrice = parseInt(selectedOption.getAttribute('data-price'));
        const maxStock = parseInt(selectedOption.getAttribute('data-stock'));
        const size = selectedOption.value;
        
        const priceDisplay = document.getElementById(`price-${perfumeId}`);
        const stockDisplay = document.getElementById(`stock-${perfumeId}`);
        const btn = document.getElementById(`btn-${perfumeId}`);
        
        // Find exactly how many of THIS specific format are already in the cart
        const cartItem = cart.find(item => item.id === `${perfumeId}-${size}`);
        const currentQtyInCart = cartItem ? cartItem.qty : 0;
        const availableStock = maxStock - currentQtyInCart;
        
        // Stock Validation UI (Real-time reactive)
        if (maxStock === 0) {
            stockDisplay.textContent = 'Agotado (0 disponibles)';
            stockDisplay.className = 'stock-status stock-out';
            btn.disabled = true;
            btn.textContent = 'Sin Existencias';
        } else if (availableStock <= 0) {
            stockDisplay.textContent = `Alcanzaste el límite (${maxStock} en carrito)`;
            stockDisplay.className = 'stock-status stock-out';
            btn.disabled = true;
            btn.textContent = 'Límite Añadido';
        } else {
            stockDisplay.textContent = `En Stock: ${availableStock} unid. (Disp. ${maxStock})`;
            stockDisplay.className = 'stock-status stock-ok';
            btn.disabled = false;
            btn.textContent = 'Añadir al carrito';
        }

        if(!isInit) {
            priceDisplay.style.opacity = '0';
            setTimeout(() => {
                priceDisplay.textContent = formatCurrency(newPrice);
                priceDisplay.style.opacity = '1';
            }, 150);
        } else {
            priceDisplay.textContent = formatCurrency(newPrice);
        }
    }

    // 3. SECURE Cart Logic
    function addToCart(perfume, size, price, maxStock, brand) {
        const cartItem = {
            id: perfume.id + '-' + size,
            perfumeId: perfume.id,
            name: perfume.name,
            brand: brand,
            size: size,
            price: price,
            img: perfume.img,
            maxStock: maxStock
        };

        const existing = cart.find(item => item.id === cartItem.id);
        if(existing) {
            if(existing.qty >= maxStock) {
                alert(`Lo sentimos, el límite de stock para este formato es de ${maxStock} unidades.`);
                return;
            }
            existing.qty += 1;
        } else {
            cartItem.qty = 1;
            cart.push(cartItem);
        }

        updateCartUI();
        openCart();
    }

    window.updateCartQty = function(id, delta) {
        const item = cart.find(i => i.id === id);
        if (!item) return;
        
        const newQty = item.qty + delta;
        
        if (newQty <= 0) {
            window.removeFromCart(id);
            return;
        }
        
        if (newQty > item.maxStock) {
            alert(`Stock Insuficiente: Solo quedan ${item.maxStock} de ${item.name} (${item.size}ml).`);
            return;
        }
        
        item.qty = newQty;
        updateCartUI();
    }

    window.removeFromCart = function(id) {
        cart = cart.filter(item => item.id !== id);
        updateCartUI();
    }

    function updateCartUI() {
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        cartIcon.textContent = `Cart (${totalItems})`;

        cartItemsContainer.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="color:#7b8da6; text-align:center; padding-top:20px; font-size:0.85rem; letter-spacing:1px;">Tu carrito está vacío.</p>';
        }

        cart.forEach(item => {
            total += item.price * item.qty;
            const itemHTML = `
                <div class="cart-item">
                    <img src="${item.img}" alt="${item.name}">
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.brand} - ${item.name}</div>
                        <div class="cart-item-desc">${item.size} ml</div>
                        <div class="qty-controls" style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                            <button class="qty-btn" onclick="window.updateCartQty('${item.id}', -1)" style="width:28px; height:28px; cursor:pointer; background:transparent; border:1px solid rgba(74,144,226,0.2); color:#4a90e2; font-weight:500; font-size:1rem; display:flex; align-items:center; justify-content:center; transition:all 0.3s;">−</button>
                            <span class="qty-val" style="font-size:0.85rem; font-weight:500; min-width:18px; text-align:center; color:#e4eaf4;">${item.qty}</span>
                            <button class="qty-btn" onclick="window.updateCartQty('${item.id}', 1)" style="width:28px; height:28px; cursor:pointer; background:transparent; border:1px solid rgba(74,144,226,0.2); color:#4a90e2; font-weight:500; font-size:1rem; display:flex; align-items:center; justify-content:center; transition:all 0.3s;">+</button>
                        </div>
                        <div class="cart-item-price">${formatCurrency(item.price * item.qty)}</div>
                        <button class="remove-item" onclick="window.removeFromCart('${item.id}')">Eliminar</button>
                    </div>
                </div>
            `;
            cartItemsContainer.innerHTML += itemHTML;
        });

        document.getElementById('cart-total').textContent = formatCurrency(total);
        refreshVisibleStockUI(); // REFRESH THE PAGE'S STOCK REAL TIME

        // Also refresh modal stock if open
        if (currentModalPerfume && modalOverlay.classList.contains('active')) {
            updateModalPriceDisplay();
        }
    }

    function refreshVisibleStockUI() {
        const selects = document.querySelectorAll('#main-grid .size-select');
        selects.forEach(sel => {
            const stockSpan = sel.closest('.product-info').querySelector('.stock-status');
            if(stockSpan) {
                const perfumeId = stockSpan.id.replace('stock-', '');
                window.updatePriceDisplay(sel, perfumeId, true);
            }
        });
    }

    function openCart() { cartSidebar.classList.add('open'); cartOverlay.classList.add('active'); }
    function closeCartPanel() { cartSidebar.classList.remove('open'); cartOverlay.classList.remove('active'); }

    cartIcon.addEventListener('click', openCart);
    closeCart.addEventListener('click', closeCartPanel);
    cartOverlay.addEventListener('click', closeCartPanel);

    // INICIALIZA MERCADO PAGO — Reemplaza por tu PUBLIC_KEY real de Producción
    const mp = new MercadoPago('TEST-PON_LA_PUBLIC_KEY_AQUI', { locale: 'es-CL' });

    // SECURE CHECKOUT BOUNDARY: Llamada al servidor Vercel
    btnCheckout.addEventListener('click', async () => {
        if(cart.length === 0) return alert('El carrito está vacío.');
        btnCheckout.textContent = 'Conectando Pasarela MP...';
        btnCheckout.disabled = true;
        
        try {
            // Mandar el carrito al archivo seguro en la nube api/checkout.js
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart: cart })
            });

            if (!response.ok) {
                throw new Error('El Backend no respondió. ¿Estás ejecutándolo en Vercel?');
            }
            
            const data = await response.json();
            
            if (data.id) {
                // Si el servidor nos devuelve el ID Seguro, renderizamos la billetera de MercadoPago
                document.getElementById('wallet_container').innerHTML = ''; // Limpiar por si acaso
                
                mp.bricks().create("wallet", "wallet_container", {
                    initialization: {
                        preferenceId: data.id,
                    },
                    customization: {
                        texts: { valueProp: 'security_safety' }
                    }
                });
                
                // Ocultar botón viejo ya que la billetera azul aparecerá abajo
                btnCheckout.style.display = 'none'; 
            }
        } catch(error) {
            console.warn(error);
            alert('Aviso Local: La pasarela de Mercado Pago intentó conectar con el Backend (/api/checkout), pero como estás abriendo el archivo en tu PC local (sin servidor en la nube), falló. ¡Súbelo a Vercel para que funcione!');
            btnCheckout.textContent = 'Finalizar Compra (Desconectado)';
            btnCheckout.disabled = false;
        }
    });

    // Initial render
    renderBrands();
});
