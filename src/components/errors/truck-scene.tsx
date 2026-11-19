"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";

const BODY = "#0a3d8f";
const CARGO = "#e6f1fb";
const CHASSIS = "#1a2a40";
const TYRE = "#0b1522";
const HUB = "#9db4cf";
const GLASS = "#8fb3de";
const AMBER = "#f59e0b";

const WHEEL_RADIUS = 0.42;
const WHEEL_WIDTH = 0.3;
const LANE = 0.62;
const FRONT_AXLE = 1.45;
const REAR_AXLE = -0.95;

const STAGE_YAW = -0.55;
const STAGE_SWAY = 0.45;
const TRUCK_TILT = 0.1;
const LOOSE_WHEEL_X = -3.1;
const LOOSE_WHEEL_Z = LANE + 0.9;
const LOOSE_WHEEL_TRAVEL = 0.35;
const PUFFS = 4;
const DETACH_AT = 1.4;
const DETACH_FOR = 1.6;

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

type Vec3 = [number, number, number];

function puffPose(progress: number, index: number) {
  return {
    position: [2.1 - progress * 0.3, 1.35 + progress * 1.1, 0.15 * Math.sin(progress * 6 + index)] as Vec3,
    scale: 0.12 + progress * 0.3,
    opacity: 0.35 * (1 - progress),
  };
}

function Box({ args, position, color, rotation }: { args: Vec3; position: Vec3; color: string; rotation?: Vec3 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

function Wheel({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 24]} />
        <meshStandardMaterial color={TYRE} roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, WHEEL_WIDTH + 0.03, 20]} />
        <meshStandardMaterial color={HUB} metalness={0.6} roughness={0.4} />
      </mesh>
      <Box args={[0.36, 0.06, WHEEL_WIDTH + 0.05]} position={[0, 0, 0]} color={CHASSIS} />
    </group>
  );
}

function Hazard({ position, animate, offset }: { position: Vec3; animate: boolean; offset: number }) {
  const material = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!animate || !material.current) return;
    material.current.emissiveIntensity = Math.floor(clock.elapsedTime * 2.4 + offset) % 2 ? 1.4 : 0.05;
  });

  return (
    <mesh position={position}>
      <boxGeometry args={[0.06, 0.14, 0.2]} />
      <meshStandardMaterial ref={material} color={AMBER} emissive={AMBER} emissiveIntensity={1.4} />
    </mesh>
  );
}

