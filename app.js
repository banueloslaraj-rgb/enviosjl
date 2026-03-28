const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variable para prevenir doble clic
let isSubmitting = false;

// DIAGNÓSTICO: Verificar bucket de fotos al cargar
async function verificarBucket() {
    console.log("🔍 Verificando bucket 'fotos'...");
    try {
        const { data, error } = await supabaseClient.storage
            .from("fotos")
            .list("", { limit: 1 });
        
        if (error) {
            console.error("❌ Error al acceder al bucket 'fotos':", error);
            console.log("⚠️ El bucket 'fotos' puede no existir o no tener permisos");
            console.log("📌 Debes crearlo en Supabase > Storage");
        } else {
            console.log("✅ Bucket 'fotos' accesible correctamente");
        }
    } catch (e) {
        console.error("❌ Error en verificación:", e);
    }
}

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

// Función para subir una imagen individual - VERSIÓN MEJORADA
async function subirImagen(file, index) {
    if (!file) {
        console.log("⚠️ Archivo nulo, omitiendo");
        return null;
    }
    
    // Limpiar nombre del archivo
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const extension = cleanName.split('.').pop();
    const fileName = `${Date.now()}-${index}-${cleanName}`;
    
    console.log(`📤 Subiendo imagen ${index + 1}: ${fileName}, tamaño: ${(file.size / 1024).toFixed(2)} KB`);
    
    try {
        const { data, error } = await supabaseClient.storage
            .from("fotos")
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
            });
        
        if (error) {
            console.error(`❌ Error subiendo imagen ${index + 1}:`, error);
            return null;
        }
        
        console.log(`✅ Imagen ${index + 1} subida correctamente`);
        
        const { data: urlData } = supabaseClient.storage
            .from("fotos")
            .getPublicUrl(fileName);
        
        console.log(`🔗 URL: ${urlData.publicUrl}`);
        return urlData.publicUrl;
        
    } catch (error) {
        console.error(`❌ Error en subida de imagen ${index + 1}:`, error);
        return null;
    }
}

// Función para subir múltiples imágenes - VERSIÓN MEJORADA
async function subirImagenes(files) {
    if (!files || files.length === 0) {
        console.log("📸 No hay imágenes para subir");
        return [];
    }
    
    console.log(`📸 Iniciando subida de ${files.length} imagen(es)...`);
    const urls = [];
    let subidasExitosas = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        mostrarMensaje(`📸 Subiendo imagen ${i + 1} de ${files.length}...`, "info");
        const url = await subirImagen(file, i);
        if (url) {
            urls.push(url);
            subidasExitosas++;
        } else {
            console.error(`❌ Falló subida de imagen ${i + 1}`);
        }
    }
    
    console.log(`📸 Resultado: ${subidasExitosas} de ${files.length} imágenes subidas`);
    return urls;
}

// Función para actualizar el label de fotos
function actualizarLabelFotos(input) {
    const fileLabel = document.querySelector(".file-label");
    if (!fileLabel) return;
    
    const cantidad = input.files.length;
    
    if (cantidad > 0) {
        fileLabel.innerHTML = `📸 ${cantidad} foto(s) seleccionada(s) ✅`;
        fileLabel.style.background = "#d4edda";
        fileLabel.style.borderColor = "#28a745";
    } else {
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
}

const form = document.getElementById("pedidoForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    console.log("🚀 Iniciando envío de pedido...");
    
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
        
        // Subir imágenes
        let fotosUrls = [];
        if (fotosInput && fotosInput.files && fotosInput.files.length > 0) {
            console.log(`📸 Se encontraron ${fotosInput.files.length} imagen(es)`);
            mostrarMensaje(`📸 Subiendo ${fotosInput.files.length} imagen(es)...`, "info");
            submitBtn.textContent = `⏳ Subiendo ${fotosInput.files.length} imagen(es)...`;
            fotosUrls = await subirImagenes(fotosInput.files);
            console.log("📸 URLs obtenidas:", fotosUrls);
        } else {
            console.log("📸 No hay imágenes seleccionadas");
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
        
        console.log("💾 Guardando pedido en Supabase...");
        console.log("📦 Datos:", datos);
        submitBtn.textContent = "⏳ Guardando pedido...";
        
        // Guardar en Supabase
        const { data: pedidoGuardado, error: insertError } = await supabaseClient
            .from("pedidos")
            .insert([datos])
            .select();
        
        if (insertError) {
            console.error("❌ Error Supabase:", insertError);
            throw new Error(`Error al guardar: ${insertError.message}`);
        }
        
        console.log("✅ Pedido guardado exitosamente:", pedidoGuardado);
        
        // Preparar mensaje para WhatsApp
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
        }
        
        // Pequeño delay antes de redirigir
        setTimeout(() => {
            window.location.href = `https://wa.me/5213111063251?text=${encodeURIComponent(texto)}`;
        }, 1500);
        
    } catch (error) {
        console.error("❌ Error completo:", error);
        
        let mensajeError = error.message || "❌ Error al enviar. Intenta de nuevo.";
        
        if (mensajeError.includes("duplicate key")) {
            mensajeError = "❌ Error de duplicado. Intenta de nuevo.";
        } else if (mensajeError.includes("network")) {
            mensajeError = "❌ Error de red. Verifica tu conexión a internet.";
        } else if (mensajeError.includes("storage") || mensajeError.includes("bucket")) {
            mensajeError = "📸 Error al subir imágenes. Verifica que el bucket 'fotos' exista en Supabase.";
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

// Ejecutar diagnóstico al cargar
verificarBucket();

console.log("🚀 App de pedidos lista");