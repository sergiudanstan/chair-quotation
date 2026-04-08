import type { ChairParams } from "../model/manifold";
import type { PricingConfig, MaterialSelection } from "./materials";

export interface PriceBreakdown {
  volumeCm3: number;
  weightKg: number;
  surfaceAreaM2: number;
  materialCost: number;
  finishCost: number;
  upholsteryCost: number;
  laborMinutes: number;
  laborCost: number;
  subtotal: number;
  overhead: number;
  profit: number;
  total: number;
  currency: string;
}

// Analytical volume from chair dimensions (mm^3).
// Mirrors the assembly in manifold.ts — each part is a simple box.
function computeVolumeMm3(p: ChairParams): number {
  const lt = p.legThickness;
  const legInset = lt / 2;
  const xL = -(p.seatWidth / 2 - legInset);
  const xR = p.seatWidth / 2 - legInset;
  const yF = p.seatDepth / 2 - legInset;
  const yB = -(p.seatDepth / 2 - legInset);

  const apronH = lt * 2.0;
  const apronT = lt * 0.67;
  const slatH = lt * 0.7;
  const slatD = lt * 0.65;
  const topRailH = lt * 1.0;
  const panelW = xR - xL - lt;
  const ss = lt * 0.5;
  const stretcherLen = xR - xL + lt;

  let vol = 0;

  // Seat panel
  vol += p.seatWidth * p.seatDepth * p.seatThickness;

  // 4 apron rails
  vol += p.seatWidth * apronT * apronH; // front
  vol += p.seatWidth * apronT * apronH; // back
  vol += apronT * p.seatDepth * apronH; // left
  vol += apronT * p.seatDepth * apronH; // right

  // 4 legs (floor to seat height)
  vol += 4 * lt * lt * p.seatHeight;

  // Front stretcher
  vol += stretcherLen * ss * ss;

  // Backrest
  if (p.backrestHeight > 0) {
    // 2 back posts
    vol += 2 * lt * lt * p.backrestHeight;
    // Top rail
    vol += panelW * slatD * topRailH;
    // 4 slats
    vol += 4 * panelW * slatD * slatH;
  }

  // Armrests
  if (p.armrestHeight > 0) {
    const armLen = yF - yB + lt;
    vol += 2 * lt * armLen * p.armrestThickness;
  }

  return vol;
}

// Analytical surface area (mm^2) — sum of outer faces of each box.
// Approximation: counts all 6 faces of each box (some are hidden by unions).
function computeSurfaceAreaMm2(p: ChairParams): number {
  const lt = p.legThickness;
  const legInset = lt / 2;
  const xL = -(p.seatWidth / 2 - legInset);
  const xR = p.seatWidth / 2 - legInset;
  const yF = p.seatDepth / 2 - legInset;
  const yB = -(p.seatDepth / 2 - legInset);

  const apronH = lt * 2.0;
  const apronT = lt * 0.67;
  const slatH = lt * 0.7;
  const slatD = lt * 0.65;
  const topRailH = lt * 1.0;
  const panelW = xR - xL - lt;
  const ss = lt * 0.5;
  const stretcherLen = xR - xL + lt;

  const boxSA = (w: number, d: number, h: number) =>
    2 * (w * d + w * h + d * h);

  let sa = 0;

  // Seat
  sa += boxSA(p.seatWidth, p.seatDepth, p.seatThickness);

  // Aprons
  sa += 2 * boxSA(p.seatWidth, apronT, apronH);
  sa += 2 * boxSA(apronT, p.seatDepth, apronH);

  // Legs
  sa += 4 * boxSA(lt, lt, p.seatHeight);

  // Stretcher
  sa += boxSA(stretcherLen, ss, ss);

  // Backrest
  if (p.backrestHeight > 0) {
    sa += 2 * boxSA(lt, lt, p.backrestHeight);
    sa += boxSA(panelW, slatD, topRailH);
    sa += 4 * boxSA(panelW, slatD, slatH);
  }

  // Armrests
  if (p.armrestHeight > 0) {
    const armLen = yF - yB + lt;
    sa += 2 * boxSA(lt, armLen, p.armrestThickness);
  }

  return sa;
}

function computeLaborMinutes(p: ChairParams, labor: PricingConfig["labor"]): number {
  let mins = labor.baseMinutes;

  if (p.backrestHeight > 0) {
    mins += 4 * labor.perBackSlat;
    mins += p.backrestTilt * labor.complexityPerDegreeOfTilt;
  }

  if (p.armrestHeight > 0) {
    mins += 2 * labor.perArmrest;
  }

  return mins;
}

export function computePrice(
  params: ChairParams,
  selection: MaterialSelection,
  config: PricingConfig,
): PriceBreakdown {
  const mat = config.materials[selection.woodType];
  const finish = mat.finishes[selection.finish];
  const upholstery = config.upholstery[selection.upholstery];

  const volumeMm3 = computeVolumeMm3(params);
  const volumeCm3 = (volumeMm3 / 1000) * config.wasteFactor;
  const weightKg = volumeCm3 * mat.densityKgPerCm3;

  const surfaceAreaMm2 = computeSurfaceAreaMm2(params);
  const surfaceAreaM2 = surfaceAreaMm2 / 1_000_000;

  const materialCost = volumeCm3 * mat.pricePerCm3;
  const finishCost = surfaceAreaM2 * finish.pricePerM2;

  // Upholstery applies to seat top surface only
  const seatAreaM2 = (params.seatWidth * params.seatDepth) / 1_000_000;
  const upholsteryCost = seatAreaM2 * upholstery.pricePerM2;

  const laborMinutes = computeLaborMinutes(params, config.labor);
  const laborCost = (laborMinutes / 60) * config.laborRatePerHour;

  const subtotal = materialCost + finishCost + upholsteryCost + laborCost;
  const overhead = subtotal * (config.overheadMultiplier - 1);
  const beforeProfit = subtotal + overhead;
  const profit = beforeProfit * (config.profitMarginPercent / 100);
  const total = Math.max(beforeProfit + profit, config.minimumPrice);

  return {
    volumeCm3,
    weightKg,
    surfaceAreaM2,
    materialCost,
    finishCost,
    upholsteryCost,
    laborMinutes,
    laborCost,
    subtotal,
    overhead,
    profit,
    total,
    currency: config.currency,
  };
}
