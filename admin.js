const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const contenedor = document.getElementById("pedidos");

async function cargarPedidos() {
  contenedor.innerHTML = "Cargando...";

  const { data, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) {
    console.error(error);
    contenedor.innerHTML = "Error";
    return;
  }

  contenedor.innerHTML = "";

  data.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p><strong>📍 Recolección:</strong> ${p.recoleccion}</p>
      <button onclick="abrirMaps('${p.recoleccion}')">📍 Ver en mapa</button>

      <p><strong>📍 Entrega:</strong> ${p.entrega}</p>
      <button onclick="abrirMaps('${p.entrega}')">📍 Ver en mapa</button>

      <p><strong>👤 Envía:</strong> ${p.remitente}</p>
      <p><strong>📞 Tel:</strong> ${p.tel_remitente || "No disponible"}</p>
      <a href="tel:${p.tel_remitente}" class="btn-call">📞 Llamar</a>

      <p><strong>👤 Recibe:</strong> ${p.destinatario}</p>
      <p><strong>📞 Tel:</strong> ${p.tel_destinatario || "No disponible"}</p>
      <a href="tel:${p.tel_destinatario}" class="btn-call">📞 Llamar</a>

      <p><strong>📦 Descripción:</strong> ${p.descripcion}</p>
      <p><strong>💰 Pago producto:</strong> $${p.precio}</p>
      <p><strong>🚚 Envío:</strong> ${p.envio || "-"}</p>
      <p><strong>📊 Estado:</strong> ${p.estado}</p>

      <select id="estado-${p.id}">
        <option value="pendiente">Pendiente</option>
        <option value="asignado">Asignado</option>
        <option value="en camino">En camino</option>
        <option value="entregado">Entregado</option>
      </select>

      <button onclick="actualizarEstado('${p.id}')">Actualizar estado</button>

      <div class="imagenes">
        ${(p.fotos || []).map(f => `<img src="${f}" />`).join("")}
      </div>
    `;

    contenedor.appendChild(card);
  });
}

async function actualizarEstado(id) {
  const estado = document.getElementById(`estado-${id}`).value;

  await supabaseClient
    .from("pedidos")
    .update({ estado })
    .eq("id", id);

  cargarPedidos();
}

function abrirMaps(direccion) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
  window.open(url, "_blank");
}

// Tiempo real
supabaseClient
  .channel("pedidos")
  .on("postgres_changes",
    { event: "*", schema: "public", table: "pedidos" },
    () => cargarPedidos()
  )
  .subscribe();

cargarPedidos();