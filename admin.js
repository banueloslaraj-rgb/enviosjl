// 🔐 PROTEGER - Verificar si está logueado como admin
if (localStorage.getItem("admin") !== "true") {
    window.location = "admin-login.html";
}

// 🔥 CONEXIÓN SUPABASE
const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables
let filtroEstado = null;
let intervaloActualizacion = null;
let pestañaActiva = "pedidos";
let ultimaCantidadPendientes = 0;

// Elementos del DOM
const contenedorPedidos = document.getElementById("pedidos");
const contenedorRepartidores = document.getElementById("repartidores");

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

// 🔒 Escapar HTML
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = "info") {
    const notif = document.createElement("div");
    notif.textContent = mensaje;
    notif.style.position = "fixed";
    notif.style.bottom = "20px";
    notif.style.right = "20px";
    notif.style.background = tipo === "error" ? "#dc3545" : "#27ae60";
    notif.style.color = "white";
    notif.style.padding = "10px 15px";
    notif.style.borderRadius = "10px";
    notif.style.zIndex = "1000";
    notif.style.animation = "fadeInOut 2s ease";
    notif.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    notif.style.fontSize = "13px";
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

// 🔄 ACTUALIZAR ESTADO DE PEDIDO + WHATSAPP (MULTIDISPOSITIVO)
async function actualizarEstadoPedido(id) {
    const selectElement = document.getElementById(`estado-${id}`);
    if (!selectElement) {
        alert("Error: No se encontró el selector para el pedido");
        return;
    }
    
    const nuevoEstado = selectElement.value;
    const confirmar = confirm(`¿Cambiar estado del pedido a "${nuevoEstado}"?`);
    if (!confirmar) return;
    
    const btn = event ? event.target : document.querySelector(`button[onclick*="actualizarEstadoPedido('${id}']`);
    const textoOriginal = btn ? btn.innerText : "Actualizar estado";
    
    if (btn) {
        btn.innerText = "⏳ Actualizando...";
        btn.disabled = true;
    }
    
    try {
        // 🔍 Obtener datos del pedido
        const { data: pedido, error: errorFetch } = await supabaseClient
            .from("pedidos")
            .select("*")
            .eq("id", id)
            .single();
        
        if (errorFetch) throw errorFetch;

        // 📝 Actualizar estado
        const { error } = await supabaseClient
            .from("pedidos")
            .update({ estado: nuevoEstado })
            .eq("id", id);
        
        if (error) throw new Error(error.message);
        
        mostrarNotificacion("✅ Estado actualizado correctamente", "info");

        // 📲 MENSAJES SEGÚN ESTADO
        let telefono = null;
        let mensaje = "";

        if (nuevoEstado === "asignado" && pedido.tel_remitente) {
            telefono = pedido.tel_remitente;
            mensaje = `🛵 *Pedido asignado*\n\nHola ${pedido.remitente}, tu pedido ya fue asignado a un repartidor.\n\n📦 ${pedido.descripcion}\n📍 Entrega: ${pedido.entrega}`;
        }

        if (nuevoEstado === "en camino" && pedido.tel_destinatario) {
            telefono = pedido.tel_destinatario;
            mensaje = `🚚 *Pedido en camino*\n\nHola ${pedido.destinatario}, tu pedido ya va en camino.\n\n📦 ${pedido.descripcion}`;
        }

        if (nuevoEstado === "entregado" && pedido.tel_remitente) {
            telefono = pedido.tel_remitente;
            mensaje = `✅ *Pedido entregado*\n\nHola ${pedido.remitente}, tu pedido ya fue entregado correctamente.\n\n📦 ${pedido.descripcion}`;
        }

        // 🚀 WHATSAPP UNIVERSAL
        if (telefono && mensaje) {
            const whatsappUrl = `https://api.whatsapp.com/send?phone=52${telefono}&text=${encodeURIComponent(mensaje)}`;

            setTimeout(() => {
                if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    window.location.href = whatsappUrl; // 📱 celular
                } else {
                    window.open(whatsappUrl, "_blank"); // 💻 computadora
                }
            }, 800);
        }

        setTimeout(() => {
            cargarPedidos();
        }, 500);
        
    } catch (error) {
        console.error("❌ Error:", error);
        mostrarNotificacion("❌ Error al actualizar: " + error.message, "error");
        
        if (btn) {
            btn.innerText = textoOriginal;
            btn.disabled = false;
        }
    }
}

// Filtrar por estado al hacer clic en las estadísticas
function filtrarPorEstado(estado) {
    filtroEstado = estado;
    cargarPedidos();
    
    // Scroll suave y resaltar la sección
    setTimeout(() => {
        const seccion = document.querySelector(`.seccion-${estado}`);
        if (seccion) {
            seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
            seccion.style.background = "#fff3cd";
            setTimeout(() => {
                seccion.style.background = "";
            }, 1500);
        }
    }, 500);
}

