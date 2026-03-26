const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("pedidoForm");
const mensaje = document.getElementById("mensaje");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  mensaje.textContent = "Enviando...";

  const recoleccion = document.getElementById("recoleccion").value;
  const entrega = document.getElementById("entrega").value;
  const remitente = document.getElementById("remitente").value;
  const destinatario = document.getElementById("destinatario").value;
  const descripcion = document.getElementById("descripcion").value;
  const precio = document.getElementById("precio").value;
  const fotosInput = document.getElementById("fotos");

  let fotosUrls = [];

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

  const { error } = await supabaseClient.from("pedidos").insert([
    {
      recoleccion,
      entrega,
      remitente,
      destinatario,
      descripcion,
      precio,
      fotos: fotosUrls,
      estado: "pendiente"
    }
  ]);

  if (error) {
    mensaje.textContent = "Error ❌";
    console.error(error);
    return;
  }

  mensaje.textContent = "Pedido enviado ✅";

  // WhatsApp
  const texto = `🚚 *Nuevo pedido*
📍 Recolección: ${recoleccion}
📍 Entrega: ${entrega}
👤 Envía: ${remitente}
👤 Recibe: ${destinatario}
📦 ${descripcion}
💰 $${precio}`;

  const url = `https://wa.me/5213111063251?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");

  form.reset();
});