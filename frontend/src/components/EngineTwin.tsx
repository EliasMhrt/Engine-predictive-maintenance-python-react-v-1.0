import { useRef } from "react";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EnginePartId, EngineStatus, PartAssessment } from "./engineTwinTypes";

// Futuristic color palette mapping
function colorFor(status: EngineStatus, selected: boolean) {
  if (selected) return "#ffffff";
  if (status === "CRITICAL") return "#ff4444"; // Bright Red
  if (status === "WARNING") return "#ffaa00"; // Amber
  return "#00eeff"; // High-tech Cyan for normal
}

// Procedural generator for spinning fan and compressor blades
function BladeStage({ count, innerRadius, outerRadius, zPosition, color, speed, tilt = 0.4 }: any) {
  const ref = useRef<THREE.Group>(null);
  const length = outerRadius - innerRadius;
  const centerRadius = innerRadius + length / 2;
  
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z -= delta * speed;
  });

  return (
    <group position={[0, 0, zPosition]} ref={ref}>
      {/* Center Hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
         <cylinderGeometry args={[innerRadius, innerRadius, 0.15, 32]} />
         <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Aerodynamic Blades */}
      {Array.from({ length: count }).map((_, i) => (
        <group key={i} rotation={[0, 0, (i / count) * Math.PI * 2]}>
           <mesh position={[0, centerRadius, 0]} rotation={[0, tilt, 0]}>
             <boxGeometry args={[0.04, length, 0.2]} />
             <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
           </mesh>
        </group>
      ))}
    </group>
  )
}

function ClickablePart({
  id, item, position, selectedPart, setSelectedPart, mode, labelRadius, children
}: any) {
  const selected = selectedPart === id;
  // Explode logic: Bypass shell lifts UP, internal core stages slide APART along the Z-axis
  const explodeY = mode === "exploded" && id === "bypass" ? 3.0 : 0;
  const explodeZ = mode === "exploded" ? ({ fan: 3.5, bypass: 0, lpc: 1.5, hpc: 0, combustor: -1.5, turbine: -3.0, shafts: 0, exhaust: -4.5 }[id as string] ?? 0) : 0;
  const color = colorFor(item.status, selected);

  return (
    <group
      position={[position[0], position[1] + explodeY, position[2] + explodeZ]}
      onClick={(e) => { e.stopPropagation(); setSelectedPart(id); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "default"; }}
    >
      <group scale={selected ? 1.05 : 1}>
        {children}
      </group>
      
      {/* Invisible hit-box to make clicking easier on wireframes */}
      <mesh visible={false}>
        <cylinderGeometry args={[labelRadius, labelRadius, 1.5, 16]} />
        <meshBasicMaterial />
      </mesh>

      <Html distanceFactor={12} position={[0, labelRadius + 0.4, 0]}>
        <div style={{
          pointerEvents: "none", padding: "4px 8px", borderRadius: 4, whiteSpace: "nowrap",
          color: selected ? "#000" : color, background: selected ? color : "rgba(8, 16, 25, 0.85)",
          border: `1px solid ${color}`, font: "bold 11px monospace",
          textTransform: "uppercase", boxShadow: `0 0 10px ${color}`
        }}>
          {item.label} [{Math.round(item.severity * 100)}%]
        </div>
      </Html>
    </group>
  );
}

