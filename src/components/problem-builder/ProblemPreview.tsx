import type {
  ConstraintDraft,
  NumericInput,
  OptimizationDirection,
  VariableDraft,
} from "../../types/optimization";

interface ProblemPreviewProps {
  direction: OptimizationDirection;
  objective: NumericInput[];
  constraints: ConstraintDraft[];
  variables: VariableDraft[];
}

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

function variableName(index: number): string {
  return `x${String(index + 1)
    .split("")
    .map((digit) => SUBSCRIPT_DIGITS[digit] ?? digit)
    .join("")}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 8,
  }).format(value);
}

function formatExpression(
  coefficients: NumericInput[],
): string {
  let expression = "";

  coefficients.forEach((coefficient, index) => {
    if (coefficient === 0) {
      return;
    }

    const name = variableName(index);
    const isUnknown = coefficient === "";
    const isNegative =
      typeof coefficient === "number" && coefficient < 0;

    const magnitude = isUnknown
      ? `□${name}`
      : Math.abs(coefficient) === 1
        ? name
        : `${formatNumber(Math.abs(coefficient))}${name}`;

    if (expression === "") {
      expression = isNegative
        ? `−${magnitude}`
        : magnitude;
    } else {
      expression += isNegative
        ? ` − ${magnitude}`
        : ` + ${magnitude}`;
    }
  });

  return expression || "0";
}

function ProblemPreview({
  direction,
  objective,
  constraints,
  variables,
}: ProblemPreviewProps) {
  const domains = variables.map((variable, index) => {
    const name = variableName(index);

    if (variable.type === "binary") {
      return `${name} ∈ {0, 1}`;
    }

    if (variable.type === "integer") {
      return `${name} ∈ ℤ`;
    }

    return `${name} ∈ ℝ`;
  });

  const bounds = variables.flatMap((variable, index) => {
    if (variable.type === "binary") {
      return [];
    }

    const name = variableName(index);
    const lower = variable.lowerBound;
    const upper = variable.upperBound;

    if (lower !== "" && upper !== "") {
      return [
        `${formatNumber(lower)} ≤ ${name} ≤ ${formatNumber(upper)}`,
      ];
    }

    if (lower !== "") {
      return [`${name} ≥ ${formatNumber(lower)}`];
    }

    if (upper !== "") {
      return [`${name} ≤ ${formatNumber(upper)}`];
    }

    return [];
  });

  return (
    <section className="problem-preview">
      <header className="preview-header">
        <div>
          <span className="section-eyebrow">
            APERÇU EN DIRECT
          </span>

          <h2>Votre modèle mathématique</h2>
        </div>

        <span className="preview-indicator">
          <span />
          Mise à jour automatique
        </span>
      </header>

      <div className="math-display">
        <div className="math-objective">
          <span className="math-label">
            {direction === "max" ? "Maximiser" : "Minimiser"}
          </span>

          <div className="math-expression">
            Z = {formatExpression(objective)}
          </div>
        </div>

        <div className="math-divider" />

        <span className="math-label">
          SOUS CONTRAINTES
        </span>

        <div className="math-constraints">
          {constraints.map((constraint, index) => (
            <div className="math-constraint" key={index}>
              <span className="math-constraint-index">
                {index + 1}.
              </span>

              <span>
                {formatExpression(constraint.coefficients)}
              </span>

              <span className="math-operator">
                {constraint.operator === "<="
                  ? "≤"
                  : constraint.operator === ">="
                    ? "≥"
                    : "="}
              </span>

              <span>
                {constraint.rhs === ""
                  ? "□"
                  : formatNumber(constraint.rhs)}
              </span>
            </div>
          ))}
        </div>

        <div className="math-divider" />

        <span className="math-label">
          DOMAINES DES VARIABLES
        </span>

        <div className="math-domain-list">
          {domains.map((domain, index) => (
            <span className="math-domain" key={index}>
              {domain}
            </span>
          ))}
        </div>

        {bounds.length > 0 && (
          <>
            <div className="math-divider" />

            <span className="math-label">
              BORNES
            </span>

            <div className="math-domain-list">
              {bounds.map((bound, index) => (
                <span className="math-domain" key={index}>
                  {bound}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="preview-note">
        Les cases □ représentent les valeurs qui restent
        à renseigner.
      </div>
    </section>
  );
}

export default ProblemPreview;