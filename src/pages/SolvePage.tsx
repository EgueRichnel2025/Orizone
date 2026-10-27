import { useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Link, useNavigate } from "react-router";
import {
  clearStoredOptimizationProblem,
  saveOptimizationProblem,
} from "../utils/optimization-storage";

import ObjectiveInput from "../components/problem-builder/ObjectiveInput";
import ConstraintRow from "../components/problem-builder/ConstraintRow";
import VariableSettings from "../components/problem-builder/VariableSettings";
import ProblemPreview from "../components/problem-builder/ProblemPreview";

import type {
  ConstraintDraft,
  ConstraintOperator,
  NumericInput,
  OptimizationDirection,
  OptimizationProblem,
  VariableDraft,
  VariableType,
} from "../types/optimization";

function createConstraint(variableCount: number): ConstraintDraft {
  return {
    coefficients: Array.from({ length: variableCount }, () => ""),
    operator: "<=",
    rhs: "",
  };
}

function createVariable(): VariableDraft {
  return {
    type: "continuous",
    // Les deux bornes sont facultatives et restent vides par défaut.
    lowerBound: "",
    upperBound: "",
  };
}

function resizeArray<T>(
  values: T[],
  newLength: number,
  createValue: (index: number) => T,
): T[] {
  return Array.from(
    { length: newLength },
    (_, index) => values[index] ?? createValue(index),
  );
}

