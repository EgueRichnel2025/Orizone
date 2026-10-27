import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  GitBranch,
  Info,
  LineChart,
  ListChecks,
  ScanSearch,
  Sigma,
} from "lucide-react";
import { Link } from "react-router";

import type {
  ConstraintOperator,
  LinearConstraint,
  OptimizationProblem,
  OptimizationVariable,
} from "../types/optimization";
import { loadOptimizationProblem } from "../utils/optimization-storage";
import "../styles/analysis-interactive.css";

type AnalysisTab = "summary" | "characteristics" | "graph";

interface Point {
  x: number;
  y: number;
}

interface PlotBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

interface HalfPlane {
  a: number;
  b: number;
  rhs: number;
}

interface PlotLine {
  key: string;
  label: string;
  points: [Point, Point];
  isBound: boolean;
}

const SUBSCRIPTS = ["₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉", "₁₀", "₁₁", "₁₂"];
const SVG = { left: 52, right: 694, top: 20, bottom: 326 };
const EPSILON = 1e-8;

function numberText(value: number): string {
  const rounded = Math.abs(value) < 1e-10 ? 0 : value;
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 4,
  }).format(rounded);
}

function variableName(index: number): string {
  return `x${SUBSCRIPTS[index] ?? `_${index + 1}`}`;
}

function linearExpression(coefficients: number[]): string {
  const terms: string[] = [];

  coefficients.forEach((coefficient, index) => {
    if (Math.abs(coefficient) < EPSILON) return;

    const magnitude = Math.abs(coefficient);
    const coefficientText = Math.abs(magnitude - 1) < EPSILON
      ? ""
      : numberText(magnitude);
    const term = `${coefficientText}${variableName(index)}`;

    if (terms.length === 0) {
      terms.push(coefficient < 0 ? `−${term}` : term);
    } else {
      terms.push(coefficient < 0 ? ` − ${term}` : ` + ${term}`);
    }
  });

  return terms.join("") || "0";
}

function operatorText(operator: ConstraintOperator): string {
  if (operator === "<=") return "≤";
  if (operator === ">=") return "≥";
  return "=";
}

function variableTypeLabel(variable: OptimizationVariable): string {
  if (variable.type === "binary") return "Binaire · {0, 1}";
  if (variable.type === "integer") return "Entière · ℤ";
  return "Continue · ℝ";
}

function variableBoundsLabel(variable: OptimizationVariable): string {
  if (variable.type === "binary") return `${variable.name} ∈ {0, 1}`;

  const parts: string[] = [];
  if (variable.lowerBound !== null) {
    parts.push(`${numberText(variable.lowerBound)} ≤ ${variable.name}`);
  }
  if (variable.upperBound !== null) {
    parts.push(`${variable.name} ≤ ${numberText(variable.upperBound)}`);
  }

  return parts.join(" ; ") || "Aucune borne explicite";
}

function modelFamily(problem: OptimizationProblem): {
  title: string;
  method: string;
  description: string;
  discrete: boolean;
} {
  const discrete = problem.variables.some((variable) => variable.type !== "continuous");

  if (discrete) {
    return {
      title: "Programmation linéaire en variables discrètes",
      method: "Branch & Bound à envisager",
      description:
        "Au moins une variable est entière ou binaire. Une méthode de programmation entière peut être pertinente ; le choix définitif dépendra des propriétés du modèle et des capacités du solveur.",
      discrete: true,
    };
  }

  return {
    title: "Programmation linéaire continue",
    method: "Simplexe à envisager",
    description:
      "La fonction objectif et les contraintes sont linéaires, avec des variables continues. La faisabilité, la bornitude et les conditions d’application devront être vérifiées par le moteur mathématique.",
    discrete: false,
  };
}

function explicitBoundCount(problem: OptimizationProblem): number {
  return problem.variables.reduce((count, variable) => {
    if (variable.type === "binary") return count + 2;
    return count + Number(variable.lowerBound !== null) + Number(variable.upperBound !== null);
  }, 0);
}

