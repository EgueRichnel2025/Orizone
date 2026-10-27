export type OptimizationDirection = "max" | "min";

export type ConstraintOperator = "<=" | ">=" | "=";

export type VariableType = "continuous" | "integer" | "binary";

/**
 * Valeur saisie dans un champ numérique.
 * La chaîne vide représente un champ non renseigné.
 */
export type NumericInput = number | "";

export interface ConstraintDraft {
  coefficients: NumericInput[];
  operator: ConstraintOperator;
  rhs: NumericInput;
}

export interface VariableDraft {
  type: VariableType;
  lowerBound: NumericInput;
  upperBound: NumericInput;
}

/**
 * Contrainte numérique validée, prête à être utilisée
 * par le futur moteur mathématique.
 */
export interface LinearConstraint {
  coefficients: number[];
  operator: ConstraintOperator;
  rhs: number;
}

/**
 * Définition validée d'une variable.
 *
 * null signifie qu'aucune borne n'est spécifiée
 * de ce côté.
 */
export interface OptimizationVariable {
  name: string;
  type: VariableType;
  lowerBound: number | null;
  upperBound: number | null;
}

/**
 * Représentation commune d'un problème
 * d'optimisation linéaire.
 */
export interface OptimizationProblem {
  direction: OptimizationDirection;
  objective: number[];
  constraints: LinearConstraint[];
  variables: OptimizationVariable[];
}