function SolvePage() {
  const navigate = useNavigate();
  const [direction, setDirection] = useState<OptimizationDirection>("max");
  const [variableCount, setVariableCount] = useState(2);
  const [constraintCount, setConstraintCount] = useState(2);

  const [objective, setObjective] = useState<NumericInput[]>(["", ""]);
  const [constraints, setConstraints] = useState<ConstraintDraft[]>([
    createConstraint(2),
    createConstraint(2),
  ]);
  const [variables, setVariables] = useState<VariableDraft[]>([
    createVariable(),
    createVariable(),
  ]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validatedProblem, setValidatedProblem] =
    useState<OptimizationProblem | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  function clearValidation() {
    clearStoredOptimizationProblem();
    setValidationErrors([]);
    setValidatedProblem(null);
    setShowSuccessModal(false);
    setShowErrorModal(false);
  }

  function handleVariableCountChange(nextCount: number) {
    setVariableCount(nextCount);
    setObjective((current) => resizeArray(current, nextCount, () => ""));
    setConstraints((current) =>
      current.map((constraint) => ({
        ...constraint,
        coefficients: resizeArray(
          constraint.coefficients,
          nextCount,
          () => "",
        ),
      })),
    );
    setVariables((current) =>
      resizeArray(current, nextCount, () => createVariable()),
    );
    clearValidation();
  }

  function handleConstraintCountChange(nextCount: number) {
    setConstraintCount(nextCount);
    setConstraints((current) =>
      resizeArray(current, nextCount, () => createConstraint(variableCount)),
    );
    clearValidation();
  }

  function handleObjectiveChange(index: number, value: NumericInput) {
    setObjective((current) =>
      current.map((coefficient, currentIndex) =>
        currentIndex === index ? value : coefficient,
      ),
    );
    clearValidation();
  }

  function handleConstraintCoefficientChange(
    constraintIndex: number,
    coefficientIndex: number,
    value: NumericInput,
  ) {
    setConstraints((current) =>
      current.map((constraint, currentIndex) => {
        if (currentIndex !== constraintIndex) return constraint;
        return {
          ...constraint,
          coefficients: constraint.coefficients.map(
            (coefficient, currentCoefficientIndex) =>
              currentCoefficientIndex === coefficientIndex ? value : coefficient,
          ),
        };
      }),
    );
    clearValidation();
  }

  function handleConstraintOperatorChange(
    constraintIndex: number,
    operator: ConstraintOperator,
  ) {
    setConstraints((current) =>
      current.map((constraint, currentIndex) =>
        currentIndex === constraintIndex ? { ...constraint, operator } : constraint,
      ),
    );
    clearValidation();
  }

  function handleConstraintRhsChange(
    constraintIndex: number,
    value: NumericInput,
  ) {
    setConstraints((current) =>
      current.map((constraint, currentIndex) =>
        currentIndex === constraintIndex ? { ...constraint, rhs: value } : constraint,
      ),
    );
    clearValidation();
  }

  function handleVariableTypeChange(index: number, type: VariableType) {
    setVariables((current) =>
      current.map((variable, currentIndex) => {
        if (currentIndex !== index) return variable;
        if (type === "binary") {
          return { type, lowerBound: 0, upperBound: 1 };
        }
        if (variable.type === "binary") {
          return { type, lowerBound: "", upperBound: "" };
        }
        return { ...variable, type };
      }),
    );
    clearValidation();
  }

  function handleVariableBoundChange(
    index: number,
    bound: "lowerBound" | "upperBound",
    value: NumericInput,
  ) {
    setVariables((current) =>
      current.map((variable, currentIndex) =>
        currentIndex === index ? { ...variable, [bound]: value } : variable,
      ),
    );
    clearValidation();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: string[] = [];

    if (objective.some((coefficient) => coefficient === "")) {
      errors.push(
        "Renseignez tous les coefficients de la fonction objectif.",
      );
    }

    constraints.forEach((constraint, index) => {
      if (constraint.coefficients.some((coefficient) => coefficient === "")) {
        errors.push(
          `Contrainte ${index + 1} : renseignez tous les coefficients.`,
        );
      }
      if (constraint.rhs === "") {
        errors.push(
          `Contrainte ${index + 1} : renseignez le second membre.`,
        );
      }
    });

    variables.forEach((variable, index) => {
      if (
        variable.lowerBound !== "" &&
        variable.upperBound !== "" &&
        variable.lowerBound > variable.upperBound
      ) {
        errors.push(
          `Variable x${index + 1} : la borne inférieure ne peut pas dépasser la borne supérieure.`,
        );
      }
    });

    if (errors.length > 0) {
      clearStoredOptimizationProblem();
      setValidationErrors(errors);
      setValidatedProblem(null);
      setShowSuccessModal(false);
      setShowErrorModal(true);
      return;
    }

    const problem: OptimizationProblem = {
      direction,
      objective: objective.map((value) => value as number),
      constraints: constraints.map((constraint) => ({
        coefficients: constraint.coefficients.map((value) => value as number),
        operator: constraint.operator,
        rhs: constraint.rhs as number,
      })),
      variables: variables.map((variable, index) => ({
        name: `x${index + 1}`,
        type: variable.type,
        lowerBound:
          variable.type === "binary"
            ? 0
            : variable.lowerBound === ""
              ? null
              : variable.lowerBound,
        upperBound:
          variable.type === "binary"
            ? 1
            : variable.upperBound === ""
              ? null
              : variable.upperBound,
      })),
    };

    setValidationErrors([]);
    saveOptimizationProblem(problem);
    setValidatedProblem(problem);
    // La fenêtre s'ouvre uniquement si toutes les vérifications sont passées.
    setShowErrorModal(false);
    setShowSuccessModal(true);
  }

  return (
    <section className="solve-page section-container">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        Retour à l’accueil
      </Link>

      <div className="solve-heading">
        <span className="section-eyebrow">NOUVELLE RÉSOLUTION</span>
        <h1>
          Construisons votre
          <br />
          <em>problème d’optimisation.</em>
        </h1>
        <p>
          Définissez votre fonction objectif, vos contraintes et la nature de vos
          variables. L'aperçu mathématique se met à jour automatiquement.
        </p>
      </div>

      <div className="solve-builder-layout">
        <form
          className="problem-builder-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <section className="form-section">
            <header className="form-section-header">
              <span className="form-section-number">00</span>
              <div>
                <h2>Configuration du problème</h2>
                <p>Déterminez la taille du modèle à construire.</p>
              </div>
            </header>

            <div className="configuration-grid">
              <label className="settings-field">
                <span>Nombre de variables</span>
                <select
                  value={variableCount}
                  onChange={(event) =>
                    handleVariableCountChange(Number(event.currentTarget.value))
                  }
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (count) => (
                      <option value={count} key={count}>
                        {count}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="settings-field">
                <span>Nombre de contraintes</span>
                <select
                  value={constraintCount}
                  onChange={(event) =>
                    handleConstraintCountChange(Number(event.currentTarget.value))
                  }
                >
                  {Array.from({ length: 20 }, (_, index) => index + 1).map(
                    (count) => (
                      <option value={count} key={count}>
                        {count}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
          </section>

          <ObjectiveInput
            direction={direction}
            coefficients={objective}
            onDirectionChange={(nextDirection) => {
              setDirection(nextDirection);
              clearValidation();
            }}
            onCoefficientChange={handleObjectiveChange}
          />

          <section className="form-section">
            <header className="form-section-header">
              <span className="form-section-number">02</span>
              <div>
                <h2>Contraintes</h2>
                <p>
                  Renseignez les coefficients, les relations et les seconds
                  membres.
                </p>
              </div>
            </header>

            <div className="constraint-list">
              {constraints.map((constraint, index) => (
                <ConstraintRow
                  key={index}
                  index={index}
                  constraint={constraint}
                  onCoefficientChange={handleConstraintCoefficientChange}
                  onOperatorChange={handleConstraintOperatorChange}
                  onRhsChange={handleConstraintRhsChange}
                />
              ))}
            </div>
            <p className="field-hint">
              Les contraintes peuvent être des inégalités d'infériorité, de
              supériorité ou des égalités.
            </p>
          </section>

          <VariableSettings
            variables={variables}
            onTypeChange={handleVariableTypeChange}
            onBoundChange={handleVariableBoundChange}
          />

          <div className="form-actions">
            <span>
              {variableCount} variable(s) · {constraintCount} contrainte(s)
            </span>
            <button type="submit" className="button button-primary">
              Valider le modèle
              <ArrowRight size={17} />
            </button>
          </div>
        </form>

        <aside className="preview-column">
          <ProblemPreview
            direction={direction}
            objective={objective}
            constraints={constraints}
            variables={variables}
          />

          {validationErrors.length > 0 && (
            <div className="validation-panel error-panel" role="alert">
              <div className="validation-panel-title">
                <AlertCircle size={19} />
                <h3>Vérifiez les informations saisies</h3>
              </div>
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {validatedProblem && (
            <div className="validation-panel success-panel" role="status">
              <div className="validation-panel-title">
                <CheckCircle2 size={19} />
                <h3>Modèle validé</h3>
              </div>
              <p>
                Les champs obligatoires et les bornes ont été vérifiés. Le modèle
                est prêt pour l'étape d'analyse mathématique.
              </p>
              <div className="validated-summary">
                <span>
                  Objectif : {validatedProblem.direction === "max" ? "Maximisation" : "Minimisation"}
                </span>
                <span>{validatedProblem.objective.length} variable(s)</span>
                <span>{validatedProblem.constraints.length} contrainte(s)</span>
              </div>
              <p className="validation-disclaimer">
                La résolution automatique n'est pas encore activée dans cette
                version.
              </p>
            </div>
          )}
        </aside>
      </div>

      {showSuccessModal && validatedProblem && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSuccessModal(false);
            }
          }}
        >
          <section
            className="validation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="validation-modal-title"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Fermer la fenêtre"
              onClick={() => setShowSuccessModal(false)}
            >
              <X size={20} />
            </button>

            <div className="modal-success-icon">
              <CheckCircle2 size={30} />
            </div>
            <span className="section-eyebrow">VALIDATION RÉUSSIE</span>
            <h2 id="validation-modal-title">Votre modèle est validé !</h2>
            <p className="modal-description">
              Tous les champs obligatoires sont renseignés et les bornes ont été
              vérifiées. Votre modèle est prêt pour l'étape d'analyse.
            </p>

            <div className="validated-summary modal-summary">
              <span>
                Objectif : {validatedProblem.direction === "max" ? "Maximisation" : "Minimisation"}
              </span>
              <span>{validatedProblem.objective.length} variable(s)</span>
              <span>{validatedProblem.constraints.length} contrainte(s)</span>
            </div>

            <p className="validation-disclaimer modal-disclaimer">
              À noter : le problème est validé, mais il n'a pas encore été
              résolu par un algorithme.
            </p>
            <button
              type="button"
              className="button button-primary modal-continue"
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/analysis");
              }}
            >
              Compris, continuer
              <ArrowRight size={17} />
            </button>
          </section>
        </div>
      )}

      {showErrorModal && validationErrors.length > 0 && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowErrorModal(false);
            }
          }}
        >
          <section
            className="validation-modal validation-modal-error"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="validation-error-title"
            aria-describedby="validation-error-description"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Fermer la fenêtre"
              onClick={() => setShowErrorModal(false)}
            >
              <X size={20} />
            </button>

            <div className="modal-error-icon">
              <AlertCircle size={30} />
            </div>
            <span className="section-eyebrow">VALIDATION INCOMPLÈTE</span>
            <h2 id="validation-error-title">Quelques informations manquent.</h2>
            <p id="validation-error-description" className="modal-description">
              Le modèle n'a pas été validé. Corrigez les points suivants, puis
              cliquez de nouveau sur « Valider le modèle ».
            </p>

            <div className="modal-error-list">
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              className="button button-primary modal-continue modal-correct"
              onClick={() => setShowErrorModal(false)}
            >
              Compris, je corrige
              <ArrowRight size={17} />
            </button>
          </section>
        </div>
      )}
    </section>
  );
}

export default SolvePage;
