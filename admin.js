const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let pedidosCache = [];
let repartidoresCache = [];
let intervaloActualizacion = null;
let ultimaCantidadActivos = 0;
let notificacionesActivas = true;

// Elementos DOM
const contenedorPedidos = document.getElementById("pedidos");
const contenedorRepartidores = document.getElementById("repartidores");

// Verificar autenticación
function verificarAutenticacion() {
    const adminAutenticado = localStorage.getItem("admin_autenticado");
    // Si quieres proteger, descomenta:
    // if (!adminAutenticado) window.location.href = "login-admin.html";
}

function logout() {
    if (confirm("¿Seguro que quieres cerrar sesión?")) {
        localStorage.removeItem("admin_autenticado");
        window.location.href = "index.html";
    }
}

function formatearFechaLocal(fechaISO) {
    if (!fechaISO) return "Sin fecha";
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function mostrarNotificacion(mensaje, tipo = "info") {
    if (!notificacionesActivas) return;
    
    const notification = document.createElement("div");
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === "error" ? "#dc3545" : "#27ae60"};
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1001;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    notification.innerHTML = `<i class="fas fa-bell"></i> ${mensaje}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

function cambiarPestaña(pestaña) {
    const pedidosDiv = document.getElementById("pedidos");
    const repartidoresDiv = document.getElementById("repartidores");
    const tabs = document.querySelectorAll(".tab-btn");
    
    if (pestaña === "pedidos") {
        pedidosDiv.style.display = "block";
        repartidoresDiv.style.display = "none";
        tabs.forEach(tab => tab.classList.remove("active"));
        document.querySelector('[data-tab="pedidos"]').classList.add("active");
        cargarPedidos();
    } else {
        pedidosDiv.style.display = "none";
        repartidoresDiv.style.display = "block";
        tabs.forEach(tab => tab.classList.remove("active"));
        document.querySelector('[data-tab="repartidores"]').classList.add("active");
        cargarRepartidores();
    }
}

async function cargarRepartidores() {
    if (!contenedorRepartidores) return;
    
    contenedorRepartidores.innerHTML = '<div class="loader">🔄 Cargando repartidores...</div>';
    
    const { data, error } = await supabaseClient
        .from("repartidores")
        .select("*")
        .order("fecha_registro", { ascending: false });
    
    if (error) {
        contenedorRepartidores.innerHTML = '<div style="color:red; text-align:center;">❌ Error al cargar repartidores</div>';
        return;
    }
    
    repartidoresCache = data || [];
    
    if (repartidoresCache.length === 0) {
        contenedorRepartidores.innerHTML = '<div style="text-align:center; padding:20px;">📭 No hay repartidores registrados</div>';
        return;
    }
    
    contenedorRepartidores.innerHTML = `
        <div class="stats-header">
            <h3>🛵 Repartidores Registrados (${repartidoresCache.length})</h3>
        </div>
        ${repartidoresCache.map(r => `
            <div class="repartidor-card">
                <div class="repartidor-header">
                    <strong>👤 ${r.nombre_completo}</strong>
                    <span class="repartidor-estado ${r.estado === 'activo' ? 'estado-activo' : 'estado-inactivo'}">
                        ${r.estado === 'activo' ? '🟢 Activo' : '🔴 Inactivo'}
                    </span>
                </div>
                <div class="repartidor-info">
                    <p><i class="fas fa-phone"></i> ${r.telefono}</p>
                    <p><i class="fas fa-envelope"></i> ${r.email}</p>
                    <p><i class="fas fa-motorcycle"></i> ${r.marca_vehicula || 'No especificado'} - ${r.color_vehicula || ''}</p>
                    <p><i class="fas fa-calendar"></i> Registrado: ${formatearFechaLocal(r.fecha_registro)}</p>
                </div>
            </div>
        `).join('')}
    `;
}

async function cargarPedidos() {
    if (!contenedorPedidos) return;
    
    contenedorPedidos.innerHTML = '<div class="loader">🔄 Cargando pedidos...</div>';
    
    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("*")
        .order("fecha", { ascending: false });
    
    if (error) {
        contenedorPedidos.innerHTML = '<div style="color:red; text-align:center;">❌ Error al cargar pedidos</div>';
        return;
    }
    
    pedidosCache = data || [];
    
    // Separar por estados
    const pendientes = pedidosCache.filter(p => p.estado === "pendiente");
    const asignados = pedidosCache.filter(p => p.estado === "asignado");
    const enCamino = pedidosCache.filter(p => p.estado === "en camino");
    const entregados = pedidosCache.filter(p => p.estado === "entregado");
    
    // Verificar nuevos pedidos pendientes
    if (pendientes.length > ultimaCantidadActivos) {
        const nuevos = pendientes.length - ultimaCantidadActivos;
        mostrarNotificacion(`🔔 ${nuevos} nuevo(s) pedido(s) pendiente(s)`, "info");
        try {
            const audio = new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3");
            audio.volume = 0.3;
            audio.play();
        } catch (e) {}
    }
    ultimaCantidadActivos = pendientes.length;
    
    if (pedidosCache.length === 0) {
        contenedorPedidos.innerHTML = '<div style="text-align:center; padding:20px;">📭 No hay pedidos registrados</div>';
        return;
    }
    
    let html = `
        <div class="stats-pedidos">
            <div class="stat-badge pendientes">
                <i class="fas fa-clock"></i>
                <span>${pendientes.length}</span>
                <small>Pendientes</small>
            </div>
            <div class="stat-badge asignados">
                <i class="fas fa-check-circle"></i>
                <span>${asignados.length}</span>
                <small>Asignados</small>
            </div>
            <div class="stat-badge encamino">
                <i class="fas fa-truck"></i>
                <span>${enCamino.length}</span>
                <small>En camino</small>
            </div>
            <div class="stat-badge entregados">
                <i class="fas fa-box"></i>
                <span>${entregados.length}</span>
                <small>Entregados</small>
            </div>
        </div>
    `;
    
    // Sección Pendientes
    if (pendientes.length > 0) {
        html += `
            <div class="seccion-pedidos">
                <div class="seccion-titulo pendientes-titulo">
                    <i class="fas fa-bell"></i> 📋 PENDIENTES (${pendientes.length})
                </div>
                <div class="pedidos-grid">
                    ${pendientes.map(p => renderizarPedidoAdmin(p)).join('')}
                </div>
            </div>
        `;
    }
    
    // Sección Asignados
    if (asignados.length > 0) {
        html += `
            <div class="seccion-pedidos">
                <div class="seccion-titulo asignados-titulo">
                    <i class="fas fa-check-circle"></i> ✅ ASIGNADOS (${asignados.length})
                </div>
                <div class="pedidos-grid">
                    ${asignados.map(p => renderizarPedidoAdmin(p)).join('')}
                </div>
            </div>
        `;
    }
    
    // Sección En camino
    if (enCamino.length > 0) {
        html += `
            <div class="seccion-pedidos">
                <div class="seccion-titulo encamino-titulo">
                    <i class="fas fa-truck"></i> 🚚 EN CAMINO (${enCamino.length})
                </div>
                <div class="pedidos-grid">
                    ${enCamino.map(p => renderizarPedidoAdmin(p)).join('')}
                </div>
            </div>
        `;
    }
    
    // Sección Entregados (colapsable)
    if (entregados.length > 0) {
        html += `
            <div class="seccion-pedidos entregados-seccion">
                <div class="seccion-titulo entregados-titulo" onclick="toggleEntregados()">
                    <i class="fas fa-chevron-down" id="toggle-icon"></i> 
                    📦 ENTREGADOS (${entregados.length})
                </div>
                <div id="entregados-container" class="pedidos-grid" style="display: none;">
                    ${entregados.map(p => renderizarPedidoAdmin(p)).join('')}
                </div>
            </div>
        `;
    }
    
    contenedorPedidos.innerHTML = html;
}

function renderizarPedidoAdmin(p) {
    const estadoClass = p.estado;
    const estadoTexto = p.estado === "pendiente" ? "📋 Pendiente" :
                       p.estado === "asignado" ? "✅ Asignado" :
                       p.estado === "en camino" ? "🚚 En camino" : "📦 Entregado";
    
    const estadoColor = p.estado === "pendiente" ? "#f39c12" :
                       p.estado === "asignado" ? "#27ae60" :
                       p.estado === "en camino" ? "#17a2b8" : "#6c757d";
    
    const fechaFormateada = formatearFechaLocal(p.fecha);
    
    let imagenesHtml = "";
    if (p.fotos && p.fotos.length > 0) {
        imagenesHtml = `
            <div class="admin-imagenes">
                <strong>📸 Fotos:</strong>
                <div class="admin-imagenes-container">
                    ${p.fotos.map(f => `<img src="${f}" onclick="verImagen('${f}')" loading="lazy">`).join("")}
                </div>
            </div>
        `;
    }
    
    return `
        <div class="admin-card ${estadoClass}">
            <div class="admin-card-header">
                <div>
                    <span class="admin-id">🆔 #${p.id.substring(0, 8)}...</span>
                    <span class="admin-fecha">📅 ${fechaFormateada}</span>
                </div>
                <span class="admin-estado" style="background: ${estadoColor}20; color: ${estadoColor}; border: 1px solid ${estadoColor}40;">
                    ${estadoTexto}
                </span>
            </div>
            
            <div class="admin-card-body">
                <div class="admin-direcciones">
                    <div class="direccion">
                        <i class="fas fa-map-marker-alt" style="color: #dc3545;"></i>
                        <strong>Recolección:</strong> ${p.recoleccion}
                        <button class="admin-map-btn" onclick="abrirMaps('${p.recoleccion.replace(/'/g, "\\'")}')">🗺️ Ver mapa</button>
                    </div>
                    <div class="direccion">
                        <i class="fas fa-flag-checkered" style="color: #28a745;"></i>
                        <strong>Entrega:</strong> ${p.entrega}
                        <button class="admin-map-btn" onclick="abrirMaps('${p.entrega.replace(/'/g, "\\'")}')">🗺️ Ver mapa</button>
                    </div>
                </div>
                
                <div class="admin-contactos">
                    <div class="contacto">
                        <i class="fas fa-user"></i> <strong>Remitente:</strong> ${p.remitente}
                        <a href="tel:${p.tel_remitente}" class="admin-call-btn">📞 ${p.tel_remitente}</a>
                        <a href="https://wa.me/52${p.tel_remitente?.replace(/[^0-9]/g, '')}" target="_blank" class="admin-wa-btn">💬 WhatsApp</a>
                    </div>
                    <div class="contacto">
                        <i class="fas fa-user"></i> <strong>Destinatario:</strong> ${p.destinatario}
                        <a href="tel:${p.tel_destinatario}" class="admin-call-btn">📞 ${p.tel_destinatario}</a>
                        <a href="https://wa.me/52${p.tel_destinatario?.replace(/[^0-9]/g, '')}" target="_blank" class="admin-wa-btn">💬 WhatsApp</a>
                    </div>
                </div>
                
                <div class="admin-detalles">
                    <p><strong>📦 Descripción:</strong> ${p.descripcion}</p>
                    <p><strong>💰 Pago producto:</strong> <span style="color:#27ae60; font-weight:bold;">$${p.precio}</span></p>
                    <p><strong>🚚 Costo envío:</strong> ${p.envio || "-"}</p>
                    ${p.repartidor_nombre ? `<p><strong>🛵 Repartidor:</strong> ${p.repartidor_nombre} (${p.repartidor_telefono})</p>` : ''}
                </div>
                
                ${imagenesHtml}
            </div>
        </div>
    `;
}

function toggleEntregados() {
    const entregadosContainer = document.getElementById("entregados-container");
    const toggleIcon = document.getElementById("toggle-icon");
    
    if (entregadosContainer) {
        if (entregadosContainer.style.display === "none") {
            entregadosContainer.style.display = "grid";
            if (toggleIcon) toggleIcon.style.transform = "rotate(180deg)";
        } else {
            entregadosContainer.style.display = "none";
            if (toggleIcon) toggleIcon.style.transform = "rotate(0deg)";
        }
    }
}

function abrirMaps(direccion) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    window.open(url, "_blank");
}

function verImagen(url) {
    window.open(url, "_blank");
}

function iniciarActualizacionAutomatica() {
    intervaloActualizacion = setInterval(() => {
        const pestañaActiva = document.querySelector(".tab-btn.active")?.dataset.tab;
        if (pestañaActiva === "pedidos") {
            cargarPedidos();
        } else if (pestañaActiva === "repartidores") {
            cargarRepartidores();
        }
    }, 10000);
    
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            const pestañaActiva = document.querySelector(".tab-btn.active")?.dataset.tab;
            if (pestañaActiva === "pedidos") {
                cargarPedidos();
            } else if (pestañaActiva === "repartidores") {
                cargarRepartidores();
            }
        }
    });
}

function suscribirCambios() {
    supabaseClient
        .channel("pedidos-admin")
        .on("postgres_changes",
            { event: "*", schema: "public", table: "pedidos" },
            () => {
                const pestañaActiva = document.querySelector(".tab-btn.active")?.dataset.tab;
                if (pestañaActiva === "pedidos") {
                    cargarPedidos();
                }
            }
        )
        .subscribe();
    
    supabaseClient
        .channel("repartidores-admin")
        .on("postgres_changes",
            { event: "*", schema: "public", table: "repartidores" },
            () => {
                const pestañaActiva = document.querySelector(".tab-btn.active")?.dataset.tab;
                if (pestañaActiva === "repartidores") {
                    cargarRepartidores();
                }
            }
        )
        .subscribe();
}

window.cambiarPestaña = cambiarPestaña;
window.logout = logout;
window.abrirMaps = abrirMaps;
window.verImagen = verImagen;
window.toggleEntregados = toggleEntregados;

verificarAutenticacion();
cargarPedidos();
iniciarActualizacionAutomatica();
suscribirCambios();