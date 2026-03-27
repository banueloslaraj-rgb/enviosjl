// 🔐 PROTEGER
if (localStorage.getItem("admin") !== "true") {
  window.location = "admin-login.html";
}

// 🔥 CONEXIÓN SUPABASE (CORRECTA)
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

// 📦 Cargar pedidos (CORREGIDO + DEBUG)
async function cargarPedidos() {

  contenedor.innerHTML = "Cargando pedidos...";

  const { data, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .order("id", { ascending: false });

  console.log("DATA:", data);
  console.log("ERROR:", error);

  // ❌ Si hay error
  if (error) {
    contenedor.innerHTML = "Error cargando pedidos ❌";
    return;
  }

  // 🚫 Si no hay pedidos
  if (!data || data.length === 0) {
    contenedor.innerHTML = "No hay pedidos aún 🚫";
    return;
  }

  // ✅ Mostrar pedidos
  contenedor.innerHTML = "";

  data.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p><strong>📍 Recolección:</strong> ${p.recoleccion}</p>
      <button onclick="abrirMaps('${p.recoleccion}')">Ver mapa</button>

      <p><strong>📍 Entrega:</strong> ${p.entrega}</p>
      <button onclick="abrirMaps('${p.entrega}')">Ver mapa</button>

      <p><strong>👤 Envía:</strong> ${p.remitente}</p>
      <p><strong>📞 Tel:</strong> ${p.tel_remitente || "No disponible"}</p>
      <a href="tel:${p.tel_remitente}" class="btn-call">📞 Llamar</a>

      <p><strong>👤 Recibe:</strong> ${p.destinatario}</p>
      <p><strong>📞 Tel:</strong> ${p.tel_destinatario || "No disponible"}</p>
      <a href="tel:${p.tel_destinatario}" class="btn-call">📞 Llamar</a>

      <p><strong>📦 Descripción:</strong> ${p.descripcion}</p>
      <p><strong>💰 Pago:</strong> $${p.precio}</p>
      <p><strong>🚚 Envío:</strong> ${p.envio}</p>
      <p><strong>📊 Estado:</strong> ${p.estado}</p>

      <select id="estado-${p.id}">
        <option ${p.estado==="pendiente"?"selected":""}>pendiente</option>
        <option ${p.estado==="asignado"?"selected":""}>asignado</option>
        <option ${p.estado==="en camino"?"selected":""}>en camino</option>
        <option ${p.estado==="entregado"?"selected":""}>entregado</option>
      </select>

      <button onclick="actualizar(${p.id})">Actualizar estado</button>

      <div class="imagenes">
        ${(p.fotos || []).map(f => `<img src="${f}">`).join("")}
      </div>
    `;

    contenedor.appendChild(card);
  });
}

// 🔄 Actualizar estado
async function actualizar(id) {
  const estado = document.getElementById(`estado-${id}`).value;

  await supabaseClient
    .from("pedidos")
    .update({ estado })
    .eq("id", id);

  cargarPedidos();
}

// 📍 Abrir en Google Maps
function abrirMaps(dir) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`);
}

// 🚀 Ejecutar
cargarPedidos();