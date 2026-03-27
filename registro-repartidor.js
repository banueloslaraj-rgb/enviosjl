const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isSubmitting = false;

function generarCodigo() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function subirArchivo(file, carpeta, nombreArchivo) {
    if (!file) return null;
    const extension = file.name.split('.').pop();
    const fileName = `${carpeta}/${Date.now()}-${nombreArchivo}.${extension}`;
    const { error } = await supabase.storage.from("repartidores").upload(fileName, file);
    if (error) return null;
    const { data } = supabase.storage.from("repartidores").getPublicUrl(fileName);
    return data.publicUrl;
}

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
                    nameSpan.style.display = 'block';
                } else {
                    nameSpan.textContent = '';
                    nameSpan.style.display = 'none';
                }
            });
        }
    });
}

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById('mensaje');
    mensaje.textContent = texto;
    mensaje.className = tipo;
    setTimeout(() => {
        mensaje.textContent = '';
        mensaje.className = '';
    }, 5000);
}

async function enviarWhatsAppAdmin(repartidor, codigo) {
    const mensaje = `🛵 *NUEVO REPARTIDOR REGISTRADO* 🛵\n\n👤 *Nombre:* ${repartidor.nombre_completo}\n📞 *Teléfono:* ${repartidor.telefono}\n🔑 *Código:* ${codigo}\n🚗 *Vehículo:* ${repartidor.marca_vehiculo} - ${repartidor.color_vehiculo}\n📅 *Fecha:* ${new Date().toLocaleString()}\n\n✅ Pendiente de revisión`;
    window.open(`https://wa.me/5213111063251?text=${encodeURIComponent(mensaje)}`, '_blank');
}

const form = document.getElementById('registroForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return mostrarMensaje("⏳ Ya se está enviando...", "error");
    
    isSubmitting = true;
    const submitBtn = form.querySelector('button');
    const textoOriginal = submitBtn.textContent;
    submitBtn.textContent = "⏳ Registrando...";
    submitBtn.disabled = true;
    
    try {
        const telefono = document.getElementById('telefono').value;
        if (!/^\d{10}$/.test(telefono)) throw new Error("El teléfono debe tener 10 dígitos");
        
        const credencialFrente = document.getElementById('credencialFrente').files[0];
        const credencialReverso = document.getElementById('credencialReverso').files[0];
        const comprobanteDomicilio = document.getElementById('comprobanteDomicilio').files[0];
        const fotoVehiculo = document.getElementById('fotoVehiculo').files[0];
        const fotoPlacas = document.getElementById('fotoPlacas').files[0];
        
        if (!credencialFrente || !credencialReverso || !comprobanteDomicilio || !fotoVehiculo || !fotoPlacas) {
            throw new Error("Todos los documentos requeridos deben ser subidos");
        }
        
        mostrarMensaje("📤 Subiendo documentos...", "info");
        
        const [urlFrente, urlReverso, urlComprobante, urlFotoVehiculo, urlFotoPlacas] = await Promise.all([
            subirArchivo(credencialFrente, 'credenciales', `frente_${telefono}`),
            subirArchivo(credencialReverso, 'credenciales', `reverso_${telefono}`),
            subirArchivo(comprobanteDomicilio, 'comprobantes', `domicilio_${telefono}`),
            subirArchivo(fotoVehiculo, 'vehiculos', `vehiculo_${telefono}`),
            subirArchivo(fotoPlacas, 'placas', `placas_${telefono}`)
        ]);
        
        const licencia = document.getElementById('licencia').files[0];
        const urlLicencia = licencia ? await subirArchivo(licencia, 'licencias', `licencia_${telefono}`) : null;
        
        let codigo = generarCodigo();
        let existe = true;
        while (existe) {
            const { data } = await supabase.from("repartidores").select("codigo").eq("codigo", codigo).single();
            if (!data) existe = false;
            else codigo = generarCodigo();
        }
        
        const datos = {
            nombre_completo: document.getElementById('nombreCompleto').value,
            telefono: telefono,
            email: document.getElementById('email').value || null,
            codigo: codigo,
            estado: "pendiente",
            credencial_frente: urlFrente,
            credencial_reverso: urlReverso,
            comprobante_domicilio: urlComprobante,
            licencia: urlLicencia,
            foto_vehiculo: urlFotoVehiculo,
            foto_placas: urlFotoPlacas,
            marca_vehiculo: document.getElementById('marcaVehiculo').value,
            color_vehiculo: document.getElementById('colorVehiculo').value,
            fecha_registro: new Date().toISOString()
        };
        
        const { error } = await supabase.from("repartidores").insert([datos]);
        if (error) throw new Error(error.message);
        
        const mensajeDiv = document.getElementById('mensaje');
        mensajeDiv.innerHTML = `✅ ¡Registro exitoso!<br><strong>Tu código es: ${codigo}</strong><br>⚠️ Guárdalo para iniciar sesión.<br>Tu registro será revisado por el administrador.`;
        mensajeDiv.className = 'success';
        
        await enviarWhatsAppAdmin(datos, codigo);
        
        form.reset();
        document.querySelectorAll('.file-name').forEach(span => {
            span.textContent = '';
            span.style.display = 'none';
        });
        
        setTimeout(() => {
            window.location.href = 'login-repartidor.html';
        }, 5000);
        
    } catch (error) {
        mostrarMensaje(`❌ ${error.message}`, "error");
        submitBtn.textContent = textoOriginal;
        submitBtn.disabled = false;
        isSubmitting = false;
    }
});

setupFileInputs();