function getConstraintCounts(problem: OptimizationProblem) {
  return {
    upper: problem.constraints.filter((constraint) => constraint.operator === "<=").length,
    lower: problem.constraints.filter((constraint) => constraint.operator === ">=").length,
    equal: problem.constraints.filter((constraint) => constraint.operator === "=").length,
  };
}

function buildHalfPlanes(problem: OptimizationProblem): HalfPlane[] {
  const planes: HalfPlane[] = [];

  problem.constraints.forEach((constraint) => {
    const a = constraint.coefficients[0] ?? 0;
    const b = constraint.coefficients[1] ?? 0;

    if (constraint.operator === "<=") {
      planes.push({ a, b, rhs: constraint.rhs });
    } else if (constraint.operator === ">=") {
      planes.push({ a: -a, b: -b, rhs: -constraint.rhs });
    } else {
      planes.push({ a, b, rhs: constraint.rhs });
      planes.push({ a: -a, b: -b, rhs: -constraint.rhs });
    }
  });

  const first = problem.variables[0];
  const second = problem.variables[1];

  if (first) {
    const lower = first.type === "binary" ? 0 : first.lowerBound;
    const upper = first.type === "binary" ? 1 : first.upperBound;
    if (lower !== null) planes.push({ a: -1, b: 0, rhs: -lower });
    if (upper !== null) planes.push({ a: 1, b: 0, rhs: upper });
  }

  if (second) {
    const lower = second.type === "binary" ? 0 : second.lowerBound;
    const upper = second.type === "binary" ? 1 : second.upperBound;
    if (lower !== null) planes.push({ a: 0, b: -1, rhs: -lower });
    if (upper !== null) planes.push({ a: 0, b: 1, rhs: upper });
  }

  return planes;
}

function estimateScale(problem: OptimizationProblem): number {
  const candidates = [10];

  for (const constraint of problem.constraints) {
    constraint.coefficients.slice(0, 2).forEach((coefficient) => {
      if (Math.abs(coefficient) > EPSILON) {
        candidates.push(Math.abs(constraint.rhs / coefficient));
      }
    });
  }

  return Math.max(5, Math.min(100, Math.max(...candidates) * 1.15));
}

function rangeForVariable(variable: OptimizationVariable, span: number): [number, number] {
  const lower = variable.type === "binary" ? 0 : variable.lowerBound;
  const upper = variable.type === "binary" ? 1 : variable.upperBound;

  if (lower !== null && upper !== null) {
    const width = Math.max(upper - lower, 1);
    return [lower - width * 0.12, upper + width * 0.12];
  }
  if (lower !== null) return [lower - span * 0.12, lower + span];
  if (upper !== null) return [upper - span, upper + span * 0.12];
  return [-span, span];
}

function getPlotBounds(problem: OptimizationProblem): PlotBounds {
  const span = estimateScale(problem);
  const first = problem.variables[0];
  const second = problem.variables[1];
  const [xMin, xMax] = first ? rangeForVariable(first, span) : [-span, span];
  const [yMin, yMax] = second ? rangeForVariable(second, span) : [-span, span];

  return {
    xMin: xMin < xMax ? xMin : xMin - 1,
    xMax: xMin < xMax ? xMax : xMax + 1,
    yMin: yMin < yMax ? yMin : yMin - 1,
    yMax: yMin < yMax ? yMax : yMax + 1,
  };
}

function clipPolygon(polygon: Point[], plane: HalfPlane): Point[] {
  if (polygon.length === 0) return [];

  const result: Point[] = [];
  const signedDistance = (point: Point) => plane.rhs - plane.a * point.x - plane.b * point.y;

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const currentDistance = signedDistance(current);
    const previousDistance = signedDistance(previous);
    const currentInside = currentDistance >= -EPSILON;
    const previousInside = previousDistance >= -EPSILON;

    if (currentInside !== previousInside) {
      const denominator = previousDistance - currentDistance;
      if (Math.abs(denominator) > EPSILON) {
        const t = previousDistance / denominator;
        result.push({
          x: previous.x + (current.x - previous.x) * t,
          y: previous.y + (current.y - previous.y) * t,
        });
      }
    }

    if (currentInside) result.push(current);
  }

  return result;
}

function polygonArea(polygon: Point[]): number {
  if (polygon.length < 3) return 0;
  let twiceArea = 0;

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }

  return Math.abs(twiceArea) / 2;
}

