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
    contenedor.innerHTML = "Error al cargar";
    console.error(error);
    return;
  }

  contenedor.innerHTML = "";

  data.forEach(pedido => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p><strong>📍 Recolección:</strong> ${pedido.recoleccion}</p>
      <p><strong>📍 Entrega:</strong> ${pedido.entrega}</p>
      <p><strong>👤 Remitente:</strong> ${pedido.remitente}</p>
      <p><strong>👤 Destinatario:</strong> ${pedido.destinatario}</p>
      <p><strong>📦 Descripción:</strong> ${pedido.descripcion}</p>
      <p><strong>💰 Precio:</strong> $${pedido.precio}</p>
      <p class="estado">Estado: ${pedido.estado}</p>
      
      <select id="estado-${pedido.id}">
        <option value="pendiente">Pendiente</option>
        <option value="asignado">Asignado</option>
        <option value="en camino">En camino</option>
        <option value="entregado">Entregado</option>
      </select>

      <button onclick="actualizarEstado('${pedido.id}')">Actualizar</button>

      <div>
        ${(pedido.fotos || []).map(f => `<img src="${f}" />`).join("")}
      </div>
    `;

    contenedor.appendChild(card);
  });
}

async function actualizarEstado(id) {
  const select = document.getElementById(`estado-${id}`);
  const nuevoEstado = select.value;

  const { error } = await supabaseClient
    .from("pedidos")
    .update({ estado: nuevoEstado })
    .eq("id", id);

  if (error) {
    alert("Error al actualizar");
    console.error(error);
  } else {
    alert("Estado actualizado ✅");
    cargarPedidos();
  }
}

// Cargar al inicio
cargarPedidos();

// Actualización en tiempo real 🔥
supabaseClient
  .channel("pedidos")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "pedidos" },
    () => {
      cargarPedidos();
    }
  )
  .subscribe();