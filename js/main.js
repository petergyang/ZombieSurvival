import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
// Comment out the background color to allow the skybox to be visible
// scene.background = new THREE.Color(0x001a33); // Dark night sky
// Remove fog to improve visibility of stars and moon
// scene.fog = new THREE.FogExp2(0x001a33, 0.008); // Reduced fog density from 0.015 to 0.008

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Create skybox with stars and moon
function createSkybox() {
    // Create a large sphere for the skybox
    const skyboxRadius = 500;
    const skyboxGeometry = new THREE.SphereGeometry(skyboxRadius, 32, 32);
    const skyboxMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000, // Pure black
        side: THREE.BackSide // Render on the inside of the sphere
    });
    
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox);
    
    // Create stars
    const starsCount = 2000;
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    
    for (let i = 0; i < starsCount; i++) {
        // Generate random positions on the sphere
        const theta = Math.random() * Math.PI * 2; // Azimuthal angle
        const phi = Math.acos(2 * Math.random() - 1); // Polar angle
        const radius = skyboxRadius * 0.9; // Slightly smaller than skybox
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        starPositions.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    
    // Create star material with custom shader
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff, // Pure white
        size: 2.0, // Fixed size for all stars
        transparent: true,
        opacity: 1.0,
        sizeAttenuation: true,
        depthWrite: true, // Enable depth writing so stars are occluded by objects
        depthTest: true // Enable depth testing so stars aren't visible through objects
    });
    
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    
    // Create moon
    const moonRadius = 15;
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffdd // Slightly warmer white
    });
    
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // Position the moon in the sky
    const moonDistance = skyboxRadius * 0.9;
    moon.position.set(
        moonDistance * 0.5,  // x
        moonDistance * 0.7,  // y - higher in the sky
        -moonDistance * 0.3  // z - slightly in front
    );
    
    scene.add(moon);
    
    // Create a stronger glow around the moon
    const moonGlowGeometry = new THREE.SphereGeometry(moonRadius * 1.8, 32, 32); // Increased from 1.5 to 1.8
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffee,
        transparent: true,
        opacity: 0.6, // Increased from 0.4 to 0.6
        side: THREE.BackSide
    });
    
    const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    moon.add(moonGlow);
    
    // Add a second, larger glow for more light spread
    const moonOuterGlowGeometry = new THREE.SphereGeometry(moonRadius * 3.0, 32, 32);
    const moonOuterGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffee,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    
    const moonOuterGlow = new THREE.Mesh(moonOuterGlowGeometry, moonOuterGlowMaterial);
    moon.add(moonOuterGlow);
    
    // Return skybox elements for later reference
    return {
        skybox: skybox,
        stars: stars,
        moon: moon
    };
}

// Create the skybox and celestial objects
const skyboxElements = createSkybox();

// First-person controls
const moveSpeed = 0.1;
const mouseSensitivity = 0.002;
const playerHeight = 2;

// Player state
const player = {
    position: new THREE.Vector3(0, 1.7, 0),
    rotation: {
        horizontal: 0,
        vertical: 0
    },
    onGround: true,
    isShooting: false,
    lastShootTime: 0,
    shootCooldown: 300, // milliseconds between shots
    mouseDown: false,
    score: 0, // Track player score
    health: 100, // Player health
    maxHealth: 100,
    lastDamageTime: 0,
    damageCooldown: 1000, // 1 second invulnerability after taking damage
    isGameOver: false,
    // Weapon system
    currentWeapon: 'pistol', // 'pistol', 'shotgun', or 'machinegun'
    shotgunAmmo: 0,
    machinegunAmmo: 0
};

// Collision system for buildings
const collisionBoundaries = [];
const playerCollisionRadius = 0.5; // Player collision radius
const zombieCollisionRadius = 0.8; // Zombie collision radius

// Input state
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    z: false, // Add Z key for wave skipping
    p: false // Add P key for pausing
};
let isPointerLocked = false;

// Bullet system
const bullets = [];
const bulletSpeed = 1.0;
const bulletLifetime = 2000; // milliseconds
const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
// Larger bullet for machine gun
const machinegunBulletGeometry = new THREE.SphereGeometry(0.08, 8, 8);

// Zombie system
const zombies = [];
const zombieSpeed = 0.03;
const zombieSpawnInterval = 5000; // milliseconds between zombie spawns
let lastZombieSpawnTime = 0;
const maxZombies = 20; // Maximum number of zombies in the scene
const zombieDetectionRange = 30; // How far zombies can detect the player

// Wave system
const waveSystem = {
    currentWave: 1,
    maxWaves: 5,
    zombiesPerWave: [6, 10, 14, 20, 1], // Doubled zombies per wave (was [3, 5, 7, 10, 1])
    zombiesRemaining: 6, // Start with 6 zombies in wave 1 (was 3)
    isWaveInProgress: false,
    isWaveTransition: false,
    transitionTimeRemaining: 0,
    transitionDuration: 0, // No countdown between waves
    lastTransitionUpdateTime: 0
};

// Blood effect particles
const bloodParticles = [];
const bloodGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const bloodMaterial = new THREE.MeshBasicMaterial({ color: 0xcc0000 });

// Add game state variable for pause
let isPaused = false;

// Create weapon models
function createPistol() {
    const gunGroup = new THREE.Group();
    
    // Gun barrel
    const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.z = -0.5;
    gunGroup.add(barrel);
    
    // Gun handle
    const handleGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.2;
    handle.position.z = -0.3;
    gunGroup.add(handle);
    
    // Gun body
    const bodyGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.z = -0.3;
    gunGroup.add(body);
    
    gunGroup.userData = { type: 'pistol' };
    return gunGroup;
}

function createShotgun() {
    const gunGroup = new THREE.Group();
    
    // Shotgun barrel (longer and wider)
    const barrelGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.7);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.z = -0.6;
    gunGroup.add(barrel);
    
    // Shotgun handle
    const handleGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.2;
    handle.position.z = -0.3;
    gunGroup.add(handle);
    
    // Shotgun body (wider)
    const bodyGeometry = new THREE.BoxGeometry(0.25, 0.2, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.z = -0.3;
    gunGroup.add(body);
    
    // Shotgun pump
    const pumpGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.1);
    const pumpMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
    pump.position.z = -0.5;
    pump.position.y = -0.1;
    gunGroup.add(pump);
    
    gunGroup.userData = { type: 'shotgun' };
    return gunGroup;
}

function createMachineGun() {
    const gunGroup = new THREE.Group();
    
    // Machine gun barrel (longer)
    const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.z = -0.7;
    gunGroup.add(barrel);
    
    // Machine gun handle
    const handleGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.2;
    handle.position.z = -0.3;
    gunGroup.add(handle);
    
    // Machine gun body
    const bodyGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.z = -0.4;
    gunGroup.add(body);
    
    // Machine gun magazine
    const magGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const magMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const mag = new THREE.Mesh(magGeometry, magMaterial);
    mag.position.y = -0.3;
    mag.position.z = -0.4;
    gunGroup.add(mag);
    
    gunGroup.userData = { type: 'machinegun' };
    return gunGroup;
}

// Function to create a bullet
function createBullet() {
    // Use different bullet geometry based on weapon
    const geometry = player.currentWeapon === 'machinegun' ? machinegunBulletGeometry : bulletGeometry;
    const bullet = new THREE.Mesh(geometry, bulletMaterial);
    
    // Set bullet position to gun barrel position
    const bulletPosition = new THREE.Vector3(0, 0, -1);
    bulletPosition.applyMatrix4(gun.matrixWorld);
    bullet.position.copy(bulletPosition);
    
    // Set bullet direction based on camera direction
    const bulletDirection = new THREE.Vector3(0, 0, -1);
    bulletDirection.applyQuaternion(camera.quaternion);
    bulletDirection.normalize();
    
    // Add slight randomness for shotgun
    if (player.currentWeapon === 'shotgun') {
        bulletDirection.x += (Math.random() - 0.5) * 0.1;
        bulletDirection.y += (Math.random() - 0.5) * 0.1;
        bulletDirection.normalize();
    }
    
    bullet.userData = {
        velocity: bulletDirection.multiplyScalar(bulletSpeed),
        createdAt: Date.now(),
        damage: player.currentWeapon === 'machinegun' ? 40 : 100 // Shotgun and pistol kill in one hit
    };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    // Create muzzle flash light
    createMuzzleFlashLight(bulletPosition);
    
    return bullet;
}

// Create a temporary light for muzzle flash
function createMuzzleFlashLight(position) {
    const light = new THREE.PointLight(0xffff00, 2, 10);
    light.position.copy(position);
    scene.add(light);
    
    // Remove light after short delay
    setTimeout(() => {
        scene.remove(light);
    }, 100);
}

// Create blood particles
function createBloodEffect(position) {
    for (let i = 0; i < 10; i++) {
        const particle = new THREE.Mesh(bloodGeometry, bloodMaterial);
        particle.position.copy(position);
        
        // Random velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        
        particle.userData = {
            velocity: velocity,
            createdAt: Date.now(),
            lifetime: 1000 + Math.random() * 1000
        };
        
        scene.add(particle);
        bloodParticles.push(particle);
    }
}