function clipToFeasibleRegion(problem: OptimizationProblem, bounds: PlotBounds): Point[] {
  let polygon: Point[] = [
    { x: bounds.xMin, y: bounds.yMin },
    { x: bounds.xMax, y: bounds.yMin },
    { x: bounds.xMax, y: bounds.yMax },
    { x: bounds.xMin, y: bounds.yMax },
  ];

  for (const plane of buildHalfPlanes(problem)) {
    polygon = clipPolygon(polygon, plane);
    if (polygon.length === 0) break;
  }

  return polygon;
}

function lineIntersections(a: number, b: number, rhs: number, bounds: PlotBounds): Point[] {
  if (Math.abs(a) < EPSILON && Math.abs(b) < EPSILON) return [];

  const points: Point[] = [];
  const addPoint = (point: Point) => {
    if (
      point.x < bounds.xMin - EPSILON || point.x > bounds.xMax + EPSILON ||
      point.y < bounds.yMin - EPSILON || point.y > bounds.yMax + EPSILON
    ) return;

    if (!points.some((existing) => Math.hypot(existing.x - point.x, existing.y - point.y) < 1e-6)) {
      points.push(point);
    }
  };

  if (Math.abs(b) > EPSILON) {
    addPoint({ x: bounds.xMin, y: (rhs - a * bounds.xMin) / b });
    addPoint({ x: bounds.xMax, y: (rhs - a * bounds.xMax) / b });
  }
  if (Math.abs(a) > EPSILON) {
    addPoint({ x: (rhs - b * bounds.yMin) / a, y: bounds.yMin });
    addPoint({ x: (rhs - b * bounds.yMax) / a, y: bounds.yMax });
  }

  if (points.length <= 2) return points;

  let farthest: [Point, Point] = [points[0], points[1]];
  let farthestDistance = -1;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthest = [points[i], points[j]];
      }
    }
  }
  return farthest;
}

