const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const contenedor = document.getElementById("pedidos");

async function cargarPedidos() {
  const { data } = await supabaseClient
    .from("pedidos")
    .select("*")
    .order("fecha", { ascending: false });

  contenedor.innerHTML = "";

  data.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p>${p.recoleccion}</p>
      <p>${p.entrega}</p>
      <p>$${p.precio}</p>

      <select onchange="actualizar('${p.id}', this.value)">
        <option>pendiente</option>
        <option>asignado</option>
        <option>en camino</option>
        <option>entregado</option>
      </select>
    `;

    contenedor.appendChild(card);
  });
}

async function actualizar(id, estado) {
  await supabaseClient.from("pedidos").update({ estado }).eq("id", id);
  cargarPedidos();
}

cargarPedidos();