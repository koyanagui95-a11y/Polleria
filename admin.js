"use strict";

const SUPABASE_URL = "https://tgvlkchrcbqytwzxvyvr.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_o3oeAVI9jAMK_FeFGgRyYA_rckwVE1H";
const BUCKET = "imagenes_polleria";
const clienteSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

let categoriasCache = [];
let imagenNosotrosActual = null;

const PLACEHOLDER_IMG = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#e2cfb6"/>
    <text x="50%" y="55%" font-size="70" text-anchor="middle" dominant-baseline="middle">🍽️</text>
  </svg>`
);

function urlImagen(nombre) {
  if (!nombre) return PLACEHOLDER_IMG;
  const { data } = clienteSupabase.storage.from(BUCKET).getPublicUrl(nombre);
  return data.publicUrl || PLACEHOLDER_IMG;
}

function manejarErrorImagen(imgEl) {
  imgEl.addEventListener("error", () => { imgEl.src = PLACEHOLDER_IMG; }, { once: true });
}

const seccionLogin = document.getElementById("seccionLogin");
const seccionAdmin = document.getElementById("seccionAdmin");
const formLogin = document.getElementById("formLogin");
const contenedorPlatillos = document.getElementById("contenedorPlatillos");
const contenedorCategorias = document.getElementById("contenedorCategorias");
const formConfig = document.getElementById("formConfig");
const filtroCategoria = document.getElementById("filtroCategoriaPlatillos");

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initLogin();
  initBotonesCrud();
  verificarSesion();
});

function initTabs() {
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((b) => b.classList.remove("activo"));
      document.querySelectorAll(".admin-tab-content").forEach((c) => c.classList.add("oculto"));
      btn.classList.add("activo");
      document.getElementById(btn.dataset.tab).classList.remove("oculto");
    });
  });
}

function initLogin() {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("correo").value.trim();
    const password = document.getElementById("contrasena").value;

    const { error } = await clienteSupabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Error al iniciar sesión: " + error.message);
      return;
    }
    await verificarSesion();
  });

  document.getElementById("btnCerrarSesion").addEventListener("click", async () => {
    await clienteSupabase.auth.signOut();
    verificarSesion();
  });
}

async function verificarSesion() {
  const { data: { session } } = await clienteSupabase.auth.getSession();

  if (session) {
    seccionLogin.classList.add("oculto");
    seccionAdmin.classList.remove("oculto");
    document.getElementById("sesionActual").textContent = `Sesión: ${session.user.email}`;

    await cargarCategoriasAdmin();
    await cargarPlatillosAdmin();
    await cargarConfiguracionAdmin();
  } else {
    seccionLogin.classList.remove("oculto");
    seccionAdmin.classList.add("oculto");
  }
}

async function cargarCategoriasAdmin() {
  contenedorCategorias.innerHTML = "<p>Cargando categorías...</p>";
  const { data, error } = await clienteSupabase
    .from("categorias").select("*").order("created_at", { ascending: true });

  if (error) { contenedorCategorias.innerHTML = "<p>Error al cargar categorías.</p>"; return; }

  categoriasCache = data || [];
  contenedorCategorias.innerHTML = "";

  categoriasCache.forEach((cat) => {
    const card = document.createElement("div");
    card.className = "card-admin";

    const img = document.createElement("img");
    img.src = urlImagen(cat.imagen);
    img.alt = cat.nombre;
    img.title = "Clic para cambiar imagen";
    manejarErrorImagen(img);

    card.appendChild(img);
    card.insertAdjacentHTML("beforeend", `
      <label>Nombre:</label>
      <input type="text" class="inputNombre" value="${cat.nombre}">
      <label>Slug:</label>
      <input type="text" value="${cat.slug}" disabled>
      <button class="admin-btn admin-btn--primary btnGuardar">Guardar Cambios</button>
      <button class="admin-btn admin-btn--danger btnBorrar">Eliminar Categoría</button>
    `);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    card.appendChild(fileInput);

    img.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const nombreArchivo = `cat_${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await clienteSupabase.storage.from(BUCKET).upload(nombreArchivo, file, { upsert: true });
      if (upErr) { alert("Error al subir imagen: " + upErr.message); return; }
      await clienteSupabase.from("categorias").update({ imagen: nombreArchivo }).eq("id", cat.id);
      await cargarCategoriasAdmin();
    });

    card.querySelector(".btnGuardar").addEventListener("click", async () => {
      const nuevoNombre = card.querySelector(".inputNombre").value.trim();
      if (!nuevoNombre) { alert("El nombre no puede estar vacío."); return; }
      const { error } = await clienteSupabase.from("categorias").update({ nombre: nuevoNombre }).eq("id", cat.id);
      if (error) alert("Error: " + error.message);
      else { alert("¡Categoría actualizada!"); await cargarCategoriasAdmin(); }
    });

    card.querySelector(".btnBorrar").addEventListener("click", async () => {
      if (!confirm(`¿Eliminar la categoría "${cat.nombre}" y TODOS sus platillos?`)) return;
      await clienteSupabase.from("platillos").delete().eq("categoria", cat.slug);
      await clienteSupabase.from("categorias").delete().eq("id", cat.id);
      await cargarCategoriasAdmin();
      await cargarPlatillosAdmin();
    });

    contenedorCategorias.appendChild(card);
  });
}

