import { FPS, type Project } from '../../domain/types';
import { totalFrames } from '../../domain/timeline';

export interface VerifyReport {
  ok: boolean;
  durationSeconds: number;
  frameCount: number;
  width: number;
  height: number;
  codec: string | null;
  audioCodec: string | null;
  sizeBytes: number;
  problems: string[];
}

/** Re-opens the exported file and reads its real metadata instead of trusting the encoder. */
export async function verifyExport(project: Project, blob: Blob, expected: { width: number; height: number }): Promise<VerifyReport> {
  const { ALL_FORMATS, BlobSource, Input } = await import('mediabunny');
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  const frames = totalFrames(project);
  try {
    const track = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!track) return { ok: false, durationSeconds: 0, frameCount: 0, width: 0, height: 0, codec: null, audioCodec: null, sizeBytes: blob.size, problems: ['لا يوجد مسار فيديو في الملف'] };
    const stats = await track.computePacketStats();
    const durationSeconds = await track.computeDuration();
    const problems: string[] = [];
    if (Math.abs(durationSeconds - frames / FPS) > 1 / FPS) problems.push(`المدة ${durationSeconds.toFixed(2)} ث بدل ${(frames / FPS).toFixed(2)} ث`);
    if (stats.packetCount !== frames) problems.push(`عدد الإطارات ${stats.packetCount} بدل ${frames}`);
    if (track.displayWidth !== expected.width || track.displayHeight !== expected.height) problems.push(`الأبعاد ${track.displayWidth}×${track.displayHeight} بدل ${expected.width}×${expected.height}`);
    return { ok: problems.length === 0, durationSeconds, frameCount: stats.packetCount, width: track.displayWidth, height: track.displayHeight, codec: track.codec, audioCodec: audioTrack?.codec ?? null, sizeBytes: blob.size, problems };
  } finally {
    input.dispose();
  }
}
