const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variable para prevenir doble clic
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
    if (!pago && pago !== 0) return;

    const distancia = calcularDistancia();
    const envio = calcularEnvio(distancia, pago);

    document.getElementById("envioCalculado").value = `$${envio} aprox (${distancia} km)`;
}

// Configurar evento del campo pago
const pagoInput = document.getElementById("pago");
if (pagoInput) {
    pagoInput.addEventListener("input", actualizarEnvio);
}

// Función para mostrar mensaje
function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById("mensaje");
    if (!mensajeDiv) return;
    
    mensajeDiv.textContent = texto;
    mensajeDiv.style.color = tipo === "error" ? "#dc3545" : "#28a745";
    mensajeDiv.style.fontWeight = "bold";
    mensajeDiv.style.display = "block";
    
    setTimeout(() => {
        mensajeDiv.style.display = "none";
        mensajeDiv.textContent = "";
    }, 5000);
}

// Función para subir una imagen individual
async function subirImagen(file) {
    if (!file) return null;
    
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    try {
        const { error } = await supabaseClient.storage
            .from("fotos")
            .upload(fileName, file);
        
        if (error) {
            console.error("Error subiendo imagen:", error);
            return null;
        }
        
        const { data } = supabaseClient.storage
            .from("fotos")
            .getPublicUrl(fileName);
        
        return data.publicUrl;
    } catch (error) {
        console.error("Error en subida:", error);
        return null;
    }
}

// Función para subir múltiples imágenes
async function subirImagenes(files) {
    if (!files || files.length === 0) return [];
    
    const urls = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await subirImagen(file);
        if (url) {
            urls.push(url);
        }
    }
    return urls;
}

// Función para actualizar el label de fotos
function actualizarLabelFotos(input) {
    const fileLabel = document.querySelector(".file-label");
    if (!fileLabel) return;
    
    const cantidad = input.files.length;
    
    if (cantidad > 0) {
        const textoOriginal = fileLabel.getAttribute("data-original") || "📸 Subir fotos";
        fileLabel.setAttribute("data-original", textoOriginal);
        fileLabel.innerHTML = `📸 ${cantidad} foto(s) seleccionada(s) <span style="font-size:11px; display:block;">✅ Listo para enviar</span>`;
        fileLabel.style.background = "#d4edda";
        fileLabel.style.borderColor = "#28a745";
    } else {
        const textoOriginal = fileLabel.getAttribute("data-original") || "📸 Subir fotos";
        fileLabel.innerHTML = `${textoOriginal}
            <input type="file" id="fotos" multiple accept="image/*">`;
        fileLabel.style.background = "";
        fileLabel.style.borderColor = "";
        // Reasignar el evento al nuevo input
        const newInput = document.getElementById("fotos");
        if (newInput) {
            newInput.addEventListener("change", function() {
                actualizarLabelFotos(this);
            });
        }
    }
}