// Update blood particles
function updateBloodParticles() {
    const now = Date.now();
    
    for (let i = bloodParticles.length - 1; i >= 0; i--) {
        const particle = bloodParticles[i];
        
        // Apply gravity
        particle.userData.velocity.y -= 0.005;
        
        // Move particle
        particle.position.add(particle.userData.velocity);
        
        // Remove old particles
        if (now - particle.userData.createdAt > particle.userData.lifetime) {
            scene.remove(particle);
            bloodParticles.splice(i, 1);
        }
    }
}

// Function to update bullets
function updateBullets() {
    const now = Date.now();
    
    // Update bullet positions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet
        bullet.position.add(bullet.userData.velocity);
        
        // Remove old bullets
        if (now - bullet.userData.createdAt > bulletLifetime) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

// Create weapon pickup
function createWeaponPickup(type, x, z) {
    const pickup = new THREE.Group();
    
    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: type === 'shotgun' ? 0xff0000 : 0x0000ff,
        emissive: type === 'shotgun' ? 0x500000 : 0x000050,
        emissiveIntensity: 0.5
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    pickup.add(base);
    
    // Add the weapon model
    let weaponModel;
    if (type === 'shotgun') {
        weaponModel = createShotgun();
    } else {
        weaponModel = createMachineGun();
    }
    
    weaponModel.scale.set(0.8, 0.8, 0.8);
    weaponModel.position.y = 0.3;
    weaponModel.rotation.x = -Math.PI / 2;
    pickup.add(weaponModel);
    
    // Add a point light
    const light = new THREE.PointLight(
        type === 'shotgun' ? 0xff5555 : 0x5555ff,
        0.7,
        3
    );
    light.position.y = 0.5;
    pickup.add(light);
    
    pickup.position.set(x, 0.5, z);
    pickup.userData = {
        type: 'weaponPickup',
        weaponType: type,
        bobOffset: Math.random() * Math.PI * 2
    };
    
    scene.add(pickup);
    return pickup;
}

// Add flashlight to camera
const flashlight = new THREE.SpotLight(0xffffee, 10, 50, Math.PI / 8, 0.3, 1);
// Position the flashlight at the camera position (not attached to camera)
flashlight.position.copy(camera.position);
scene.add(flashlight);
// Create a target object for the flashlight
const flashlightTarget = new THREE.Object3D();
scene.add(flashlightTarget);
flashlight.target = flashlightTarget;

// Create a raycaster for flashlight distance detection
const flashlightRaycaster = new THREE.Raycaster();
// Default angle values for the flashlight
const flashlightMinAngle = Math.PI / 32; // Much narrower beam for far objects (5.625 degrees)
const flashlightMaxAngle = Math.PI / 4;  // Wider beam for close objects (45 degrees)
const flashlightMinDistance = 1.5;       // Distance at which beam is widest
const flashlightMaxDistance = 30;        // Distance at which beam is narrowest

// Enable shadows for the flashlight
flashlight.castShadow = true;
flashlight.shadow.mapSize.width = 1024;
flashlight.shadow.mapSize.height = 1024;
flashlight.shadow.camera.near = 0.5;
flashlight.shadow.camera.far = 30;
flashlight.shadow.bias = -0.0001;

// Add a subtle point light at the player position for better visibility
const playerLight = new THREE.PointLight(0xffffee, 0.5, 5);
playerLight.position.set(0, 0, 0);
camera.add(playerLight);

// Add gun to camera
let gun = createPistol();
gun.position.set(0.3, -0.3, -0.5);
camera.add(gun);
scene.add(camera); // Make sure camera is added to scene

// Gun animation properties
const gunDefaultPosition = new THREE.Vector3(0.3, -0.3, -0.5);
const gunRecoilPosition = new THREE.Vector3(0.3, -0.25, -0.4);
const gunRecoilDuration = 100; // milliseconds
let gunAnimationStartTime = 0;

// Muzzle flash
const muzzleFlashGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
const muzzleFlashMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffff00,
    transparent: true,
    opacity: 0
});
const muzzleFlash = new THREE.Mesh(muzzleFlashGeometry, muzzleFlashMaterial);
muzzleFlash.position.set(0, 0, -0.8);
muzzleFlash.rotation.x = Math.PI / 2;
gun.add(muzzleFlash);

// Lighting
const moonLight = new THREE.DirectionalLight(0x8aa7cf, 0.5); // Soft blue moonlight
moonLight.position.set(50, 100, 50);
moonLight.castShadow = true;
moonLight.shadow.camera.far = 300;
moonLight.shadow.camera.left = -50;
moonLight.shadow.camera.right = 50;
moonLight.shadow.camera.top = 50;
moonLight.shadow.camera.bottom = -50;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
scene.add(moonLight);

const ambientLight = new THREE.AmbientLight(0x152238, 0.3); // Dark blue ambient light
scene.add(ambientLight);

// Add some stars
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1
});

const starVertices = [];
for (let i = 0; i < 5000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = Math.random() * 1000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
}

starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Ground with grass texture
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a472a, // Dark grass color
    roughness: 0.8,
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Function to create a tree
function createTree(x, z) {
    const tree = new THREE.Group();
    
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2f1b });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    
    // Tree top (multiple layers of cones)
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x0a4b0a });
    for (let i = 0; i < 3; i++) {
        const coneGeometry = new THREE.ConeGeometry(1.5 - i * 0.3, 2, 8);
        const cone = new THREE.Mesh(coneGeometry, leafMaterial);
        cone.position.y = 2 + i * 1.2;
        cone.castShadow = true;
        cone.receiveShadow = true;
        tree.add(cone);
    }
    
    tree.add(trunk);
    tree.position.set(x, 0, z);
    return tree;
}

// Helper function to create a window light
function createWindowLight(position, color = 0xffffaa, intensity = 0.5, distance = 3) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.copy(position);
    return light;
}

// Function to create a house
function createHouse(x, z) {
    const house = new THREE.Group();
    
    // Main structure
    const baseGeometry = new THREE.BoxGeometry(10, 5, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xA0522D, // Brown
        roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    house.add(base);
    
    // Roof
    const roofGeometry = new THREE.ConeGeometry(7.5, 4, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Darker brown
        roughness: 0.9
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 4.5;
    roof.rotation.y = Math.PI / 4; // Rotate 45 degrees
    roof.castShadow = true;
    house.add(roof);
    
    // Door
    const doorGeometry = new THREE.BoxGeometry(1.5, 3, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Dark brown
        roughness: 0.8
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, -1, 4.1);
    house.add(door);
    
    // Windows
    const windowGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.1);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffff99,
        emissive: 0x666633,
        emissiveIntensity: 1.0 // Changed from 5.0 to 1.0 for more subtle glow
    });
    
    // Front windows
    const frontWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow1.position.set(-3, 1, 4.1);
    house.add(frontWindow1);
    
    // Add light inside front window 1
    const frontWindowLight1 = createWindowLight(
        new THREE.Vector3(-3, 1, 3.5), // Position light inside the window
        0xffffaa, // Warm yellow light
        0.5,      // Low intensity
        3         // Short distance
    );
    house.add(frontWindowLight1);
    
    const frontWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow2.position.set(3, 1, 4.1);
    house.add(frontWindow2);
    
    // Add light inside front window 2
    const frontWindowLight2 = createWindowLight(
        new THREE.Vector3(3, 1, 3.5),
        0xffffaa,
        0.5,
        3
    );
    house.add(frontWindowLight2);
    
    // Side windows
    const sideWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
    sideWindow1.position.set(-5.1, 1, 0);
    sideWindow1.rotation.y = Math.PI / 2;
    house.add(sideWindow1);
    
    // Add light inside side window 1
    const sideWindowLight1 = createWindowLight(
        new THREE.Vector3(-4.5, 1, 0),
        0xffffaa,
        0.5,
        3
    );
    house.add(sideWindowLight1);
    
    const sideWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
    sideWindow2.position.set(5.1, 1, 0);
    sideWindow2.rotation.y = Math.PI / 2;
    house.add(sideWindow2);
    
    // Add light inside side window 2
    const sideWindowLight2 = createWindowLight(
        new THREE.Vector3(4.5, 1, 0),
        0xffffaa,
        0.5,
        3
    );
    house.add(sideWindowLight2);
    
    house.position.set(x, 2.5, z);
    
    // Add collision boundary
    collisionBoundaries.push({
        type: 'house',
        minX: x - 5,
        maxX: x + 5,
        minZ: z - 4,
        maxZ: z + 4
    });
    
    return house;
}

// Function to create a cottage (smaller house variant)
function createCottage(x, z) {
    const cottage = new THREE.Group();
    
    // Main structure
    const baseGeometry = new THREE.BoxGeometry(8, 4, 6);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xE5DCC7, // Light tan
        roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    cottage.add(base);
    
    // Roof
    const roofGeometry = new THREE.ConeGeometry(6, 3, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Dark brown
        roughness: 0.9
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 3.5;
    roof.rotation.y = Math.PI / 4; // Rotate 45 degrees
    roof.castShadow = true;
    cottage.add(roof);
    
    // Door
    const doorGeometry = new THREE.BoxGeometry(1.2, 2.5, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Dark brown
        roughness: 0.8
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, -0.75, 3.1);
    cottage.add(door);
    
    // Windows
    const windowGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.1);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffff99,
        emissive: 0x666633,
        emissiveIntensity: 1.0 // Changed from 5.0 to 1.0 for more subtle glow
    });
    
    // Front windows
    const frontWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow1.position.set(-2, 0.5, 3.1);
    cottage.add(frontWindow1);
    
    // Add light inside front window 1
    const frontWindowLight1 = createWindowLight(
        new THREE.Vector3(-2, 0.5, 2.5),
        0xffffaa,
        0.5,
        3
    );
    cottage.add(frontWindowLight1);
    
    const frontWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow2.position.set(2, 0.5, 3.1);
    cottage.add(frontWindow2);
    
    // Add light inside front window 2
    const frontWindowLight2 = createWindowLight(
        new THREE.Vector3(2, 0.5, 2.5),
        0xffffaa,
        0.5,
        3
    );
    cottage.add(frontWindowLight2);
    
    cottage.position.set(x, 2, z);
    
    // Add collision boundary
    collisionBoundaries.push({
        type: 'cottage',
        minX: x - 4,
        maxX: x + 4,
        minZ: z - 3,
        maxZ: z + 3
    });
    
    return cottage;
}

