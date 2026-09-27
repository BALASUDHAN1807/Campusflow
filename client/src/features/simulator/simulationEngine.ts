import { SimulationConfig, SimulationToken, SimulationEvent, SimulationStats } from '@/types';

export interface SimulationStepState {
  stepIndex: number;
  tokens: SimulationToken[];
  servingToken: SimulationToken | null;
  completedTokens: SimulationToken[];
  currentEvent: SimulationEvent | null;
  stats: SimulationStats;
  isComplete: boolean;
}

/**
 * Initializes deterministic tokens for the simulation.
 */
export function createInitialTokens(config: SimulationConfig): SimulationToken[] {
  const { studentCount, maxSkips, heldStudentCount } = config;
  const tokens: SimulationToken[] = [];

  // Deterministically assign Smart Hold to specific tokens
  // E.g., if 3 held students out of 10: token #1, token #3, token #5 (or first N depending on count)
  const heldIndices = new Set<number>();
  if (heldStudentCount > 0) {
    if (heldStudentCount === 1) {
      heldIndices.add(0); // Token #1
    } else if (heldStudentCount === 2) {
      heldIndices.add(0); // Token #1
      heldIndices.add(2); // Token #3
    } else if (heldStudentCount === 3) {
      heldIndices.add(0); // Token #1
      heldIndices.add(2); // Token #3
      heldIndices.add(4); // Token #5
    } else {
      for (let i = 0; i < Math.min(heldStudentCount, studentCount); i++) {
        heldIndices.add(i * 2 < studentCount ? i * 2 : i);
      }
    }
  }

  for (let i = 0; i < studentCount; i++) {
    const tokenNum = i + 1;
    const isHeld = heldIndices.has(i);
    tokens.push({
      id: `sim-token-${tokenNum}`,
      tokenNumber: tokenNum,
      label: `Student ${tokenNum < 10 ? '0' + tokenNum : tokenNum}`,
      position: i + 1,
      skipCount: 0,
      maxSkips,
      holdActive: isHeld,
      status: isHeld ? 'HOLD' : 'WAITING',
    });
  }

  return tokens;
}

/**
 * Re-indexes position numbers in the queue (1-indexed).
 */
export function reindexPositions(tokens: SimulationToken[]): SimulationToken[] {
  return tokens.map((t, idx) => ({
    ...t,
    position: idx + 1,
  }));
}

/**
 * Executes a single step of the Bounded Fair-Skip simulation algorithm.
 * Returns the next state and event.
 */
