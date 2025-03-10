import * as THREE from 'three';
import { COLORS } from '../config/gameConfig.js';

export class Scene {
    constructor() {
        this.scene = new THREE.Scene();
        this.setupCamera();
        this.setupRenderer();
        this.setupResizeHandler();
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }, false);
    }

    setupBasicLighting() {
        // Moonlight
        const moonLight = new THREE.DirectionalLight(COLORS.MOONLIGHT, 0.5);
        moonLight.position.set(50, 100, 50);
        moonLight.castShadow = true;
        moonLight.shadow.camera.far = 300;
        moonLight.shadow.camera.left = -50;
        moonLight.shadow.camera.right = 50;
        moonLight.shadow.camera.top = 50;
        moonLight.shadow.camera.bottom = -50;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        this.scene.add(moonLight);

        // Ambient light
        const ambientLight = new THREE.AmbientLight(COLORS.AMBIENT, 0.3);
        this.scene.add(ambientLight);
    }

    setupGround() {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: COLORS.GROUND,
            roughness: 0.8,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    getCanvas() {
        return this.renderer.domElement;
    }
} 