// Limpiar filtro
function limpiarFiltro() {
    filtroEstado = null;
    cargarPedidos();
}

// Alternar entregados
function toggleEntregados() {
    const container = document.getElementById("entregados-container");
    const icon = document.getElementById("toggle-icon");
    if (container) {
        if (container.style.display === "none") {
            container.style.display = "block";
            if (icon) icon.innerHTML = "▲";
        } else {
            container.style.display = "none";
            if (icon) icon.innerHTML = "▼";
        }
    }
}

// Renderizar card de pedido
function renderizarCardPedido(p) {
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
        } catch (e) {}
    }
    
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
    
    return `
        <div class="card ${getEstadoClass(p.estado)}">
            <div class="pedido-id">
                🆔 Pedido #${p.id.substring(0, 8)}...
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
            
            <button onclick="actualizarEstadoPedido('${p.id}')" style="margin-top: 5px; width:100%;">🔄 Actualizar estado</button>
            
            ${imagenesHtml}
        </div>
    `;
}

// 📦 Cargar pedidos con filtro
async function cargarPedidos() {
    if (!contenedorPedidos || pestañaActiva !== "pedidos") return;
    
    contenedorPedidos.innerHTML = '<div class="loader">🔄 Cargando pedidos...</div>';
    
    try {
        const { data, error } = await supabaseClient
            .from("pedidos")
            .select("*")
            .order("fecha", { ascending: false });
        
        if (error) {
            console.error("Error:", error);
            contenedorPedidos.innerHTML = `<div class="error-message">❌ Error: ${error.message}</div>`;
            return;
        }
        
        if (!data || data.length === 0) {
            contenedorPedidos.innerHTML = '<div class="empty-message">📭 No hay pedidos aún</div>';
            return;
        }
        
        // Separar por estados
        const pendientes = data.filter(p => p.estado === "pendiente");
        const asignados = data.filter(p => p.estado === "asignado");
        const enCamino = data.filter(p => p.estado === "en camino");
        const entregados = data.filter(p => p.estado === "entregado");
        
        // Verificar nuevos pedidos pendientes
        if (pendientes.length > ultimaCantidadPendientes) {
            const nuevos = pendientes.length - ultimaCantidadPendientes;
            mostrarNotificacion(`🔔 ${nuevos} nuevo(s) pedido(s) pendiente(s)`, "info");
            // Reproducir sonido opcional
            try {
                const audio = new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3");
                audio.volume = 0.2;
                audio.play();
            } catch(e) {}
        }
        ultimaCantidadPendientes = pendientes.length;
        
        // Actualizar estadísticas en las tarjetas originales
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards.length >= 1) {
            const pedidosStat = statCards[0].querySelector('.stat-number');
            if (pedidosStat) pedidosStat.textContent = data.length;
        }
        
        // Stats con filtros clickeables
        const statsHtml = `
            <div class="stats-filtros">
                <div class="stat-filtro pendiente-filtro" onclick="filtrarPorEstado('pendiente')">
                    <span class="stat-numero">${pendientes.length}</span>
                    <span class="stat-texto">Pendientes</span>
                </div>
                <div class="stat-filtro asignado-filtro" onclick="filtrarPorEstado('asignado')">
                    <span class="stat-numero">${asignados.length}</span>
                    <span class="stat-texto">Asignados</span>
                </div>
                <div class="stat-filtro encamino-filtro" onclick="filtrarPorEstado('en camino')">
                    <span class="stat-numero">${enCamino.length}</span>
                    <span class="stat-texto">En camino</span>
                </div>
                <div class="stat-filtro entregado-filtro" onclick="filtrarPorEstado('entregado')">
                    <span class="stat-numero">${entregados.length}</span>
                    <span class="stat-texto">Entregados</span>
                </div>
            </div>
        `;
        
        // Barra de filtro activo
        let filtroHtml = '';
        if (filtroEstado) {
            filtroHtml = `
                <div class="filtro-activo">
                    <span>🔍 Mostrando: <strong>${filtroEstado.toUpperCase()}</strong></span>
                    <button class="btn-limpiar-filtro" onclick="limpiarFiltro()">✖ Limpiar filtro</button>
                </div>
            `;
        }
        
        // Determinar qué pedidos mostrar según filtro
        let pedidosAMostrar = {};
        if (filtroEstado === 'pendiente') {
            pedidosAMostrar = { pendientes };
        } else if (filtroEstado === 'asignado') {
            pedidosAMostrar = { asignados };
        } else if (filtroEstado === 'en camino') {
            pedidosAMostrar = { enCamino };
        } else if (filtroEstado === 'entregado') {
            pedidosAMostrar = { entregados };
        } else {
            pedidosAMostrar = { pendientes, asignados, enCamino, entregados };
        }
        
        let html = statsHtml + filtroHtml;
        
        // Sección Pendientes
        if (pedidosAMostrar.pendientes && pedidosAMostrar.pendientes.length > 0) {
            html += `
                <div class="seccion-pedidos seccion-pendiente">
                    <div class="seccion-titulo pendiente-titulo">
                        📋 PENDIENTES (${pedidosAMostrar.pendientes.length})
                    </div>
                    ${pedidosAMostrar.pendientes.map(p => renderizarCardPedido(p)).join('')}
                </div>
            `;
        }
        
        // Sección Asignados
        if (pedidosAMostrar.asignados && pedidosAMostrar.asignados.length > 0) {
            html += `
                <div class="seccion-pedidos seccion-asignado">
                    <div class="seccion-titulo asignado-titulo">
                        🛵 ASIGNADOS (${pedidosAMostrar.asignados.length})
                    </div>
                    ${pedidosAMostrar.asignados.map(p => renderizarCardPedido(p)).join('')}
                </div>
            `;
        }
        
        // Sección En camino
        if (pedidosAMostrar.enCamino && pedidosAMostrar.enCamino.length > 0) {
            html += `
                <div class="seccion-pedidos seccion-encamino">
                    <div class="seccion-titulo encamino-titulo">
                        🚚 EN CAMINO (${pedidosAMostrar.enCamino.length})
                    </div>
                    ${pedidosAMostrar.enCamino.map(p => renderizarCardPedido(p)).join('')}
                </div>
            `;
        }
        
        // Sección Entregados
        if (pedidosAMostrar.entregados && pedidosAMostrar.entregados.length > 0) {
            html += `
                <div class="seccion-pedidos seccion-entregado">
                    <div class="seccion-titulo entregado-titulo" onclick="toggleEntregados()">
                        📦 ENTREGADOS (${pedidosAMostrar.entregados.length}) <span id="toggle-icon">▼</span>
                    </div>
                    <div id="entregados-container" style="display: none;">
                        ${pedidosAMostrar.entregados.map(p => renderizarCardPedido(p)).join('')}
                    </div>
                </div>
            `;
        }
        
        contenedorPedidos.innerHTML = html;
        
    } catch (error) {
        console.error("Error:", error);
        contenedorPedidos.innerHTML = `<div class="error-message">❌ Error: ${error.message}</div>`;
    }
}

