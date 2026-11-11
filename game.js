import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

const $ = (id) => document.getElementById(id);
const sceneCanvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas: sceneCanvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9e7569);
scene.fog = new THREE.Fog(0x9e7569, 110, 340);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 550);
const clock = new THREE.Clock();
const city = new THREE.Group(); scene.add(city);
const carRoot = new THREE.Group(); scene.add(carRoot);
const obstacles = [];
const traffic = [];
const pickups = [];
const roadMat = new THREE.MeshStandardMaterial({ color: 0x26373a, roughness: .92 });
const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9d9584, roughness: 1 });
const roadLineMat = new THREE.MeshBasicMaterial({ color: 0xe7d9b4, transparent: true, opacity: .56 });
const lampMat = new THREE.MeshStandardMaterial({ color: 0xffd18a, emissive: 0xffa34f, emissiveIntensity: 2.8 });
const buildingMats = [0x42494a,0x59605a,0x716656,0x39464a,0x655c5c,0x526765,0x83745e].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.82}));
const windowMat = new THREE.MeshStandardMaterial({color:0xf3cb8b,emissive:0xff9d55,emissiveIntensity:1.35,roughness:.35});
const darkWindowMat = new THREE.MeshStandardMaterial({color:0x263d45,emissive:0x193b45,emissiveIntensity:.3,roughness:.5});
const palmTrunkMat = new THREE.MeshStandardMaterial({color:0x70563f,roughness:1});
const leafMat = new THREE.MeshStandardMaterial({color:0x245d50,roughness:.9});
const rng = (min,max)=>min+Math.random()*(max-min);
const pick = arr=>arr[Math.floor(Math.random()*arr.length)];
const box = (parent, x,y,z, sx,sy,sz, mat, cast=false, receive=false) => {const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=receive;parent.add(m);return m;};

// Sunset haze and warm city lighting.
scene.add(new THREE.HemisphereLight(0xffd5b0,0x263b3b,1.8));
const sun = new THREE.DirectionalLight(0xffc49a,2.4);sun.position.set(-80,120,70);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-160;sun.shadow.camera.right=160;sun.shadow.camera.top=160;sun.shadow.camera.bottom=-160;sun.shadow.bias=-.0002;scene.add(sun);
const cityGlow = new THREE.PointLight(0x48bcae,18,180,2);cityGlow.position.set(-24,22,-65);scene.add(cityGlow);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(700,700),new THREE.MeshStandardMaterial({color:0x32484a,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;city.add(ground);

function makePalm(x,z,scale=1){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);city.add(g);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.28,.48,7,7),palmTrunkMat);trunk.position.y=3.5;trunk.rotation.z=-.08;trunk.castShadow=true;g.add(trunk);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const leaf=new THREE.Mesh(new THREE.ConeGeometry(.48,5,5),leafMat);leaf.position.set(Math.sin(a)*1.5,6.65+Math.cos(a)*.5,Math.cos(a)*1.5);leaf.rotation.z=Math.cos(a)*-.85;leaf.rotation.x=Math.sin(a)*.85;leaf.rotation.y=a;leaf.castShadow=true;g.add(leaf);}
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),lampMat);bulb.position.y=6.4;g.add(bulb);
}
function makeBuilding(x,z,w,d,h,idx){
  const g=new THREE.Group();g.position.set(x,0,z);city.add(g);
  const mat=buildingMats[idx%buildingMats.length];
  const body=box(g,0,h/2,0,w,h,d,mat,true,true);obstacles.push({x,z,w,d,h});
  const roof=box(g,0,h+.25,0,w+.7,.5,d+.7,new THREE.MeshStandardMaterial({color:0x343b3c,roughness:.9}),true);
  if(h>19){box(g,0,h+.9,0,w*.45,1.3,d*.4,new THREE.MeshStandardMaterial({color:0x384547}),true);}
  // Recessed, randomly lit facade windows on the two street-facing walls.
  const rows=Math.max(2,Math.floor(h/3.3));
  for(let row=0;row<rows;row++){
    const yy=2+row*3.1;if(yy>h-1)continue;
    for(let col=0;col<Math.floor(w/3.1);col++){
      if(Math.random()<.14)continue;
      const xx=-w/2+1.6+col*3.1;const wm=Math.random()<.64?windowMat:darkWindowMat;
      box(g,xx,yy,d/2+.012,.82,1.18,.06,wm);
    }
    for(let col=0;col<Math.floor(d/3.1);col++){
      if(Math.random()<.2)continue;
      const zz=-d/2+1.6+col*3.1;const wm=Math.random()<.64?windowMat:darkWindowMat;
      box(g,w/2+.012,yy,zz,.06,1.18,.82,wm);
    }
  }
  // Art-deco sign on selected corners.
  if(Math.random()<.22){const signMat=new THREE.MeshStandardMaterial({color:pick([0x55d6ba,0xf4a960,0xd66d6e]),emissive:0x782c22,emissiveIntensity:.6});box(g,w/2+.08,Math.min(h-2,7),0,.22,1.1,Math.min(7,d*.45),signMat);}
}

