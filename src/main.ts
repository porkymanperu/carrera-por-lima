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
const loader = new GLTFLoader();

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
type CollectibleVisual = {
  root: THREE.Group;
  model: THREE.Group;
  glow: THREE.Sprite;
  ring: THREE.Mesh;
  particles: THREE.Points;
  particlePositions: Float32Array;
  particleVelocities: Float32Array;
  particlePhases: Float32Array;
  baseY: number;
  elapsed: number;
  burst: number;
};
type Item = {
  mesh: THREE.Object3D;
  kind:'obra'|'obstacle';
  label?:string;
  hit?:boolean;
  visual?:CollectibleVisual;
  collecting?:number;
  points?:number;
};
const items: Item[] = [];
const glowTexture = new THREE.CanvasTexture((()=>{
  const canvas=document.createElement('canvas'); canvas.width=64; canvas.height=64;
  const context=canvas.getContext('2d')!;
  const gradient=context.createRadialGradient(32,32,2,32,32,32);
  gradient.addColorStop(0,'rgba(255,232,120,.9)');
  gradient.addColorStop(.35,'rgba(255,190,45,.35)');
  gradient.addColorStop(1,'rgba(255,160,0,0)');
  context.fillStyle=gradient; context.fillRect(0,0,64,64); return canvas;
})());
const glowMaterial = new THREE.SpriteMaterial({map:glowTexture,color:0xffc83d,transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthWrite:false});
const particleMaterial = new THREE.PointsMaterial({color:0xffd45a,size:.075,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});

function createCollectibleVisual(root:THREE.Group,displayScale:number):CollectibleVisual {
  const effectScale=displayScale/1.35;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.62*effectScale,.07*effectScale,8,24),new THREE.MeshBasicMaterial({color:0xffcf48,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false}));
  ring.rotation.x=Math.PI/2; ring.position.y=.12*effectScale; root.add(ring);
  const glow=new THREE.Sprite(glowMaterial.clone()); glow.scale.set(2.1*effectScale,2.1*effectScale,1); glow.position.y=.65*effectScale; root.add(glow);
  const count=14;
  const particlePositions=new Float32Array(count*3);
  const particleVelocities=new Float32Array(count*3);
  const particlePhases=new Float32Array(count);
  for(let i=0;i<count;i++){
    const angle=Math.random()*Math.PI*2; const radius=(.35+Math.random()*.45)*effectScale;
    particlePositions[i*3]=Math.cos(angle)*radius;
    particlePositions[i*3+1]=(.25+Math.random()*.8)*effectScale;
    particlePositions[i*3+2]=Math.sin(angle)*radius;
    particleVelocities[i*3]=(Math.random()-.5)*.12*effectScale;
    particleVelocities[i*3+1]=(.12+Math.random()*.18)*effectScale;
    particleVelocities[i*3+2]=(Math.random()-.5)*.12*effectScale;
    particlePhases[i]=Math.random()*Math.PI*2;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
  const particles=new THREE.Points(geometry,particleMaterial.clone());
  (particles.material as THREE.PointsMaterial).size*=effectScale;
  root.add(particles);
  return {root,model:new THREE.Group(),glow,ring,particles,particlePositions,particleVelocities,particlePhases,baseY:root.position.y,elapsed:Math.random()*6,burst:0};
}

function loadCollectibleModel(item:Item, modelUrl:string, displayScale:number) {
  loader.load(modelUrl,gltf=>{
    const model=gltf.scene;
    const bounds=new THREE.Box3().setFromObject(model);
    const size=bounds.getSize(new THREE.Vector3());
    model.scale.setScalar(displayScale/Math.max(size.y,.001));
    model.updateMatrixWorld(true);
    const normalizedBounds=new THREE.Box3().setFromObject(model);
    model.position.y=-normalizedBounds.min.y+.15;
    model.traverse(object=>{
      if((object as THREE.Mesh).isMesh){
        const mesh=object as THREE.Mesh; mesh.castShadow=true; mesh.receiveShadow=true;
      }
    });
    item.visual!.model.add(model);
    item.visual!.root.add(item.visual!.model);
  },undefined,error=>console.error('No se pudo cargar collectible',modelUrl,error));
}

