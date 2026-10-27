import type {
  NumericInput,
  OptimizationDirection,
} from "../../types/optimization";

interface ObjectiveInputProps {
  direction: OptimizationDirection;
  coefficients: NumericInput[];
  onDirectionChange: (direction: OptimizationDirection) => void;
  onCoefficientChange: (
    index: number,
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

function ObjectiveInput({
  direction,
  coefficients,
  onDirectionChange,
  onCoefficientChange,
}: ObjectiveInputProps) {
  return (
    <section className="form-section">
      <header className="form-section-header">
        <span className="form-section-number">01</span>

        <div>
          <h2>Fonction objectif</h2>

          <p>
            Définissez la quantité que vous souhaitez
            maximiser ou minimiser.
          </p>
        </div>
      </header>

      <div className="direction-group">
        <span className="field-label">
          Sens de l'optimisation
        </span>

        <div className="direction-switch">
          <button
            type="button"
            className={
              direction === "max"
                ? "direction-option is-selected"
                : "direction-option"
            }
            aria-pressed={direction === "max"}
            onClick={() => onDirectionChange("max")}
          >
            Maximisation
          </button>

          <button
            type="button"
            className={
              direction === "min"
                ? "direction-option is-selected"
                : "direction-option"
            }
            aria-pressed={direction === "min"}
            onClick={() => onDirectionChange("min")}
          >
            Minimisation
          </button>
        </div>
      </div>

      <div className="objective-block">
        <span className="equation-prefix">
          {direction === "max" ? "Max Z =" : "Min Z ="}
        </span>

        <div
          className="objective-editor"
          aria-label="Coefficients de la fonction objectif"
        >
          {coefficients.map((coefficient, index) => (
            <div className="objective-term" key={index}>
              <label className="coefficient-control">
                <span className="sr-only">
                  Coefficient de {variableName(index)}
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
                      value === ""
                        ? ""
                        : event.currentTarget.valueAsNumber,
                    );
                  }}
                />
              </label>

              <span className="variable-symbol">
                {variableName(index)}
              </span>

              {index < coefficients.length - 1 && (
                <span className="term-separator">+</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="field-hint">
        Les coefficients peuvent être positifs, négatifs ou nuls.
      </p>
    </section>
  );
}

export default ObjectiveInput;