// Function to create a barn
function createBarn(x, z) {
    const barn = new THREE.Group();
    
    // Main structure
    const baseGeometry = new THREE.BoxGeometry(12, 8, 10);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xA52A2A, // Red-brown
        roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    barn.add(base);
    
    // Roof
    const roofGeometry = new THREE.CylinderGeometry(0.1, 6, 4, 4, 1, false, 0, Math.PI);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Dark brown
        roughness: 0.9
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 6;
    roof.rotation.x = Math.PI / 2;
    roof.rotation.y = Math.PI / 4; // Rotate 45 degrees
    roof.castShadow = true;
    barn.add(roof);
    
    // Door
    const doorGeometry = new THREE.BoxGeometry(4, 6, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Dark brown
        roughness: 0.8
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, -1, 5.1);
    barn.add(door);
    
    barn.position.set(x, 4, z);
    
    // Add collision boundary
    collisionBoundaries.push({
        type: 'barn',
        minX: x - 6,
        maxX: x + 6,
        minZ: z - 5,
        maxZ: z + 5
    });
    
    return barn;
}

// Function to create a well
function createWell(x, z) {
    const well = new THREE.Group();
    
    // Well base
    const baseGeometry = new THREE.CylinderGeometry(2, 2, 1, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    well.add(base);
    
    // Well wall
    const wallGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    well.add(wall);
    
    // Well roof supports
    const supportGeometry = new THREE.BoxGeometry(0.3, 3, 0.3);
    const supportMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    
    const support1 = new THREE.Mesh(supportGeometry, supportMaterial);
    support1.position.set(1.5, 2.5, 0);
    well.add(support1);
    
    const support2 = new THREE.Mesh(supportGeometry, supportMaterial);
    support2.position.set(-1.5, 2.5, 0);
    well.add(support2);
    
    // Well roof
    const roofGeometry = new THREE.ConeGeometry(2.5, 1.5, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 4.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    roof.receiveShadow = true;
    well.add(roof);
    
    well.position.set(x, 0, z);
    return well;
}

// Function to create a fence section
function createFenceSection(x, z, rotation) {
    const fence = new THREE.Group();
    
    // Posts
    const postGeometry = new THREE.BoxGeometry(0.3, 2, 0.3);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    
    const post1 = new THREE.Mesh(postGeometry, postMaterial);
    post1.position.set(-1, 1, 0);
    post1.castShadow = true;
    post1.receiveShadow = true;
    fence.add(post1);
    
    const post2 = new THREE.Mesh(postGeometry, postMaterial);
    post2.position.set(1, 1, 0);
    post2.castShadow = true;
    post2.receiveShadow = true;
    fence.add(post2);
    
    // Rails
    const railGeometry = new THREE.BoxGeometry(2.3, 0.2, 0.1);
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0xa0522d });
    
    const rail1 = new THREE.Mesh(railGeometry, railMaterial);
    rail1.position.set(0, 0.5, 0);
    rail1.castShadow = true;
    rail1.receiveShadow = true;
    fence.add(rail1);
    
    const rail2 = new THREE.Mesh(railGeometry, railMaterial);
    rail2.position.set(0, 1.5, 0);
    rail2.castShadow = true;
    rail2.receiveShadow = true;
    fence.add(rail2);
    
    fence.position.set(x, 0, z);
    fence.rotation.y = rotation;
    return fence;
}

// Function to create a path section
function createPathSection(x, z, width, length, rotation) {
    const path = new THREE.Group();
    
    // Path surface
    const pathGeometry = new THREE.PlaneGeometry(width, length);
    const pathMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xd2b48c,
        roughness: 1.0,
        side: THREE.DoubleSide
    });
    const pathSurface = new THREE.Mesh(pathGeometry, pathMaterial);
    pathSurface.rotation.x = -Math.PI / 2;
    pathSurface.position.y = 0.05; // Slightly above ground to prevent z-fighting
    pathSurface.receiveShadow = true;
    path.add(pathSurface);
    
    path.position.set(x, 0, z);
    path.rotation.y = rotation;
    return path;
}

// Function to create a farm plot
function createFarmPlot(x, z, width, length) {
    const farm = new THREE.Group();
    
    // Soil
    const soilGeometry = new THREE.BoxGeometry(width, 0.2, length);
    const soilMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.position.y = 0.1;
    soil.receiveShadow = true;
    farm.add(soil);
    
    // Crops (simple green blocks)
    const cropGeometry = new THREE.BoxGeometry(0.3, 0.5, 0.3);
    const cropMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    
    // Add crops in rows
    for (let i = -width/2 + 1; i < width/2; i += 1) {
        for (let j = -length/2 + 1; j < length/2; j += 1) {
            if (Math.random() > 0.3) { // Random gaps
                const crop = new THREE.Mesh(cropGeometry, cropMaterial);
                crop.position.set(i, 0.4, j);
                crop.castShadow = true;
                crop.receiveShadow = true;
                farm.add(crop);
            }
        }
    }
    
    farm.position.set(x, 0, z);
    return farm;
}

// Function to create a decorative building
function createBuilding(x, z, width, height, depth) {
    const building = new THREE.Group();
    
    // Main structure
    const baseGeometry = new THREE.BoxGeometry(width, height, depth);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    building.add(base);
    
    // Add some windows
    const windowSize = 1;
    const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, 0.1);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffff99,
        emissive: 0x666633,
        emissiveIntensity: 1.0 // Changed from 5.0 to 1.0 for more subtle glow
    });
    
    // Create a grid of windows
    for (let y = 1; y < height - 1; y += 2) {
        for (let x = -width/3; x <= width/3; x += 2) {
            // Front window
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(x, y, depth/2 + 0.1);
            building.add(window);
            
            // Add light inside front window
            const windowLight = createWindowLight(
                new THREE.Vector3(x, y, depth/2 - 0.5),
                0xffffaa,
                0.5,
                3
            );
            building.add(windowLight);
            
            // Back window
            const windowBack = window.clone();
            windowBack.position.z = -depth/2 - 0.1;
            building.add(windowBack);
            
            // Add light inside back window
            const windowBackLight = createWindowLight(
                new THREE.Vector3(x, y, -depth/2 + 0.5),
                0xffffaa,
                0.5,
                3
            );
            building.add(windowBackLight);
        }
    }
    
    building.position.set(x, height/2, z);
    
    // Add collision boundary
    collisionBoundaries.push({
        type: 'building',
        minX: x - width/2,
        maxX: x + width/2,
        minZ: z - depth/2,
        maxZ: z + depth/2
    });
    
    return building;
}

// Add trees around the scene
const trees = [];
for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2;
    const radius = 30 + Math.random() * 20;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const tree = createTree(x, z);
    trees.push(tree);
    scene.add(tree);
}

// Create main house
const mainHouse = createHouse(0, -15);
scene.add(mainHouse);

// Create some buildings
const buildings = [
    createBuilding(-30, -30, 10, 20, 10),
    createBuilding(30, 30, 15, 25, 15),
    createBuilding(-25, 25, 12, 18, 12)
];

buildings.forEach(building => scene.add(building));

// Clear existing scene elements
// Remove existing trees and buildings
trees.forEach(tree => scene.remove(tree));
trees.length = 0;
buildings.forEach(building => scene.remove(building));
buildings.length = 0;
scene.remove(mainHouse);

// Create village layout
// Central village square
const villageCenter = createWell(0, 0);
scene.add(villageCenter);

// Main path through village
const mainPath = createPathSection(0, 0, 6, 60, 0);
scene.add(mainPath);
const crossPath = createPathSection(0, 0, 6, 60, Math.PI/2);
scene.add(crossPath);

// Houses around the village
const houses = [
    createHouse(-15, -12),
    createHouse(15, -15),
    createHouse(-18, 15),
    createHouse(20, 12),
    createCottage(-10, 8),
    createCottage(12, -5),
    createCottage(-8, -20),
    createCottage(8, 20)
];
houses.forEach(house => scene.add(house));

// Add a barn
const barn = createBarn(-25, -25);
scene.add(barn);

// Farm plots
const farms = [
    createFarmPlot(-25, 0, 10, 15),
    createFarmPlot(25, 0, 10, 15)
];
farms.forEach(farm => scene.add(farm));

