const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const contenedor = document.getElementById("pedidos");

let repartidor = localStorage.getItem("repartidor") || "";

// Guardar nombre
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

  data.forEach(p => {

    // Mostrar pedidos disponibles o asignados al repartidor
    if (p.estado === "pendiente" || p.repartidor_id === repartidor) {

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

// Aceptar pedido
async function aceptarPedido(id) {
  if (!repartidor) {
    alert("Primero guarda tu nombre");
    return;
  }

  const { error } = await supabaseClient
    .from("pedidos")
    .update({
      estado: "asignado",
      repartidor_id: repartidor
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Error ❌");
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