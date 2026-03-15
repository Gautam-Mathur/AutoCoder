// Mobile Preview System - Preview at different device sizes with device frames

export interface DeviceConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  deviceScaleFactor: number;
  type: 'phone' | 'tablet' | 'desktop' | 'custom';
  frame?: {
    borderRadius: number;
    notchHeight?: number;
    homeIndicator?: boolean;
  };
}

// Popular device presets
export const devicePresets: DeviceConfig[] = [
  // Phones
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    type: 'phone',
    frame: { borderRadius: 47, notchHeight: 34, homeIndicator: true }
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    type: 'phone',
    frame: { borderRadius: 20 }
  },
  {
    id: 'pixel-8',
    name: 'Pixel 8',
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    type: 'phone',
    frame: { borderRadius: 28, homeIndicator: true }
  },
  {
    id: 'samsung-s24',
    name: 'Samsung S24',
    width: 360,
    height: 780,
    deviceScaleFactor: 3,
    type: 'phone',
    frame: { borderRadius: 35, notchHeight: 25, homeIndicator: true }
  },
  {
    id: 'samsung-fold',
    name: 'Samsung Fold (Open)',
    width: 717,
    height: 512,
    deviceScaleFactor: 3,
    type: 'phone',
    frame: { borderRadius: 12 }
  },

  // Tablets
  {
    id: 'ipad-pro-12',
    name: 'iPad Pro 12.9"',
    width: 1024,
    height: 1366,
    deviceScaleFactor: 2,
    type: 'tablet',
    frame: { borderRadius: 18 }
  },
  {
    id: 'ipad-mini',
    name: 'iPad Mini',
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    type: 'tablet',
    frame: { borderRadius: 18 }
  },
  {
    id: 'surface-pro',
    name: 'Surface Pro 9',
    width: 912,
    height: 1368,
    deviceScaleFactor: 2,
    type: 'tablet',
    frame: { borderRadius: 8 }
  },
  {
    id: 'galaxy-tab',
    name: 'Galaxy Tab S9',
    width: 800,
    height: 1280,
    deviceScaleFactor: 2,
    type: 'tablet',
    frame: { borderRadius: 12 }
  },

  // Desktop
  {
    id: 'desktop-1080',
    name: 'Desktop 1080p',
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    type: 'desktop'
  },
  {
    id: 'desktop-1440',
    name: 'Desktop 1440p',
    width: 2560,
    height: 1440,
    deviceScaleFactor: 1,
    type: 'desktop'
  },
  {
    id: 'laptop-13',
    name: 'Laptop 13"',
    width: 1280,
    height: 800,
    deviceScaleFactor: 2,
    type: 'desktop'
  },
  {
    id: 'laptop-15',
    name: 'Laptop 15"',
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    type: 'desktop'
  }
];

// Breakpoint presets for responsive testing
export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Device frame CSS generator
export function generateDeviceFrameStyles(device: DeviceConfig, scale: number = 1): string {
  const scaledWidth = device.width * scale;
  const scaledHeight = device.height * scale;

  if (!device.frame) {
    return `
      width: ${scaledWidth}px;
      height: ${scaledHeight}px;
      border: 1px solid #333;
      background: #000;
    `;
  }

  const { borderRadius, notchHeight, homeIndicator } = device.frame;
  const scaledRadius = borderRadius * scale;
  const scaledNotch = (notchHeight || 0) * scale;

  let frameStyles = `
    width: ${scaledWidth}px;
    height: ${scaledHeight}px;
    border-radius: ${scaledRadius}px;
    background: linear-gradient(180deg, #1a1a1a 0%, #333 2%, #333 98%, #1a1a1a 100%);
    box-shadow:
      0 0 0 2px #1a1a1a,
      0 0 0 4px #444,
      0 10px 40px rgba(0,0,0,0.4);
    position: relative;
    padding: ${scaledNotch > 0 ? scaledNotch : 4}px 4px ${homeIndicator ? 20 * scale : 4}px 4px;
    box-sizing: border-box;
  `;

  return frameStyles;
}