// Add fences around farms
for (let i = 0; i < 5; i++) {
    const fence1 = createFenceSection(-30 + i*2.3, -8, 0);
    scene.add(fence1);
    const fence2 = createFenceSection(-30 + i*2.3, 8, 0);
    scene.add(fence2);
    const fence3 = createFenceSection(20 + i*2.3, -8, 0);
    scene.add(fence3);
    const fence4 = createFenceSection(20 + i*2.3, 8, 0);
    scene.add(fence4);
}

for (let i = 0; i < 4; i++) {
    const fence1 = createFenceSection(-30, -6 + i*2.3, Math.PI/2);
    scene.add(fence1);
    const fence2 = createFenceSection(-20, -6 + i*2.3, Math.PI/2);
    scene.add(fence2);
    const fence3 = createFenceSection(30, -6 + i*2.3, Math.PI/2);
    scene.add(fence3);
    const fence4 = createFenceSection(20, -6 + i*2.3, Math.PI/2);
    scene.add(fence4);
}

// Add trees around the village (fewer trees, more spread out)
for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const radius = 40 + Math.random() * 15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const tree = createTree(x, z);
    trees.push(tree);
    scene.add(tree);
}

// Add some random trees within the village
for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 50;
    const z = (Math.random() - 0.5) * 50;
    // Don't place trees too close to the center
    if (Math.sqrt(x*x + z*z) > 8) {
        const tree = createTree(x, z);
        trees.push(tree);
        scene.add(tree);
    }
}

// Event Listeners for movement
document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    // Handle all keys in one place
    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
});

document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    }
});

// Mouse look controls
document.addEventListener('click', () => {
    if (!isPointerLocked) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Left mouse button
        player.mouseDown = true;
    }
});

document.addEventListener('mouseup', (event) => {
    if (event.button === 0) { // Left mouse button
        player.mouseDown = false;
    }
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
    if (!isPointerLocked) {
        player.mouseDown = false; // Reset mouse state when pointer lock is exited
    }
});

document.addEventListener('mousemove', (event) => {
    if (isPointerLocked) {
        // Update player rotation - horizontal movement (left/right)
        player.rotation.horizontal -= event.movementX * mouseSensitivity;
        
        // Update player rotation - vertical movement (up/down)
        // Negative sign removed to fix inverted controls
        player.rotation.vertical -= event.movementY * mouseSensitivity;
        
        // Limit vertical rotation to prevent over-rotation
        player.rotation.vertical = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, player.rotation.vertical));
    }
});

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update gun animation
function updateGunAnimation() {
    const now = Date.now();
    
    if (player.isShooting) {
        const elapsed = now - gunAnimationStartTime;
        
        if (elapsed < gunRecoilDuration) {
            // Recoil animation
            const t = elapsed / gunRecoilDuration;
            gun.position.lerpVectors(gunRecoilPosition, gunDefaultPosition, t);
            
            // Muzzle flash fade out
            muzzleFlashMaterial.opacity = 1 - t;
        } else {
            // Animation complete
            gun.position.copy(gunDefaultPosition);
            player.isShooting = false;
            muzzleFlashMaterial.opacity = 0;
        }
    }
}

// Handle shooting
function handleShooting() {
    const now = Date.now();
    
    // Different cooldowns based on weapon type
    const cooldown = player.currentWeapon === 'machinegun' ? 100 : 
                    (player.currentWeapon === 'shotgun' ? 600 : 300);
    
    if (player.mouseDown && !player.isShooting && now - player.lastShootTime > cooldown) {
        // Check ammo for special weapons
        if ((player.currentWeapon === 'shotgun' && player.shotgunAmmo <= 0) ||
            (player.currentWeapon === 'machinegun' && player.machinegunAmmo <= 0)) {
            // Switch back to pistol if out of ammo
            switchWeapon('pistol');
            return;
        }
        
        // Start shooting
        player.isShooting = true;
        player.lastShootTime = now;
        gunAnimationStartTime = now;
        
        // Move gun to recoil position
        gun.position.copy(gunRecoilPosition);
        
        // Show muzzle flash
        muzzleFlashMaterial.opacity = 1;
        
        // Create bullets based on weapon type
        if (player.currentWeapon === 'shotgun') {
            // Shotgun fires 3 bullets in a spread
            for (let i = 0; i < 3; i++) {
                createBullet();
            }
            player.shotgunAmmo--;
        } else if (player.currentWeapon === 'machinegun') {
            createBullet();
            player.machinegunAmmo--;
        } else {
            // Regular pistol
            createBullet();
        }
        
        // Update ammo display
        updateAmmoDisplay();
    }
}

// Function to switch weapons
function switchWeapon(weaponType) {
    // Remove current gun
    camera.remove(gun);
    
    // Create new gun based on type
    if (weaponType === 'shotgun') {
        gun = createShotgun();
    } else if (weaponType === 'machinegun') {
        gun = createMachineGun();
    } else {
        gun = createPistol();
    }
    
    // Set position and add to camera
    gun.position.copy(gunDefaultPosition);
    camera.add(gun);
    
    // Add muzzle flash to new gun
    muzzleFlash.position.set(0, 0, -0.8);
    if (weaponType === 'shotgun') {
        muzzleFlash.position.z = -1.0;
    } else if (weaponType === 'machinegun') {
        muzzleFlash.position.z = -1.1;
    }
    muzzleFlash.rotation.x = Math.PI / 2;
    gun.add(muzzleFlash);
    
    // Update player state
    player.currentWeapon = weaponType;
    
    // Update ammo display
    updateAmmoDisplay();
}

// Update player movement
function updateMovement() {
    if (!isPointerLocked) return;

    // Calculate movement direction
    const direction = new THREE.Vector3();
    
    if (keys.w) direction.z -= 1;
    if (keys.s) direction.z += 1;
    if (keys.a) direction.x -= 1;
    if (keys.d) direction.x += 1;
    
    if (direction.lengthSq() > 0) {
        direction.normalize();
        
        // Apply player rotation to movement direction
        const rotatedDirection = direction.clone();
        rotatedDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.horizontal);
        
        // Calculate intended position
        const newX = player.position.x + rotatedDirection.x * moveSpeed;
        const newZ = player.position.z + rotatedDirection.z * moveSpeed;
        
        // Check for collisions with buildings
        let canMove = true;
        for (const boundary of collisionBoundaries) {
            // Add a small buffer around the player (playerCollisionRadius)
            if (newX + playerCollisionRadius > boundary.minX && 
                newX - playerCollisionRadius < boundary.maxX && 
                newZ + playerCollisionRadius > boundary.minZ && 
                newZ - playerCollisionRadius < boundary.maxZ) {
                canMove = false;
                break;
            }
        }
        
        // Only move if no collision
        if (canMove) {
            player.position.x = newX;
            player.position.z = newZ;
        } else {
            // Try to slide along walls by checking X and Z movement separately
            // Try X movement only
            const newXOnly = player.position.x + rotatedDirection.x * moveSpeed;
            let canMoveX = true;
            
            for (const boundary of collisionBoundaries) {
                if (newXOnly + playerCollisionRadius > boundary.minX && 
                    newXOnly - playerCollisionRadius < boundary.maxX && 
                    player.position.z + playerCollisionRadius > boundary.minZ && 
                    player.position.z - playerCollisionRadius < boundary.maxZ) {
                    canMoveX = false;
                    break;
                }
            }
            
            if (canMoveX) {
                player.position.x = newXOnly;
            }
            
            // Try Z movement only
            const newZOnly = player.position.z + rotatedDirection.z * moveSpeed;
            let canMoveZ = true;
            
            for (const boundary of collisionBoundaries) {
                if (player.position.x + playerCollisionRadius > boundary.minX && 
                    player.position.x - playerCollisionRadius < boundary.maxX && 
                    newZOnly + playerCollisionRadius > boundary.minZ && 
                    newZOnly - playerCollisionRadius < boundary.maxZ) {
                    canMoveZ = false;
                    break;
                }
            }
            
            if (canMoveZ) {
                player.position.z = newZOnly;
            }
        }
    }
    
    // Update camera position
    camera.position.copy(player.position);
    
    // Apply rotations separately and in the correct order
    camera.rotation.order = 'YXZ'; // This is crucial for FPS controls
    camera.rotation.x = player.rotation.vertical;
    camera.rotation.y = player.rotation.horizontal;
    camera.rotation.z = 0; // Ensure no roll/tilt
}

// Function to check for weapon pickups
function checkWeaponPickups() {
    // Find all weapon pickups in the scene
    scene.children.forEach(child => {
        if (child.userData && child.userData.type === 'weaponPickup') {
            // Animate pickup (bob up and down, rotate)
            const time = Date.now() * 0.001;
            child.position.y = 0.5 + Math.sin(time + child.userData.bobOffset) * 0.2;
            child.rotation.y = time * 0.5;
            
            // Check distance to player
            const distance = child.position.distanceTo(new THREE.Vector3(
                player.position.x,
                0.5,
                player.position.z
            ));
            
            // If player is close enough, pick up the weapon
            if (distance < 1.5) {
                if (child.userData.weaponType === 'shotgun') {
                    player.shotgunAmmo = 100; // 100 shots (was 10)
                    switchWeapon('shotgun');
                } else if (child.userData.weaponType === 'machinegun') {
                    player.machinegunAmmo = 300; // 300 bullets (was 30)
                    switchWeapon('machinegun');
                }
                
                // Remove pickup from scene
                scene.remove(child);
                
                // Show pickup message
                showWaveMessage(`Picked up ${child.userData.weaponType}!`);
                setTimeout(hideWaveMessage, 1500);
            }
        }
    });
}

