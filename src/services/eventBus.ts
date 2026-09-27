import { useEffect, useCallback } from 'react';

type EventHandler = (data?: any) => void;

class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event: string, data?: any) {
    // Immediate Telegram WebApp Haptic response
    try {
      const twa = (window as any).Telegram?.WebApp;
      if (twa?.HapticFeedback) {
        if (event.includes('error')) {
          twa.HapticFeedback.notificationOccurred('error');
        } else if (event.includes('success')) {
          twa.HapticFeedback.notificationOccurred('success');
        } else {
          twa.HapticFeedback.impactOccurred('light');
        }
      }
    } catch (e) {}

    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (err) {
          console.error(`Error in event handler for ${event}:`, err);
        }
      });
    }
  }
}

export const appEventBus = new EventBus();

// Custom hook to listen to the central Event Bus
export function useEventBusListener(event: string, callback: EventHandler) {
  useEffect(() => {
    return appEventBus.on(event, callback);
  }, [event, callback]);
}

// Custom hook for instant Telegram WebApp SDK triggers
export function useTelegramSDK() {
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    try {
      const twa = (window as any).Telegram?.WebApp;
      if (twa?.HapticFeedback) {
        if (type === 'success' || type === 'warning' || type === 'error') {
          twa.HapticFeedback.notificationOccurred(type);
        } else {
          twa.HapticFeedback.impactOccurred(type);
        }
      }
    } catch (e) {}
  }, []);

  const openLink = useCallback((url: string) => {
    try {
      const twa = (window as any).Telegram?.WebApp;
      if (twa?.openTelegramLink && url.includes('t.me')) {
        twa.openTelegramLink(url);
      } else if (twa?.openLink) {
        twa.openLink(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      window.open(url, '_blank');
    }
  }, []);

  return { triggerHaptic, openLink };
}
