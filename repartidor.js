const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const contenedor = document.getElementById("pedidos");

let repartidor = localStorage.getItem("repartidor") || "";

// Guardar nombre del repartidor
function guardarNombre() {
  const nombre = document.getElementById("repartidorNombre").value;
  if (!nombre) return alert("Pon tu nombre");

  localStorage.setItem("repartidor", nombre);
  repartidor = nombre;
  cargarPedidos();
}

// Cargar pedidos
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

  data.forEach(pedido => {

    // Mostrar solo pedidos disponibles o asignados a él
    if (
      pedido.estado === "pendiente" ||
      pedido.repartidor_id === repartidor
    ) {

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <p><strong>📍 Recolección:</strong> ${pedido.recoleccion}</p>
        <p><strong>📍 Entrega:</strong> ${pedido.entrega}</p>
        <p><strong>📦:</strong> ${pedido.descripcion}</p>
        <p><strong>💰:</strong> $${pedido.precio}</p>
        <p><strong>Estado:</strong> ${pedido.estado}</p>

        ${
          pedido.estado === "pendiente"
          ? `<button onclick="aceptarPedido('${pedido.id}')">Aceptar</button>`
          : ""
        }

        ${
          pedido.repartidor_id === repartidor && pedido.estado !== "entregado"
          ? `
            <button onclick="cambiarEstado('${pedido.id}','en camino')">En camino</button>
            <button onclick="cambiarEstado('${pedido.id}','entregado')">Entregado</button>
          `
          : ""
        }

        <div>
          ${(pedido.fotos || []).map(f => `<img src="${f}" />`).join("")}
        </div>
      `;

      contenedor.appendChild(card);
    }
  });
}

// Aceptar pedido
async function aceptarPedido(id) {
  if (!repartidor) return alert("Primero guarda tu nombre");

  const { error } = await supabaseClient
    .from("pedidos")
    .update({
      estado: "asignado",
      repartidor_id: repartidor
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Error");
  } else {
    cargarPedidos();
  }
}

// Cambiar estado
async function cambiarEstado(id, estado) {
  const { error } = await supabaseClient
    .from("pedidos")
    .update({ estado })
    .eq("id", id);

  if (error) {
    console.error(error);
  } else {
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