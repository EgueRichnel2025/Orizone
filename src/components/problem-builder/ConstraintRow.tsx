import type {
  ConstraintDraft,
  ConstraintOperator,
  NumericInput,
} from "../../types/optimization";

interface ConstraintRowProps {
  index: number;
  constraint: ConstraintDraft;

  onCoefficientChange: (
    constraintIndex: number,
    coefficientIndex: number,
    value: NumericInput,
  ) => void;

  onOperatorChange: (
    constraintIndex: number,
    operator: ConstraintOperator,
  ) => void;

  onRhsChange: (
    constraintIndex: number,
    value: NumericInput,
  ) => void;
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

function ConstraintRow({
  index,
  constraint,
  onCoefficientChange,
  onOperatorChange,
  onRhsChange,
}: ConstraintRowProps) {
  return (
    <article className="constraint-card">
      <header className="constraint-header">
        <div>
          <span className="constraint-index">
            CONTRAINTE {String(index + 1).padStart(2, "0")}
          </span>

          <h3>Inéquation ou équation</h3>
        </div>

        <span className="constraint-badge">
          Linéaire
        </span>
      </header>

      <div className="constraint-editor">
        <div className="constraint-expression">
          {constraint.coefficients.map(
            (coefficient, coefficientIndex) => (
              <div
                className="constraint-term"
                key={coefficientIndex}
              >
                <label className="coefficient-control">
                  <span className="sr-only">
                    Coefficient de {variableName(coefficientIndex)}
                    dans la contrainte {index + 1}
                  </span>

                  <input
                    type="number"
                    step="any"
                    value={coefficient}
                    placeholder="0"
                    onChange={(event) => {
                      const value = event.currentTarget.value;

                      onCoefficientChange(
                        index,
                        coefficientIndex,
                        value === ""
                          ? ""
                          : event.currentTarget.valueAsNumber,
                      );
                    }}
                  />
                </label>

                <span className="variable-symbol">
                  {variableName(coefficientIndex)}
                </span>

                {coefficientIndex <
                  constraint.coefficients.length - 1 && (
                  <span className="term-separator">+</span>
                )}
              </div>
            ),
          )}
        </div>

        <label className="operator-control">
          <span>Relation</span>

          <select
            value={constraint.operator}
            onChange={(event) => {
              onOperatorChange(
                index,
                event.currentTarget.value as ConstraintOperator,
              );
            }}
          >
            <option value="<=">≤</option>
            <option value=">=">≥</option>
            <option value="=">=</option>
          </select>
        </label>

        <label className="rhs-control">
          <span>Second membre</span>

          <input
            type="number"
            step="any"
            value={constraint.rhs}
            placeholder="b"
            onChange={(event) => {
              const value = event.currentTarget.value;

              onRhsChange(
                index,
                value === ""
                  ? ""
                  : event.currentTarget.valueAsNumber,
              );
            }}
          />
        </label>
      </div>
    </article>
  );
}

export default ConstraintRow;