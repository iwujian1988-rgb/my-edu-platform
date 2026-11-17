const TABLET_MIN_VIEWPORT_WIDTH = 768
const LANDSCAPE_TABLET_MIN_VIEWPORT_HEIGHT = 600

export function isPortraitTabletViewport(width: number, height: number): boolean {
  return width >= TABLET_MIN_VIEWPORT_WIDTH && height >= width
}

export function isLandscapeTabletViewport(width: number, height: number, screenWidth = width, screenHeight = height): boolean {
  const screenShortSide = Math.min(screenWidth, screenHeight)
  return width >= TABLET_MIN_VIEWPORT_WIDTH && width > height && Math.max(height, screenShortSide) >= LANDSCAPE_TABLET_MIN_VIEWPORT_HEIGHT
}
