"use strict";
const SUPABASE_URL = "https://tgvlkchrcbqytwzxvyvr.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_o3oeAVI9jAMK_FeFGgRyYA_rckwVE1H";
const BUCKET = "imagenes_polleria";
const clienteSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

let categoriaSeleccionada = null;
let esAdminActual = false;

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

document.addEventListener("DOMContentLoaded", async () => {
  initNavMovil();
  initModalLogin();
  initAnioFooter();
  await verificarAdminEnVivo();
});

function initNavMovil() {
  const btn = document.querySelector("[data-menu-btn]");
  const nav = document.querySelector("[data-nav]");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const abierto = nav.classList.toggle("nav--abierto");
    btn.setAttribute("aria-expanded", String(abierto));
  });

  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      nav.classList.remove("nav--abierto");
      btn.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      nav.classList.remove("nav--abierto");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

function initAnioFooter() {
  const el = document.querySelector("[data-anio]");
  if (el) el.textContent = new Date().getFullYear();
}

async function verificarAdminEnVivo() {
  const { data: { session } } = await clienteSupabase.auth.getSession();
  esAdminActual = !!session;

  await cargarConfiguracionWeb(esAdminActual);
  await renderizarSeccionMenu(esAdminActual);

  if (esAdminActual) crearBarraAdminFlotante(session.user.email);
}

async function cargarConfiguracionWeb(esAdmin) {
  const { data, error } = await clienteSupabase.from("configuracion").select("*").eq("id", 1).single();
  if (error || !data) return;

  const heroTitulo = document.getElementById("hero-titulo");
  if (heroTitulo) {
    const titulo = data.hero_titulo || "El Brasero";
    heroTitulo.textContent = titulo;
    actualizarNombresDependientes(titulo);

    if (esAdmin) {
      habilitarEdicionDirecta(heroTitulo, async (nuevo) => {
        await clienteSupabase.from("configuracion")
          .update({ hero_titulo: nuevo, logo_texto: nuevo }).eq("id", 1);
        actualizarNombresDependientes(nuevo);
      });
    }
  }

  const heroEyebrow = document.getElementById("hero-eyebrow");
  if (heroEyebrow) {
    heroEyebrow.textContent = data.hero_eyebrow || "Pollería · Brasa · Anticuchos";
    if (esAdmin) habilitarEdicionDirecta(heroEyebrow, async (v) => {
      await clienteSupabase.from("configuracion").update({ hero_eyebrow: v }).eq("id", 1);
    });
  }

  const heroSubtitulo = document.getElementById("hero-subtitulo");
  if (heroSubtitulo) {
    heroSubtitulo.textContent = data.hero_subtitulo || "El auténtico sabor a la brasa, todos los días.";
    if (esAdmin) habilitarEdicionDirecta(heroSubtitulo, async (v) => {
      await clienteSupabase.from("configuracion").update({ hero_subtitulo: v }).eq("id", 1);
    });
  }

  const nosotrosContainer = document.querySelector(".nosotros__texto");
  if (nosotrosContainer) {
    const ps = nosotrosContainer.querySelectorAll("p");
    if (ps[0] && data.nosotros_texto_1) {
      ps[0].textContent = data.nosotros_texto_1;
      if (esAdmin) habilitarEdicionDirecta(ps[0], async (v) => {
        await clienteSupabase.from("configuracion").update({ nosotros_texto_1: v }).eq("id", 1);
      });
    }
    if (ps[1] && data.nosotros_texto_2) {
      ps[1].textContent = data.nosotros_texto_2;
      if (esAdmin) habilitarEdicionDirecta(ps[1], async (v) => {
        await clienteSupabase.from("configuracion").update({ nosotros_texto_2: v }).eq("id", 1);
      });
    }
  }

  const nosotrosImg = document.querySelector(".nosotros__media img");
  if (nosotrosImg && data.nosotros_imagen) {
    nosotrosImg.src = urlImagen(data.nosotros_imagen);
    manejarErrorImagen(nosotrosImg);
    if (esAdmin) habilitarEdicionImagen(nosotrosImg, "configuracion", 1, "nosotros_imagen");
  }

  const cntSub = document.getElementById("contacto-subtitulo");
  if (cntSub) {
    cntSub.textContent = data.contacto_subtitulo || "Estamos listos para atenderte.";
    if (esAdmin) habilitarEdicionDirecta(cntSub, async (v) => {
      await clienteSupabase.from("configuracion").update({ contacto_subtitulo: v }).eq("id", 1);
    });
  }

  const cntCtaTit = document.getElementById("contacto-cta-titulo");
  if (cntCtaTit) {
    cntCtaTit.textContent = data.contacto_cta_titulo || "¿Hacemos tu pedido?";
    if (esAdmin) habilitarEdicionDirecta(cntCtaTit, async (v) => {
      await clienteSupabase.from("configuracion").update({ contacto_cta_titulo: v }).eq("id", 1);
    });
  }

  const cntCtaSub = document.getElementById("contacto-cta-subtitulo");
  if (cntCtaSub) {
    cntCtaSub.textContent = data.contacto_cta_subtitulo || "Escríbenos por WhatsApp y te atendemos al instante.";
    if (esAdmin) habilitarEdicionDirecta(cntCtaSub, async (v) => {
      await clienteSupabase.from("configuracion").update({ contacto_cta_subtitulo: v }).eq("id", 1);
    });
  }

  const iconos = ["📍", "🕒", "📞", "✉️"];
  const campos = ["direccion", "horario", "telefono", "email"];
  document.querySelectorAll(".contacto__info li").forEach((li, i) => {
    const campo = campos[i];
    if (!campo || !data[campo]) return;
    li.innerHTML = `<span aria-hidden="true">${iconos[i]}</span> <span class="editable-txt">${data[campo]}</span>`;
    if (esAdmin) {
      habilitarEdicionDirecta(li.querySelector(".editable-txt"), async (v) => {
        await clienteSupabase.from("configuracion").update({ [campo]: v }).eq("id", 1);
      });
    }
  });

  const numWa = data.whatsapp || "51987654321";
  document.querySelectorAll('a[href*="wa.me"], a.btn--wa').forEach((a) => {
    a.href = `https://wa.me/${numWa}?text=Hola%2C%20quiero%20hacer%20un%20pedido`;
  });
}

