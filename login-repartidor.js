// 🔥 CONEXIÓN SUPABASE - Usar supabaseClient para evitar conflicto
const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isLogging = false;

function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje');
    if (!mensajeDiv) return;
    
    mensajeDiv.textContent = texto;
    mensajeDiv.className = `mensaje ${tipo}`;
    mensajeDiv.style.display = 'block';
    
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
        mensajeDiv.textContent = '';
    }, 5000);
}

async function login() {
    if (isLogging) return;
    
    const codigoInput = document.getElementById('codigo');
    const codigo = codigoInput.value.trim();
    
    if (!codigo || codigo.length !== 6) {
        mostrarMensaje("❌ Ingresa un código válido de 6 dígitos", "error");
        return;
    }
    
    isLogging = true;
    const loginBtn = document.getElementById('loginBtn');
    const textoOriginal = loginBtn.textContent;
    loginBtn.textContent = "⏳ Verificando...";
    loginBtn.disabled = true;
    
    try {
        console.log("🔍 Buscando repartidor con código:", codigo);
        
        // Buscar repartidor por código - usar maybeSingle para evitar error si no existe
        const { data: repartidor, error } = await supabaseClient
            .from("repartidores")
            .select("*")
            .eq("codigo", codigo)
            .maybeSingle();
        
        if (error) {
            console.error("❌ Error de consulta:", error);
            throw new Error("Error al verificar código");
        }
        
        if (!repartidor) {
            console.log("❌ Código no encontrado");
            throw new Error("Código incorrecto o repartidor no encontrado");
        }
        
        console.log("✅ Repartidor encontrado:", repartidor.nombre_completo);
        console.log("📊 Estado:", repartidor.estado);
        
        // Verificar estado
        if (repartidor.estado !== "activo") {
            let mensaje = "";
            if (repartidor.estado === "pendiente") {
                mensaje = "⏳ Tu registro está pendiente de revisión por el administrador. Por favor espera la aprobación.";
            } else if (repartidor.estado === "rechazado") {
                mensaje = "❌ Tu registro ha sido rechazado. Contacta al administrador para más información.";
            } else {
                mensaje = `❌ Tu cuenta está en estado "${repartidor.estado}". Contacta al administrador.`;
            }
            throw new Error(mensaje);
        }
        
        // Guardar sesión
        localStorage.setItem("repartidor_id", repartidor.id);
        localStorage.setItem("repartidor_nombre", repartidor.nombre_completo);
        localStorage.setItem("repartidor_telefono", repartidor.telefono);
        localStorage.setItem("repartidor_codigo", repartidor.codigo);
        
        console.log("✅ Sesión guardada");
        
        mostrarMensaje("✅ ¡Bienvenido! Redirigiendo...", "success");
        
        // Redirigir a la página de pedidos
        setTimeout(() => {
            window.location.href = "repartidor.html";
        }, 1500);
        
    } catch (error) {
        console.error("❌ Error en login:", error);
        mostrarMensaje(error.message, "error");
        
        isLogging = false;
        loginBtn.textContent = textoOriginal;
        loginBtn.disabled = false;
        if (codigoInput) {
            codigoInput.value = "";
            codigoInput.focus();
        }
    }
}

// Eventos cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Página de login de repartidores lista");
    
    const loginBtn = document.getElementById('loginBtn');
    const codigoInput = document.getElementById('codigo');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    }
    
    if (codigoInput) {
        codigoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
        
        // Limitar a solo números y máximo 6 dígitos
        codigoInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        });
    }
});