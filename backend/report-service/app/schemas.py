from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PayloadModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class OptimizationVariablePayload(PayloadModel):
    name: str = Field(min_length=1, max_length=32)
    type: Literal["continuous", "integer", "binary"]
    lowerBound: float | None
    upperBound: float | None

    @model_validator(mode="after")
    def validate_bounds(self):
        if (
            self.lowerBound is not None
            and self.upperBound is not None
            and self.lowerBound > self.upperBound
        ):
            raise ValueError(f"Les bornes de {self.name} sont incompatibles.")
        return self


class LinearConstraintPayload(PayloadModel):
    coefficients: list[float] = Field(min_length=1, max_length=32)
    operator: Literal["<=", ">=", "="]
    rhs: float


class OptimizationProblemPayload(PayloadModel):
    direction: Literal["max", "min"]
    objective: list[float] = Field(min_length=1, max_length=32)
    constraints: list[LinearConstraintPayload] = Field(max_length=100)
    variables: list[OptimizationVariablePayload] = Field(min_length=1, max_length=32)

    @model_validator(mode="after")
    def validate_dimensions(self):
        if len(self.objective) != len(self.variables):
            raise ValueError("Le nombre de coefficients de l’objectif doit correspondre au nombre de variables.")
        for index, constraint in enumerate(self.constraints, start=1):
            if len(constraint.coefficients) != len(self.variables):
                raise ValueError(f"La contrainte {index} n’a pas le bon nombre de coefficients.")
        return self


class SimplexIterationPayload(PayloadModel):
    phase: Literal[1, 2]
    iteration: int = Field(ge=0)
    columns: list[str] = Field(max_length=40)
    basis: list[str] = Field(max_length=100)
    tableau: list[list[float]] = Field(max_length=100)
    reducedCosts: list[float] = Field(max_length=40)
    objectiveValue: float
    enteringVariable: str | None
    leavingVariable: str | None
    pivotValue: float | None
    ratioTests: list[float | None] = Field(max_length=100)
    explanation: str = Field(max_length=12000)

    @model_validator(mode="after")
    def validate_table_dimensions(self):
        if len(self.basis) != len(self.tableau):
            raise ValueError("Le nombre de variables de base ne correspond pas au nombre de lignes du tableau.")
        if len(self.ratioTests) != len(self.tableau):
            raise ValueError("Le nombre de rapports ne correspond pas au nombre de lignes du tableau.")
        if len(self.reducedCosts) != len(self.columns):
            raise ValueError("Le nombre de coûts réduits ne correspond pas aux colonnes du tableau.")
        expected_width = len(self.columns) + 1
        if any(len(row) != expected_width for row in self.tableau):
            raise ValueError("Une ligne du tableau Simplexe possède un nombre de cellules incorrect.")
        return self


class SimplexResultPayload(PayloadModel):
    status: Literal[
        "optimal",
        "infeasible",
        "unbounded",
        "iteration_limit",
        "unsupported_domain",
        "invalid_model",
        "numerical_issue",
    ]
    message: str = Field(max_length=12000)
    direction: Literal["max", "min"]
    objectiveValue: float | None = None
    variableValues: dict[str, float] | None = None
    iterations: list[SimplexIterationPayload] = Field(max_length=5000)
    totalPivots: int = Field(ge=0)
    notes: list[str] = Field(max_length=200)


class SimplexHistoryEntryPayload(PayloadModel):
    id: str = Field(min_length=1, max_length=100)
    runId: str = Field(min_length=1, max_length=100)
    createdAt: datetime
    problem: OptimizationProblemPayload
    method: Literal["simplex"]
    result: SimplexResultPayload

    @model_validator(mode="after")
    def validate_direction(self):
        if self.problem.direction != self.result.direction:
            raise ValueError("La direction du modèle et celle du résultat ne correspondent pas.")
        return self
