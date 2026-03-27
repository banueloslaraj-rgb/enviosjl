const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔥 VARIABLE PARA PREVENIR DOBLE CLIC
let isSubmitting = false;

// Distancia simulada
function calcularDistancia() {
  return Math.floor(Math.random() * 6) + 1;
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

// Actualizar envío
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
  
  // 🔥 PREVENIR DOBLE CLIC
  if (isSubmitting) {
    alert("⏳ Ya se está enviando tu solicitud. Por favor espera...");
    return;
  }
  
  // 🔥 BLOQUEAR EL BOTÓN
  isSubmitting = true;
  const submitBtn = form.querySelector('button[type="submit"]');
  const textoOriginal = submitBtn.textContent;
  submitBtn.textContent = "⏳ Enviando...";
  submitBtn.disabled = true;

  try {
    const fotosInput = document.getElementById("fotos");
    let fotosUrls = [];

    // 🔥 SUBIR IMÁGENES
    for (let file of fotosInput.files) {
      const fileName = Date.now() + "-" + file.name;

      const { error } = await supabaseClient.storage
        .from("fotos")
        .upload(fileName, file);

      if (!error) {
        const { data } = supabaseClient.storage
          .from("fotos")
          .getPublicUrl(fileName);

        fotosUrls.push(data.publicUrl);
      }
    }

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
      fotos: fotosUrls,
      estado: "pendiente",
      fecha: new Date().toISOString() // 🔥 AGREGAR FECHA PARA ORDENAR
    };

    const { data } = await supabaseClient.from("pedidos").insert([datos]).select();

    const texto = `🚚 Nuevo pedido
📍 ${datos.recoleccion} → ${datos.entrega}
👤 ${datos.remitente} (${datos.tel_remitente})
👤 ${datos.destinatario} (${datos.tel_destinatario})
📦 ${datos.descripcion}
💰 $${datos.precio}
🚚 Envío: ${datos.envio}`;

    // 🔥 MOSTRAR MENSAJE DE ÉXITO
    const mensaje = document.getElementById("mensaje");
    mensaje.textContent = "✅ ¡Pedido enviado con éxito! Redirigiendo...";
    mensaje.style.color = "#28a745";
    
    window.location.href = `https://wa.me/5213111063251?text=${encodeURIComponent(texto)}`;
    
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error al enviar. Intenta de nuevo.");
    
    // 🔥 RESTAURAR BOTÓN EN CASO DE ERROR
    isSubmitting = false;
    submitBtn.textContent = textoOriginal;
    submitBtn.disabled = false;
    
    const mensaje = document.getElementById("mensaje");
    mensaje.textContent = "❌ Error al enviar. Intenta de nuevo.";
    mensaje.style.color = "#dc3545";
    setTimeout(() => {
      mensaje.textContent = "";
    }, 3000);
  }
});