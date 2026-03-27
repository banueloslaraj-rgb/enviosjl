// 🔐 PROTEGER
if(localStorage.getItem("admin")!=="true"){
  window.location="admin-login.html";
}

const supabaseClient = supabase.createClient(
"https://pknqqaxiqdllsygjctmb.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc"
);

const contenedor = document.getElementById("pedidos");

function logout(){
  localStorage.removeItem("admin");
  window.location="admin-login.html";
}

async function cargarPedidos(){
  const {data}=await supabaseClient.from("pedidos").select("*").order("id",{ascending:false});
  contenedor.innerHTML="";

  data.forEach(p=>{
    const card=document.createElement("div");
    card.className="card";

    card.innerHTML=`
    <p>📍 ${p.recoleccion}</p>
    <button onclick="abrirMaps('${p.recoleccion}')">Mapa</button>

    <p>📍 ${p.entrega}</p>
    <button onclick="abrirMaps('${p.entrega}')">Mapa</button>

    <p>👤 ${p.remitente}</p>
    <p>📞 ${p.tel_remitente}</p>
    <a href="tel:${p.tel_remitente}" class="btn-call">Llamar</a>

    <p>👤 ${p.destinatario}</p>
    <p>📞 ${p.tel_destinatario}</p>
    <a href="tel:${p.tel_destinatario}" class="btn-call">Llamar</a>

    <p>📦 ${p.descripcion}</p>
    <p>💰 $${p.precio}</p>
    <p>🚚 ${p.envio}</p>
    <p>${p.estado}</p>

    <select id="estado-${p.id}">
      <option>pendiente</option>
      <option>asignado</option>
      <option>en camino</option>
      <option>entregado</option>
    </select>

    <button onclick="actualizar(${p.id})">Actualizar</button>

    <div class="imagenes">
      ${(p.fotos||[]).map(f=>`<img src="${f}">`).join("")}
    </div>
    `;

    contenedor.appendChild(card);
  });
}

async function actualizar(id){
  const estado=document.getElementById(`estado-${id}`).value;
  await supabaseClient.from("pedidos").update({estado}).eq("id",id);
  cargarPedidos();
}

function abrirMaps(dir){
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`);
}

cargarPedidos();