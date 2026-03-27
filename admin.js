// 🔐 PROTEGER - Verificar si está logueado como admin
if (localStorage.getItem("admin") !== "true") {
    window.location = "admin-login.html";
}

// 🔥 CONEXIÓN SUPABASE
const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Elementos del DOM
const contenedorPedidos = document.getElementById("pedidos");
const contenedorRepartidores = document.getElementById("repartidores");
const tabs = document.querySelectorAll(".tab-btn");

// Variable para controlar pestaña activa
let pestañaActiva = "pedidos";

// 🚪 Cerrar sesión
function logout() {
    if (confirm("¿Seguro que quieres cerrar sesión?")) {
        localStorage.removeItem("admin");
        window.location = "admin-login.html";
    }
}

// Función para obtener color según estado
function getEstadoColor(estado) {
    switch(estado) {
        case "pendiente": return "#28a745";
        case "asignado": return "#007bff";
        case "en camino": return "#17a2b8";
        case "entregado": return "#6c757d";
        default: return "black";
    }
}

// Función para obtener clase CSS según estado
function getEstadoClass(estado) {
    switch(estado) {
        case "pendiente": return "estado-pendiente";
        case "asignado": return "estado-asignado";
        case "en camino": return "estado-en-camino";
        case "entregado": return "estado-entregado";
        default: return "";
    }
}

// Función para obtener badge del estado
function getEstadoBadge(estado) {
    const badges = {
        "pendiente": '<span class="estado-badge estado-pendiente-badge">📦 PENDIENTE</span>',
        "asignado": '<span class="estado-badge estado-asignado-badge">🛵 ASIGNADO</span>',
        "en camino": '<span class="estado-badge estado-en-camino-badge">🚚 EN CAMINO</span>',
        "entregado": '<span class="estado-badge estado-entregado-badge">✅ ENTREGADO</span>'
    };
    return badges[estado] || `<span class="estado-badge">${estado}</span>`;
}