export function executeSimulationStep(
  currentState: SimulationStepState,
  config: SimulationConfig
): SimulationStepState {
  const { tokens, servingToken, completedTokens, stats, stepIndex } = currentState;
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  // If a token is currently SERVING, complete it first
  if (servingToken) {
    const completedToken: SimulationToken = {
      ...servingToken,
      status: 'COMPLETED',
    };

    const newCompleted = [...completedTokens, completedToken];
    const newStats: SimulationStats = {
      ...stats,
      completed: newCompleted.length,
    };

    const event: SimulationEvent = {
      id: `sim-evt-${stepIndex + 1}`,
      time: timeStr,
      tokenNumber: servingToken.tokenNumber,
      type: 'COMPLETED',
      message: `Token #${servingToken.tokenNumber} completed consultation. Desk is ready for next student.`,
    };

    const isComplete = tokens.length === 0;

    return {
      stepIndex: stepIndex + 1,
      tokens: reindexPositions(tokens),
      servingToken: null,
      completedTokens: newCompleted,
      currentEvent: event,
      stats: newStats,
      isComplete,
    };
  }

  // If no tokens remain in waiting queue, simulation is done
  if (tokens.length === 0) {
    return {
      ...currentState,
      isComplete: true,
      currentEvent: {
        id: `sim-evt-${stepIndex + 1}`,
        time: timeStr,
        tokenNumber: 0,
        type: 'COMPLETED',
        message: 'All students in queue have been processed.',
      },
    };
  }

  // Check if ALL remaining tokens in queue have active holds
  const allHeld = tokens.every((t) => t.holdActive);
  if (allHeld) {
    // If all are held, release the first token's hold as if timer expired to allow progress
    const updatedTokens = tokens.map((t, i) =>
      i === 0 ? { ...t, holdActive: false, status: 'WAITING' as const } : t
    );
    const event: SimulationEvent = {
      id: `sim-evt-${stepIndex + 1}`,
      time: timeStr,
      tokenNumber: updatedTokens[0].tokenNumber,
      type: 'HOLD_ACTIVE',
      message: `Token #${updatedTokens[0].tokenNumber}'s Smart Hold expired. Token resumed normal waiting status.`,
    };

    return {
      ...currentState,
      stepIndex: stepIndex + 1,
      tokens: updatedTokens,
      currentEvent: event,
    };
  }

  // Examine front token
  const frontToken = tokens[0];

  // CASE 1: Front token is ready (No active hold) -> becomes SERVING
  if (!frontToken.holdActive) {
    const remainingTokens = tokens.slice(1);
    const newServingToken: SimulationToken = {
      ...frontToken,
      status: 'SERVING',
    };

    const event: SimulationEvent = {
      id: `sim-evt-${stepIndex + 1}`,
      time: timeStr,
      tokenNumber: frontToken.tokenNumber,
      type: 'SERVING',
      message: `Token #${frontToken.tokenNumber} called to Desk. Student is now SERVING.`,
    };

    return {
      stepIndex: stepIndex + 1,
      tokens: reindexPositions(remainingTokens),
      servingToken: newServingToken,
      completedTokens,
      currentEvent: event,
      stats,
      isComplete: false,
    };
  }

  // CASE 2: Front token HAS an active Smart Hold -> Bounded Fair-Skip evaluation
  const currentSkips = frontToken.skipCount;
  const newSkipCount = currentSkips + 1;

  // Check if reached max fairness skips limit
  if (newSkipCount >= config.maxSkips) {
    // Moved to Tail!
    const ejectedToken: SimulationToken = {
      ...frontToken,
      skipCount: newSkipCount,
      status: 'MOVED_TO_TAIL',
    };

    // Remove from front and append to tail
    const reorderedTokens = [...tokens.slice(1), ejectedToken];

    const newStats: SimulationStats = {
      ...stats,
      totalTemporarySkips: stats.totalTemporarySkips + 1,
      movedToTail: stats.movedToTail + 1,
    };

    const event: SimulationEvent = {
      id: `sim-evt-${stepIndex + 1}`,
      time: timeStr,
      tokenNumber: frontToken.tokenNumber,
      type: 'MOVED_TO_TAIL',
      message: `Token #${frontToken.tokenNumber} reached fairness limit (${newSkipCount}/${config.maxSkips} skips). Moved to queue tail.`,
      skipCount: newSkipCount,
      maxSkips: config.maxSkips,
    };

    return {
      stepIndex: stepIndex + 1,
      tokens: reindexPositions(reorderedTokens),
      servingToken: null,
      completedTokens,
      currentEvent: event,
      stats: newStats,
      isComplete: false,
    };
  } else {
    // Temporary Bounded Fair-Skip: Step back exactly ONE position
    const skippedToken: SimulationToken = {
      ...frontToken,
      skipCount: newSkipCount,
      status: 'HOLD',
    };

    // Swap position 0 with position 1
    const reorderedTokens = [...tokens];
    if (reorderedTokens.length > 1) {
      reorderedTokens[0] = reorderedTokens[1];
      reorderedTokens[1] = skippedToken;
    } else {
      reorderedTokens[0] = skippedToken;
    }

    const newStats: SimulationStats = {
      ...stats,
      totalTemporarySkips: stats.totalTemporarySkips + 1,
    };

    const event: SimulationEvent = {
      id: `sim-evt-${stepIndex + 1}`,
      time: timeStr,
      tokenNumber: frontToken.tokenNumber,
      type: 'SKIPPED',
      message: `Token #${frontToken.tokenNumber} temporarily skipped due to Smart Hold (Skip ${newSkipCount}/${config.maxSkips}). Stepped back 1 position.`,
      skipCount: newSkipCount,
      maxSkips: config.maxSkips,
    };

    return {
      stepIndex: stepIndex + 1,
      tokens: reindexPositions(reorderedTokens),
      servingToken: null,
      completedTokens,
      currentEvent: event,
      stats: newStats,
      isComplete: false,
    };
  }
}

/**
 * Runs the full deterministic simulation from start to end.
 * Useful for tests and instant preview.
 */
export function runFullSimulation(config: SimulationConfig): {
  initialTokens: SimulationToken[];
  finalTokens: SimulationToken[];
  completedTokens: SimulationToken[];
  events: SimulationEvent[];
  stats: SimulationStats;
} {
  const initialTokens = createInitialTokens(config);
  let state: SimulationStepState = {
    stepIndex: 0,
    tokens: [...initialTokens],
    servingToken: null,
    completedTokens: [],
    currentEvent: null,
    stats: {
      tokensProcessed: config.studentCount,
      smartHoldTokens: config.heldStudentCount,
      totalTemporarySkips: 0,
      movedToTail: 0,
      completed: 0,
      maxSkips: config.maxSkips,
    },
    isComplete: false,
  };

  const events: SimulationEvent[] = [];
  let maxSafetyLoops = 100;

  while (!state.isComplete && maxSafetyLoops > 0) {
    state = executeSimulationStep(state, config);
    if (state.currentEvent) {
      events.push(state.currentEvent);
    }
    maxSafetyLoops--;
  }

  return {
    initialTokens,
    finalTokens: state.tokens,
    completedTokens: state.completedTokens,
    events,
    stats: state.stats,
  };
}