function llenarSelectsCategorias() {
  const valorActual = filtroCategoria.value;
  filtroCategoria.innerHTML = '<option value="">Todas</option>';
  categoriasCache.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.slug;
    opt.textContent = cat.nombre;
    filtroCategoria.appendChild(opt);
  });
  filtroCategoria.value = valorActual;
}

async function cargarPlatillosAdmin() {
  contenedorPlatillos.innerHTML = "<p>Cargando platillos...</p>";

  let query = clienteSupabase.from("platillos").select("*").order("created_at", { ascending: true });
  const slugFiltro = filtroCategoria?.value;
  if (slugFiltro) query = query.eq("categoria", slugFiltro);

  const { data, error } = await query;
  if (error) { contenedorPlatillos.innerHTML = "<p>Error al cargar.</p>"; return; }

  llenarSelectsCategorias();
  contenedorPlatillos.innerHTML = "";

  (data || []).forEach((platillo) => {
    const card = document.createElement("div");
    card.className = "card-admin";

    const img = document.createElement("img");
    img.src = urlImagen(platillo.imagen);
    img.alt = platillo.nombre;
    img.title = "Clic para cambiar imagen";
    manejarErrorImagen(img);

    card.appendChild(img);
    card.insertAdjacentHTML("beforeend", `
      <label>Nombre:</label>
      <input type="text" class="inputNombre" value="${platillo.nombre}">
      <label>Categoría:</label>
      <select class="inputCat">
        ${categoriasCache.map((c) =>
          `<option value="${c.slug}" ${c.slug === platillo.categoria ? "selected" : ""}>${c.nombre}</option>`
        ).join("")}
      </select>
      <label>Descripción:</label>
      <textarea class="inputDesc">${platillo.descripcion || ""}</textarea>
      <label>Precio (S/):</label>
      <input type="number" step="0.01" class="inputPrecio" value="${platillo.precio}">
      <button class="admin-btn admin-btn--primary btnGuardar">Guardar Cambios</button>
      <button class="admin-btn admin-btn--danger btnBorrar">Eliminar Platillo</button>
    `);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    card.appendChild(fileInput);

    img.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const nombreArchivo = `platillo_${Date.now()}.${file.name.split(".").pop()}`;
      img.style.opacity = "0.5";
      const { error: upErr } = await clienteSupabase.storage.from(BUCKET).upload(nombreArchivo, file, { upsert: true });
      if (upErr) { alert("Error al subir imagen: " + upErr.message); img.style.opacity = "1"; return; }
      await clienteSupabase.from("platillos").update({ imagen: nombreArchivo }).eq("id", platillo.id);
      await cargarPlatillosAdmin();
    });

    card.querySelector(".btnGuardar").addEventListener("click", async () => {
      const { error } = await clienteSupabase.from("platillos").update({
        nombre: card.querySelector(".inputNombre").value.trim(),
        categoria: card.querySelector(".inputCat").value,
        descripcion: card.querySelector(".inputDesc").value.trim(),
        precio: parseFloat(card.querySelector(".inputPrecio").value) || 0
      }).eq("id", platillo.id);

      if (error) alert("Error al guardar: " + error.message);
      else alert("¡Platillo guardado!");
    });

    card.querySelector(".btnBorrar").addEventListener("click", async () => {
      if (!confirm(`¿Eliminar "${platillo.nombre}"?`)) return;
      await clienteSupabase.from("platillos").delete().eq("id", platillo.id);
      await cargarPlatillosAdmin();
    });

    contenedorPlatillos.appendChild(card);
  });
}

