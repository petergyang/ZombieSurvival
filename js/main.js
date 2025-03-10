import * as THREE from 'three';
import { Game } from './core/Game.js';
import { Zombie } from './entities/Zombie.js';

// Initialize audio
const audioSystem = {
    backgroundMusic: null,
    soundEffects: {},
    
    // Initialize the background music
    initBackgroundMusic() {
        this.backgroundMusic = new Audio('assets/audio/Village.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.5; // Set volume to 50%
    },
    
    // Play background music
    playBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.play().catch(error => {
                console.warn('Audio playback failed:', error);
            });
        }
    },
    
    // Pause background music
    pauseBackgroundMusic() {
        if (this.backgroundMusic && !this.backgroundMusic.paused) {
            this.backgroundMusic.pause();
        }
    },
    
    // Resume background music
    resumeBackgroundMusic() {
        if (this.backgroundMusic && this.backgroundMusic.paused) {
            this.backgroundMusic.play().catch(error => {
                console.warn('Audio playback failed:', error);
            });
        }
    }
};

// Initialize audio when the page loads
document.addEventListener('DOMContentLoaded', () => {
    audioSystem.initBackgroundMusic();
});

// Add structured game state management
const gameState = {
    isStarted: false,
    isPaused: false,
    isGameOver: false,
    isPointerLocked: false,
    currentWave: 0,
    isWaveInProgress: false,
    isWaveTransition: false
};

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize game controls
    initializeGameControls();
    
    // Set up start screen button
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', startGame);
    }
    
    // Start animation loop
    animate();
});

// Function to start the game
function startGame() {
    // Hide start screen
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.style.display = 'none';
    }
    
    // Hide start screen overlay
    const startScreenOverlay = document.getElementById('startScreenOverlay');
    if (startScreenOverlay) {
        startScreenOverlay.style.display = 'none';
    }
    
    // Show crosshair
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.display = 'block';
    }
    
    // Show radar
    radar.style.display = 'block';
    
    // Show all game UI elements
    const gameUIElements = document.querySelectorAll('.game-ui');
    gameUIElements.forEach(element => {
        element.style.display = 'block';
    });
    
    // Reset camera rotation from the start screen animation
    camera.rotation.set(0, 0, 0);
    
    // Set game as started
    gameState.isStarted = true;
    
    // Play background music
    audioSystem.playBackgroundMusic();
    
    // Lock pointer
    managePointerLock(true);
    
    // Reset game state if restarting
    if (player.isGameOver) {
        restartGame();
    }
}

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
const moveSpeed = 0.064; // Reduced by another 20% from 0.08 (which was already reduced from 0.1)
const mouseSensitivity = 0.002;
const playerHeight = 2;

// Player state
const player = {
    position: new THREE.Vector3(0, 1.7, 10), // Changed from z=0 to z=10
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
    p: false, // Add P key for pausing
    b: false // Add B key for collision boundaries
};

// Add key cooldown to prevent multiple triggers on a single press
const keysCooldown = {
    p: false,
    z: false,
    b: false
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
    zombiesPerWave: [12, 20, 28, 40, 1], // Quadrupled zombies per wave (was originally [3, 5, 7, 10, 1])
    zombiesRemaining: 12, // Start with 12 zombies in wave 1 (was originally 3)
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
// let isPaused = false;

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
    const wallGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 16);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = 1;
    wall.castShadow = true;
    wall.receiveShadow = true;
    well.add(wall);
    
    // Well roof supports
    const supportGeometry = new THREE.BoxGeometry(0.3, 2, 0.3);
    const supportMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    
    const support1 = new THREE.Mesh(supportGeometry, supportMaterial);
    support1.position.set(1.5, 1.5, 0);
    well.add(support1);
    
    const support2 = new THREE.Mesh(supportGeometry, supportMaterial);
    support2.position.set(-1.5, 1.5, 0);
    well.add(support2);
    
    // Well roof
    const roofGeometry = new THREE.ConeGeometry(2.5, 1.5, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 3;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    roof.receiveShadow = true;
    well.add(roof);
    
    well.position.set(x, 0, z);
    
    // Add collision boundary for the well
    collisionBoundaries.push({
        type: 'well',
        minX: x - 2.0,
        maxX: x + 2.0,
        minZ: z - 2.0,
        maxZ: z + 2.0
    });
    
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
    
    // No collision boundary for paths
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
const buildings = [];

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
    createHouse(-15, -12), // Already far from paths
    createHouse(15, -15), // Already far from paths
    createHouse(-18, 15), // Already far from paths
    createHouse(20, 12), // Already far from paths
    createCottage(-10, 8), // Move further from cross path
    createCottage(12, -8) // Move further from cross path
];
houses.forEach(house => scene.add(house));

// Add a barn
const barn = createBarn(-25, -25);
scene.add(barn);

// Farm plots
const farms = [
    createFarmPlot(-25, -10, 10, 15), // Moved south to avoid cross path
    createFarmPlot(25, -10, 10, 15)   // Moved south to avoid cross path
];
farms.forEach(farm => scene.add(farm));

// Add fences around farms
for (let i = 0; i < 5; i++) {
    const fence1 = createFenceSection(-30 + i*2.3, -18, 0);  // Bottom fence for west farm
    scene.add(fence1);
    const fence2 = createFenceSection(-30 + i*2.3, -2, 0);   // Top fence for west farm
    scene.add(fence2);
    const fence3 = createFenceSection(20 + i*2.3, -18, 0);   // Bottom fence for east farm
    scene.add(fence3);
    const fence4 = createFenceSection(20 + i*2.3, -2, 0);    // Top fence for east farm
    scene.add(fence4);
}

