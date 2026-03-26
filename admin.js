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
    contenedor.innerHTML = "Error al cargar";
    return;
  }

  contenedor.innerHTML = "";

  data.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p><strong>📍 Recolección:</strong> ${p.recoleccion}</p>
      <p><strong>📍 Entrega:</strong> ${p.entrega}</p>
      <p><strong>👤 Envía:</strong> ${p.remitente}</p>
      <p><strong>👤 Recibe:</strong> ${p.destinatario}</p>
      <p><strong>📦 Descripción:</strong> ${p.descripcion}</p>
      <p><strong>💰 Precio:</strong> $${p.precio}</p>
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
  const select = document.getElementById(`estado-${id}`);
  const nuevoEstado = select.value;

  const { error } = await supabaseClient
    .from("pedidos")
    .update({ estado: nuevoEstado })
    .eq("id", id);

  if (error) {
    alert("Error ❌");
    console.error(error);
  } else {
    alert("Actualizado ✅");
    cargarPedidos();
  }
}

// Tiempo real 🔥
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

cargarPedidos();