// Create ammo display
const ammoDisplay = document.createElement('div');
ammoDisplay.style.position = 'absolute';
ammoDisplay.style.bottom = '50px';
ammoDisplay.style.left = '20px';
ammoDisplay.style.color = 'white';
ammoDisplay.style.fontFamily = 'Arial, sans-serif';
ammoDisplay.style.fontSize = '20px';
ammoDisplay.style.fontWeight = 'bold';
ammoDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
ammoDisplay.innerHTML = 'Weapon: Pistol';
document.body.appendChild(ammoDisplay);

// Function to update ammo display
function updateAmmoDisplay() {
    let text = 'Weapon: ';
    
    if (player.currentWeapon === 'pistol') {
        text += 'Pistol (∞)';
    } else if (player.currentWeapon === 'shotgun') {
        text += `Shotgun (${player.shotgunAmmo})`;
    } else if (player.currentWeapon === 'machinegun') {
        text += `Machine Gun (${player.machinegunAmmo})`;
    }
    
    ammoDisplay.innerHTML = text;
}

// Function to create a zombie
function createZombie(x, z, isBoss = false) {
    const zombie = new THREE.Group();
    
    // Scale factor for boss - make it building-sized
    const scale = isBoss ? 10 : 1; // Increased from 2.5 to 10 for boss
    const color = isBoss ? 0x8B0000 : 0x2d9d2d; // Dark red for boss, green for regular
    
    // Zombie body - slightly hunched forward
    const bodyGeometry = new THREE.CylinderGeometry(0.5 * scale, 0.3 * scale, 1.8 * scale, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9 * scale;
    // Add a forward hunch to the body
    body.rotation.x = 0.2;
    body.castShadow = true;
    zombie.add(body);
    
    // Zombie head
    const headGeometry = new THREE.SphereGeometry(0.4 * scale, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: color });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    // Adjust head position to match the hunched body
    head.position.y = 2.1 * scale;
    head.position.z = -0.2 * scale; // Move head forward slightly to match hunched posture
    head.castShadow = true;
    zombie.add(head);
    
    // Zombie arms - slightly longer and more dangling
    const armGeometry = new THREE.CylinderGeometry(0.15 * scale, 0.15 * scale, 1.3 * scale, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: color });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.7 * scale, 0.9 * scale, 0);
    leftArm.rotation.z = Math.PI / 4; // Angle arm outward
    leftArm.rotation.x = 0.3; // Angle arm forward slightly
    leftArm.castShadow = true;
    zombie.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.7 * scale, 0.9 * scale, 0);
    rightArm.rotation.z = -Math.PI / 4; // Angle arm outward
    rightArm.rotation.x = 0.3; // Angle arm forward slightly
    rightArm.castShadow = true;
    zombie.add(rightArm);
    
    // Zombie legs - positioned wider apart for shambling stance
    const legGeometry = new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, 1.2 * scale, 8); // Shortened from 1.5 to 1.2
    const legMaterial = new THREE.MeshStandardMaterial({ color: color });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.4 * scale, -0.6 * scale, 0); // Raised from -0.75 to -0.6
    // Angle leg slightly outward
    leftLeg.rotation.z = 0.1;
    leftLeg.castShadow = true;
    zombie.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.4 * scale, -0.6 * scale, 0); // Raised from -0.75 to -0.6
    // Angle leg slightly outward
    rightLeg.rotation.z = -0.1;
    rightLeg.castShadow = true;
    zombie.add(rightLeg);
    
    // Zombie eyes (red) - keeping these the same as they're already good
    const eyeGeometry = new THREE.SphereGeometry(0.1 * scale, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2 * scale, 2.2 * scale, 0.3 * scale);
    zombie.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2 * scale, 2.2 * scale, 0.3 * scale);
    zombie.add(rightEye);
    
    // Set zombie position - raise the zombie so legs are visible
    zombie.position.set(x, 1.5, z); // Raised from 0.75 to 1.5 to make legs more visible
    
    // Add zombie data
    zombie.userData = {
        health: isBoss ? 200 : 100, // Reduced boss health from 1000 to 200
        maxHealth: isBoss ? 200 : 100, // Also update maxHealth
        isWalking: true,
        walkOffset: Math.random() * Math.PI * 2, // Random starting phase for walking animation
        lastAnimationUpdate: Date.now(),
        type: 'zombie',
        isBoss: isBoss,
        damage: isBoss ? 30 : 10 // Boss does more damage
    };
    
    // Add health bar for all zombies
    const healthBarWidth = isBoss ? 8 : 1; // Wider health bar for boss
    const healthBarHeight = isBoss ? 0.5 : 0.1; // Taller health bar for boss
    const healthBarYPosition = isBoss ? 5 * scale : 2.8; // Higher position for boss health bar
    
    // Health bar background
    const healthBarBgGeometry = new THREE.BoxGeometry(healthBarWidth, healthBarHeight, 0.1);
    const healthBarBgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const healthBarBg = new THREE.Mesh(healthBarBgGeometry, healthBarBgMaterial);
    healthBarBg.position.y = healthBarYPosition;
    zombie.add(healthBarBg);
    
    // Health bar foreground (actual health)
    const healthBarFgGeometry = new THREE.BoxGeometry(healthBarWidth, healthBarHeight, 0.11);
    const healthBarFgMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const healthBarFg = new THREE.Mesh(healthBarFgGeometry, healthBarFgMaterial);
    healthBarFg.position.y = healthBarYPosition;
    healthBarFg.userData.isHealthBar = true;
    zombie.add(healthBarFg);
    
    // Only show health bars when damaged for regular zombies
    if (!isBoss) {
        healthBarBg.visible = false;
        healthBarFg.visible = false;
    }
    
    scene.add(zombie);
    zombies.push(zombie);
    
    return zombie;
}