const form = document.getElementById("pedidoForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Prevenir doble clic
    if (isSubmitting) {
        mostrarMensaje("⏳ Ya se está enviando, por favor espera...", "error");
        return;
    }
    
    // Bloquear el botón
    isSubmitting = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn.textContent;
    submitBtn.textContent = "⏳ Enviando pedido...";
    submitBtn.disabled = true;
    
    // Ocultar mensaje anterior
    const mensajeDiv = document.getElementById("mensaje");
    if (mensajeDiv) mensajeDiv.style.display = "none";
    
    try {
        // Obtener referencias de los inputs
        const recoleccion = document.getElementById("recoleccion");
        const entrega = document.getElementById("entrega");
        const remitente = document.getElementById("remitente");
        const destinatario = document.getElementById("destinatario");
        const descripcion = document.getElementById("descripcion");
        const pago = document.getElementById("pago");
        const telRemitente = document.getElementById("telRemitente");
        const telDestinatario = document.getElementById("telDestinatario");
        const envioCalculado = document.getElementById("envioCalculado");
        const fotosInput = document.getElementById("fotos");
        
        // Validar campos requeridos
        if (!recoleccion.value.trim()) throw new Error("📍 La dirección de recolección es requerida");
        if (!entrega.value.trim()) throw new Error("📍 La dirección de entrega es requerida");
        if (!remitente.value.trim()) throw new Error("👤 El nombre del remitente es requerido");
        if (!destinatario.value.trim()) throw new Error("👤 El nombre del destinatario es requerido");
        if (!descripcion.value.trim()) throw new Error("📦 La descripción es requerida");
        if (!pago.value.trim()) throw new Error("💰 El pago del producto es requerido");
        if (!telRemitente.value.trim()) throw new Error("📞 El teléfono del remitente es requerido");
        if (!telDestinatario.value.trim()) throw new Error("📞 El teléfono del destinatario es requerido");
        
        // Subir imágenes (verificar que fotosInput existe)
        let fotosUrls = [];
        if (fotosInput && fotosInput.files && fotosInput.files.length > 0) {
            mostrarMensaje(`📸 Subiendo ${fotosInput.files.length} imagen(es)...`, "info");
            submitBtn.textContent = "⏳ Subiendo imágenes...";
            fotosUrls = await subirImagenes(fotosInput.files);
            console.log("Imágenes subidas:", fotosUrls.length);
        }
        
        // Calcular envío si no está calculado
        let envioTexto = envioCalculado.value;
        if (!envioTexto) {
            const pagoValue = parseFloat(pago.value) || 0;
            const distancia = calcularDistancia();
            const envio = calcularEnvio(distancia, pagoValue);
            envioTexto = `$${envio} aprox (${distancia} km)`;
        }
        
        // Preparar datos
        const datos = {
            recoleccion: recoleccion.value.trim(),
            entrega: entrega.value.trim(),
            remitente: remitente.value.trim(),
            destinatario: destinatario.value.trim(),
            descripcion: descripcion.value.trim(),
            precio: pago.value.trim(),
            tel_remitente: telRemitente.value.trim(),
            tel_destinatario: telDestinatario.value.trim(),
            envio: envioTexto,
            fotos: fotosUrls,
            estado: "pendiente",
            fecha: new Date().toISOString()
        };
        
        console.log("Guardando pedido en Supabase...");
        submitBtn.textContent = "⏳ Guardando pedido...";
        
        // Guardar en Supabase
        const { data: pedidoGuardado, error: insertError } = await supabaseClient
            .from("pedidos")
            .insert([datos])
            .select();
        
        if (insertError) {
            console.error("Error Supabase:", insertError);
            throw new Error(`Error al guardar: ${insertError.message}`);
        }
        
        console.log("Pedido guardado exitosamente:", pedidoGuardado);
        
        // Preparar mensaje para WhatsApp CON TODOS LOS EMOJIS ORIGINALES
        const texto = `🚚 Nuevo pedido
📍 ${datos.recoleccion} → ${datos.entrega}
👤 ${datos.remitente} (${datos.tel_remitente})
👤 ${datos.destinatario} (${datos.tel_destinatario})
📦 ${datos.descripcion}
💰 $${datos.precio}
🚚 Envío: ${datos.envio}`;
        
        // Mostrar mensaje de éxito
        mostrarMensaje("✅ ¡Pedido enviado con éxito! Redirigiendo a WhatsApp...", "success");
        
        // Limpiar el formulario
        form.reset();
        
        // Resetear el label de fotos
        const fileLabel = document.querySelector(".file-label");
        if (fileLabel) {
            fileLabel.innerHTML = `📸 Subir fotos
                <input type="file" id="fotos" multiple accept="image/*">`;
            fileLabel.style.background = "";
            fileLabel.style.borderColor = "";
            // Reasignar el evento al nuevo input
            const newInput = document.getElementById("fotos");
            if (newInput) {
                newInput.addEventListener("change", function() {
                    actualizarLabelFotos(this);
                });
            }
        }
        
        // Pequeño delay antes de redirigir para asegurar que el mensaje se vea
        setTimeout(() => {
            // Redirigir a WhatsApp
            window.location.href = `https://wa.me/5213111063251?text=${encodeURIComponent(texto)}`;
        }, 1500);
        
    } catch (error) {
        console.error("Error completo:", error);
        
        // Mostrar mensaje de error detallado
        let mensajeError = error.message || "❌ Error al enviar. Intenta de nuevo.";
        
        // Mensajes más amigables con emojis
        if (mensajeError.includes("duplicate key")) {
            mensajeError = "❌ Error de duplicado. Intenta de nuevo.";
        } else if (mensajeError.includes("network")) {
            mensajeError = "❌ Error de red. Verifica tu conexión a internet.";
        } else if (mensajeError.includes("storage")) {
            mensajeError = "📸 Error al subir imágenes. Intenta con menos fotos o imágenes más pequeñas.";
        }
        
        mostrarMensaje(mensajeError, "error");
        
        // Restaurar botón
        isSubmitting = false;
        submitBtn.textContent = textoOriginal;
        submitBtn.disabled = false;
    }
});

// Configurar el evento de cambio de fotos INICIAL
const fotosInputInicial = document.getElementById("fotos");
if (fotosInputInicial) {
    fotosInputInicial.addEventListener("change", function() {
        actualizarLabelFotos(this);
    });
}

// Calcular envío inicial si hay valor en pago
if (pagoInput && pagoInput.value) {
    actualizarEnvio();
}