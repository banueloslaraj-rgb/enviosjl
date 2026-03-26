const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const contenedor = document.getElementById("pedidos");

let repartidor = localStorage.getItem("repartidor") || "";

function guardar() {
  const nombreInput = document.getElementById("nombre").value;

  if (!nombreInput) {
    alert("Escribe tu nombre");
    return;
  }

  localStorage.setItem("repartidor", nombreInput);
  repartidor = nombreInput;

  cargarPedidos();
}

async function cargarPedidos() {
  contenedor.innerHTML = "Cargando...";

  const { data } = await supabaseClient
    .from("pedidos")
    .select("*")
    .order("fecha", { ascending: false });

  contenedor.innerHTML = "";

  data.forEach(p => {

    if (p.estado === "pendiente" || p.repartidor_id === repartidor) {

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <p><strong>📍 Recolección:</strong> ${p.recoleccion}</p>
        <button onclick="abrirMaps('${p.recoleccion}')">📍 Ir a recolección</button>

        <p><strong>📍 Entrega:</strong> ${p.entrega}</p>
        <button onclick="abrirMaps('${p.entrega}')">📍 Ir a entrega</button>

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

        ${
          p.estado === "pendiente"
          ? `<button onclick="aceptarPedido('${p.id}')">Aceptar pedido</button>`
          : ""
        }

        ${
          p.repartidor_id === repartidor && p.estado !== "entregado"
          ? `
            <button onclick="cambiarEstado('${p.id}','en camino')">En camino</button>
            <button onclick="cambiarEstado('${p.id}','entregado')">Entregado</button>
          `
          : ""
        }

        <div class="imagenes">
          ${(p.fotos || []).map(f => `<img src="${f}" />`).join("")}
        </div>
      `;

      contenedor.appendChild(card);
    }

  });
}

async function aceptarPedido(id) {
  if (!repartidor) {
    alert("Guarda tu nombre primero");
    return;
  }

  await supabaseClient
    .from("pedidos")
    .update({ estado: "asignado", repartidor_id: repartidor })
    .eq("id", id);

  cargarPedidos();
}

async function cambiarEstado(id, estado) {
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