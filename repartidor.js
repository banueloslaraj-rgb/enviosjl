const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const contenedor = document.getElementById("pedidos");
let repartidor = localStorage.getItem("repartidor") || "";

// Detectar si es iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Función para obtener URL de imagen compatible con iOS
function getImageUrl(url) {
    if (!url) return "";
    
    // Si es iOS, añadir timestamp para evitar caché
    if (isIOS) {
        // Asegurar que la URL tenga https
        let fixedUrl = url;
        if (fixedUrl.startsWith('http://')) {
            fixedUrl = fixedUrl.replace('http://', 'https://');
        }
        // Añadir timestamp para evitar caché en iOS
        const separator = fixedUrl.includes('?') ? '&' : '?';
        return `${fixedUrl}${separator}t=${Date.now()}`;
    }
    return url;
}

// Función para verificar si una imagen carga correctamente
function testImageUrl(url, callback) {
    const img = new Image();
    img.onload = () => callback(true);
    img.onerror = () => callback(false);
    img.src = url;
}

// Función para cargar imágenes con fallback
function crearImagenConFallback(url, index) {
    const img = document.createElement('img');
    const urlConTimestamp = getImageUrl(url);
    
    img.src = urlConTimestamp;
    img.loading = "lazy";
    img.style.width = "70px";
    img.style.height = "70px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";
    img.style.cursor = "pointer";
    img.style.border = "1px solid #ddd";
    img.style.backgroundColor = "#f8f9fa";
    
    // Evento para abrir imagen en nueva ventana al hacer clic
    img.onclick = () => {
        window.open(url, "_blank");
    };
    
    // Si falla la carga, intentar con URL alternativa
    img.onerror = () => {
        console.log(`Error cargando imagen ${index}, intentando con URL alternativa...`);
        // Intentar con la URL original sin timestamp
        if (img.src !== url) {
            img.src = url;
        } else {
            // Si sigue fallando, mostrar placeholder
            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='2' y='2' width='20' height='20' rx='2.18' ry='2.18'%3E%3C/rect%3E%3Cpath d='M8 2v20M16 2v20M2 8h20M2 16h20'%3E%3C/path%3E%3C/svg%3E";
            img.style.objectFit = "contain";
            img.style.backgroundColor = "#f0f0f0";
            img.title = "No se pudo cargar la imagen";
        }
    };
    
    return img;
}

function guardar() {
    const nombreInput = document.getElementById("nombre").value;
    if (!nombreInput) {
        alert("⚠️ Escribe tu nombre");
        return;
    }
    localStorage.setItem("repartidor", nombreInput);
    repartidor = nombreInput;
    cargarPedidos();
}

