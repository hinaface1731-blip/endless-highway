export const config = {
  loop: { fixedDeltaSeconds: 1 / 60, maxFrameDeltaSeconds: 0.1 },
  rendering: {
    maxPixelRatio: 1.35, mobilePixelRatio: 1.15, minResolutionScale: 0.55,
    resolutionStep: 0.83, sampleSeconds: 2, desktopFpsFloor: 50, mobileFpsFloor: 30,
  },
  camera: { fieldOfView: 58, near: 0.1, far: 1200, height: 4.7, distance: 10, lookAhead: 21, damping: 5 },
  world: {
    chunkLength: 50, ahead: 10, behind: 3, sampleSpacing: 2.5,
    roadWidth: 8.6, shoulderWidth: 1.45, maxTurnDegrees: 5, maxHeadingDegrees: 28,
    maxGrade: 0.085, noiseScale: 0.0052, grassPerChunk: 100, lodDistance: 155, rebaseInterval: 500,
    mountainSetback: 10, mountainPlacementStep: 8,
    terrainOffsets: [-185, -140, -100, -70, -48, -32, -21, -13, -8.5, -5.75, 0, 5.75, 8.5, 13, 21, 32, 48, 70, 100, 140, 185],
  },
  lighting: { sky: 0xffefd9, ground: 0xa38070, ambientIntensity: 2.05, sun: 0xffe8ce, sunIntensity: 2.15, sunPosition: [-35, 27, -42] },
  car: {
    initialDistance: 8, initialOffset: 1.55, initialSpeed: 0, maxSpeed: 36,
    acceleration: 9, braking: 20, rollingDrag: 1.4, lateralSpeed: 4.9, steerDamping: 7,
    startCash: 250, boostFactor: 1.2, boostSeconds: 20,
  },
  biomes: { minLength: 600, maxLength: 950, transition: 100 },
  billboards: { chance: 0.6, promptDistance: 10 },
  events: {
    chance: 0.27, cooldownChunks: 3, earliestChunk: 3, distanceInChunk: 34,
    weights: { police: 2, hitchhiker: 5, easter: 1, decoy: 1 },
    policeTriggerDistance: 35, policeApproachSeconds: 3.4, policeExitSeconds: 2.2, bribe: 40, fine: 80,
    hitchhikerAlertDistance: 39, hitchhikerDistance: 9, hitchhikerMaxSpeed: 0.6, easterDistance: 19,
  },
} as const;
