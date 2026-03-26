const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Calcular distancia aproximada
function calcularDistancia() {
  return Math.floor(Math.random() * 6) + 1; // 1 a 6 km
}

// Calcular envío
function calcularEnvio(distancia, pago) {
  let costo = 0;

  if (distancia <= 2) costo = 40;
  else if (distancia <= 5) costo = 55;
  else costo = 70;

  costo += Math.floor(pago / 1000) * 10;

  return costo;
}

// Actualizar cálculo
function actualizarEnvio() {
  const pago = parseFloat(document.getElementById("pago").value || 0);
  if (!pago) return;

  const distancia = calcularDistancia();
  const envio = calcularEnvio(distancia, pago);

  document.getElementById("envioCalculado").value = `$${envio} aprox (${distancia} km)`;
}

document.getElementById("pago").addEventListener("input", actualizarEnvio);

const form = document.getElementById("pedidoForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const datos = {
    recoleccion: recoleccion.value,
    entrega: entrega.value,
    remitente: remitente.value,
    destinatario: destinatario.value,
    descripcion: descripcion.value,
    precio: pago.value,
    tel_remitente: telRemitente.value,
    tel_destinatario: telDestinatario.value,
    envio: envioCalculado.value,
    estado: "pendiente"
  };

  const { data } = await supabaseClient.from("pedidos").insert([datos]).select();

  const id = data[0].id;

  const texto = `🚚 Nuevo pedido
📍 ${datos.recoleccion} → ${datos.entrega}
👤 ${datos.remitente} (${datos.tel_remitente})
👤 ${datos.destinatario} (${datos.tel_destinatario})
📦 ${datos.descripcion}
💰 $${datos.precio}
🚚 Envío: ${datos.envio}`;

  window.location.href = `https://wa.me/5213111063251?text=${encodeURIComponent(texto)}`;
});