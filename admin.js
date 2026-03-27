// 🔐 PROTEGER
if (localStorage.getItem("admin") !== "true") {
  window.location = "admin-login.html";
}

// 🔥 CONEXIÓN SUPABASE
const supabaseClient = supabase.createClient(
  "https://pknqqaxiqdllsygjctmb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc"
);

const contenedor = document.getElementById("pedidos");

// 🚪 Cerrar sesión
function logout() {
  localStorage.removeItem("admin");
  window.location = "admin-login.html";
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
  contenedor.innerHTML = '<div class="loader">🔄 Cargando pedidos...</div>';

  const { data, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .order("fecha", { ascending: false }); // 🔥 MÁS RECIENTES PRIMERO

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (error) {
    contenedor.innerHTML = '<div style="color:red;">❌ Error cargando pedidos</div>';
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = '<div style="text-align:center; padding:20px;">📭 No hay pedidos aún</div>';
    return;
  }

  contenedor.innerHTML = "";

  data.forEach(p => {
    const card = document.createElement("div");
    card.className = `card ${getEstadoClass(p.estado)}`; // 🔥 AÑADIR CLASE DE COLOR
    
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

    card.innerHTML = `
      <div class="pedido-id">
        🆔 Pedido #${p.id}
        <span class="pedido-fecha">📅 ${fechaFormateada}</span>
      </div>
      
      <p><strong>📍 Recolección:</strong> ${p.recoleccion}</p>
      <button onclick="abrirMaps('${p.recoleccion.replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

      <p><strong>📍 Entrega:</strong> ${p.entrega}</p>
      <button onclick="abrirMaps('${p.entrega.replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

      <p><strong>👤 Envía:</strong> ${p.remitente}</p>
      <p><strong>📞 Tel:</strong> ${p.tel_remitente || "No disponible"}</p>
      <a href="tel:${p.tel_remitente}" class="btn-call">📞 Llamar remitente</a>

      <p><strong>👤 Recibe:</strong> ${p.destinatario}</p>
      <p><strong>📞 Tel:</strong> ${p.tel_destinatario || "No disponible"}</p>
      <a href="tel:${p.tel_destinatario}" class="btn-call">📞 Llamar destinatario</a>

      <p><strong>📦 Descripción:</strong> ${p.descripcion}</p>
      <p><strong>💰 Pago producto:</strong> <strong style="color:#27ae60;">$${p.precio}</strong></p>
      <p><strong>🚚 Costo envío:</strong> <strong>${p.envio}</strong></p>
      <p><strong>🛵 Repartidor:</strong> ${p.repartidor_id || "❌ Sin asignar"}</p>
      <p><strong>📊 Estado:</strong> ${getEstadoBadge(p.estado)}</p>

      <select id="estado-${p.id}" style="margin-top: 10px;">
        <option value="pendiente" ${p.estado === "pendiente" ? "selected" : ""}>📦 Pendiente</option>
        <option value="asignado" ${p.estado === "asignado" ? "selected" : ""}>🛵 Asignado</option>
        <option value="en camino" ${p.estado === "en camino" ? "selected" : ""}>🚚 En camino</option>
        <option value="entregado" ${p.estado === "entregado" ? "selected" : ""}>✅ Entregado</option>
      </select>

      <button onclick="actualizarEstado(${p.id})" style="margin-top: 5px;">🔄 Actualizar estado</button>

      <div class="imagenes" style="margin-top: 10px;">
        <strong>📸 Fotos:</strong><br>
        ${(p.fotos || []).length > 0 ? 
          (p.fotos || []).map(f => `<img src="${f}" onclick="window.open('${f}','_blank')">`).join("") : 
          "No hay fotos"}
      </div>
    `;

    contenedor.appendChild(card);
  });
}

// 🔄 Actualizar estado
async function actualizarEstado(id) {
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

// Escuchar cambios en tiempo real
supabaseClient
  .channel("admin-pedidos")
  .on("postgres_changes",
    { event: "*", schema: "public", table: "pedidos" },
    () => {
      // Mostrar notificación visual de cambio
      const notif = document.createElement("div");
      notif.textContent = "🔄 Lista de pedidos actualizada";
      notif.style.position = "fixed";
      notif.style.bottom = "20px";
      notif.style.right = "20px";
      notif.style.background = "#27ae60";
      notif.style.color = "white";
      notif.style.padding = "10px 15px";
      notif.style.borderRadius = "10px";
      notif.style.zIndex = "1000";
      notif.style.animation = "pulse 0.5s ease";
      document.body.appendChild(notif);
      setTimeout(() => notif.remove(), 2000);
      
      cargarPedidos();
    }
  )
  .subscribe();

// 🚀 Ejecutar carga inicial
cargarPedidos();