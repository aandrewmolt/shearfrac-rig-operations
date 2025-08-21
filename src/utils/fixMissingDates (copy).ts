import { useEffect, useRef, useCallback, MutableRefObject } from 'react';

/**
 * Manager for handling subscriptions and preventing memory leaks
 */
export class SubscriptionManager {
  private subscriptions: Map<string, () => void> = new Map();
  private eventListeners: Map<string, { element: EventTarget; handler: EventListener }[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private animationFrames: Map<string, number> = new Map();
  private observers: Map<string, MutationObserver | IntersectionObserver | ResizeObserver> = new Map();

  /**
   * Add a subscription with automatic cleanup
   */
  addSubscription(id: string, cleanup: () => void): void {
    // Clean up existing subscription if it exists
    this.removeSubscription(id);
    this.subscriptions.set(id, cleanup);
  }

  /**
   * Remove a subscription
   */
  removeSubscription(id: string): void {
    const cleanup = this.subscriptions.get(id);
    if (cleanup) {
      cleanup();
      this.subscriptions.delete(id);
    }
  }

  /**
   * Add an event listener with automatic cleanup
   */
  addEventListener(
    id: string,
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);
    
    if (!this.eventListeners.has(id)) {
      this.eventListeners.set(id, []);
    }
    
    this.eventListeners.get(id)!.push({ element, handler });
  }

  /**
   * Remove event listeners for a specific ID
   */
  removeEventListeners(id: string): void {
    const listeners = this.eventListeners.get(id);
    if (listeners) {
      listeners.forEach(({ element, handler }) => {
        element.removeEventListener(handler.name, handler);
      });
      this.eventListeners.delete(id);
    }
  }

  /**
   * Set a timer with automatic cleanup
   */
  setTimeout(id: string, callback: () => void, delay: number): void {
    // Clear existing timer if it exists
    this.clearTimeout(id);
    
    const timerId = setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);
    
    this.timers.set(id, timerId);
  }

  /**
   * Set an interval with automatic cleanup
   */
  setInterval(id: string, callback: () => void, delay: number): void {
    // Clear existing interval if it exists
    this.clearInterval(id);
    
    const intervalId = setInterval(callback, delay);
    this.timers.set(id, intervalId);
  }

  /**
   * Clear a timer
   */
  clearTimeout(id: string): void {
    const timerId = this.timers.get(id);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(id);
    }
  }

  /**
   * Clear an interval
   */
  clearInterval(id: string): void {
    const intervalId = this.timers.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.timers.delete(id);
    }
  }

  /**
   * Request animation frame with cleanup
   */
  requestAnimationFrame(id: string, callback: FrameRequestCallback): void {
    // Cancel existing animation frame if it exists
    this.cancelAnimationFrame(id);
    
    const frameId = requestAnimationFrame((timestamp) => {
      callback(timestamp);
      this.animationFrames.delete(id);
    });
    
    this.animationFrames.set(id, frameId);
  }

  /**
   * Cancel animation frame
   */
  cancelAnimationFrame(id: string): void {
    const frameId = this.animationFrames.get(id);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(id);
    }
  }

  /**
   * Add an observer with cleanup
   */
  addObserver(
    id: string,
    observer: MutationObserver | IntersectionObserver | ResizeObserver
  ): void {
    // Disconnect existing observer if it exists
    this.removeObserver(id);
    this.observers.set(id, observer);
  }

  /**
   * Remove an observer
   */
  removeObserver(id: string): void {
    const observer = this.observers.get(id);
    if (observer) {
      observer.disconnect();
      this.observers.delete(id);
    }
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(cleanup => cleanup());
    this.subscriptions.clear();

    // Clean up event listeners
    this.eventListeners.forEach((listeners, id) => {
      this.removeEventListeners(id);
    });
    this.eventListeners.clear();

    // Clean up timers
    this.timers.forEach((timer, id) => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    this.timers.clear();

    // Clean up animation frames
    this.animationFrames.forEach(frameId => {
      cancelAnimationFrame(frameId);
    });
    this.animationFrames.clear();

    // Clean up observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

/**
 * Hook for managing subscriptions with automatic cleanup
 */
export function useSubscriptionManager(): SubscriptionManager {
  const managerRef = useRef<SubscriptionManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new SubscriptionManager();
  }

  useEffect(() => {
    const manager = managerRef.current;
    
    return () => {
      manager?.cleanup();
    };
  }, []);

  return managerRef.current;
}

/**
 * Hook for event listeners with automatic cleanup
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: EventTarget | null,
  options?: AddEventListenerOptions
): void;
export function useEventListener(
  eventName: string,
  handler: EventListener,
  element?: EventTarget | null,
  options?: AddEventListenerOptions
): void {
  const savedHandler = useRef<EventListener>();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const targetElement = element || window;
    if (!targetElement || !targetElement.addEventListener) {
      return;
    }

    const eventListener: EventListener = (event) => {
      if (savedHandler.current) {
        savedHandler.current(event);
      }
    };

    targetElement.addEventListener(eventName, eventListener, options);

    return () => {
      targetElement.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}

/**
 * Hook for managing intervals with cleanup
 */
export function useInterval(
  callback: () => void,
  delay: number | null
): void {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setInterval(() => {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Hook for managing timeouts with cleanup
 */
export function useTimeout(
  callback: () => void,
  delay: number | null
): void {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setTimeout(() => {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }, delay);

    return () => clearTimeout(id);
  }, [delay]);
}

/**
 * Hook for ResizeObserver with cleanup
 */
export function useResizeObserver<T extends Element>(
  callback: ResizeObserverCallback,
  elementRef: MutableRefObject<T | null>
): void {
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    if (!observerRef.current) {
      observerRef.current = new ResizeObserver(callback);
    }

    observerRef.current.observe(elementRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, elementRef]);
}

/**
 * Hook for IntersectionObserver with cleanup
 */
export function useIntersectionObserver<T extends Element>(
  callback: IntersectionObserverCallback,
  elementRef: MutableRefObject<T | null>,
  options?: IntersectionObserverInit
): void {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(callback, options);
    }

    observerRef.current.observe(elementRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, elementRef, options]);
}

