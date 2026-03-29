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

// 🔄 ACTUALIZAR ESTADO DE PEDIDO + WHATSAPP
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
        // Obtener pedido
        const { data: pedido, error: errorFetch } = await supabaseClient
            .from("pedidos")
            .select("*")
            .eq("id", id)
            .single();
        
        if (errorFetch) throw errorFetch;

        // Actualizar estado
        const { error } = await supabaseClient
            .from("pedidos")
            .update({ estado: nuevoEstado })
            .eq("id", id);
        
        if (error) throw new Error(error.message);
        
        mostrarNotificacion("✅ Estado actualizado correctamente", "info");

        // WhatsApp automático
        let telefono = null;
        let mensaje = "";

        if (nuevoEstado === "asignado" && pedido.tel_remitente) {
            telefono = pedido.tel_remitente;
            mensaje = `🛵 *Tu pedido ha sido asignado*\n\nHola ${pedido.remitente}, tu pedido ya fue asignado a un repartidor.\n\n📦 Pedido: ${pedido.descripcion}\n📍 Entrega en: ${pedido.entrega}`;
        }

        if (nuevoEstado === "en camino" && pedido.tel_destinatario) {
            telefono = pedido.tel_destinatario;
            mensaje = `🚚 *Tu pedido va en camino*\n\nHola ${pedido.destinatario}, tu pedido ya va en camino.\n\n📦 Pedido: ${pedido.descripcion}`;
        }

        if (nuevoEstado === "entregado" && pedido.tel_remitente) {
            telefono = pedido.tel_remitente;
            mensaje = `✅ *Pedido entregado*\n\nHola ${pedido.remitente}, tu pedido ya fue entregado correctamente.\n\n📦 Pedido: ${pedido.descripcion}`;
        }

        if (telefono && mensaje) {
            const whatsappUrl = `https://wa.me/52${telefono}?text=${encodeURIComponent(mensaje)}`;
            setTimeout(() => {
                window.open(whatsappUrl, "_blank");
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