import { Zombie } from './Zombie.js';
import { ZOMBIE, WAVE_SYSTEM } from '../config/gameConfig.js';

export class ZombieManager {
    constructor(scene) {
        this.scene = scene;
        this.zombies = [];
        this.waveNumber = 0;
        this.zombiesRemaining = 0;
        this.isWaveInProgress = false;
        this.isGameComplete = false;
        this.spawnTimeouts = [];
    }

    startWave() {
        if (this.isWaveInProgress || this.isGameComplete) return;
        
        this.waveNumber++;
        
        // Check if all waves are complete
        if (this.waveNumber > WAVE_SYSTEM.MAX_WAVES) {
            this.isGameComplete = true;
            return true; // Game complete
        }
        
        const zombieCount = WAVE_SYSTEM.ZOMBIES_PER_WAVE[this.waveNumber - 1] || 10;
        this.zombiesRemaining = zombieCount;
        this.isWaveInProgress = true;
        
        // Spawn zombies gradually
        this.spawnWaveZombies();
        
        return false; // Wave started, game not complete
    }

    spawnWaveZombies() {
        const zombieCount = WAVE_SYSTEM.ZOMBIES_PER_WAVE[this.waveNumber - 1] || 10;
        const isFinalWave = this.waveNumber === WAVE_SYSTEM.MAX_WAVES;
        
        // Clear any existing spawn timeouts
        this.spawnTimeouts.forEach(timeout => clearTimeout(timeout));
        this.spawnTimeouts = [];
        
        // For the final wave, spawn a single boss zombie
        if (isFinalWave) {
            // Spawn boss zombie in the center
            this.spawnZombie(0, -30, true);
            return;
        }
        
        // Spawn regular zombies at intervals
        for (let i = 0; i < zombieCount; i++) {
            const timeout = setTimeout(() => {
                // Random position around the map
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 20; // Between 30-50 units from center
                const x = Math.sin(angle) * distance;
                const z = Math.cos(angle) * distance;
                
                this.spawnZombie(x, z, false);
            }, i * ZOMBIE.SPAWN_INTERVAL / zombieCount);
            
            this.spawnTimeouts.push(timeout);
        }
    }

    spawnZombie(x, z, isBoss = false) {
        const zombie = new Zombie(this.scene, x, z, isBoss);
        this.zombies.push(zombie);
        return zombie;
    }

    update(player, collisionBoundaries) {
        const now = Date.now();
        
        // Update all zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            
            // Skip if zombie is already dead
            if (zombie.mesh.userData.health <= 0) continue;
            
            zombie.update(player, collisionBoundaries, now);
        }
    }

    checkBulletCollisions(bullets, onZombieHit, onZombieDeath) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            for (let j = this.zombies.length - 1; j >= 0; j--) {
                const zombie = this.zombies[j];
                
                // Skip if zombie is already dead
                if (zombie.mesh.userData.health <= 0) continue;
                
                // Calculate distance between bullet and zombie
                const distance = bullet.position.distanceTo(zombie.mesh.position);
                
                // Adjust hit detection radius based on zombie type
                const hitRadius = zombie.isBoss ? 5 : 1;
                
                if (distance < hitRadius) {
                    // Get damage based on weapon type
                    const damage = bullet.userData.damage;
                    
                    // Apply damage to zombie
                    const killed = zombie.takeDamage(damage);
                    
                    // Call the hit callback
                    if (onZombieHit) {
                        onZombieHit(zombie, bullet);
                    }
                    
                    // If zombie is killed
                    if (killed) {
                        this.zombiesRemaining--;
                        
                        // Handle zombie death
                        zombie.die(() => {
                            // Remove zombie from array
                            const index = this.zombies.indexOf(zombie);
                            if (index !== -1) {
                                this.zombies.splice(index, 1);
                            }
                        });
                        
                        // Call the death callback
                        if (onZombieDeath) {
                            onZombieDeath(zombie);
                        }
                    }
                    
                    // Remove bullet
                    return { bulletIndex: i, hit: true };
                }
            }
        }
        
        return { hit: false };
    }

    checkWaveCompletion() {
        if (!this.isWaveInProgress) return false;
        
        // Check if all zombies for this wave are dead
        if (this.zombiesRemaining <= 0) {
            this.isWaveInProgress = false;
            return true;
        }
        
        return false;
    }

    reset() {
        // Clear any existing spawn timeouts
        this.spawnTimeouts.forEach(timeout => clearTimeout(timeout));
        this.spawnTimeouts = [];
        
        // Remove all zombies
        for (const zombie of this.zombies) {
            this.scene.remove(zombie.mesh);
        }
        
        this.zombies = [];
        this.waveNumber = 0;
        this.zombiesRemaining = 0;
        this.isWaveInProgress = false;
        this.isGameComplete = false;
    }
} 