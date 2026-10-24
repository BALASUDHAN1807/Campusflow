import { useState, useEffect, useRef, useCallback } from "react";
import { createInitialTokens, executeSimulationStep } from "./simulationEngine";

const SPEED_INTERVALS = {
  slow: 2200,
  normal: 1200,
  fast: 600,
};

export function useFairnessSimulation(initialConfig) {
  const [config, setConfig] = useState({
    studentCount: initialConfig?.studentCount ?? 10,
    maxSkips: initialConfig?.maxSkips ?? 3,
    heldStudentCount: initialConfig?.heldStudentCount ?? 3,
    speed: initialConfig?.speed ?? "normal",
  });

  const [initialQueueSnapshot, setInitialQueueSnapshot] = useState(() =>
    createInitialTokens({
      studentCount: initialConfig?.studentCount ?? 10,
      maxSkips: initialConfig?.maxSkips ?? 3,
      heldStudentCount: initialConfig?.heldStudentCount ?? 3,
      speed: initialConfig?.speed ?? "normal",
    })
  );

  const [tokens, setTokens] = useState(() => [...initialQueueSnapshot]);
  const [servingToken, setServingToken] = useState(null);
  const [completedTokens, setCompletedTokens] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    tokensProcessed: 10,
    smartHoldTokens: 3,
    totalTemporarySkips: 0,
    movedToTail: 0,
    completed: 0,
    maxSkips: 3,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const timerRef = useRef(null);

  // Keep state in refs for interval access
  const stateRef = useRef({
    stepIndex: 0,
    tokens,
    servingToken,
    completedTokens,
    currentEvent: null,
    stats,
    isComplete: false,
  });

  useEffect(() => {
    stateRef.current = {
      stepIndex: events.length,
      tokens,
      servingToken,
      completedTokens,
      currentEvent: events[events.length - 1] || null,
      stats,
      isComplete,
    };
  }, [tokens, servingToken, completedTokens, events, stats, isComplete]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const reset = useCallback(
    (newConfig) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const activeConfig = newConfig || config;
      const freshTokens = createInitialTokens(activeConfig);
      setInitialQueueSnapshot(freshTokens);
      setTokens([...freshTokens]);
      setServingToken(null);
      setCompletedTokens([]);
      setEvents([]);
      setStats({
        tokensProcessed: activeConfig.studentCount,
        smartHoldTokens: activeConfig.heldStudentCount,
        totalTemporarySkips: 0,
        movedToTail: 0,
        completed: 0,
        maxSkips: activeConfig.maxSkips,
      });
      setIsRunning(false);
      setIsPaused(false);
      setIsComplete(false);
    },
    [config]
  );

  const updateConfig = useCallback(
    (updates) => {
      const updated = { ...config, ...updates };
      // Ensure held student count does not exceed student count
      if (updated.heldStudentCount > updated.studentCount) {
        updated.heldStudentCount = updated.studentCount;
      }
      setConfig(updated);
      reset(updated);
    },
    [config, reset]
  );

  const stepOnce = useCallback(() => {
    if (stateRef.current.isComplete) {
      setIsRunning(false);
      setIsComplete(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const nextState = executeSimulationStep(stateRef.current, config);

    setTokens(nextState.tokens);
    setServingToken(nextState.servingToken);
    setCompletedTokens(nextState.completedTokens);
    setStats(nextState.stats);
    if (nextState.currentEvent) {
      setEvents((prev) => [nextState.currentEvent, ...prev]);
    }
    if (nextState.isComplete) {
      setIsComplete(true);
      setIsRunning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [config]);

  const run = useCallback(() => {
    if (isComplete) {
      reset();
    }
    setIsRunning(true);
    setIsPaused(false);
  }, [isComplete, reset]);

  const pause = useCallback(() => {
    setIsRunning(false);
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  // Interval execution when running
  useEffect(() => {
    if (isRunning && !isPaused && !isComplete) {
      timerRef.current = setInterval(() => {
        stepOnce();
      }, SPEED_INTERVALS[config.speed]);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [isRunning, isPaused, isComplete, config.speed, stepOnce]);

  return {
    config,
    updateConfig,
    tokens,
    servingToken,
    completedTokens,
    initialQueueSnapshot,
    events,
    stats,
    isRunning,
    isPaused,
    isComplete,
    run,
    pause,
    resume,
    reset,
    stepOnce,
  };
}
