/* ========================================
   FLOR Y LLANO - Sistema de Control de Inventario
   ======================================== */

// =============================================
// CONFIGURATION — Edit these constants as needed
// =============================================

const PRICES = {
    maranon: 35000,
    miel: 25000,
    jalea: 60000,
    polen: 60000,
    moringa: 35000,
};

const PROMO = {
    price: 155000,
    products: ['maranon', 'miel', 'jalea', 'polen'],
};

const COMMISSION = {
    option1PerUnit: 4000,
    option1Fixed: 40000,
    option2Rate: 0.33,
};

const PRODUCT_LABELS = {
    maranon: 'Extracto de Marañón',
    miel: 'Miel Angelita',
    jalea: 'Jalea Real',
    polen: 'Polen Fermentado',
    moringa: 'Moringa',
};

// =============================================
// DOM REFERENCES
// =============================================

const dom = {
    // Vendedor
    nombreVendedor: document.getElementById('nombreVendedor'),
    lugarTrabajo: document.getElementById('lugarTrabajo'),
    fechaReporte: document.getElementById('fechaReporte'),

    // Inventario Inicial
    iniMaranon: document.getElementById('iniMaranon'),
    iniMiel: document.getElementById('iniMiel'),
    iniJalea: document.getElementById('iniJalea'),
    iniPolen: document.getElementById('iniPolen'),
    iniMoringa: document.getElementById('iniMoringa'),

    // Inventario Final
    finMaranon: document.getElementById('finMaranon'),
    finMiel: document.getElementById('finMiel'),
    finJalea: document.getElementById('finJalea'),
    finPolen: document.getElementById('finPolen'),
    finMoringa: document.getElementById('finMoringa'),

    // Promociones & Descuentos
    cantidadPromociones: document.getElementById('cantidadPromociones'),
    descuentosRealizados: document.getElementById('descuentosRealizados'),

    // Comisión
    radioOpcion1: document.getElementById('radioOpcion1'),
    radioOpcion2: document.getElementById('radioOpcion2'),

    // Tabla resumen
    tablaProductosVendidos: document.getElementById('tablaProductosVendidos'),
    totalUnidadesVendidas: document.getElementById('totalUnidadesVendidas'),
    totalVentasIndividuales: document.getElementById('totalVentasIndividuales'),

    // Promo badge
    badgePromociones: document.getElementById('badgePromociones'),
    cantPromoBadge: document.getElementById('cantPromoBadge'),
    valorPromoBadge: document.getElementById('valorPromoBadge'),

    // Totales
    totalBruto: document.getElementById('totalBruto'),
    totalDescuentos: document.getElementById('totalDescuentos'),
    totalNeto: document.getElementById('totalNeto'),
    totalComision: document.getElementById('totalComision'),
    detalleComision: document.getElementById('detalleComision'),
    dineroEntregar: document.getElementById('dineroEntregar'),

    // Alertas
    alertasInventario: document.getElementById('alertasInventario'),
    alertaPromociones: document.getElementById('alertaPromociones'),

    // Botones
    btnGenerarPDF: document.getElementById('btnGenerarPDF'),
    btnWhatsapp: document.getElementById('btnWhatsapp'),

    // Footer
    currentYear: document.getElementById('currentYear'),

};

const productKeys = ['maranon', 'miel', 'jalea', 'polen', 'moringa'];

// Helper to get inventory input elements
const iniInputs = {
    maranon: dom.iniMaranon,
    miel: dom.iniMiel,
    jalea: dom.iniJalea,
    polen: dom.iniPolen,
    moringa: dom.iniMoringa,
};

