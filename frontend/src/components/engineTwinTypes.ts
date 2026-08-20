export type EnginePartId =
  | "fan"
  | "bypass"
  | "lpc"
  | "hpc"
  | "combustor"
  | "turbine"
  | "shafts"
  | "exhaust";

export type EngineStatus = "NORMAL" | "WARNING" | "CRITICAL";

export type PartAssessment = {
  part: EnginePartId;
  label: string;
  severity: number;
  status: EngineStatus;
  evidence: string;
  sensors: number[];
  recommendation: string;
};

export type TwinMode = "standard" | "exploded" | "cutaway";