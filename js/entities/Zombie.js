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
        // Reduce overall size by 20%
        const scale = this.isBoss ? 8 : 0.8;
        
        // Add slight randomization to make each zombie unique
        const randomFactor = Math.random() * 0.2 + 0.9; // 0.9 to 1.1
        
        // Base colors - using the low-poly style from the reference image
        const skinColor = this.isBoss ? 0x8B0000 : 0x7da87b; // Greenish skin for zombies
        const hairColor = Math.random() > 0.7 ? 0x3a2e27 : (Math.random() > 0.5 ? 0x553311 : 0x222222); // Various hair colors
        const shirtColor = Math.random() > 0.5 ? 0x8B4513 : 0x556B2F; // Brown or dark olive green for villager clothes
        const pantsColor = Math.random() > 0.5 ? 0x4B3621 : 0x5F5F5F; // Brown or gray pants
        const bloodColor = 0x8a0303; // Dark red blood
        
        // HEAD - Low poly style
        const headGeometry = new THREE.BoxGeometry(0.8 * scale, 0.9 * scale, 0.8 * scale);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: skinColor,
            roughness: 0.9,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.1 * scale;
        head.castShadow = true;
        zombie.add(head);
        
        // Hair - simple box on top of head
        const hairGeometry = new THREE.BoxGeometry(0.85 * scale, 0.3 * scale, 0.85 * scale);
        const hairMaterial = new THREE.MeshStandardMaterial({ color: hairColor });
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 0.5 * scale;
        hair.position.z = 0.05 * scale; // Slightly forward
        head.add(hair);
        
        // Eyes - white squares with black pupils
        const eyeSocketGeometry = new THREE.BoxGeometry(0.2 * scale, 0.15 * scale, 0.05 * scale);
        const eyeSocketMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
        leftEyeSocket.position.set(-0.2 * scale, 0.1 * scale, 0.4 * scale);
        head.add(leftEyeSocket);
        
        const rightEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
        rightEyeSocket.position.set(0.2 * scale, 0.1 * scale, 0.4 * scale);
        head.add(rightEyeSocket);
        
        const eyeGeometry = new THREE.BoxGeometry(0.1 * scale, 0.08 * scale, 0.06 * scale);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0, 0, 0.01 * scale);
        leftEyeSocket.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0, 0, 0.01 * scale);
        rightEyeSocket.add(rightEye);
        
        // Mouth - bloody jaw
        const jawGeometry = new THREE.BoxGeometry(0.5 * scale, 0.15 * scale, 0.1 * scale);
        const jawMaterial = new THREE.MeshStandardMaterial({ color: bloodColor });
        const jaw = new THREE.Mesh(jawGeometry, jawMaterial);
        jaw.position.set(0, -0.3 * scale, 0.4 * scale);
        jaw.name = 'jaw'; // Add name for animation
        head.add(jaw);
        
        // Add blood dripping from mouth
        const bloodDripGeometry = new THREE.BoxGeometry(0.4 * scale, 0.3 * scale, 0.05 * scale);
        const bloodMaterial = new THREE.MeshStandardMaterial({ 
            color: bloodColor,
            transparent: true,
            opacity: 0.9
        });
        const bloodDrip = new THREE.Mesh(bloodDripGeometry, bloodMaterial);
        bloodDrip.position.set(0, -0.2 * scale, 0);
        jaw.add(bloodDrip);
        
        // TORSO - Villager style with simple tunic/shirt
        const torsoGeometry = new THREE.BoxGeometry(
            0.9 * scale, 
            1.2 * scale, 
            0.5 * scale
        );
        const torsoMaterial = new THREE.MeshStandardMaterial({ 
            color: shirtColor,
            roughness: 0.9,
            metalness: 0.1
        });
        const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
        torso.position.y = 0.9 * scale;
        torso.castShadow = true;
        zombie.add(torso);
        
        // Add a rope belt
        const beltGeometry = new THREE.BoxGeometry(0.95 * scale, 0.1 * scale, 0.55 * scale);
        const beltMaterial = new THREE.MeshStandardMaterial({ color: 0x5C4033 }); // Brown rope color
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.position.set(0, -0.4 * scale, 0);
        torso.add(belt);
        
        // Add blood splatter on shirt
        const bloodSplatterGeometry = new THREE.BoxGeometry(0.7 * scale, 0.7 * scale, 0.06 * scale);
        const bloodSplatter = new THREE.Mesh(bloodSplatterGeometry, bloodMaterial);
        bloodSplatter.position.set(Math.random() * 0.3 * scale, -0.2 * scale, 0.26 * scale);
        bloodSplatter.rotation.z = Math.random() * Math.PI / 4;
        torso.add(bloodSplatter);
        
        // Add a torn patch
        const tornPatchGeometry = new THREE.BoxGeometry(0.3 * scale, 0.4 * scale, 0.06 * scale);
        const tornPatchMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x332211,
            roughness: 1.0
        });
        const tornPatch = new THREE.Mesh(tornPatchGeometry, tornPatchMaterial);
        tornPatch.position.set(Math.random() > 0.5 ? 0.3 : -0.3, 0.2 * scale, 0.26 * scale);
        torso.add(tornPatch);
        
        // ARMS - Classic zombie pose with arms stretched out in front
        
        // Left arm - one piece stretched straight out
        const leftArmGeometry = new THREE.BoxGeometry(0.2 * scale, 0.2 * scale, 1.2 * scale);
        const armMaterial = new THREE.MeshStandardMaterial({ color: skinColor });
        const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
        // Position at shoulder and extend forward
        leftArm.position.set(-0.45 * scale, 1.1 * scale, 0.6 * scale);
        leftArm.name = 'leftArm';
        zombie.add(leftArm);
        
        // Left hand at end of arm
        const handGeometry = new THREE.BoxGeometry(0.25 * scale, 0.25 * scale, 0.25 * scale);
        const leftHand = new THREE.Mesh(handGeometry, armMaterial);
        leftHand.position.set(0, 0, 0.6 * scale);
        leftHand.rotation.x = -0.3; // Slight downward angle
        leftHand.name = 'leftHand';
        leftArm.add(leftHand);
        
        // Add simple fingers to left hand
        const fingerGeometry = new THREE.BoxGeometry(0.05 * scale, 0.15 * scale, 0.05 * scale);
        for (let i = 0; i < 3; i++) {
            const finger = new THREE.Mesh(fingerGeometry, armMaterial);
            finger.position.set((i - 1) * 0.07 * scale, -0.1 * scale, 0.05 * scale);
            finger.rotation.x = -0.3; // Curl fingers
            leftHand.add(finger);
        }
        
        // Right arm - one piece stretched straight out
        const rightArmGeometry = new THREE.BoxGeometry(0.2 * scale, 0.2 * scale, 1.2 * scale);
        const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
        // Position at shoulder and extend forward
        rightArm.position.set(0.45 * scale, 1.1 * scale, 0.6 * scale);
        rightArm.name = 'rightArm';
        zombie.add(rightArm);
        
        // Right hand at end of arm
        const rightHand = new THREE.Mesh(handGeometry, armMaterial);
        rightHand.position.set(0, 0, 0.6 * scale);
        rightHand.rotation.x = -0.3; // Slight downward angle
        rightHand.name = 'rightHand';
        rightArm.add(rightHand);
        
        // Add simple fingers to right hand
        for (let i = 0; i < 3; i++) {
            const finger = new THREE.Mesh(fingerGeometry, armMaterial);
            finger.position.set((i - 1) * 0.07 * scale, -0.1 * scale, 0.05 * scale);
            finger.rotation.x = -0.3; // Curl fingers
            rightHand.add(finger);
        }
        
        // LEGS - Low poly style
        // Pants
        const pantsGeometry = new THREE.BoxGeometry(0.9 * scale, 0.4 * scale, 0.5 * scale);
        const pantsMaterial = new THREE.MeshStandardMaterial({ color: pantsColor });
        const pants = new THREE.Mesh(pantsGeometry, pantsMaterial);
        pants.position.set(0, 0.1 * scale, 0);
        pants.castShadow = true;
        zombie.add(pants);
        
        // Left leg
        const upperLegGeometry = new THREE.BoxGeometry(
            0.35 * scale, 
            0.8 * scale, 
            0.35 * scale
        );
        const legMaterial = new THREE.MeshStandardMaterial({ color: pantsColor });
        
        const leftUpperLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
        leftUpperLeg.position.set(-0.25 * scale, -0.6 * scale, 0);
        leftUpperLeg.name = 'leftUpperLeg';
        zombie.add(leftUpperLeg);
        
        // Add blood/tear on left leg
        const legTearGeometry = new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.4 * scale);
        const legTear = new THREE.Mesh(legTearGeometry, bloodMaterial);
        legTear.position.set(0, -0.2 * scale, 0.1 * scale);
        legTear.scale.set(1, 1, 0.1); // Flatten it
        leftUpperLeg.add(legTear);
        
        // Lower left leg
        const lowerLegGeometry = new THREE.BoxGeometry(
            0.3 * scale, 
            0.8 * scale, 
            0.3 * scale
        );
        const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
        leftLowerLeg.position.set(0, -0.8 * scale, 0);
        leftLowerLeg.name = 'leftLowerLeg';
        leftUpperLeg.add(leftLowerLeg);
        
        // Left foot - simple sandal/boot
        const footGeometry = new THREE.BoxGeometry(0.35 * scale, 0.15 * scale, 0.5 * scale);
        const footMaterial = new THREE.MeshStandardMaterial({ color: 0x4B3621 }); // Brown leather
        const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        leftFoot.position.set(0, -0.45 * scale, 0.1 * scale);
        leftFoot.name = 'leftFoot';
        leftLowerLeg.add(leftFoot);
        
        // Right leg
        const rightUpperLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
        rightUpperLeg.position.set(0.25 * scale, -0.6 * scale, 0);
        rightUpperLeg.name = 'rightUpperLeg';
        zombie.add(rightUpperLeg);
        
        // Lower right leg
        const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, skinColor); // Exposed leg - zombie damage
        rightLowerLeg.position.set(0, -0.8 * scale, 0);
        rightLowerLeg.name = 'rightLowerLeg';
        rightUpperLeg.add(rightLowerLeg);
        
        // Right foot - simple sandal/boot
        const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        rightFoot.position.set(0, -0.45 * scale, 0.1 * scale);
        rightFoot.name = 'rightFoot';
        rightLowerLeg.add(rightFoot);
        
        // Set zombie position
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
            
            // Tilt side to side slightly for shambling effect
            this.mesh.rotation.z = walkCycle * 0.1;
            
            // Rotate the whole body slightly for a more menacing look
            this.mesh.rotation.y = Math.sin((now * 0.001) + this.mesh.userData.walkOffset) * 0.1;
            
            // Find limbs by traversing the mesh hierarchy
            this.mesh.traverse((child) => {
                // Animate arms - simple up/down swaying
                if (child.name === 'leftArm') {
                    // Add slight up/down motion
                    child.rotation.x = Math.sin(walkCycle) * 0.1;
                    // Add slight side-to-side swaying
                    child.rotation.z = Math.sin(walkCycle * 0.7) * 0.1;
                }
                else if (child.name === 'rightArm') {
                    // Add slight up/down motion (opposite phase)
                    child.rotation.x = Math.sin(walkCycle + Math.PI) * 0.1;
                    // Add slight side-to-side swaying (opposite phase)
                    child.rotation.z = Math.sin(walkCycle * 0.7 + Math.PI) * 0.1;
                }
                // Animate hands for grasping motion
                else if (child.name === 'leftHand' || child.name === 'rightHand') {
                    // Make hands open and close slightly
                    child.rotation.x = -0.3 + Math.sin(walkCycle * 0.5) * 0.2;
                }
                // Animate legs - shambling gait
                else if (child.name === 'leftUpperLeg') {
                    child.rotation.x = Math.sin(walkCycle) * 0.4;
                }
                else if (child.name === 'rightUpperLeg') {
                    child.rotation.x = Math.sin(walkCycle + Math.PI) * 0.4; // Opposite phase
                }
                // Animate lower legs for more realistic walking
                else if (child.name === 'leftLowerLeg') {
                    child.rotation.x = Math.sin(walkCycle + Math.PI/2) * 0.3 + 0.2; // Add offset to keep bent
                }
                else if (child.name === 'rightLowerLeg') {
                    child.rotation.x = Math.sin(walkCycle + Math.PI*3/2) * 0.3 + 0.2; // Add offset to keep bent
                }
                // Animate jaw for chomping effect
                else if (child.name === 'jaw') {
                    child.rotation.x = Math.abs(Math.sin(walkCycle * 0.5)) * 0.3;
                }
            });
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
        // Stop walking animation
        this.mesh.userData.isWalking = false;
        
        // Fall forward
        this.mesh.rotation.x = Math.PI / 2;
        
        // Add more blood - scale based on zombie size
        const scale = this.isBoss ? 8 : 0.8; // Match the scale in createZombieMesh
        const bloodGeometry = new THREE.BoxGeometry(1 * scale, 0.05 * scale, 1 * scale);
        const bloodMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x8a0303,
            transparent: true,
            opacity: 0.8
        });
        const bloodPool = new THREE.Mesh(bloodGeometry, bloodMaterial);
        bloodPool.position.y = -0.9 * scale;
        bloodPool.rotation.x = -Math.PI / 2;
        this.mesh.add(bloodPool);
        
        // Schedule removal
        setTimeout(() => {
            if (onRemove) onRemove();
        }, 3000);
    }
} 