const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let nombre = localStorage.getItem("rep") || "";

function guardar() {
  nombre = document.getElementById("nombre").value;
  localStorage.setItem("rep", nombre);
  cargar();
}

async function cargar() {
  const { data } = await supabaseClient.from("pedidos").select("*");

  const cont = document.getElementById("pedidos");
  cont.innerHTML = "";

  data.forEach(p => {
    if (p.estado === "pendiente" || p.repartidor_id === nombre) {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <p>${p.descripcion}</p>
        <button onclick="aceptar('${p.id}')">Aceptar</button>
      `;

      cont.appendChild(card);
    }
  });
}

async function aceptar(id) {
  await supabaseClient
    .from("pedidos")
    .update({ estado: "asignado", repartidor_id: nombre })
    .eq("id", id);

  cargar();
}

cargar();