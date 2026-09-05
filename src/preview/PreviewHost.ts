import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
} from "@pixiv/three-vrm-animation";

const DEFAULT_VRM =
  "https://cdn.jsdelivr.net/gh/pixiv/three-vrm@v2.1.0/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm";

export class PreviewHost {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private vrm: VRM | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private action: THREE.AnimationAction | null = null;
  private raf = 0;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    this.camera.position.set(0, 1.2, 2.8);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 1.0, 0);
    this.controls.enableDamping = true;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 1.1);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(1.5, 2.2, 2);
    this.scene.add(dir);

    const grid = new THREE.GridHelper(4, 16, 0x3a4558, 0x2a3344);
    this.scene.add(grid);

    this.resize();
    this.loop();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  async loadVrm(url: string = DEFAULT_VRM) {
    this.stopClip();
    if (this.vrm) {
      this.scene.remove(this.vrm.scene);
      VRMUtils.deepDispose(this.vrm.scene);
      this.vrm = null;
    }
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm as VRM;
    VRMUtils.removeUnnecessaryVertices(vrm.scene);
    VRMUtils.rotateVRM0(vrm);
    this.scene.add(vrm.scene);
    this.vrm = vrm;
    this.mixer = new THREE.AnimationMixer(vrm.scene);
  }

  async playVrmaBuffer(buffer: ArrayBuffer) {
    if (!this.vrm || !this.mixer) {
      throw new Error("先加载 VRM 再预览");
    }
    this.stopClip();
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    const gltf = await loader.parseAsync(buffer, "");
    const anims = gltf.userData.vrmAnimations;
    if (!anims?.length) throw new Error("文件里没有 VRMA 动画");
    const clip = createVRMAnimationClip(anims[0], this.vrm);
    this.action = this.mixer.clipAction(clip);
    this.action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
  }

  stopClip() {
    this.action?.stop();
    this.action = null;
    this.mixer?.stopAllAction();
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.clock.getDelta();
    this.mixer?.update(dt);
    this.vrm?.update(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.stopClip();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

export { DEFAULT_VRM };
