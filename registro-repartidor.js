// 🔥 CONEXIÓN SUPABASE
const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let isSubmitting = false;

// Generar código de 6 dígitos
function generarCodigo() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Subir archivo a Supabase Storage
async function subirArchivo(file, carpeta, nombreArchivo) {
    if (!file) return null;
    
    console.log(`📤 Subiendo archivo: ${nombreArchivo}`);
    
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const extension = cleanName.split('.').pop();
    const fileName = `${carpeta}/${Date.now()}-${nombreArchivo}.${extension}`;
    
    try {
        const { error } = await supabaseClient.storage
            .from("repartidores")
            .upload(fileName, file);
        
        if (error) {
            console.error(`❌ Error subiendo ${nombreArchivo}:`, error);
            return null;
        }
        
        const { data } = supabaseClient.storage
            .from("repartidores")
            .getPublicUrl(fileName);
        
        console.log(`✅ Archivo subido: ${fileName}`);
        return data.publicUrl;
    } catch (error) {
        console.error(`❌ Error en subida:`, error);
        return null;
    }
}

// Mostrar mensaje
function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje');
    mensajeDiv.textContent = texto;
    mensajeDiv.className = tipo;
    mensajeDiv.style.display = 'block';
    
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
        mensajeDiv.textContent = '';
    }, 5000);
}

