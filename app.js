const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variable para controlar si ya se está enviando
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

// Validar que todos los campos estén llenos
function validarFormulario() {
    const campos = [
        "recoleccion",
        "entrega", 
        "remitente",
        "telRemitente",
        "destinatario",
        "telDestinatario",
        "descripcion",
        "pago"
    ];
    
    for (let campo of campos) {
        const elemento = document.getElementById(campo);
        if (!elemento || !elemento.value.trim()) {
            alert(`❌ Por favor completa el campo: ${campo}`);
            elemento?.focus();
            return false;
        }
    }
    
    const pago = parseFloat(document.getElementById("pago").value);
    if (isNaN(pago) || pago <= 0) {
        alert("❌ Por favor ingresa un monto válido");
        return false;
    }
    
    return true;
}

// Generar un ID único basado en timestamp y datos
function generarIdUnico() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
}

const form = document.getElementById("pedidoForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // 1. Prevenir envíos duplicados
    if (isSubmitting) {
        alert("⏳ Ya se está enviando tu solicitud. Por favor espera...");
        return;
    }
    
    // 2. Validar formulario
    if (!validarFormulario()) {
        return;
    }
    
    // 3. Bloquear el botón
    isSubmitting = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn.textContent;
    submitBtn.textContent = "⏳ Enviando solicitud...";
    submitBtn.disabled = true;
    
    try {
        // Obtener valores
        const recoleccion = document.getElementById("recoleccion").value.trim();
        const entrega = document.getElementById("entrega").value.trim();
        const remitente = document.getElementById("remitente").value.trim();
        const telRemitente = document.getElementById("telRemitente").value.trim();
        const destinatario = document.getElementById("destinatario").value.trim();
        const telDestinatario = document.getElementById("telDestinatario").value.trim();
        const descripcion = document.getElementById("descripcion").value.trim();
        const pago = parseFloat(document.getElementById("pago").value);
        const envioCalculado = document.getElementById("envioCalculado").value;
        const fotosInput = document.getElementById("fotos");
        
        // 4. Verificar duplicados recientes (últimos 30 segundos)
        const hace30Segundos = new Date(Date.now() - 30000).toISOString();
        const { data: duplicados, error: dupError } = await supabaseClient
            .from("pedidos")
            .select("id, recoleccion, entrega, remitente, destinatario, fecha")
            .eq("recoleccion", recoleccion)
            .eq("entrega", entrega)
            .eq("remitente", remitente)
            .eq("destinatario", destinatario)
            .gte("fecha", hace30Segundos);
        
        if (dupError) {
            console.error("Error verificando duplicados:", dupError);
        }
        
        if (duplicados && duplicados.length > 0) {
            alert(`⚠️ Ya existe un pedido similar solicitado hace pocos minutos.\n\n📍 De: ${recoleccion}\n📍 A: ${entrega}\n\nSi es un error, espera unos segundos y vuelve a intentar.`);
            isSubmitting = false;
            submitBtn.textContent = textoOriginal;
            submitBtn.disabled = false;
            return;
        }
        
        // 5. Subir imágenes
        let fotosUrls = [];
        const archivos = Array.from(fotosInput.files);
        
        if (archivos.length > 0) {
            for (let file of archivos) {
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.name}`;
                
                const { error: uploadError } = await supabaseClient.storage
                    .from("fotos")
                    .upload(fileName, file);
                
                if (!uploadError) {
                    const { data: urlData } = supabaseClient.storage
                        .from("fotos")
                        .getPublicUrl(fileName);
                    
                    if (urlData && urlData.publicUrl) {
                        fotosUrls.push(urlData.publicUrl);
                    }
                } else {
                    console.error("Error subiendo imagen:", uploadError);
                }
            }
        }
        
        // 6. Crear el pedido con ID único y timestamp
        const datos = {
            recoleccion: recoleccion,
            entrega: entrega,
            remitente: remitente,
            destinatario: destinatario,
            descripcion: descripcion,
            precio: pago,
            tel_remitente: telRemitente,
            tel_destinatario: telDestinatario,
            envio: envioCalculado,
            fotos: fotosUrls,
            estado: "pendiente",
            fecha: new Date().toISOString(), // Fecha exacta
            id_unico: generarIdUnico() // ID adicional para prevenir duplicados
        };
        
        // 7. Insertar en Supabase
        const { data: pedidoInsertado, error: insertError } = await supabaseClient
            .from("pedidos")
            .insert([datos])
            .select();
        
        if (insertError) {
            console.error("Error insertando:", insertError);
            throw new Error(insertError.message);
        }
        
        // 8. Mostrar mensaje de éxito
        const mensaje = document.getElementById("mensaje");
        mensaje.textContent = "✅ ¡Pedido enviado con éxito! Redirigiendo a WhatsApp...";
        mensaje.style.color = "#28a745";
        mensaje.style.fontWeight = "bold";
        mensaje.style.padding = "10px";
        mensaje.style.backgroundColor = "#d4edda";
        mensaje.style.borderRadius = "8px";
        mensaje.style.marginTop = "10px";
        
        // 9. Preparar mensaje de WhatsApp
        const textoWhatsApp = `🚚 *NUEVO PEDIDO* 🚚

📍 *Recolección:* ${recoleccion}
📍 *Entrega:* ${entrega}

👤 *Quién envía:* ${remitente}
📞 *Teléfono:* ${telRemitente}

👤 *Quién recibe:* ${destinatario}
📞 *Teléfono:* ${telDestinatario}

📦 *Descripción:* ${descripcion}
💰 *Pago producto:* $${pago}
🚚 *Costo envío:* ${envioCalculado}

🆔 *ID Pedido:* ${pedidoInsertado?.[0]?.id || "Generado"}
📅 *Fecha:* ${new Date().toLocaleString()}

🔗 Ver seguimiento: ${window.location.origin}/repartidor.html`;

        // 10. Redirigir a WhatsApp después de 1 segundo
        setTimeout(() => {
            window.location.href = `https://wa.me/5213111063251?text=${encodeURIComponent(textoWhatsApp)}`;
        }, 1000);
        
    } catch (error) {
        console.error("Error detallado:", error);
        alert("❌ Error al enviar el pedido. Por favor intenta de nuevo.\n\n" + error.message);
        
        // Restaurar botón
        isSubmitting = false;
        submitBtn.textContent = textoOriginal;
        submitBtn.disabled = false;
        
        const mensaje = document.getElementById("mensaje");
        mensaje.textContent = "❌ Error al enviar. Intenta de nuevo.";
        mensaje.style.color = "#dc3545";
        mensaje.style.padding = "10px";
        mensaje.style.backgroundColor = "#f8d7da";
        mensaje.style.borderRadius = "8px";
        mensaje.style.marginTop = "10px";
        
        // Limpiar mensaje después de 5 segundos
        setTimeout(() => {
            mensaje.textContent = "";
            mensaje.style.backgroundColor = "";
        }, 5000);
    }
});

// Prevenir envío con Enter accidental
form.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        if (!isSubmitting) {
            form.dispatchEvent(new Event("submit"));
        }
    }
});

// Limpiar formulario después de envío exitoso (opcional)
function limpiarFormulario() {
    const campos = ["recoleccion", "entrega", "remitente", "telRemitente", 
                    "destinatario", "telDestinatario", "descripcion", "pago"];
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) elemento.value = "";
    });
    document.getElementById("fotos").value = "";
    document.getElementById("envioCalculado").value = "";
}

// Mostrar advertencia si el usuario intenta salir mientras se envía
window.addEventListener("beforeunload", (e) => {
    if (isSubmitting) {
        e.preventDefault();
        e.returnValue = "El pedido se está enviando. ¿Seguro que quieres salir?";
        return e.returnValue;
    }
});