async function cargarPedidos() {
    contenedor.innerHTML = '<div class="loader">🔄 Cargando pedidos...</div>';

    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("*")
        .order("fecha", { ascending: false });

    if (error) {
        contenedor.innerHTML = '<div style="color:red; text-align:center;">❌ Error al cargar pedidos</div>';
        return;
    }

    contenedor.innerHTML = "";

    if (!data || data.length === 0) {
        contenedor.innerHTML = '<div style="text-align:center; padding:20px;">📭 No hay pedidos disponibles</div>';
        return;
    }

    data.forEach(p => {
        if (p.estado === "pendiente" || p.repartidor_id === repartidor) {
            const card = document.createElement("div");
            card.className = "card";
            
            if (p.estado === "pendiente") {
                card.classList.add("estado-pendiente");
            } else if (p.estado === "asignado") {
                card.classList.add("estado-asignado");
            } else if (p.estado === "entregado") {
                card.classList.add("estado-entregado");
            }

            let fechaFormateada = "Sin fecha";
            if (p.fecha) {
                const fechaObj = new Date(p.fecha);
                fechaFormateada = fechaObj.toLocaleString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            // Crear contenedor de imágenes con método mejorado para iOS
            const imagenesContainer = document.createElement("div");
            imagenesContainer.className = "imagenes";
            
            if (p.fotos && p.fotos.length > 0) {
                const label = document.createElement("strong");
                label.textContent = "📸 Fotos del pedido:";
                imagenesContainer.appendChild(label);
                
                const gridContainer = document.createElement("div");
                gridContainer.className = "imagenes-container";
                gridContainer.style.display = "flex";
                gridContainer.style.flexWrap = "wrap";
                gridContainer.style.gap = "8px";
                gridContainer.style.marginTop = "8px";
                
                // Agregar cada imagen con manejo especial para iOS
                p.fotos.forEach((fotoUrl, idx) => {
                    if (fotoUrl && fotoUrl.trim() !== "") {
                        const img = crearImagenConFallback(fotoUrl, idx);
                        gridContainer.appendChild(img);
                    }
                });
                
                imagenesContainer.appendChild(gridContainer);
            } else {
                const noFotos = document.createElement("small");
                noFotos.textContent = "Sin fotos";
                noFotos.style.color = "#999";
                imagenesContainer.appendChild(noFotos);
            }

            // Construir el resto del HTML
            const infoDiv = document.createElement("div");
            infoDiv.innerHTML = `
                <div class="pedido-header">
                    <strong>🆔 Pedido #${p.id}</strong>
                    <span class="pedido-fecha">📅 ${fechaFormateada}</span>
                </div>
                
                <p><strong>📍 Recolección:</strong> ${escapeHtml(p.recoleccion)}</p>
                <button class="map-btn" onclick="abrirMaps('${escapeHtml(p.recoleccion).replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

                <p><strong>📍 Entrega:</strong> ${escapeHtml(p.entrega)}</p>
                <button class="map-btn" onclick="abrirMaps('${escapeHtml(p.entrega).replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

                <p><strong>👤 Envía:</strong> ${escapeHtml(p.remitente)}</p>
                <p><strong>📞 Tel:</strong> ${escapeHtml(p.tel_remitente) || "No disponible"}</p>
                <a href="tel:${escapeHtml(p.tel_remitente)}" class="btn-call">📞 Llamar al remitente</a>

                <p><strong>👤 Recibe:</strong> ${escapeHtml(p.destinatario)}</p>
                <p><strong>📞 Tel:</strong> ${escapeHtml(p.tel_destinatario) || "No disponible"}</p>
                <a href="tel:${escapeHtml(p.tel_destinatario)}" class="btn-call">📞 Llamar al destinatario</a>

                <p><strong>📦 Descripción:</strong> ${escapeHtml(p.descripcion)}</p>
                <p><strong>💰 Pago producto:</strong> <strong style="color:#27ae60;">$${p.precio}</strong></p>
                <p><strong>🚚 Envío:</strong> ${p.envio || "-"}</p>
                <p><strong>📊 Estado:</strong> <span class="estado-texto">${p.estado.toUpperCase()}</span></p>
            `;
            
            card.appendChild(infoDiv);
            card.appendChild(imagenesContainer);

            // Botones de acción
            const btnContainer = document.createElement("div");
            btnContainer.className = "botones-accion";

            if (p.estado === "pendiente") {
                const btnAceptar = document.createElement("button");
                btnAceptar.textContent = "✅ Aceptar pedido";
                btnAceptar.onclick = () => aceptarPedido(p.id);
                btnContainer.appendChild(btnAceptar);
            }

            if (p.repartidor_id === repartidor && p.estado === "asignado") {
                const btnEnCamino = document.createElement("button");
                btnEnCamino.textContent = "🚚 En camino";
                btnEnCamino.onclick = () => cambiarEstado(p.id, "en camino");
                btnEnCamino.style.background = "#17a2b8";
                
                const btnEntregado = document.createElement("button");
                btnEntregado.textContent = "✅ Entregado";
                btnEntregado.onclick = () => cambiarEstado(p.id, "entregado");
                btnEntregado.style.background = "#6c757d";
                
                btnContainer.appendChild(btnEnCamino);
                btnContainer.appendChild(btnEntregado);
            }

            if (p.repartidor_id === repartidor && p.estado === "en camino") {
                const btnEntregado = document.createElement("button");
                btnEntregado.textContent = "✅ Marcar como entregado";
                btnEntregado.onclick = () => cambiarEstado(p.id, "entregado");
                btnEntregado.style.background = "#28a745";
                btnContainer.appendChild(btnEntregado);
            }

            if (btnContainer.children.length > 0) {
                card.appendChild(btnContainer);
            }

            contenedor.appendChild(card);
        }
    });
}

// Función para escapar HTML y prevenir XSS
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function aceptarPedido(id) {
    if (!repartidor) {
        alert("⚠️ Guarda tu nombre primero");
        return;
    }

    const btn = event.target;
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Procesando...";
    btn.disabled = true;

    try {
        await supabaseClient
            .from("pedidos")
            .update({ estado: "asignado", repartidor_id: repartidor })
            .eq("id", id);
        cargarPedidos();
    } catch (error) {
        alert("❌ Error al aceptar pedido");
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

async function cambiarEstado(id, nuevoEstado) {
    const btn = event.target;
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Actualizando...";
    btn.disabled = true;

    try {
        await supabaseClient
            .from("pedidos")
            .update({ estado: nuevoEstado })
            .eq("id", id);
        cargarPedidos();
    } catch (error) {
        alert("❌ Error al actualizar estado");
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

function abrirMaps(direccion) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    window.open(url, "_blank");
}

// Escuchar cambios en tiempo real
supabaseClient
    .channel("pedidos")
    .on("postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => cargarPedidos()
    )
    .subscribe();

// Mostrar mensaje si es iOS
if (isIOS) {
    console.log("📱 Detectado iPhone/iOS - Aplicando optimizaciones para imágenes");
}

// Cargar al inicio
if (repartidor) {
    cargarPedidos();
} else {
    contenedor.innerHTML = '<div style="text-align:center; padding:20px;">👋 Ingresa tu nombre para comenzar</div>';
}