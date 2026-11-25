import { config } from '../config/config';

interface LoopCallbacks {
  render: (interpolation: number, frameDeltaSeconds: number) => void;
  update?: (deltaSeconds: number) => void;
}

export function startLoop({ update, render }: LoopCallbacks): () => void {
  const { fixedDeltaSeconds, maxFrameDeltaSeconds } = config.loop;
  let previousTime: number | undefined;
  let accumulator = 0;

  function frame(time: number) {
    const elapsed = (time - (previousTime ?? time)) / 1000;
    accumulator += Math.min(elapsed, maxFrameDeltaSeconds);
    previousTime = time;

    while (accumulator >= fixedDeltaSeconds) {
      update?.(fixedDeltaSeconds);
      accumulator -= fixedDeltaSeconds;
    }

    render(accumulator / fixedDeltaSeconds, elapsed);
    requestId = requestAnimationFrame(frame);
  }

  let requestId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(requestId);
}
