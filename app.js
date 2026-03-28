// Configuración de Supabase
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
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        console.error(`❌ Archivo no es una imagen: ${file.type}`);
        mostrarMensaje(`❌ ${file.name} no es una imagen válida`, "error");
        return null;
    }
    
    // Validar tamaño máximo (5MB)
    if (file.size > 5 * 1024 * 1024) {
        console.error(`❌ Archivo muy grande: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        mostrarMensaje(`❌ ${file.name} excede el límite de 5MB`, "error");
        return null;
    }
    
    // Generar nombre único
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `pedido_${timestamp}_${random}_${index}_${cleanName}`;
    
    console.log(`📤 Subiendo a Supabase: ${fileName}`);
    
    try {
        // Intentar subir
        const { data, error } = await supabaseClient.storage
            .from("fotos")
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
            });
        
        if (error) {
            console.error("❌ Error detallado en upload:", error);
            console.error("   - Mensaje:", error.message);
            console.error("   - Status:", error.statusCode);
            
            // Manejar errores específicos
            if (error.message.includes("bucket not found")) {
                mostrarMensaje("❌ El bucket 'fotos' no existe en Supabase. Contacta al administrador.", "error");
            } else if (error.message.includes("permission") || error.message.includes("JWT")) {
                mostrarMensaje("❌ Error de permisos en Supabase. Verifica la clave de API.", "error");
            } else if (error.message.includes("row-level security")) {
                mostrarMensaje("❌ Error de políticas de seguridad. No se pueden subir imágenes.", "error");
            } else {
                mostrarMensaje(`❌ Error al subir imagen: ${error.message}`, "error");
            }
            
            return null;
        }
        
        console.log(`✅ Imagen ${index + 1} subida exitosamente`);
        console.log(`   - Path: ${data.path}`);
        
        // Obtener URL pública
        const { data: urlData } = supabaseClient.storage
            .from("fotos")
            .getPublicUrl(fileName);
        
        console.log(`🔗 URL pública: ${urlData.publicUrl}`);
        
        // Verificar que la URL sea accesible
        try {
            const testResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
            if (testResponse.ok) {
                console.log(`✅ URL accesible`);
            } else {
                console.warn(`⚠️ URL generada pero no accesible: ${testResponse.status}`);
            }
        } catch (err) {
            console.warn(`⚠️ No se pudo verificar la URL: ${err.message}`);
        }
        
        return urlData.publicUrl;
        
    } catch (error) {
        console.error(`❌ Error en subida de imagen ${index + 1}:`, error);
        console.error("Stack trace:", error.stack);
        mostrarMensaje(`❌ Error al subir ${file.name}: ${error.message}`, "error");
        return null;
    }
}

// Función mejorada para subir múltiples imágenes
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
        
        // Mostrar progreso
        mostrarMensaje(`📸 Subiendo imagen ${i + 1} de ${files.length}: ${file.name}...`, "info");
        
        const url = await subirImagen(file, i);
        if (url) {
            urls.push(url);
            exitosas++;
            console.log(`✅ Imagen ${i + 1} completada (${exitosas}/${files.length})`);
        } else {
            console.error(`❌ Imagen ${i + 1} falló`);
        }
        
        // Pequeña pausa entre subidas
        if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    console.log(`📸 ========== SUBIDA COMPLETADA ==========`);
    console.log(`   ✅ Exitosas: ${exitosas}/${files.length}`);
    console.log(`   📋 URLs:`, urls);
    
    if (exitosas === 0 && files.length > 0) {
        mostrarMensaje("❌ No se pudo subir ninguna imagen. Verifica la consola para más detalles.", "error");
    } else if (exitosas < files.length) {
        mostrarMensaje(`⚠️ Se subieron ${exitosas} de ${files.length} imágenes. Algunas fallaron.`, "error");
    }
    
    return urls;
}

// Función para actualizar el label de fotos
function actualizarLabelFotos(input) {
    const fileLabel = document.querySelector(".file-label");
    if (!fileLabel) return;
    
    const cantidad = input.files.length;
    console.log("📸 Cantidad de fotos seleccionadas:", cantidad);
    
    if (cantidad > 0) {
        fileLabel.innerHTML = `📸 ${cantidad} foto(s) seleccionada(s) ✅`;
        fileLabel.style.background = "#d4edda";
        fileLabel.style.borderColor = "#28a745";
        
        // Mostrar nombres de archivos seleccionados
        console.log("📸 Archivos seleccionados:");
        for (let i = 0; i < input.files.length; i++) {
            console.log(`   ${i + 1}. ${input.files[i].name} (${(input.files[i].size / 1024).toFixed(2)} KB)`);
        }
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

// Función de diagnóstico para verificar Supabase
async function diagnosticarSupabase() {
    console.log("🔍 ========== DIAGNÓSTICO DE SUPABASE ==========");
    
    // 1. Verificar conexión a la tabla pedidos
    console.log("\n1️⃣ Verificando tabla 'pedidos':");
    try {
        const { data, error, count } = await supabaseClient
            .from("pedidos")
            .select("*", { count: 'exact', head: true });
        
        if (error) {
            console.error("❌ Error en tabla pedidos:", error.message);
        } else {
            console.log("✅ Tabla 'pedidos' accesible");
            console.log(`   📊 Total de registros: ${count}`);
        }
    } catch (err) {
        console.error("❌ Excepción al verificar pedidos:", err.message);
    }
    
    // 2. Listar buckets disponibles
    console.log("\n2️⃣ Verificando buckets de Storage:");
    try {
        const { data: buckets, error } = await supabaseClient.storage.listBuckets();
        
        if (error) {
            console.error("❌ Error al listar buckets:", error.message);
            console.error("   Detalle:", error);
        } else {
            console.log("✅ Buckets disponibles:");
            if (buckets && buckets.length > 0) {
                buckets.forEach(bucket => {
                    console.log(`   📁 ${bucket.name} (${bucket.public ? 'público' : 'privado'})`);
                });
            } else {
                console.log("   No hay buckets disponibles");
            }
            
            const fotosBucket = buckets ? buckets.find(b => b.name === "fotos") : null;
            if (fotosBucket) {
                console.log("✅✅✅ Bucket 'fotos' EXISTE");
                console.log(`   - ID: ${fotosBucket.id}`);
                console.log(`   - Público: ${fotosBucket.public}`);
            } else {
                console.error("❌❌❌ Bucket 'fotos' NO EXISTE");
                console.error("   🔴 SOLUCIÓN: Debes crearlo en Supabase Dashboard > Storage");
            }
        }
    } catch (err) {
        console.error("❌ Excepción al listar buckets:", err.message);
    }
    
    // 3. Probar subida con archivo de prueba
    console.log("\n3️⃣ Probando subida con archivo de prueba:");
    try {
        const testBlob = new Blob(["test content"], { type: "text/plain" });
        const testFileName = `test_${Date.now()}.txt`;
        
        const { data, error } = await supabaseClient.storage
            .from("fotos")
            .upload(testFileName, testBlob, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            console.error("❌ Error en subida de prueba:", error.message);
            console.error("   Código:", error.statusCode);
            
            if (error.message.includes("bucket not found")) {
                console.error("   🔴 SOLUCIÓN: Crea el bucket 'fotos' en Supabase como se indicó arriba");
            } else if (error.message.includes("permission denied")) {
                console.error("   🔴 SOLUCIÓN: Verifica las políticas de seguridad del bucket");
            } else if (error.message.includes("JWT")) {
                console.error("   🔴 SOLUCIÓN: La clave de API puede ser incorrecta o expiró");
            }
        } else {
            console.log("✅ Subida de prueba exitosa");
            console.log(`   Path: ${data.path}`);
            
            // Limpiar archivo de prueba
            const { error: removeError } = await supabaseClient.storage
                .from("fotos")
                .remove([testFileName]);
            
            if (removeError) {
                console.warn("   ⚠️ No se pudo eliminar el archivo de prueba:", removeError.message);
            } else {
                console.log("   🧹 Archivo de prueba eliminado");
            }
        }
    } catch (err) {
        console.error("❌ Excepción en subida de prueba:", err.message);
    }
    
    console.log("\n🔍 ========== FIN DIAGNÓSTICO ==========");
}

// FUNCIÓN DE PRUEBA CON IMAGEN REAL
async function probarSubidaImagen() {
    console.log("🧪 ========== PROBANDO SUBIDA DE IMAGEN REAL ==========");
    
    // Crear una imagen de prueba en memoria (un cuadrado rojo)
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Test', 30, 50);
    
    // Convertir canvas a blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const testFile = new File([blob], 'test_image.png', { type: 'image/png' });
    
    console.log("📸 Imagen de prueba creada:");
    console.log("   - Nombre:", testFile.name);
    console.log("   - Tipo:", testFile.type);
    console.log("   - Tamaño:", (testFile.size / 1024).toFixed(2), "KB");
    
    // Probar subida
    const timestamp = Date.now();
    const fileName = `test_imagen_${timestamp}.png`;
    
    console.log("📤 Subiendo a Supabase...");
    console.log("   - Bucket: fotos");
    console.log("   - Archivo:", fileName);
    
    try {
        const { data, error } = await supabaseClient.storage
            .from("fotos")
            .upload(fileName, testFile, {
                cacheControl: '3600',
                upsert: false,
                contentType: 'image/png'
            });
        
        if (error) {
            console.error("❌ ERROR EN SUBIDA:");
            console.error("   - Mensaje:", error.message);
            console.error("   - Status:", error.statusCode);
            console.error("   - Error completo:", error);
            
            // Mostrar sugerencias según el error
            if (error.message.includes("permission")) {
                console.error("🔴 SOLUCIÓN: Problema de permisos. Verifica las políticas del bucket.");
                console.error("   En Supabase Dashboard > Storage > fotos > Policies");
                console.error("   Asegúrate de tener políticas que permitan INSERT y SELECT para anon");
            } else if (error.message.includes("row-level security")) {
                console.error("🔴 SOLUCIÓN: Error de RLS. Debes crear políticas de seguridad.");
            } else if (error.message.includes("JWT")) {
                console.error("🔴 SOLUCIÓN: Problema con la clave API. Verifica que sea correcta.");
            }
        } else {
            console.log("✅ SUBIDA EXITOSA!");
            console.log("   - Path:", data.path);
            
            // Obtener URL pública
            const { data: urlData } = supabaseClient.storage
                .from("fotos")
                .getPublicUrl(fileName);
            
            console.log("   - URL pública:", urlData.publicUrl);
            
            // Intentar acceder a la URL
            try {
                const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
                if (response.ok) {
                    console.log("   - ✅ URL accesible!");
                } else {
                    console.log("   - ⚠️ URL generada pero no accesible (status:", response.status, ")");
                }
            } catch (err) {
                console.log("   - ⚠️ No se pudo verificar URL:", err.message);
            }
            
            // Limpiar archivo de prueba
            console.log("🧹 Eliminando archivo de prueba...");
            const { error: removeError } = await supabaseClient.storage
                .from("fotos")
                .remove([fileName]);
            
            if (removeError) {
                console.warn("   ⚠️ No se pudo eliminar:", removeError.message);
            } else {
                console.log("   ✅ Archivo de prueba eliminado");
            }
        }
    } catch (err) {
        console.error("❌ EXCEPCIÓN:", err);
        console.error("   Stack:", err.stack);
    }
    
    console.log("🧪 ========== FIN PRUEBA ==========");
}

// Configurar evento del campo pago
const pagoInput = document.getElementById("pago");
if (pagoInput) {
    pagoInput.addEventListener("input", actualizarEnvio);
}

// Evento principal del formulario
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
        
        // DIAGNÓSTICO DE FOTOS
        console.log("🔍 DIAGNÓSTICO DE FOTOS:");
        console.log("fotosInput existe:", fotosInput);
        if (fotosInput) {
            console.log("fotosInput.files:", fotosInput.files);
            console.log("Cantidad de archivos:", fotosInput.files.length);
            for (let i = 0; i < fotosInput.files.length; i++) {
                console.log(`Archivo ${i}:`, fotosInput.files[i].name, `${(fotosInput.files[i].size / 1024).toFixed(2)} KB`, fotosInput.files[i].type);
            }
        }
        
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
            console.log(`📸 PROCESANDO ${fotosInput.files.length} imagen(es)`);
            submitBtn.textContent = `⏳ Subiendo ${fotosInput.files.length} imagen(es)...`;
            fotosUrls = await subirImagenes(fotosInput.files);
            console.log("📸 URLs finales obtenidas:", fotosUrls);
            
            // Verificar si se subieron todas las imágenes
            if (fotosUrls.length !== fotosInput.files.length) {
                console.warn(`⚠️ Solo se subieron ${fotosUrls.length} de ${fotosInput.files.length} imágenes`);
            }
        } else {
            console.log("📸 No hay imágenes seleccionadas - continuando sin fotos");
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
        console.log("📦 Datos a guardar:", JSON.stringify(datos, null, 2));
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
            texto += `📸 *Fotos:* ${fotosUrls.length} imagen(es) subida(s)\n`;
            texto += `🔗 Ver en panel admin: ${window.location.origin}/admin.html\n`;
        }
        
        texto += `\n🕐 *Fecha:* ${new Date(datos.fecha).toLocaleString()}`;
        
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
            
            // Reasignar evento al nuevo input
            const newFotosInput = document.getElementById("fotos");
            if (newFotosInput) {
                newFotosInput.addEventListener("change", function() {
                    actualizarLabelFotos(this);
                });
            }
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
        console.log("📸 Evento change detectado!");
        console.log("📸 Archivos seleccionados:", this.files.length);
        actualizarLabelFotos(this);
    });
}

// Calcular envío inicial si hay valor en pago
if (pagoInput && pagoInput.value) {
    actualizarEnvio();
}

// Ejecutar diagnóstico automáticamente después de cargar la página
setTimeout(() => {
    console.log("🚀 App de pedidos lista");
    diagnosticarSupabase();
}, 1000);

// Exponer función de prueba en consola
window.probarSubidaImagen = probarSubidaImagen;

console.log("✅ App lista. Escribe 'probarSubidaImagen()' en la consola para probar la subida de imágenes");