// A compact grid of avenues, blocks, storefronts, street markings, and palms.
const avenues=[-140,-70,0,70,140];
for(const a of avenues){
  const roadX=box(city,a,.005,0,18,.04,340,roadMat,false,true);
  const roadZ=box(city,0,.006,a,340,.04,18,roadMat,false,true);
  box(city,a-10,.06,0,2,.12,340,sidewalkMat,false,true);box(city,a+10,.06,0,2,.12,340,sidewalkMat,false,true);
  box(city,0,.06,a-10,340,.12,2,sidewalkMat,false,true);box(city,0,.06,a+10,340,.12,2,sidewalkMat,false,true);
  // Dashed avenue center stripes.
  for(let p=-164;p<165;p+=13){box(city,a,.035,p,.13,.025,5.8,roadLineMat);box(city,p,.035,a,5.8,.025,.13,roadLineMat);}
  // Warm pools of light at intersections.
  for(const z of avenues){
    const post=new THREE.Group();post.position.set(a===0?10:a+10,0,z===0?10:z+10);city.add(post);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.09,.15,5,7),new THREE.MeshStandardMaterial({color:0x485453,metalness:.45,roughness:.7}));pole.position.y=2.5;post.add(pole);
    const arm=box(post,-.55,4.9,0,1.1,.12,.12,new THREE.MeshStandardMaterial({color:0x485453,metalness:.4}));
    const light=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),lampMat);light.position.set(-1.05,4.75,0);post.add(light);
  }
}
let bi=0;
for(let ix=0;ix<avenues.length-1;ix++)for(let iz=0;iz<avenues.length-1;iz++){
  const x0=avenues[ix]+22.5,z0=avenues[iz]+22.5;
  // small paired buildings leave a central service lane and sidewalks
  for(let sx=0;sx<2;sx++)for(let sz=0;sz<2;sz++){
    const x=x0+sx*25+rng(-.8,.8),z=z0+sz*25+rng(-.8,.8);
    const w=rng(16,19.5),d=rng(16,19.5),h=rng(9,39);
    makeBuilding(x,z,w,d,h,bi++);
    if(Math.random()<.3)makePalm(x-w*.6,z+d*.52,rng(.72,.93));
  }
  if(Math.random()<.58)makePalm(x0+29,z0+28,.85);
}
// A waterfront and pier at the east edge gives the skyline a clear horizon.
const water=new THREE.Mesh(new THREE.PlaneGeometry(220,400),new THREE.MeshStandardMaterial({color:0x274c54,metalness:.15,roughness:.38}));water.rotation.x=-Math.PI/2;water.position.set(285,-.25,0);city.add(water);
for(let z=-145;z<155;z+=17){box(city,178,.04,z,3,.08,1.1,new THREE.MeshStandardMaterial({color:0xd9c298,roughness:.6}));}
for(let i=0;i<9;i++){box(city,192+i*4,.1,18,4,.2,3,new THREE.MeshStandardMaterial({color:i%2?0x806957:0x9a775e}));}

