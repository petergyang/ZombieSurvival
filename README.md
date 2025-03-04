# Zombie Survival Game

A first-person zombie survival game built with Three.js. Survive against waves of zombies in this simple but intense shooting experience.

## Game Overview

### Core Features
- First-person perspective
- Simple shooting mechanics
- Basic zombie AI
- Health system
- Wave-based zombie spawning

### Gameplay Elements

#### Player Mechanics
- WASD movement controls
- Mouse look for camera control
- Hold SPACE to shoot
- Health system (100 HP)
- Simple crosshair for aiming

#### Zombie Type
- Basic Zombie
  - Follows player
  - Moderate health
  - Deals damage on contact
  - Spawns in waves
  - Simple pathfinding

### Game Loop
1. Player starts with full health
2. Zombies spawn in waves
3. Player must shoot zombies to survive
4. Game ends when player's health reaches 0

## Technical Stack
- Three.js for 3D rendering
- JavaScript for game logic
- HTML5 Canvas for UI elements
- Basic 3D models for player and zombies

## Development Phases

### Phase 1: Basic Environment and Player Movement
- Set up Three.js project structure
- Create basic 3D environment (ground, sky)
- Implement first-person camera
- Add WASD movement controls
- Add mouse look controls
- Test basic movement and camera controls

### Phase 2: Shooting Mechanics
- Implement basic gun model
- Add shooting animation
- Create bullet system
- Add crosshair UI
- Implement bullet collision detection
- Test shooting mechanics

### Phase 3: Basic Zombie Implementation
- Create basic zombie model
- Implement zombie spawning system
- Add simple zombie movement
- Create basic zombie-player collision
- Test zombie behavior

### Phase 4: Zombie AI and Combat
- Implement zombie pathfinding
- Add zombie health system
- Create damage system
- Add wave-based spawning
- Test combat mechanics

### Phase 5: Polish and UI
- Add health system UI
- Implement game over state
- Add score system
- Create basic menu system
- Final testing and bug fixes

## Development Focus
Each phase will be developed and tested independently to ensure stability before moving to the next phase. This phased approach allows for:
1. Easier debugging and testing
2. Clear progress tracking
3. Manageable code complexity
4. Stable foundation for each feature
5. Better quality control

This phased development plan ensures a systematic approach to building the game, with each phase building upon the previous one's foundation.

This simplified specification focuses on core shooting mechanics and zombie survival, making it perfect for a Three.js-based web game. 