function mapPoint(point: Point, bounds: PlotBounds): Point {
  return {
    x: SVG.left + ((point.x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * (SVG.right - SVG.left),
    y: SVG.bottom - ((point.y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * (SVG.bottom - SVG.top),
  };
}

function constraintLines(problem: OptimizationProblem, bounds: PlotBounds): PlotLine[] {
  const lines: PlotLine[] = [];

  problem.constraints.forEach((constraint: LinearConstraint, index) => {
    const intersections = lineIntersections(
      constraint.coefficients[0] ?? 0,
      constraint.coefficients[1] ?? 0,
      constraint.rhs,
      bounds,
    );

    if (intersections.length >= 2) {
      lines.push({
        key: `constraint-${index}`,
        label: `C${index + 1} ${operatorText(constraint.operator)}`,
        points: [intersections[0], intersections[1]],
        isBound: false,
      });
    }
  });

  const variables = problem.variables.slice(0, 2);
  variables.forEach((variable, index) => {
    const lower = variable.type === "binary" ? 0 : variable.lowerBound;
    const upper = variable.type === "binary" ? 1 : variable.upperBound;
    const vertical = index === 0;
    const values = [
      ...(lower === null ? [] : [{ value: lower, label: `${variableName(index)} ≥ ${numberText(lower)}` }]),
      ...(upper === null ? [] : [{ value: upper, label: `${variableName(index)} ≤ ${numberText(upper)}` }]),
    ];

    values.forEach((bound, boundIndex) => {
      const point1 = vertical
        ? { x: bound.value, y: bounds.yMin }
        : { x: bounds.xMin, y: bound.value };
      const point2 = vertical
        ? { x: bound.value, y: bounds.yMax }
        : { x: bounds.xMax, y: bound.value };

      // Ne dessine une borne que si sa droite coupe la fenêtre du graphique.
      if (vertical && (bound.value < bounds.xMin || bound.value > bounds.xMax)) return;
      if (!vertical && (bound.value < bounds.yMin || bound.value > bounds.yMax)) return;

      lines.push({
        key: `bound-${index}-${boundIndex}`,
        label: bound.label,
        points: [point1, point2],
        isBound: true,
      });
    });
  });

  return lines;
}

function MathFormulation({ problem }: { problem: OptimizationProblem }) {
  return (
    <div className="analysis-formulation">
      <div className="analysis-objective-equation">
        <span>{problem.direction === "max" ? "Maximiser" : "Minimiser"}</span>
        <strong>Z = {linearExpression(problem.objective)}</strong>
      </div>
      <div className="analysis-constraint-list">
        <span className="analysis-section-caption">Sous contraintes (s.c.)</span>
        {problem.constraints.map((constraint, index) => (
          <div className="analysis-equation-row" key={`constraint-${index}`}>
            <span>C{index + 1}</span>
            <code>
              {linearExpression(constraint.coefficients)} {operatorText(constraint.operator)} {numberText(constraint.rhs)}
            </code>
          </div>
        ))}
      </div>
      <div className="analysis-variable-domains">
        <span className="analysis-section-caption">Domaines des variables</span>
        {problem.variables.map((variable, index) => (
          <div className="analysis-equation-row" key={variable.name}>
            <span>{variableName(index)}</span>
            <code>{variableBoundsLabel(variable)} · {variableTypeLabel(variable)}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyModelState() {
  return (
    <div className="result-empty-state analysis-empty-state">
      <div className="empty-state-icon"><CheckCircle2 size={22} /></div>
      <h3>Aucun modèle à analyser</h3>
      <p>Commencez par renseigner la fonction objectif, les contraintes et les variables, puis validez le modèle. Les données seront reprises ici automatiquement.</p>
      <Link to="/solve" className="text-action">Retourner au formulaire <ArrowRight size={15} /></Link>
    </div>
  );
}

function SummaryPanel({ problem }: { problem: OptimizationProblem }) {
  const family = modelFamily(problem);
  const counts = getConstraintCounts(problem);
  const cards = [
    { label: "Nature du problème", value: family.title },
    { label: "Variables", value: String(problem.variables.length) },
    { label: "Contraintes", value: String(problem.constraints.length) },
  ];

  return (
    <div className="analysis-tab-panel" role="tabpanel" id="analysis-panel-summary" aria-labelledby="analysis-tab-summary" tabIndex={0}>
      <div className="analysis-summary-grid">
        {cards.map((item) => (
          <article className="analysis-summary-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="analysis-content-grid">
        <article className="workspace-card formulation-card">
          <div className="workspace-card-heading">
            <div>
              <span className="card-kicker">MODÈLE MATHÉMATIQUE</span>
              <h2>Formulation du problème</h2>
            </div>
            <span className="pending-badge analysis-model-badge"><span /> Modèle chargé</span>
          </div>
          <MathFormulation problem={problem} />
        </article>

        <article className="workspace-card analysis-structure-card">
          <div className="workspace-card-heading">
            <div>
              <span className="card-kicker">STRUCTURE IDENTIFIÉE</span>
              <h2>Premiers repères</h2>
            </div>
            <ScanSearch size={19} className="card-heading-icon" />
          </div>
          <div className="analysis-facts-list">
            <div><span>Objectif</span><strong>{problem.direction === "max" ? "Maximisation" : "Minimisation"}</strong></div>
            <div><span>Inégalités ≤</span><strong>{counts.upper}</strong></div>
            <div><span>Inégalités ≥</span><strong>{counts.lower}</strong></div>
            <div><span>Égalités</span><strong>{counts.equal}</strong></div>
            <div><span>Bornes explicites</span><strong>{explicitBoundCount(problem)}</strong></div>
          </div>
          <p className="analysis-caveat"><Info size={15} /> La faisabilité et la bornitude ne sont pas encore certifiées par un solveur.</p>
        </article>
      </div>

      <article className="workspace-card recommendation-card analysis-recommendation-card">
        <div className="recommendation-icon">{family.discrete ? <GitBranch size={21} /> : <Sigma size={21} />}</div>
        <div>
          <span className="card-kicker">FAMILLE DE MÉTHODES À ENVISAGER</span>
          <h2>{family.method}</h2>
          <p>{family.description}</p>
        </div>
      </article>
    </div>
  );
}

function CharacteristicsPanel({ problem }: { problem: OptimizationProblem }) {
  const family = modelFamily(problem);
  const counts = getConstraintCounts(problem);
  const allBoundsSet = problem.variables.every((variable) =>
    variable.type === "binary" || variable.lowerBound !== null || variable.upperBound !== null,
  );

  return (
    <div className="analysis-tab-panel" role="tabpanel" id="analysis-panel-characteristics" aria-labelledby="analysis-tab-characteristics" tabIndex={0}>
      <div className="analysis-detail-grid">
        <article className="workspace-card analysis-detail-card">
          <div className="workspace-card-heading">
            <div>
              <span className="card-kicker">VARIABLES</span>
              <h2>Domaines et bornes</h2>
            </div>
            <ListChecks size={19} className="card-heading-icon" />
          </div>
          <div className="analysis-variable-list">
            {problem.variables.map((variable, index) => (
              <div className="analysis-variable-row" key={variable.name}>
                <span className="analysis-variable-index">{variableName(index)}</span>
                <div>
                  <strong>{variableTypeLabel(variable)}</strong>
                  <small>{variableBoundsLabel(variable)}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="workspace-card analysis-detail-card">
          <div className="workspace-card-heading">
            <div>
              <span className="card-kicker">CONTRAINTES</span>
              <h2>Relations du modèle</h2>
            </div>
            <CircleHelp size={19} className="card-heading-icon" />
          </div>
          <div className="analysis-constraint-cards">
            {problem.constraints.map((constraint, index) => (
              <div className="analysis-constraint-card" key={`characteristic-${index}`}>
                <span>C{index + 1}</span>
                <code>{linearExpression(constraint.coefficients)} {operatorText(constraint.operator)} {numberText(constraint.rhs)}</code>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="workspace-card analysis-property-card">
        <div className="workspace-card-heading">
          <div>
            <span className="card-kicker">PROPRIÉTÉS IDENTIFIABLES</span>
            <h2>Ce que l’on sait déjà</h2>
          </div>
          <CheckCircle2 size={19} className="card-heading-icon" />
        </div>
        <div className="analysis-property-grid">
          <div><CheckCircle2 size={17} /><span><strong>Modèle linéaire</strong><small>Objectif et contraintes sont linéaires par construction.</small></span></div>
          <div><CheckCircle2 size={17} /><span><strong>{family.title}</strong><small>Déduit du type déclaré pour chaque variable.</small></span></div>
          <div><Info size={17} /><span><strong>{allBoundsSet ? "Des bornes sont déclarées pour chaque variable" : "Certaines bornes restent libres"}</strong><small>Les bornes facultatives ne sont pas transformées en hypothèses implicites.</small></span></div>
          <div className="analysis-property-pending"><CircleHelp size={17} /><span><strong>Faisabilité et bornitude : à déterminer</strong><small>Une analyse numérique est nécessaire pour conclure.</small></span></div>
        </div>
        <div className="analysis-constraint-counts">
          <span>{counts.upper} contrainte(s) ≤</span>
          <span>{counts.lower} contrainte(s) ≥</span>
          <span>{counts.equal} égalité(s)</span>
        </div>
      </article>
    </div>
  );
}

function GraphPanel({ problem }: { problem: OptimizationProblem }) {
  if (problem.variables.length !== 2) {
    return (
      <div className="analysis-tab-panel" role="tabpanel" id="analysis-panel-graph" aria-labelledby="analysis-tab-graph" tabIndex={0}>
        <div className="workspace-card analysis-graph-message">
          <div className="empty-state-icon"><LineChart size={22} /></div>
          <h2>Graphique géométrique indisponible pour ce modèle</h2>
          <p>La représentation plane nécessite exactement deux variables. Ce modèle en contient {problem.variables.length}. Ses contraintes restent disponibles dans les onglets Résumé et Caractéristiques.</p>
        </div>
      </div>
    );
  }

  const bounds = getPlotBounds(problem);
  const clippedPolygon = clipToFeasibleRegion(problem, bounds);
  const hasVisibleArea = polygonArea(clippedPolygon) > 1e-6;
  const lines = constraintLines(problem, bounds);
  const mappedPolygon = clippedPolygon.map((point) => mapPoint(point, bounds));
  const polygonPoints = mappedPolygon.map((point) => `${point.x},${point.y}`).join(" ");
  const xTicks = Array.from({ length: 9 }, (_, index) => bounds.xMin + ((bounds.xMax - bounds.xMin) * index) / 8);
  const yTicks = Array.from({ length: 7 }, (_, index) => bounds.yMin + ((bounds.yMax - bounds.yMin) * index) / 6);
  const xZeroVisible = bounds.xMin <= 0 && bounds.xMax >= 0;
  const yZeroVisible = bounds.yMin <= 0 && bounds.yMax >= 0;
  const discrete = problem.variables.some((variable) => variable.type !== "continuous");

  return (
    <div className="analysis-tab-panel" role="tabpanel" id="analysis-panel-graph" aria-labelledby="analysis-tab-graph" tabIndex={0}>
      <article className="workspace-card analysis-graph-card">
        <div className="workspace-card-heading">
          <div>
            <span className="card-kicker">VISUALISATION GÉOMÉTRIQUE</span>
            <h2>Contraintes et domaine admissible</h2>
          </div>
          <span className="pending-badge analysis-model-badge"><span /> Calculé à partir du modèle</span>
        </div>

        <div className="analysis-graph-canvas">
          <svg viewBox="0 0 720 370" role="img" aria-labelledby="analysis-plot-title analysis-plot-description">
            <title id="analysis-plot-title">Représentation des contraintes à deux variables</title>
            <desc id="analysis-plot-description">Les droites des contraintes et les bornes explicites sont dessinées dans la fenêtre d'affichage. La région colorée correspond à l'intersection visible des demi-plans.</desc>
            <defs>
              <clipPath id="analysis-plot-clip">
                <rect x={SVG.left} y={SVG.top} width={SVG.right - SVG.left} height={SVG.bottom - SVG.top} />
              </clipPath>
            </defs>
            <rect x={SVG.left} y={SVG.top} width={SVG.right - SVG.left} height={SVG.bottom - SVG.top} className="analysis-plot-background" />
            {xTicks.map((tick, index) => {
              const x = SVG.left + ((SVG.right - SVG.left) * index) / 8;
              return <g key={`xtick-${index}`}><line x1={x} y1={SVG.top} x2={x} y2={SVG.bottom} className="analysis-plot-grid" /><text x={x} y={SVG.bottom + 19} textAnchor="middle" className="analysis-plot-tick">{numberText(tick)}</text></g>;
            })}
            {yTicks.map((tick, index) => {
              const y = SVG.bottom - ((SVG.bottom - SVG.top) * index) / 6;
              return <g key={`ytick-${index}`}><line x1={SVG.left} y1={y} x2={SVG.right} y2={y} className="analysis-plot-grid" /><text x={SVG.left - 10} y={y + 4} textAnchor="end" className="analysis-plot-tick">{numberText(tick)}</text></g>;
            })}
            <g clipPath="url(#analysis-plot-clip)">
              {hasVisibleArea && <polygon points={polygonPoints} className="analysis-feasible-region" />}
              {yZeroVisible && <line x1={SVG.left} y1={mapPoint({ x: 0, y: 0 }, bounds).y} x2={SVG.right} y2={mapPoint({ x: 0, y: 0 }, bounds).y} className="analysis-zero-axis" />}
              {xZeroVisible && <line x1={mapPoint({ x: 0, y: 0 }, bounds).x} y1={SVG.top} x2={mapPoint({ x: 0, y: 0 }, bounds).x} y2={SVG.bottom} className="analysis-zero-axis" />}
              {lines.map((line, index) => {
                const first = mapPoint(line.points[0], bounds);
                const second = mapPoint(line.points[1], bounds);
                return <line key={line.key} x1={first.x} y1={first.y} x2={second.x} y2={second.y} className={line.isBound ? "analysis-bound-line" : `analysis-constraint-line analysis-constraint-line-${index % 4}`} />;
              })}
            </g>
            <text x={SVG.right} y={SVG.bottom + 39} textAnchor="end" className="analysis-plot-axis-label">{variableName(0)}</text>
            <text x={SVG.left - 25} y={SVG.top + 4} textAnchor="middle" className="analysis-plot-axis-label">{variableName(1)}</text>
          </svg>
        </div>

        <div className="analysis-graph-legend">
          {problem.constraints.map((constraint, index) => (
            <span key={`legend-${index}`}><i className={`analysis-legend-line analysis-legend-line-${index % 4}`} />C{index + 1}: {linearExpression(constraint.coefficients)} {operatorText(constraint.operator)} {numberText(constraint.rhs)}</span>
          ))}
          {lines.some((line) => line.isBound) && <span><i className="analysis-legend-line analysis-legend-bound" />Bornes explicites des variables</span>}
          {hasVisibleArea && <span><i className="analysis-legend-region" />Intersection visible</span>}
        </div>

        <p className="analysis-graph-note">
          <Info size={15} /> {hasVisibleArea
            ? "La zone colorée représente l'intersection visible des contraintes et des bornes dans cette fenêtre. Une fenêtre finie ne permet pas, à elle seule, de conclure si la région complète est bornée."
            : "Aucune surface réalisable n'est colorée dans cette fenêtre. Cela peut venir d'une égalité, d'une intersection sans surface ou d'une zone située hors de la fenêtre ; l'irréalisabilité globale n'est pas conclue ici."}
        </p>
        {discrete && <p className="analysis-graph-note analysis-graph-note-secondary"><Info size={15} /> Pour les variables entières ou binaires, ce dessin représente la relaxation géométrique continue ; les points entiers devront être examinés par la méthode de résolution discrète.</p>}
      </article>
    </div>
  );
}

export default function AnalysisPage() {
  const [problem] = useState<OptimizationProblem | null>(() => loadOptimizationProblem());
  const [activeTab, setActiveTab] = useState<AnalysisTab>("summary");

  const tabs: { id: AnalysisTab; label: string; icon: typeof ScanSearch }[] = [
    { id: "summary", label: "Résumé", icon: ScanSearch },
    { id: "characteristics", label: "Caractéristiques", icon: CircleHelp },
    { id: "graph", label: "Graphique", icon: LineChart },
  ];

  return (
    <section className="result-page analysis-page">
      <div className="result-page-heading analysis-page-heading">
        <span className="section-eyebrow">ÉTAPE 02 · COMPRENDRE</span>
        <h1>Analyse du <em>problème.</em></h1>
        <p>Examinez la structure du modèle, ses contraintes et les pistes de résolution avant de lancer un algorithme.</p>
      </div>

      {problem ? (
        <>
          <div className="analysis-page-status"><CheckCircle2 size={16} /><span>Modèle reçu et structure analysée</span><small>Les propriétés numériques restent à vérifier par un solveur.</small></div>
          <div className="result-tabs analysis-tabs" role="tablist" aria-label="Sections de l’analyse">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  type="button"
                  className={`result-tab${selected ? " is-active" : ""}`}
                  key={tab.id}
                  id={`analysis-tab-${tab.id}`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`analysis-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                    event.preventDefault();
                    const currentIndex = tabs.findIndex((item) => item.id === activeTab);
                    const nextIndex = event.key === "ArrowRight"
                      ? (currentIndex + 1) % tabs.length
                      : (currentIndex - 1 + tabs.length) % tabs.length;
                    setActiveTab(tabs[nextIndex].id);
                    document.getElementById(`analysis-tab-${tabs[nextIndex].id}`)?.focus();
                  }}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "summary" && <SummaryPanel problem={problem} />}
          {activeTab === "characteristics" && <CharacteristicsPanel problem={problem} />}
          {activeTab === "graph" && <GraphPanel problem={problem} />}

          <div className="result-page-footer-actions analysis-footer-actions">
            <Link to="/solve" className="button button-secondary">Modifier le modèle</Link>
            <Link to={modelFamily(problem).discrete ? "/branch-bound" : "/simplex"} className="button button-primary">
              Examiner la méthode adaptée <ArrowRight size={16} />
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="analysis-page-status is-pending"><Info size={16} /><span>Aucun modèle validé n’a été transmis</span></div>
          <EmptyModelState />
        </>
      )}
    </section>
  );
}