// Function to spawn zombies for the current wave
function spawnWaveZombies() {
    if (waveSystem.isWaveTransition || waveSystem.zombiesRemaining <= 0) return;
    
    // If wave is not in progress, start it
    if (!waveSystem.isWaveInProgress) {
        waveSystem.isWaveInProgress = true;
        waveSystem.zombiesRemaining = waveSystem.zombiesPerWave[waveSystem.currentWave - 1];
        
        // Show wave start message
        showWaveMessage(`Wave ${waveSystem.currentWave} Started!`);
        
        // For the boss wave, spawn a single boss
        if (waveSystem.currentWave === 5) {
            // Find a valid spawn position for the boss
            let validPosition = false;
            let x, z;
            let attempts = 0;
            
            while (!validPosition && attempts < 50) {
                attempts++;
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 10; // Spawn boss between 30-40 units away
                x = player.position.x + Math.cos(angle) * distance;
                z = player.position.z + Math.sin(angle) * distance;
                
                // Check if position is valid (not inside a building)
                validPosition = true;
                for (const boundary of collisionBoundaries) {
                    if (x + zombieCollisionRadius > boundary.minX && 
                        x - zombieCollisionRadius < boundary.maxX && 
                        z + zombieCollisionRadius > boundary.minZ && 
                        z - zombieCollisionRadius < boundary.maxZ) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            // If we found a valid position, create the boss
            if (validPosition) {
                createZombie(x, z, true); // Create boss zombie
            } else {
                // Fallback: spawn boss at a fixed distance in a random direction
                const angle = Math.random() * Math.PI * 2;
                const distance = 50; // Spawn far away to avoid buildings
                x = player.position.x + Math.cos(angle) * distance;
                z = player.position.z + Math.sin(angle) * distance;
                createZombie(x, z, true);
            }
        } else {
            // For regular waves, spawn zombies in groups
            const zombiesToSpawn = waveSystem.zombiesPerWave[waveSystem.currentWave - 1];
            
            // Create 2-4 spawn points around the player
            const spawnPoints = [];
            const numSpawnPoints = Math.min(4, Math.ceil(zombiesToSpawn / 3));
            
            // Find valid spawn points (not inside buildings)
            for (let i = 0; i < numSpawnPoints; i++) {
                let validPosition = false;
                let spawnPoint;
                let attempts = 0;
                
                while (!validPosition && attempts < 30) {
                    attempts++;
                    const angle = (i / numSpawnPoints) * Math.PI * 2 + (Math.random() * 0.5);
                    const distance = 20 + Math.random() * 15; // 20-35 units away
                    const x = player.position.x + Math.cos(angle) * distance;
                    const z = player.position.z + Math.sin(angle) * distance;
                    
                    // Check if position is valid (not inside a building)
                    validPosition = true;
                    for (const boundary of collisionBoundaries) {
                        if (x + zombieCollisionRadius > boundary.minX && 
                            x - zombieCollisionRadius < boundary.maxX && 
                            z + zombieCollisionRadius > boundary.minZ && 
                            z - zombieCollisionRadius < boundary.maxZ) {
                            validPosition = false;
                            break;
                        }
                    }
                    
                    if (validPosition) {
                        spawnPoint = { x, z };
                    }
                }
                
                // If we found a valid spawn point, add it
                if (spawnPoint) {
                    spawnPoints.push(spawnPoint);
                } else {
                    // Fallback: use a point far away from buildings
                    const angle = (i / numSpawnPoints) * Math.PI * 2;
                    const distance = 45; // Far enough to likely avoid buildings
                    spawnPoints.push({
                        x: player.position.x + Math.cos(angle) * distance,
                        z: player.position.z + Math.sin(angle) * distance
                    });
                }
            }
            
            // Distribute zombies among spawn points
            for (let i = 0; i < zombiesToSpawn; i++) {
                // Choose a random spawn point
                const spawnPoint = spawnPoints[i % spawnPoints.length];
                
                // Add some randomness to position (but keep them clustered)
                let validPosition = false;
                let x, z;
                let attempts = 0;
                
                while (!validPosition && attempts < 10) {
                    attempts++;
                    const offsetX = (Math.random() - 0.5) * 5; // 5 units spread
                    const offsetZ = (Math.random() - 0.5) * 5;
                    x = spawnPoint.x + offsetX;
                    z = spawnPoint.z + offsetZ;
                    
                    // Check if position is valid (not inside a building)
                    validPosition = true;
                    for (const boundary of collisionBoundaries) {
                        if (x + zombieCollisionRadius > boundary.minX && 
                            x - zombieCollisionRadius < boundary.maxX && 
                            z + zombieCollisionRadius > boundary.minZ && 
                            z - zombieCollisionRadius < boundary.maxZ) {
                            validPosition = false;
                            break;
                        }
                    }
                }
                
                // Create zombie at valid position or at spawn point if no valid position found
                if (validPosition) {
                    createZombie(x, z, false);
                } else {
                    createZombie(spawnPoint.x, spawnPoint.z, false);
                }
            }
        }
        
        // Update the wave indicator with zombies remaining
        updateWaveIndicator();
    }
}

// Function to check if wave is complete
function checkWaveCompletion() {
    // If we're in a wave transition, update the countdown
    if (waveSystem.isWaveTransition) {
        const now = Date.now();
        const elapsed = now - waveSystem.lastTransitionUpdateTime;
        
        if (elapsed > 1000) { // Update every second
            waveSystem.transitionTimeRemaining -= 1000;
            waveSystem.lastTransitionUpdateTime = now;
            
            // Update the wave message with countdown
            const seconds = Math.ceil(waveSystem.transitionTimeRemaining / 1000);
            updateWaveMessage(`Wave ${waveSystem.currentWave} starts in ${seconds}...`);
            
            // If countdown is complete, start the next wave
            if (waveSystem.transitionTimeRemaining <= 0) {
                waveSystem.isWaveTransition = false;
                waveSystem.isWaveInProgress = false;
                hideWaveMessage();
            }
        }
        return;
    }
    
    // If wave is in progress and all zombies are dead, complete the wave
    if (waveSystem.isWaveInProgress && zombies.length === 0) {
        completeWave();
    }
}

// Function to complete the current wave
function completeWave() {
    // If this was the final wave, player wins
    if (waveSystem.currentWave === waveSystem.maxWaves) {
        handleGameWin();
        return;
    }
    
    // Otherwise, prepare for the next wave
    waveSystem.currentWave++;
    waveSystem.isWaveInProgress = false;
    
    // Show wave complete message
    showWaveMessage(`Wave ${waveSystem.currentWave - 1} Complete!`);
    setTimeout(hideWaveMessage, 1500);
    
    // Award bonus points for completing the wave
    player.score += 50 * (waveSystem.currentWave - 1);
    updateScoreDisplay();
    
    // Spawn weapon pickups after waves 1 and 3
    if (waveSystem.currentWave === 2) {
        // Spawn shotgun after wave 1
        createWeaponPickup('shotgun', player.position.x + 3, player.position.z);
    } else if (waveSystem.currentWave === 4) {
        // Spawn machine gun after wave 3
        createWeaponPickup('machinegun', player.position.x + 3, player.position.z);
    }
    
    // Update the wave indicator
    updateWaveIndicator();
}

// Function to handle game win
function handleGameWin() {
    player.isGameOver = true;
    
    // Create win display
    const winDisplay = document.createElement('div');
    winDisplay.style.position = 'absolute';
    winDisplay.style.top = '50%';
    winDisplay.style.left = '50%';
    winDisplay.style.transform = 'translate(-50%, -50%)';
    winDisplay.style.color = '#00ff00';
    winDisplay.style.fontFamily = 'Arial, sans-serif';
    winDisplay.style.fontSize = '48px';
    winDisplay.style.fontWeight = 'bold';
    winDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.7)';
    winDisplay.style.textAlign = 'center';
    winDisplay.innerHTML = `YOU WIN!<br>Score: ${player.score}<br><span style="font-size: 24px">Click to play again</span>`;
    document.body.appendChild(winDisplay);
    
    // Release pointer lock
    document.exitPointerLock();
    
    // Add click event to restart
    document.addEventListener('click', restartGame, { once: true });
}

// Create wave message display
const waveMessageDisplay = document.createElement('div');
waveMessageDisplay.style.position = 'absolute';
waveMessageDisplay.style.top = '30%';
waveMessageDisplay.style.left = '50%';
waveMessageDisplay.style.transform = 'translate(-50%, -50%)';
waveMessageDisplay.style.color = 'white';
waveMessageDisplay.style.fontFamily = 'Arial, sans-serif';
waveMessageDisplay.style.fontSize = '36px';
waveMessageDisplay.style.fontWeight = 'bold';
waveMessageDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.7)';
waveMessageDisplay.style.textAlign = 'center';
waveMessageDisplay.style.display = 'none';
document.body.appendChild(waveMessageDisplay);

// Function to show wave message
function showWaveMessage(message) {
    waveMessageDisplay.textContent = message;
    waveMessageDisplay.style.display = 'block';
}

// Function to update wave message
function updateWaveMessage(message) {
    waveMessageDisplay.textContent = message;
}

// Function to hide wave message
function hideWaveMessage() {
    waveMessageDisplay.style.display = 'none';
}

// Create wave indicator
const waveIndicator = document.createElement('div');
waveIndicator.style.position = 'absolute';
waveIndicator.style.top = '20px';
waveIndicator.style.right = '20px';
waveIndicator.style.color = 'white';
waveIndicator.style.fontFamily = 'Arial, sans-serif';
waveIndicator.style.fontSize = '24px';
waveIndicator.style.fontWeight = 'bold';
waveIndicator.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
waveIndicator.innerHTML = 'Wave: 1/5 - Zombies: 3';
document.body.appendChild(waveIndicator);

// Function to update wave indicator
function updateWaveIndicator() {
    const zombiesRemaining = zombies.filter(zombie => zombie.userData.health > 0).length;
    waveIndicator.innerHTML = `Wave: ${waveSystem.currentWave}/${waveSystem.maxWaves} - Zombies: ${zombiesRemaining}`;
}

// Function to update zombies
function updateZombies() {
    const now = Date.now();
    
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        
        // Skip if zombie is dead
        if (zombie.userData.health <= 0) continue;
        
        // Calculate distance to player
        const distanceToPlayer = zombie.position.distanceTo(new THREE.Vector3(
            player.position.x,
            0, // Ignore Y axis for distance calculation
            player.position.z
        ));
        
        // Add bobbing motion to make zombies more zombie-like
        if (zombie.userData.isWalking) {
            const walkCycle = Math.sin((now * 0.005) + zombie.userData.walkOffset);
            const bobHeight = walkCycle * 0.2; // More pronounced bobbing
            const baseHeight = zombie.userData.isBoss ? 4.0 : 1.0; // Lowered from 5.0/1.5 to 4.0/1.0
            zombie.position.y = baseHeight + Math.abs(bobHeight);
            
            // Tilt side to side slightly
            zombie.rotation.z = walkCycle * 0.1;
        }
        
        // Move zombie towards player if within detection range
        if (distanceToPlayer < zombieDetectionRange) {
            // Calculate direction to player
            const direction = new THREE.Vector3(
                player.position.x - zombie.position.x,
                0, // Don't move up/down
                player.position.z - zombie.position.z
            ).normalize();
            
            // Calculate intended position
            const speed = zombie.userData.isBoss ? zombieSpeed * 0.9 : zombieSpeed;
            const newX = zombie.position.x + direction.x * speed;
            const newZ = zombie.position.z + direction.z * speed;
            
            // Check for collisions with buildings
            let canMove = true;
            for (const boundary of collisionBoundaries) {
                if (newX + zombieCollisionRadius > boundary.minX && 
                    newX - zombieCollisionRadius < boundary.maxX && 
                    newZ + zombieCollisionRadius > boundary.minZ && 
                    newZ - zombieCollisionRadius < boundary.maxZ) {
                    canMove = false;
                    break;
                }
            }
            
            // Only move if no collision
            if (canMove) {
                zombie.position.x = newX;
                zombie.position.z = newZ;
            } else {
                // Try to navigate around obstacles by trying different directions
                // Try moving only in X direction
                const newXOnly = zombie.position.x + direction.x * speed;
                let canMoveX = true;
                
                for (const boundary of collisionBoundaries) {
                    if (newXOnly + zombieCollisionRadius > boundary.minX && 
                        newXOnly - zombieCollisionRadius < boundary.maxX && 
                        zombie.position.z + zombieCollisionRadius > boundary.minZ && 
                        zombie.position.z - zombieCollisionRadius < boundary.maxZ) {
                        canMoveX = false;
                        break;
                    }
                }
                
                if (canMoveX) {
                    zombie.position.x = newXOnly;
                }
                
                // Try moving only in Z direction
                const newZOnly = zombie.position.z + direction.z * speed;
                let canMoveZ = true;
                
                for (const boundary of collisionBoundaries) {
                    if (zombie.position.x + zombieCollisionRadius > boundary.minX && 
                        zombie.position.x - zombieCollisionRadius < boundary.maxX && 
                        newZOnly + zombieCollisionRadius > boundary.minZ && 
                        newZOnly - zombieCollisionRadius < boundary.maxZ) {
                        canMoveZ = false;
                        break;
                    }
                }
                
                if (canMoveZ) {
                    zombie.position.z = newZOnly;
                }
            }
            
            // Rotate zombie to face player
            zombie.rotation.y = Math.atan2(direction.x, direction.z);
            
            // Attack player if close enough
            if (distanceToPlayer < (zombie.userData.isBoss ? 8 : 2) && !player.isGameOver) { // Larger attack range for boss
                attackPlayer(zombie);
            }
        } else {
            // Random wandering behavior
            const wanderAngle = now * 0.0005 + i; // Different for each zombie
            const newX = zombie.position.x + Math.sin(wanderAngle) * zombieSpeed * 0.3;
            const newZ = zombie.position.z + Math.cos(wanderAngle) * zombieSpeed * 0.3;
            
            // Check for collisions with buildings
            let canMove = true;
            for (const boundary of collisionBoundaries) {
                if (newX + zombieCollisionRadius > boundary.minX && 
                    newX - zombieCollisionRadius < boundary.maxX && 
                    newZ + zombieCollisionRadius > boundary.minZ && 
                    newZ - zombieCollisionRadius < boundary.maxZ) {
                    canMove = false;
                    break;
                }
            }
            
            // Only move if no collision
            if (canMove) {
                zombie.position.x = newX;
                zombie.position.z = newZ;
            }
        }
    }
}