function actualizarNombresDependientes(nombre) {
  const logoTxt = document.getElementById("logo-texto");
  const footerNombre = document.getElementById("footer-nombre-negocio");
  const pageTitle = document.getElementById("page-title");
  if (logoTxt) logoTxt.textContent = nombre;
  if (footerNombre) footerNombre.textContent = `Pollería ${nombre}`;
  if (pageTitle) pageTitle.textContent = `${nombre} — Pollo a la brasa y anticuchos`;
}

async function renderizarSeccionMenu(esAdmin) {
  const contenedor = document.getElementById("lista-platos");
  if (!contenedor) return;

  if (!categoriaSeleccionada) {
    await cargarCategoriasVista(contenedor, esAdmin);
  } else {
    await cargarPlatillosDeCategoriaVista(contenedor, esAdmin, categoriaSeleccionada);
  }
}

async function cargarCategoriasVista(contenedor, esAdmin) {
  contenedor.innerHTML = "";
  const { data: categorias } = await clienteSupabase
    .from("categorias").select("*").order("created_at", { ascending: true });

  (categorias || []).forEach((cat) => {
    const article = document.createElement("article");
    article.className = "plato card-categoria";
    article.style.cursor = "pointer";

    const img = document.createElement("img");
    img.src = urlImagen(cat.imagen);
    img.alt = cat.nombre;
    img.loading = "lazy";
    manejarErrorImagen(img);

    article.innerHTML = `
      <div class="plato__media" style="position:relative;height:220px;overflow:hidden;border-radius:12px;">
        <div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <h3 class="cat-titulo-edit" style="color:#fff;font-size:26px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;text-shadow:0 2px 4px rgba(0,0,0,.6);" ${esAdmin ? 'contenteditable="true"' : ''}>${cat.nombre}</h3>
        </div>
        ${esAdmin ? '<div class="badge-edit-img" style="font-size:11px;background:rgba(0,0,0,.8);color:#fff;padding:2px 6px;position:absolute;top:8px;right:8px;border-radius:4px;z-index:2;cursor:pointer;">📷 Cambiar foto</div>' : ''}
      </div>
      ${esAdmin ? '<button class="btn-eliminar-cat" style="margin-top:8px;background:#d9534f;color:#fff;border:none;padding:5px;border-radius:4px;cursor:pointer;font-size:12px;width:100%;">🗑️ Eliminar categoría</button>' : ''}
    `;
    article.querySelector(".plato__media").prepend(img);

    article.addEventListener("click", (e) => {
      if (e.target.matches(".btn-eliminar-cat, .badge-edit-img")) return;
      if (e.target.getAttribute("contenteditable") === "true") return;
      categoriaSeleccionada = cat;
      renderizarSeccionMenu(esAdmin);
    });

    if (esAdmin) {
      const badge = article.querySelector(".badge-edit-img");
      const tit = article.querySelector(".cat-titulo-edit");
      const btnDel = article.querySelector(".btn-eliminar-cat");

      badge?.addEventListener("click", (e) => {
        e.stopPropagation();
        dispararSelectorImagen(async (nombreArchivo) => {
          await clienteSupabase.from("categorias").update({ imagen: nombreArchivo }).eq("id", cat.id);
          renderizarSeccionMenu(true);
        });
      });

      tit.addEventListener("blur", async () => {
        const nuevo = tit.textContent.trim();
        if (!nuevo || nuevo === cat.nombre) return;
        await clienteSupabase.from("categorias").update({ nombre: nuevo }).eq("id", cat.id);
      });

      btnDel?.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(`¿Eliminar la categoría "${cat.nombre}" y todos sus platillos?`)) return;
        await clienteSupabase.from("platillos").delete().eq("categoria", cat.slug);
        await clienteSupabase.from("categorias").delete().eq("id", cat.id);
        renderizarSeccionMenu(true);
      });
    }

    contenedor.appendChild(article);
  });

  if (esAdmin) {
    const cardAdd = document.createElement("article");
    cardAdd.className = "plato card-agregar-nuevo";
    cardAdd.style.cssText = "border:2px dashed #c8102e;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:220px;cursor:pointer;background:#fff8f8;border-radius:12px;";
    cardAdd.innerHTML = `<div style="font-size:48px;color:#c8102e;font-weight:bold;line-height:1;">+</div>
      <p style="color:#c8102e;font-weight:bold;margin-top:10px;font-size:16px;">Añadir categoría</p>`;
    cardAdd.addEventListener("click", async () => {
      const nombre = prompt("Nombre de la nueva categoría:", "NUEVA CATEGORÍA");
      if (!nombre) return;
      const slug = nombre.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
      await clienteSupabase.from("categorias").insert([{ nombre, slug, imagen: null }]);
      renderizarSeccionMenu(true);
    });
    contenedor.appendChild(cardAdd);
  }
}

