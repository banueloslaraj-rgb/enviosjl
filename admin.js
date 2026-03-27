// 🔐 PROTEGER - Verificar si está logueado como admin
if (localStorage.getItem("admin") !== "true") {
    window.location = "admin-login.html";
}

// 🔥 CONEXIÓN SUPABASE
const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Elementos del DOM - IDs CORRECTOS
const contenedorPedidos = document.getElementById("pedidos");
const contenedorRepartidores = document.getElementById("repartidores");

// Variable para controlar pestaña activa
let pestañaActiva = "pedidos";

// 🚪 Cerrar sesión
function logout() {
    if (confirm("¿Seguro que quieres cerrar sesión?")) {
        localStorage.removeItem("admin");
        window.location = "admin-login.html";
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

// 🔒 Escapar HTML para prevenir XSS
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// 📦 Cargar pedidos
async function cargarPedidos() {
    if (!contenedorPedidos) {
        console.error("❌ Contenedor de pedidos no encontrado");
        return;
    }
    
    contenedorPedidos.innerHTML = '<div class="loader">🔄 Cargando pedidos...</div>';
    
    console.log("=== CARGANDO PEDIDOS ===");
    
    try {
        const { data, error } = await supabaseClient
            .from("pedidos")
            .select("*")
            .order("fecha", { ascending: false });
        
        console.log("📦 Datos recibidos:", data);
        console.log("📊 Cantidad de pedidos:", data?.length);
        console.log("⚠️ Error:", error);
        
        if (error) {
            console.error("❌ Error en consulta:", error);
            contenedorPedidos.innerHTML = `<div class="error-message">❌ Error: ${error.message}</div>`;
            return;
        }
        
        if (!data || data.length === 0) {
            contenedorPedidos.innerHTML = '<div class="empty-message">📭 No hay pedidos aún</div>';
            return;
        }
        
        // Actualizar estadísticas
        actualizarContadorPedidos(data.length);
        
        console.log(`✅ Mostrando ${data.length} pedidos`);
        contenedorPedidos.innerHTML = "";
        
        data.forEach((p, index) => {
            console.log(`🎨 Renderizando pedido ${index + 1}: ID ${p.id}`);
            
            const card = document.createElement("div");
            card.className = `card ${getEstadoClass(p.estado)}`;
            
            // Formatear fecha
            let fechaFormateada = "Sin fecha";
            if (p.fecha) {
                try {
                    const fechaObj = new Date(p.fecha);
                    if (!isNaN(fechaObj.getTime())) {
                        fechaFormateada = fechaObj.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                } catch (e) {
                    console.error("Error formateando fecha:", e);
                }
            }
            
            // Formatear imágenes
            let imagenesHtml = '';
            if (p.fotos && Array.isArray(p.fotos) && p.fotos.length > 0) {
                imagenesHtml = `
                    <div class="imagenes">
                        <strong>📸 Fotos:</strong>
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
                
                <p><strong>📍 Recolección:</strong> ${escapeHtml(p.recoleccion) || "No especificado"}</p>
                <button class="map-btn" onclick="abrirMaps('${escapeHtml(p.recoleccion || "").replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>
                
                <p><strong>📍 Entrega:</strong> ${escapeHtml(p.entrega) || "No especificado"}</p>
                <button class="map-btn" onclick="abrirMaps('${escapeHtml(p.entrega || "").replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>
                
                <p><strong>👤 Envía:</strong> ${escapeHtml(p.remitente) || "No especificado"}</p>
                <p><strong>📞 Tel:</strong> ${escapeHtml(p.tel_remitente) || "No disponible"}</p>
                ${p.tel_remitente ? `<a href="tel:${escapeHtml(p.tel_remitente)}" class="btn-call">📞 Llamar remitente</a>` : ''}
                
                <p><strong>👤 Recibe:</strong> ${escapeHtml(p.destinatario) || "No especificado"}</p>
                <p><strong>📞 Tel:</strong> ${escapeHtml(p.tel_destinatario) || "No disponible"}</p>
                ${p.tel_destinatario ? `<a href="tel:${escapeHtml(p.tel_destinatario)}" class="btn-call">📞 Llamar destinatario</a>` : ''}
                
                <p><strong>📦 Descripción:</strong> ${escapeHtml(p.descripcion) || "No especificado"}</p>
                <p><strong>💰 Pago producto:</strong> <strong style="color:#27ae60;">$${p.precio || "0"}</strong></p>
                <p><strong>🚚 Costo envío:</strong> <strong>${p.envio || "No calculado"}</strong></p>
                <p><strong>🛵 Repartidor:</strong> ${p.repartidor_nombre ? `${escapeHtml(p.repartidor_nombre)} (${escapeHtml(p.repartidor_telefono)})` : "❌ Sin asignar"}</p>
                <p><strong>📊 Estado:</strong> ${getEstadoBadge(p.estado || "pendiente")}</p>
                
                <select id="estado-${p.id}" style="margin-top: 10px; width:100%; padding:10px; border-radius:8px;">
                    <option value="pendiente" ${p.estado === "pendiente" ? "selected" : ""}>📦 Pendiente</option>
                    <option value="asignado" ${p.estado === "asignado" ? "selected" : ""}>🛵 Asignado</option>
                    <option value="en camino" ${p.estado === "en camino" ? "selected" : ""}>🚚 En camino</option>
                    <option value="entregado" ${p.estado === "entregado" ? "selected" : ""}>✅ Entregado</option>
                </select>
                
                <button onclick="actualizarEstadoPedido(${p.id})" style="margin-top: 5px; width:100%;">🔄 Actualizar estado</button>
                
                ${imagenesHtml}
            `;
            
            contenedorPedidos.appendChild(card);
        });
        
    } catch (error) {
        console.error("❌ Error fatal en cargarPedidos:", error);
        contenedorPedidos.innerHTML = `<div class="error-message">❌ Error: ${error.message}</div>`;
    }
}

// Función para actualizar el contador de pedidos
function actualizarContadorPedidos(total) {
    const statNumber = document.querySelector('.stat-card:first-child .stat-number');
    if (statNumber) {
        statNumber.textContent = total;
    }
}

// 🛵 Cargar repartidores
async function cargarRepartidores() {
    if (!contenedorRepartidores) return;
    
    contenedorRepartidores.innerHTML = '<div class="loader">🔄 Cargando repartidores...</div>';
    
    try {
        const { data, error } = await supabaseClient
            .from("repartidores")
            .select("*")
            .order("fecha_registro", { ascending: false });
        
        console.log("🛵 Repartidores cargados:", data);
        
        if (error) {
            contenedorRepartidores.innerHTML = `<div class="error-message">❌ Error: ${error.message}</div>`;
            return;
        }
        
        if (!data || data.length === 0) {
            contenedorRepartidores.innerHTML = '<div class="empty-message">📭 No hay repartidores registrados</div>';
            return;
        }
        
        // Actualizar estadísticas
        const activos = data.filter(r => r.estado === "activo").length;
        actualizarContadorRepartidores(data.length, activos);
        
        contenedorRepartidores.innerHTML = "";
        
        data.forEach(r => {
            const card = document.createElement("div");
            card.className = "card repartidor-card";
            
            let fechaFormateada = "Sin fecha";
            if (r.fecha_registro) {
                try {
                    const fechaObj = new Date(r.fecha_registro);
                    if (!isNaN(fechaObj.getTime())) {
                        fechaFormateada = fechaObj.toLocaleString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                } catch (e) {}
            }
            
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
                    estadoTexto = r.estado?.toUpperCase() || "DESCONOCIDO";
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
                
                <select id="estado-rep-${r.id}" style="margin-top: 10px; width:100%; padding:10px; border-radius:8px;">
                    <option value="pendiente" ${r.estado === "pendiente" ? "selected" : ""}>⏳ Pendiente</option>
                    <option value="activo" ${r.estado === "activo" ? "selected" : ""}>✅ Activo</option>
                    <option value="rechazado" ${r.estado === "rechazado" ? "selected" : ""}>❌ Rechazado</option>
                </select>
                
                <button onclick="actualizarEstadoRepartidor(${r.id})" style="margin-top: 5px; width:100%;">🔄 Actualizar estado</button>
            `;
            
            contenedorRepartidores.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error cargando repartidores:", error);
        contenedorRepartidores.innerHTML = `<div class="error-message">❌ Error: ${error.message}</div>`;
    }
}

function actualizarContadorRepartidores(total, activos) {
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 2) {
        const repartidoresStat = statCards[1].querySelector('.stat-number');
        if (repartidoresStat) repartidoresStat.textContent = total;
    }
    if (statCards.length >= 3) {
        const activosStat = statCards[2].querySelector('.stat-number');
        if (activosStat) activosStat.textContent = activos;
    }
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
                    ${repartidor.credencial_frente ? `<div><strong>Frente:</strong><br><img src="${repartidor.credencial_frente}" onclick="window.open('${repartidor.credencial_frente}','_blank')" style="max-width:100%; border-radius:8px; cursor:pointer;"></div>` : "<p>No disponible</p>"}
                    ${repartidor.credencial_reverso ? `<div><strong>Reverso:</strong><br><img src="${repartidor.credencial_reverso}" onclick="window.open('${repartidor.credencial_reverso}','_blank')" style="max-width:100%; border-radius:8px; cursor:pointer;"></div>` : "<p>No disponible</p>"}
                </div>
                
                <h4>🏠 Comprobante de domicilio</h4>
                ${repartidor.comprobante_domicilio ? `<a href="${repartidor.comprobante_domicilio}" target="_blank" class="btn-documento-link">📄 Ver comprobante</a>` : "<p>No disponible</p>"}
                
                <h4>🚗 Licencia de conducir</h4>
                ${repartidor.licencia ? `<a href="${repartidor.licencia}" target="_blank" class="btn-documento-link">🚗 Ver licencia</a>` : "<p>No disponible (opcional)</p>"}
                
                <h4>📸 Foto del vehículo</h4>
                ${repartidor.foto_vehiculo ? `<img src="${repartidor.foto_vehiculo}" onclick="window.open('${repartidor.foto_vehiculo}','_blank')" style="max-width:100%; border-radius:8px; cursor:pointer;">` : "<p>No disponible</p>"}
                
                <h4>🔢 Foto de placas</h4>
                ${repartidor.foto_placas ? `<img src="${repartidor.foto_placas}" onclick="window.open('${repartidor.foto_placas}','_blank')" style="max-width:100%; border-radius:8px; cursor:pointer;">` : "<p>No disponible</p>"}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
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
        
        btn.textContent = "✅ Actualizado";
        setTimeout(() => cargarPedidos(), 500);
        
        if (estado === "entregado") {
            const { data: pedido } = await supabaseClient
                .from("pedidos")
                .select("*")
                .eq("id", id)
                .single();
            
            if (pedido && pedido.tel_remitente) {
                const mensaje = `✅ *PEDIDO ENTREGADO* ✅\n\n🆔 Pedido #${pedido.id}\n📦 Descripción: ${pedido.descripcion}\n\nTu pedido ha sido marcado como entregado.\n\n¡Gracias por usar Mandaditos Express! 🛵`;
                window.open(`https://wa.me/${pedido.tel_remitente}?text=${encodeURIComponent(mensaje)}`, '_blank');
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
        
        if (estado === "activo" && repartidor && repartidor.telefono) {
            const mensaje = `🎉 *¡FELICIDADES!* 🎉\n\nHola ${repartidor.nombre_completo}, tu registro como repartidor de Mandaditos Express ha sido *APROBADO* ✅\n\n🔑 Tu código de acceso es: *${repartidor.codigo}*\n\nIngresa a: ${window.location.origin}/login-repartidor.html\n\n¡Bienvenido al equipo! 🛵`;
            window.open(`https://wa.me/${repartidor.telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }
        
        if (estado === "rechazado" && repartidor && repartidor.telefono) {
            const mensaje = `❌ *ACTUALIZACIÓN DE REGISTRO* ❌\n\nHola ${repartidor.nombre_completo}, lamentamos informarte que tu registro como repartidor ha sido *RECHAZADO*.\n\nPor favor contacta al administrador para más información.`;
            window.open(`https://wa.me/${repartidor.telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }
        
        btn.textContent = "✅ Actualizado";
        setTimeout(() => cargarRepartidores(), 500);
        
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

// 📊 Cambiar de pestaña
function cambiarPestaña(pestaña) {
    pestañaActiva = pestaña;
    
    // Actualizar clases de los botones
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${pestaña}"]`);
    if (activeBtn) activeBtn.classList.add("active");
    
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
    const { data: pedidos } = await supabaseClient.from("pedidos").select("*", { count: 'exact', head: true });
    const { data: repartidores } = await supabaseClient.from("repartidores").select("*", { count: 'exact', head: true });
    const { data: repartidoresActivos } = await supabaseClient.from("repartidores").select("*", { count: 'exact', head: true }).eq("estado", "activo");
    
    const estadisticasDiv = document.createElement("div");
    estadisticasDiv.className = "estadisticas";
    estadisticasDiv.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${pedidos?.length || 0}</div>
                <div class="stat-label">Total pedidos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${repartidores?.length || 0}</div>
                <div class="stat-label">Repartidores registrados</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${repartidoresActivos?.length || 0}</div>
                <div class="stat-label">Repartidores activos</div>
            </div>
        </div>
    `;
    
    const container = document.querySelector(".container");
    const header = container?.querySelector("h1");
    if (header && !document.querySelector(".estadisticas")) {
        header.insertAdjacentElement("afterend", estadisticasDiv);
    }
}

// Escuchar cambios en tiempo real
supabaseClient
    .channel("admin-pedidos")
    .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
        if (pestañaActiva === "pedidos") cargarPedidos();
        mostrarNotificacion("📦 Lista de pedidos actualizada");
    })
    .subscribe();

supabaseClient
    .channel("admin-repartidores")
    .on("postgres_changes", { event: "*", schema: "public", table: "repartidores" }, () => {
        if (pestañaActiva === "repartidores") cargarRepartidores();
        mostrarNotificacion("🛵 Lista de repartidores actualizada");
    })
    .subscribe();

// 🚀 Inicializar todo
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Inicializando panel admin...");
    console.log("📦 Contenedor pedidos:", contenedorPedidos);
    console.log("🛵 Contenedor repartidores:", contenedorRepartidores);
    
    cargarEstadisticas();
    cargarPedidos();
});

// Exponer funciones globalmente
window.logout = logout;
window.abrirMaps = abrirMaps;
window.actualizarEstadoPedido = actualizarEstadoPedido;
window.actualizarEstadoRepartidor = actualizarEstadoRepartidor;
window.verDocumentosRepartidor = verDocumentosRepartidor;
window.cambiarPestaña = cambiarPestaña;