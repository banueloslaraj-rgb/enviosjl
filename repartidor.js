const SUPABASE_URL = "https://pknqqaxiqdllsygjctmb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbnFxYXhpcWRsbHN5Z2pjdG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY0MDEsImV4cCI6MjA5MDEyMjQwMX0.o3XrQk2xgN7F9qfHVVg1Ixz5ZYPQ_edZe9-jAENgiTc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const contenedor = document.getElementById("pedidos");

let repartidor = localStorage.getItem("repartidor") || "";

// Cargar nombre guardado
if (repartidor) {
  document.getElementById("nombre").value = repartidor;
}

function guardar() {
  const nombreInput = document.getElementById("nombre").value;

  if (!nombreInput) {
    alert("Escribe tu nombre");
    return;
  }

  localStorage.setItem("repartidor", nombreInput);
  repartidor = nombreInput;

  cargarPedidos();
}

async function cargarPedidos() {
  contenedor.innerHTML = '<div style="text-align:center; padding:20px;">🔄 Cargando pedidos...</div>';

  const { data, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) {
    contenedor.innerHTML = '<div style="color:red;">❌ Error al cargar pedidos</div>';
    return;
  }

  contenedor.innerHTML = "";

  if (!data || data.length === 0) {
    contenedor.innerHTML = '<div style="text-align:center; padding:20px;">📭 No hay pedidos disponibles</div>';
    return;
  }

  data.forEach(p => {
    // Mostrar solo pedidos pendientes o los asignados a este repartidor
    if (p.estado === "pendiente" || p.repartidor_id === repartidor) {

      const card = document.createElement("div");
      card.className = "card";
      
      // Añadir clase según estado para colorear
      if (p.estado === "pendiente") {
        card.classList.add("estado-pendiente");
      } else if (p.estado === "asignado") {
        card.classList.add("estado-asignado");
      } else if (p.estado === "entregado") {
        card.classList.add("estado-entregado");
      }

      // Formatear fecha si existe
      const fecha = p.fecha ? new Date(p.fecha).toLocaleString() : "Sin fecha";

      card.innerHTML = `
        <p><strong>🆔 Pedido #${p.id}</strong> <small>${fecha}</small></p>
        <p><strong>📍 Recolección:</strong> ${p.recoleccion}</p>
        <button class="map-btn" onclick="abrirMaps('${p.recoleccion.replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

        <p><strong>📍 Entrega:</strong> ${p.entrega}</p>
        <button class="map-btn" onclick="abrirMaps('${p.entrega.replace(/'/g, "\\'")}')">🗺️ Ver en mapa</button>

        <p><strong>👤 Envía:</strong> ${p.remitente}</p>
        <p><strong>📞 Tel:</strong> ${p.tel_remitente || "No disponible"}</p>
        <a href="tel:${p.tel_remitente}" class="btn-call">📞 Llamar al remitente</a>

        <p><strong>👤 Recibe:</strong> ${p.destinatario}</p>
        <p><strong>📞 Tel:</strong> ${p.tel_destinatario || "No disponible"}</p>
        <a href="tel:${p.tel_destinatario}" class="btn-call">📞 Llamar al destinatario</a>

        <p><strong>📦 Descripción:</strong> ${p.descripcion}</p>
        <p><strong>💰 Pago producto:</strong> $${p.precio}</p>
        <p><strong>🚚 Envío:</strong> ${p.envio || "-"}</p>
        <p><strong>📊 Estado:</strong> <span class="estado-texto">${p.estado.toUpperCase()}</span></p>

        <div class="imagenes">
          ${(p.fotos || []).map(f => `<img src="${f}" onclick="verImagen('${f}')" />`).join("")}
        </div>
      `;

      // Botones según estado
      const btnContainer = document.createElement("div");
      btnContainer.style.marginTop = "10px";

      if (p.estado === "pendiente") {
        const btnAceptar = document.createElement("button");
        btnAceptar.textContent = "✅ Aceptar pedido";
        btnAceptar.onclick = () => aceptarPedido(p.id);
        btnAceptar.style.background = "#28a745";
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

      card.appendChild(btnContainer);
      contenedor.appendChild(card);
    }
  });
}

async function aceptarPedido(id) {
  if (!repartidor) {
    alert("⚠️ Guarda tu nombre primero");
    return;
  }

  // Mostrar feedback visual
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
    alert("Error al aceptar pedido");
    btn.textContent = textoOriginal;
    btn.disabled = false;
  }
}

async function cambiarEstado(id, nuevoEstado) {
  // Mostrar feedback visual
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
    alert("Error al actualizar estado");
    btn.textContent = textoOriginal;
    btn.disabled = false;
  }
}

function abrirMaps(direccion) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
  window.open(url, "_blank");
}

function verImagen(url) {
  window.open(url, "_blank");
}

// Escuchar cambios en tiempo real con efecto de notificación
supabaseClient
  .channel("pedidos")
  .on("postgres_changes",
    { event: "*", schema: "public", table: "pedidos" },
    (payload) => {
      // Reproducir sonido opcional (si se desea)
      // new Audio('notification.mp3').play();
      
      // Mostrar notificación visual
      const notif = document.createElement("div");
      notif.textContent = "📦 ¡Nuevo pedido disponible!";
      notif.style.position = "fixed";
      notif.style.bottom = "80px";
      notif.style.right = "20px";
      notif.style.background = "#28a745";
      notif.style.color = "white";
      notif.style.padding = "10px 15px";
      notif.style.borderRadius = "10px";
      notif.style.zIndex = "1000";
      notif.style.animation = "pulse 0.5s ease";
      document.body.appendChild(notif);
      setTimeout(() => notif.remove(), 3000);
      
      cargarPedidos();
    }
  )
  .subscribe();

// Cargar al inicio
cargarPedidos();