// Shared car builder for traffic and the player's low-slung coupe.
function makeCar(color=0xd14f3d, police=false){
  const root=new THREE.Group();
  const paint=new THREE.MeshStandardMaterial({color,metalness:.42,roughness:.34});
  const glass=new THREE.MeshStandardMaterial({color:0x253e45,metalness:.34,roughness:.22,transparent:true,opacity:.88});
  const rubber=new THREE.MeshStandardMaterial({color:0x111618,roughness:.9});
  const chrome=new THREE.MeshStandardMaterial({color:0xb8b8a8,metalness:.72,roughness:.3});
  box(root,0,.72,0,2.05,.68,4.05,paint,true,true);
  const hood=box(root,0,1.07,-1.05,1.78,.2,1.54,paint,true);hood.position.y=1.03;
  const cabin=box(root,0,1.31,.25,1.56,.75,1.9,glass,true);
  const roof=box(root,0,1.7,.32,1.35,.17,1.25,paint,true);
  box(root,0,.96,1.82,1.9,.15,.24,chrome);
  const wheelGroups=[];
  for(const x of [-1.04,1.04])for(const z of [-1.28,1.28]){
    const wg=new THREE.Group();wg.position.set(x,.47,z);root.add(wg);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.28,12),rubber);tire.rotation.z=Math.PI/2;tire.castShadow=true;wg.add(tire);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.295,10),chrome);hub.rotation.z=Math.PI/2;wg.add(hub);wheelGroups.push(wg);
  }
  const headMat=new THREE.MeshStandardMaterial({color:0xfff0cc,emissive:0xffd38b,emissiveIntensity:3});
  for(const x of [-.68,.68]){
    const head=new THREE.Mesh(new THREE.BoxGeometry(.4,.2,.08),headMat);head.position.set(x,.88,-2.05);root.add(head);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(.35,.15,.08),new THREE.MeshStandardMaterial({color:0xe5463e,emissive:0x9d1713,emissiveIntensity:1.4}));tail.position.set(x,.86,2.05);root.add(tail);
  }
  if(police){
    box(root,0,1.82,.05,.95,.18,.36,new THREE.MeshStandardMaterial({color:0xd8ddda,emissive:0x202020}));
    const red=new THREE.Mesh(new THREE.BoxGeometry(.35,.16,.17),new THREE.MeshBasicMaterial({color:0xff203b}));red.position.set(-.25,1.91,.05);root.add(red);
    const blue=new THREE.Mesh(new THREE.BoxGeometry(.35,.16,.17),new THREE.MeshBasicMaterial({color:0x277bff}));blue.position.set(.25,1.91,.05);root.add(blue);root.userData.siren=[red,blue];
  }
  root.userData.wheels=wheelGroups;root.userData.paint=paint;
  return root;
}
const playerCar=makeCar(0x18a88e);carRoot.add(playerCar);playerCar.position.y=0;
const headlight1=new THREE.SpotLight(0xffdfaf,38,47,Math.PI/7,.4,1.5);headlight1.position.set(-.55,1,-1.8);headlight1.target.position.set(-.55,.1,-21);carRoot.add(headlight1,headlight1.target);
const headlight2=new THREE.SpotLight(0xffdfaf,38,47,Math.PI/7,.4,1.5);headlight2.position.set(.55,1,-1.8);headlight2.target.position.set(.55,.1,-21);carRoot.add(headlight2,headlight2.target);

