import * as THREE from 'three';
import { PLAYER, MOVEMENT, WEAPONS, LIGHTING } from '../config/gameConfig.js';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.position = new THREE.Vector3(
            PLAYER.INITIAL_POSITION.x,
            PLAYER.INITIAL_POSITION.y,
            PLAYER.INITIAL_POSITION.z
        );
        this.rotation = {
            horizontal: 0,
            vertical: 0
        };
        this.setupPlayerState();
        this.setupLighting();
    }

    setupPlayerState() {
        this.health = PLAYER.MAX_HEALTH;
        this.maxHealth = PLAYER.MAX_HEALTH;
        this.score = 0;
        this.lastDamageTime = 0;
        this.damageCooldown = PLAYER.DAMAGE_COOLDOWN;
        this.isGameOver = false;

        // Weapon system
        this.currentWeapon = 'pistol';
        this.shotgunAmmo = 0;
        this.machinegunAmmo = 0;
        this.lastShootTime = 0;
    }

    setupLighting() {
        // Flashlight
        this.flashlight = new THREE.SpotLight(
            LIGHTING.FLASHLIGHT.COLOR,
            LIGHTING.FLASHLIGHT.INTENSITY,
            LIGHTING.FLASHLIGHT.DISTANCE,
            LIGHTING.FLASHLIGHT.MIN_ANGLE
        );
        this.flashlight.position.copy(this.camera.position);
        this.scene.add(this.flashlight);

        // Flashlight target
        this.flashlightTarget = new THREE.Object3D();
        this.scene.add(this.flashlightTarget);
        this.flashlight.target = this.flashlightTarget;

        // Player light
        this.playerLight = new THREE.PointLight(
            LIGHTING.PLAYER_LIGHT.COLOR,
            LIGHTING.PLAYER_LIGHT.INTENSITY,
            LIGHTING.PLAYER_LIGHT.DISTANCE
        );
        this.camera.add(this.playerLight);
    }

    update(inputState) {
        if (this.isGameOver) return;

        this.updateMovement(inputState);
        this.updateRotation();
        this.updateLighting();
    }

    updateMovement(inputState) {
        if (!inputState.pointerLock.isLocked) return;

        const direction = new THREE.Vector3();
        
        if (inputState.keys.w) direction.z -= 1;
        if (inputState.keys.s) direction.z += 1;
        if (inputState.keys.a) direction.x -= 1;
        if (inputState.keys.d) direction.x += 1;

        if (direction.lengthSq() > 0) {
            direction.normalize();
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.horizontal);
            
            this.position.add(direction.multiplyScalar(MOVEMENT.SPEED));
            this.camera.position.copy(this.position);
        }
    }

    updateRotation() {
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.x = this.rotation.vertical;
        this.camera.rotation.y = this.rotation.horizontal;
        this.camera.rotation.z = 0;
    }

    updateLighting() {
        // Update flashlight position
        this.flashlight.position.copy(this.camera.position);

        // Calculate flashlight target
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.normalize();
        this.flashlightTarget.position.copy(this.camera.position)
            .add(direction.multiplyScalar(20));

        // Update player light
        this.playerLight.position.copy(this.camera.position);
    }

    takeDamage(amount) {
        const now = Date.now();
        if (now - this.lastDamageTime > this.damageCooldown) {
            this.health = Math.max(0, this.health - amount);
            this.lastDamageTime = now;
            return true;
        }
        return false;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    addScore(points) {
        this.score += points;
    }

    getWeaponCooldown() {
        return WEAPONS[this.currentWeapon.toUpperCase()].COOLDOWN;
    }

    getWeaponDamage() {
        return WEAPONS[this.currentWeapon.toUpperCase()].DAMAGE;
    }
} 