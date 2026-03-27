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

// 📦 Cargar pedidos
async function cargarPedidos() {
  contenedor.innerHTML = '<div style="text-align:center; padding:20px;">🔄 Cargando pedidos...</div>';

  const { data, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .order("id", { ascending: false });

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
    card.className = "card";

    const fecha = p.fecha ? new Date(p.fecha).toLocaleString() : "Sin fecha";

    card.innerHTML = `
      <p><strong>🆔 Pedido #${p.id}</strong> <small>${fecha}</small></p>
      <p><strong>📍 Recolección:</strong> ${p.recoleccion}</p>
      <button onclick="abrirMaps('${p.recoleccion.replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

      <p><strong>📍 Entrega:</strong> ${p.entrega}</p>
      <button onclick="abrirMaps('${p.entrega.replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

      <p><strong>👤 Envía:</strong> ${p.remitente}</p>
      <p><strong>📞 Tel:</strong> ${p.tel_remitente || "No disponible"}</p>
      <a href="tel:${p.tel_remitente}" class="btn-call">📞 Llamar</a>

      <p><strong>👤 Recibe:</strong> ${p.destinatario}</p>
      <p><strong>📞 Tel:</strong> ${p.tel_destinatario || "No disponible"}</p>
      <a href="tel:${p.tel_destinatario}" class="btn-call">📞 Llamar</a>

      <p><strong>📦 Descripción:</strong> ${p.descripcion}</p>
      <p><strong>💰 Pago:</strong> $${p.precio}</p>
      <p><strong>🚚 Envío:</strong> ${p.envio}</p>
      <p><strong>🛵 Repartidor:</strong> ${p.repartidor_id || "Sin asignar"}</p>
      <p><strong>📊 Estado:</strong> <strong style="color:${getEstadoColor(p.estado)}">${p.estado.toUpperCase()}</strong></p>

      <select id="estado-${p.id}">
        <option ${p.estado === "pendiente" ? "selected" : ""}>pendiente</option>
        <option ${p.estado === "asignado" ? "selected" : ""}>asignado</option>
        <option ${p.estado === "en camino" ? "selected" : ""}>en camino</option>
        <option ${p.estado === "entregado" ? "selected" : ""}>entregado</option>
      </select>

      <button onclick="actualizarEstado(${p.id})">🔄 Actualizar estado</button>

      <div class="imagenes">
        ${(p.fotos || []).map(f => `<img src="${f}" onclick="window.open('${f}','_blank')">`).join("")}
      </div>
    `;

    contenedor.appendChild(card);
  });
}

function getEstadoColor(estado) {
  switch(estado) {
    case "pendiente": return "#28a745";
    case "asignado": return "#007bff";
    case "en camino": return "#17a2b8";
    case "entregado": return "#6c757d";
    default: return "black";
  }
}

// 🔄 Actualizar estado
async function actualizarEstado(id) {
  const estado = document.getElementById(`estado-${id}`).value;
  
  const btn = event.target;
  const textoOriginal = btn.textContent;
  btn.textContent = "⏳ Actualizando...";
  btn.disabled = true;

  try {
    await supabaseClient
      .from("pedidos")
      .update({ estado })
      .eq("id", id);

    cargarPedidos();
  } catch (error) {
    alert("Error al actualizar");
    btn.textContent = textoOriginal;
    btn.disabled = false;
  }
}

// 📍 Abrir en Google Maps
function abrirMaps(dir) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`);
}

// 🚀 Ejecutar
cargarPedidos();

// Escuchar cambios en tiempo real
supabaseClient
  .channel("admin-pedidos")
  .on("postgres_changes",
    { event: "*", schema: "public", table: "pedidos" },
    () => cargarPedidos()
  )
  .subscribe();