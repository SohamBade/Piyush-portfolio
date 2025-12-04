// script.js - JSON-driven site renderer (loads site-config.json + projects/projects.json)

// viewer open/close (keep yours)
function openViewer(model) {
  const viewer = document.getElementById("viewer");
  const frame = document.getElementById("viewerFrame");
  viewer.classList.add("active");
  frame.src = "viewer/viewer.html?model=" + encodeURIComponent(model);
}
function closeViewer() {
  const viewer = document.getElementById("viewer");
  const frame = document.getElementById("viewerFrame");
  viewer.classList.remove("active");
  frame.src = "about:blank";
}
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeViewer(); });
function scrollToSection(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({behavior:"smooth"}); }

// paths
const configPath = "site-config.json?v=" + Date.now();
const projectsPath = "projects/projects.json?v=" + Date.now();

async function loadJSON(url){
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } catch (e) {
    console.warn("loadJSON failed:", e, url);
    return null;
  }
}

async function initSite(){
  const cfg = await loadJSON(configPath) || {};
  const projects = await loadJSON(projectsPath) || [];

  // NAV
  const navContainer = document.querySelector(".floating-nav nav");
  if (cfg.nav && Array.isArray(cfg.nav) && navContainer){
    navContainer.innerHTML = "";
    cfg.nav.forEach(item=>{
      if (!item.show) return;
      const a = document.createElement("a");
      a.href = item.href || "#";
      a.innerText = item.label || "Link";
      navContainer.appendChild(a);
    });
  }

  // Brand
  const brand = document.querySelector(".brand");
  if (cfg.site && cfg.site.brand && brand) brand.innerText = cfg.site.brand;

  // HERO
  if (cfg.hero) {
    const title = document.querySelector(".glow");
    const sub = document.querySelector(".lead");
    if (cfg.hero.headline && title) title.innerText = cfg.hero.headline;
    if (cfg.hero.sub && sub) sub.innerText = cfg.hero.sub;
    // buttons
    const btnWrap = document.querySelector(".hero-buttons");
    if (btnWrap && Array.isArray(cfg.hero.cta)) {
      btnWrap.innerHTML = "";
      cfg.hero.cta.forEach(c=>{
        const b = document.createElement("button");
        b.className = "btn" + (c.style === "outline" ? " outline" : "");
        b.innerText = c.label || "CTA";
        b.onclick = ()=> scrollToSection(c.target || "projects");
        btnWrap.appendChild(b);
      });
    }
  }

  // PROJECT GRID: render from projects.json (or fallback to manual)
  const grid = document.getElementById("projectGrid") || document.querySelector(".grid");
  if (grid) {
    grid.innerHTML = "";
    if (cfg.home && cfg.home.showProjectsOnHome === false) {
      grid.innerHTML = '<div class="muted">Projects hidden by config</div>';
    } else if (Array.isArray(projects) && projects.length) {
      // optional order override
      let list = projects;
      if (cfg.home && Array.isArray(cfg.home.projectOrder) && cfg.home.projectOrder.length) {
        const order = cfg.home.projectOrder;
        list = order.map(id => projects.find(p=>p.id===id)).filter(Boolean).concat(projects.filter(p=> !order.includes(p.id)));
      }

      list.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = ()=> openViewer(p.id);
        card.innerHTML = `<img src="${p.thumbnail || 'assets/thumbnails/dino.jpeg'}" alt="${p.title||p.id}"><h3>${p.title||p.id}</h3>`;
        grid.appendChild(card);
      });
    } else {
      grid.innerHTML = '<div class="muted">No projects found — check projects/projects.json</div>';
    }
  }

  // SKILLS
  const skillsArea = document.getElementById("skills");
  if (cfg.skills && skillsArea) {
    const container = skillsArea.querySelector(".skills-grid");
    if (container) {
      container.innerHTML = "";
      cfg.skills.forEach(group=>{
        if (group.items && group.items.length) {
          group.items.forEach(name=>{
            const el = document.createElement("div");
            el.innerText = name;
            container.appendChild(el);
          });
        }
      });
    }
  }

  // Footer
  if (cfg.site && cfg.site.footer) {
    const f = document.querySelector("footer");
    if (f) f.innerText = cfg.site.footer;
  }
}

// run after DOM ready
document.addEventListener("DOMContentLoaded", initSite);
