const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let repartidorId = null;
let repartidorNombre = null;
let repartidorTelefono = null;
let filtroActual = "todos";
let intervaloActualizacion = null;
let ultimaCantidadPendientes = 0;
let notificacionesActivas = true;

// Elementos DOM
const contenedor = document.getElementById("pedidos");
const nombreRepartidorSpan = document.getElementById("nombreRepartidor");
const connectionStatusSpan = document.getElementById("connection-status");
const lastUpdateSpan = document.getElementById("last-update");
const pendientesCountSpan = document.getElementById("pendientes-count");

// Obtener datos del repartidor desde localStorage
repartidorId = localStorage.getItem("repartidor_id");
repartidorNombre = localStorage.getItem("repartidor_nombre");
repartidorTelefono = localStorage.getItem("repartidor_telefono");

// Verificar si está logueado
if (!repartidorId || !repartidorNombre) {
    window.location.href = "login-repartidor.html";
}

// Mostrar nombre del repartidor
if (nombreRepartidorSpan) {
    nombreRepartidorSpan.textContent = repartidorNombre;
}

// Formatear fecha local
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

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = "info") {
    if (!notificacionesActivas) return;
    
    const notification = document.getElementById("notification");
    const messageSpan = document.getElementById("notification-message");
    
    if (notification && messageSpan) {
        messageSpan.textContent = mensaje;
        notification.classList.remove("hidden");
        
        const colors = {
            info: "#27ae60",
            warning: "#f39c12",
            error: "#e74c3c"
        };
        notification.style.backgroundColor = colors[tipo] || colors.info;
        
        setTimeout(() => {
            notification.classList.add("hidden");
        }, 3000);
    }
}

// Actualizar estado de conexión
function actualizarEstadoConexion(online) {
    if (connectionStatusSpan) {
        if (online) {
            connectionStatusSpan.innerHTML = '<i class="fas fa-circle"></i> Conectado';
            connectionStatusSpan.classList.remove("offline");
            connectionStatusSpan.classList.add("online");
        } else {
            connectionStatusSpan.innerHTML = '<i class="fas fa-circle"></i> Sin conexión';
            connectionStatusSpan.classList.remove("online");
            connectionStatusSpan.classList.add("offline");
        }
    }
}

