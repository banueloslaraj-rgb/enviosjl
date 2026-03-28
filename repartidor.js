const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const contenedor = document.getElementById("pedidos");

// Obtener datos del repartidor desde localStorage
const repartidorId = localStorage.getItem("repartidor_id");
const repartidorNombre = localStorage.getItem("repartidor_nombre");
const repartidorTelefono = localStorage.getItem("repartidor_telefono");

// Verificar si está logueado
if (!repartidorId || !repartidorNombre) {
    window.location.href = "login-repartidor.html";
}

// Mostrar nombre del repartidor en el header
const nombreRepartidorSpan = document.getElementById("nombreRepartidor");
if (nombreRepartidorSpan) {
    nombreRepartidorSpan.textContent = repartidorNombre;
}

function cerrarSesion() {
    if (confirm("¿Seguro que quieres cerrar sesión?")) {
        localStorage.removeItem("repartidor_id");
        localStorage.removeItem("repartidor_nombre");
        localStorage.removeItem("repartidor_telefono");
        localStorage.removeItem("repartidor_codigo");
        window.location.href = "login-repartidor.html";
    }
}

// Función para enviar WhatsApp
function enviarWhatsApp(telefono, mensaje) {
    if (!telefono) return;
    const url = `https://wa.me/52${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// Función para enviar WhatsApp al administrador
function enviarWhatsAppAdmin(mensaje) {
    const adminWhatsApp = "5213111063251";
    const url = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

async function cargarPedidos() {
    if (!contenedor) return;
    
    contenedor.innerHTML = '<div class="loader">🔄 Cargando pedidos...</div>';

    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("*")
        .order("fecha", { ascending: false });

    if (error) {
        contenedor.innerHTML = '<div style="color:red; text-align:center;">❌ Error al cargar pedidos</div>';
        return;
    }

    contenedor.innerHTML = "";

    if (!data || data.length === 0) {
        contenedor.innerHTML = '<div style="text-align:center; padding:20px;">📭 No hay pedidos disponibles</div>';
        return;
    }

    data.forEach(p => {
        // Mostrar pedidos pendientes o asignados a este repartidor
        if (p.estado === "pendiente" || p.repartidor_id === repartidorId) {

            const card = document.createElement("div");
            card.className = "card";
            
            if (p.estado === "pendiente") {
                card.classList.add("estado-pendiente");
            } else if (p.estado === "asignado") {
                card.classList.add("estado-asignado");
            } else if (p.estado === "en camino") {
                card.classList.add("estado-en-camino");
            } else if (p.estado === "entregado") {
                card.classList.add("estado-entregado");
            }

            let fechaFormateada = "Sin fecha";
            if (p.fecha) {
                const fechaObj = new Date(p.fecha);
                fechaFormateada = fechaObj.toLocaleString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            let imagenesHtml = '';
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
                ${p.repartidor_nombre ? `<p><strong>🛵 Repartidor:</strong> ${p.repartidor_nombre} (${p.repartidor_telefono})</p>` : ''}
                ${imagenesHtml}
            `;

            const btnContainer = document.createElement("div");
            btnContainer.className = "botones-accion";

            if (p.estado === "pendiente") {
                const btnAceptar = document.createElement("button");
                btnAceptar.textContent = "✅ Aceptar pedido";
                btnAceptar.onclick = () => aceptarPedido(p.id, p.tel_remitente, p.remitente, p.recoleccion);
                btnContainer.appendChild(btnAceptar);
            }

            if (p.repartidor_id === repartidorId && p.estado === "asignado") {
                const btnEnCamino = document.createElement("button");
                btnEnCamino.textContent = "🚚 En camino (recogido)";
                btnEnCamino.onclick = () => cambiarEstadoEnCamino(p.id, p.tel_destinatario, p.destinatario, p.entrega);
                btnEnCamino.style.background = "#17a2b8";
                
                const btnEntregado = document.createElement("button");
                btnEntregado.textContent = "✅ Entregado";
                btnEntregado.onclick = () => cambiarEstadoEntregado(p.id, p.tel_remitente, p.remitente);
                btnEntregado.style.background = "#6c757d";
                
                btnContainer.appendChild(btnEnCamino);
                btnContainer.appendChild(btnEntregado);
            }

            if (p.repartidor_id === repartidorId && p.estado === "en camino") {
                const btnEntregado = document.createElement("button");
                btnEntregado.textContent = "✅ Marcar como entregado";
                btnEntregado.onclick = () => cambiarEstadoEntregado(p.id, p.tel_remitente, p.remitente);
                btnEntregado.style.background = "#28a745";
                btnContainer.appendChild(btnEntregado);
            }

            if (btnContainer.children.length > 0) {
                card.appendChild(btnContainer);
            }

            contenedor.appendChild(card);
        }
    });
}