for (let i = 0; i < 4; i++) {
    const fence1 = createFenceSection(-30, -16 + i*2.3, Math.PI/2);  // Left fence for west farm
    scene.add(fence1);
    const fence2 = createFenceSection(-20, -16 + i*2.3, Math.PI/2);  // Right fence for west farm
    scene.add(fence2);
    const fence3 = createFenceSection(30, -16 + i*2.3, Math.PI/2);   // Right fence for east farm
    scene.add(fence3);
    const fence4 = createFenceSection(20, -16 + i*2.3, Math.PI/2);   // Left fence for east farm
    scene.add(fence4);
}

// Add trees around the village in a forest-like ring
// Create a dense forest ring around the town
for (let i = 0; i < 120; i++) { // Increased from 40 to 120 trees
    const angle = (i / 120) * Math.PI * 2;
    // Start trees closer to town (reduced from 45 to 30) but with more variation in distance
    const radius = 30 + Math.random() * 30; // Trees will be placed between 30-60 units from center
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const tree = createTree(x, z);
    trees.push(tree);
    scene.add(tree);
}

// Add dense clusters of trees in specific areas
// Northeast forest
for (let i = 0; i < 40; i++) { // Increased from 15 to 40 trees
    const x = 35 + Math.random() * 30; // Start closer to town (changed from 50 to 35)
    const z = -35 - Math.random() * 30; // Start closer to town (changed from -50 to -35)
    const tree = createTree(x, z);
    trees.push(tree);
    scene.add(tree);
}

// Southwest forest
for (let i = 0; i < 40; i++) { // Increased from 15 to 40 trees
    const x = -35 - Math.random() * 30; // Start closer to town (changed from -50 to -35)
    const z = 35 + Math.random() * 30; // Start closer to town (changed from 50 to 35)
    const tree = createTree(x, z);
    trees.push(tree);
    scene.add(tree);
}

// Add additional forest clusters
// Northwest forest
for (let i = 0; i < 40; i++) {
    const x = -35 - Math.random() * 30;
    const z = -35 - Math.random() * 30;
    const tree = createTree(x, z);
    trees.push(tree);
    scene.add(tree);
}

// Southeast forest
for (let i = 0; i < 40; i++) {
    const x = 35 + Math.random() * 30;
    const z = 35 + Math.random() * 30;
    const tree = createTree(x, z);
    trees.push(tree);
    scene.add(tree);
}

// Fill in gaps with random trees
for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 35 + Math.random() * 25;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const tree = createTree(x, z);
    trees.push(tree);
    scene.add(tree);
}

// Clear collision boundaries that intersect with paths
clearPathCollisionBoundaries();

// Function to visualize collision boundaries (for debugging)
function visualizeCollisionBoundaries() {
    // Remove any existing visualizations
    scene.children.forEach(child => {
        if (child.name === 'boundaryVisualization') {
            scene.remove(child);
        }
    });
    
    // Create new visualizations
    collisionBoundaries.forEach(boundary => {
        const width = boundary.maxX - boundary.minX;
        const depth = boundary.maxZ - boundary.minZ;
        const geometry = new THREE.BoxGeometry(width, 2, depth);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.3
        });
        const visualization = new THREE.Mesh(geometry, material);
        visualization.position.set(
            (boundary.minX + boundary.maxX) / 2,
            1,
            (boundary.minZ + boundary.maxZ) / 2
        );
        visualization.name = 'boundaryVisualization';
        scene.add(visualization);
    });
}

// Call this to visualize boundaries (uncomment to debug)
// visualizeCollisionBoundaries();

// Event Listeners for movement
document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    // Handle all keys in one place
    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
    
    // Add debug key for collision boundaries
    if (key === 'b') {
        visualizeCollisionBoundaries();
    }
});

