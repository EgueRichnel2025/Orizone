import type { SimplexIteration } from "../../engine/simplex";
import "../../styles/simplex-tableau.css";

interface SimplexTableauProps {
  iteration: SimplexIteration;
}

const EPSILON = 1e-9;

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  const normalized = Math.abs(value) < EPSILON ? 0 : value;

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 5,
  }).format(normalized);
}

export function SimplexTableau({ iteration }: SimplexTableauProps) {
  const pivotRow = iteration.leavingVariable
    ? iteration.basis.indexOf(iteration.leavingVariable)
    : -1;

  const pivotColumn = iteration.enteringVariable
    ? iteration.columns.indexOf(iteration.enteringVariable)
    : -1;

  return (
    <div
      className="simplex-tableau-wrap"
      tabIndex={0}
      aria-label="Tableau du Simplexe, défilement horizontal disponible"
    >
      <table className="simplex-tableau">
        <thead>
          <tr>
            <th scope="col">Base</th>
            <th scope="col">z</th>

            {iteration.columns.map((column, columnIndex) => (
              <th
                scope="col"
                key={`${column}-${columnIndex}`}
                className={
                  columnIndex === pivotColumn
                    ? "is-pivot-column-header"
                    : undefined
                }
              >
                {column}
                {columnIndex === pivotColumn && (
                  <small>Entrante</small>
                )}
              </th>
            ))}

            <th scope="col">SOL</th>
            <th scope="col">Rapport</th>
          </tr>
        </thead>

        <tbody>
          <tr className="simplex-tableau-objective-row">
            <th scope="row">z</th>
            <td>{formatNumber(-1)}</td>

            {iteration.columns.map((column, columnIndex) => (
              <td
                key={`${column}-objective`}
                className={
                  columnIndex === pivotColumn
                    ? "is-pivot-column"
                    : undefined
                }
              >
                {formatNumber(iteration.reducedCosts[columnIndex])}
              </td>
            ))}

            <td>{formatNumber(-iteration.objectiveValue)}</td>
            <td className="simplex-tableau-ratio">—</td>
          </tr>

          {iteration.tableau.map((row, rowIndex) => (
            <tr
              key={`${iteration.phase}-${iteration.iteration}-row-${rowIndex}`}
              className={rowIndex === pivotRow ? "is-pivot-row" : undefined}
            >
              <th
                scope="row"
                className={
                  rowIndex === pivotRow
                    ? "is-pivot-row-header"
                    : undefined
                }
              >
                {iteration.basis[rowIndex] ?? `L${rowIndex + 1}`}
              </th>

              <td>0</td>

              {iteration.columns.map((column, columnIndex) => {
                const isPivotRow = rowIndex === pivotRow;
                const isPivotColumn = columnIndex === pivotColumn;
                const isPivotCell = isPivotRow && isPivotColumn;

                const classes = [
                  isPivotRow ? "is-pivot-row-cell" : "",
                  isPivotColumn ? "is-pivot-column" : "",
                  isPivotCell ? "is-pivot-cell" : "",
                ].filter(Boolean).join(" ");

                return (
                  <td
                    key={`${column}-${rowIndex}`}
                    className={classes || undefined}
                  >
                    {formatNumber(row[columnIndex])}
                  </td>
                );
              })}

              <td className="simplex-tableau-solution">
                {formatNumber(row[iteration.columns.length])}
              </td>

              <td className="simplex-tableau-ratio">
                {formatNumber(iteration.ratioTests[rowIndex])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="simplex-tableau-help">
        <p>
          <strong>Base :</strong> la variable actuellement associée à cette ligne.
          <strong> z :</strong> la ligne qui suit notre objectif.
          <strong> SOL :</strong> la quantité disponible dans la contrainte.
          <strong> Rapport :</strong> le calcul qui permet de trouver quelle limite
          sera atteinte en premier.
        </p>
      </div>
    </div>
  );
}
