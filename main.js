import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9f2);
scene.fog = new THREE.Fog(0x8ec9f2, 80, 220);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const hud = {
  nextPoint: document.getElementById('nextPoint'),
  totalPoints: document.getElementById('totalPoints'),
  playerComplaints: document.getElementById('playerComplaints'),
  aiComplaints: document.getElementById('aiComplaints'),
  load: document.getElementById('load'),
  message: document.getElementById('message'),
  restart: document.getElementById('restartBtn')
};

const light = new THREE.HemisphereLight(0xffffff, 0x335544, 0.95);
scene.add(light);

const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(60, 70, 10);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(360, 360),
  new THREE.MeshStandardMaterial({ color: 0x2f6f3e })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 120),
  new THREE.MeshStandardMaterial({ color: 0x2d3340 })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.03;
scene.add(road);

const lane = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.PlaneGeometry(220, 120, 8, 4)),
  new THREE.LineBasicMaterial({ color: 0xa1a1aa })
);
lane.rotation.x = -Math.PI / 2;
lane.position.y = 0.06;
scene.add(lane);

function createTruck(color) {
  const truck = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2.1, 7),
    new THREE.MeshStandardMaterial({ color })
  );
  body.castShadow = true;
  body.position.y = 1.4;

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 1.8, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xdbeafe })
  );
  cabin.castShadow = true;
  cabin.position.set(0, 1.75, 2.2);

  truck.add(body, cabin);
  return truck;
}

const player = {
  mesh: createTruck(0x16a34a),
  speed: 0,
  angle: 0,
  complaints: 0,
  load: 0,
  nextPointIndex: 0,
  finished: false,
  obstacleSlowUntil: 0
};
player.mesh.position.set(-95, 0, 0);
scene.add(player.mesh);

const ai = {
  mesh: createTruck(0x2563eb),
  speed: 0.75,
  complaints: 0,
  pointIndex: 0,
  finished: false
};
ai.mesh.position.set(-105, 0, -10);
scene.add(ai.mesh);

const routePoints = [
  new THREE.Vector3(-70, 0, -35),
  new THREE.Vector3(-20, 0, 30),
  new THREE.Vector3(35, 0, -10),
  new THREE.Vector3(80, 0, 25),
  new THREE.Vector3(95, 0, -35)
];

const pointMeshes = routePoints.map((pos, index) => {
  const group = new THREE.Group();
  const bin = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.1, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  bin.position.y = 1.1;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 0.35, 8),
    new THREE.MeshStandardMaterial({ color: 0xfacc15 })
  );
  cap.position.y = 2.3;

  group.add(bin, cap);
  group.position.copy(pos);
  group.userData.routeIndex = index;
  scene.add(group);
  return group;
});

const obstacles = [
  { pos: new THREE.Vector3(-35, 0, -18), radius: 7 },
  { pos: new THREE.Vector3(15, 0, 18), radius: 8 },
  { pos: new THREE.Vector3(68, 0, -24), radius: 7 }
].map((item) => {
  const cloud = new THREE.Mesh(
    new THREE.SphereGeometry(item.radius, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xef4444, transparent: true, opacity: 0.35 })
  );
  cloud.position.copy(item.pos);
  cloud.position.y = item.radius * 0.38;
  scene.add(cloud);
  return { ...item, mesh: cloud };
});

const keys = {};
window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

function updateHUD() {
  hud.totalPoints.textContent = String(routePoints.length);
  hud.nextPoint.textContent = String(Math.min(player.nextPointIndex + 1, routePoints.length));
  hud.playerComplaints.textContent = String(player.complaints);
  hud.aiComplaints.textContent = String(ai.complaints);
  hud.load.textContent = String(Math.floor(player.load));
}

function resetGame() {
  player.mesh.position.set(-95, 0, 0);
  player.angle = 0;
  player.speed = 0;
  player.complaints = 0;
  player.load = 0;
  player.nextPointIndex = 0;
  player.finished = false;
  ai.mesh.position.set(-105, 0, -10);
  ai.pointIndex = 0;
  ai.complaints = 0;
  ai.finished = false;
  hud.message.textContent = '';
  pointMeshes.forEach((mesh) => mesh.visible = true);
  updateHUD();
}

hud.restart.addEventListener('click', resetGame);

