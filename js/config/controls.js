import { MOVEMENT } from './gameConfig.js';

// Key mappings
export const KEYS = {
    FORWARD: 'w',
    BACKWARD: 's',
    LEFT: 'a',
    RIGHT: 'd',
    SKIP_WAVE: 'z',
    PAUSE: 'p'
};

// Initial input state
export const createInputState = () => ({
    keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        z: false,
        p: false
    },
    mouse: {
        isDown: false,
        sensitivity: MOVEMENT.MOUSE_SENSITIVITY
    },
    pointerLock: {
        isLocked: false
    }
});

// Input event handlers
export const setupInputHandlers = (inputState, canvas, callbacks) => {
    const { onMove, onShoot, onKeyAction } = callbacks;

    // Keyboard events
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        if (inputState.keys.hasOwnProperty(key)) {
            inputState.keys[key] = true;
            onKeyAction?.(key, true);
        }
    });

    document.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        if (inputState.keys.hasOwnProperty(key)) {
            inputState.keys[key] = false;
            onKeyAction?.(key, false);
        }
    });

    // Mouse events
    document.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // Left mouse button
            inputState.mouse.isDown = true;
            onShoot?.(true);
        }
    });

    document.addEventListener('mouseup', (event) => {
        if (event.button === 0) {
            inputState.mouse.isDown = false;
            onShoot?.(false);
        }
    });

    document.addEventListener('mousemove', (event) => {
        if (inputState.pointerLock.isLocked) {
            onMove?.(event.movementX, event.movementY);
        }
    });

    // Pointer lock events
    document.addEventListener('pointerlockchange', () => {
        inputState.pointerLock.isLocked = document.pointerLockElement === canvas;
        if (!inputState.pointerLock.isLocked) {
            inputState.mouse.isDown = false;
            onShoot?.(false);
        }
    });

    // Click to request pointer lock
    canvas.addEventListener('click', () => {
        if (!inputState.pointerLock.isLocked) {
            canvas.requestPointerLock();
        }
    });
}; 