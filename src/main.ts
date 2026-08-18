import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="hud">
    <div class="topbar">
      <div class="pill">🏙️ LA CARRERA POR LIMA 2027</div>
      <div class="pill" id="animLabel">Animación: cargando…</div>
    </div>
    <div id="message"></div>
    <div class="controls">
      <div class="cluster"><button class="btn" id="left">←</button><button class="btn" id="right">→</button></div>
      <div class="cluster"><button class="btn" id="jump">↑</button></div>
    </div>
    <div id="start"><div class="card">
      <h1>LA CARRERA<br>POR LIMA</h1>
      <p>Prototipo jugable con tu Porky 3D y las animaciones reales de Meshy.</p>
      <button id="play">JUGAR</button>
      <div class="small">A/D o ←/→ para moverte · Espacio para saltar · también funciona con los botones táctiles</div>
    </div></div>
  </div>`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfeefa);
scene.fog = new THREE.Fog(0xcfeefa, 28, 95);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 5.1, 14);
camera.lookAt(0, 1.2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x6f7d63, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(-6, 12, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const matConcrete = new THREE.MeshStandardMaterial({ color: 0xc7c4b7, roughness: .92 });
const matSide = new THREE.MeshStandardMaterial({ color: 0x78857e, roughness: .95 });
const matGreen = new THREE.MeshStandardMaterial({ color: 0x6c9c49, roughness: .9 });
const matRed = new THREE.MeshStandardMaterial({ color: 0xd44738, roughness: .8 });
const matBlue = new THREE.MeshStandardMaterial({ color: 0x4e98c8, roughness: .75 });
const matGold = new THREE.MeshStandardMaterial({ color: 0xffcf48, emissive: 0x5a3b00, emissiveIntensity: .35, roughness: .5 });

function box(x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material,parent:THREE.Object3D=world) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  m.position.set(x,y,z); m.receiveShadow = true; m.castShadow = true; parent.add(m); return m;
}

// Three elevated lanes inspired by the reference image.
const groundPieces: THREE.Object3D[] = [];
[-3.2,0,3.2].forEach(x => {
  for(const z of [-63,-21,21,63]) {
    groundPieces.push(box(x,-.35,z,2.6,.7,42,matConcrete));
    groundPieces.push(box(x,-1.5,z,2.9,1.6,42,matSide));
  }
});

// Lima-like hillside blocks: intentionally simple MVP geometry.
for (let i=0;i<100;i++) {
  const side = i%2===0 ? -1 : 1;
  const x = side*(6 + Math.random()*11);
  const z = 20 - Math.random()*48;
  const y = .3 + Math.random()*8 + Math.max(0,(-z-18)*.035);
  const colors = [0xe79b77,0xe2c568,0x7bb3c9,0x9dc76e,0xc58b9d,0xe0aa66];
  const mat = new THREE.MeshStandardMaterial({color:colors[i%colors.length], roughness:1});
  box(x,y,z,1.1+Math.random()*1.5,1+Math.random()*2,1+Math.random()*1.5,mat);
}

// Trees / park silhouettes.
for (const x of [-4.0,-2.6,2.8,4.0]) {
  const tree = new THREE.Group();
  tree.position.set(x,0,8);
  world.add(tree);
  box(0,.45,0,.22,1.8,.22,new THREE.MeshStandardMaterial({color:0x76543b}),tree);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(.65,12,10),matGreen);
  crown.position.set(0,1.55,0); crown.castShadow=true; tree.add(crown);
}

// Collectibles and obstacles
type Item = { mesh: THREE.Object3D; kind:'obra'|'obstacle'; label?:string; hit?:boolean };
const items: Item[] = [];
function collectible(x:number,z:number,label:string) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.48,.10,10,28),matGold);
  ring.rotation.x=Math.PI/2; g.add(ring);
  const core = new THREE.Mesh(new THREE.BoxGeometry(.38,.38,.38),matBlue); core.rotation.set(.4,.5,.2); g.add(core);
  g.position.set(x,.8,z); world.add(g); items.push({mesh:g,kind:'obra',label}); 
}
function obstacle(x:number,z:number) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0,.9,.7),matRed); base.position.y=.45; g.add(base);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8,.16,.18),new THREE.MeshStandardMaterial({color:0xffffff})); bar.position.y=1.0; g.add(bar);
  g.position.set(x,0,z); world.add(g); items.push({mesh:g,kind:'obstacle'});
}
collectible(-3.2,34,'Agua de emergencia');
collectible(0,50,'Escalera comunal — 250 metros');
collectible(3.2,66,'Tren Lima–Chosica');
obstacle(0,42); obstacle(-3.2,58); obstacle(3.2,74);

const loader = new GLTFLoader();
const animLabel = document.querySelector<HTMLDivElement>('#animLabel')!;
const message = document.querySelector<HTMLDivElement>('#message')!;
let player: THREE.Object3D | null = null;
let mixer: THREE.AnimationMixer | null = null;
let actions = new Map<string, THREE.AnimationAction>();
let currentAction: THREE.AnimationAction | null = null;
let currentName = '';
let started = false;
let lane = 1;
let targetX = 0;
let yVelocity = 0;
let grounded = true;
let distance = 0;
let speed = 6.0;

const lanes = [-3.2,0,3.2];
const preferred = {
  idle: ['Idle_11','Idle_12','Idle_3','Idle_4'],
  run: ['Running','Run_02','run_fast_3','BackRight_Run'],
  jump: ['Jump_Over_Obstacle_1','Jump_Over_Obstacle_2','Run_and_Leap']
};

function findClip(kind:keyof typeof preferred) {
  for (const n of preferred[kind]) if (actions.has(n)) return n;
  return [...actions.keys()].find(n=>n.toLowerCase().includes(kind)) ?? [...actions.keys()][0];
}
function playAnim(name?:string, fade=.18, once=false) {
  if (!name || !actions.has(name) || currentName===name) return;
  const next=actions.get(name)!;
  next.reset();
  next.enabled=true;
  next.setEffectiveWeight(1);
  next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat, once?1:Infinity);
  next.clampWhenFinished=once;
  if(currentAction) currentAction.fadeOut(fade);
  next.fadeIn(fade).play();
  currentAction=next; currentName=name;
  animLabel.textContent=`Animación: ${name}`;
}
function showMessage(title:string, body:string) {
  message.innerHTML=`<b>${title}</b><br>${body}`;
  message.classList.add('show');
  setTimeout(()=>message.classList.remove('show'),2200);
}

loader.load('/assets/porky-animations.glb', gltf => {
  player = gltf.scene;
  // Normalize model size and ground it.
  const bbox = new THREE.Box3().setFromObject(player);
  const size = bbox.getSize(new THREE.Vector3());
  const scale = 2.25 / Math.max(size.y, .001);
  player.scale.setScalar(scale);
  player.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(player);
  player.position.y = -b2.min.y;
  player.rotation.y = 0; // face the camera from the positive-Z side
  player.traverse(o=>{
    if((o as THREE.Mesh).isMesh){
      const m=o as THREE.Mesh;
      m.castShadow=true;
      m.receiveShadow=true;
      const materials=Array.isArray(m.material)?m.material:[m.material];
      materials.forEach(material=>{
        material.transparent=false;
        material.opacity=1;
        material.depthWrite=true;
        material.alphaTest=0;
        const physical=material as THREE.MeshStandardMaterial & { transmission?: number };
        if('transmission' in physical) physical.transmission=0;
      });
    }
  });
  scene.add(player);

  mixer = new THREE.AnimationMixer(player);
  for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
  console.log('Meshy animation clips:', [...actions.keys()]);
  playAnim(findClip('idle'),0);
}, undefined, err => {
  console.error(err);
  animLabel.textContent='No se pudo cargar Porky';
});

function changeLane(dir:number) {
  if(!started) return;
  lane = THREE.MathUtils.clamp(lane+dir,0,2);
  targetX = lanes[lane];
}
function jump() {
  if(!started || !grounded) return;
  grounded=false; yVelocity=7.1;
  const j=findClip('jump'); playAnim(j,.1,true);
  setTimeout(()=>{ if(started) playAnim(findClip('run'),.16); },700);
}
addEventListener('keydown',e=>{
  if(e.code==='ArrowLeft'||e.code==='KeyA') changeLane(-1);
  if(e.code==='ArrowRight'||e.code==='KeyD') changeLane(1);
  if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW'){ e.preventDefault(); jump(); }
});
function bind(id:string, fn:()=>void){ document.querySelector<HTMLButtonElement>(id)!.addEventListener('pointerdown',e=>{e.preventDefault();fn();}); }
bind('#left',()=>changeLane(-1)); bind('#right',()=>changeLane(1)); bind('#jump',jump);
document.querySelector<HTMLButtonElement>('#play')!.onclick=()=>{
  started=true; document.querySelector<HTMLDivElement>('#start')!.style.display='none';
  playAnim(findClip('run'),.2);
};

const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.033);
  mixer?.update(dt);
  if(player){
    player.position.x=THREE.MathUtils.damp(player.position.x,targetX,10,dt);
    camera.position.x=THREE.MathUtils.damp(camera.position.x,player.position.x,10,dt);
    camera.lookAt(player.position.x, 1.2, 0);
    if(started){
      distance += speed*dt;
      for(const object of world.children){
        object.position.z -= distance;
        const isGround = groundPieces.includes(object);
        const isItem = items.some(item=>item.mesh===object);
        const recycleAt = isGround ? -105 : -60;
        if(object.position.z < recycleAt){
          object.position.z += isGround ? 168 : (isItem ? 84 : 84);
        }
      }
      if(!grounded){
        yVelocity-=18*dt; player.position.y+=yVelocity*dt;
        if(player.position.y<=0){ player.position.y=0; yVelocity=0; grounded=true; playAnim(findClip('run'),.12); }
      }
      for(const item of items){
        const itemZ=item.mesh.position.z;
        if(item.hit && itemZ<-30) item.hit=false;
        if(item.hit) continue;
        const dx=Math.abs(item.mesh.position.x-player.position.x);
        const dz=Math.abs(itemZ-player.position.z);
        if(dx<.9 && dz<.9){
          if(item.kind==='obra'){ item.hit=true; showMessage('OBRA COLECTADA',item.label??'Obra'); speed=Math.min(8.5,speed+.18); }
          else if(player.position.y<.75){ item.hit=true; showMessage('OBSTÁCULO','¡Salta o cambia de carril!'); speed=Math.max(5.2,speed-.5); }
        }
      }
      distance=0;
    }
  }
  // Animate collectibles.
  for(const item of items) if(item.kind==='obra'){ item.mesh.rotation.y+=dt*1.8; }
  renderer.render(scene,camera);
}
animate();

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight);
});
