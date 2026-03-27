const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const contenedor = document.getElementById("pedidos");

// 🔐 PROTEGER ACCESO
async function verificarSesion() {
  const { data } = await supabaseClient.auth.getUser();

  if (!data.user) {
    window.location.href = "admin-login.html";
    return;
  }

  // Solo tu correo puede entrar
  if (data.user.email !== "enviosjl262@gmail.com") {
    alert("No autorizado");
    window.location.href = "admin-login.html";
  }
}

verificarSesion();

// 🚪 Cerrar sesión
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "admin-login.html";
}

// 📦 Cargar pedidos
async function cargarPedidos() {
  contenedor.innerHTML = "Cargando...";

  const { data } = await supabaseClient
    .from("pedidos")
    .select("*")
    .order("fecha", { ascending: false });

  contenedor.innerHTML = "";

  data.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p><strong>📍 Recolección:</strong> ${p.recoleccion}</p>
      <button onclick="abrirMaps('${p.recoleccion}')">📍 Ver mapa</button>

      <p><strong>📍 Entrega:</strong> ${p.entrega}</p>
      <button onclick="abrirMaps('${p.entrega}')">📍 Ver mapa</button>

      <p><strong>👤 Envía:</strong> ${p.remitente}</p>
      <p><strong>📞:</strong> ${p.tel_remitente}</p>
      <a href="tel:${p.tel_remitente}" class="btn-call">📞 Llamar</a>

      <p><strong>👤 Recibe:</strong> ${p.destinatario}</p>
      <p><strong>📞:</strong> ${p.tel_destinatario}</p>
      <a href="tel:${p.tel_destinatario}" class="btn-call">📞 Llamar</a>

      <p><strong>📦:</strong> ${p.descripcion}</p>
      <p><strong>💰:</strong> $${p.precio}</p>
      <p><strong>🚚:</strong> ${p.envio}</p>
      <p><strong>Estado:</strong> ${p.estado}</p>

      <select id="estado-${p.id}">
        <option>pendiente</option>
        <option>asignado</option>
        <option>en camino</option>
        <option>entregado</option>
      </select>

      <button onclick="actualizar('${p.id}')">Actualizar</button>

      <div class="imagenes">
        ${(p.fotos || []).map(f => `<img src="${f}" />`).join("")}
      </div>
    `;

    contenedor.appendChild(card);
  });
}

async function actualizar(id) {
  const estado = document.getElementById(`estado-${id}`).value;

  await supabaseClient
    .from("pedidos")
    .update({ estado })
    .eq("id", id);

  cargarPedidos();
}

function abrirMaps(dir) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`);
}

// 🔄 Tiempo real
supabaseClient
  .channel("pedidos")
  .on("postgres_changes",
    { event: "*", schema: "public", table: "pedidos" },
    () => cargarPedidos()
  )
  .subscribe();

cargarPedidos();