// 🛵 Cargar repartidores
async function cargarRepartidores() {
    if (!contenedorRepartidores || pestañaActiva !== "repartidores") return;
    
    contenedorRepartidores.innerHTML = '<div class="loader">🔄 Cargando repartidores...</div>';
    
    try {
        const { data, error } = await supabaseClient
            .from("repartidores")
            .select("*")
            .order("fecha_registro", { ascending: false });
        
        if (error) {
            contenedorRepartidores.innerHTML = `<div class="error-message">❌ Error: ${error.message}</div>`;
            return;
        }
        
        if (!data || data.length === 0) {
            contenedorRepartidores.innerHTML = '<div class="empty-message">📭 No hay repartidores registrados</div>';
            return;
        }
        
        const activos = data.filter(r => r.estado === "activo").length;
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards.length >= 2) {
            const repartidoresStat = statCards[1].querySelector('.stat-number');
            if (repartidoresStat) repartidoresStat.textContent = data.length;
        }
        if (statCards.length >= 3) {
            const activosStat = statCards[2].querySelector('.stat-number');
            if (activosStat) activosStat.textContent = activos;
        }
        
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
                
                <button onclick="actualizarEstadoRepartidor('${r.id}')" style="margin-top: 5px; width:100%;">🔄 Actualizar estado</button>
            `;
            
            contenedorRepartidores.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error:", error);
        contenedorRepartidores.innerHTML = `<div class="error-message">❌ Error: ${error.message}</div>`;
    }
}

// 🔄 Actualizar estado de repartidor
async function actualizarEstadoRepartidor(id) {
    const selectElement = document.getElementById(`estado-rep-${id}`);
    if (!selectElement) return;
    
    const estado = selectElement.value;
    const btn = event ? event.target : document.querySelector(`button[onclick*="actualizarEstadoRepartidor('${id}']`);
    if (!btn) return;
    
    const textoOriginal = btn.innerText;
    btn.innerText = "⏳ Actualizando...";
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
        
        btn.innerText = "✅ Actualizado";
        
        const loginUrl = "https://banueloslaraj-rgb.github.io/enviosjl/login-repartidor.html";
        
        if (estado === "activo" && repartidor && repartidor.telefono) {
            const mensaje = `🎉 *¡FELICIDADES!* 🎉\n\nHola ${repartidor.nombre_completo}, tu registro como repartidor de Mandaditos Express ha sido *APROBADO* ✅\n\n🔑 Tu código de acceso es: *${repartidor.codigo}*\n\nIngresa a: ${loginUrl}\n\n¡Bienvenido al equipo! 🛵`;
            const whatsappUrl = `https://wa.me/52${repartidor.telefono}?text=${encodeURIComponent(mensaje)}`;
            
            setTimeout(() => {
                window.location.href = whatsappUrl;
            }, 500);
        }
        
        if (estado === "rechazado" && repartidor && repartidor.telefono) {
            const mensaje = `❌ *ACTUALIZACIÓN DE REGISTRO* ❌\n\nHola ${repartidor.nombre_completo}, lamentamos informarte que tu registro como repartidor ha sido *RECHAZADO*.\n\nPor favor contacta al administrador para más información.`;
            const whatsappUrl = `https://wa.me/52${repartidor.telefono}?text=${encodeURIComponent(mensaje)}`;
            
            setTimeout(() => {
                window.location.href = whatsappUrl;
            }, 500);
        }
        
        setTimeout(() => {
            cargarRepartidores();
        }, 2000);
        
    } catch (error) {
        mostrarNotificacion("❌ Error al actualizar estado", "error");
        btn.innerText = textoOriginal;
        btn.disabled = false;
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

// 📍 Abrir en Google Maps
function abrirMaps(dir) {
    if (!dir) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`);
}

// 📊 Cambiar de pestaña
function cambiarPestaña(pestaña) {
    pestañaActiva = pestaña;
    
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${pestaña}"]`);
    if (activeBtn) activeBtn.classList.add("active");
    
    if (contenedorPedidos) {
        contenedorPedidos.style.display = pestaña === "pedidos" ? "block" : "none";
    }
    if (contenedorRepartidores) {
        contenedorRepartidores.style.display = pestaña === "repartidores" ? "block" : "none";
    }
    
    if (pestaña === "pedidos") {
        cargarPedidos();
    } else if (pestaña === "repartidores") {
        cargarRepartidores();
    }
}

// 📊 Estadísticas rápidas (original)
async function cargarEstadisticas() {
    const { count: pedidosCount } = await supabaseClient
        .from("pedidos")
        .select("*", { count: 'exact', head: true });
    
    const { count: repartidoresCount } = await supabaseClient
        .from("repartidores")
        .select("*", { count: 'exact', head: true });
    
    const { count: activosCount } = await supabaseClient
        .from("repartidores")
        .select("*", { count: 'exact', head: true })
        .eq("estado", "activo");
    
    const estadisticasDiv = document.createElement("div");
    estadisticasDiv.className = "estadisticas";
    estadisticasDiv.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${pedidosCount || 0}</div>
                <div class="stat-label">Total pedidos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${repartidoresCount || 0}</div>
                <div class="stat-label">Repartidores registrados</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${activosCount || 0}</div>
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

// 🚀 Iniciar actualización automática
function iniciarActualizacionAutomatica() {
    // Actualizar cada 10 segundos
    intervaloActualizacion = setInterval(() => {
        if (pestañaActiva === "pedidos") {
            cargarPedidos();
        } else if (pestañaActiva === "repartidores") {
            cargarRepartidores();
        }
    }, 10000);
    
    // Actualizar al volver a la pestaña
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            if (pestañaActiva === "pedidos") {
                cargarPedidos();
            } else if (pestañaActiva === "repartidores") {
                cargarRepartidores();
            }
        }
    });
}