// Actualizar timestamp
function actualizarTimestamp() {
    if (lastUpdateSpan) {
        const ahora = new Date();
        lastUpdateSpan.textContent = ahora.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// Función para abrir WhatsApp
function abrirWhatsApp(telefono, mensaje) {
    if (!telefono) return false;
    const telefonoLimpio = telefono.replace(/[^0-9]/g, '');
    const url = `https://wa.me/52${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.location.href = url;
    return true;
}

// Mostrar mensaje temporal
function mostrarMensajeRepartidor(texto, esExito = true) {
    const mensajeDiv = document.createElement("div");
    mensajeDiv.textContent = texto;
    mensajeDiv.style.position = "fixed";
    mensajeDiv.style.bottom = "80px";
    mensajeDiv.style.left = "50%";
    mensajeDiv.style.transform = "translateX(-50%)";
    mensajeDiv.style.backgroundColor = esExito ? "#28a745" : "#dc3545";
    mensajeDiv.style.color = "white";
    mensajeDiv.style.padding = "12px 20px";
    mensajeDiv.style.borderRadius = "10px";
    mensajeDiv.style.zIndex = "1000";
    mensajeDiv.style.fontWeight = "bold";
    mensajeDiv.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    mensajeDiv.style.textAlign = "center";
    document.body.appendChild(mensajeDiv);
    
    setTimeout(() => mensajeDiv.remove(), 3000);
}

// Aceptar pedido
async function aceptarPedido(id, telefonoRemitente, nombreRemitente, direccionRecoleccion) {
    const btn = event.target;
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Procesando...";
    btn.disabled = true;

    try {
        const { data: pedido } = await supabaseClient
            .from("pedidos")
            .select("*")
            .eq("id", id)
            .single();
        
        if (pedido.estado !== "pendiente") {
            mostrarMensajeRepartidor("⚠️ Este pedido ya fue aceptado por otro repartidor", false);
            btn.textContent = textoOriginal;
            btn.disabled = false;
            cargarPedidos();
            return;
        }
        
        const { error } = await supabaseClient
            .from("pedidos")
            .update({ 
                estado: "asignado", 
                repartidor_id: repartidorId,
                repartidor_nombre: repartidorNombre,
                repartidor_telefono: repartidorTelefono
            })
            .eq("id", id);
        
        if (error) throw error;
        
        const mensajeRemitente = `🚚 *PEDIDO ACEPTADO* 🚚

Hola ${nombreRemitente}, tu pedido ha sido aceptado.

🛵 *Repartidor:* ${repartidorNombre}
📞 *Teléfono:* ${repartidorTelefono}

📍 *Recolección:* ${direccionRecoleccion}

🆔 Pedido #${pedido.id.substring(0, 8)}...`;
        
        mostrarMensajeRepartidor("✅ Pedido aceptado");
        await cargarPedidos();
        
        setTimeout(() => {
            if (telefonoRemitente) abrirWhatsApp(telefonoRemitente, mensajeRemitente);
        }, 500);
        
        btn.textContent = textoOriginal;
        btn.disabled = false;
        
    } catch (error) {
        mostrarMensajeRepartidor("❌ Error: " + error.message, false);
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

// En camino
async function cambiarEstadoEnCamino(id, telefonoDestinatario, nombreDestinatario, direccionEntrega) {
    const btn = event.target;
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Actualizando...";
    btn.disabled = true;

    try {
        const { data: pedido } = await supabaseClient
            .from("pedidos")
            .select("*")
            .eq("id", id)
            .single();
        
        await supabaseClient
            .from("pedidos")
            .update({ estado: "en camino" })
            .eq("id", id);
        
        const mensajeDestinatario = `🚚 *PEDIDO EN CAMINO* 🚚

Hola ${nombreDestinatario}, tu pedido está en camino.

🛵 Repartidor: ${repartidorNombre} (${repartidorTelefono})

📍 Entrega: ${direccionEntrega}

El repartidor llegará pronto.`;
        
        mostrarMensajeRepartidor("✅ Marcado como En camino");
        await cargarPedidos();
        
        setTimeout(() => {
            if (telefonoDestinatario) abrirWhatsApp(telefonoDestinatario, mensajeDestinatario);
        }, 500);
        
        btn.textContent = textoOriginal;
        btn.disabled = false;
        
    } catch (error) {
        mostrarMensajeRepartidor("❌ Error: " + error.message, false);
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

// Entregado
async function cambiarEstadoEntregado(id, telefonoRemitente, nombreRemitente) {
    const btn = event.target;
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Actualizando...";
    btn.disabled = true;

    try {
        const { data: pedido } = await supabaseClient
            .from("pedidos")
            .select("*")
            .eq("id", id)
            .single();
        
        await supabaseClient
            .from("pedidos")
            .update({ estado: "entregado" })
            .eq("id", id);
        
        const mensajeRemitente = `✅ *PEDIDO ENTREGADO* ✅

Hola ${nombreRemitente}, tu pedido ha sido entregado.

🛵 Repartidor: ${repartidorNombre} (${repartidorTelefono})

¡Gracias por usar Mandaditos Express! 🛵`;
        
        mostrarMensajeRepartidor("✅ Pedido entregado");
        await cargarPedidos();
        
        setTimeout(() => {
            if (telefonoRemitente) abrirWhatsApp(telefonoRemitente, mensajeRemitente);
        }, 500);
        
        btn.textContent = textoOriginal;
        btn.disabled = false;
        
    } catch (error) {
        mostrarMensajeRepartidor("❌ Error: " + error.message, false);
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

// Función principal para cargar pedidos
async function cargarPedidos() {
    if (!contenedor) return;
    
    try {
        actualizarEstadoConexion(true);
        
        contenedor.innerHTML = '<div class="loader">🔄 Cargando pedidos...</div>';
        
        const { data, error } = await supabaseClient
            .from("pedidos")
            .select("*")
            .order("fecha", { ascending: false });
        
        if (error) throw error;
        
        // Filtrar según la selección del repartidor
        let pedidosMostrar = [];
        
        if (filtroActual === "todos") {
            // Todos: pendientes + sus pedidos activos (asignados/en camino)
            pedidosMostrar = data.filter(p => 
                p.estado === "pendiente" || 
                (p.repartidor_id === repartidorId && (p.estado === "asignado" || p.estado === "en camino"))
            );
        } else if (filtroActual === "pendiente") {
            // Solo pedidos pendientes disponibles
            pedidosMostrar = data.filter(p => p.estado === "pendiente");
        } else if (filtroActual === "asignado") {
            // Sus pedidos activos (asignados y en camino)
            pedidosMostrar = data.filter(p => 
                p.repartidor_id === repartidorId && 
                (p.estado === "asignado" || p.estado === "en camino")
            );
        } else if (filtroActual === "entregado") {
            // Solo sus pedidos entregados
            pedidosMostrar = data.filter(p => 
                p.repartidor_id === repartidorId && p.estado === "entregado"
            );
        }
        
        // Contar pendientes disponibles
        const pendientesDisponibles = data.filter(p => p.estado === "pendiente").length;
        if (pendientesCountSpan) pendientesCountSpan.textContent = pendientesDisponibles;
        
        // Verificar nuevos pedidos pendientes
        if (pendientesDisponibles > ultimaCantidadPendientes && filtroActual !== "entregado") {
            mostrarNotificacion(`🔔 ${pendientesDisponibles - ultimaCantidadPendientes} nuevo(s) pedido(s) disponible(s)`);
            try {
                const audio = new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3");
                audio.volume = 0.3;
                audio.play();
            } catch (e) {}
        }
        ultimaCantidadPendientes = pendientesDisponibles;
        
        actualizarTimestamp();
        
        if (pedidosMostrar.length === 0) {
            if (filtroActual === "entregado") {
                contenedor.innerHTML = '<div style="text-align:center; padding:20px;">📭 No has entregado ningún pedido aún</div>';
            } else {
                contenedor.innerHTML = '<div style="text-align:center; padding:20px;">📭 No hay pedidos que mostrar</div>';
            }
            return;
        }
        
        // Renderizar pedidos
        contenedor.innerHTML = "";
        pedidosMostrar.forEach(p => renderizarPedido(p));
        
    } catch (error) {
        console.error("Error:", error);
        actualizarEstadoConexion(false);
        contenedor.innerHTML = '<div style="color:red; text-align:center;">❌ Error al cargar pedidos</div>';
    }
}

// Renderizar un pedido individual
function renderizarPedido(p) {
    const card = document.createElement("div");
    card.className = "card";
    
    const estadoClass = p.estado === "pendiente" ? "estado-pendiente" :
                       p.estado === "asignado" ? "estado-asignado" :
                       p.estado === "en camino" ? "estado-en-camino" : "estado-entregado";
    card.classList.add(estadoClass);
    
    const fechaFormateada = formatearFechaLocal(p.fecha);
    
    let imagenesHtml = "";
    if (p.fotos && p.fotos.length > 0) {
        imagenesHtml = `
            <div class="imagenes">
                <strong>📸 Fotos del pedido:</strong>
                <div class="imagenes-container">
                    ${p.fotos.map(f => `<img src="${f}" onclick="verImagen('${f}')" loading="lazy">`).join("")}
                </div>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="pedido-header">
            <strong>🆔 Pedido #${p.id.substring(0, 8)}...</strong>
            <span class="pedido-fecha">📅 ${fechaFormateada}</span>
        </div>
        
        <p><strong>📍 Recolección:</strong> ${p.recoleccion}</p>
        <button class="map-btn" onclick="abrirMaps('${p.recoleccion.replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

        <p><strong>📍 Entrega:</strong> ${p.entrega}</p>
        <button class="map-btn" onclick="abrirMaps('${p.entrega.replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

        <p><strong>👤 Envía:</strong> ${p.remitente}</p>
        <p><strong>📞 Tel (Remitente):</strong> ${p.tel_remitente || "No disponible"}</p>
        <a href="tel:${p.tel_remitente}" class="btn-call">📞 Llamar al remitente</a>

        <p><strong>👤 Recibe:</strong> ${p.destinatario}</p>
        <p><strong>📞 Tel (Destinatario):</strong> ${p.tel_destinatario || "No disponible"}</p>
        <a href="tel:${p.tel_destinatario}" class="btn-call">📞 Llamar al destinatario</a>

        <p><strong>📦 Descripción:</strong> ${p.descripcion}</p>
        <p><strong>💰 Pago producto:</strong> <strong style="color:#27ae60;">$${p.precio}</strong></p>
        <p><strong>🚚 Envío:</strong> ${p.envio || "-"}</p>
        <p><strong>📊 Estado:</strong> <span class="estado-texto">${p.estado.toUpperCase()}</span></p>
        ${p.repartidor_nombre ? `<p><strong>🛵 Repartidor:</strong> ${p.repartidor_nombre}</p>` : ''}
        ${imagenesHtml}
    `;
    
    // Solo mostrar botones de acción si el pedido no está entregado
    if (p.estado !== "entregado") {
        const btnContainer = document.createElement("div");
        btnContainer.className = "botones-accion";
        
        if (p.estado === "pendiente") {
            const btnAceptar = document.createElement("button");
            btnAceptar.textContent = "✅ Aceptar pedido";
            btnAceptar.style.background = "linear-gradient(135deg, #28a745, #1e7e34)";
            btnAceptar.onclick = () => aceptarPedido(p.id, p.tel_remitente, p.remitente, p.recoleccion);
            btnContainer.appendChild(btnAceptar);
        }
        
        if (p.repartidor_id === repartidorId && p.estado === "asignado") {
            const btnEnCamino = document.createElement("button");
            btnEnCamino.textContent = "🚚 En camino (recogido)";
            btnEnCamino.style.background = "linear-gradient(135deg, #17a2b8, #117a8b)";
            btnEnCamino.onclick = () => cambiarEstadoEnCamino(p.id, p.tel_destinatario, p.destinatario, p.entrega);
            
            const btnEntregado = document.createElement("button");
            btnEntregado.textContent = "✅ Entregado";
            btnEntregado.style.background = "linear-gradient(135deg, #6c757d, #545b62)";
            btnEntregado.onclick = () => cambiarEstadoEntregado(p.id, p.tel_remitente, p.remitente);
            
            btnContainer.appendChild(btnEnCamino);
            btnContainer.appendChild(btnEntregado);
        }
        
        if (p.repartidor_id === repartidorId && p.estado === "en camino") {
            const btnEntregado = document.createElement("button");
            btnEntregado.textContent = "✅ Marcar como entregado";
            btnEntregado.style.background = "linear-gradient(135deg, #28a745, #1e7e34)";
            btnEntregado.onclick = () => cambiarEstadoEntregado(p.id, p.tel_remitente, p.remitente);
            btnContainer.appendChild(btnEntregado);
        }
        
        if (btnContainer.children.length > 0) {
            card.appendChild(btnContainer);
        }
    }
    
    contenedor.appendChild(card);
}

// Funciones auxiliares
function abrirMaps(direccion) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    window.open(url, "_blank");
}

function verImagen(url) {
    window.open(url, "_blank");
}

function cerrarSesion() {
    if (confirm("¿Seguro que quieres cerrar sesión?")) {
        localStorage.removeItem("repartidor_id");
        localStorage.removeItem("repartidor_nombre");
        localStorage.removeItem("repartidor_telefono");
        window.location.href = "login-repartidor.html";
    }
}

function refrescarManual() {
    mostrarMensajeRepartidor("🔄 Actualizando...");
    cargarPedidos();
}

// Configurar filtros
function configurarFiltros() {
    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            filtroActual = btn.dataset.filter;
            cargarPedidos();
        });
    });
}

// Iniciar actualización automática
function iniciarActualizacionAutomatica() {
    intervaloActualizacion = setInterval(() => {
        cargarPedidos();
    }, 10000);
    
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            cargarPedidos();
        }
    });
}

// Suscripción en tiempo real
function suscribirCambios() {
    supabaseClient
        .channel("pedidos-repartidor")
        .on("postgres_changes",
            { event: "*", schema: "public", table: "pedidos" },
            () => {
                cargarPedidos();
            }
        )
        .subscribe();
}

// Inicializar
configurarFiltros();
cargarPedidos();
iniciarActualizacionAutomatica();
suscribirCambios();

// Exponer funciones globales
window.cerrarSesion = cerrarSesion;
window.abrirMaps = abrirMaps;
window.verImagen = verImagen;
window.refrescarManual = refrescarManual;
window.aceptarPedido = aceptarPedido;
window.cambiarEstadoEnCamino = cambiarEstadoEnCamino;
window.cambiarEstadoEntregado = cambiarEstadoEntregado;