function createCollectible(config:{type:string;modelUrl?:string;displayScale?:number;x:number;z:number;label:string;points?:number}):Item {
  const root=new THREE.Group(); root.position.set(config.x,.8,config.z); world.add(root);
  const displayScale=config.displayScale??1.35;
  const visual=createCollectibleVisual(root,displayScale);
  const item:Item={mesh:root,kind:'obra',label:config.label,visual,points:config.points??100};
  items.push(item);
  if(config.modelUrl) loadCollectibleModel(item,config.modelUrl,displayScale);
  return item;
}
function obstacle(x:number,z:number) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0,.9,.7),matRed); base.position.y=.45; g.add(base);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8,.16,.18),new THREE.MeshStandardMaterial({color:0xffffff})); bar.position.y=1.0; g.add(bar);
  g.position.set(x,0,z); world.add(g); items.push({mesh:g,kind:'obstacle'});
}
createCollectible({type:'bypass',modelUrl:'/assets/collectibles/bypass.glb',displayScale:.78,x:-3.2,z:34,label:'Bypass / infraestructura',points:100});
function collectible(x:number,z:number,label:string) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.48,.10,10,28),matGold);
  ring.rotation.x=Math.PI/2; g.add(ring);
  const core = new THREE.Mesh(new THREE.BoxGeometry(.38,.38,.38),matBlue); core.rotation.set(.4,.5,.2); g.add(core);
  g.position.set(x,.8,z); world.add(g); items.push({mesh:g,kind:'obra',label});
}
collectible(0,50,'Escalera comunal — 250 metros');
collectible(3.2,66,'Tren Lima–Chosica');
obstacle(0,42); obstacle(-3.2,58); obstacle(3.2,74);

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

function updateCollectibleVisual(item:Item,dt:number) {
  const visual=item.visual;
  if(!visual) return;
  if(item.collecting===-1) return;
  visual.elapsed+=dt;
  const collecting=item.collecting!==undefined;
  if(collecting){
    const collectionTime=(item.collecting??0)+dt;
    item.collecting=collectionTime;
    const progress=Math.min(collectionTime/.6,1);
    const eased=progress*progress*(3-2*progress);
    visual.root.rotation.y+=dt*(.45+progress*12);
    visual.root.position.y=visual.baseY+eased*.65;
    const scale=progress<.25 ? 1+progress/.25*.25 : 1.25*(1-(progress-.25)/.75);
    visual.root.scale.setScalar(Math.max(0,scale));
    visual.glow.material.opacity=.95*(1-progress);
    visual.ring.visible=progress<.9;
    visual.burst=Math.max(visual.burst,1);
    if(progress>=1){
      item.collecting=-1;
      visual.root.visible=false;
    }
  } else {
    visual.root.rotation.y+=dt*.45;
    visual.root.position.y=visual.baseY+Math.sin(visual.elapsed*2)*.12;
    const pulse=1+Math.sin(visual.elapsed*2.5)*.04;
    visual.root.scale.setScalar(pulse);
    visual.glow.material.opacity=.55+Math.sin(visual.elapsed*2.5)*.1;
  }
  const positions=visual.particlePositions;
  for(let i=0;i<positions.length;i+=3){
    positions[i]+=visual.particleVelocities[i]*dt;
    positions[i+1]+=visual.particleVelocities[i+1]*dt;
    positions[i+2]+=visual.particleVelocities[i+2]*dt;
    if(positions[i+1]>1.2){ positions[i+1]=.12; }
    if(visual.burst>0){
      positions[i]*=1+dt*.9;
      positions[i+2]*=1+dt*.9;
    }
  }
  visual.particles.geometry.attributes.position.needsUpdate=true;
  visual.burst=Math.max(0,visual.burst-dt*2);
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
        const recycledItem=items.find(item=>item.mesh===object);
        const isItem=Boolean(recycledItem);
        const recycleAt = isGround ? -105 : -60;
        if(object.position.z < recycleAt){
          object.position.z += isGround ? 168 : (isItem ? 84 : 84);
          if(recycledItem){
            recycledItem.hit=false;
            recycledItem.collecting=undefined;
            if(recycledItem.visual){
              recycledItem.visual.root.visible=true;
              recycledItem.visual.root.scale.setScalar(1);
              recycledItem.visual.glow.material.opacity=.62;
              recycledItem.visual.ring.visible=true;
            }
          }
        }
      }
      if(!grounded){
        yVelocity-=18*dt; player.position.y+=yVelocity*dt;
        if(player.position.y<=0){ player.position.y=0; yVelocity=0; grounded=true; playAnim(findClip('run'),.12); }
      }
      for(const item of items){
        const itemZ=item.mesh.position.z;
        if(item.hit) continue;
        const dx=Math.abs(item.mesh.position.x-player.position.x);
        const dz=Math.abs(itemZ-player.position.z);
        if(dx<.9 && dz<.9){
          if(item.kind==='obra'){
            item.hit=true;
            if(item.visual){
              item.collecting=0;
              item.visual.burst=1;
            }
            showMessage('+100','OBRA EJECUTADA<br>Bypass / infraestructura');
            speed=Math.min(8.5,speed+.18);
          }
          else if(player.position.y<.75){ item.hit=true; showMessage('OBSTÁCULO','¡Salta o cambia de carril!'); speed=Math.max(5.2,speed-.5); }
        }
      }
      distance=0;
    }
  }
  // Animate collectibles.
  for(const item of items) if(item.kind==='obra'&&!item.visual){ item.mesh.rotation.y+=dt*1.8; }
  for(const item of items) updateCollectibleVisual(item,dt);
  renderer.render(scene,camera);
}
animate();

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight);
});