async function cargarPlatillosDeCategoriaVista(contenedor, esAdmin, categoriaObj) {
  contenedor.innerHTML = "";

  const barra = document.createElement("div");
  barra.style.cssText = "grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;flex-wrap:wrap;gap:10px;";
  barra.innerHTML = `
    <button id="btnVolverCat" style="background:#222;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">← Volver a Categorías</button>
    <h3 style="margin:0;font-size:22px;color:#c8102e;text-transform:uppercase;">Categoría: ${categoriaObj.nombre}</h3>
  `;
  contenedor.appendChild(barra);

  document.getElementById("btnVolverCat").addEventListener("click", () => {
    categoriaSeleccionada = null;
    renderizarSeccionMenu(esAdmin);
  });

  const { data: platillos } = await clienteSupabase
    .from("platillos").select("*").eq("categoria", categoriaObj.slug)
    .order("created_at", { ascending: true });

  (platillos || []).forEach((p) => {
    const article = document.createElement("article");
    article.className = "plato";

    const img = document.createElement("img");
    img.src = urlImagen(p.imagen);
    img.alt = p.nombre;
    img.loading = "lazy";
    img.width = 400;
    img.height = 300;
    manejarErrorImagen(img);
    if (esAdmin) { img.style.cursor = "pointer"; img.title = "Haz clic para cambiar imagen"; }

    article.innerHTML = `
      <div class="plato__media" style="position:relative;">
        ${esAdmin ? '<div class="badge-edit-img" style="font-size:12px;background:rgba(0,0,0,.7);color:#fff;padding:2px 6px;position:absolute;bottom:5px;left:5px;border-radius:4px;pointer-events:none;">📷 Cambiar</div>' : ''}
      </div>
      <div class="plato__body">
        <h3 class="plato__nombre" ${esAdmin ? 'contenteditable="true"' : ''}>${p.nombre}</h3>
        <p class="plato__desc" ${esAdmin ? 'contenteditable="true"' : ''}>${p.descripcion || ""}</p>
        <p class="plato__precio">S/ <span ${esAdmin ? 'contenteditable="true"' : ''}>${parseFloat(p.precio || 0).toFixed(2)}</span></p>
        ${esAdmin ? '<button class="btn-eliminar-plato" style="margin-top:10px;background:#d9534f;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:12px;width:100%;">🗑️ Eliminar platillo</button>' : ''}
      </div>
    `;
    article.querySelector(".plato__media").prepend(img);

    if (esAdmin) {
      const h3 = article.querySelector(".plato__nombre");
      const desc = article.querySelector(".plato__desc");
      const precio = article.querySelector(".plato__precio span");
      const btnDel = article.querySelector(".btn-eliminar-plato");

      img.addEventListener("click", () => dispararSelectorImagen(async (nombreArchivo) => {
        await clienteSupabase.from("platillos").update({ imagen: nombreArchivo }).eq("id", p.id);
        renderizarSeccionMenu(true);
      }));

      [h3, desc, precio].forEach((el) => {
        el.addEventListener("blur", async () => {
          await clienteSupabase.from("platillos").update({
            nombre: h3.textContent.trim(),
            descripcion: desc.textContent.trim(),
            precio: parseFloat(precio.textContent) || 0
          }).eq("id", p.id);
        });
      });

      btnDel.addEventListener("click", async () => {
        if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
        await clienteSupabase.from("platillos").delete().eq("id", p.id);
        renderizarSeccionMenu(true);
      });
    }

    contenedor.appendChild(article);
  });

  if (esAdmin) {
    const cardAdd = document.createElement("article");
    cardAdd.className = "plato card-agregar-nuevo";
    cardAdd.style.cssText = "border:2px dashed #c8102e;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:320px;cursor:pointer;background:#fff8f8;border-radius:12px;";
    cardAdd.innerHTML = `<div style="font-size:54px;color:#c8102e;font-weight:bold;line-height:1;">+</div>
      <p style="color:#c8102e;font-weight:bold;margin-top:10px;font-size:16px;">Añadir platillo</p>`;
    cardAdd.addEventListener("click", async () => {
      await clienteSupabase.from("platillos").insert([{
        nombre: "Nuevo Platillo",
        descripcion: "Escribe una descripción...",
        precio: 0.00,
        categoria: categoriaObj.slug,
        imagen: null
      }]);
      renderizarSeccionMenu(true);
    });
    contenedor.appendChild(cardAdd);
  }
}

