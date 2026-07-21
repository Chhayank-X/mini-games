import * as THREE from 'three';
import { audio } from './audio.js';

class GameEngine {
  constructor() {
    this.container = null;
    this.width = 0;
    this.height = 0;
    
    // Three.js core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.isRunRunning = false;
    
    // Gameplay variables
    this.gameSpeed = 45; // Units per second
    this.maxGameSpeed = 95;
    this.score = 0;
    this.coins = 0;
    this.multiplier = 1;
    this.highScores = [];
    
    // Lane configuration
    this.lanes = [-3.5, 0, 3.5]; // Left, Middle, Right x-coordinates
    this.currentLane = 1; // Start in middle lane
    
    // Player state
    this.player = {
      mesh: null,
      boardMesh: null,
      riderMesh: null,
      boosterParticles: null,
      x: 0,
      y: 0, // Height off the ground
      z: 0,
      targetX: 0,
      vy: 0, // Vertical velocity
      gravity: -38,
      jumpForce: 15,
      isJumping: false,
      isSliding: false,
      slideTime: 0,
      slideDuration: 0.6,
      radius: 0.8,
      currentBoardColor: 0x00ff66,
      onTrain: false,
      currentTrainHeight: 0
    };
    
    // Game Entities lists
    this.roadSegments = [];
    this.obstacles = [];
    this.coinsList = [];
    this.particles = [];
    
    // Spawning timers
    this.obstacleSpawnTimer = 0;
    this.obstacleSpawnInterval = 1.6; // Spawn group every N seconds
    
    // Powerups state
    this.powerups = {
      magnet: { active: false, duration: 0, timer: 0 },
      doubleMultiplier: { active: false, duration: 0, timer: 0 }
    };
    
    // UI Event Callbacks
    this.onGameOverCallback = null;
    this.onStateChangeCallback = null;
    this.autopilot = false;
  }

  init(containerId, onStateChange, onGameOver) {
    this.container = document.getElementById(containerId);
    this.onStateChangeCallback = onStateChange;
    this.onGameOverCallback = onGameOver;
    
    // Dimensions
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    
    // Create Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05050b);
    this.scene.fog = new THREE.FogExp2(0x05050b, 0.015);
    
    // Create Camera
    this.camera = new THREE.PerspectiveCamera(65, this.width / this.height, 0.1, 1000);
    // Position camera behind and above the player
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 1.5, -12);
    
    // Create Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clear wrapper and append canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    
    // Add Lights
    this.addLights();
    
    // Create Infinite Track Layout
    this.createRoad();
    
    // Create Player (Hoverboard + Rider)
    this.createPlayer();
    
    // Load Saved Data
    this.loadGameData();
    
