// Configuración de Supabase
const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variable para prevenir doble clic
let isSubmitting = false;

// ========== FUNCIÓN: FORMATEAR FECHA EN HORA DE MÉXICO ==========
function formatearFechaMexico(fechaUTC) {
    if (!fechaUTC) return 'Fecha no disponible';
    
    try {
        const fecha = new Date(fechaUTC);
        
        if (isNaN(fecha.getTime())) {
            console.error("Fecha inválida:", fechaUTC);
            return 'Fecha inválida';
        }
        
        return fecha.toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error("Error al formatear fecha:", error);
        return 'Error de formato';
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

// Función mejorada para subir una imagen individual
async function subirImagen(file, index) {
    if (!file) {
        console.log(`❌ Archivo ${index} no existe`);
        return null;
    }
    
    console.log(`📤 Procesando imagen ${index + 1}:`);
    console.log(`   - Nombre original: ${file.name}`);
    console.log(`   - Tipo: ${file.type}`);
    console.log(`   - Tamaño: ${(file.size / 1024).toFixed(2)} KB`);
    
    if (!file.type.startsWith('image/')) {
        console.error(`❌ Archivo no es una imagen: ${file.type}`);
        mostrarMensaje(`❌ ${file.name} no es una imagen válida`, "error");
        return null;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        console.error(`❌ Archivo muy grande: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        mostrarMensaje(`❌ ${file.name} excede el límite de 5MB`, "error");
        return null;
    }
    
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `pedido_${timestamp}_${random}_${index}_${cleanName}`;
    
    console.log(`📤 Subiendo a Supabase: ${fileName}`);
    
    try {
        const { data, error } = await supabaseClient.storage
            .from("fotos")
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
            });
        
        if (error) {
            console.error("❌ Error detallado en upload:", error);
            
            if (error.message.includes("bucket not found")) {
                mostrarMensaje("❌ El bucket 'fotos' no existe en Supabase. Contacta al administrador.", "error");
            } else if (error.message.includes("permission") || error.message.includes("JWT")) {
                mostrarMensaje("❌ Error de permisos en Supabase. Verifica la clave de API.", "error");
            } else {
                mostrarMensaje(`❌ Error al subir imagen: ${error.message}`, "error");
            }
            return null;
        }
        
        console.log(`✅ Imagen ${index + 1} subida exitosamente`);
        
        const { data: urlData } = supabaseClient.storage
            .from("fotos")
            .getPublicUrl(fileName);
        
        return urlData.publicUrl;
        
    } catch (error) {
        console.error(`❌ Error en subida de imagen ${index + 1}:`, error);
        mostrarMensaje(`❌ Error al subir ${file.name}: ${error.message}`, "error");
        return null;
    }
}

// Función para subir múltiples imágenes
async function subirImagenes(files) {
    if (!files || files.length === 0) {
        console.log("📸 No hay imágenes para subir");
        return [];
    }
    
    console.log(`📸 ========== INICIANDO SUBIDA DE ${files.length} IMÁGENES ==========`);
    
    const urls = [];
    let exitosas = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        mostrarMensaje(`📸 Subiendo imagen ${i + 1} de ${files.length}: ${file.name}...`, "info");
        
        const url = await subirImagen(file, i);
        if (url) {
            urls.push(url);
            exitosas++;
        }
        
        if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    console.log(`📸 ========== SUBIDA COMPLETADA ==========`);
    console.log(`   ✅ Exitosas: ${exitosas}/${files.length}`);
    
    if (exitosas === 0 && files.length > 0) {
        mostrarMensaje("❌ No se pudo subir ninguna imagen.", "error");
    }
    
    return urls;
}

// Función para actualizar la información de fotos
function actualizarInfoFotos(input) {
    const fotosInfo = document.getElementById("fotos-info");
    if (!fotosInfo) return;
    
    const cantidad = input.files.length;
    
    if (cantidad > 0) {
        let nombres = [];
        for (let i = 0; i < input.files.length; i++) {
            nombres.push(input.files[i].name);
        }
        
        fotosInfo.innerHTML = `✅ ${cantidad} foto(s) seleccionada(s):<br>`;
        for (let i = 0; i < nombres.length; i++) {
            fotosInfo.innerHTML += `📷 ${nombres[i]}<br>`;
        }
        fotosInfo.style.color = "#28a745";
        fotosInfo.style.background = "#d4edda";
        fotosInfo.style.padding = "10px";
        fotosInfo.style.borderRadius = "5px";
        fotosInfo.style.marginTop = "5px";
    } else {
        fotosInfo.innerHTML = "";
        fotosInfo.style.background = "";
    }
}

// Configurar evento del campo pago
const pagoInput = document.getElementById("pago");
if (pagoInput) {
    pagoInput.addEventListener("input", actualizarEnvio);
}

// Configurar la subida de fotos
const fileLabelButton = document.querySelector(".file-label-button");
const fotosInput = document.getElementById("fotos");

if (fileLabelButton && fotosInput) {
    fileLabelButton.addEventListener("click", function(e) {
        e.preventDefault();
        fotosInput.click();
    });
    
    fotosInput.addEventListener("change", function() {
        actualizarInfoFotos(this);
    });
}

// Evento principal del formulario
const form = document.getElementById("pedidoForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    console.log("🚀 Iniciando envío de pedido...");
    
    if (isSubmitting) {
        mostrarMensaje("⏳ Ya se está enviando, por favor espera...", "error");
        return;
    }
    
    isSubmitting = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn.textContent;
    submitBtn.textContent = "⏳ Enviando pedido...";
    submitBtn.disabled = true;
    
    const mensajeDiv = document.getElementById("mensaje");
    if (mensajeDiv) mensajeDiv.style.display = "none";
    
    try {
        const recoleccion = document.getElementById("recoleccion");
        const entrega = document.getElementById("entrega");
        const remitente = document.getElementById("remitente");
        const destinatario = document.getElementById("destinatario");
        const descripcion = document.getElementById("descripcion");
        const pago = document.getElementById("pago");
        const telRemitente = document.getElementById("telRemitente");
        const telDestinatario = document.getElementById("telDestinatario");
        const envioCalculado = document.getElementById("envioCalculado");
        const fotosInputSubmit = document.getElementById("fotos");
        
        if (!recoleccion.value.trim()) throw new Error("📍 La dirección de recolección es requerida");
        if (!entrega.value.trim()) throw new Error("📍 La dirección de entrega es requerida");
        if (!remitente.value.trim()) throw new Error("👤 El nombre del remitente es requerido");
        if (!destinatario.value.trim()) throw new Error("👤 El nombre del destinatario es requerido");
        if (!descripcion.value.trim()) throw new Error("📦 La descripción es requerida");
        if (!pago.value.trim()) throw new Error("💰 El pago del producto es requerido");
        if (!telRemitente.value.trim()) throw new Error("📞 El teléfono del remitente es requerido");
        if (!telDestinatario.value.trim()) throw new Error("📞 El teléfono del destinatario es requerido");
        
        let fotosUrls = [];
        if (fotosInputSubmit && fotosInputSubmit.files && fotosInputSubmit.files.length > 0) {
            submitBtn.textContent = `⏳ Subiendo ${fotosInputSubmit.files.length} imagen(es)...`;
            fotosUrls = await subirImagenes(fotosInputSubmit.files);
        }
        
        let envioTexto = envioCalculado.value;
        if (!envioTexto) {
            const pagoValue = parseFloat(pago.value) || 0;
            const distancia = calcularDistancia();
            const envio = calcularEnvio(distancia, pagoValue);
            envioTexto = `$${envio} aprox (${distancia} km)`;
        }
        
        const fechaActualUTC = new Date().toISOString();
        
        // ⭐ DATOS CORREGIDOS - SIN zona_horaria ⭐
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
            fecha: fechaActualUTC
        };
        
        console.log("💾 Guardando pedido en Supabase...");
        
        const { data: pedidoGuardado, error: insertError } = await supabaseClient
            .from("pedidos")
            .insert([datos])
            .select();
        
        if (insertError) {
            console.error("❌ Error Supabase:", insertError);
            throw new Error(`Error al guardar: ${insertError.message}`);
        }
        
        console.log("✅ Pedido guardado exitosamente");
        
        // Preparar mensaje para WhatsApp con hora de México
        let texto = `🚚 *NUEVO PEDIDO* 🚚\n\n`;
        texto += `📍 *Recolección:* ${datos.recoleccion}\n`;
        texto += `📍 *Entrega:* ${datos.entrega}\n\n`;
        texto += `👤 *Remitente:* ${datos.remitente}\n`;
        texto += `📞 *Teléfono:* ${datos.tel_remitente}\n\n`;
        texto += `👤 *Destinatario:* ${datos.destinatario}\n`;
        texto += `📞 *Teléfono:* ${datos.tel_destinatario}\n\n`;
        texto += `📦 *Descripción:* ${datos.descripcion}\n\n`;
        texto += `💰 *Pago producto:* $${datos.precio}\n`;
        texto += `🚚 *Costo envío:* ${datos.envio}\n\n`;
        
        if (fotosUrls.length > 0) {
            texto += `📸 *Fotos:* ${fotosUrls.length} imagen(es) subida(s)\n\n`;
        }
        
        texto += `\n🕐 *Fecha del pedido:* ${formatearFechaMexico(datos.fecha)}`;
        
        mostrarMensaje("✅ ¡Pedido enviado con éxito! Redirigiendo a WhatsApp...", "success");
        
        form.reset();
        const fotosInfo = document.getElementById("fotos-info");
        if (fotosInfo) {
            fotosInfo.innerHTML = "";
            fotosInfo.style.background = "";
        }
        if (fotosInputSubmit) fotosInputSubmit.value = "";
        if (envioCalculado) envioCalculado.value = "";
        
        setTimeout(() => {
            window.location.href = `https://wa.me/5213111063251?text=${encodeURIComponent(texto)}`;
        }, 1500);
        
    } catch (error) {
        console.error("❌ Error completo:", error);
        mostrarMensaje(error.message || "❌ Error al enviar. Intenta de nuevo.", "error");
        
        isSubmitting = false;
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = textoOriginal;
            submitBtn.disabled = false;
        }
    }
});

if (pagoInput && pagoInput.value) {
    actualizarEnvio();
}

console.log("✅ App lista");