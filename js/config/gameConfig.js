// Game Configuration Constants
export const MOVEMENT = {
    SPEED: 0.1,
    MOUSE_SENSITIVITY: 0.002,
    PLAYER_HEIGHT: 2,
    PLAYER_COLLISION_RADIUS: 0.5,
    ZOMBIE_COLLISION_RADIUS: 0.8
};

export const WEAPONS = {
    PISTOL: {
        COOLDOWN: 300,
        DAMAGE: 100
    },
    SHOTGUN: {
        COOLDOWN: 600,
        DAMAGE: 100,
        SPREAD: 0.1,
        DEFAULT_AMMO: 100
    },
    MACHINEGUN: {
        COOLDOWN: 100,
        DAMAGE: 40,
        DEFAULT_AMMO: 300
    }
};

export const WAVE_SYSTEM = {
    MAX_WAVES: 5,
    ZOMBIES_PER_WAVE: [6, 10, 14, 20, 1],
    TRANSITION_DURATION: 0
};

export const PLAYER = {
    MAX_HEALTH: 100,
    DAMAGE_COOLDOWN: 1000,
    INITIAL_POSITION: { x: 0, y: 2, z: 5 }
};

export const ZOMBIE = {
    SPEED: 0.03,
    SPAWN_INTERVAL: 5000,
    MAX_ZOMBIES: 20,
    DETECTION_RANGE: 30,
    REGULAR: {
        HEALTH: 100,
        DAMAGE: 10,
        ATTACK_RANGE: 2
    },
    BOSS: {
        HEALTH: 200,
        DAMAGE: 30,
        ATTACK_RANGE: 8,
        SCALE: 10
    }
};

export const LIGHTING = {
    FLASHLIGHT: {
        COLOR: 0xffffee,
        INTENSITY: 10,
        DISTANCE: 50,
        MIN_ANGLE: Math.PI / 32,
        MAX_ANGLE: Math.PI / 4,
        MIN_DISTANCE: 1.5,
        MAX_DISTANCE: 30
    },
    PLAYER_LIGHT: {
        COLOR: 0xffffee,
        INTENSITY: 0.5,
        DISTANCE: 5
    }
};

export const COLORS = {
    SKY: 0x001a33,
    GROUND: 0x1a472a,
    MOONLIGHT: 0x8aa7cf,
    AMBIENT: 0x152238
}; 