/**
 * Hook for MutationObserver with cleanup
 */
export function useMutationObserver<T extends Element>(
  callback: MutationCallback,
  elementRef: MutableRefObject<T | null>,
  options?: MutationObserverInit
): void {
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    if (!observerRef.current) {
      observerRef.current = new MutationObserver(callback);
    }

    observerRef.current.observe(elementRef.current, options);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, elementRef, options]);
}

/**
 * Hook for managing WebSocket connections with cleanup
 */
export function useWebSocket(
  url: string,
  options?: {
    onOpen?: (event: Event) => void;
    onMessage?: (event: MessageEvent) => void;
    onError?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    reconnect?: boolean;
    reconnectInterval?: number;
    reconnectAttempts?: number;
  }
): {
  send: (data: string | ArrayBuffer | Blob) => void;
  close: () => void;
  readyState: number;
} {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    wsRef.current = new WebSocket(url);

    if (options?.onOpen) {
      wsRef.current.addEventListener('open', options.onOpen);
    }

    if (options?.onMessage) {
      wsRef.current.addEventListener('message', options.onMessage);
    }

    if (options?.onError) {
      wsRef.current.addEventListener('error', options.onError);
    }

    wsRef.current.addEventListener('close', (event) => {
      if (options?.onClose) {
        options.onClose(event);
      }

      if (
        options?.reconnect &&
        reconnectAttemptsRef.current < (options.reconnectAttempts || 5)
      ) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, options.reconnectInterval || 1000);
      }
    });
  }, [url, options]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: string | ArrayBuffer | Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const close = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  return {
    send,
    close,
    readyState: wsRef.current?.readyState || WebSocket.CLOSED,
  };
}

/**
 * Hook for cleanup on unmount
 */
export function useCleanup(cleanup: () => void): void {
  const cleanupRef = useRef(cleanup);

  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);
}

/**
 * Hook for managing async operations with cleanup
 */
export function useAsyncEffect(
  effect: () => Promise<void>,
  deps?: React.DependencyList
): void {
  useEffect(() => {
    let cancelled = false;

    const runEffect = async () => {
      try {
        await effect();
      } catch (error) {
        if (!cancelled) {
          console.error('Async effect error:', error);
        }
      }
    };

    runEffect();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