const finInputs = {
    maranon: dom.finMaranon,
    miel: dom.finMiel,
    jalea: dom.finJalea,
    polen: dom.finPolen,
    moringa: dom.finMoringa,
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

function formatCOP(value) {
    if (isNaN(value) || value < 0) value = 0;
    return '$' + Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseNumber(input) {
    const val = parseInt(input.value.trim(), 10);
    return isNaN(val) ? 0 : Math.max(0, val);
}

function parseCurrency(input) {
    const val = parseFloat(input.value.trim());
    return isNaN(val) ? 0 : Math.max(0, val);
}

function getCommissionType() {
    return document.querySelector('input[name="tipoComision"]:checked').value;
}

function getInventory(map) {
    const result = {};
    productKeys.forEach((key) => {
        result[key] = parseNumber(map[key]);
    });
    return result;
}

// =============================================
// CALCULATIONS
// =============================================

function getSold() {
    const initial = getInventory(iniInputs);
    const final = getInventory(finInputs);
    const sold = {};
    productKeys.forEach((key) => {
        sold[key] = Math.max(0, initial[key] - final[key]);
    });
    return { initial, final, sold };
}

function getEffectiveSold(sold, promos) {
    const effective = {};
    productKeys.forEach((key) => {
        if (PROMO.products.includes(key)) {
            effective[key] = Math.max(0, sold[key] - promos);
        } else {
            effective[key] = sold[key];
        }
    });
    return effective;
}

function calculateTotals(effectiveSold, promos, discount) {
    let individualTotal = 0;
    let individualUnits = 0;
    productKeys.forEach((key) => {
        individualTotal += effectiveSold[key] * PRICES[key];
        individualUnits += effectiveSold[key];
    });

    const promoTotal = promos * PROMO.price;
    const promoUnits = promos * PROMO.products.length;
    const grossTotal = individualTotal + promoTotal;
    const netTotal = grossTotal - discount;
    const totalUnits = individualUnits + promoUnits;
    const totalSoldForCommission = totalUnits;

    return {
        individualTotal,
        individualUnits,
        promoTotal,
        promoUnits,
        grossTotal,
        netTotal,
        totalUnits,
        totalSoldForCommission,
        discount,
        promos,
    };
}

function calculateCommission(type, totals) {
    let amount = 0;
    let detail = '';

    if (type === 'opcion1') {
        amount = (totals.totalSoldForCommission * COMMISSION.option1PerUnit) + COMMISSION.option1Fixed;
        detail = `${totals.totalSoldForCommission} productos × $${COMMISSION.option1PerUnit.toLocaleString('es-CO')} + $${COMMISSION.option1Fixed.toLocaleString('es-CO')}`;
    } else {
        amount = totals.netTotal * COMMISSION.option2Rate;
        detail = `${formatCOP(totals.netTotal)} × ${Math.round(COMMISSION.option2Rate * 100)}%`;
    }

    return { amount, detail };
}

// =============================================
// VALIDATION
// =============================================

function validateInventories(initial, final) {
    const errors = [];
    productKeys.forEach((key) => {
        if (final[key] > initial[key]) {
            errors.push({
                key,
                msg: `${PRODUCT_LABELS[key]}: El inventario final (${final[key]}) no puede ser mayor al inicial (${initial[key]}).`,
            });
        }
    });
    return errors;
}

function validatePromos(sold, promos) {
    const errors = [];
    if (promos <= 0) return errors;

    PROMO.products.forEach((key) => {
        if (promos > sold[key]) {
            errors.push({
                key,
                msg: `No hay suficientes unidades de ${PRODUCT_LABELS[key]} para ${promos} promociones. Disponible: ${sold[key]}.`,
            });
        }
    });
    return errors;
}

// =============================================
// UI UPDATE
// =============================================

function renderAlerts() {
    const { initial, final, sold } = getSold();
    const promos = parseNumber(dom.cantidadPromociones);

    // Inventory errors
    const invErrors = validateInventories(initial, final);
    dom.alertasInventario.innerHTML = '';
    invErrors.forEach((e) => {
        dom.alertasInventario.innerHTML += `
            <div class="alert alert--error">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>${e.msg}</span>
            </div>`;
    });

    // Promo errors
    const promoErrors = validatePromos(sold, promos);
    dom.alertaPromociones.innerHTML = '';
    promoErrors.forEach((e) => {
        dom.alertaPromociones.innerHTML += `
            <div class="alert alert--warning">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>${e.msg}</span>
            </div>`;
    });
}

function updateSummaryTable(effectiveSold, promos) {
    const tbody = dom.tablaProductosVendidos.querySelector('tbody');

    productKeys.forEach((key) => {
        const row = tbody.querySelector(`tr[data-producto="${key}"]`);
        if (!row) return;
        const qty = effectiveSold[key];
        row.querySelector('.cantidad-col').textContent = qty;
        row.querySelector('.subtotal-col').textContent = formatCOP(qty * PRICES[key]);
    });

    // Totals row
    let totalUnits = 0;
    let totalValue = 0;
    productKeys.forEach((key) => {
        totalUnits += effectiveSold[key];
        totalValue += effectiveSold[key] * PRICES[key];
    });
    dom.totalUnidadesVendidas.textContent = totalUnits;
    dom.totalVentasIndividuales.textContent = formatCOP(totalValue);

    // Promo badge
    if (promos > 0) {
        dom.badgePromociones.style.display = 'flex';
        dom.cantPromoBadge.textContent = promos;
        dom.valorPromoBadge.textContent = formatCOP(promos * PROMO.price);
    } else {
        dom.badgePromociones.style.display = 'none';
    }
}

function updateTotals() {
    const { sold } = getSold();
    const promos = parseNumber(dom.cantidadPromociones);
    const discount = parseCurrency(dom.descuentosRealizados);
    const type = getCommissionType();

    const effectiveSold = getEffectiveSold(sold, promos);
    const totals = calculateTotals(effectiveSold, promos, discount);
    const commission = calculateCommission(type, totals);

    dom.totalBruto.textContent = formatCOP(totals.grossTotal);
    dom.totalDescuentos.textContent = `- ${formatCOP(totals.discount)}`;
    dom.totalNeto.textContent = formatCOP(totals.netTotal);
    dom.totalComision.textContent = formatCOP(commission.amount);
    dom.detalleComision.textContent = commission.detail;
    dom.dineroEntregar.textContent = formatCOP(totals.netTotal - commission.amount);
}

function updateAll() {
    renderAlerts();
    const { sold } = getSold();
    const promos = parseNumber(dom.cantidadPromociones);
    const effectiveSold = getEffectiveSold(sold, promos);
    updateSummaryTable(effectiveSold, promos);
    updateTotals();
}

// =============================================
// PDF GENERATION
// =============================================

function getLogoDataUrl() {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = 'logo.png';
    });
}

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 18;
    const cw = pw - m * 2;
    let y = m;

    const { initial, final, sold } = getSold();
    const promos = parseNumber(dom.cantidadPromociones);
    const discount = parseCurrency(dom.descuentosRealizados);
    const type = getCommissionType();
    const effectiveSold = getEffectiveSold(sold, promos);
    const totals = calculateTotals(effectiveSold, promos, discount);
    const commission = calculateCommission(type, totals);
    const name = dom.nombreVendedor.value.trim() || '(No especificado)';
    const place = dom.lugarTrabajo.value.trim() || '(No especificado)';
    const date = dom.fechaReporte.value || new Date().toISOString().split('T')[0];
    const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    const gold = [212, 160, 23];
    const goldD = [184, 134, 11];
    const dark = [62, 39, 35];
    const gray = [109, 109, 109];
    const white = [255, 255, 255];
    const bgLight = [253, 248, 240];
    const bgGray = [245, 242, 235];

    // ---- HELPERS ----
    function txt(s, x, yp, o = {}) {
        doc.setFont('helvetica', o.style || 'normal');
        doc.setFontSize(o.size || 10);
        doc.setTextColor((o.color || dark)[0], (o.color || dark)[1], (o.color || dark)[2]);
        const w = o.maxW || cw;
        if (o.align === 'right') doc.text(s, x + w - doc.getTextWidth(s), yp);
        else if (o.align === 'center') doc.text(s, x + (w - doc.getTextWidth(s)) / 2, yp);
        else doc.text(s, x, yp);
    }

    function hr(yp, thk) {
        doc.setDrawColor(gold[0], gold[1], gold[2]);
        doc.setLineWidth(thk || 0.5);
        doc.line(m, yp, pw - m, yp);
    }

    function filledRect(xp, yp, wp, hp, clr) {
        doc.setFillColor(clr[0], clr[1], clr[2]);
        doc.rect(xp, yp, wp, hp, 'F');
    }

    function drawTable(xp, yp, headers, rows, colW, opts) {
        const hdrH = 8;
        const rowH = 7;
        const padL = 2;
        const padR = 2;
        const totalW = colW.reduce((a, b) => a + b, 0);

        // Header bg
        filledRect(xp, yp, totalW, hdrH, gold);

        // Header text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        let cx = xp;
        headers.forEach((h, i) => {
            const align = i === 0 ? 'left' : 'right';
            const hx = align === 'right' ? cx + colW[i] - padR : cx + padL;
            const tw = doc.getTextWidth(h);
            doc.text(h, align === 'right' ? hx - tw : hx, yp + 5.5);
            cx += colW[i];
        });

        // Rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        for (let ri = 0; ri < rows.length; ri++) {
            const ry = yp + hdrH + ri * rowH;
            const rn = opts && opts.rowNumbers ? opts.rowNumbers[ri] : null;

            // Alternating row bg
            if (ri % 2 === 1) filledRect(xp, ry, totalW, rowH, bgGray);

            // Grid lines (top border for each row from second row onward)
            if (ri > 0) {
                doc.setDrawColor(220, 212, 200);
                doc.setLineWidth(0.3);
                doc.line(xp, ry, xp + totalW, ry);
            }

            const row = rows[ri];
            cx = xp;
            for (let ci = 0; ci < row.length; ci++) {
                const align = ci === 0 ? 'left' : 'right';
                const val = String(row[ci]);
                const tw = doc.getTextWidth(val);

                doc.setTextColor(dark[0], dark[1], dark[2]);
                if (rn && ci === rn.col) {
                    doc.setFont('helvetica', 'bold');
                } else {
                    doc.setFont('helvetica', 'normal');
                }

                if (align === 'right') {
                    doc.text(val, cx + colW[ci] - padR - tw, ry + 5);
                } else {
                    doc.text(val, cx + padL, ry + 5);
                }
                cx += colW[ci];
            }
        }

        // Full border
        const tableH = hdrH + rows.length * rowH;
        doc.setDrawColor(200, 190, 175);
        doc.setLineWidth(0.5);
        doc.rect(xp, yp, totalW, tableH);

        return yp + tableH + 6;
    }

    // ---- HEADER ----
    // Golden banner at top
    filledRect(m, y, cw, 32, gold);
    doc.setFillColor(goldD[0], goldD[1], goldD[2]);

    // Logo
    const logoData = await getLogoDataUrl();
    if (logoData) {
        doc.addImage(logoData, 'PNG', m + 4, y + 4, 24, 24);
    }

    // Title on banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const lx = logoData ? m + 32 : m + 4;
    doc.text('FLOR Y LLANO', lx, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Sistema de Control de Inventario', lx, y + 19);

    // Report type badge right side
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    const rt = 'Reporte de Ventas';
    doc.text(rt, pw - m - doc.getTextWidth(rt), y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const dt = `Generado: ${new Date().toLocaleDateString('es-CO')}`;
    doc.text(dt, pw - m - doc.getTextWidth(dt), y + 19);

    y += 38;

    // ---- VENDEDOR INFO CARD ----
    filledRect(m, y, cw, 18, bgLight);
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.5);
    doc.rect(m, y, cw, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(goldD[0], goldD[1], goldD[2]);
    doc.text('DATOS DEL VENDEDOR', m + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(`Nombre: ${name}`, m + 4, y + 12);
    doc.text(`Lugar: ${place}`, m + 90, y + 12);
    doc.text(`Fecha: ${dateFormatted}`, m + 160, y + 12);

    y += 24;

    // ---- INVENTORY TABLE ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(goldD[0], goldD[1], goldD[2]);
    doc.text('INVENTARIO', m, y);
    y += 5;

    const invH = ['Producto', 'Inicial', 'Final', 'Vendido'];
    const invW = [74, 30, 30, 38];
    const invRows = productKeys.map((key) => [
        PRODUCT_LABELS[key],
        String(initial[key]),
        String(final[key]),
        String(sold[key]),
    ]);

    y = drawTable(m, y, invH, invRows, invW);

    // ---- PRODUCTOS VENDIDOS ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(goldD[0], goldD[1], goldD[2]);
    doc.text('PRODUCTOS VENDIDOS', m, y);
    y += 5;

    const prodH = ['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal'];
    const prodW = [60, 26, 40, 46];
    const prodRows = productKeys.map((key) => [
        PRODUCT_LABELS[key],
        String(effectiveSold[key]),
        formatCOP(PRICES[key]),
        formatCOP(effectiveSold[key] * PRICES[key]),
    ]);

    // Add promo row if applicable
    if (promos > 0) {
        prodRows.push(['PROMOCION', String(promos), formatCOP(PROMO.price), formatCOP(promos * PROMO.price)]);
    }

    y = drawTable(m, y, prodH, prodRows, prodW, {
        rowNumbers: null,
    });

    // ---- RESUMEN TABLE ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(goldD[0], goldD[1], goldD[2]);
    doc.text('RESUMEN', m, y);
    y += 5;

    const sumRows = [
        ['Promociones', `${promos} x ${formatCOP(PROMO.price)}`, formatCOP(totals.promoTotal)],
        ['Descuentos', '', `- ${formatCOP(totals.discount)}`],
        ['Total Bruto', '', formatCOP(totals.grossTotal)],
        ['Total Neto', '', formatCOP(totals.netTotal)],
        ['Comision', commission.detail, formatCOP(commission.amount)],
        ['Dinero a Entregar', '', formatCOP(totals.netTotal - commission.amount)],
    ];

    const sumH = ['Concepto', 'Detalle', 'Valor'];
    const sumW = [52, 80, 40];
    const sumEnd = drawTable(m, y, sumH, sumRows, sumW);

    // Highlight the last row (Dinero a Entregar) with a colored box
    const tableStartY = y;
    const hdrH2 = 8;
    const rowH2 = 7;
    const lastRowY = tableStartY + hdrH2 + (sumRows.length - 1) * rowH2;
    const totalW2 = sumW.reduce((a, b) => a + b, 0);
    filledRect(m, lastRowY, totalW2, rowH2, [232, 248, 235]);
    doc.setDrawColor(76, 175, 80);
    doc.setLineWidth(0.5);
    doc.rect(m, lastRowY, totalW2, rowH2);

    // Redraw last row text on top of the highlight
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(46, 125, 50);
    cx = m;
    ['Dinero a Entregar', '', formatCOP(totals.netTotal - commission.amount)].forEach((val, ci) => {
        const align = ci === 0 ? 'left' : 'right';
        const tw = doc.getTextWidth(String(val));
        if (align === 'right') doc.text(String(val), cx + sumW[ci] - 2 - tw, lastRowY + 5);
        else doc.text(String(val), cx + 2, lastRowY + 5);
        cx += sumW[ci];
    });

    y = sumEnd;

    // ---- FOOTER ----
    y = ph - 12;
    doc.setDrawColor(200, 190, 175);
    doc.setLineWidth(0.3);
    doc.line(m, y - 2, pw - m, y - 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('FLOR Y LLANO — Sistema de Control de Inventario', m, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(`Pagina ${doc.internal.getNumberOfPages()}`, pw - m, y, { align: 'right' });

    doc.save(`Reporte_Ventas_${date}.pdf`);
}

// =============================================
// WHATSAPP
// =============================================

function sendToWhatsApp() {
    const { sold } = getSold();
    const promos = parseNumber(dom.cantidadPromociones);
    const discount = parseCurrency(dom.descuentosRealizados);
    const type = getCommissionType();
    const effectiveSold = getEffectiveSold(sold, promos);
    const totals = calculateTotals(effectiveSold, promos, discount);
    const commission = calculateCommission(type, totals);
    const name = dom.nombreVendedor.value.trim() || '(No especificado)';
    const place = dom.lugarTrabajo.value.trim() || '(No especificado)';
    const date = dom.fechaReporte.value || new Date().toISOString().split('T')[0];
    const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    let msg = 'FLOR Y LLANO - Reporte de Ventas\n';
    msg += `Vendedor: ${name}\n`;
    msg += `Lugar: ${place}\n`;
    msg += `Fecha: ${dateFormatted}\n\n`;
    msg += 'Productos Vendidos:\n';
    productKeys.forEach((key) => {
        msg += `- ${PRODUCT_LABELS[key]}: ${effectiveSold[key]}\n`;
    });
    msg += `\nPromociones: ${promos}\n`;
    msg += `Total Bruto: ${formatCOP(totals.grossTotal)}\n`;
    msg += `Descuentos: -${formatCOP(totals.discount)}\n`;
    msg += `Total Neto: ${formatCOP(totals.netTotal)}\n`;
    msg += `Comision: ${formatCOP(commission.amount)}\n`;
    msg += `Dinero a Entregar: ${formatCOP(totals.netTotal - commission.amount)}`;

    const url = 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
}

// =============================================
// INITIALIZATION
// =============================================

function setDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dom.fechaReporte.value = `${yyyy}-${mm}-${dd}`;
}

function attachEvents() {
    const allInputs = [
        ...Object.values(iniInputs),
        ...Object.values(finInputs),
        dom.cantidadPromociones,
        dom.descuentosRealizados,
    ];

    allInputs.forEach((input) => {
        input.addEventListener('input', updateAll);
    });

    document.querySelectorAll('input[name="tipoComision"]').forEach((radio) => {
        radio.addEventListener('change', updateAll);
    });

    dom.btnGenerarPDF.addEventListener('click', generatePDF);
    dom.btnWhatsapp.addEventListener('click', sendToWhatsApp);
}

function init() {
    setDefaultDate();
    if (dom.currentYear) {
        dom.currentYear.textContent = new Date().getFullYear();
    }
    attachEvents();
    updateAll();
}

document.addEventListener('DOMContentLoaded', init);