document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
        
        // Reset cooldown for keys that have it
        if (keysCooldown.hasOwnProperty(key)) {
            keysCooldown[key] = false;
        }
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
                    player.shotgunAmmo = 30; // Reduced from 100 to 30 shots
                    switchWeapon('shotgun');
                } else if (child.userData.weaponType === 'machinegun') {
                    player.machinegunAmmo = 100; // Reduced from 300 to 100 bullets
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

// Zombie creation is now handled by the Zombie class in js/entities/Zombie.js

// Function to spawn zombies for the current wave
function spawnWaveZombies() {
    if (waveSystem.isWaveTransition || waveSystem.zombiesRemaining <= 0) return;
    
    // If wave is not in progress, start it
    if (!waveSystem.isWaveInProgress) {
        console.log(`Starting wave ${waveSystem.currentWave} with ${waveSystem.zombiesPerWave[waveSystem.currentWave - 1]} zombies`);
        waveSystem.isWaveInProgress = true;
        waveSystem.zombiesRemaining = waveSystem.zombiesPerWave[waveSystem.currentWave - 1];
        
        // Show wave start message
        showWaveMessage(`Wave ${waveSystem.currentWave} Started!`);
        
        // For the boss wave, spawn a single boss
        if (waveSystem.currentWave === 5) {
            // Make sure zombiesRemaining is set to 31 (1 boss + 30 normal zombies)
            waveSystem.zombiesRemaining = 31;
            
            // Find a valid spawn position for the boss
            let validPosition = false;
            let x, z;
            let attempts = 0;
            
            while (!validPosition && attempts < 50) {
                attempts++;
                const angle = Math.random() * Math.PI * 2;
                const distance = 50 + Math.random() * 10; // Increased to 50-60 units away to spawn in the tree line
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
                const bossZombie = new Zombie(scene, x, z, true);
                zombies.push(bossZombie);
            } else {
                // Fallback: spawn boss at a fixed distance in a random direction
                const angle = Math.random() * Math.PI * 2;
                const distance = 55; // Increased to 55 units away to spawn in the tree line
                x = player.position.x + Math.cos(angle) * distance;
                z = player.position.z + Math.sin(angle) * distance;
                const bossZombie = new Zombie(scene, x, z, true);
                zombies.push(bossZombie);
            }
            
            // Also spawn 30 normal zombies for wave 5
            // Create spawn points around the player
            const spawnPoints = [];
            const numSpawnPoints = 8; // Use 8 spawn points for the normal zombies
            
            // Find valid spawn points (not inside buildings)
            for (let i = 0; i < numSpawnPoints; i++) {
                let validPosition = false;
                let spawnPoint;
                let attempts = 0;
                
                while (!validPosition && attempts < 30) {
                    attempts++;
                    const angle = (i / numSpawnPoints) * Math.PI * 2 + (Math.random() * 0.5);
                    const distance = 40 + Math.random() * 15; // 40-55 units away in the tree line
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
            
            // Spawn 30 normal zombies
            for (let i = 0; i < 30; i++) {
                // Choose a random spawn point
                const spawnPoint = spawnPoints[i % spawnPoints.length];
                
                // Add some randomness to position (but keep them clustered)
                let validPosition = false;
                let x, z;
                let attempts = 0;
                
                while (!validPosition && attempts < 15) {
                    attempts++;
                    // Increased spread from 5 to 10 units for better spacing
                    const offsetX = (Math.random() - 0.5) * 10; 
                    const offsetZ = (Math.random() - 0.5) * 10;
                    x = spawnPoint.x + offsetX;
                    z = spawnPoint.z + offsetZ;
                    
                    // Check if position is valid (not inside a building)
                    validPosition = true;
                    
                    // Check building collisions
                    for (const boundary of collisionBoundaries) {
                        if (x + zombieCollisionRadius > boundary.minX && 
                            x - zombieCollisionRadius < boundary.maxX && 
                            z + zombieCollisionRadius > boundary.minZ && 
                            z - zombieCollisionRadius < boundary.maxZ) {
                            validPosition = false;
                            break;
                        }
                    }
                    
                    // Check for collisions with other zombies to prevent stacking
                    if (validPosition) {
                        for (const existingZombie of zombies) {
                            const dx = x - existingZombie.mesh.position.x;
                            const dz = z - existingZombie.mesh.position.z;
                            const distanceSquared = dx * dx + dz * dz;
                            
                            // If too close to another zombie (less than 3 units apart)
                            if (distanceSquared < 9) {
                                validPosition = false;
                                break;
                            }
                        }
                    }
                }
                
                // Create zombie at valid position or at a fallback position
                if (validPosition) {
                    const zombie = new Zombie(scene, x, z, false);
                    // Add a small random delay before the zombie starts moving
                    zombie.mesh.userData.startDelay = Math.random() * 1000; // Random delay up to 1 second
                    zombies.push(zombie);
                } else {
                    // If we couldn't find a valid position, try a completely different location
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 40 + Math.random() * 15;
                    const fallbackX = player.position.x + Math.cos(angle) * distance;
                    const fallbackZ = player.position.z + Math.sin(angle) * distance;
                    
                    const zombie = new Zombie(scene, fallbackX, fallbackZ, false);
                    // Add a small random delay before the zombie starts moving
                    zombie.mesh.userData.startDelay = Math.random() * 1000; // Random delay up to 1 second
                    zombies.push(zombie);
                }
            }
            
            // Update the wave indicator with the correct count of zombies
            updateWaveIndicator();
            console.log(`Wave ${waveSystem.currentWave} started with ${waveSystem.zombiesRemaining} zombies remaining`);
        } else {
            // For regular waves, spawn zombies in groups
            const zombiesToSpawn = waveSystem.zombiesPerWave[waveSystem.currentWave - 1];
            
            // Create 4-8 spawn points around the player to handle the increased number of zombies
            const spawnPoints = [];
            const numSpawnPoints = Math.min(8, Math.ceil(zombiesToSpawn / 5));
            
            // Find valid spawn points (not inside buildings)
            for (let i = 0; i < numSpawnPoints; i++) {
                let validPosition = false;
                let spawnPoint;
                let attempts = 0;
                
                while (!validPosition && attempts < 30) {
                    attempts++;
                    const angle = (i / numSpawnPoints) * Math.PI * 2 + (Math.random() * 0.5);
                    const distance = 40 + Math.random() * 15; // Increased to 40-55 units away to spawn in the tree line
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
                
                // Add more significant randomness to position to space them out better
                let validPosition = false;
                let x, z;
                let attempts = 0;
                
                while (!validPosition && attempts < 15) { // Increased from 10 to 15 attempts
                    attempts++;
                    // Increased spread from 5 to 10 units for better spacing
                    const offsetX = (Math.random() - 0.5) * 10; 
                    const offsetZ = (Math.random() - 0.5) * 10;
                    x = spawnPoint.x + offsetX;
                    z = spawnPoint.z + offsetZ;
                    
                    // Check if position is valid (not inside a building)
                    validPosition = true;
                    
                    // Check building collisions
                    for (const boundary of collisionBoundaries) {
                        if (x + zombieCollisionRadius > boundary.minX && 
                            x - zombieCollisionRadius < boundary.maxX && 
                            z + zombieCollisionRadius > boundary.minZ && 
                            z - zombieCollisionRadius < boundary.maxZ) {
                            validPosition = false;
                            break;
                        }
                    }
                    
                    // Check for collisions with other zombies to prevent stacking
                    if (validPosition) {
                        for (const existingZombie of zombies) {
                            const dx = x - existingZombie.mesh.position.x;
                            const dz = z - existingZombie.mesh.position.z;
                            const distanceSquared = dx * dx + dz * dz;
                            
                            // If too close to another zombie (less than 3 units apart)
                            if (distanceSquared < 9) {
                                validPosition = false;
                                break;
                            }
                        }
                    }
                }
                
                // Create zombie at valid position or at spawn point if no valid position found
                if (validPosition) {
                    const zombie = new Zombie(scene, x, z, false);
                    // Add a small random delay before the zombie starts moving
                    zombie.mesh.userData.startDelay = Math.random() * 1000; // Random delay up to 1 second
                    zombies.push(zombie);
                } else {
                    // If we couldn't find a valid position, try a completely different location
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 40 + Math.random() * 15;
                    const fallbackX = player.position.x + Math.cos(angle) * distance;
                    const fallbackZ = player.position.z + Math.sin(angle) * distance;
                    
                    const zombie = new Zombie(scene, fallbackX, fallbackZ, false);
                    // Add a small random delay before the zombie starts moving
                    zombie.mesh.userData.startDelay = Math.random() * 1000; // Random delay up to 1 second
                    zombies.push(zombie);
                }
            }
            
            // Update the wave indicator with the correct count of zombies
            updateWaveIndicator();
            console.log(`Wave ${waveSystem.currentWave} started with ${waveSystem.zombiesRemaining} zombies remaining`);
        }
        
        // Update the wave indicator with zombies remaining
        updateWaveIndicator();
        console.log(`Wave ${waveSystem.currentWave} started with ${waveSystem.zombiesRemaining} zombies remaining`);
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
    if (waveSystem.isWaveInProgress && waveSystem.zombiesRemaining <= 0) {
        // Double-check that there are no zombies left in the scene
        if (zombies.length === 0) {
            console.log("All zombies defeated, completing wave");
            completeWave();
        } else {
            console.log(`Wave completion check: ${zombies.length} zombies still in scene but counter is 0`);
            // Fix the counter to match the actual number of zombies
            waveSystem.zombiesRemaining = zombies.length;
            updateWaveIndicator();
        }
    }
}

// Function to complete the current wave
function completeWave() {
    console.log(`Completing wave ${waveSystem.currentWave}`);
    
    // If this was the final wave, player wins
    if (waveSystem.currentWave === waveSystem.maxWaves) {
        handleGameWin();
        return;
    }
    
    // Otherwise, prepare for the next wave
    waveSystem.currentWave++;
    waveSystem.isWaveInProgress = false;
    
    console.log(`Moving to wave ${waveSystem.currentWave}`);
    
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
    
    // Start the next wave after a short delay
    setTimeout(() => {
        console.log(`Starting next wave ${waveSystem.currentWave} after delay`);
        // Reset wave state to trigger new zombie spawns
        waveSystem.isWaveInProgress = false;
        waveSystem.zombiesRemaining = waveSystem.zombiesPerWave[waveSystem.currentWave - 1];
        // Force spawn zombies for the next wave
        spawnWaveZombies();
    }, 3000); // 3 second delay before next wave
    
    // Update score display with the bonus points
    updateScoreDisplay();
    
    // Add a delayed check to ensure wave completion
    setTimeout(() => {
        // Force check for wave completion
        waveSystem.zombiesRemaining = 0;
        checkWaveCompletion();
    }, 3500); // Slightly longer than the zombie removal timeout
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
waveIndicator.innerHTML = 'Wave: 1/5 - Zombies: 12';
waveIndicator.classList.add('game-ui'); // Add game-ui class
document.body.appendChild(waveIndicator);

// Create radar
const radar = document.createElement('div');
radar.style.position = 'absolute';
radar.style.bottom = '20px';
radar.style.right = '20px';
radar.style.width = '150px';
radar.style.height = '150px';
radar.style.borderRadius = '50%';
radar.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
radar.style.border = '2px solid rgba(255, 255, 255, 0.5)';
radar.style.zIndex = '100';
radar.style.overflow = 'hidden';
radar.style.display = 'none'; // Hide initially
radar.classList.add('game-ui'); // Add game-ui class
// Add a center dot representing the player
radar.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; background-color: white; border-radius: 50%; transform: translate(-50%, -50%);"></div>';
document.body.appendChild(radar);

// Function to update wave indicator
function updateWaveIndicator() {
    waveIndicator.innerHTML = `Wave: ${waveSystem.currentWave}/${waveSystem.maxWaves} - Zombies: ${waveSystem.zombiesRemaining}`;
}

// Function to update zombies
function updateZombies() {
    const now = Date.now();
    
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        
        // Skip if zombie is dead
        if (zombie.mesh.userData.health <= 0) continue;
        
        // Check if zombie is still in start delay period
        if (zombie.mesh.userData.startDelay > 0) {
            zombie.mesh.userData.startDelay -= 16; // Approximate time between frames
            continue; // Skip movement until delay is over
        }
        
        // Calculate distance to player
        const distanceToPlayer = zombie.mesh.position.distanceTo(new THREE.Vector3(
            player.position.x,
            0, // Ignore Y axis for distance calculation
            player.position.z
        ));
        
        // Add bobbing motion to make zombies more zombie-like
        if (zombie.mesh.userData.isWalking) {
            const walkCycle = Math.sin((now * 0.005) + zombie.mesh.userData.walkOffset);
            const bobHeight = walkCycle * 0.2; // More pronounced bobbing
            const baseHeight = zombie.mesh.userData.isBoss ? 4.0 : 1.0; // Lowered from 5.0/1.5 to 4.0/1.0
            zombie.mesh.position.y = baseHeight + Math.abs(bobHeight);
            
            // Tilt side to side slightly
            zombie.mesh.rotation.z = walkCycle * 0.1;
        }
        
        // Always move zombie towards player regardless of distance
        // Calculate direction to player
        const direction = new THREE.Vector3(
            player.position.x - zombie.mesh.position.x,
            0, // Don't move up/down
            player.position.z - zombie.mesh.position.z
        ).normalize();
        
        // Calculate intended position
        const speed = zombie.mesh.userData.isBoss ? zombieSpeed * 0.9 : zombieSpeed;
        const newX = zombie.mesh.position.x + direction.x * speed;
        const newZ = zombie.mesh.position.z + direction.z * speed;
        
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
            zombie.mesh.position.x = newX;
            zombie.mesh.position.z = newZ;
        } else {
            // Try to navigate around obstacles by trying different directions
            // Try moving only in X direction
            const newXOnly = zombie.mesh.position.x + direction.x * speed;
            let canMoveX = true;
            
            for (const boundary of collisionBoundaries) {
                if (newXOnly + zombieCollisionRadius > boundary.minX && 
                    newXOnly - zombieCollisionRadius < boundary.maxX && 
                    zombie.mesh.position.z + zombieCollisionRadius > boundary.minZ && 
                    zombie.mesh.position.z - zombieCollisionRadius < boundary.maxZ) {
                    canMoveX = false;
                    break;
                }
            }
            
            if (canMoveX) {
                zombie.mesh.position.x = newXOnly;
            }
            
            // Try moving only in Z direction
            const newZOnly = zombie.mesh.position.z + direction.z * speed;
            let canMoveZ = true;
            
            for (const boundary of collisionBoundaries) {
                if (zombie.mesh.position.x + zombieCollisionRadius > boundary.minX && 
                    zombie.mesh.position.x - zombieCollisionRadius < boundary.maxX && 
                    newZOnly + zombieCollisionRadius > boundary.minZ && 
                    newZOnly - zombieCollisionRadius < boundary.maxZ) {
                    canMoveZ = false;
                    break;
                }
            }
            
            if (canMoveZ) {
                zombie.mesh.position.z = newZOnly;
            }
        }
        
        // Rotate zombie to face player directly
        zombie.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        
        // Attack player if close enough
        if (distanceToPlayer < (zombie.mesh.userData.isBoss ? 8 : 2) && !player.isGameOver) { // Larger attack range for boss
            attackPlayer(zombie);
        }
    }
}

// Function to handle zombie attacking player
function attackPlayer(zombie) {
    const now = Date.now();
    
    if (now - player.lastDamageTime > player.damageCooldown) {
        // Apply damage to player
        player.health -= zombie.mesh.userData.damage;
        player.lastDamageTime = now;
        
        // Show damage flash
        damageFlash();
        
        // Update health display
        updateHealthDisplay();
        
        // Zombie attack animation - lunge forward slightly
        const direction = new THREE.Vector3(
            player.position.x - zombie.mesh.position.x,
            0,
            player.position.z - zombie.mesh.position.z
        ).normalize();
        
        zombie.mesh.position.x += direction.x * 0.5;
        zombie.mesh.position.z += direction.z * 0.5;
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
            if (zombie.mesh.userData.health <= 0) continue;
            
            // Check distance between bullet and zombie (simple collision detection)
            const distance = bullet.position.distanceTo(zombie.mesh.position);
            
            // Adjust hit radius based on whether it's a boss
            const hitRadius = zombie.mesh.userData.isBoss ? 5 : 1.5; // Increased boss hit radius from 3 to 5
            
            if (distance < hitRadius) { // If bullet hits zombie
                // Damage zombie - regular zombies die in one hit, boss takes bullet damage
                if (zombie.mesh.userData.isBoss) {
                    // Make sure boss takes damage
                    zombie.mesh.userData.health = Math.max(0, zombie.mesh.userData.health - bullet.userData.damage);
                    console.log(`Boss hit! Health: ${zombie.mesh.userData.health}/${zombie.mesh.userData.maxHealth}`);
                } else {
                    zombie.mesh.userData.health = 0; // Regular zombies die in one hit
                }
                
                // Create blood effect
                createBloodEffect(bullet.position.clone());
                
                // Remove bullet
                scene.remove(bullet);
                bullets.splice(i, 1);
                
                // Show health bar for all zombies when hit
                zombie.mesh.children.forEach(child => {
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
                if (zombie.mesh.userData.health <= 0) {
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
    
    zombie.mesh.children.forEach(child => {
        if (child.userData.isHealthBar) {
            healthBar = child;
            
            // Calculate health percentage
            const healthPercent = Math.max(0, zombie.mesh.userData.health / zombie.mesh.userData.maxHealth);
            
            // Update health bar scale
            healthBar.scale.x = healthPercent;
            
            // Adjust position to keep left-aligned
            const barWidth = zombie.mesh.userData.isBoss ? 8 : 1; // Updated from 3 to 8 for boss
            healthBar.position.x = (1 - healthPercent) * (-barWidth/2);
        }
    });
    
    // If we couldn't find the health bar, log an error
    if (!healthBar && zombie.mesh.userData.health > 0) {
        console.error("Could not find health bar for zombie", zombie);
    }
}

// Function to handle zombie death
function handleZombieDeath(zombie, index) {
    // Increase player score (boss worth more points)
    player.score += zombie.mesh.userData.isBoss ? 100 : 10;
    updateScoreDisplay();
    
    // Check if this is the boss zombie
    if (zombie.mesh.userData.isBoss) {
        console.log("Boss zombie killed! Eliminating all remaining zombies.");
        
        // Show a special message
        showWaveMessage("Boss Defeated!");
        setTimeout(() => {
            hideWaveMessage();
        }, 2000);
        
        // Kill all remaining zombies
        for (let i = zombies.length - 1; i >= 0; i--) {
            if (zombies[i] !== zombie && zombies[i].mesh.userData.health > 0) {
                // Award points for each zombie
                player.score += 10;
                
                // Set zombie health to 0
                zombies[i].mesh.userData.health = 0;
                
                // Create death effect for each zombie
                createBloodEffect(zombies[i].mesh.position.clone());
                
                // Make them fall over
                zombies[i].mesh.userData.isWalking = false;
                zombies[i].mesh.rotation.x = Math.PI / 2;
                zombies[i].mesh.position.y = 0.5; // Position on ground
                
                // Schedule removal
                const currentZombie = zombies[i];
                setTimeout(() => {
                    if (currentZombie.mesh.parent === scene) {
                        scene.remove(currentZombie.mesh);
                        const idx = zombies.indexOf(currentZombie);
                        if (idx !== -1) {
                            zombies.splice(idx, 1);
                        }
                    }
                }, 1000);
            }
        }
        
        // Set zombies remaining to 1 (just the boss that's being processed)
        waveSystem.zombiesRemaining = 1;
        updateWaveIndicator();
        
        // Update score display with the bonus points
        updateScoreDisplay();
        
        // Add a delayed check to ensure wave completion is triggered
        setTimeout(() => {
            console.log("Forcing wave completion after boss death");
            waveSystem.zombiesRemaining = 0;
            checkWaveCompletion();
        }, 3500); // Slightly longer than the zombie removal timeout
    }
    
    // Decrement zombies remaining in the wave
    waveSystem.zombiesRemaining = Math.max(0, waveSystem.zombiesRemaining - 1);
    
    // Update the wave indicator
    updateWaveIndicator();
    
    // Death animation - fall over
    zombie.mesh.userData.isWalking = false;
    zombie.mesh.rotation.x = Math.PI / 2; // Fall forward
    
    // Set position to rest on the floor
    // For a boss, we need to account for its larger size
    const bodyRadius = zombie.mesh.userData.isBoss ? 0.5 * 2 : 0.5; // Body radius (scaled for boss - now 2x instead of 10x)
    zombie.mesh.position.y = bodyRadius; // Position exactly on the floor based on body radius
    
    // Store the timeout ID in the zombie object for cleanup
    zombie.mesh.userData.removalTimeoutId = setTimeout(() => {
        // Only remove if the zombie still exists in the scene
        if (zombie.mesh.parent === scene && zombies.includes(zombie)) {
            scene.remove(zombie.mesh);
            zombies.splice(zombies.indexOf(zombie), 1);
            
            // Check if wave is complete
            checkWaveCompletion();
        }
    }, 3000); // Remove after 3 seconds
    
    // Create blood effect at zombie position
    createBloodEffect(zombie.mesh.position.clone());
}

// Function to restart game
function restartGame() {
    // Clear any pending zombie removal timeouts
    zombies.forEach(zombie => {
        if (zombie.mesh.userData.removalTimeoutId) {
            clearTimeout(zombie.mesh.userData.removalTimeoutId);
        }
    });
    
    // Remove game over or win display
    const gameEndDisplay = document.querySelector('div:not(#crosshair):not(.score-display):not(.health-display):not(.wave-display):not(#startScreen):not(#pauseMenu):not(#startScreenOverlay)');
    if (gameEndDisplay) {
        document.body.removeChild(gameEndDisplay);
    }
    
    // Hide start screen overlay if visible
    const startScreenOverlay = document.getElementById('startScreenOverlay');
    if (startScreenOverlay) {
        startScreenOverlay.style.display = 'none';
    }
    
    // Resume background music
    audioSystem.resumeBackgroundMusic();
    
    // Reset player state
    player.health = player.maxHealth;
    player.score = 0;
    player.isGameOver = false;
    player.position.set(0, playerHeight, 10); // Changed from z=5 to z=10
    player.rotation.horizontal = 0;
    player.rotation.vertical = 0;
    
    // Reset game state
    gameState.isPaused = false;
    gameState.isGameOver = false;
    gameState.currentWave = 1;
    gameState.isWaveInProgress = false;
    gameState.isWaveTransition = false;
    
    // Reset wave system
    waveSystem.currentWave = 1;
    waveSystem.isWaveInProgress = false;
    waveSystem.isWaveTransition = false;
    updateWaveIndicator();
    
    // Remove all zombies
    for (let i = zombies.length - 1; i >= 0; i--) {
        scene.remove(zombies[i].mesh);
    }
    zombies.length = 0;
    
    // Remove all bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        scene.remove(bullets[i]);
    }
    bullets.length = 0;
    
    // Update displays
    updateHealthDisplay();
    updateScoreDisplay();
    
    // Re-lock pointer
    managePointerLock(true);
    
    // Show crosshair
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.display = 'block';
    }
    
    // Show radar
    radar.style.display = 'block';
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
healthDisplay.classList.add('game-ui'); // Add game-ui class
document.body.appendChild(healthDisplay);

const healthBar = document.createElement('div');
healthBar.style.width = '100%';
healthBar.style.height = '100%';
healthBar.style.backgroundColor = 'green';
healthBar.style.transition = 'width 0.3s ease-out';
healthDisplay.appendChild(healthBar);

// Function to update health display
function updateHealthDisplay() {
    // Check if player is already dead
    if (player.isGameOver) return;
    
    // Check if player health is zero or below
    if (player.health <= 0) {
        player.health = 0; // Ensure health doesn't go negative
        handleGameOver();
        return;
    }
    
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
scoreDisplay.classList.add('game-ui'); // Add game-ui class
document.body.appendChild(scoreDisplay);

// Function to update score display
function updateScoreDisplay() {
    scoreDisplay.innerHTML = `Score: ${player.score}`;
}

// Function to handle secret hotkey to skip wave
function checkHotkeys() {
    // P key to toggle pause
    if (keys['p'] && !keysCooldown['p']) {
        keysCooldown['p'] = true;
        console.log("P key pressed, toggling pause"); // Debug log
        
        // Toggle pause state
        togglePause();
    }
    
    // Z key to skip current wave (only if game is started and not paused)
    if (keys['z'] && !keysCooldown['z'] && gameState.isStarted && !gameState.isPaused) {
        keysCooldown['z'] = true;
        console.log("Z key pressed, skipping wave"); // Debug log
        
        // Only if a wave is in progress and not in transition
        if (waveSystem.isWaveInProgress && !waveSystem.isWaveTransition) {
            // Remove all zombies
            for (let i = zombies.length - 1; i >= 0; i--) {
                scene.remove(zombies[i].mesh);
            }
            zombies.length = 0;
            
            // Set zombies remaining to 0 to trigger wave completion
            waveSystem.zombiesRemaining = 0;
            
            // Show secret message
            showWaveMessage("Wave Skipped!");
            setTimeout(hideWaveMessage, 1500);
            
            // Award some points for skipping
            player.score += 25;
            updateScoreDisplay();
            
            // Check wave completion to move to the next wave
            checkWaveCompletion();
        }
    }
}

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
    // Only allow pausing if the game has started
    if (!gameState.isStarted) return;
    
    // Toggle pause state
    gameState.isPaused = !gameState.isPaused;
    
    console.log("Pause toggled:", gameState.isPaused); // Debug log
    
    // Get pause menu element
    const pauseMenu = document.getElementById('pauseMenu');
    if (!pauseMenu) {
        console.error("Pause menu element not found!");
        return;
    }
    
    if (gameState.isPaused) {
        // Show pause menu
        pauseMenu.style.display = 'block';
        
        // Hide radar
        radar.style.display = 'none';
        
        // Pause background music
        audioSystem.pauseBackgroundMusic();
        
        // Unlock pointer when paused
        managePointerLock(false);
    } else {
        // Hide pause menu
        pauseMenu.style.display = 'none';
        
        // Show radar
        radar.style.display = 'block';
        
        // Resume background music
        audioSystem.resumeBackgroundMusic();
        
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
    
    // Only render if game has started or is in game over state
    if (!gameState.isStarted && !player.isGameOver) {
        // For the start screen, we want a static background
        // No camera rotation to avoid disorientation
        
        // Just render the scene
        renderer.render(scene, camera);
        return;
    }
    
    // Check for hotkeys regardless of game state
    checkHotkeys();
    
    // Only update game if not game over and not paused
    if (!player.isGameOver && !gameState.isPaused) {
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
        checkWeaponPickups(); // Check for weapon pickups
        
        // Update radar with zombie positions
        updateRadar();
        
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
        // If paused but not game over, render at reduced frame rate
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
    
    // Pause background music
    audioSystem.pauseBackgroundMusic();
    
    // Hide radar
    radar.style.display = 'none';
    
    // Create game over display
    const gameOverDisplay = document.createElement('div');
    gameOverDisplay.className = 'game-menu';
    gameOverDisplay.style.zIndex = '1000';
    
    // Add game over message
    const gameOverTitle = document.createElement('h1');
    gameOverTitle.textContent = 'YOU DIED';
    gameOverTitle.className = 'game-title';
    gameOverDisplay.appendChild(gameOverTitle);
    
    // Add score
    const scoreText = document.createElement('p');
    scoreText.textContent = `Final Score: ${player.score}`;
    scoreText.style.fontSize = '24px';
    scoreText.style.marginBottom = '30px';
    gameOverDisplay.appendChild(scoreText);
    
    // Add wave reached
    const waveText = document.createElement('p');
    waveText.textContent = `Waves Survived: ${gameState.currentWave}`;
    waveText.style.fontSize = '20px';
    waveText.style.marginBottom = '30px';
    gameOverDisplay.appendChild(waveText);
    
    // Add restart button
    const restartButton = document.createElement('button');
    restartButton.textContent = 'RESTART';
    
    // Add restart functionality
    restartButton.onclick = function() {
        // Remove the game over display
        document.body.removeChild(gameOverDisplay);
        
        // Restart the game
        restartGame();
    };
    
    gameOverDisplay.appendChild(restartButton);
    document.body.appendChild(gameOverDisplay);
    
    // Play death sound if available
    // if (soundEffects.death) soundEffects.death.play();
}

// Function to clear collision boundaries that intersect with paths
function clearPathCollisionBoundaries() {
    // Define the main path bounds (north-south path)
    const mainPathMinX = -3; // 6 units wide, centered at x=0
    const mainPathMaxX = 3;
    const mainPathMinZ = -30; // 60 units long, centered at z=0
    const mainPathMaxZ = 30;
    
    // Define the cross path bounds (east-west path)
    const crossPathMinX = -30; // 60 units long, centered at x=0
    const crossPathMaxX = 30;
    const crossPathMinZ = -3; // 6 units wide, centered at z=0
    const crossPathMaxZ = 3;
    
    // Filter out boundaries that intersect with the paths, except for the well
    const newBoundaries = [];
    
    for (let i = 0; i < collisionBoundaries.length; i++) {
        const boundary = collisionBoundaries[i];
        
        // Always keep the well boundary
        if (boundary.type === 'well') {
            newBoundaries.push(boundary);
            continue;
        }
        
        // Check if boundary intersects with main path
        const intersectsMainPath = 
            boundary.maxX > mainPathMinX && 
            boundary.minX < mainPathMaxX && 
            boundary.maxZ > mainPathMinZ && 
            boundary.minZ < mainPathMaxZ;
            
        // Check if boundary intersects with cross path
        const intersectsCrossPath = 
            boundary.maxX > crossPathMinX && 
            boundary.minX < crossPathMaxX && 
            boundary.maxZ > crossPathMinZ && 
            boundary.minZ < crossPathMaxZ;
            
        // If it doesn't intersect with either path, keep it
        if (!intersectsMainPath && !intersectsCrossPath) {
            newBoundaries.push(boundary);
        }
    }
    
    // Replace the collision boundaries array with our filtered version
    collisionBoundaries.length = 0;
    collisionBoundaries.push(...newBoundaries);
}

// Call this function after creating all buildings and before the game starts
clearPathCollisionBoundaries();

// Function to update radar with zombie positions
function updateRadar() {
    // Clear previous zombie dots (but keep the player dot)
    radar.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; background-color: white; border-radius: 50%; transform: translate(-50%, -50%);"></div>';
    
    // Radar range (how far zombies can be detected)
    const radarRange = 50; // units in game world
    
    // Get player's forward direction vector
    const playerForward = new THREE.Vector3(0, 0, -1); // Forward is -Z in Three.js
    // Rotate this vector by the player's horizontal rotation
    playerForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.horizontal);
    
    // For each zombie, add a dot to the radar
    zombies.forEach(zombie => {
        // Skip dead zombies
        if (zombie.mesh.userData.health <= 0) return;
        
        // Get direction vector from player to zombie
        const zombieDirection = new THREE.Vector3(
            zombie.mesh.position.x - player.position.x,
            0, // Ignore Y component for 2D radar
            zombie.mesh.position.z - player.position.z
        );
        
        // Calculate distance
        const distance = zombieDirection.length();
        
        // Only show zombies within radar range
        if (distance <= radarRange) {
            // Normalize the zombie direction vector
            const normalizedZombieDir = zombieDirection.clone().normalize();
            
            // Calculate the angle between player's forward and zombie direction
            // First, we need to calculate dot product
            const dotProduct = playerForward.dot(normalizedZombieDir);
            
            // To determine if zombie is on left or right, we need cross product
            const crossProduct = new THREE.Vector3();
            crossProduct.crossVectors(playerForward, normalizedZombieDir);
            
            // Arc cosine of dot product gives us the angle
            let angle = Math.acos(Math.max(-1, Math.min(1, dotProduct))); // Clamp to avoid floating point errors
            
            // Determine if zombie is on left or right side
            if (crossProduct.y < 0) {
                angle = -angle;
            }
            
            // Normalize the distance for radar scaling
            const normalizedDistance = distance / radarRange;
            
            // FLIP X-AXIS to fix the inverted left/right issue
            // This changes how we convert polar coordinates to radar coordinates
            const radarX = 0.5 - Math.sin(angle) * normalizedDistance * 0.5; // Note the minus sign
            const radarY = 0.5 - Math.cos(angle) * normalizedDistance * 0.5;
            
            // Create zombie dot
            const zombieDot = document.createElement('div');
            zombieDot.style.position = 'absolute';
            zombieDot.style.left = (radarX * 100) + '%';
            zombieDot.style.top = (radarY * 100) + '%';
            zombieDot.style.width = '4px';
            zombieDot.style.height = '4px';
            zombieDot.style.backgroundColor = 'red';
            zombieDot.style.borderRadius = '50%';
            zombieDot.style.transform = 'translate(-50%, -50%)';
            
            // Add dot to radar
            radar.appendChild(zombieDot);
        }
    });
}