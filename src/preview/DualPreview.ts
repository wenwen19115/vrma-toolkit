import { PreviewHost, DEFAULT_VRM } from "./PreviewHost";

/** 左右并排：左 original、右 current；共享同一 VRM URL */
export class DualPreview {
  readonly left: PreviewHost;
  readonly right: PreviewHost;
  private resizeObs: ResizeObserver | null = null;

  constructor(leftCanvas: HTMLCanvasElement, rightCanvas: HTMLCanvasElement) {
    this.left = new PreviewHost(leftCanvas);
    this.right = new PreviewHost(rightCanvas);
  }

  observe(container: HTMLElement) {
    this.resizeObs?.disconnect();
    this.resizeObs = new ResizeObserver(() => {
      this.left.resize();
      this.right.resize();
    });
    this.resizeObs.observe(container);
  }

  async loadVrm(url: string = DEFAULT_VRM) {
    await Promise.all([this.left.loadVrm(url), this.right.loadVrm(url)]);
  }

  async playPair(original: ArrayBuffer, current: ArrayBuffer) {
    await Promise.all([
      this.left.playVrmaBuffer(original.slice(0)),
      this.right.playVrmaBuffer(current.slice(0)),
    ]);
  }

  stop() {
    this.left.stopClip();
    this.right.stopClip();
  }

  dispose() {
    this.resizeObs?.disconnect();
    this.left.dispose();
    this.right.dispose();
  }
}

export { PreviewHost, DEFAULT_VRM };