// Generate notch/dynamic island styles
export function generateNotchStyles(device: DeviceConfig, scale: number = 1): string {
  if (!device.frame?.notchHeight) return '';

  const notchWidth = device.width * 0.35 * scale;
  const notchHeight = device.frame.notchHeight * scale;

  return `
    position: absolute;
    top: ${2 * scale}px;
    left: 50%;
    transform: translateX(-50%);
    width: ${notchWidth}px;
    height: ${notchHeight}px;
    background: #000;
    border-radius: ${notchHeight / 2}px;
    z-index: 10;
  `;
}

// Generate home indicator styles
export function generateHomeIndicatorStyles(device: DeviceConfig, scale: number = 1): string {
  if (!device.frame?.homeIndicator) return '';

  const indicatorWidth = device.width * 0.35 * scale;

  return `
    position: absolute;
    bottom: ${6 * scale}px;
    left: 50%;
    transform: translateX(-50%);
    width: ${indicatorWidth}px;
    height: ${5 * scale}px;
    background: #fff;
    border-radius: ${3 * scale}px;
    opacity: 0.6;
    z-index: 10;
  `;
}

// Calculate scale to fit device in container
export function calculateFitScale(device: DeviceConfig, containerWidth: number, containerHeight: number, padding: number = 40): number {
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  // Account for device frame padding
  const frameWidth = device.width + (device.frame ? 8 : 0);
  const frameHeight = device.height + (device.frame ?
    ((device.frame.notchHeight || 0) + (device.frame.homeIndicator ? 20 : 0) + 8) : 0);

  const scaleX = availableWidth / frameWidth;
  const scaleY = availableHeight / frameHeight;

  return Math.min(scaleX, scaleY, 1);
}

// Get device orientation
export function getOrientation(device: DeviceConfig): 'portrait' | 'landscape' {
  return device.height > device.width ? 'portrait' : 'landscape';
}

// Rotate device (swap width/height)
export function rotateDevice(device: DeviceConfig): DeviceConfig {
  return {
    ...device,
    width: device.height,
    height: device.width,
    name: `${device.name} (${getOrientation(device) === 'portrait' ? 'Landscape' : 'Portrait'})`
  };
}

// Create custom device
export function createCustomDevice(
  name: string,
  width: number,
  height: number,
  options: Partial<DeviceConfig> = {}
): DeviceConfig {
  return {
    id: `custom-${Date.now()}`,
    name,
    width,
    height,
    deviceScaleFactor: options.deviceScaleFactor || 1,
    type: 'custom',
    frame: options.frame
  };
}

// Get devices by type
export function getDevicesByType(type: DeviceConfig['type']): DeviceConfig[] {
  return devicePresets.filter(d => d.type === type);
}

// Find closest device to dimensions
export function findClosestDevice(width: number, height: number): DeviceConfig {
  let closest = devicePresets[0];
  let minDiff = Infinity;

  for (const device of devicePresets) {
    const diff = Math.abs(device.width - width) + Math.abs(device.height - height);
    if (diff < minDiff) {
      minDiff = diff;
      closest = device;
    }
  }

  return closest;
}

// Generate media query for device
export function generateMediaQuery(device: DeviceConfig): string {
  const orientation = getOrientation(device);
  return `@media screen and (max-width: ${device.width}px) and (orientation: ${orientation})`;
}

// Check if viewport matches breakpoint
export function matchesBreakpoint(width: number, breakpoint: keyof typeof breakpoints): boolean {
  return width <= breakpoints[breakpoint];
}

// Get current breakpoint name
export function getCurrentBreakpoint(width: number): keyof typeof breakpoints {
  if (width < breakpoints.xs) return 'xs';
  if (width < breakpoints.sm) return 'sm';
  if (width < breakpoints.md) return 'md';
  if (width < breakpoints.lg) return 'lg';
  if (width < breakpoints.xl) return 'xl';
  return '2xl';
}

// Export for component use
export const mobilePreview = {
  devices: devicePresets,
  breakpoints,
  getDevicesByType,
  rotateDevice,
  createCustomDevice,
  calculateFitScale,
  generateDeviceFrameStyles,
  generateNotchStyles,
  generateHomeIndicatorStyles,
  findClosestDevice,
  generateMediaQuery,
  matchesBreakpoint,
  getCurrentBreakpoint
};