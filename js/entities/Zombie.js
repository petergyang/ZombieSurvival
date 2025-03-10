import * as THREE from 'three';
import { ZOMBIE, MOVEMENT } from '../config/gameConfig.js';

export class Zombie {
    constructor(scene, x, z, isBoss = false) {
        this.scene = scene;
        this.isBoss = isBoss;
        this.mesh = this.createZombieMesh(x, z);
        this.scene.add(this.mesh);
    }

    createZombieMesh(x, z) {
        const zombie = new THREE.Group();
        
        // Scale factor for boss - make it building-sized
        const scale = this.isBoss ? 10 : 1;
        const color = this.isBoss ? 0x8B0000 : 0x2d9d2d; // Dark red for boss, green for regular
        
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
        const legGeometry = new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, 1.2 * scale, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: color });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.4 * scale, -0.6 * scale, 0);
        // Angle leg slightly outward
        leftLeg.rotation.z = 0.1;
        leftLeg.castShadow = true;
        zombie.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.4 * scale, -0.6 * scale, 0);
        // Angle leg slightly outward
        rightLeg.rotation.z = -0.1;
        rightLeg.castShadow = true;
        zombie.add(rightLeg);
        
        // Zombie eyes (red)
        const eyeGeometry = new THREE.SphereGeometry(0.1 * scale, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2 * scale, 2.2 * scale, 0.3 * scale);
        zombie.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2 * scale, 2.2 * scale, 0.3 * scale);
        zombie.add(rightEye);
        
        // Set zombie position - raise the zombie so legs are visible
        zombie.position.set(x, 1.5, z);
        
        // Add zombie data
        zombie.userData = {
            health: this.isBoss ? ZOMBIE.BOSS.HEALTH : ZOMBIE.REGULAR.HEALTH,
            maxHealth: this.isBoss ? ZOMBIE.BOSS.HEALTH : ZOMBIE.REGULAR.HEALTH,
            isWalking: true,
            walkOffset: Math.random() * Math.PI * 2, // Random starting phase for walking animation
            lastAnimationUpdate: Date.now(),
            type: 'zombie',
            isBoss: this.isBoss,
            damage: this.isBoss ? ZOMBIE.BOSS.DAMAGE : ZOMBIE.REGULAR.DAMAGE
        };
        
        // Add health bar
        this.addHealthBar(zombie);
        
        return zombie;
    }

    addHealthBar(zombie) {
        const scale = this.isBoss ? 10 : 1;
        const healthBarWidth = this.isBoss ? 8 : 1;
        const healthBarHeight = this.isBoss ? 0.5 : 0.1;
        const healthBarYPosition = this.isBoss ? 5 * scale : 2.8;
        
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
        if (!this.isBoss) {
            healthBarBg.visible = false;
            healthBarFg.visible = false;
        }
    }

    update(player, collisionBoundaries, now = Date.now()) {
        // Skip if zombie is dead
        if (this.mesh.userData.health <= 0) return;
        
        // Calculate distance to player
        const distanceToPlayer = this.mesh.position.distanceTo(new THREE.Vector3(
            player.position.x,
            0, // Ignore Y axis for distance calculation
            player.position.z
        ));
        
        // Add bobbing motion to make zombies more zombie-like
        if (this.mesh.userData.isWalking) {
            const walkCycle = Math.sin((now * 0.005) + this.mesh.userData.walkOffset);
            const bobHeight = walkCycle * 0.2; // More pronounced bobbing
            const baseHeight = this.isBoss ? 4.0 : 1.0;
            this.mesh.position.y = baseHeight + Math.abs(bobHeight);
            
            // Tilt side to side slightly
            this.mesh.rotation.z = walkCycle * 0.1;
        }
        
        // Move zombie towards player if within detection range
        if (distanceToPlayer < ZOMBIE.DETECTION_RANGE) {
            this.moveTowardsPlayer(player, collisionBoundaries, distanceToPlayer);
        } else {
            this.wander(collisionBoundaries, now);
        }
    }

    moveTowardsPlayer(player, collisionBoundaries, distanceToPlayer) {
        // Calculate direction to player
        const direction = new THREE.Vector3(
            player.position.x - this.mesh.position.x,
            0, // Don't move up/down
            player.position.z - this.mesh.position.z
        ).normalize();
        
        // Calculate intended position
        const speed = this.isBoss ? ZOMBIE.SPEED * 0.9 : ZOMBIE.SPEED;
        const newX = this.mesh.position.x + direction.x * speed;
        const newZ = this.mesh.position.z + direction.z * speed;
        
        // Check for collisions with buildings
        let canMove = true;
        for (const boundary of collisionBoundaries) {
            if (newX + MOVEMENT.ZOMBIE_COLLISION_RADIUS > boundary.minX && 
                newX - MOVEMENT.ZOMBIE_COLLISION_RADIUS < boundary.maxX && 
                newZ + MOVEMENT.ZOMBIE_COLLISION_RADIUS > boundary.minZ && 
                newZ - MOVEMENT.ZOMBIE_COLLISION_RADIUS < boundary.maxZ) {
                canMove = false;
                break;
            }
        }
        
        // Only move if no collision
        if (canMove) {
            this.mesh.position.x = newX;
            this.mesh.position.z = newZ;
        } else {
            // Try to navigate around obstacles by trying different directions
            this.navigateAroundObstacles(direction, speed, collisionBoundaries);
        }
        
        // Rotate zombie to face player
        this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        
        // Attack player if close enough
        const attackRange = this.isBoss ? ZOMBIE.BOSS.ATTACK_RANGE : ZOMBIE.REGULAR.ATTACK_RANGE;
        if (distanceToPlayer < attackRange && !player.isGameOver) {
            this.attack(player);
        }
    }

    navigateAroundObstacles(direction, speed, collisionBoundaries) {
        // Try moving only in X direction
        const newXOnly = this.mesh.position.x + direction.x * speed;
        let canMoveX = true;
        
        for (const boundary of collisionBoundaries) {
            if (newXOnly + MOVEMENT.ZOMBIE_COLLISION_RADIUS > boundary.minX && 
                newXOnly - MOVEMENT.ZOMBIE_COLLISION_RADIUS < boundary.maxX && 
                this.mesh.position.z + MOVEMENT.ZOMBIE_COLLISION_RADIUS > boundary.minZ && 
                this.mesh.position.z - MOVEMENT.ZOMBIE_COLLISION_RADIUS < boundary.maxZ) {
                canMoveX = false;
                break;
            }
        }
        
        if (canMoveX) {
            this.mesh.position.x = newXOnly;
        }
        
        // Try moving only in Z direction
        const newZOnly = this.mesh.position.z + direction.z * speed;
        let canMoveZ = true;
        
        for (const boundary of collisionBoundaries) {
            if (this.mesh.position.x + MOVEMENT.ZOMBIE_COLLISION_RADIUS > boundary.minX && 
                this.mesh.position.x - MOVEMENT.ZOMBIE_COLLISION_RADIUS < boundary.maxX && 
                newZOnly + MOVEMENT.ZOMBIE_COLLISION_RADIUS > boundary.minZ && 
                newZOnly - MOVEMENT.ZOMBIE_COLLISION_RADIUS < boundary.maxZ) {
                canMoveZ = false;
                break;
            }
        }
        
        if (canMoveZ) {
            this.mesh.position.z = newZOnly;
        }
    }

    wander(collisionBoundaries, now) {
        // Random wandering behavior
        const wanderAngle = now * 0.0005 + Math.random(); // Different for each zombie
        const newX = this.mesh.position.x + Math.sin(wanderAngle) * ZOMBIE.SPEED * 0.3;
        const newZ = this.mesh.position.z + Math.cos(wanderAngle) * ZOMBIE.SPEED * 0.3;
        
        // Check for collisions with buildings
        let canMove = true;
        for (const boundary of collisionBoundaries) {
            if (newX + MOVEMENT.ZOMBIE_COLLISION_RADIUS > boundary.minX && 
                newX - MOVEMENT.ZOMBIE_COLLISION_RADIUS < boundary.maxX && 
                newZ + MOVEMENT.ZOMBIE_COLLISION_RADIUS > boundary.minZ && 
                newZ - MOVEMENT.ZOMBIE_COLLISION_RADIUS < boundary.maxZ) {
                canMove = false;
                break;
            }
        }
        
        // Only move if no collision
        if (canMove) {
            this.mesh.position.x = newX;
            this.mesh.position.z = newZ;
        }
    }

    attack(player) {
        const now = Date.now();
        
        // Check if player can take damage (cooldown expired)
        if (now - player.lastDamageTime > player.damageCooldown) {
            // Apply damage to player
            const damaged = player.takeDamage(this.mesh.userData.damage);
            
            if (damaged) {
                // Zombie attack animation - lunge forward slightly
                const direction = new THREE.Vector3(
                    player.position.x - this.mesh.position.x,
                    0,
                    player.position.z - this.mesh.position.z
                ).normalize();
                
                // Store original position for animation
                const originalPosition = this.mesh.position.clone();
                
                // Lunge forward
                this.mesh.position.add(direction.multiplyScalar(0.5));
                
                // Return to original position after a short delay
                setTimeout(() => {
                    if (this.mesh.userData.health > 0) { // Only if zombie is still alive
                        this.mesh.position.copy(originalPosition);
                    }
                }, 200);
            }
        }
    }

    takeDamage(amount) {
        this.mesh.userData.health -= amount;
        
        // Show health bar when damaged for regular zombies
        if (!this.isBoss) {
            this.mesh.children.forEach(child => {
                if (child.userData.isHealthBar || child.material?.color?.r === 0) {
                    child.visible = true;
                }
            });
        }
        
        this.updateHealthBar();
        
        return this.mesh.userData.health <= 0;
    }

    updateHealthBar() {
        // Find the health bar in the zombie's children
        this.mesh.children.forEach(child => {
            if (child.userData.isHealthBar) {
                // Calculate health percentage
                const healthPercent = Math.max(0, this.mesh.userData.health / this.mesh.userData.maxHealth);
                
                // Update health bar scale
                child.scale.x = healthPercent;
                
                // Adjust position to keep left-aligned
                const barWidth = this.isBoss ? 8 : 1;
                child.position.x = (1 - healthPercent) * (-barWidth/2);
            }
        });
    }

    die(onRemove) {
        // Death animation - fall over
        this.mesh.userData.isWalking = false;
        this.mesh.rotation.x = Math.PI / 2; // Fall forward
        
        // Set position to rest on the floor
        const bodyRadius = this.isBoss ? 0.5 * 10 : 0.5; // Body radius (scaled for boss)
        this.mesh.position.y = bodyRadius; // Position exactly on the floor based on body radius
        
        // Remove after a delay
        setTimeout(() => {
            this.scene.remove(this.mesh);
            if (onRemove) onRemove(this);
        }, 3000);
    }
} 