function habilitarEdicionDirecta(elemento, callback) {
  if (!elemento || elemento.dataset.editHabilitado === "true") return;
  elemento.dataset.editHabilitado = "true";
  elemento.setAttribute("contenteditable", "true");
  elemento.style.outline = "none";
  elemento.style.borderBottom = "1px dashed #c8102e";

  elemento.addEventListener("blur", async () => {
    const texto = elemento.textContent.trim();
    if (!texto) return;
    await callback(texto);
  });
}

function habilitarEdicionImagen(imgElement, tabla, id, columna) {
  if (!imgElement || imgElement.dataset.editHabilitado === "true") return;
  imgElement.dataset.editHabilitado = "true";
  imgElement.style.cursor = "pointer";

  imgElement.addEventListener("click", () => {
    dispararSelectorImagen(async (nombreArchivo) => {
      await clienteSupabase.from(tabla).update({ [columna]: nombreArchivo }).eq("id", id);
      imgElement.src = urlImagen(nombreArchivo);
      manejarErrorImagen(imgElement);
    });
  });
}

function dispararSelectorImagen(onUploadSuccess) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const nombreArchivo = `img_${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await clienteSupabase.storage.from(BUCKET).upload(nombreArchivo, file, { upsert: true });
    if (error) alert("Error al subir imagen: " + error.message);
    else await onUploadSuccess(nombreArchivo);
  };
  input.click();
}

function crearBarraAdminFlotante(email) {
  const barra = document.createElement("div");
  barra.className = "barra-admin-flotante";
  barra.innerHTML = `
    <span>👤 ${email}</span>
    <a href="admin.html" class="barra-admin-flotante__link">Panel</a>
    <button id="btnSalirAdmin" class="barra-admin-flotante__btn">Salir</button>
  `;
  document.body.appendChild(barra);

  document.getElementById("btnSalirAdmin").addEventListener("click", async () => {
    await clienteSupabase.auth.signOut();
    window.location.reload();
  });
}

function initModalLogin() {
  const btnAbrir = document.getElementById("abrirAdminModal");
  const modal = document.getElementById("modalAdminLogin");
  const btnCerrar = document.getElementById("cerrarModalLogin");
  const form = document.getElementById("formLoginModal");
  if (!modal || !form) return;

  const abrir = () => {
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("modalCorreo")?.focus();
  };
  const cerrar = () => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  };

  btnAbrir?.addEventListener("click", abrir);
  btnCerrar?.addEventListener("click", cerrar);

  document.addEventListener("keydown", (e) => {
    if (e.shiftKey && (e.key === "A" || e.key === "a")) {
      e.preventDefault();
      abrir();
    }
    if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") cerrar();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("modalCorreo").value.trim();
    const password = document.getElementById("modalContrasena").value;

    const { error } = await clienteSupabase.auth.signInWithPassword({ email, password });
    if (error) alert("Credenciales incorrectas: " + error.message);
    else window.location.reload();
  });
}