// Function to handle zombie attacking player
function attackPlayer(zombie) {
    const now = Date.now();
    
    // Check if player can take damage (cooldown expired)
    if (now - player.lastDamageTime > player.damageCooldown) {
        // Apply damage to player
        player.health -= zombie.userData.damage; // Use zombie's damage value
        player.lastDamageTime = now;
        
        // Update health display
        updateHealthDisplay();
        
        // Visual feedback - screen flash
        damageFlash();
        
        // Check if player is dead
        if (player.health <= 0) {
            handleGameOver();
        }
        
        // Zombie attack animation - lunge forward slightly
        const direction = new THREE.Vector3(
            player.position.x - zombie.position.x,
            0,
            player.position.z - zombie.position.z
        ).normalize();
        
        zombie.position.x += direction.x * 0.5;
        zombie.position.z += direction.z * 0.5;
    }
}

// Function to check bullet-zombie collisions
function checkBulletCollisions() {
    // For each bullet
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // For each zombie
        for (let j = zombies.length - 1; j >= 0; j--) {
            const zombie = zombies[j];
            
            // Skip if zombie is already dead
            if (zombie.userData.health <= 0) continue;
            
            // Check distance between bullet and zombie (simple collision detection)
            const distance = bullet.position.distanceTo(zombie.position);
            
            // Adjust hit radius based on whether it's a boss
            const hitRadius = zombie.userData.isBoss ? 5 : 1.5; // Increased boss hit radius from 3 to 5
            
            if (distance < hitRadius) { // If bullet hits zombie
                // Damage zombie - regular zombies die in one hit, boss takes bullet damage
                if (zombie.userData.isBoss) {
                    // Make sure boss takes damage
                    zombie.userData.health = Math.max(0, zombie.userData.health - bullet.userData.damage);
                    console.log(`Boss hit! Health: ${zombie.userData.health}/${zombie.userData.maxHealth}`);
                } else {
                    zombie.userData.health = 0; // Regular zombies die in one hit
                }
                
                // Create blood effect
                createBloodEffect(bullet.position.clone());
                
                // Remove bullet
                scene.remove(bullet);
                bullets.splice(i, 1);
                
                // Show health bar for all zombies when hit
                zombie.children.forEach(child => {
                    // Make all health bar components visible
                    if (child.userData && child.userData.isHealthBar) {
                        child.visible = true;
                    } else if (child.geometry && 
                        child.geometry.type === "BoxGeometry" && 
                        child.geometry.parameters.width >= 0.9 && 
                        child.geometry.parameters.width <= 8.1 && 
                        child.geometry.parameters.height <= 0.6) {
                        child.visible = true;
                    }
                });
                
                // Update health bar
                updateZombieHealthBar(zombie);
                
                // If zombie is dead
                if (zombie.userData.health <= 0) {
                    handleZombieDeath(zombie, j);
                }
                
                // Break out of inner loop since bullet is gone
                break;
            }
        }
    }
}

// Function to update zombie health bar (works for both boss and regular zombies)
function updateZombieHealthBar(zombie) {
    // Find the health bar in the zombie's children
    let healthBar = null;
    
    zombie.children.forEach(child => {
        if (child.userData.isHealthBar) {
            healthBar = child;
            
            // Calculate health percentage
            const healthPercent = Math.max(0, zombie.userData.health / zombie.userData.maxHealth);
            
            // Update health bar scale
            child.scale.x = healthPercent;
            
            // Adjust position to keep left-aligned
            const barWidth = zombie.userData.isBoss ? 8 : 1; // Updated from 3 to 8 for boss
            child.position.x = (1 - healthPercent) * (-barWidth/2);
        }
    });
    
    // If we couldn't find the health bar, log an error
    if (!healthBar && zombie.userData.health > 0) {
        console.error("Could not find health bar for zombie", zombie);
    }
}

// Function to handle zombie death
function handleZombieDeath(zombie, index) {
    // Increase player score (boss worth more points)
    player.score += zombie.userData.isBoss ? 100 : 10;
    updateScoreDisplay();
    
    // Death animation - fall over
    zombie.userData.isWalking = false;
    zombie.rotation.x = Math.PI / 2; // Fall forward
    
    // Set position to rest on the floor
    // For a boss, we need to account for its larger size
    const bodyRadius = zombie.userData.isBoss ? 0.5 * 10 : 0.5; // Body radius (scaled for boss)
    zombie.position.y = bodyRadius; // Position exactly on the floor based on body radius
    
    // Store the timeout ID in the zombie object for cleanup
    zombie.userData.removalTimeoutId = setTimeout(() => {
        // Only remove if the zombie still exists in the scene
        if (zombie.parent === scene && zombies.includes(zombie)) {
            scene.remove(zombie);
            zombies.splice(zombies.indexOf(zombie), 1);
            
            // Update wave indicator to show remaining zombies
            updateWaveIndicator();
        }
    }, 3000);
}

// Function to restart game
function restartGame() {
    // Clear any pending zombie removal timeouts
    zombies.forEach(zombie => {
        if (zombie.userData.removalTimeoutId) {
            clearTimeout(zombie.userData.removalTimeoutId);
        }
    });
    
    // Remove game over or win display
    const gameEndDisplay = document.querySelector('div:not(#crosshair):not(.score-display):not(.health-display):not(.wave-display)');
    if (gameEndDisplay) {
        document.body.removeChild(gameEndDisplay);
    }
    
    // Reset player state
    player.health = player.maxHealth;
    player.score = 0;
    player.isGameOver = false;
    player.position.set(0, playerHeight, 5);
    player.rotation.horizontal = 0;
    player.rotation.vertical = 0;
    
    // Reset wave system
    waveSystem.currentWave = 1;
    waveSystem.isWaveInProgress = false;
    waveSystem.isWaveTransition = false;
    updateWaveIndicator();
    
    // Remove all zombies
    for (let i = zombies.length - 1; i >= 0; i--) {
        scene.remove(zombies[i]);
    }
    zombies.length = 0;
    
    // Remove all bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        scene.remove(bullets[i]);
    }
    bullets.length = 0;
    
    // Update displays
    updateScoreDisplay();
    updateHealthDisplay();
}

// Create damage flash overlay
const damageOverlay = document.createElement('div');
damageOverlay.style.position = 'absolute';
damageOverlay.style.top = '0';
damageOverlay.style.left = '0';
damageOverlay.style.width = '100%';
damageOverlay.style.height = '100%';
damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
damageOverlay.style.pointerEvents = 'none';
damageOverlay.style.transition = 'background-color 0.1s ease-out';
damageOverlay.style.zIndex = '1000';
document.body.appendChild(damageOverlay);

// Function to flash screen when taking damage
function damageFlash() {
    damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    setTimeout(() => {
        damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
    }, 100);
}

// Create health display
const healthDisplay = document.createElement('div');
healthDisplay.style.position = 'absolute';
healthDisplay.style.bottom = '20px';
healthDisplay.style.left = '20px';
healthDisplay.style.width = '200px';
healthDisplay.style.height = '20px';
healthDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
healthDisplay.style.border = '2px solid white';
healthDisplay.style.borderRadius = '5px';
document.body.appendChild(healthDisplay);

const healthBar = document.createElement('div');
healthBar.style.width = '100%';
healthBar.style.height = '100%';
healthBar.style.backgroundColor = 'green';
healthBar.style.transition = 'width 0.3s ease-out';
healthDisplay.appendChild(healthBar);

