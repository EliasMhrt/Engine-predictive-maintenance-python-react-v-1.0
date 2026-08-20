import type { EnginePartId, EngineStatus, PartAssessment } from "./engineTwinTypes";

export type SensorTelemetry = Record<string, number>;

const PARTS: Array<{
  part: EnginePartId;
  label: string;
  sensors: number[];
  evidence: string;
  recommendation: string;
}> = [
  {
    part: "fan",
    label: "Fan and intake",
    sensors: [8, 13, 18, 19],
    evidence: "Rotational-speed and demanded-speed indicators associated with the fan shaft.",
    recommendation: "Inspect fan blades, hub, inlet guide area, and low-pressure shaft alignment.",
  },
  {
    part: "bypass",
    label: "Bypass duct",
    sensors: [1, 5, 6],
    evidence: "Inlet temperature and pressure context associated with the bypass flow path.",
    recommendation: "Inspect nacelle, bypass duct, guide vanes, and inlet pressure condition.",
  },
  {
    part: "lpc",
    label: "Low-pressure compressor",
    sensors: [2, 7, 12],
    evidence: "Temperature, pressure, and flow-related indicators near the low-pressure compressor.",
    recommendation: "Inspect LPC stages for fouling, erosion, or abnormal pressure rise.",
  },
  {
    part: "hpc",
    label: "High-pressure compressor",
    sensors: [3, 7, 11, 14],
    evidence: "Core temperature, outlet pressure, static pressure, and corrected core speed indicators.",
    recommendation: "Inspect HPC stages and variable geometry for degradation or compressor efficiency loss.",
  },
  {
    part: "combustor",
    label: "Combustor and fuel system",
    sensors: [4, 10, 15, 16, 17],
    evidence: "Exhaust-temperature, pressure-ratio, bypass-ratio, fuel-air, and bleed-related indicators.",
    recommendation: "Inspect combustor liner, fuel nozzles, flame pattern, and cooling-air paths.",
  },
  {
    part: "turbine",
    label: "Turbine stages",
    sensors: [4, 9, 14, 20, 21],
    evidence: "Exhaust temperature, core speed, corrected core speed, and coolant-bleed indicators.",
    recommendation: "Inspect HPT/LPT blades, seals, thermal damage, and turbine clearance.",
  },
  {
    part: "shafts",
    label: "LP and HP shafts",
    sensors: [8, 9, 13, 14],
    evidence: "Fan/core speed and corrected-speed indicators associated with the two spool systems.",
    recommendation: "Inspect shaft balance, bearings, couplings, and spool-speed consistency.",
  },
  {
    part: "exhaust",
    label: "Mixer and exhaust nozzle",
    sensors: [4, 10, 20, 21],
    evidence: "Exhaust-temperature, pressure-ratio, and cooling-bleed indicators near the exhaust flow path.",
    recommendation: "Inspect nozzle petals, mixer, exhaust flow path, and thermal distress.",
  },
];

function statusForSeverity(severity: number): EngineStatus {
  if (severity >= 0.72) return "CRITICAL";
  if (severity >= 0.42) return "WARNING";
  return "NORMAL";
}

type SensorProfile = { min: number; max: number; healthy: number };

const SENSOR_PROFILES: Record<string, SensorProfile> = {
  sensor_1: { min: 515.0, max: 522.0, healthy: 518.67 },
  sensor_2: { min: 640.0, max: 646.0, healthy: 642.38 },
  sensor_3: { min: 1570.0, max: 1620.0, healthy: 1586.84 },
  sensor_4: { min: 1380.0, max: 1445.0, healthy: 1402.76 },
  sensor_5: { min: 14.0, max: 15.5, healthy: 14.62 },
  sensor_6: { min: 21.5, max: 21.7, healthy: 21.61 },
  sensor_7: { min: 548.0, max: 558.0, healthy: 553.95 },
  sensor_8: { min: 2387.5, max: 2388.8, healthy: 2388.06 },
  sensor_9: { min: 9020.0, max: 9220.0, healthy: 9056.01 },
  sensor_10: { min: 1.2, max: 1.4, healthy: 1.3 },
  sensor_11: { min: 46.5, max: 48.8, healthy: 47.35 },
  sensor_12: { min: 518.0, max: 524.0, healthy: 521.91 },
  sensor_13: { min: 2387.5, max: 2388.8, healthy: 2388.06 },
  sensor_14: { min: 8090.0, max: 8220.0, healthy: 8137.37 },
  sensor_15: { min: 8.3, max: 8.6, healthy: 8.4183 },
  sensor_16: { min: 0.02, max: 0.04, healthy: 0.03 },
  sensor_17: { min: 385.0, max: 402.0, healthy: 392.0 },
  sensor_18: { min: 2380.0, max: 2390.0, healthy: 2388.0 },
  sensor_19: { min: 95.0, max: 105.0, healthy: 100.0 },
  sensor_20: { min: 38.0, max: 39.8, healthy: 38.93 },
  sensor_21: { min: 22.8, max: 23.8, healthy: 23.36 },
};

function sensorDeviation(key: string, value: number): number {
  const profile = SENSOR_PROFILES[key];
  if (!profile) return 0;
  const halfRange = (profile.max - profile.min) / 2;
  if (halfRange <= 0) return 0;
  return Math.min(1, Math.abs(value - profile.healthy) / halfRange);
}

export function assessParts(
  telemetry: SensorTelemetry,
  rulCycles: number,
): PartAssessment[] {
  const globalRisk = Math.max(0, Math.min(1, 1 - rulCycles / 150));

  return PARTS.map((definition) => {
    const normalizedDeviations = definition.sensors.map((sensorNumber) => {
      const key = `sensor_${sensorNumber}`;
      const value = Number(telemetry[key]);
      return Number.isFinite(value) ? sensorDeviation(key, value) : 0;
    });
    const localDeviation = normalizedDeviations.length
      ? Math.min(1, normalizedDeviations.reduce((sum, value) => sum + value, 0) / normalizedDeviations.length)
      : 0;
    const severity = Math.min(1, globalRisk * 0.72 + localDeviation * 0.28);

    return {
      ...definition,
      severity: Number(severity.toFixed(3)),
      status: statusForSeverity(severity),
    };
  });
}