    // Handle Window Resizing
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Render initial frame
    this.renderer.render(this.scene, this.camera);
  }

  addLights() {
    // Soft violet ambient light
    const ambientLight = new THREE.AmbientLight(0x1a0f30, 1.2);
    this.scene.add(ambientLight);
    
    // Main directional sun/moon light (casts shadows)
    const dirLight = new THREE.DirectionalLight(0x00ffff, 1.5);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    const d = 15;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);
    
    // Backlight for player silhouettes
    const backLight = new THREE.DirectionalLight(0xff00aa, 0.8);
    backLight.position.set(-10, 5, -20);
    this.scene.add(backLight);
  }

  // Create repeating segments of the track
  createRoad() {
    const segmentLength = 20;
    const numSegments = 10;
    
    for (let i = 0; i < numSegments; i++) {
      const segment = new THREE.Group();
      segment.position.z = -i * segmentLength;
      
      // Road surface (Dark grid floor)
      const roadGeo = new THREE.PlaneGeometry(16, segmentLength);
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a14,
        roughness: 0.8,
        metalness: 0.2
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      segment.add(road);
      
      // Lane dividers (Glowing neon dashed lines)
      const dividerGeo = new THREE.PlaneGeometry(0.15, segmentLength);
      const dividerMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.5
      });
      
      // Left lane divider
      const divLeft = new THREE.Mesh(dividerGeo, dividerMat);
      divLeft.rotation.x = -Math.PI / 2;
      divLeft.position.set(-1.75, 0.01, 0);
      segment.add(divLeft);
      
      // Right lane divider
      const divRight = divLeft.clone();
      divRight.position.set(1.75, 0.01, 0);
      segment.add(divRight);

      // Neon outer track edges (glowing rails)
      const railGeo = new THREE.BoxGeometry(0.3, 0.2, segmentLength);
      const railMat = new THREE.MeshStandardMaterial({
        color: 0xff00aa,
        emissive: 0xff00aa,
        emissiveIntensity: 0.5
      });
      
      const railLeft = new THREE.Mesh(railGeo, railMat);
      railLeft.position.set(-8, 0.1, 0);
      segment.add(railLeft);
      
      const railRight = railLeft.clone();
      railRight.position.set(8, 0.1, 0);
      segment.add(railRight);
      
      // Add grid lines perpendicular to create scrolling effect
      const lineGeo = new THREE.PlaneGeometry(16, 0.1);
      const lineMat = new THREE.MeshBasicMaterial({
        color: 0x241d4f,
        transparent: true,
        opacity: 0.4
      });
      const gridLine = new THREE.Mesh(lineGeo, lineMat);
      gridLine.rotation.x = -Math.PI / 2;
      gridLine.position.set(0, 0.005, -segmentLength / 2);
      segment.add(gridLine);
      
      this.scene.add(segment);
      this.roadSegments.push(segment);
    }
  }

  // Visual low-poly model for Player
  createPlayer() {
    this.player.mesh = new THREE.Group();
    this.player.mesh.position.set(0, 0, 0);
    this.scene.add(this.player.mesh);
    
    // 1. Hoverboard
    const boardGeo = new THREE.BoxGeometry(1.2, 0.15, 2.2);
    const boardMat = new THREE.MeshStandardMaterial({
      color: this.player.currentBoardColor,
      emissive: this.player.currentBoardColor,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    });
    this.player.boardMesh = new THREE.Mesh(boardGeo, boardMat);
    this.player.boardMesh.position.y = 0.3; // hover offset
    this.player.boardMesh.castShadow = true;
    this.player.mesh.add(this.player.boardMesh);
    
    // Thruster engine details under the board
    const engineGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.6, 8);
    engineGeo.rotateX(Math.PI / 2);
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 });
    const thruster = new THREE.Mesh(engineGeo, engineMat);
    thruster.position.set(0, 0.15, 0.8);
    this.player.boardMesh.add(thruster);
    
    // 2. Rider (Stylized Cyber humanoid block model)
    const rider = new THREE.Group();
    rider.position.set(0, 0.35, 0); // Position relative to board
    this.player.riderMesh = rider;
    this.player.mesh.add(rider);
    
    // Torso/Body
    const bodyGeo = new THREE.BoxGeometry(0.7, 1.0, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    rider.add(body);
    
    // Head with Glowing Neon Visor
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x222233 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.5, 0.05);
    head.castShadow = true;
    rider.add(head);
    
    // Visor
    const visorGeo = new THREE.BoxGeometry(0.35, 0.12, 0.1);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.52, 0.22);
    rider.add(visor);
    
    // Glowing neon outlines for clothes
    const trimGeo = new THREE.BoxGeometry(0.72, 0.06, 0.42);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, 0.8, 0);
    rider.add(trim);
    
    // Left Arm
    const armGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.48, 0.8, 0);
    leftArm.castShadow = true;
    rider.add(leftArm);
    
    // Right Arm
    const rightArm = leftArm.clone();
    rightArm.position.set(0.48, 0.8, 0);
    rider.add(rightArm);
    
    // Left Leg
    const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    leftLeg.position.set(-0.25, 0.35, 0);
    leftLeg.castShadow = true;
    rider.add(leftLeg);
    
    // Right Leg
    const rightLeg = leftLeg.clone();
    rightLeg.position.set(0.25, 0.35, 0);
    rider.add(rightLeg);
    
    // 3. Hover Booster flame particles (thruster light glow)
    const flameGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
    this.player.boosterParticles = new THREE.Mesh(flameGeo, flameMat);
    this.player.boosterParticles.position.set(0, 0.1, 1.2);
    this.player.boardMesh.add(this.player.boosterParticles);
  }

  // Update hoverboard visual material color when purchased or changed
  updateBoardColor(hexColor) {
    this.player.currentBoardColor = hexColor;
    if (this.player.boardMesh) {
      this.player.boardMesh.material.color.setHex(hexColor);
      this.player.boardMesh.material.emissive.setHex(hexColor);
    }
  }

  // Set up touch controls and swipes
  setupControls() {
    let startX = 0;
    let startY = 0;
    const minSwipeDist = 30;
    
    // Handle touch start
    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    
    // Handle touch end (detect swipes)
    const handleTouchEnd = (e) => {
      if (!this.isRunRunning) return;
      const diffX = e.changedTouches[0].clientX - startX;
      const diffY = e.changedTouches[0].clientY - startY;
      
      // Determine swipe direction
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal Swipe
        if (Math.abs(diffX) > minSwipeDist) {
          if (diffX > 0) this.changeLane(1); // Right swipe
          else this.changeLane(-1); // Left swipe
        }
      } else {
        // Vertical Swipe
        if (Math.abs(diffY) > minSwipeDist) {
          if (diffY < 0) this.jump(); // Swipe Up
          else this.slide(); // Swipe Down
        }
      }
    };
    
    // Add touch event listeners to game container
    this.container.addEventListener('touchstart', handleTouchStart, { passive: true });
    this.container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Remove existing if any, and set keyboard events globally
    const handleKeyDown = (e) => {
      if (!this.isRunRunning) return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.changeLane(-1);
          break;
          
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.changeLane(1);
          break;
          
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ': // Spacebar
          e.preventDefault();
          this.jump();
          break;
          
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          this.slide();
          break;
      }
    };
    
    window.removeEventListener('keydown', this.handleKeyDownRef);
    this.handleKeyDownRef = handleKeyDown;
    window.addEventListener('keydown', this.handleKeyDownRef);
  }

  // Change lane left or right
  changeLane(dir) {
    let target = this.currentLane + dir;
    if (target >= 0 && target <= 2) {
      this.currentLane = target;
      this.player.targetX = this.lanes[this.currentLane];
      audio.playTone(400, 'triangle', 0.05, 0.02, audio.currentTime); // Quick blip
    }
  }

  // Trigger jump physics
  jump() {
    // Can jump if on the ground or on top of a train
    if (!this.player.isJumping) {
      this.player.isJumping = true;
      this.player.vy = this.player.jumpForce;
      audio.playJumpSFX();
    }
  }

  // Trigger slide/roll (shrink player height)
  slide() {
    if (this.player.isJumping && !this.player.onTrain) {
      // Fast-fall: If sliding while jumping, quickly push player down
      this.player.vy = -18;
    }
    
    if (!this.player.isSliding) {
      this.player.isSliding = true;
      this.player.slideTime = 0;
      
      // Visual scale squish animation
      this.player.riderMesh.scale.y = 0.45;
      this.player.riderMesh.scale.z = 1.3;
      this.player.riderMesh.position.y = 0.15; // lower down
      
      audio.playSlideSFX();
    }
  }

  // End sliding and restore player scales
  endSlide() {
    this.player.isSliding = false;
    this.player.riderMesh.scale.set(1, 1, 1);
    this.player.riderMesh.position.set(0, 0.35, 0);
  }

  // Spawning Engine: Decides what groups of items/obstacles to spawn
  spawnObstacleGroup() {
    const activeLane = Math.floor(Math.random() * 3); // Decide a primary lane for a barrier
    const spawnZ = -140; // Far distance in fog
    
    const roll = Math.random();
    
    if (roll < 0.3) {
      // 1. Spawns simple hurdle barricades (Jump over)
      this.spawnBarricade(activeLane, spawnZ);
      // Maybe spawn coins in other lanes
      this.spawnCoinLine((activeLane + 1) % 3, spawnZ, 3);
      this.spawnCoinLine((activeLane + 2) % 3, spawnZ, 3);
    } 
    else if (roll < 0.6) {
      // 2. Spawns high arch barrier (Slide under)
      this.spawnHighBarrier(activeLane, spawnZ);
      // Spawn coin line in same lane but low
      this.spawnCoinLine(activeLane, spawnZ - 5, 3, 1.2);
    } 
    else {
      // 3. Spawns a glowing Train (Can run on top, or block completely)
      const trainLane = Math.floor(Math.random() * 3);
      // Sometimes train is moving
      const isMoving = Math.random() < 0.4;
      this.spawnTrain(trainLane, spawnZ, isMoving);
      
      // Add coins on top of the train!
      this.spawnCoinLine(trainLane, spawnZ - 5, 4, 4.5); // high coins
      
      // Place a barricade in another lane to limit safety paths
      const otherLane = (trainLane + 1) % 3;
      this.spawnBarricade(otherLane, spawnZ + 10);
    }
    
    // Rare chance to spawn a Magnet power-up instead of a normal coin
    if (Math.random() < 0.08) {
      const pLane = Math.floor(Math.random() * 3);
      this.spawnPowerup(pLane, spawnZ - 15, 'magnet');
    }
  }

  spawnBarricade(lane, z) {
    const width = 2.2;
    const height = 1.3;
    const depth = 0.5;
    
    const geom = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff003c, // Neon Red
      emissive: 0xff003c,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(this.lanes[lane], height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add flashing warning lights on top
    const capGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8);
    const capMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const warningLight = new THREE.Mesh(capGeo, capMat);
    warningLight.position.set(0, height / 2 + 0.1, 0);
    mesh.add(warningLight);
    
    this.scene.add(mesh);
    this.obstacles.push({
      mesh: mesh,
      type: 'barricade',
      lane: lane,
      width: width,
      height: height,
      depth: depth,
      speed: 0
    });
  }

  spawnHighBarrier(lane, z) {
    const width = 2.4;
    const height = 3.0; // High gap
    
    // Represented by an archway (a top bar and two thin pillars)
    const arch = new THREE.Group();
    arch.position.set(this.lanes[lane], 0, z);
    
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x333344 });
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xbd00ff, // Glowing Purple
      emissive: 0xbd00ff,
      emissiveIntensity: 0.6
    });
    
    // Top bar (lower edge is at y=1.8, player must slide to be under it)
    const topBarGeo = new THREE.BoxGeometry(width, 0.5, 0.5);
    const topBar = new THREE.Mesh(topBarGeo, barMat);
    topBar.position.y = 2.4;
    topBar.castShadow = true;
    arch.add(topBar);
    
    // Left support pillar
    const pillarGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.0, 8);
    const pillarLeft = new THREE.Mesh(pillarGeo, pillarMat);
    pillarLeft.position.set(-width / 2 + 0.1, 1.5, 0);
    pillarLeft.castShadow = true;
    arch.add(pillarLeft);
    
    // Right support pillar
    const pillarRight = pillarLeft.clone();
    pillarRight.position.set(width / 2 - 0.1, 1.5, 0);
    arch.add(pillarRight);
    
    this.scene.add(arch);
    this.obstacles.push({
      mesh: arch,
      type: 'high_barrier',
      lane: lane,
      width: width,
      height: 0.5, // Check collision on top bar height
      bottomClearance: 2.15, // Anything higher than this will hit the bar
      depth: 0.5,
      speed: 0
    });
  }

  spawnTrain(lane, z, isMoving = false) {
    const width = 2.5;
    const height = 4.0;
    const depth = 22.0; // Long train block
    
    const geom = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      color: isMoving ? 0x0066ff : 0x222233, // Blue for moving, metal gray for stationary
      roughness: 0.2,
      metalness: 0.8
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(this.lanes[lane], height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Glow grill lights on front face
    const lightGeo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const headlightLeft = new THREE.Mesh(lightGeo, lightMat);
    headlightLeft.position.set(-0.7, 0.8, -depth / 2 - 0.05);
    mesh.add(headlightLeft);
    
    const headlightRight = headlightLeft.clone();
    headlightRight.position.set(0.7, 0.8, -depth / 2 - 0.05);
    mesh.add(headlightRight);
    
    // Front glowing grid/shield (cool sci-fi detailing)
    const grillGeo = new THREE.PlaneGeometry(1.8, 1.2);
    const grillMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const grill = new THREE.Mesh(grillGeo, grillMat);
    grill.position.set(0, -0.6, -depth / 2 - 0.02);
    mesh.add(grill);

    // Front angled ramp mesh so player can transition up if they jump on time
    const rampGeo = new THREE.BoxGeometry(width, height, 4.0);
    const ramp = new THREE.Mesh(rampGeo, mat);
    ramp.position.set(0, 0, -depth / 2 - 2.0);
    ramp.rotation.x = Math.PI / 16; // slight slope
    
    this.scene.add(mesh);
    this.obstacles.push({
      mesh: mesh,
      type: 'train',
      lane: lane,
      width: width,
      height: height,
      depth: depth,
      speed: isMoving ? 25 : 0 // Moving trains slide forward relative to background speed
    });
  }

  spawnCoinLine(lane, startZ, count = 4, y = 1.0) {
    const spacing = 4.0;
    for (let i = 0; i < count; i++) {
      const z = startZ - i * spacing;
      
      const geom = new THREE.OctahedronGeometry(0.35);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffd700, // Golden
        emissive: 0xffa500,
        emissiveIntensity: 0.5,
        metalness: 1.0,
        roughness: 0.1
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(this.lanes[lane], y, z);
      mesh.castShadow = true;
      this.scene.add(mesh);
      
      this.coinsList.push({
        mesh: mesh,
        lane: lane,
        originalY: y,
        spinSpeed: 2 + Math.random(),
        collected: false
      });
    }
  }

  spawnPowerup(lane, z, type) {
    const geom = new THREE.TorusGeometry(0.4, 0.12, 8, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.7
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(this.lanes[lane], 1.2, z);
    
    // Inner emblem
    const innerGeo = new THREE.BoxGeometry(0.2, 0.4, 0.2);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    mesh.add(inner);
    
    this.scene.add(mesh);
    this.coinsList.push({
      mesh: mesh,
      lane: lane,
      originalY: 1.2,
      spinSpeed: 3,
      collected: false,
      isPowerup: true,
      powerupType: type
    });
  }

  // Spawns small sparkling particles (coin pick or speed burst effects)
  spawnCollectEffect(x, y, z, hexColor = 0xffd700) {
    const count = 12;
    const geom = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    
    for (let i = 0; i < count; i++) {
      positions.push(x, y, z);
      // Random dispersion vector
      velocities.push(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.2) * 8 + 4, // fly upwards
        (Math.random() - 0.5) * 6
      );
    }
    
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    const mat = new THREE.PointsMaterial({
      color: hexColor,
      size: 0.25,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geom, mat);
    this.scene.add(points);
    
    this.particles.push({
      points: points,
      velocities: velocities,
      age: 0,
      maxAge: 0.5 // survives half a second
    });
  }

  // Main game state triggers
  startGame() {
    this.initHUD();
    this.isRunRunning = true;
    this.clock.getDelta(); // reset clock delta
    this.setupControls();
    
    // Clear old elements if any
    this.clearObstaclesAndCoins();
    
    // Reset player variables
    this.player.mesh.position.set(0, 0, 0);
    this.player.x = 0;
    this.player.y = 0;
    this.player.vy = 0;
    this.player.isJumping = false;
    this.currentLane = 1;
    this.player.targetX = 0;
    this.player.onTrain = false;
    this.endSlide();
    
    this.score = 0;
    this.multiplier = 1;
    this.gameSpeed = 45;
    this.obstacleSpawnTimer = 0.5; // Spawn first set quickly
    
    this.powerups.magnet.active = false;
    this.powerups.doubleMultiplier.active = false;
    
    audio.startMusic();
  }

  initHUD() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({
        score: this.score,
        coins: this.coins,
        multiplier: this.multiplier
      });
    }
  }

  clearObstaclesAndCoins() {
    this.obstacles.forEach(o => this.scene.remove(o.mesh));
    this.obstacles = [];
    this.coinsList.forEach(c => this.scene.remove(c.mesh));
    this.coinsList = [];
    this.particles.forEach(p => this.scene.remove(p.points));
    this.particles = [];
  }

  gameOver() {
    this.isRunRunning = false;
    audio.stopMusic();
    audio.playCrashSFX();
    
    // Spawn crash fireworks!
    this.spawnCollectEffect(this.player.mesh.position.x, this.player.mesh.position.y + 1, this.player.mesh.position.z, 0xff003c);
    
    // Save coins & high scores
    this.saveGameData();
    
    if (this.onGameOverCallback) {
      this.onGameOverCallback({
        score: Math.floor(this.score),
        coins: this.coins,
        highScore: this.highScores[0] ? this.highScores[0].score : Math.floor(this.score)
      });
    }
  }

  runAutopilot(delta) {
    if (!this.isRunRunning) return;
    
    const playerX = this.player.x;
    const playerY = this.player.y;
    const playerZ = this.player.mesh.position.z;

    // Scan for obstacles in our path
    let closestDanger = null;
    let closestDangerZ = -999;
    
    for (let o of this.obstacles) {
      const oz = o.mesh.position.z;
      if (oz < -2 && oz > -45) {
        if (o.lane === this.currentLane) {
          if (oz > closestDangerZ) {
            closestDangerZ = oz;
            closestDanger = o;
          }
        }
      }
    }
    
    if (closestDanger) {
      let dodged = false;
      const leftLane = this.currentLane - 1;
      const rightLane = this.currentLane + 1;
      const laneOptions = [];
      
      if (leftLane >= 0) laneOptions.push({ lane: leftLane, dir: -1 });
      if (rightLane <= 2) laneOptions.push({ lane: rightLane, dir: 1 });
      
      const safeOptions = laneOptions.filter(opt => {
        return !this.obstacles.some(o => {
          const oz = o.mesh.position.z;
          return o.lane === opt.lane && oz < 5 && oz > -60;
        });
      });
      
      if (safeOptions.length > 0) {
        const opt = safeOptions[Math.floor(Math.random() * safeOptions.length)];
        this.changeLane(opt.dir);
        dodged = true;
      }
      
      if (!dodged) {
        if (closestDanger.type === 'high_barrier') {
          if (!this.player.isSliding) {
            this.slide();
          }
        } else {
          if (!this.player.isJumping) {
            this.jump();
          }
        }
      }
    }
    
    // Auto-collect coins if safe
    if (!closestDanger) {
      let closestCoin = null;
      let closestCoinZ = -999;
      
      for (let c of this.coinsList) {
        const cz = c.mesh.position.z;
        if (cz < -5 && cz > -35 && !c.collected) {
          if (cz > closestCoinZ) {
            closestCoinZ = cz;
            closestCoin = c;
          }
        }
      }
      
      if (closestCoin && closestCoin.lane !== this.currentLane) {
        const coinLane = closestCoin.lane;
        const isLaneSafe = !this.obstacles.some(o => {
          const oz = o.mesh.position.z;
          return o.lane === coinLane && oz < 5 && oz > -50;
        });
        
        if (isLaneSafe) {
          const dir = coinLane - this.currentLane;
          const stepDir = Math.sign(dir);
          this.changeLane(stepDir);
        }
      }
    }
  }

  // Physics, animations, and updates loop
  update(delta) {
    if (!this.isRunRunning) return;
    
    // Limit delta to avoid giant physics skips when running in background
    delta = Math.min(delta, 0.1);

    // Call autopilot if active
    if (this.autopilot) {
      this.runAutopilot(delta);
    }
    
    // 1. Increase game speed gradually
    if (this.gameSpeed < this.maxGameSpeed) {
      this.gameSpeed += delta * 0.4;
    }
    
    // 2. Increment score based on distance run
    let multVal = this.multiplier;
    if (this.powerups.doubleMultiplier.active) {
      multVal *= 2;
    }
    this.score += delta * this.gameSpeed * 0.15 * multVal;
    
    // Trigger UI updates
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({
        score: Math.floor(this.score),
        coins: this.coins,
        multiplier: this.multiplier * (this.powerups.doubleMultiplier.active ? 2 : 1)
      });
    }
    
    // 3. Update Powerup Timers
    this.updatePowerupTimers(delta);
    
    // 4. Update Road Segments (Scrolling effect)
    this.updateRoadSegments(delta);
    
    // 5. Update Player physics (Jump, Slide, Lane Lerp)
    this.updatePlayerPhysics(delta);
    
    // 6. Update Booster flame micro-animation
    if (this.player.boosterParticles) {
      const s = 0.8 + Math.sin(this.clock.getElapsedTime() * 25) * 0.2;
      this.player.boosterParticles.scale.set(s, s, s);
    }
    
    // 7. Spawning trigger
    this.obstacleSpawnTimer += delta;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.obstacleSpawnTimer = 0;
      // Interval speeds up as game goes faster
      this.obstacleSpawnInterval = Math.max(1.0, 2.0 - (this.gameSpeed / 80));
      this.spawnObstacleGroup();
    }
    
    // 8. Update Obstacles, Trains, and check Collisions
    this.updateObstacles(delta);
    
    // 9. Update Coins & collect check
    this.updateCoins(delta);
    
    // 10. Update floating particles
    this.updateParticles(delta);
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }

  updatePowerupTimers(delta) {
    if (this.powerups.magnet.active) {
      this.powerups.magnet.timer -= delta;
      if (this.powerups.magnet.timer <= 0) this.powerups.magnet.active = false;
    }
    if (this.powerups.doubleMultiplier.active) {
      this.powerups.doubleMultiplier.timer -= delta;
      if (this.powerups.doubleMultiplier.timer <= 0) this.powerups.doubleMultiplier.active = false;
    }
  }

  updateRoadSegments(delta) {
    const segmentLength = 20;
    const speedDistance = this.gameSpeed * delta;
    
    this.roadSegments.forEach(segment => {
      segment.position.z += speedDistance;
      
      // If a segment goes behind the camera, wrap it to the far front
      if (segment.position.z > 20) {
        // Find furthest segment
        let furthestZ = 0;
        this.roadSegments.forEach(s => {
          if (s.position.z < furthestZ) furthestZ = s.position.z;
        });
        
        segment.position.z = furthestZ - segmentLength;
      }
    });
  }

  updatePlayerPhysics(delta) {
    // A. Smooth horizontal lane movement (Lerp)
    const lerpSpeed = 16 * delta;
    this.player.x += (this.player.targetX - this.player.x) * Math.min(lerpSpeed, 1);
    this.player.mesh.position.x = this.player.x;
    
    // Add minor banking/tilt rotation based on lateral velocity
    const lateralDiff = this.player.targetX - this.player.x;
    this.player.boardMesh.rotation.z = -lateralDiff * 0.15;
    this.player.boardMesh.rotation.y = lateralDiff * 0.08;
    
    // B. Vertical physics (Jumping / Gravity)
    if (this.player.isJumping) {
      this.player.vy += this.player.gravity * delta;
      this.player.y += this.player.vy * delta;
      
      const floorY = this.player.onTrain ? this.player.currentTrainHeight : 0;
      
      if (this.player.y <= floorY) {
        this.player.y = floorY;
        this.player.vy = 0;
        this.player.isJumping = false;
      }
    } else {
      // Check if we ran off the top of a train onto the empty ground
      const floorY = this.player.onTrain ? this.player.currentTrainHeight : 0;
      if (this.player.y > floorY) {
        this.player.isJumping = true; // Fall off the train
        this.player.vy = 0;
      }
    }
    
    this.player.mesh.position.y = this.player.y;
    
    // C. Slide state timing
    if (this.player.isSliding) {
      this.player.slideTime += delta;
      if (this.player.slideTime >= this.player.slideDuration) {
        this.endSlide();
      }
    }
  }

  updateObstacles(delta) {
    const speedDistance = this.gameSpeed * delta;
    const playerZ = this.player.mesh.position.z;
    const playerX = this.player.mesh.position.x;
    const playerY = this.player.mesh.position.y;
    
    // Reset train standing flag; will be checked below
    let standingOnAnyTrain = false;
    let standingTrainHeight = 0;
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      
      // Move obstacles towards camera
      // Stationary objects move backward at background speed.
      // Oncoming trains move backward even faster (background speed + train speed).
      o.mesh.position.z += (this.gameSpeed + o.speed) * delta;
      
      // Remove obstacles that have scrolled way past the camera
      if (o.mesh.position.z > 20) {
        this.scene.remove(o.mesh);
        this.obstacles.splice(i, 1);
        continue;
      }
      
      // COLLISION DETECTION (Axis-Aligned Bounding Box check)
      const objZ = o.mesh.position.z;
      const objX = o.mesh.position.x;
      const objY = o.mesh.position.y;
      
      // Z-axis check (is the player overlapping the obstacle in the Z plane?)
      const zOverlapDist = (o.depth / 2) + 0.8; // player bounding depth buffer
      const isZOverlapping = Math.abs(playerZ - objZ) < zOverlapDist;
      
      if (isZOverlapping) {
        // X-axis check (is the player in the same lane / overlapping horizontally?)
        const isXOverlapping = Math.abs(playerX - objX) < 1.1; // lane overlap width
        
        if (isXOverlapping) {
          if (o.type === 'barricade') {
            // Must jump over. If player height is less than barrier top, CRASH!
            if (playerY < o.height) {
              if (this.autopilot) {
                // Auto-save: Force player height to clear barricade
                this.player.isJumping = true;
                this.player.y = o.height + 0.1;
                this.player.mesh.position.y = this.player.y;
                this.player.vy = 0;
              } else {
                this.gameOver();
                return;
              }
            }
          } 
          else if (o.type === 'high_barrier') {
            // Must slide under.
            // If player is NOT sliding, or is jumping, they hit the top bar clearance
            if (!this.player.isSliding || playerY > 0.5) {
              if (this.autopilot) {
                // Auto-save: Force slide animation
                this.slide();
              } else {
                this.gameOver();
                return;
              }
            }
          } 
          else if (o.type === 'train') {
            // Train logic:
            // A. Jumped on top of the train:
            const trainTopY = o.height;
            if (playerY >= trainTopY - 0.4 && this.player.vy <= 0) {
              standingOnAnyTrain = true;
              standingTrainHeight = trainTopY;
              
              // Correct player position to sit on top of train
              if (!this.player.isJumping) {
                this.player.y = trainTopY;
                this.player.mesh.position.y = this.player.y;
              }
            } 
            else {
              if (this.autopilot) {
                // Auto-save: Instantly place the player on top of the train
                standingOnAnyTrain = true;
                standingTrainHeight = trainTopY;
                this.player.y = trainTopY;
                this.player.mesh.position.y = this.player.y;
                this.player.isJumping = false;
                this.player.vy = 0;
              } else {
                // B. Frontal or side crash into train wall!
                this.gameOver();
                return;
              }
            }
          }
        }
      }
    }
    
    // Set player train standing states
    this.player.onTrain = standingOnAnyTrain;
    if (standingOnAnyTrain) {
      this.player.currentTrainHeight = standingTrainHeight;
    } else {
      this.player.currentTrainHeight = 0;
    }
  }

  updateCoins(delta) {
    const speedDistance = this.gameSpeed * delta;
    const playerPos = this.player.mesh.position;
    const playerRadius = this.player.radius;
    
    for (let i = this.coinsList.length - 1; i >= 0; i--) {
      const c = this.coinsList[i];
      
      // Move coin towards the player
      c.mesh.position.z += this.gameSpeed * delta;
      
      // Spin the octahedron
      c.mesh.rotation.y += c.spinSpeed * delta;
      c.mesh.rotation.x += c.spinSpeed * 0.5 * delta;
      
      // Remove coins scrolled past
      if (c.mesh.position.z > 20) {
        this.scene.remove(c.mesh);
        this.coinsList.splice(i, 1);
        continue;
      }
      
      // Power-up Magnet attraction logic: pull coins towards player if magnet is active
      if (this.powerups.magnet.active && !c.collected) {
        const dist = c.mesh.position.distanceTo(playerPos);
        if (dist < 18) {
          // Move towards player location using interpolation
          c.mesh.position.lerp(playerPos, 15 * delta);
        }
      }
      
      // Check collision/pick
      const coinZ = c.mesh.position.z;
      const coinX = c.mesh.position.x;
      const coinY = c.mesh.position.y;
      
      const dist = c.mesh.position.distanceTo(playerPos);
      
      // Bounding check distance
      if (dist < 1.4 && !c.collected) {
        c.collected = true;
        this.scene.remove(c.mesh);
        
        if (c.isPowerup) {
          // Collect powerup
          this.activatePowerup(c.powerupType);
          this.spawnCollectEffect(coinX, coinY, coinZ, 0x00ffff);
        } else {
          // Collect regular coin
          this.coins += 1;
          this.score += 50 * this.multiplier;
          
          audio.playCoinSFX();
          this.spawnCollectEffect(coinX, coinY, coinZ, 0xffd700);
        }
        
        this.coinsList.splice(i, 1);
      }
    }
  }

  activatePowerup(type) {
    audio.playTone(600, 'sine', 0.2, 0.05, audio.currentTime);
    audio.playTone(800, 'sine', 0.25, 0.05, audio.currentTime + 0.1);
    
    if (type === 'magnet') {
      this.powerups.magnet.active = true;
      this.powerups.magnet.duration = 10; // 10 seconds
      this.powerups.magnet.timer = 10;
    }
  }

  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;
      
      if (p.age >= p.maxAge) {
        this.scene.remove(p.points);
        this.particles.splice(i, 1);
        continue;
      }
      
      // Update particle positions based on speed
      const posAttr = p.points.geometry.attributes.position;
      const positions = posAttr.array;
      
      for (let j = 0; j < positions.length / 3; j++) {
        const idx = j * 3;
        // Apply velocity vectors
        positions[idx] += p.velocities[idx] * delta;
        positions[idx + 1] += p.velocities[idx + 1] * delta;
        positions[idx + 2] += p.velocities[idx + 2] * delta;
        
        // Gravity pulling particles down
        p.velocities[idx + 1] -= 9.8 * delta;
      }
      
      posAttr.needsUpdate = true;
      // Fade out opacity
      p.points.material.opacity = 1.0 - (p.age / p.maxAge);
    }
  }

  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(this.width, this.height);
  }

  // Persistence details (localStorage)
  loadGameData() {
    // High scores
    const savedScores = localStorage.getItem('neon_runner_highscores');
    if (savedScores) {
      this.highScores = JSON.parse(savedScores);
    } else {
      this.highScores = [
        { name: 'NEON_RUNNER', score: 10000 },
        { name: 'CYBER_PUNK', score: 5000 },
        { name: 'RETRO_RIDER', score: 2500 }
      ];
      this.saveHighScores();
    }
    
    // Coins
    const savedCoins = localStorage.getItem('neon_runner_coins');
    this.coins = savedCoins ? parseInt(savedCoins) : 0;
    
    // Purchased Boards
    const savedBoards = localStorage.getItem('neon_runner_boards');
    this.ownedBoards = savedBoards ? JSON.parse(savedBoards) : ['neon'];
    
    // Active equipped board
    const equipped = localStorage.getItem('neon_runner_equipped');
    if (equipped) {
      this.equipBoard(equipped);
    }
    
    this.updateSidebarUI();
  }

  saveGameData() {
    localStorage.setItem('neon_runner_coins', this.coins);
    
    // Save score if it registers in Top 3
    const finalScore = Math.floor(this.score);
    if (finalScore > 0) {
      const isNewHighScore = this.highScores.some(hs => finalScore > hs.score) || this.highScores.length < 3;
      if (isNewHighScore) {
        this.highScores.push({ name: 'PLAYER_1', score: finalScore });
        // Sort descending
        this.highScores.sort((a, b) => b.score - a.score);
        // Limit to top 3
        this.highScores = this.highScores.slice(0, 3);
        this.saveHighScores();
      }
    }
    
    this.updateSidebarUI();
  }

  saveHighScores() {
    localStorage.setItem('neon_runner_highscores', JSON.stringify(this.highScores));
  }

  // Shop & customization mechanisms
  buyBoard(boardId, cost) {
    if (this.coins >= cost && !this.ownedBoards.includes(boardId)) {
      this.coins -= cost;
      this.ownedBoards.push(boardId);
      localStorage.setItem('neon_runner_boards', JSON.stringify(this.ownedBoards));
      localStorage.setItem('neon_runner_coins', this.coins);
      this.equipBoard(boardId);
      audio.playTone(880, 'sine', 0.3, 0.05, this.renderer.context.currentTime); // Purchase chime
      this.updateSidebarUI();
      return true;
    }
    return false;
  }

  equipBoard(boardId) {
    localStorage.setItem('neon_runner_equipped', boardId);
    let color = 0x00ff66; // default
    if (boardId === 'cyber') color = 0xbd00ff;
    if (boardId === 'magma') color = 0xff003c;
    if (boardId === 'gold') color = 0xffd700;
    
    this.updateBoardColor(color);
  }

  updateSidebarUI() {
    // 1. High Score list UI render
    const scoreList = document.getElementById('high-scores-list');
    if (scoreList) {
      scoreList.innerHTML = this.highScores.map((hs, i) => {
        let medal = '';
        if (i === 0) medal = '🥇 ';
        if (i === 1) medal = '🥈 ';
        if (i === 2) medal = '🥉 ';
        return `
          <li>
            <span class="rank">${medal}${i+1}.</span> 
            <span class="player-name">${hs.name}</span> 
            <span class="score-val">${hs.score.toLocaleString()}</span>
          </li>
        `;
      }).join('');
    }
    
    // 2. Render Shop Items lock/unlock states
    const items = ['neon', 'cyber', 'magma', 'gold'];
    const equipped = localStorage.getItem('neon_runner_equipped') || 'neon';
    
    items.forEach(id => {
      const itemEl = document.getElementById(`board-${id}`);
      if (!itemEl) return;
      
      itemEl.className = 'shop-item'; // reset
      
      const statusEl = itemEl.querySelector('.board-status');
      
      if (equipped === id) {
        itemEl.classList.add('active');
        if (statusEl) statusEl.textContent = 'Equipped';
      } else if (this.ownedBoards.includes(id)) {
        if (statusEl) statusEl.textContent = 'Owned';
      } else {
        itemEl.classList.add('locked');
        const cost = itemEl.getAttribute('data-cost');
        if (statusEl) statusEl.textContent = `${cost} Coins`;
      }
    });
    
    // Update hud and header panels with details
    const hudCoins = document.getElementById('hud-coins');
    if (hudCoins) hudCoins.textContent = this.coins;
  }
}

export const game = new GameEngine();
