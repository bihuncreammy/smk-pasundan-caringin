import { seed } from "./db.js";
import { currentUser, saveSession, clearSession } from "./auth.js";
import { router, $, ic, nowHMS, esc } from "./utils.js";

import * as beranda from "./views/beranda.js";
import * as jadwal from "./views/jadwal.js";
import * as absen from "./views/absen.js";
import * as arsip from "./views/arsip.js";
import * as waktu from "./views/waktu.js";
import * as pengumuman from "./views/pengumuman.js";
import * as kelola from "./views/kelola.js";
import * as profil from "./views/profil.js";

const PAGES = {
  beranda: { title: "Beranda", view: beranda, nav: true },
  jadwal: { title: "Jadwal Pelajaran", view: jadwal, nav: true },
  absen: { title: "Kehadiran", view: absen, nav: true },
  arsip: { title: "Arsip & Dokumentasi", view: arsip, nav: true },
  profil: { title: "Profil", view: profil, nav: true },
  waktu: { title: "Waktu & Jam Sekolah", view: waktu, nav: false },
  pengumuman: { title: "Pengumuman", view: pengumuman, nav: false },
  kelola: { title: "Kelola Data", view: kelola, nav: false }
};

const STACK = [];

async function renderPage(name, params) {
  const page = PAGES[name] || PAGES.beranda;
  if (!page.nav) {
    STACK.push(currentPage);
  }
  currentPage = name;

  if (window.__activeCleanup) { window.__activeCleanup(); window.__activeCleanup = null; }

  const content = $("#content");
  content.innerHTML = `<div class="loading">${ic("zap")}</div>`;
  const html = await page.view.render(params);
  content.innerHTML = html;
  if (typeof page.view.mount === "function") page.view.mount(params);
  window.__activeCleanup = typeof page.view.cleanup === "function" ? () => page.view.cleanup() : null;

  const title = $("#topbar-title");
  title.textContent = page.title;
  $("#btn-back").classList.toggle("hidden", !STACK.length);
  setActiveNav(name);

  window.scrollTo(0, 0);
}

let currentPage = "beranda";
let _locked = false;

function setActiveNav(page) {
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.page === page);
  });
}

router.navigate = async function (name, params) {
  if (_locked) return;
  _locked = true;
  try { await renderPage(name, params); }
  finally { _locked = false; }
};

async function goBack() {
  if (!STACK.length) return;
  const prev = STACK.pop();
  if (window.__activeCleanup) { window.__activeCleanup(); window.__activeCleanup = null; }
  const page = PAGES[prev];
  const content = $("#content");
  const html = await page.view.render();
  content.innerHTML = html;
  if (typeof page.view.mount === "function") page.view.mount();
  window.__activeCleanup = typeof page.view.cleanup === "function" ? () => page.view.cleanup() : null;
  $("#topbar-title").textContent = page.title;
  $("#btn-back").classList.toggle("hidden", !STACK.length);
  setActiveNav(prev);
  currentPage = prev;
  window.scrollTo(0, 0);
}

async function showApp() {
  $("#login-screen").classList.add("hidden");
  $("#main").classList.remove("hidden");
  await router.navigate("beranda");
}

async function showLogin() {
  $("#main").classList.add("hidden");
  $("#login-screen").classList.remove("hidden");
}

function bindGlobal() {
  $("#bottom-nav").addEventListener("click", (e) => {
    const item = e.target.closest(".nav-item");
    if (item) router.navigate(item.dataset.page);
  });

  $("#btn-back").addEventListener("click", goBack);

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { login } = await import("./auth.js");
    const btn = $("#login-form button[type=submit]");
    btn.disabled = true;
    const res = await login($("#login-username").value, $("#login-password").value);
    btn.disabled = false;
    if (!res.ok) {
      toast(res.msg, "error");
      return;
    }
    saveSession(res.user);
    await showApp();
  });

  setInterval(() => {
    const el = $("#topbar-clock");
    if (el) el.textContent = nowHMS();
  }, 1000);
}

async function registerSW() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (e) {
      console.error("SW gagal:", e);
    }
  }
}

async function boot() {
  registerSW();
  try {
    await seed();
  } catch (e) {
    console.error("Seed gagal:", e);
  }
  bindGlobal();
  if (currentUser()) await showApp();
  else await showLogin();
}

const { toast } = await import("./utils.js");

boot();
