import { Scene } from './Scene.js';
import { Player } from '../entities/Player.js';
import { createInputState, setupInputHandlers } from '../config/controls.js';

export class Game {
    constructor() {
        this.scene = new Scene();
        this.player = new Player(this.scene, this.scene.camera);
        this.inputState = createInputState();
        this.gameState = {
            isPaused: false,
            isGameOver: false
        };

        this.setupInputHandlers();
        this.setupBasicScene();
    }

    setupInputHandlers() {
        setupInputHandlers(this.inputState, this.scene.getCanvas(), {
            onMove: (dx, dy) => this.handleMouseMove(dx, dy),
            onShoot: (isDown) => this.handleShoot(isDown),
            onKeyAction: (key, isDown) => this.handleKeyAction(key, isDown)
        });
    }

    setupBasicScene() {
        this.scene.setupBasicLighting();
        this.scene.setupGround();
    }

    handleMouseMove(dx, dy) {
        if (this.gameState.isPaused || this.gameState.isGameOver) return;

        this.player.rotation.horizontal -= dx * this.inputState.mouse.sensitivity;
        this.player.rotation.vertical -= dy * this.inputState.mouse.sensitivity;
        
        // Limit vertical rotation
        this.player.rotation.vertical = Math.max(
            -Math.PI/2 + 0.01,
            Math.min(Math.PI/2 - 0.01, this.player.rotation.vertical)
        );
    }

    handleShoot(isDown) {
        if (this.gameState.isPaused || this.gameState.isGameOver) return;
        // Shooting logic will be implemented in WeaponSystem
    }

    handleKeyAction(key, isDown) {
        if (key === 'p' && isDown) {
            this.togglePause();
        }
    }

    togglePause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        if (this.gameState.isPaused) {
            document.exitPointerLock();
        }
    }

    update() {
        if (!this.gameState.isPaused && !this.gameState.isGameOver) {
            this.player.update(this.inputState);
            // Other update logic will be added here
        }
    }

    render() {
        this.scene.render();
    }

    start() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.update();
            this.render();
        };
        animate();
    }
} 