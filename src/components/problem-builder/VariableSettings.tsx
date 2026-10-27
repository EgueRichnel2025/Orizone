import type {
  NumericInput,
  VariableDraft,
  VariableType,
} from "../../types/optimization";

interface VariableSettingsProps {
  variables: VariableDraft[];

  onTypeChange: (
    index: number,
    type: VariableType,
  ) => void;

  onBoundChange: (
    index: number,
    bound: "lowerBound" | "upperBound",
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

function VariableSettings({
  variables,
  onTypeChange,
  onBoundChange,
}: VariableSettingsProps) {
  return (
    <section className="form-section">
      <header className="form-section-header">
        <span className="form-section-number">03</span>

        <div>
          <h2>Nature des variables</h2>

          <p>
            Indiquez le domaine de chaque variable
            et ses éventuelles bornes.
          </p>
        </div>
      </header>

      <div className="variable-settings-list">
        {variables.map((variable, index) => {
          const isBinary = variable.type === "binary";

          return (
            <article
              className="variable-setting-card"
              key={index}
            >
              <div className="variable-setting-header">
                <span className="variable-token">
                  {variableName(index)}
                </span>

                <span className="variable-setting-caption">
                  VARIABLE {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <label className="settings-field">
                <span>Type</span>

                <select
                  value={variable.type}
                  onChange={(event) => {
                    onTypeChange(
                      index,
                      event.currentTarget.value as VariableType,
                    );
                  }}
                >
                  <option value="continuous">Réelle</option>
                  <option value="integer">Entière</option>
                  <option value="binary">Binaire (0 ou 1)</option>
                </select>
              </label>

              <div className="bounds-grid">
                <label className="settings-field">
                  <span>Borne inférieure</span>

                  <input
                    type="number"
                    step="any"
                    value={variable.lowerBound}
                    placeholder="−∞"
                    disabled={isBinary}
                    onChange={(event) => {
                      const value = event.currentTarget.value;

                      onBoundChange(
                        index,
                        "lowerBound",
                        value === ""
                          ? ""
                          : event.currentTarget.valueAsNumber,
                      );
                    }}
                  />
                </label>

                <label className="settings-field">
                  <span>Borne supérieure</span>

                  <input
                    type="number"
                    step="any"
                    value={variable.upperBound}
                    placeholder="+∞"
                    disabled={isBinary}
                    onChange={(event) => {
                      const value = event.currentTarget.value;

                      onBoundChange(
                        index,
                        "upperBound",
                        value === ""
                          ? ""
                          : event.currentTarget.valueAsNumber,
                      );
                    }}
                  />
                </label>
              </div>

              {isBinary && (
                <p className="variable-hint">
                  Une variable binaire ne peut valoir que 0 ou 1.
                  Ses bornes sont fixées automatiquement.
                </p>
              )}
            </article>
          );
        })}
      </div>

      <p className="field-hint">
        Une borne vide signifie qu'aucune borne n'est spécifiée
        de ce côté. Les champs sont initialisés avec une borne
        inférieure de 0, modifiable par l'utilisateur.
      </p>
    </section>
  );
}

export default VariableSettings;