function initBotonesCrud() {
  document.getElementById("btnNuevoPlatillo").addEventListener("click", async () => {
    if (!categoriasCache.length) {
      alert("Primero crea una categoría.");
      return;
    }
    const slug = filtroCategoria.value || categoriasCache[0].slug;
    await clienteSupabase.from("platillos").insert([{
      nombre: "Nuevo Platillo",
      descripcion: "Descripción breve...",
      precio: 0.00,
      categoria: slug,
      imagen: null
    }]);
    await cargarPlatillosAdmin();
  });

  document.getElementById("btnNuevaCategoria").addEventListener("click", async () => {
    const nombre = prompt("Nombre de la nueva categoría:", "NUEVA CATEGORÍA");
    if (!nombre) return;
    const slug = nombre.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    await clienteSupabase.from("categorias").insert([{ nombre, slug, imagen: null }]);
    await cargarCategoriasAdmin();
    await cargarPlatillosAdmin();
  });

  filtroCategoria?.addEventListener("change", () => cargarPlatillosAdmin());
}

async function cargarConfiguracionAdmin() {
  const { data } = await clienteSupabase.from("configuracion").select("*").eq("id", 1).single();
  if (!data) return;

  document.getElementById("cfgHeroTitulo").value = data.hero_titulo || "El Brasero";
  document.getElementById("cfgHeroEyebrow").value = data.hero_eyebrow || "";
  document.getElementById("cfgHeroSubtitulo").value = data.hero_subtitulo || "";

  imagenNosotrosActual = data.nosotros_imagen || null;
  document.getElementById("previewNosotros").src = urlImagen(imagenNosotrosActual);
  manejarErrorImagen(document.getElementById("previewNosotros"));
  document.getElementById("cfgNosotros1").value = data.nosotros_texto_1 || "";
  document.getElementById("cfgNosotros2").value = data.nosotros_texto_2 || "";

  document.getElementById("cfgContactoSubtitulo").value = data.contacto_subtitulo || "";
  document.getElementById("cfgCtaTitulo").value = data.contacto_cta_titulo || "";
  document.getElementById("cfgCtaSubtitulo").value = data.contacto_cta_subtitulo || "";
  document.getElementById("cfgDireccion").value = data.direccion || "";
  document.getElementById("cfgHorario").value = data.horario || "";
  document.getElementById("cfgTelefono").value = data.telefono || "";
  document.getElementById("cfgWhatsapp").value = data.whatsapp || "";
  document.getElementById("cfgEmail").value = data.email || "";
}

formConfig.addEventListener("submit", async (e) => {
  e.preventDefault();

  let nuevaImagen = imagenNosotrosActual;
  const inputImg = document.getElementById("inputImgNosotros");

  if (inputImg.files?.[0]) {
    const file = inputImg.files[0];
    const nombreArchivo = `nosotros_${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await clienteSupabase.storage.from(BUCKET).upload(nombreArchivo, file, { upsert: true });
    if (upErr) { alert("Error al subir imagen: " + upErr.message); return; }
    nuevaImagen = nombreArchivo;
  }

  const { error } = await clienteSupabase.from("configuracion").update({
    hero_titulo: document.getElementById("cfgHeroTitulo").value.trim(),
    hero_eyebrow: document.getElementById("cfgHeroEyebrow").value.trim(),
    hero_subtitulo: document.getElementById("cfgHeroSubtitulo").value.trim(),
    nosotros_imagen: nuevaImagen,
    nosotros_texto_1: document.getElementById("cfgNosotros1").value.trim(),
    nosotros_texto_2: document.getElementById("cfgNosotros2").value.trim(),
    contacto_subtitulo: document.getElementById("cfgContactoSubtitulo").value.trim(),
    contacto_cta_titulo: document.getElementById("cfgCtaTitulo").value.trim(),
    contacto_cta_subtitulo: document.getElementById("cfgCtaSubtitulo").value.trim(),
    direccion: document.getElementById("cfgDireccion").value.trim(),
    horario: document.getElementById("cfgHorario").value.trim(),
    telefono: document.getElementById("cfgTelefono").value.trim(),
    whatsapp: document.getElementById("cfgWhatsapp").value.trim(),
    email: document.getElementById("cfgEmail").value.trim()
  }).eq("id", 1);

  if (error) alert("Error al guardar configuración: " + error.message);
  else { alert("¡Configuración actualizada!"); await cargarConfiguracionAdmin(); }
});