// Function to update health display
function updateHealthDisplay() {
    const healthPercent = (player.health / player.maxHealth) * 100;
    healthBar.style.width = `${healthPercent}%`;
    
    // Change color based on health level
    if (healthPercent > 60) {
        healthBar.style.backgroundColor = 'green';
    } else if (healthPercent > 30) {
        healthBar.style.backgroundColor = 'orange';
    } else {
        healthBar.style.backgroundColor = 'red';
    }
}

// Create score display
const scoreDisplay = document.createElement('div');
scoreDisplay.style.position = 'absolute';
scoreDisplay.style.top = '20px';
scoreDisplay.style.left = '20px';
scoreDisplay.style.color = 'white';
scoreDisplay.style.fontFamily = 'Arial, sans-serif';
scoreDisplay.style.fontSize = '24px';
scoreDisplay.style.fontWeight = 'bold';
scoreDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
scoreDisplay.innerHTML = 'Score: 0';
document.body.appendChild(scoreDisplay);

// Function to update score display
function updateScoreDisplay() {
    scoreDisplay.innerHTML = `Score: ${player.score}`;
}

// Function to handle secret hotkey to skip wave
function checkHotkeys() {
    // Z key to skip current wave
    if (keys.z) {
        // Only process once per keypress
        keys.z = false;
        
        // Only if a wave is in progress and not in transition
        if (waveSystem.isWaveInProgress && !waveSystem.isWaveTransition) {
            // Remove all zombies
            for (let i = zombies.length - 1; i >= 0; i--) {
                scene.remove(zombies[i]);
            }
            zombies.length = 0;
            
            // Show secret message
            showWaveMessage("Wave Skipped!");
            setTimeout(hideWaveMessage, 1500);
            
            // Award some points for skipping
            player.score += 25;
            updateScoreDisplay();
        }
    }
    
    // P key to toggle pause
    if (keys.p) {
        // Only process once per keypress
        keys.p = false;
        
        // Toggle pause state
        togglePause();
    }
}

// Add structured game state management
const gameState = {
    isPaused: false,
    isGameOver: false,
    isPointerLocked: false,
    currentWave: 0,
    isWaveInProgress: false,
    isWaveTransition: false
};

// Function to manage pointer lock
function managePointerLock(shouldLock) {
    try {
        if (shouldLock && !gameState.isPointerLocked) {
            canvas.requestPointerLock();
        } else if (!shouldLock && gameState.isPointerLocked) {
            document.exitPointerLock();
        }
    } catch (error) {
        console.error("Error managing pointer lock:", error);
    }
}

// Function to toggle pause state
function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    
    // Get pause menu element
    const pauseMenu = document.getElementById('pauseMenu');
    if (!pauseMenu) {
        console.error("Pause menu element not found!");
        return;
    }
    
    if (gameState.isPaused) {
        // Show pause menu
        pauseMenu.style.display = 'block';
        
        // Unlock pointer when paused
        managePointerLock(false);
    } else {
        // Hide pause menu
        pauseMenu.style.display = 'none';
        
        // Re-lock pointer when unpausing
        managePointerLock(true);
    }
}

// Initialize pause menu and pointer lock event listeners
function initializeGameControls() {
    // Set up pointer lock event listeners
    document.addEventListener('pointerlockchange', () => {
        gameState.isPointerLocked = document.pointerLockElement === canvas;
    });
    
    document.addEventListener('pointerlockerror', (event) => {
        console.error("Pointer lock error:", event);
        gameState.isPointerLocked = false;
    });
    
    // Set up pause menu button listeners
    const resumeButton = document.getElementById('resumeButton');
    const restartButton = document.getElementById('restartButton');
    
    if (resumeButton) {
        resumeButton.addEventListener('click', () => {
            if (gameState.isPaused) {
                togglePause();
            }
        });
    } else {
        console.error("Resume button not found!");
    }
    
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            if (gameState.isPaused) {
                togglePause();
                restartGame();
            }
        });
    } else {
        console.error("Restart button not found!");
    }
}

// Animation loop with improved efficiency
function animate() {
    requestAnimationFrame(animate);
    
    // Only update game if not game over and not paused
    if (!player.isGameOver && !isPaused) {
        // Full game update
        updateMovement();
        handleShooting();
        updateGunAnimation();
        updateBullets();
        updateBloodParticles();
        spawnWaveZombies();
        updateZombies();
        checkBulletCollisions();
        checkWaveCompletion();
        checkHotkeys(); // Check for hotkeys
        checkWeaponPickups(); // Check for weapon pickups
        
        // Update skybox position to follow camera
        skyboxElements.skybox.position.copy(camera.position);
        
        // Keep stars at a fixed position relative to the camera
        skyboxElements.stars.position.copy(camera.position);
        
        // Add very subtle moon rotation for a more dynamic night sky
        skyboxElements.moon.rotation.y += 0.0001;
        skyboxElements.moon.position.copy(camera.position);
        // Maintain moon's relative position in the sky
        const moonDistance = 450; // Slightly less than skybox radius
        skyboxElements.moon.position.x += moonDistance * 0.5;
        skyboxElements.moon.position.y += moonDistance * 0.7;
        skyboxElements.moon.position.z += -moonDistance * 0.3;
        
        // Update flashlight position and direction
        flashlight.position.copy(camera.position);
        // Calculate the target position based on where the player is looking
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        direction.normalize();
        
        // Set the target position 20 units in front of the camera
        flashlightTarget.position.copy(camera.position).add(direction.multiplyScalar(20));
        
        // Cast a ray to find distance to objects in view
        flashlightRaycaster.set(camera.position, direction);
        const intersects = flashlightRaycaster.intersectObjects(scene.children, true);
        
        // Adjust flashlight angle based on distance to nearest object
        let distance = flashlightMaxDistance; // Default to max if no hit
        if (intersects.length > 0) {
            // Get the distance to the first object hit
            distance = intersects[0].distance;
        }
        
        // Clamp distance between min and max values
        distance = Math.max(flashlightMinDistance, Math.min(distance, flashlightMaxDistance));
        
        // Calculate angle - exponential relationship with distance for more dramatic effect
        // As distance increases, angle decreases more rapidly (narrower beam)
        const t = Math.pow(1 - ((distance - flashlightMinDistance) / (flashlightMaxDistance - flashlightMinDistance)), 2);
        const angle = flashlightMinAngle + t * (flashlightMaxAngle - flashlightMinAngle);
        
        // Update flashlight angle
        flashlight.angle = angle;
        
        // Also adjust the penumbra for more realism - sharper edge for distant objects
        flashlight.penumbra = 0.2 + (0.4 * t); // 0.2 for far objects, 0.6 for close objects
        
        // Update player light position
        playerLight.position.copy(camera.position);
        
        // Render at full frame rate when playing
        renderer.render(scene, camera);
    } else if (!player.isGameOver) {
        // If paused but not game over, only check for hotkeys
        checkHotkeys();
        
        // Render at reduced frame rate when paused (every 10 frames)
        if (Math.floor(performance.now() / 100) % 10 === 0) {
            renderer.render(scene, camera);
        }
    } else {
        // Game over state, render at normal rate
        renderer.render(scene, camera);
    }
}

// Initialize game controls when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGameControls);
} else {
    // DOM already loaded, initialize immediately
    initializeGameControls();
}

animate();

// Function to handle game over
function handleGameOver() {
    // Set game over state
    player.isGameOver = true;
    
    // Release pointer lock
    managePointerLock(false);
    
    // Create game over display
    const gameOverDisplay = document.createElement('div');
    gameOverDisplay.style.position = 'absolute';
    gameOverDisplay.style.top = '50%';
    gameOverDisplay.style.left = '50%';
    gameOverDisplay.style.transform = 'translate(-50%, -50%)';
    gameOverDisplay.style.textAlign = 'center';
    gameOverDisplay.style.color = '#ff0000';
    gameOverDisplay.style.fontFamily = 'Arial, sans-serif';
    gameOverDisplay.style.zIndex = '1000';
    gameOverDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    gameOverDisplay.style.padding = '40px';
    gameOverDisplay.style.borderRadius = '10px';
    gameOverDisplay.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.5)';
    
    // Add game over message
    const gameOverTitle = document.createElement('h1');
    gameOverTitle.textContent = 'YOU DIED';
    gameOverTitle.style.fontSize = '48px';
    gameOverTitle.style.marginBottom = '20px';
    gameOverTitle.style.textShadow = '0 0 10px #ff0000';
    gameOverDisplay.appendChild(gameOverTitle);
    
    // Add score
    const scoreText = document.createElement('p');
    scoreText.textContent = `Final Score: ${player.score}`;
    scoreText.style.fontSize = '24px';
    scoreText.style.marginBottom = '30px';
    gameOverDisplay.appendChild(scoreText);
    
    // Add restart button
    const restartButton = document.createElement('button');
    restartButton.textContent = 'RESTART';
    restartButton.style.padding = '15px 30px';
    restartButton.style.fontSize = '20px';
    restartButton.style.backgroundColor = '#ff3333';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.transition = 'background-color 0.3s';
    
    // Hover effect
    restartButton.onmouseover = function() {
        this.style.backgroundColor = '#ff6666';
    };
    restartButton.onmouseout = function() {
        this.style.backgroundColor = '#ff3333';
    };
    
    // Add restart functionality
    restartButton.onclick = function() {
        restartGame();
    };
    
    gameOverDisplay.appendChild(restartButton);
    document.body.appendChild(gameOverDisplay);
    
    // Play death sound if available
    // if (soundEffects.death) soundEffects.death.play();
} 