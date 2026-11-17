// 一些移动浏览器使用私有属性选择网页内播放；标准 playsInline 仍单独保留。
export const INLINE_VIDEO_ATTRIBUTES = {
  'webkit-playsinline': '',
  't7-video-player-type': 'inline',
} as const