// Enviar WhatsApp al repartidor
function enviarWhatsAppRepartidor(telefono, nombre, codigo) {
    const mensaje = `🎉 *¡BIENVENIDO A MANDADITOS EXPRESS!* 🎉

Hola ${nombre}, tu registro como repartidor ha sido exitoso.

🔑 *TU CÓDIGO DE ACCESO ES:* ${codigo}

📝 *Instrucciones:*
1. Guarda este código
2. Ve a: ${window.location.origin}/login-repartidor.html
3. Ingresa tu código para acceder a los pedidos

⚠️ Tu registro está pendiente de revisión por el administrador.
Una vez aprobado, podrás empezar a recibir pedidos.

¡Gracias por unirte al equipo! 🛵`;

    const url = `https://wa.me/52${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// Enviar WhatsApp al administrador
function enviarWhatsAppAdmin(repartidor, codigo) {
    const adminWhatsApp = "5213111063251";
    
    const mensaje = `🛵 *NUEVO REGISTRO DE REPARTIDOR* 🛵

👤 *Nombre:* ${repartidor.nombre_completo}
📞 *Teléfono:* ${repartidor.telefono}
✉️ *Email:* ${repartidor.email || "No especificado"}
🔑 *Código generado:* ${codigo}
🚗 *Vehículo:* ${repartidor.marca_vehiculo} - ${repartidor.color_vehiculo}
📅 *Fecha registro:* ${new Date().toLocaleString()}

📄 *Documentos subidos:*
✅ Credencial (Frente y Reverso)
✅ Comprobante de domicilio
${repartidor.licencia ? "✅ Licencia de conducir" : "⚠️ Licencia no subida (opcional)"}
✅ Foto de vehículo
✅ Foto de placas

📌 *Acciones requeridas:*
1. Revisar los documentos
2. Aprobar o rechazar el registro en el panel de administración
3. El repartidor ya recibió su código por WhatsApp

🔗 Panel admin: ${window.location.origin}/admin.html`;

    const url = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// Configurar eventos de archivos
function setupFileInputs() {
    const inputs = ['credencialFrente', 'credencialReverso', 'comprobanteDomicilio', 'licencia', 'fotoVehiculo', 'fotoPlacas'];
    
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', function() {
                const label = this.closest('.file-label');
                if (this.files && this.files[0]) {
                    const fileName = this.files[0].name;
                    let span = label.querySelector('.file-name');
                    if (!span) {
                        span = document.createElement('span');
                        span.className = 'file-name';
                        label.appendChild(span);
                    }
                    span.textContent = `✅ ${fileName.substring(0, 30)}${fileName.length > 30 ? '...' : ''}`;
                } else {
                    const span = label.querySelector('.file-name');
                    if (span) span.remove();
                }
            });
        }
    });
}

const form = document.getElementById('registroForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log("🚀 Iniciando registro...");
    
    if (isSubmitting) {
        mostrarMensaje("⏳ Ya se está enviando, espera...", "info");
        return;
    }
    
    isSubmitting = true;
    const submitBtn = form.querySelector('button');
    const textoOriginal = submitBtn.textContent;
    submitBtn.textContent = "⏳ Registrando...";
    submitBtn.disabled = true;
    
    try {
        // Obtener valores
        const nombre = document.getElementById('nombreCompleto').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const email = document.getElementById('email').value.trim();
        const marcaVehiculo = document.getElementById('marcaVehiculo').value.trim();
        const colorVehiculo = document.getElementById('colorVehiculo').value.trim();
        
        console.log("📝 Datos:", { nombre, telefono, email, marcaVehiculo, colorVehiculo });
        
        // Validaciones
        if (!nombre) throw new Error("👤 Nombre completo requerido");
        if (!telefono) throw new Error("📞 Teléfono requerido");
        if (!/^\d{10}$/.test(telefono)) throw new Error("📞 El teléfono debe tener 10 dígitos");
        if (!marcaVehiculo) throw new Error("🚘 Marca y modelo requerido");
        if (!colorVehiculo) throw new Error("🎨 Color del vehículo requerido");
        
        // Obtener archivos
        const credFrente = document.getElementById('credencialFrente').files[0];
        const credReverso = document.getElementById('credencialReverso').files[0];
        const comprobante = document.getElementById('comprobanteDomicilio').files[0];
        const licencia = document.getElementById('licencia').files[0];
        const fotoVehiculo = document.getElementById('fotoVehiculo').files[0];
        const fotoPlacas = document.getElementById('fotoPlacas').files[0];
        
        // Validar archivos requeridos
        if (!credFrente) throw new Error("🪪 Credencial frente requerida");
        if (!credReverso) throw new Error("🪪 Credencial reverso requerida");
        if (!comprobante) throw new Error("🏠 Comprobante de domicilio requerido");
        if (!fotoVehiculo) throw new Error("📸 Foto del vehículo requerida");
        if (!fotoPlacas) throw new Error("🔢 Foto de placas requerida");
        
        mostrarMensaje("📤 Subiendo documentos...", "info");
        submitBtn.textContent = "⏳ Subiendo documentos...";
        
        // Subir archivos
        const urlFrente = await subirArchivo(credFrente, 'credenciales', `frente_${telefono}`);
        const urlReverso = await subirArchivo(credReverso, 'credenciales', `reverso_${telefono}`);
        const urlComprobante = await subirArchivo(comprobante, 'comprobantes', `domicilio_${telefono}`);
        const urlLicencia = licencia ? await subirArchivo(licencia, 'licencias', `licencia_${telefono}`) : null;
        const urlFotoVehi = await subirArchivo(fotoVehiculo, 'vehiculos', `vehiculo_${telefono}`);
        const urlFotoPlac = await subirArchivo(fotoPlacas, 'placas', `placas_${telefono}`);
        
        // Verificar archivos requeridos
        if (!urlFrente) throw new Error("❌ Error al subir credencial frente");
        if (!urlReverso) throw new Error("❌ Error al subir credencial reverso");
        if (!urlComprobante) throw new Error("❌ Error al subir comprobante");
        if (!urlFotoVehi) throw new Error("❌ Error al subir foto vehículo");
        if (!urlFotoPlac) throw new Error("❌ Error al subir foto placas");
        
        // Generar código único
        submitBtn.textContent = "⏳ Generando código...";
        let codigo = generarCodigo();
        let esUnico = false;
        let intentos = 0;
        
        while (!esUnico && intentos < 10) {
            const { data: existe } = await supabaseClient
                .from("repartidores")
                .select("codigo")
                .eq("codigo", codigo)
                .maybeSingle();
            
            if (!existe) {
                esUnico = true;
            } else {
                codigo = generarCodigo();
                intentos++;
            }
        }
        
        // Crear registro
        submitBtn.textContent = "⏳ Guardando registro...";
        
        const datosRepartidor = {
            nombre_completo: nombre,
            telefono: telefono,
            email: email || null,
            codigo: codigo,
            estado: "pendiente",
            credencial_frente: urlFrente,
            credencial_reverso: urlReverso,
            comprobante_domicilio: urlComprobante,
            licencia: urlLicencia,
            foto_vehiculo: urlFotoVehi,
            foto_placas: urlFotoPlac,
            marca_vehiculo: marcaVehiculo,
            color_vehiculo: colorVehiculo,
            fecha_registro: new Date().toISOString()
        };
        
        const { error: insertError } = await supabaseClient
            .from("repartidores")
            .insert([datosRepartidor]);
        
        if (insertError) {
            console.error("Error insert:", insertError);
            throw new Error(insertError.message);
        }
        
        // Mostrar código
        const mensajeDiv = document.getElementById('mensaje');
        mensajeDiv.innerHTML = `
            ✅ ¡Registro exitoso!<br><br>
            <strong style="font-size: 32px; color: #27ae60; display: block; margin: 10px 0;">${codigo}</strong><br>
            📱 Te hemos enviado tu código por WhatsApp.<br>
            ⚠️ Guarda este código, lo necesitarás para iniciar sesión.<br>
            Tu registro será revisado por el administrador.
        `;
        mensajeDiv.className = 'success';
        mensajeDiv.style.display = 'block';
        
        // Enviar WhatsApps
        submitBtn.textContent = "⏳ Enviando WhatsApp...";
        enviarWhatsAppRepartidor(telefono, nombre, codigo);
        enviarWhatsAppAdmin(datosRepartidor, codigo);
        
        // Limpiar formulario
        form.reset();
        document.querySelectorAll('.file-name').forEach(span => span.remove());
        
        submitBtn.textContent = "✅ Registro completo!";
        
        // Redirigir
        setTimeout(() => {
            window.location.href = 'login-repartidor.html';
        }, 5000);
        
    } catch (error) {
        console.error("❌ Error:", error);
        mostrarMensaje(`❌ ${error.message}`, "error");
        
        isSubmitting = false;
        submitBtn.textContent = textoOriginal;
        submitBtn.disabled = false;
    }
});

// Inicializar
setupFileInputs();

console.log("🚀 Página de registro lista");