const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isSubmitting = false;

// Función para generar código único de 6 dígitos
function generarCodigo() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Función para subir archivo a Supabase Storage
async function subirArchivo(file, carpeta, nombreArchivo) {
    if (!file) return null;
    
    const extension = file.name.split('.').pop();
    const fileName = `${carpeta}/${Date.now()}-${nombreArchivo}.${extension}`;
    
    const { error } = await supabase.storage
        .from("repartidores")
        .upload(fileName, file);
    
    if (error) {
        console.error("Error subiendo archivo:", error);
        return null;
    }
    
    const { data } = supabase.storage
        .from("repartidores")
        .getPublicUrl(fileName);
    
    return data.publicUrl;
}

// Mostrar nombre de archivo seleccionado
function setupFileInputs() {
    const inputs = [
        { id: 'credencialFrente', nameId: 'credencialFrenteName' },
        { id: 'credencialReverso', nameId: 'credencialReversoName' },
        { id: 'comprobanteDomicilio', nameId: 'comprobanteDomicilioName' },
        { id: 'licencia', nameId: 'licenciaName' },
        { id: 'fotoVehiculo', nameId: 'fotoVehiculoName' },
        { id: 'fotoPlacas', nameId: 'fotoPlacasName' }
    ];
    
    inputs.forEach(({ id, nameId }) => {
        const input = document.getElementById(id);
        const nameSpan = document.getElementById(nameId);
        
        if (input && nameSpan) {
            input.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    nameSpan.textContent = this.files[0].name;
                    nameSpan.style.color = '#27ae60';
                } else {
                    nameSpan.textContent = '';
                }
            });
        }
    });
}

// Mostrar mensaje
function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje');
    mensajeDiv.textContent = texto;
    mensajeDiv.className = `mensaje ${tipo}`;
    mensajeDiv.style.display = 'block';
    
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 5000);
}

// Enviar WhatsApp al admin
async function enviarWhatsAppAdmin(repartidor, codigo) {
    const adminWhatsApp = "5213111063251";
    
    const mensaje = `🛵 *NUEVO REPARTIDOR REGISTRADO* 🛵

👤 *Nombre:* ${repartidor.nombre_completo}
📞 *Teléfono:* ${repartidor.telefono}
✉️ *Email:* ${repartidor.email || "No especificado"}
🔑 *Código de acceso:* ${codigo}
🚗 *Vehículo:* ${repartidor.marca_vehiculo} - ${repartidor.color_vehiculo}
📅 *Fecha registro:* ${new Date().toLocaleString()}

✅ Pendiente de revisión de documentos`;

    const url = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

const form = document.getElementById('registroForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
        mostrarMensaje("⏳ Ya se está enviando el registro...", "info");
        return;
    }
    
    isSubmitting = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn.textContent;
    submitBtn.textContent = "⏳ Registrando...";
    submitBtn.disabled = true;
    
    try {
        // Validar teléfono
        const telefono = document.getElementById('telefono').value;
        if (!/^\d{10}$/.test(telefono)) {
            throw new Error("El teléfono debe tener 10 dígitos");
        }
        
        // Obtener archivos
        const credencialFrente = document.getElementById('credencialFrente').files[0];
        const credencialReverso = document.getElementById('credencialReverso').files[0];
        const comprobanteDomicilio = document.getElementById('comprobanteDomicilio').files[0];
        const licencia = document.getElementById('licencia').files[0];
        const fotoVehiculo = document.getElementById('fotoVehiculo').files[0];
        const fotoPlacas = document.getElementById('fotoPlacas').files[0];
        
        // Validar archivos requeridos
        if (!credencialFrente || !credencialReverso || !comprobanteDomicilio || !fotoVehiculo || !fotoPlacas) {
            throw new Error("Todos los documentos requeridos deben ser subidos");
        }
        
        // Subir archivos
        mostrarMensaje("📤 Subiendo documentos...", "info");
        
        const [urlCredencialFrente, urlCredencialReverso, urlComprobante, urlLicencia, urlFotoVehiculo, urlFotoPlacas] = await Promise.all([
            subirArchivo(credencialFrente, 'credenciales', `frente_${telefono}`),
            subirArchivo(credencialReverso, 'credenciales', `reverso_${telefono}`),
            subirArchivo(comprobanteDomicilio, 'comprobantes', `domicilio_${telefono}`),
            licencia ? subirArchivo(licencia, 'licencias', `licencia_${telefono}`) : null,
            subirArchivo(fotoVehiculo, 'vehiculos', `vehiculo_${telefono}`),
            subirArchivo(fotoPlacas, 'placas', `placas_${telefono}`)
        ]);
        
        if (!urlCredencialFrente || !urlCredencialReverso || !urlComprobante || !urlFotoVehiculo || !urlFotoPlacas) {
            throw new Error("Error al subir algunos documentos");
        }
        
        // Generar código único
        let codigo = generarCodigo();
        let codigoUnico = false;
        
        // Verificar que el código no exista
        while (!codigoUnico) {
            const { data: existente } = await supabase
                .from("repartidores")
                .select("codigo")
                .eq("codigo", codigo)
                .single();
            
            if (!existente) {
                codigoUnico = true;
            } else {
                codigo = generarCodigo();
            }
        }
        
        // Crear registro
        const datosRepartidor = {
            nombre_completo: document.getElementById('nombreCompleto').value,
            telefono: telefono,
            email: document.getElementById('email').value || null,
            codigo: codigo,
            estado: "pendiente", // pendiente, activo, rechazado
            credencial_frente: urlCredencialFrente,
            credencial_reverso: urlCredencialReverso,
            comprobante_domicilio: urlComprobante,
            licencia: urlLicencia,
            foto_vehiculo: urlFotoVehiculo,
            foto_placas: urlFotoPlacas,
            marca_vehiculo: document.getElementById('marcaVehiculo').value,
            color_vehiculo: document.getElementById('colorVehiculo').value,
            fecha_registro: new Date().toISOString()
        };
        
        const { error: insertError } = await supabase
            .from("repartidores")
            .insert([datosRepartidor]);
        
        if (insertError) {
            throw new Error(insertError.message);
        }
        
        // Mostrar código al usuario
        const mensajeDiv = document.getElementById('mensaje');
        mensajeDiv.innerHTML = `
            <div class="codigo-container">
                <strong>✅ ¡Registro exitoso!</strong><br><br>
                <div>Tu código de acceso es:</div>
                <div class="codigo">${codigo}</div>
                <div style="font-size: 12px; margin-top: 10px;">
                    ⚠️ Guarda este código, lo necesitarás para iniciar sesión.<br>
                    Tu registro será revisado por el administrador.
                </div>
            </div>
        `;
        mensajeDiv.className = 'mensaje success';
        mensajeDiv.style.display = 'block';
        
        // Enviar WhatsApp al admin
        await enviarWhatsAppAdmin(datosRepartidor, codigo);
        
        // Limpiar formulario
        form.reset();
        
        // Resetear nombres de archivos
        document.querySelectorAll('.file-name').forEach(span => {
            span.textContent = '';
        });
        
        // Redirigir después de 5 segundos
        setTimeout(() => {
            window.location.href = 'login-repartidor.html';
        }, 5000);
        
    } catch (error) {
        console.error("Error:", error);
        mostrarMensaje(`❌ ${error.message}`, "error");
        
        isSubmitting = false;
        submitBtn.textContent = textoOriginal;
        submitBtn.disabled = false;
    }
});

// Inicializar
setupFileInputs();