function handlePlayer(dt, elapsed) {
  const accel = keys['w'] ? 14 : keys['s'] ? -10 : -6;
  player.speed = THREE.MathUtils.clamp(player.speed + accel * dt, -7, 22);

  if (Math.abs(player.speed) > 0.5) {
    const steer = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
    player.angle += steer * dt * (player.speed > 0 ? 1.8 : -1.3);
  }

  if (keys[' '] && player.load > 5) {
    player.load = Math.max(0, player.load - 45);
    player.complaints += 1;
    keys[' '] = false;
    hud.message.textContent = 'Awaryjne opróżnienie: +1 reklamacja.';
  }

  const slowFactor = elapsed < player.obstacleSlowUntil ? 0.45 : 1;
  const velocity = player.speed * slowFactor;
  player.mesh.position.x += Math.sin(player.angle) * velocity * dt;
  player.mesh.position.z += Math.cos(player.angle) * velocity * dt;
  player.mesh.rotation.y = player.angle;

  player.mesh.position.x = THREE.MathUtils.clamp(player.mesh.position.x, -108, 108);
  player.mesh.position.z = THREE.MathUtils.clamp(player.mesh.position.z, -58, 58);

  for (const zone of obstacles) {
    const distance = zone.pos.distanceTo(player.mesh.position);
    if (distance < zone.radius + 1.3) {
      player.obstacleSlowUntil = elapsed + 1.4;
      player.complaints += 1;
      player.load = Math.min(100, player.load + 10);
      hud.message.textContent = 'Wjechałeś w strefę przepełnienia! +1 reklamacja i wolniejsza jazda.';
    }
  }

  for (const mesh of pointMeshes) {
    if (!mesh.visible) continue;
    const distance = mesh.position.distanceTo(player.mesh.position);
    if (distance > 5.4) continue;

    const index = mesh.userData.routeIndex;
    if (index === player.nextPointIndex) {
      mesh.visible = false;
      player.nextPointIndex += 1;
      player.load = Math.min(100, player.load + 22);
      hud.message.textContent = `Odebrano odpady z punktu ${index + 1}.`;

      if (player.load >= 100) {
        player.complaints += 2;
        player.load = 65;
        hud.message.textContent = 'Za dużo odpadów! +2 reklamacje za przeciążenie.';
      }
    } else {
      player.complaints += 2;
      hud.message.textContent = `Pominięcie trasy! Najpierw punkt ${player.nextPointIndex + 1}. (+2 reklamacje)`;
    }
  }

  if (player.nextPointIndex >= routePoints.length) {
    player.finished = true;
  }
}

function handleAI(dt) {
  if (ai.finished) return;
  const target = routePoints[ai.pointIndex];
  if (!target) {
    ai.finished = true;
    return;
  }

  const dir = new THREE.Vector3().subVectors(target, ai.mesh.position);
  const dist = dir.length();
  dir.y = 0;

  if (dist < 4) {
    ai.pointIndex += 1;
    if (Math.random() < 0.6) ai.complaints += 1;
    if (Math.random() < 0.25) ai.complaints += 2;
    if (ai.pointIndex >= routePoints.length) ai.finished = true;
    return;
  }

  dir.normalize();
  ai.mesh.position.addScaledVector(dir, ai.speed * 24 * dt);
  ai.mesh.rotation.y = Math.atan2(dir.x, dir.z);
}

const clock = new THREE.Clock();
resetGame();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  if (!player.finished) {
    handlePlayer(dt, elapsed);
  }
  handleAI(dt);
  updateHUD();

  if (player.finished && !ai.finished) {
    hud.message.textContent = 'Meta! Czekamy na rywala...';
  }

  if (player.finished && ai.finished) {
    if (player.complaints < ai.complaints) {
      hud.message.textContent = `Wygrałeś! Reklamacje: Ty ${player.complaints} vs Rywal ${ai.complaints}.`;
    } else if (player.complaints > ai.complaints) {
      hud.message.textContent = `Rywal wygrywa: Ty ${player.complaints} vs Rywal ${ai.complaints}.`;
    } else {
      hud.message.textContent = `Remis reklamacyjny: ${player.complaints}:${ai.complaints}.`;
    }
  }

  const camOffset = new THREE.Vector3(0, 17, -24).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.angle);
  camera.position.lerp(new THREE.Vector3().copy(player.mesh.position).add(camOffset), 0.08);
  camera.lookAt(player.mesh.position.x, 2.4, player.mesh.position.z + 8);

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