function addTrafficCar(x,z,yaw,color,speed){const mesh=makeCar(color);scene.add(mesh);mesh.position.set(x,0,z);mesh.rotation.y=yaw;traffic.push({mesh,x,z,yaw,speed,axis:Math.abs(Math.sin(yaw))>.5?'x':'z'});}
addTrafficCar(-69,118,Math.PI,[0xbfc6bf,0xe3aa56,0x577886,0xd25f4d][0],9);
addTrafficCar(71,-118,0,0x8199a0,8);
addTrafficCar(120,69,Math.PI/2,0xd6ac60,7);
addTrafficCar(-118,-71,-Math.PI/2,0x7d7770,8);
addTrafficCar(15,139,Math.PI,0x718c81,6);
addTrafficCar(-139,20,Math.PI/2,0xc0ad8e,7);

// Four delivery points guide the player through the city's cross streets.
const route=[{x:0,z:-112,name:'THE NIGHT SHIFT',line:'Make the drop. Keep it clean.',reward:250},{x:70,z:-70,name:'SOUTHBOUND',line:'A quick handoff on the avenue.',reward:400},{x:-70,z:-140,name:'LAST LIGHT',line:'Cut across town before sunrise.',reward:550},{x:140,z:0,name:'COAST TO COAST',line:'One last run. Make it count.',reward:900}];
let stage=0, freeRoam=false, cash=2450, speed=0, health=100, yaw=0, heat=0, started=false, paused=false, gameOver=false;
const state={gas:false,brake:false,left:false,right:false,handbrake:false};
let targetGroup=new THREE.Group();scene.add(targetGroup);
const ring=new THREE.Mesh(new THREE.TorusGeometry(4.4,.22,10,42),new THREE.MeshStandardMaterial({color:0xffc264,emissive:0xff9b37,emissiveIntensity:2,metalness:.2,roughness:.35}));ring.rotation.x=Math.PI/2;ring.position.y=.35;targetGroup.add(ring);
const innerRing=new THREE.Mesh(new THREE.TorusGeometry(3.2,.06,8,42),new THREE.MeshBasicMaterial({color:0xfff1b6,transparent:true,opacity:.8}));innerRing.rotation.x=Math.PI/2;innerRing.position.y=.36;targetGroup.add(innerRing);
const beam=new THREE.Mesh(new THREE.CylinderGeometry(.25,4.3,20,28,1,true),new THREE.MeshBasicMaterial({color:0xffba57,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=10;targetGroup.add(beam);
const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,10,8),new THREE.MeshBasicMaterial({color:0xffd484,transparent:true,opacity:.62}));beacon.position.y=8;targetGroup.add(beacon);
const policeCars=[];
function makePickup(x,z){const g=new THREE.Group();g.position.set(x,1.15,z);scene.add(g);const coin=new THREE.Mesh(new THREE.TorusGeometry(.63,.14,9,24),new THREE.MeshStandardMaterial({color:0x72e1c0,emissive:0x238b72,emissiveIntensity:1.7,metalness:.35}));g.add(coin);const core=new THREE.Mesh(new THREE.SphereGeometry(.25,9,8),new THREE.MeshBasicMaterial({color:0xbaffdf}));g.add(core);pickups.push({group:g,coin,value:100});}
[[-135,-114],[135,-40],[-40,137],[96,110],[28,-43]].forEach(p=>makePickup(...p));

function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),1900);}
function playChime(){try{const ctx=new (window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(660,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(990,ctx.currentTime+.14);gain.gain.setValueAtTime(.12,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.4);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.4);setTimeout(()=>ctx.close(),500);}catch{}}
function refreshMission(){
  if(freeRoam){$('missionTitle').textContent='FREE ROAM';$('missionCopy').textContent='Explore the coast. Pick up the mint drops.';$('missionCount').textContent='CITY / OPEN';$('missionHint').textContent='COLLECT THE GLOW';$('reward').textContent='+$100';$('progressFill').style.width='100%';$('targetChip').style.display='none';return;}
  const m=route[stage];if(!m)return;
  $('missionTitle').textContent=m.name;$('missionCopy').textContent=m.line;$('missionCount').textContent=`0${stage+1} / 04`;$('missionHint').textContent='FOLLOW THE GOLD';$('reward').textContent=`+$${m.reward}`;$('progressFill').style.width=`${stage/4*100}%`;
  targetGroup.position.set(m.x,0,m.z);$('targetChip').style.display='flex';
}
refreshMission();

// Simple, readable mini-map drawn independently of the 3D camera.
const map=$('minimap'),mapCtx=map.getContext('2d');
function drawMap(){
  const w=map.width,h=map.height,s=w/360;mapCtx.clearRect(0,0,w,h);mapCtx.fillStyle='#13292c';mapCtx.fillRect(0,0,w,h);
  mapCtx.fillStyle='#526158';for(const a of avenues){const p=(a+180)*s;mapCtx.fillRect(p-9*s,0,18*s,h);mapCtx.fillRect(0,p-9*s,w,18*s);}
  mapCtx.fillStyle='#898c78';for(let i=0;i<4;i++)for(let j=0;j<4;j++){const x=(avenues[i]+12+180)*s,z=(avenues[j]+12+180)*s;mapCtx.fillRect(x,z,45*s,45*s);}
  mapCtx.fillStyle='rgba(53,106,108,.8)';mapCtx.fillRect((178+180)*s,0,(360-178)*s,h);
  for(const p of pickups){if(!p.group.visible)continue;const x=(p.group.position.x+180)*s,z=(p.group.position.z+180)*s;mapCtx.fillStyle='#70ddba';mapCtx.beginPath();mapCtx.arc(x,z,2.5,0,Math.PI*2);mapCtx.fill();}
  const px=(carRoot.position.x+180)*s,pz=(carRoot.position.z+180)*s;
  if(!freeRoam){const tx=(route[stage].x+180)*s,tz=(route[stage].z+180)*s;mapCtx.strokeStyle='rgba(255,195,102,.6)';mapCtx.lineWidth=1;mapCtx.setLineDash([3,3]);mapCtx.beginPath();mapCtx.moveTo(px,pz);mapCtx.lineTo(tx,tz);mapCtx.stroke();mapCtx.setLineDash([]);mapCtx.fillStyle='#ffc56d';mapCtx.beginPath();mapCtx.arc(tx,tz,3.8,0,Math.PI*2);mapCtx.fill();}
  mapCtx.save();mapCtx.translate(px,pz);mapCtx.rotate(-yaw);mapCtx.fillStyle='#8ff0d0';mapCtx.beginPath();mapCtx.moveTo(0,-5);mapCtx.lineTo(3.5,4);mapCtx.lineTo(0,2.5);mapCtx.lineTo(-3.5,4);mapCtx.closePath();mapCtx.fill();mapCtx.restore();
}

function updateHud(){const kmh=Math.round(Math.abs(speed)*3.6);$('speedValue').textContent=String(kmh).padStart(3,'0');$('gearLabel').textContent=speed<-.5?'R':speed<1?'N':'D';$('healthPct').textContent=`${Math.max(0,Math.round(health))}%`;$('healthFill').style.width=`${Math.max(0,health)}%`;$('healthFill').style.background=health<30?'#ee726a':'var(--mint)';$('cashValue').textContent=`$${cash.toLocaleString('en-US')}`;
  const stars=Math.min(5,Math.ceil(heat));$('stars').innerHTML=Array.from({length:5},(_,i)=>`<span class="${i<stars?'active':''}">${i<stars?'★':'☆'}</span>`).join('');$('heatNote').textContent=stars?'EYES ON YOU':'OFF THE RADAR';
  if(!freeRoam){const d=Math.hypot(route[stage].x-carRoot.position.x,route[stage].z-carRoot.position.z);$('targetDistance').textContent=Math.round(d);}
}

function spawnPolice(){if(policeCars.length>=3)return;const mesh=makeCar(0x243b51,true);scene.add(mesh);const a=Math.atan2(carRoot.position.x,carRoot.position.z)+Math.PI;const x=carRoot.position.x+Math.sin(a)*38,z=carRoot.position.z+Math.cos(a)*38;mesh.position.set(x,0,z);policeCars.push({mesh,speed:5+rng(0,3)});}
function crash(damage=8){speed*=-.23;health=Math.max(0,health-damage);heat=Math.min(5,heat+.45);showToast('VEHICLE DAMAGE  •  HEAT UP');if(health<=0){health=16;speed=0;showToast('ENGINE STALLED  •  REPAIRED');}}
function collides(x,z){for(const b of obstacles){if(Math.abs(x-b.x)<b.w/2+1.15&&Math.abs(z-b.z)<b.d/2+1.85)return true;}return false;}
function reachDrop(){const m=route[stage];cash+=m.reward;heat=Math.max(0,heat-.8);$('completeText').textContent=`+$${m.reward} added to your wallet. Heat is down.`;$('missionComplete').classList.add('show');paused=true;playChime();}
function nextRun(){ $('missionComplete').classList.remove('show');paused=false;if(stage<route.length-1){stage++;refreshMission();showToast('NEW DROP • CHECK YOUR MAP');}else{freeRoam=true;refreshMission();showToast('SHIFT COMPLETE • CITY IS YOURS');for(const p of pickups)p.group.visible=true;}}

// Mobile touch controls and keyboard input share the same driving state.
const keyMap={KeyW:'gas',ArrowUp:'gas',KeyS:'brake',ArrowDown:'brake',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'handbrake'};
window.addEventListener('keydown',e=>{if(keyMap[e.code]){state[keyMap[e.code]]=true;e.preventDefault();}if(e.code==='Escape'&&started&&!$('missionComplete').classList.contains('show')){paused=!paused;$('pauseScreen').classList.toggle('hidden',!paused);}});
window.addEventListener('keyup',e=>{if(keyMap[e.code]){state[keyMap[e.code]]=false;e.preventDefault();}});
for(const btn of document.querySelectorAll('[data-control]')){
  const control=btn.dataset.control;const down=e=>{e.preventDefault();state[control]=true;btn.classList.add('pressed');try{btn.setPointerCapture(e.pointerId);}catch{}};const up=e=>{e.preventDefault();state[control]=false;btn.classList.remove('pressed');};
  btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('lostpointercapture',up);
}
$('startBtn').addEventListener('click',()=>{started=true;$('intro').classList.add('hidden');$('loading').classList.add('done');showToast('THE CITY IS YOURS');});
$('continueBtn').addEventListener('click',nextRun);
$('resumeBtn').addEventListener('click',()=>{paused=false;$('pauseScreen').classList.add('hidden');});
$('audioBtn').addEventListener('click',()=>{const b=$('audioBtn');const muted=b.dataset.muted==='true';b.dataset.muted=String(!muted);b.innerHTML=muted?'♫ <span>SOUND</span>':'♪ <span>MUTED</span>';if(muted)playChime();});

function resize(){renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);

function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.035);const time=clock.elapsedTime;
  if(started&&!paused){
    const throttle=state.gas?1:0, reverse=state.brake?1:0;
    if(throttle)speed=Math.min(43,speed+22*dt);else if(reverse)speed=Math.max(-12,speed-17*dt);else speed*=Math.pow(.985,dt*60);
    if(state.handbrake)speed*=Math.pow(.94,dt*60);
    if(Math.abs(speed)<.09)speed=0;
    const steer=(state.left?1:0)-(state.right?1:0);if(steer&&Math.abs(speed)>.2)yaw+=steer*dt*(.85+Math.min(Math.abs(speed)/22,.9))*(speed>=0?1:-1);
    carRoot.rotation.y=yaw;
    const oldX=carRoot.position.x,oldZ=carRoot.position.z;
    carRoot.position.x-=Math.sin(yaw)*speed*dt;carRoot.position.z-=Math.cos(yaw)*speed*dt;
    carRoot.position.x=THREE.MathUtils.clamp(carRoot.position.x,-169,169);carRoot.position.z=THREE.MathUtils.clamp(carRoot.position.z,-169,169);
    if(collides(carRoot.position.x,carRoot.position.z)){carRoot.position.x=oldX;carRoot.position.z=oldZ;if(Math.abs(speed)>4)crash(Math.min(14,Math.abs(speed)*.24));else speed=0;}
    for(const wheel of playerCar.userData.wheels)wheel.rotation.x-=speed*dt*1.65;
    // Traffic follows its avenue; contact is a quick, costly bump, never a hard lock.
    for(const t of traffic){
      if(t.axis==='z'){t.z+=Math.cos(t.yaw)*t.speed*dt;if(t.z>170)t.z=-170;if(t.z< -170)t.z=170;}
      else{t.x-=Math.sin(t.yaw)*t.speed*dt;if(t.x>170)t.x=-170;if(t.x< -170)t.x=170;}
      t.mesh.position.set(t.x,0,t.z);for(const w of t.mesh.userData.wheels)w.rotation.x-=t.speed*dt*1.2;
      if(Math.hypot(t.x-carRoot.position.x,t.z-carRoot.position.z)<3.15){crash(5);t.x+=Math.sin(t.yaw+Math.PI/2)*4;t.z+=Math.cos(t.yaw+Math.PI/2)*4;}
    }
    if(heat>1&&policeCars.length<Math.ceil(heat/1.6))spawnPolice();
    for(const p of policeCars){const dx=carRoot.position.x-p.mesh.position.x,dz=carRoot.position.z-p.mesh.position.z;const dist=Math.hypot(dx,dz)||1;const pyaw=Math.atan2(-dx,-dz);p.mesh.rotation.y=pyaw;p.mesh.position.x+=(-dx/dist)*p.speed*dt;p.mesh.position.z+=(-dz/dist)*p.speed*dt;p.mesh.userData.siren?.forEach((lamp,i)=>lamp.material.color.setHex(Math.sin(time*15+i*Math.PI)>0?0xff3048:0x297fff));if(dist<3.2){health=Math.max(0,health-2*dt);speed*=.98;}}
    heat=Math.max(0,heat-.008*dt);
    if(!freeRoam&&Math.hypot(route[stage].x-carRoot.position.x,route[stage].z-carRoot.position.z)<6.4)reachDrop();
    for(const p of pickups){if(!p.group.visible)continue;p.group.rotation.y+=dt*1.4;p.group.position.y=1.05+Math.sin(time*2.7+p.group.position.x)*.22;if(Math.hypot(p.group.position.x-carRoot.position.x,p.group.position.z-carRoot.position.z)<3.2){p.group.visible=false;cash+=p.value;showToast('MINT DROP  •  +$100');playChime();}}
    const clockMinute=(8+Math.floor(time/28))%60,clockHour=(9+Math.floor((8+Math.floor(time/28))/60))%12||12;$('clock').textContent=`${String(clockHour).padStart(2,'0')}:${String(clockMinute).padStart(2,'0')}`;
    const d=carRoot.position.x>80?'EAST PIER':carRoot.position.z< -75?'OLD TOWN':carRoot.position.z>75?'PALM HEIGHTS':'MIDTOWN';$('districtName').textContent=d;
  }
  ring.rotation.z+=dt*.32;innerRing.rotation.z-=dt*.2;beam.material.opacity=.09+Math.sin(time*2.2)*.035;
  const desired=new THREE.Vector3(0,7.2,13.4).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(carRoot.position);
  camera.position.lerp(desired,1-Math.pow(.001,dt));const look=new THREE.Vector3(carRoot.position.x-Math.sin(yaw)*4,1.1,carRoot.position.z-Math.cos(yaw)*4);camera.lookAt(look);
  if(started)updateHud();
  drawMap();
  renderer.render(scene,camera);
}

// Position the coupe on the avenue before the first frame; the opening card is a real game state.
carRoot.position.set(0,0,8);yaw=0;carRoot.rotation.y=yaw;camera.position.set(0,8,22);camera.lookAt(0,0,0);
$('loading').classList.add('done');
tick();
