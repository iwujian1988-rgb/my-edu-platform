/**
 * 波形数据提取工具函数
 *
 * 从 WaveformDisplay.tsx 中提取，供 AudioPlayer 复用。
 * Fetch audio, decode via AudioContext, downsample to peak amplitudes.
 */

export async function extractPeaks(
  audioSrc: string,
  barCount: number = 50
): Promise<number[]> {
  const response = await fetch(audioSrc)
  const arrayBuffer = await response.arrayBuffer()
  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const channelData = audioBuffer.getChannelData(0)
    const sampleCount = channelData.length
    const blockSize = Math.floor(sampleCount / barCount)
    const peaks: number[] = []

    for (let i = 0; i < barCount; i++) {
      let max = 0
      const start = i * blockSize
      const end = Math.min(start + blockSize, sampleCount)
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j])
        if (abs > max) max = abs
      }
      peaks.push(max)
    }

    return peaks
  } finally {
    await audioContext.close()
  }
}