// 📦 Cargar pedidos ordenados por fecha (más recientes primero)
async function cargarPedidos() {
    if (!contenedorPedidos) return;
    
    contenedorPedidos.innerHTML = '<div class="loader">🔄 Cargando pedidos...</div>';

    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("*")
        .order("fecha", { ascending: false });

    // LOGS PARA DIAGNÓSTICO
    console.log("=== DIAGNÓSTICO DE PEDIDOS ===");
    console.log("Cantidad de pedidos encontrados:", data?.length || 0);
    console.log("Primer pedido:", data?.[0]);
    console.log("Error:", error);
    
    // Verificar si hay RLS bloqueando
    if (error) {
        console.error("❌ Error al cargar pedidos:", error);
        if (error.message?.includes("row level security") || error.code === "42501") {
            contenedorPedidos.innerHTML = '<div class="error-message">⚠️ Error de permisos (RLS). Contacta al administrador para configurar las políticas de seguridad.</div>';
        } else {
            contenedorPedidos.innerHTML = '<div class="error-message">❌ Error cargando pedidos: ' + error.message + '</div>';
        }
        return;
    }

    if (!data || data.length === 0) {
        contenedorPedidos.innerHTML = '<div class="empty-message">📭 No hay pedidos aún</div>';
        return;
    }

    contenedorPedidos.innerHTML = "";

    data.forEach(p => {
        const card = document.createElement("div");
        card.className = `card ${getEstadoClass(p.estado)}`;
        
        // Formatear fecha
        let fechaFormateada = "Sin fecha";
        if (p.fecha) {
            const fechaObj = new Date(p.fecha);
            fechaFormateada = fechaObj.toLocaleString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Formatear imágenes
        let imagenesHtml = '';
        if (p.fotos && p.fotos.length > 0) {
            imagenesHtml = `
                <div class="imagenes">
                    <strong>📸 Fotos:</strong><br>
                    <div class="imagenes-container">
                        ${p.fotos.map(f => `<img src="${f}" onclick="window.open('${f}','_blank')" loading="lazy">`).join("")}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="pedido-id">
                🆔 Pedido #${p.id}
                <span class="pedido-fecha">📅 ${fechaFormateada}</span>
            </div>
            
            <p><strong>📍 Recolección:</strong> ${escapeHtml(p.recoleccion)}</p>
            <button class="map-btn" onclick="abrirMaps('${escapeHtml(p.recoleccion).replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

            <p><strong>📍 Entrega:</strong> ${escapeHtml(p.entrega)}</p>
            <button class="map-btn" onclick="abrirMaps('${escapeHtml(p.entrega).replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

            <p><strong>👤 Envía:</strong> ${escapeHtml(p.remitente)}</p>
            <p><strong>📞 Tel:</strong> ${escapeHtml(p.tel_remitente) || "No disponible"}</p>
            <a href="tel:${escapeHtml(p.tel_remitente)}" class="btn-call">📞 Llamar remitente</a>

            <p><strong>👤 Recibe:</strong> ${escapeHtml(p.destinatario)}</p>
            <p><strong>📞 Tel:</strong> ${escapeHtml(p.tel_destinatario) || "No disponible"}</p>
            <a href="tel:${escapeHtml(p.tel_destinatario)}" class="btn-call">📞 Llamar destinatario</a>

            <p><strong>📦 Descripción:</strong> ${escapeHtml(p.descripcion)}</p>
            <p><strong>💰 Pago producto:</strong> <strong style="color:#27ae60;">$${p.precio}</strong></p>
            <p><strong>🚚 Costo envío:</strong> <strong>${p.envio}</strong></p>
            <p><strong>🛵 Repartidor:</strong> ${p.repartidor_nombre ? `${escapeHtml(p.repartidor_nombre)} (${escapeHtml(p.repartidor_telefono)})` : "❌ Sin asignar"}</p>
            <p><strong>📊 Estado:</strong> ${getEstadoBadge(p.estado)}</p>

            <select id="estado-${p.id}" style="margin-top: 10px;">
                <option value="pendiente" ${p.estado === "pendiente" ? "selected" : ""}>📦 Pendiente</option>
                <option value="asignado" ${p.estado === "asignado" ? "selected" : ""}>🛵 Asignado</option>
                <option value="en camino" ${p.estado === "en camino" ? "selected" : ""}>🚚 En camino</option>
                <option value="entregado" ${p.estado === "entregado" ? "selected" : ""}>✅ Entregado</option>
            </select>

            <button onclick="actualizarEstadoPedido(${p.id})" style="margin-top: 5px;">🔄 Actualizar estado</button>

            ${imagenesHtml}
        `;

        contenedorPedidos.appendChild(card);
    });
}

// 🛵 Cargar repartidores
async function cargarRepartidores() {
    if (!contenedorRepartidores) return;
    
    contenedorRepartidores.innerHTML = '<div class="loader">🔄 Cargando repartidores...</div>';

    const { data, error } = await supabaseClient
        .from("repartidores")
        .select("*")
        .order("fecha_registro", { ascending: false });

    console.log("Repartidores cargados:", data);
    console.log("Error:", error);

    if (error) {
        if (error.message?.includes("row level security") || error.code === "42501") {
            contenedorRepartidores.innerHTML = '<div class="error-message">⚠️ Error de permisos (RLS). Contacta al administrador.</div>';
        } else {
            contenedorRepartidores.innerHTML = '<div class="error-message">❌ Error cargando repartidores</div>';
        }
        return;
    }

    if (!data || data.length === 0) {
        contenedorRepartidores.innerHTML = '<div class="empty-message">📭 No hay repartidores registrados</div>';
        return;
    }

    contenedorRepartidores.innerHTML = "";

    data.forEach(r => {
        const card = document.createElement("div");
        card.className = "card repartidor-card";
        
        // Formatear fecha
        let fechaFormateada = "Sin fecha";
        if (r.fecha_registro) {
            const fechaObj = new Date(r.fecha_registro);
            fechaFormateada = fechaObj.toLocaleString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Determinar color de estado
        let estadoColor = "";
        let estadoTexto = "";
        switch(r.estado) {
            case "activo":
                estadoColor = "#28a745";
                estadoTexto = "✅ ACTIVO";
                break;
            case "pendiente":
                estadoColor = "#ffc107";
                estadoTexto = "⏳ PENDIENTE";
                break;
            case "rechazado":
                estadoColor = "#dc3545";
                estadoTexto = "❌ RECHAZADO";
                break;
            default:
                estadoColor = "#6c757d";
                estadoTexto = r.estado.toUpperCase();
        }
        
        card.innerHTML = `
            <div class="repartidor-header">
                <strong>🛵 ${escapeHtml(r.nombre_completo)}</strong>
                <span class="repartidor-fecha">📅 ${fechaFormateada}</span>
            </div>
            
            <p><strong>📞 Teléfono:</strong> ${escapeHtml(r.telefono)}</p>
            <p><strong>✉️ Email:</strong> ${r.email ? escapeHtml(r.email) : "No especificado"}</p>
            <p><strong>🔑 Código:</strong> <span class="codigo-repartidor">${r.codigo}</span></p>
            <p><strong>🚗 Vehículo:</strong> ${escapeHtml(r.marca_vehiculo)} - ${escapeHtml(r.color_vehiculo)}</p>
            <p><strong>📊 Estado:</strong> <span style="color:${estadoColor}; font-weight:bold;">${estadoTexto}</span></p>
            
            <div class="documentos-buttons">
                <button class="btn-documentos" onclick="verDocumentosRepartidor('${r.id}', '${r.nombre_completo}')">📄 Ver documentos</button>
            </div>
            
            <select id="estado-rep-${r.id}" style="margin-top: 10px;">
                <option value="pendiente" ${r.estado === "pendiente" ? "selected" : ""}>⏳ Pendiente</option>
                <option value="activo" ${r.estado === "activo" ? "selected" : ""}>✅ Activo</option>
                <option value="rechazado" ${r.estado === "rechazado" ? "selected" : ""}>❌ Rechazado</option>
            </select>
            
            <button onclick="actualizarEstadoRepartidor(${r.id})" style="margin-top: 5px;">🔄 Actualizar estado</button>
        `;
        
        contenedorRepartidores.appendChild(card);
    });
}

// 📄 Ver documentos del repartidor
async function verDocumentosRepartidor(id, nombre) {
    const { data: repartidor, error } = await supabaseClient
        .from("repartidores")
        .select("*")
        .eq("id", id)
        .single();
    
    if (error) {
        alert("❌ Error al cargar documentos");
        return;
    }
    
    // Crear modal
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📄 Documentos de ${escapeHtml(nombre)}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">✖</button>
            </div>
            <div class="modal-body">
                <h4>🪪 Credencial de elector</h4>
                <div class="documentos-grid">
                    ${repartidor.credencial_frente ? `<div><strong>Frente:</strong><br><img src="${repartidor.credencial_frente}" onclick="window.open('${repartidor.credencial_frente}','_blank')" loading="lazy"></div>` : "<p>No disponible</p>"}
                    ${repartidor.credencial_reverso ? `<div><strong>Reverso:</strong><br><img src="${repartidor.credencial_reverso}" onclick="window.open('${repartidor.credencial_reverso}','_blank')" loading="lazy"></div>` : "<p>No disponible</p>"}
                </div>
                
                <h4>🏠 Comprobante de domicilio</h4>
                ${repartidor.comprobante_domicilio ? `<a href="${repartidor.comprobante_domicilio}" target="_blank" class="btn-documento-link">📄 Ver comprobante</a>` : "<p>No disponible</p>"}
                
                <h4>🚗 Licencia de conducir</h4>
                ${repartidor.licencia ? `<a href="${repartidor.licencia}" target="_blank" class="btn-documento-link">🚗 Ver licencia</a>` : "<p>No disponible (opcional)</p>"}
                
                <h4>📸 Foto del vehículo</h4>
                ${repartidor.foto_vehiculo ? `<img src="${repartidor.foto_vehiculo}" onclick="window.open('${repartidor.foto_vehiculo}','_blank')" class="documento-img" loading="lazy">` : "<p>No disponible</p>"}
                
                <h4>🔢 Foto de placas</h4>
                ${repartidor.foto_placas ? `<img src="${repartidor.foto_placas}" onclick="window.open('${repartidor.foto_placas}','_blank')" class="documento-img" loading="lazy">` : "<p>No disponible</p>"}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 🔄 Actualizar estado de pedido
async function actualizarEstadoPedido(id) {
    const selectElement = document.getElementById(`estado-${id}`);
    if (!selectElement) return;
    
    const estado = selectElement.value;
    const btn = event.target;
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Actualizando...";
    btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from("pedidos")
            .update({ estado })
            .eq("id", id);

        if (error) throw error;

        // Mostrar mensaje de éxito
        btn.textContent = "✅ Actualizado";
        setTimeout(() => {
            cargarPedidos();
        }, 500);
        
        // Notificar al cliente si el pedido fue entregado
        if (estado === "entregado") {
            const { data: pedido } = await supabaseClient
                .from("pedidos")
                .select("*")
                .eq("id", id)
                .single();
            
            if (pedido && pedido.tel_remitente) {
                const mensaje = `✅ *PEDIDO ENTREGADO* ✅

🆔 Pedido #${pedido.id}
📦 Descripción: ${pedido.descripcion}

Tu pedido ha sido marcado como entregado.

¡Gracias por usar Mandaditos Express! 🛵`;
                
                const url = `https://wa.me/${pedido.tel_remitente}?text=${encodeURIComponent(mensaje)}`;
                window.open(url, '_blank');
            }
        }
        
    } catch (error) {
        alert("❌ Error al actualizar estado");
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

// 🔄 Actualizar estado de repartidor
async function actualizarEstadoRepartidor(id) {
    const selectElement = document.getElementById(`estado-rep-${id}`);
    if (!selectElement) return;
    
    const estado = selectElement.value;
    const btn = event.target;
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Actualizando...";
    btn.disabled = true;

    try {
        // Obtener datos del repartidor antes de actualizar
        const { data: repartidor } = await supabaseClient
            .from("repartidores")
            .select("*")
            .eq("id", id)
            .single();
        
        const { error } = await supabaseClient
            .from("repartidores")
            .update({ estado })
            .eq("id", id);

        if (error) throw error;
        
        // Notificar al repartidor vía WhatsApp si fue activado
        if (estado === "activo" && repartidor && repartidor.telefono) {
            const mensaje = `🎉 *¡FELICIDADES!* 🎉

Hola ${repartidor.nombre_completo}, tu registro como repartidor de Mandaditos Express ha sido *APROBADO* ✅

🔑 Tu código de acceso es: *${repartidor.codigo}*

Ingresa a: ${window.location.origin}/login-repartidor.html

¡Bienvenido al equipo! 🛵`;
            
            const url = `https://wa.me/${repartidor.telefono}?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
        }
        
        // Notificar si fue rechazado
        if (estado === "rechazado" && repartidor && repartidor.telefono) {
            const mensaje = `❌ *ACTUALIZACIÓN DE REGISTRO* ❌

Hola ${repartidor.nombre_completo}, lamentamos informarte que tu registro como repartidor ha sido *RECHAZADO*.

Por favor contacta al administrador para más información: ${window.location.origin}`;
            
            const url = `https://wa.me/${repartidor.telefono}?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
        }
        
        btn.textContent = "✅ Actualizado";
        setTimeout(() => {
            cargarRepartidores();
        }, 500);
        
    } catch (error) {
        alert("❌ Error al actualizar estado");
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

// 📍 Abrir en Google Maps
function abrirMaps(dir) {
    if (!dir) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`);
}

// 🔒 Escapar HTML para prevenir XSS
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// 📊 Cambiar de pestaña
function cambiarPestaña(pestaña) {
    pestañaActiva = pestaña;
    
    // Actualizar clases de los botones
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    document.querySelector(`.tab-btn[data-tab="${pestaña}"]`).classList.add("active");
    
    // Mostrar/ocultar contenedores
    if (contenedorPedidos) {
        contenedorPedidos.style.display = pestaña === "pedidos" ? "block" : "none";
    }
    if (contenedorRepartidores) {
        contenedorRepartidores.style.display = pestaña === "repartidores" ? "block" : "none";
    }
    
    // Cargar datos según pestaña
    if (pestaña === "pedidos") {
        cargarPedidos();
    } else if (pestaña === "repartidores") {
        cargarRepartidores();
    }
}

// 🚀 Escuchar cambios en tiempo real
supabaseClient
    .channel("admin-pedidos")
    .on("postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
            if (pestañaActiva === "pedidos") {
                cargarPedidos();
            }
            // Mostrar notificación
            mostrarNotificacion("📦 Lista de pedidos actualizada");
        }
    )
    .subscribe();

supabaseClient
    .channel("admin-repartidores")
    .on("postgres_changes",
        { event: "*", schema: "public", table: "repartidores" },
        () => {
            if (pestañaActiva === "repartidores") {
                cargarRepartidores();
            }
            mostrarNotificacion("🛵 Lista de repartidores actualizada");
        }
    )
    .subscribe();

// 🔔 Mostrar notificación
function mostrarNotificacion(mensaje) {
    const notif = document.createElement("div");
    notif.textContent = mensaje;
    notif.style.position = "fixed";
    notif.style.bottom = "20px";
    notif.style.right = "20px";
    notif.style.background = "#27ae60";
    notif.style.color = "white";
    notif.style.padding = "10px 15px";
    notif.style.borderRadius = "10px";
    notif.style.zIndex = "1000";
    notif.style.animation = "fadeInOut 2s ease";
    notif.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

// 📊 Estadísticas rápidas
async function cargarEstadisticas() {
    const { data: pedidos } = await supabaseClient
        .from("pedidos")
        .select("*");
    
    const { data: repartidores } = await supabaseClient
        .from("repartidores")
        .select("*");
    
    const { data: repartidoresActivos } = await supabaseClient
        .from("repartidores")
        .select("*")
        .eq("estado", "activo");
    
    const estadisticasDiv = document.createElement("div");
    estadisticasDiv.className = "estadisticas";
    estadisticasDiv.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${pedidos ? pedidos.length : 0}</div>
                <div class="stat-label">Total pedidos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${repartidores ? repartidores.length : 0}</div>
                <div class="stat-label">Repartidores registrados</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${repartidoresActivos ? repartidoresActivos.length : 0}</div>
                <div class="stat-label">Repartidores activos</div>
            </div>
        </div>
    `;
    
    const container = document.querySelector(".container");
    const header = container.querySelector("h1");
    if (header && !document.querySelector(".estadisticas")) {
        header.insertAdjacentElement("afterend", estadisticasDiv);
    }
}

// 🚀 Inicializar todo
document.addEventListener("DOMContentLoaded", () => {
    // Crear tabs si no existen
    const container = document.querySelector(".container");
    if (container && !document.querySelector(".tabs")) {
        const tabsHtml = `
            <div class="tabs">
                <button class="tab-btn active" data-tab="pedidos" onclick="cambiarPestaña('pedidos')">📦 Pedidos</button>
                <button class="tab-btn" data-tab="repartidores" onclick="cambiarPestaña('repartidores')">🛵 Repartidores</button>
                <button class="logout-btn" onclick="logout()">🚪 Cerrar sesión</button>
            </div>
        `;
        const header = container.querySelector("h1");
        if (header) {
            header.insertAdjacentHTML("afterend", tabsHtml);
        }
    }
    
    // Crear contenedores si no existen
    if (!document.getElementById("pedidos")) {
        const pedidosDiv = document.createElement("div");
        pedidosDiv.id = "pedidos";
        container.appendChild(pedidosDiv);
    }
    
    if (!document.getElementById("repartidores")) {
        const repartidoresDiv = document.createElement("div");
        repartidoresDiv.id = "repartidores";
        repartidoresDiv.style.display = "none";
        container.appendChild(repartidoresDiv);
    }
    
    // Cargar estadísticas
    cargarEstadisticas();
    
    // Cargar datos iniciales
    cargarPedidos();
});

// Exponer funciones globalmente
window.logout = logout;
window.abrirMaps = abrirMaps;
window.actualizarEstadoPedido = actualizarEstadoPedido;
window.actualizarEstadoRepartidor = actualizarEstadoRepartidor;
window.verDocumentosRepartidor = verDocumentosRepartidor;
window.cambiarPestaña = cambiarPestaña;