// Escuchar cambios en tiempo real con Supabase
function suscribirCambios() {
    supabaseClient
        .channel("admin-pedidos")
        .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, (payload) => {
            if (pestañaActiva === "pedidos") {
                cargarPedidos();
                mostrarNotificacion("📦 Lista de pedidos actualizada", "info");
            }
        })
        .subscribe();
    
    supabaseClient
        .channel("admin-repartidores")
        .on("postgres_changes", { event: "*", schema: "public", table: "repartidores" }, () => {
            if (pestañaActiva === "repartidores") {
                cargarRepartidores();
                mostrarNotificacion("🛵 Lista de repartidores actualizada", "info");
            }
        })
        .subscribe();
}

// 🚀 Inicializar
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Panel admin iniciado con actualización automática");
    cargarEstadisticas();
    cargarPedidos();
    iniciarActualizacionAutomatica();
    suscribirCambios();
});

// Exponer funciones globalmente
window.logout = logout;
window.abrirMaps = abrirMaps;
window.actualizarEstadoPedido = actualizarEstadoPedido;
window.actualizarEstadoRepartidor = actualizarEstadoRepartidor;
window.verDocumentosRepartidor = verDocumentosRepartidor;
window.cambiarPestaña = cambiarPestaña;
window.filtrarPorEstado = filtrarPorEstado;
window.limpiarFiltro = limpiarFiltro;
window.toggleEntregados = toggleEntregados;