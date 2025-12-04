// viewer/viewer.js
// Full PROFESSIONAL Three.js Viewer (copy-paste safe)

import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

/* ---------------- Scene / Camera / Renderer ---------------- */
const container = document.getElementById("container3D");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.001, 100000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);

// quality & color
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

container.appendChild(renderer.domElement);

/* ---------------- LIGHTING (MODEL-FIRST) ---------------- */

// Only fallback lights if model has NONE
function addFallbackLightsIfNoLights(scene, model) {
  let hasLights = false;

  model.traverse(obj => {
    if (obj.isLight) hasLights = true;
  });

  if (!hasLights) {
    console.warn("No lights in model, adding defaults");

    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(amb);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 15, 8);
   	scene.add(sun);
  }
}


/* ---------------- Controls ---------------- */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 1.4;
controls.panSpeed = 0.6;
controls.enablePan = true;

// UNLIMITED ZOOM
controls.minDistance = 0.001;
controls.maxDistance = Infinity;

// Angle limits
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI * 0.95;
controls.target.set(0,0,0);

/* ---------------- Globals ---------------- */
let object = null;
const params = new URLSearchParams(window.location.search);
const objToRender = params.get("model") || "dino";
const loader = new GLTFLoader();

/* ---------------- Loader ---------------- */
function loadGLTF(path){
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      gltf => resolve(gltf.scene),
      xhr => {
        if (xhr.total) {
          console.log(Math.round((xhr.loaded / xhr.total) * 100) + "% loaded");
        }
      },
      err => reject(err)
    );
  });
}

/* ---------------- Center & Scale ---------------- */
function centerAndNormalize(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  obj.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const targetSize = 2.5;
    const scale = targetSize / maxDim;
    if (scale < 0.5 || scale > 2) {
      obj.scale.setScalar(scale);
    }
  }
}

/* ---------------- Camera Fit ---------------- */
function fitCamera(camera, obj, controls) {
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const radius = maxDim * 0.5;

  const fov = camera.fov * (Math.PI / 180);
  const distance = (radius / Math.sin(fov / 2)) * 1.25;

  camera.position.set(center.x, center.y, distance);
  camera.near = Math.max(0.001, distance / 10000);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = Math.max(0.001, radius * 0.05);
  controls.maxDistance = radius * 100;
  controls.update();
}

/* ---------------- Main Load ---------------- */
async function init() {
  try {
    if (objToRender.toLowerCase().endsWith(".fbx")) {
      throw new Error("FBX not supported — convert to GLTF/GLB or add FBXLoader.");
    }

    const modelPath = `../models/${objToRender}/scene.gltf`;
    object = await loadGLTF(modelPath);

    scene.add(object);
    centerAndNormalize(object);
    fitCamera(camera, object, controls);

    addFallbackLightsIfNoLights(scene, object);

    // auto rotate (cinema mode)
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;

  } catch (e) {
    console.error(e);
    const error = document.createElement("div");
    error.style.position = "absolute";
    error.style.top = "20px";
    error.style.left = "20px";
    error.style.color = "white";
    error.style.background = "rgba(0,0,0,0.5)";
    error.style.padding = "10px 14px";
    error.style.borderRadius = "8px";
    error.innerText = "Model failed to load. Check console.";
    document.body.appendChild(error);
  }
}

/* ---------------- Mouse for eye ---------------- */
let mouseX = 0, mouseY = 0;
document.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

/* ---------------- Resize ---------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------- Animate ---------------- */
function animate() {
  requestAnimationFrame(animate);

  if (object && objToRender === "eye") {
    object.rotation.y = -0.6 + (mouseX / window.innerWidth) * 1.2;
    object.rotation.x = -0.3 + (mouseY / window.innerHeight) * 0.6;
  }

  // Zoom-based auto-rotate control
const distance = camera.position.distanceTo(controls.target);

// Stop rotating when close
if (distance < controls.minDistance * 5) {
  controls.autoRotate = false;
}

// Slow rotate when coming closer
else if (distance < controls.maxDistance * 0.15) {
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.2;
}

// Normal speed
else {
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
}

controls.update();
renderer.render(scene, camera);

}

/* ---------------- Run ---------------- */
init().then(animate);
// Hide guide after delay
setTimeout(()=> {
  const guide = document.getElementById("controlsGuide");
  if (guide) guide.style.opacity = "0.2";
}, 6000);
// SETTINGS PANEL HOOKS
const exposure = document.getElementById("exposure");
const ambientSlider = document.getElementById("ambient");
const autoRotateToggle = document.getElementById("autoRotateToggle");

if (exposure)
  exposure.oninput = () => renderer.toneMappingExposure = exposure.value;

if (ambientSlider)
  ambientSlider.oninput = () => {
    scene.traverse(o=>{
      if (o.isAmbientLight) o.intensity = ambientSlider.value;
    });
  };

if (autoRotateToggle)
  autoRotateToggle.onchange = () => controls.autoRotate = autoRotateToggle.checked;