// 1. ACEPTAR PEDIDO - Mensaje al REMITENTE: "Repartidor en camino a recolección"
async function aceptarPedido(id, telefonoRemitente, nombreRemitente, direccionRecoleccion) {
    if (!repartidorId) {
        alert("⚠️ Error de sesión. Inicia sesión nuevamente.");
        window.location.href = "login-repartidor.html";
        return;
    }

    const btn = event.target;
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Procesando...";
    btn.disabled = true;

    try {
        // Obtener datos del pedido
        const { data: pedido } = await supabaseClient
            .from("pedidos")
            .select("*")
            .eq("id", id)
            .single();
        
        // Actualizar pedido con datos del repartidor
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
        
        // Mensaje para el REMITENTE (quien envía el paquete)
        const mensajeRemitente = `🚚 *PEDIDO ACEPTADO* 🚚

Hola ${nombreRemitente}, tu pedido ha sido aceptado por un repartidor.

🛵 *Repartidor asignado:*
👤 Nombre: ${repartidorNombre}
📞 Teléfono: ${repartidorTelefono}

📍 *El repartidor está en camino a la dirección de recolección:*
${direccionRecoleccion}

🆔 Pedido #${pedido.id.substring(0, 8)}...

El repartidor llegará pronto para recoger tu paquete.`;
        
        // Mensaje para el administrador
        const mensajeAdmin = `🛵 *PEDIDO ACEPTADO* 🛵

🆔 Pedido #${pedido.id.substring(0, 8)}...
👤 Remitente: ${nombreRemitente} (${telefonoRemitente})

🛵 Repartidor:
👤 ${repartidorNombre}
📞 ${repartidorTelefono}

📍 Recolección: ${direccionRecoleccion}
📍 Entrega: ${pedido.entrega}

El repartidor está en camino a la recolección.`;
        
        // Enviar WhatsApp al REMITENTE
        if (telefonoRemitente) {
            enviarWhatsApp(telefonoRemitente, mensajeRemitente);
        }
        // Enviar WhatsApp al administrador
        enviarWhatsAppAdmin(mensajeAdmin);
        
        // Mostrar mensaje de éxito al repartidor
        alert("✅ Pedido aceptado. Se ha notificado al remitente que estás en camino a recogerlo.");
        
        cargarPedidos();
        
    } catch (error) {
        console.error("Error:", error);
        alert("❌ Error al aceptar pedido");
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

// 2. EN CAMINO - Mensaje al DESTINATARIO: "Pedido en camino a tu domicilio"
async function cambiarEstadoEnCamino(id, telefonoDestinatario, nombreDestinatario, direccionEntrega) {
    const btn = event.target;
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Actualizando...";
    btn.disabled = true;

    try {
        // Obtener datos del pedido
        const { data: pedido } = await supabaseClient
            .from("pedidos")
            .select("*")
            .eq("id", id)
            .single();
        
        await supabaseClient
            .from("pedidos")
            .update({ estado: "en camino" })
            .eq("id", id);
        
        // Mensaje para el DESTINATARIO (quien recibe el paquete)
        const mensajeDestinatario = `🚚 *PEDIDO EN CAMINO* 🚚

Hola ${nombreDestinatario}, tu pedido ya está en camino hacia tu domicilio.

🛵 Repartidor: ${repartidorNombre} (${repartidorTelefono})

📍 Dirección de entrega:
${direccionEntrega}

🆔 Pedido #${pedido.id.substring(0, 8)}...
📦 Descripción: ${pedido.descripcion}

El repartidor llegará pronto. Por favor, estate atento.`;
        
        // Mensaje para el administrador
        const mensajeAdmin = `🚚 *PEDIDO EN CAMINO* 🚚

🆔 Pedido #${pedido.id.substring(0, 8)}...
👤 Destinatario: ${nombreDestinatario} (${telefonoDestinatario})
🛵 Repartidor: ${repartidorNombre}

El repartidor ya recogió el paquete y está en camino a la entrega.`;
        
        // Enviar WhatsApp al DESTINATARIO
        if (telefonoDestinatario) {
            enviarWhatsApp(telefonoDestinatario, mensajeDestinatario);
        }
        // Enviar WhatsApp al administrador
        enviarWhatsAppAdmin(mensajeAdmin);
        
        // Mostrar mensaje de éxito al repartidor
        alert("✅ Pedido marcado como 'En camino'. Se ha notificado al destinatario.");
        
        cargarPedidos();
        
    } catch (error) {
        alert("❌ Error al actualizar estado");
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

// 3. ENTREGADO - Mensaje al REMITENTE: "Pedido entregado exitosamente"
async function cambiarEstadoEntregado(id, telefonoRemitente, nombreRemitente) {
    const btn = event.target;
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Actualizando...";
    btn.disabled = true;

    try {
        // Obtener datos del pedido
        const { data: pedido } = await supabaseClient
            .from("pedidos")
            .select("*")
            .eq("id", id)
            .single();
        
        await supabaseClient
            .from("pedidos")
            .update({ estado: "entregado" })
            .eq("id", id);
        
        // Mensaje para el REMITENTE (quien envió el paquete)
        const mensajeRemitente = `✅ *PEDIDO ENTREGADO* ✅

Hola ${nombreRemitente}, tu pedido ha sido entregado exitosamente.

🛵 Repartidor: ${repartidorNombre} (${repartidorTelefono})

📦 Descripción: ${pedido.descripcion}
📍 Dirección de entrega: ${pedido.entrega}

🆔 Pedido #${pedido.id.substring(0, 8)}...

¡Gracias por usar Mandaditos Express! 🛵
⭐ Califica tu experiencia: https://wa.me/5213111063251`;
        
        // Mensaje para el administrador
        const mensajeAdmin = `✅ *PEDIDO ENTREGADO* ✅

🆔 Pedido #${pedido.id.substring(0, 8)}...
👤 Remitente: ${nombreRemitente} (${telefonoRemitente})
🛵 Repartidor: ${repartidorNombre}

El pedido ha sido entregado correctamente.`;
        
        // Enviar WhatsApp al REMITENTE
        if (telefonoRemitente) {
            enviarWhatsApp(telefonoRemitente, mensajeRemitente);
        }
        // Enviar WhatsApp al administrador
        enviarWhatsAppAdmin(mensajeAdmin);
        
        // Mostrar mensaje de éxito al repartidor
        alert("✅ Pedido marcado como 'Entregado'. Se ha notificado al remitente.");
        
        cargarPedidos();
        
    } catch (error) {
        alert("❌ Error al actualizar estado");
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

function abrirMaps(direccion) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    window.open(url, "_blank");
}

function verImagen(url) {
    window.open(url, "_blank");
}

// Escuchar cambios en tiempo real
supabaseClient
    .channel("pedidos-repartidor")
    .on("postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => cargarPedidos()
    )
    .subscribe();

// Cargar pedidos
cargarPedidos();

// Exponer funciones globalmente
window.cerrarSesion = cerrarSesion;
window.abrirMaps = abrirMaps;
window.verImagen = verImagen;