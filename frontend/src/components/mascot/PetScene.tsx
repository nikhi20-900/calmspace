import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface PetSceneProps {
  type: 'cat' | 'dog';
  speaking?: boolean;
  listening?: boolean;
  thinking?: boolean;
  voiceLevel?: number;
  className?: string;
}

const makeMaterial = (color: number, roughness = 0.72) => new THREE.MeshStandardMaterial({ color, roughness });

function makeRoundedEar(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.31, -0.27);
  shape.quadraticCurveTo(-0.38, -0.32, -0.34, -0.18);
  shape.lineTo(-0.13, 0.32);
  shape.quadraticCurveTo(0, 0.57, 0.13, 0.32);
  shape.lineTo(0.34, -0.18);
  shape.quadraticCurveTo(0.38, -0.32, 0.31, -0.27);
  shape.quadraticCurveTo(0, -0.19, -0.31, -0.27);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.055,
    bevelThickness: 0.06,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -0.07);
  return geometry;
}

export const PetScene: React.FC<PetSceneProps> = ({ type, speaking = false, listening = false, thinking = false, voiceLevel = 0, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const speakingRef = useRef(speaking);
  const listeningRef = useRef(listening);
  const thinkingRef = useRef(thinking);
  const voiceRef = useRef(voiceLevel);
  useEffect(() => { speakingRef.current = speaking; listeningRef.current = listening; thinkingRef.current = thinking; voiceRef.current = voiceLevel; }, [speaking, listening, thinking, voiceLevel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'default' });
    } catch (error) {
      console.warn('3D pet scene could not start', error);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 640 ? 1.5 : 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 50);
    camera.position.set(0, 0.06, 6.7);
    scene.add(new THREE.HemisphereLight(0xfff8ed, 0x716b88, 2.1));
    const key = new THREE.DirectionalLight(0xfff3e4, 3.2);
    key.position.set(-3.5, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcac4ff, 1.5);
    fill.position.set(4, 1, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd2bb, 2.3);
    rim.position.set(0, 2, -3);
    scene.add(rim);

    const character = new THREE.Group();
    scene.add(character);
    const furColor = type === 'cat' ? 0xe9c9a9 : 0xd8b58e;
    const furLight = type === 'cat' ? 0xffe9d2 : 0xf2d7b0;
    const furDark = type === 'cat' ? 0xc99e78 : 0xb58c67;
    const fur = makeMaterial(furColor);
    const lightFur = makeMaterial(furLight);
    const darkFur = makeMaterial(furDark);
    const innerEar = makeMaterial(type === 'cat' ? 0xe79ba2 : 0xc99182);
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x231e2b, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const noseMat = makeMaterial(type === 'cat' ? 0x9d6572 : 0x46363b, 0.36);
    const mouthMat = makeMaterial(0x6f4e50, 0.8);
    const sphere = new THREE.SphereGeometry(1, 48, 36);
    const addSphere = (name: string, material: THREE.Material, position: [number, number, number], scale: [number, number, number]) => {
      const mesh = new THREE.Mesh(sphere, material);
      mesh.name = name;
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      character.add(mesh);
      return mesh;
    };

    // Plump seated body, tucked just behind the oversized friendly head.
    const body = addSphere('soft body', fur, [0, -0.73, -0.23], [0.77, 0.79, 0.64]);
    addSphere('chest', lightFur, [0, -0.76, 0.31], [0.49, 0.56, 0.28]);
    addSphere('left paw', lightFur, [-0.47, -1.22, 0.19], [0.34, 0.22, 0.35]);
    addSphere('right paw', lightFur, [0.47, -1.22, 0.19], [0.34, 0.22, 0.35]);

    if (type === 'cat') {
      const earGeometry = makeRoundedEar();
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(earGeometry, fur);
        ear.position.set(side * 0.57, 0.96, -0.12);
        ear.rotation.z = side * -0.16;
        character.add(ear);
        const inner = new THREE.Mesh(earGeometry, innerEar);
        inner.scale.set(0.58, 0.63, 0.72);
        inner.position.set(side * 0.57, 0.98, -0.01);
        inner.rotation.z = side * -0.16;
        character.add(inner);
      }
    } else {
      for (const side of [-1, 1]) {
        const ear = addSphere(`floppy ear ${side}`, darkFur, [side * 0.79, 0.3, -0.13], [0.3, 0.59, 0.25]);
        ear.rotation.z = side * -0.25;
        const inner = addSphere(`inner ear ${side}`, innerEar, [side * 0.81, 0.31, 0.09], [0.16, 0.4, 0.11]);
        inner.rotation.z = side * -0.25;
      }
    }

    const head = addSphere('head', fur, [0, 0.34, 0.05], [0.94, 0.9, 0.78]);
    // Soft forehead sheen and cheek patches add a sculpted, toy-like finish.
    const forehead = addSphere('forehead sheen', lightFur, [-0.22, 0.79, 0.67], [0.38, 0.17, 0.06]);
    forehead.material = new THREE.MeshStandardMaterial({ color: furLight, roughness: 0.55, transparent: true, opacity: 0.36 });

    for (const side of [-1, 1]) {
      addSphere(`eye ${side}`, eyeMat, [side * 0.34, 0.44, 0.76], [0.105, 0.14, 0.065]);
      addSphere(`eye glint ${side}`, shineMat, [side * 0.34 - 0.025, 0.49, 0.824], [0.032, 0.04, 0.018]);
      addSphere(`cheek ${side}`, lightFur, [side * 0.22, 0.05, 0.72], [0.26, 0.19, 0.18]);
    }
    if (type === 'cat') {
      // Tiny tapered muzzle, triangular nose, and whisker dots.
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 16), noseMat);
      nose.position.set(0, 0.13, 0.94);
      nose.scale.set(1.15, 0.72, 0.58);
      character.add(nose);
      for (const side of [-1, 1]) {
        for (let row = 0; row < 2; row++) addSphere(`whisker spot ${side}-${row}`, mouthMat, [side * (0.18 + row * 0.08), 0.02 - row * 0.08, 0.88], [0.018, 0.018, 0.012]);
      }
    } else {
      addSphere('dog muzzle', lightFur, [0, 0.04, 0.81], [0.38, 0.3, 0.26]);
      addSphere('dog nose', noseMat, [0, 0.2, 1.035], [0.15, 0.105, 0.08]);
    }

    const mouth = new THREE.Group();
    mouth.position.set(0, -0.01, 0.914);
    const smileLine = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(0.01, -0.08, 0), new THREE.Vector3(0.12, -0.07, 0)), 18, 0.012, 8, false), mouthMat);
    const smileLineLeft = smileLine.clone();
    smileLineLeft.scale.x = -1;
    mouth.add(smileLine, smileLineLeft);
    character.add(mouth);

    // Soft ellipse shadow grounds the character without introducing a hard floor edge.
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x817ba6, transparent: true, opacity: 0.15, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -1.39, 0);
    shadow.scale.set(1.25, 0.4, 1);
    scene.add(shadow);
    character.position.y = 0.03;

    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      camera.aspect = width / height;
      camera.position.z = width / height < 1 ? 7.2 : 6.7;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const talking = speakingRef.current;
      const listeningNow = listeningRef.current;
      const thinkingNow = thinkingRef.current;
      const voice = voiceRef.current;
      character.position.y = 0.025 + Math.sin(t * 1.7) * (talking ? 0.035 : listeningNow ? 0.026 : 0.018) + voice * 0.025;
      character.rotation.y = Math.sin(t * (listeningNow ? 0.72 : 0.48)) * (listeningNow ? 0.075 : 0.045);
      character.rotation.z = (listeningNow ? -0.045 : thinkingNow ? 0.035 : 0) + Math.sin(t * 0.9) * 0.012;
      head.scale.y = 0.9 + (talking ? Math.sin(t * 12) * 0.008 : 0);
      mouth.scale.set(1, talking ? 1 + Math.abs(Math.sin(t * 13)) * 0.9 : 1, 1);
      body.scale.y = 0.79 + (talking ? 0.012 : thinkingNow ? Math.sin(t * 2.4) * 0.018 : Math.sin(t * 1.3) * 0.012);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [type]);

  return <div ref={containerRef} className={`relative h-full w-full ${className}`} aria-label={`Animated 3D ${type} companion`} />;
};

export default PetScene;