function Smoke({ animate }: { animate: boolean }) {
  const puffs = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    if (!animate) return;
    puffs.current.forEach((puff, index) => {
      if (!puff) return;
      const pose = puffPose((clock.elapsedTime * 0.25 + index / PUFFS) % 1, index);
      puff.position.set(...pose.position);
      puff.scale.setScalar(pose.scale);
      (puff.material as MeshBasicMaterial).opacity = pose.opacity;
    });
  });

  return (
    <>
      {Array.from({ length: PUFFS }, (_, index) => {
        const pose = puffPose(index / PUFFS, index);
        return (
          <mesh
            key={index}
            ref={(node) => {
              puffs.current[index] = node;
            }}
            position={pose.position}
            scale={pose.scale}
          >
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color="#6b7280" transparent opacity={pose.opacity} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
}

function Truck({ animate }: { animate: boolean }) {
  return (
    <group>
      <Box args={[4.5, 0.16, 1]} position={[0.28, 0.62, 0]} color={CHASSIS} />
      <Box args={[2.7, 1.5, 1.15]} position={[-0.55, 1.5, 0]} color={CARGO} />
      <Box args={[2.72, 0.22, 1.17]} position={[-0.55, 1.05, 0]} color={BODY} />
      {[-1.6, -1.1, -0.6, -0.1, 0.4].flatMap((x) =>
        [-1, 1].map((side) => (
          <Box key={`${x}-${side}`} args={[0.04, 1.2, 0.03]} position={[x, 1.65, side * 0.585]} color="#c7d6e8" />
        )),
      )}
      <Box args={[1, 1.15, 1.1]} position={[1.4, 1.3, 0]} color={BODY} />
      <Box args={[0.6, 0.6, 1]} position={[2.2, 0.98, 0]} color={BODY} />
      <Box args={[0.04, 0.55, 0.9]} position={[1.9, 1.62, 0]} color={GLASS} rotation={[0, 0, 0.25]} />
      {[-1, 1].map((side) => (
        <Box key={side} args={[0.55, 0.42, 0.04]} position={[1.4, 1.55, side * 0.555]} color={GLASS} />
      ))}
      <Box args={[0.04, 0.4, 0.8]} position={[2.51, 0.98, 0]} color={CHASSIS} />
      <Box args={[0.14, 0.18, 1.1]} position={[2.55, 0.72, 0]} color={CHASSIS} />
      <mesh position={[0.95, 1.45, 0.62]}>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 10]} />
        <meshStandardMaterial color={HUB} metalness={0.8} roughness={0.3} />
      </mesh>
      {[-1, 1].map((side) => (
        <Hazard key={`front-${side}`} position={[2.52, 1.05, side * 0.38]} animate={animate} offset={0} />
      ))}
      {[-1, 1].map((side) => (
        <Hazard key={`rear-${side}`} position={[-1.92, 0.85, side * 0.45]} animate={animate} offset={0} />
      ))}
      <Smoke animate={animate} />
      <Wheel position={[FRONT_AXLE, WHEEL_RADIUS, -LANE]} />
      <Wheel position={[FRONT_AXLE, WHEEL_RADIUS, LANE]} />
      <Wheel position={[REAR_AXLE, WHEEL_RADIUS, -LANE]} />
      {[
        [FRONT_AXLE, -LANE],
        [FRONT_AXLE, LANE],
        [REAR_AXLE, -LANE],
      ].map(([x, z]) => (
        <Box key={`${x}-${z}`} args={[0.95, 0.07, 0.38]} position={[x, 0.92, z]} color={BODY} />
      ))}
      <mesh position={[REAR_AXLE, WHEEL_RADIUS, LANE]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, WHEEL_WIDTH, 12]} />
        <meshStandardMaterial color={HUB} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Scene({ animate, onReady }: { animate: boolean; onReady?: () => void }) {
  const stage = useRef<Group>(null);
  const truck = useRef<Group>(null);
  const looseWheel = useRef<Group>(null);
  const announced = useRef(false);
  const startedAt = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }
    if (!animate || !stage.current || !truck.current || !looseWheel.current) return;
    startedAt.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - startedAt.current;
    // 0 while the wheel is still on the axle, 1 once it has rolled free.
    const detach = Math.min(1, Math.max(0, (t - DETACH_AT) / DETACH_FOR));
    const eased = easeOut(detach);
    const travel = Math.sin(Math.max(0, t - DETACH_AT - DETACH_FOR) * 0.6) * LOOSE_WHEEL_TRAVEL;
    const wheelX = REAR_AXLE + (LOOSE_WHEEL_X - REAR_AXLE) * eased + travel;
    // The engine sputters in bursts once the wheel is gone.
    const sputter = Math.max(0, Math.sin(t * 0.9)) ** 4 * detach;
    const wobble = detach === 0 ? (t / DETACH_AT) * 0.12 : 0.05;

    stage.current.rotation.y = STAGE_YAW + Math.sin(t * 0.35) * STAGE_SWAY;
    truck.current.position.y = 0.03 + Math.sin(t * 34) * 0.01 * sputter;
    truck.current.rotation.x =
      TRUCK_TILT * eased + Math.sin(t * 0.8) * 0.012 * detach + Math.sin(t * 30) * 0.004 * sputter;
    looseWheel.current.position.set(
      wheelX,
      WHEEL_RADIUS + Math.sin(Math.PI * detach) * 0.4 + (detach === 1 ? Math.abs(Math.sin(t * 3)) * 0.02 : 0),
      LANE + (LOOSE_WHEEL_Z - LANE) * eased,
    );
    looseWheel.current.rotation.z = -(wheelX - REAR_AXLE) / WHEEL_RADIUS;
    looseWheel.current.rotation.x = Math.sin(t * (detach === 0 ? 45 : 4)) * wobble;
  });

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-4, 3, -3]} intensity={0.6} />
      <group ref={stage} rotation={[0, STAGE_YAW, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.4, 0.005, 0.4]} scale={[1.45, 0.55, 1]}>
          <circleGeometry args={[2.6, 48]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.12} />
        </mesh>
        <group ref={truck} position={[0, 0.03, 0]} rotation={[TRUCK_TILT, 0, 0]}>
          <Truck animate={animate} />
        </group>
        <group ref={looseWheel} position={[LOOSE_WHEEL_X, WHEEL_RADIUS, LOOSE_WHEEL_Z]}>
          <Wheel position={[0, 0, 0]} />
        </group>
      </group>
    </>
  );
}

interface TruckSceneProps {
  animate: boolean;
  onReady?: () => void;
}

export default function TruckScene({ animate, onReady }: TruckSceneProps) {
  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 2.6, 9], fov: 36 }}
      dpr={[1, 2]}
      frameloop={animate ? "always" : "demand"}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ camera }) => camera.lookAt(-0.4, 0.9, 0)}
    >
      <Scene animate={animate} onReady={onReady} />
    </Canvas>
  );
}
