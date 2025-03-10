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
        
        // Scale factor for boss - make it 2x the size of normal zombies
        // Reduce overall size by 20%
        const scale = this.isBoss ? 1.6 : 0.8; // Boss is 2x the size of normal zombies
        
        // Add slight randomization to make each zombie unique
        const randomFactor = Math.random() * 0.2 + 0.9; // 0.9 to 1.1
        
        // Base colors - using the low-poly style from the reference image
        const skinColor = this.isBoss ? 0x8B0000 : 0x7da87b; // Dark red skin for boss, greenish for regular zombies
        const hairColor = this.isBoss ? 0x222222 : (Math.random() > 0.7 ? 0x3a2e27 : (Math.random() > 0.5 ? 0x553311 : 0x222222)); // Black hair for boss
        const shirtColor = this.isBoss ? 0xCCCCCC : (Math.random() > 0.5 ? 0x8B4513 : 0x556B2F); // Light gray armor for boss
        const pantsColor = this.isBoss ? 0x999999 : (Math.random() > 0.5 ? 0x4B3621 : 0x5F5F5F); // Gray armor for boss
        const bloodColor = 0x8a0303; // Dark red blood
        
        // HEAD - Low poly style
        const headGeometry = new THREE.BoxGeometry(0.8 * scale, 0.9 * scale, 0.8 * scale);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: skinColor,
            roughness: 0.9,
            metalness: this.isBoss ? 0.3 : 0.1 // More metallic look for boss
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
        
        // Eyes - glowing for boss, white squares with black pupils for regular
        const eyeSocketGeometry = new THREE.BoxGeometry(0.2 * scale, 0.15 * scale, 0.05 * scale);
        const eyeSocketMaterial = new THREE.MeshBasicMaterial({ 
            color: this.isBoss ? 0x000000 : 0x000000 
        });
        
        const leftEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
        leftEyeSocket.position.set(-0.2 * scale, 0.1 * scale, 0.4 * scale);
        head.add(leftEyeSocket);
        
        const rightEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
        rightEyeSocket.position.set(0.2 * scale, 0.1 * scale, 0.4 * scale);
        head.add(rightEyeSocket);
        
        const eyeGeometry = new THREE.BoxGeometry(0.1 * scale, 0.08 * scale, 0.06 * scale);
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: this.isBoss ? 0xFF6600 : 0xffffff, // Glowing orange eyes for boss
            emissive: this.isBoss ? 0xFF6600 : 0x000000,
            emissiveIntensity: this.isBoss ? 1 : 0
        });
        
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
        
        // Add more blood for boss
        if (this.isBoss) {
            // Blood streaks down face
            const faceBloodGeometry = new THREE.BoxGeometry(0.6 * scale, 0.7 * scale, 0.05 * scale);
            const faceBlood = new THREE.Mesh(faceBloodGeometry, bloodMaterial);
            faceBlood.position.set(0, -0.3 * scale, 0.41 * scale);
            head.add(faceBlood);
            
            // Add a crown/helmet for the boss
            const crownGeometry = new THREE.BoxGeometry(1 * scale, 0.3 * scale, 1 * scale);
            const crownMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333, 
                metalness: 0.7,
                roughness: 0.3
            });
            const crown = new THREE.Mesh(crownGeometry, crownMaterial);
            crown.position.set(0, 0.6 * scale, 0);
            head.add(crown);
            
            // Add spikes to the crown
            const spikeGeometry = new THREE.ConeGeometry(0.1 * scale, 0.3 * scale, 4);
            const spikeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x666666,
                metalness: 0.8,
                roughness: 0.2
            });
            
            // Add multiple spikes around the crown
            for (let i = 0; i < 4; i++) {
                const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
                const angle = (i / 4) * Math.PI * 2;
                spike.position.set(
                    Math.sin(angle) * 0.4 * scale,
                    0.2 * scale,
                    Math.cos(angle) * 0.4 * scale
                );
                crown.add(spike);
            }
        }
        
        // TORSO - Villager style with simple tunic/shirt or armor for boss
        const torsoGeometry = new THREE.BoxGeometry(
            0.9 * scale, 
            1.2 * scale, 
            0.5 * scale
        );
        const torsoMaterial = new THREE.MeshStandardMaterial({ 
            color: shirtColor,
            roughness: this.isBoss ? 0.5 : 0.9,
            metalness: this.isBoss ? 0.5 : 0.1 // More metallic for boss armor
        });
        const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
        torso.position.y = 0.9 * scale;
        torso.castShadow = true;
        zombie.add(torso);
        
        // Add armor plates for boss
        if (this.isBoss) {
            // Shoulder pads
            const shoulderPadGeometry = new THREE.BoxGeometry(0.4 * scale, 0.3 * scale, 0.6 * scale);
            const armorMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x777777,
                metalness: 0.7,
                roughness: 0.3
            });
            
            const leftShoulder = new THREE.Mesh(shoulderPadGeometry, armorMaterial);
            leftShoulder.position.set(-0.5 * scale, 0.5 * scale, 0);
            torso.add(leftShoulder);
            
            const rightShoulder = new THREE.Mesh(shoulderPadGeometry, armorMaterial);
            rightShoulder.position.set(0.5 * scale, 0.5 * scale, 0);
            torso.add(rightShoulder);
            
            // Chest plate with blood
            const chestPlateGeometry = new THREE.BoxGeometry(0.7 * scale, 0.8 * scale, 0.1 * scale);
            const chestPlate = new THREE.Mesh(chestPlateGeometry, armorMaterial);
            chestPlate.position.set(0, 0.1 * scale, 0.3 * scale);
            torso.add(chestPlate);
        }
        
        // Add a rope belt or metal belt for boss
        const beltGeometry = new THREE.BoxGeometry(0.95 * scale, 0.1 * scale, 0.55 * scale);
        const beltMaterial = new THREE.MeshStandardMaterial({ 
            color: this.isBoss ? 0x444444 : 0x5C4033,
            metalness: this.isBoss ? 0.7 : 0.1
        });
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.position.set(0, -0.4 * scale, 0);
        torso.add(belt);
        
        // Add blood splatter on shirt/armor
        const bloodSplatterGeometry = new THREE.BoxGeometry(
            this.isBoss ? 0.9 * scale : 0.7 * scale, 
            this.isBoss ? 0.9 * scale : 0.7 * scale, 
            0.06 * scale
        );
        const bloodSplatter = new THREE.Mesh(bloodSplatterGeometry, bloodMaterial);
        bloodSplatter.position.set(
            Math.random() * 0.3 * scale, 
            -0.2 * scale, 
            0.26 * scale
        );
        bloodSplatter.rotation.z = Math.random() * Math.PI / 4;
        torso.add(bloodSplatter);
        
        // Add more blood for boss
        if (this.isBoss) {
            const extraBloodGeometry = new THREE.BoxGeometry(0.8 * scale, 0.8 * scale, 0.06 * scale);
            const extraBlood = new THREE.Mesh(extraBloodGeometry, bloodMaterial);
            extraBlood.position.set(-0.2 * scale, 0.3 * scale, 0.26 * scale);
            extraBlood.rotation.z = Math.random() * Math.PI / 2;
            torso.add(extraBlood);
        }
        
        // ARMS - Classic zombie pose with arms stretched out in front
        
        // Left arm - one piece stretched straight out
        const leftArmGeometry = new THREE.BoxGeometry(0.2 * scale, 0.2 * scale, 1.2 * scale);
        const armMaterial = new THREE.MeshStandardMaterial({ 
            color: this.isBoss ? 0x999999 : skinColor,
            metalness: this.isBoss ? 0.5 : 0.1,
            roughness: this.isBoss ? 0.5 : 0.9
        });
        const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
        // Position at shoulder and extend forward
        leftArm.position.set(-0.45 * scale, 1.1 * scale, 0.6 * scale);
        leftArm.name = 'leftArm';
        zombie.add(leftArm);
        
        // Left hand at end of arm
        const handGeometry = new THREE.BoxGeometry(0.25 * scale, 0.25 * scale, 0.25 * scale);
        const handMaterial = new THREE.MeshStandardMaterial({ 
            color: this.isBoss ? 0x8B0000 : skinColor,
            metalness: this.isBoss ? 0.3 : 0.1
        });
        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(0, 0, 0.6 * scale);
        leftHand.rotation.x = -0.3; // Slight downward angle
        leftHand.name = 'leftHand';
        leftArm.add(leftHand);
        
        // Add simple fingers to left hand
        const fingerGeometry = new THREE.BoxGeometry(0.05 * scale, 0.15 * scale, 0.05 * scale);
        const fingerMaterial = new THREE.MeshStandardMaterial({ 
            color: this.isBoss ? 0x8B0000 : skinColor 
        });
        
        // For boss, add claws instead of fingers
        if (this.isBoss) {
            const clawGeometry = new THREE.ConeGeometry(0.05 * scale, 0.2 * scale, 4);
            const clawMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                metalness: 0.7,
                roughness: 0.3
            });
            
            for (let i = 0; i < 3; i++) {
                const claw = new THREE.Mesh(clawGeometry, clawMaterial);
                claw.position.set((i - 1) * 0.07 * scale, -0.1 * scale, 0.1 * scale);
                claw.rotation.x = -0.5; // Angle claws forward
                leftHand.add(claw);
            }
            
            // Add blood to claws
            const clawBloodGeometry = new THREE.BoxGeometry(0.2 * scale, 0.05 * scale, 0.1 * scale);
            const clawBlood = new THREE.Mesh(clawBloodGeometry, bloodMaterial);
            clawBlood.position.set(0, -0.15 * scale, 0.15 * scale);
            leftHand.add(clawBlood);
        } else {
            for (let i = 0; i < 3; i++) {
                const finger = new THREE.Mesh(fingerGeometry, fingerMaterial);
                finger.position.set((i - 1) * 0.07 * scale, -0.1 * scale, 0.05 * scale);
                finger.rotation.x = -0.3; // Curl fingers
                leftHand.add(finger);
            }
        }
        
        // Right arm - one piece stretched straight out
        const rightArmGeometry = new THREE.BoxGeometry(0.2 * scale, 0.2 * scale, 1.2 * scale);
        const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
        // Position at shoulder and extend forward
        rightArm.position.set(0.45 * scale, 1.1 * scale, 0.6 * scale);
        rightArm.name = 'rightArm';
        zombie.add(rightArm);
        
        // For boss, add armor plates to arms
        if (this.isBoss) {
            // Arm plates
            const armPlateGeometry = new THREE.BoxGeometry(0.25 * scale, 0.25 * scale, 0.8 * scale);
            const armPlateMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x666666,
                metalness: 0.7,
                roughness: 0.3
            });
            
            const leftArmPlate = new THREE.Mesh(armPlateGeometry, armPlateMaterial);
            leftArmPlate.position.set(0, 0, -0.2 * scale);
            leftArm.add(leftArmPlate);
            
            const rightArmPlate = new THREE.Mesh(armPlateGeometry, armPlateMaterial);
            rightArmPlate.position.set(0, 0, -0.2 * scale);
            rightArm.add(rightArmPlate);
            
            // Add spikes to right arm
            const armSpikeGeometry = new THREE.ConeGeometry(0.08 * scale, 0.2 * scale, 4);
            const armSpikeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x444444,
                metalness: 0.8,
                roughness: 0.2
            });
            
            for (let i = 0; i < 3; i++) {
                const spike = new THREE.Mesh(armSpikeGeometry, armSpikeMaterial);
                spike.position.set(0, 0.15 * scale, (i * 0.3 - 0.3) * scale);
                spike.rotation.x = -Math.PI / 2;
                rightArm.add(spike);
            }
        }
        
        // Right hand at end of arm
        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(0, 0, 0.6 * scale);
        rightHand.rotation.x = -0.3; // Slight downward angle
        rightHand.name = 'rightHand';
        rightArm.add(rightHand);
        
        // Add simple fingers to right hand or weapon for boss
        if (this.isBoss) {
            // Add a weapon to the right hand for boss
            const weaponGeometry = new THREE.BoxGeometry(0.15 * scale, 0.15 * scale, 0.8 * scale);
            const weaponMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                metalness: 0.8,
                roughness: 0.2
            });
            const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
            weapon.position.set(0, 0, 0.4 * scale);
            rightHand.add(weapon);
            
            // Add blade to weapon
            const bladeGeometry = new THREE.BoxGeometry(0.3 * scale, 0.05 * scale, 0.4 * scale);
            const bladeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x888888,
                metalness: 0.9,
                roughness: 0.1
            });
            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            blade.position.set(0, 0, 0.5 * scale);
            weapon.add(blade);
            
            // Add blood to blade
            const bladeBloodGeometry = new THREE.BoxGeometry(0.3 * scale, 0.06 * scale, 0.2 * scale);
            const bladeBlood = new THREE.Mesh(bladeBloodGeometry, bloodMaterial);
            bladeBlood.position.set(0, 0.01 * scale, 0.1 * scale);
            blade.add(bladeBlood);
        } else {
            for (let i = 0; i < 3; i++) {
                const finger = new THREE.Mesh(fingerGeometry, fingerMaterial);
                finger.position.set((i - 1) * 0.07 * scale, -0.1 * scale, 0.05 * scale);
                finger.rotation.x = -0.3; // Curl fingers
                rightHand.add(finger);
            }
        }
        
        // LEGS - Low poly style
        // Pants
        const pantsGeometry = new THREE.BoxGeometry(0.9 * scale, 0.4 * scale, 0.5 * scale);
        const pantsMaterial = new THREE.MeshStandardMaterial({ 
            color: pantsColor,
            metalness: this.isBoss ? 0.5 : 0.1,
            roughness: this.isBoss ? 0.5 : 0.9
        });
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
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: pantsColor,
            metalness: this.isBoss ? 0.5 : 0.1,
            roughness: this.isBoss ? 0.5 : 0.9
        });
        
        const leftUpperLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
        leftUpperLeg.position.set(-0.25 * scale, -0.6 * scale, 0);
        leftUpperLeg.name = 'leftUpperLeg';
        zombie.add(leftUpperLeg);
        
        // Add armor plates to legs for boss
        if (this.isBoss) {
            // Knee guards
            const kneeGuardGeometry = new THREE.BoxGeometry(0.4 * scale, 0.3 * scale, 0.4 * scale);
            const kneeGuardMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x666666,
                metalness: 0.7,
                roughness: 0.3
            });
            
            const leftKneeGuard = new THREE.Mesh(kneeGuardGeometry, kneeGuardMaterial);
            leftKneeGuard.position.set(0, -0.4 * scale, 0.05 * scale);
            leftUpperLeg.add(leftKneeGuard);
            
            // Add spikes to knee guards
            const kneeSpike = new THREE.Mesh(
                new THREE.ConeGeometry(0.08 * scale, 0.2 * scale, 4),
                new THREE.MeshStandardMaterial({ 
                    color: 0x444444,
                    metalness: 0.8,
                    roughness: 0.2
                })
            );
            kneeSpike.position.set(0, 0, 0.2 * scale);
            kneeSpike.rotation.x = -Math.PI / 2;
            leftKneeGuard.add(kneeSpike);
        } else {
            // Add blood/tear on left leg for regular zombies
            const legTearGeometry = new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.4 * scale);
            const legTear = new THREE.Mesh(legTearGeometry, bloodMaterial);
            legTear.position.set(0, -0.2 * scale, 0.1 * scale);
            legTear.scale.set(1, 1, 0.1); // Flatten it
            leftUpperLeg.add(legTear);
        }
        
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
        const footMaterial = new THREE.MeshStandardMaterial({ 
            color: this.isBoss ? 0x444444 : 0x4B3621,
            metalness: this.isBoss ? 0.7 : 0.1,
            roughness: this.isBoss ? 0.3 : 0.9
        }); // Brown leather or metal boots for boss
        const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        leftFoot.position.set(0, -0.45 * scale, 0.1 * scale);
        leftFoot.name = 'leftFoot';
        leftLowerLeg.add(leftFoot);
        
        // Add metal spikes to boss boots
        if (this.isBoss) {
            const bootSpikeGeometry = new THREE.ConeGeometry(0.05 * scale, 0.15 * scale, 4);
            const bootSpikeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                metalness: 0.8,
                roughness: 0.2
            });
            
            const frontSpike = new THREE.Mesh(bootSpikeGeometry, bootSpikeMaterial);
            frontSpike.position.set(0, 0, 0.25 * scale);
            frontSpike.rotation.x = -Math.PI / 2;
            leftFoot.add(frontSpike);
        }
        
        // Right leg
        const rightUpperLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
        rightUpperLeg.position.set(0.25 * scale, -0.6 * scale, 0);
        rightUpperLeg.name = 'rightUpperLeg';
        zombie.add(rightUpperLeg);
        
        // Add armor to right leg for boss
        if (this.isBoss) {
            // Knee guard
            const rightKneeGuard = new THREE.Mesh(
                new THREE.BoxGeometry(0.4 * scale, 0.3 * scale, 0.4 * scale),
                new THREE.MeshStandardMaterial({ 
                    color: 0x666666,
                    metalness: 0.7,
                    roughness: 0.3
                })
            );
            rightKneeGuard.position.set(0, -0.4 * scale, 0.05 * scale);
            rightUpperLeg.add(rightKneeGuard);
            
            // Add spikes to knee guard
            const rightKneeSpike = new THREE.Mesh(
                new THREE.ConeGeometry(0.08 * scale, 0.2 * scale, 4),
                new THREE.MeshStandardMaterial({ 
                    color: 0x444444,
                    metalness: 0.8,
                    roughness: 0.2
                })
            );
            rightKneeSpike.position.set(0, 0, 0.2 * scale);
            rightKneeSpike.rotation.x = -Math.PI / 2;
            rightKneeGuard.add(rightKneeSpike);
            
            // Add leg armor plate
            const legArmorGeometry = new THREE.BoxGeometry(0.4 * scale, 0.6 * scale, 0.1 * scale);
            const legArmorMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x777777,
                metalness: 0.7,
                roughness: 0.3
            });
            const legArmor = new THREE.Mesh(legArmorGeometry, legArmorMaterial);
            legArmor.position.set(0, 0.1 * scale, 0.2 * scale);
            rightUpperLeg.add(legArmor);
        }
        
        // Lower right leg
        const rightLowerLeg = new THREE.Mesh(
            lowerLegGeometry, 
            this.isBoss ? legMaterial : new THREE.MeshStandardMaterial({ color: skinColor })
        ); // Exposed leg for regular zombies, armored for boss
        rightLowerLeg.position.set(0, -0.8 * scale, 0);
        rightLowerLeg.name = 'rightLowerLeg';
        rightUpperLeg.add(rightLowerLeg);
        
        // Right foot - simple sandal/boot
        const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        rightFoot.position.set(0, -0.45 * scale, 0.1 * scale);
        rightFoot.name = 'rightFoot';
        rightLowerLeg.add(rightFoot);
        
        // Add metal spikes to boss boots
        if (this.isBoss) {
            const bootSpikeGeometry = new THREE.ConeGeometry(0.05 * scale, 0.15 * scale, 4);
            const bootSpikeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                metalness: 0.8,
                roughness: 0.2
            });
            
            const frontSpike = new THREE.Mesh(bootSpikeGeometry, bootSpikeMaterial);
            frontSpike.position.set(0, 0, 0.25 * scale);
            frontSpike.rotation.x = -Math.PI / 2;
            rightFoot.add(frontSpike);
        }
        
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
        
        // Add glowing effect for boss
        if (this.isBoss) {
            // Add a subtle glow around the boss
            const glowGeometry = new THREE.SphereGeometry(5 * scale, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xFF3300,
                transparent: true,
                opacity: 0.1,
                side: THREE.BackSide
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.y = 2 * scale;
            zombie.add(glow);
            
            // Add a ground effect under the boss
            const groundEffectGeometry = new THREE.CircleGeometry(4 * scale, 16);
            const groundEffectMaterial = new THREE.MeshBasicMaterial({
                color: 0xFF3300,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide
            });
            const groundEffect = new THREE.Mesh(groundEffectGeometry, groundEffectMaterial);
            groundEffect.rotation.x = -Math.PI / 2; // Lay flat on ground
            groundEffect.position.y = -1.4;
            zombie.add(groundEffect);
        }
        
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