function EngineScene({ assessments, mode, selectedPart, setSelectedPart }: any) {
  const status = (part: EnginePartId) => assessments.find((a: PartAssessment) => a.part === part)?.status || "NORMAL";
  const color = (part: EnginePartId) => colorFor(status(part), selectedPart === part);
  const getAssesment = (part: EnginePartId) => assessments.find((a: PartAssessment) => a.part === part);

  return (
    // Isometric angle for standard viewing
    <group rotation={[0, -Math.PI / 4, 0]}> 
    
       {/* 1. BYPASS NACELLE */}
       <ClickablePart id="bypass" item={getAssesment("bypass")} position={[0,0,0]} labelRadius={2.2} mode={mode} selectedPart={selectedPart} setSelectedPart={setSelectedPart}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
             <cylinderGeometry args={[2.1, 2.1, 7.5, 64, 1, true]} />
             {/* Sleek transparent glass material */}
             <meshStandardMaterial color="#224455" transparent opacity={mode === 'cutaway' ? 0.05 : 0.25} metalness={0.9} roughness={0.1} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
             <cylinderGeometry args={[2.12, 2.12, 7.5, 32, 8, true]} />
             <meshStandardMaterial color={color("bypass")} wireframe transparent opacity={0.3} />
          </mesh>
       </ClickablePart>

       {/* 2. FRONT FAN */}
       <ClickablePart id="fan" item={getAssesment("fan")} position={[0,0,2.8]} labelRadius={2.0} mode={mode} selectedPart={selectedPart} setSelectedPart={setSelectedPart}>
          <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
             <coneGeometry args={[0.4, 0.8, 32]} />
             <meshStandardMaterial color="#8899aa" metalness={0.8} />
          </mesh>
          <BladeStage count={24} innerRadius={0.4} outerRadius={1.9} zPosition={0} color={color("fan")} speed={4} tilt={0.5} />
       </ClickablePart>

       {/* 3. LOW PRESSURE COMPRESSOR */}
       <ClickablePart id="lpc" item={getAssesment("lpc")} position={[0,0,1.5]} labelRadius={1.3} mode={mode} selectedPart={selectedPart} setSelectedPart={setSelectedPart}>
          <BladeStage count={36} innerRadius={0.3} outerRadius={1.2} zPosition={0.4} color={color("lpc")} speed={2.5} tilt={0.4}/>
          <BladeStage count={36} innerRadius={0.3} outerRadius={1.1} zPosition={0} color={color("lpc")} speed={2.5} tilt={0.4}/>
          <BladeStage count={36} innerRadius={0.3} outerRadius={1.0} zPosition={-0.4} color={color("lpc")} speed={2.5} tilt={0.4}/>
       </ClickablePart>

       {/* 4. HIGH PRESSURE COMPRESSOR */}
       <ClickablePart id="hpc" item={getAssesment("hpc")} position={[0,0,0]} labelRadius={0.9} mode={mode} selectedPart={selectedPart} setSelectedPart={setSelectedPart}>
          <BladeStage count={48} innerRadius={0.3} outerRadius={0.9} zPosition={0.4} color={color("hpc")} speed={3.5} tilt={0.3}/>
          <BladeStage count={48} innerRadius={0.3} outerRadius={0.8} zPosition={0.15} color={color("hpc")} speed={3.5} tilt={0.3}/>
          <BladeStage count={48} innerRadius={0.3} outerRadius={0.8} zPosition={-0.15} color={color("hpc")} speed={3.5} tilt={0.3}/>
          <BladeStage count={48} innerRadius={0.3} outerRadius={0.8} zPosition={-0.4} color={color("hpc")} speed={3.5} tilt={0.3}/>
       </ClickablePart>

       {/* 5. COMBUSTOR (GLOWS HOT) */}
       <ClickablePart id="combustor" item={getAssesment("combustor")} position={[0,0,-1.2]} labelRadius={1.0} mode={mode} selectedPart={selectedPart} setSelectedPart={setSelectedPart}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
             <torusGeometry args={[0.6, 0.2, 16, 64]} />
             <meshStandardMaterial color={color("combustor")} emissive={status("combustor") === "CRITICAL" ? "#ff0000" : color("combustor")} emissiveIntensity={status("combustor") === "CRITICAL" ? 2 : 0.6} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.3]}>
             <torusGeometry args={[0.6, 0.15, 16, 64]} />
             <meshStandardMaterial color={color("combustor")} emissive={status("combustor") === "CRITICAL" ? "#ff0000" : color("combustor")} emissiveIntensity={status("combustor") === "CRITICAL" ? 2 : 0.4} />
          </mesh>
          {/* Dynamic Lighting from the combustor */}
          <pointLight color={color("combustor")} intensity={status("combustor") === "CRITICAL" ? 3 : 1} distance={5} />
       </ClickablePart>

       {/* 6. TURBINE STAGES */}
       <ClickablePart id="turbine" item={getAssesment("turbine")} position={[0,0,-2.2]} labelRadius={1.1} mode={mode} selectedPart={selectedPart} setSelectedPart={setSelectedPart}>
          <BladeStage count={40} innerRadius={0.3} outerRadius={0.9} zPosition={0.3} color={color("turbine")} speed={3.5} tilt={-0.3}/>
          <BladeStage count={32} innerRadius={0.3} outerRadius={1.0} zPosition={-0.2} color={color("turbine")} speed={2.5} tilt={-0.4}/>
       </ClickablePart>

       {/* 7. EXHAUST CONE */}
       <ClickablePart id="exhaust" item={getAssesment("exhaust")} position={[0,0,-3.2]} labelRadius={1.2} mode={mode} selectedPart={selectedPart} setSelectedPart={setSelectedPart}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
             <cylinderGeometry args={[0.8, 0.3, 1.5, 32]} />
             <meshStandardMaterial color={color("exhaust")} metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.2]}>
             <coneGeometry args={[0.4, 1.8, 32]} />
             <meshStandardMaterial color="#445566" metalness={0.8} />
          </mesh>
       </ClickablePart>

       {/* 8. SHAFTS */}
       <ClickablePart id="shafts" item={getAssesment("shafts")} position={[0,0,0]} labelRadius={0.3} mode={mode} selectedPart={selectedPart} setSelectedPart={setSelectedPart}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.5]}>
             <cylinderGeometry args={[0.2, 0.2, 5.5, 32]} />
             <meshStandardMaterial color={color("shafts")} metalness={1} roughness={0.1} />
          </mesh>
       </ClickablePart>
    </group>
  );
}

export default function EngineTwin({ assessments, mode, selectedPart, setSelectedPart }: any) {
  return (
    <Canvas camera={{ position: [6, 4, 7], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#081019"]} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#3a6b8f", "#0a0a12", 0.6]} />
      <directionalLight position={[5, 10, 5]} intensity={2.5} color="#ffffff" />
      <directionalLight position={[-5, -5, -5]} intensity={1.0} color="#00aaff" />
      
      <EngineScene assessments={assessments} mode={mode} selectedPart={selectedPart} setSelectedPart={setSelectedPart} />
      
      <OrbitControls enablePan={false} minDistance={4.0} maxDistance={15} />
    </Canvas>
  );
}