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

// 🔔 Notificación
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
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

// 🔥 FUNCIÓN MEJORADA (CON WHATSAPP)
async function actualizarEstadoPedido(id) {
    const selectElement = document.getElementById(`estado-${id}`);
    if (!selectElement) return;

    const nuevoEstado = selectElement.value;
    const confirmar = confirm(`¿Cambiar estado a "${nuevoEstado}"?`);
    if (!confirmar) return;

    const btn = event.target;
    const textoOriginal = btn.innerText;

    btn.innerText = "⏳ Actualizando...";
    btn.disabled = true;

    try {
        // Obtener pedido
        const { data: pedido, error: errorPedido } = await supabaseClient
            .from("pedidos")
            .select("*")
            .eq("id", id)
            .single();

        if (errorPedido) throw errorPedido;

        // Actualizar estado
        const { error } = await supabaseClient
            .from("pedidos")
            .update({ estado: nuevoEstado })
            .eq("id", id);

        if (error) throw error;

        mostrarNotificacion("✅ Estado actualizado");

        // 🎯 MENSAJES AUTOMÁTICOS
        let telefono = "";
        let mensaje = "";

        if (nuevoEstado === "asignado") {
            telefono = pedido.tel_remitente;
            mensaje = `🚚 *PEDIDO ACEPTADO* 🚚

Hola ${pedido.remitente}, tu pedido ha sido aceptado.

🛵 Repartidor: ${pedido.repartidor_nombre || "Asignado"}
📞 Tel: ${pedido.repartidor_telefono || "No disponible"}

📍 Recolección: ${pedido.recoleccion}

🆔 Pedido #${pedido.id.substring(0, 8)}...`;
        }

        if (nuevoEstado === "en camino") {
            telefono = pedido.tel_destinatario;
            mensaje = `🚚 *PEDIDO EN CAMINO* 🚚

Hola ${pedido.destinatario}, tu pedido va en camino.

🛵 ${pedido.repartidor_nombre || "Repartidor"}

📍 Entrega: ${pedido.entrega}`;
        }

        if (nuevoEstado === "entregado") {
            telefono = pedido.tel_remitente;
            mensaje = `✅ *PEDIDO ENTREGADO* ✅

Hola ${pedido.remitente}, tu pedido ha sido entregado.

¡Gracias por usar el servicio! 🛵`;
        }

        // Abrir WhatsApp
        if (telefono && mensaje) {
            const tel = telefono.replace(/[^0-9]/g, "");
            const url = `https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`;
            window.open(url, "_blank");
        }

        setTimeout(cargarPedidos, 500);

    } catch (error) {
        mostrarNotificacion("❌ Error: " + error.message, "error");
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}

// 📦 Cargar pedidos (simplificado, puedes dejar tu versión original si quieres)
async function cargarPedidos() {
    if (!contenedorPedidos) return;

    contenedorPedidos.innerHTML = "Cargando...";

    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("*")
        .order("fecha", { ascending: false });

    if (error) {
        contenedorPedidos.innerHTML = "Error";
        return;
    }

    contenedorPedidos.innerHTML = "";

    data.forEach(p => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <p><strong>Pedido:</strong> ${p.id}</p>
            <p><strong>Cliente:</strong> ${p.remitente}</p>
            <p><strong>Estado:</strong> ${p.estado}</p>

            <select id="estado-${p.id}">
                <option value="pendiente">Pendiente</option>
                <option value="asignado">Asignado</option>
                <option value="en camino">En camino</option>
                <option value="entregado">Entregado</option>
            </select>

            <button onclick="actualizarEstadoPedido('${p.id}')">
                Actualizar
            </button>
        `;

        contenedorPedidos.appendChild(div);
    });
}

// 🚀 Inicializar
document.addEventListener("DOMContentLoaded", () => {
    cargarPedidos();
});

// Exponer funciones
window.actualizarEstadoPedido = actualizarEstadoPedido;
window.logout = logout;