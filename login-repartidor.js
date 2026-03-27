const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isLogging = false;

function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje');
    mensajeDiv.textContent = texto;
    mensajeDiv.className = `mensaje ${tipo}`;
    mensajeDiv.style.display = 'block';
    
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
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
        // Buscar repartidor por código
        const { data: repartidor, error } = await supabase
            .from("repartidores")
            .select("*")
            .eq("codigo", codigo)
            .single();
        
        if (error || !repartidor) {
            throw new Error("Código incorrecto o repartidor no encontrado");
        }
        
        // Verificar estado
        if (repartidor.estado !== "activo") {
            let mensaje = "";
            if (repartidor.estado === "pendiente") {
                mensaje = "⏳ Tu registro está pendiente de revisión por el administrador. Por favor espera la aprobación.";
            } else if (repartidor.estado === "rechazado") {
                mensaje = "❌ Tu registro ha sido rechazado. Contacta al administrador para más información.";
            }
            throw new Error(mensaje);
        }
        
        // Guardar sesión
        localStorage.setItem("repartidor_id", repartidor.id);
        localStorage.setItem("repartidor_nombre", repartidor.nombre_completo);
        localStorage.setItem("repartidor_telefono", repartidor.telefono);
        localStorage.setItem("repartidor_codigo", repartidor.codigo);
        
        mostrarMensaje("✅ ¡Bienvenido! Redirigiendo...", "success");
        
        // Redirigir a la página de pedidos
        setTimeout(() => {
            window.location.href = "repartidor.html";
        }, 1500);
        
    } catch (error) {
        console.error("Error:", error);
        mostrarMensaje(error.message, "error");
        
        isLogging = false;
        loginBtn.textContent = textoOriginal;
        loginBtn.disabled = false;
        codigoInput.value = "";
        codigoInput.focus();
    }
}

// Eventos
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('codigo').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        login();
    }
});

// Limitar a solo números
document.getElementById('codigo').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
});