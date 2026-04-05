// ─── Server-side Price Catalog (trusted source of truth) ───
// This prevents price tampering from the client
const PRICE_CATALOG = {
    'xj-1': { '50': 195000, '100': 265000 },
    'xj-2': { '50': 175000, '100': 245000 },
    'xj-3': { '50': 185000, '100': 255000 },
    'tf-1': { '30': 160000, '50': 220000, '100': 310000, '250': 680000 },
    'tf-2': { '30': 160000, '50': 220000, '100': 310000 },
    'tf-3': { '50': 140000, '100': 195000 },
    'cr-1': { '50': 235000, '100': 345000, '250': 590000, '500': 950000 },
    'cr-2': { '50': 215000, '100': 315000 },
    'cr-3': { '50': 215000, '100': 315000 },
    'pm-1': { '75': 205000, '125': 275000 },
    'pm-2': { '75': 205000, '125': 275000 },
    'pm-3': { '75': 205000, '125': 275000 },
    'in-1': { '10': 65000, '90': 315000 },
    'in-2': { '10': 60000, '90': 295000 },
    'in-3': { '10': 60000, '90': 295000 }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Solo se permiten peticiones POST' });
    }

    const { cart } = req.body;
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ message: 'El carrito está vacío o inválido' });
    }

    // SEGURIDAD: El Access Token SOLO vive en Environment Variables de Vercel
    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
        console.error('FATAL: MP_ACCESS_TOKEN no está configurado en las variables de entorno.');
        return res.status(500).json({ message: 'Error de configuración del servidor. Contacta al administrador.' });
    }

    // SEGURIDAD: Validar cada item contra el catálogo de precios del servidor
    const validatedItems = [];
    for (const item of cart) {
        const perfumeId = item.perfumeId;
        const size = String(item.size);
        const qty = Number(item.qty);

        // Validar que el perfume y tamaño existan
        if (!PRICE_CATALOG[perfumeId] || !PRICE_CATALOG[perfumeId][size]) {
            return res.status(400).json({ 
                message: `Producto no válido: ${perfumeId} en tamaño ${size}ml` 
            });
        }

        // Validar cantidad
        if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
            return res.status(400).json({ 
                message: `Cantidad no válida para ${item.name}: ${qty}` 
            });
        }

        // Usar el precio REAL del servidor, no el que envía el cliente
        const trustedPrice = PRICE_CATALOG[perfumeId][size];

        validatedItems.push({
            title: `${item.brand} - ${item.name} (${size}ml)`,
            unit_price: trustedPrice,
            quantity: qty,
            currency_id: 'CLP'
        });
    }

    try {
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                items: validatedItems,
                back_urls: {
                    success: process.env.SITE_URL || "https://counsilniche.vercel.app/",
                    failure: process.env.SITE_URL || "https://counsilniche.vercel.app/",
                    pending: process.env.SITE_URL || "https://counsilniche.vercel.app/"
                },
                auto_return: "approved"
            })
        });

        const data = await response.json();

        if (response.ok) {
            return res.status(200).json({ id: data.id });
        } else {
            console.error('MercadoPago API Error:', data);
            return res.status(400).json({ message: 'Error procesando el pago. Intenta nuevamente.' });
        }
    } catch (error) {
        console.error('Checkout Server Error:', error.message);
        return res.status(500).json({ message: 'Error interno del servidor. Intenta nuevamente.' });
    }
}
