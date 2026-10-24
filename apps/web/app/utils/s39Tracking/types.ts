export type PixelFunction = (...args: unknown[]) => void;

export type PixelQueue = unknown[] &
  Record<string, unknown> & {
    track: PixelFunction;
    page: PixelFunction;
    load: PixelFunction;
  };

export interface PixelWindow {
  ttq?: PixelQueue;
  fbq?: PixelFunction;
  _fbq?: unknown;
  TiktokAnalyticsObject?: string;
}

export interface S39TrackingPayload {
  tt?: Record<string, unknown>;
  fb?: Record<string, unknown>;
}
