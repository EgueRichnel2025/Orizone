from __future__ import annotations

import math
import re
from typing import Iterable

from .schemas import SimplexHistoryEntryPayload, SimplexIterationPayload


LATEX_SPECIALS = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}

STATUS_LABELS = {
    "optimal": "Solution optimale certifiée",
    "infeasible": "Problème irréalisable",
    "unbounded": "Problème non borné",
    "iteration_limit": "Limite d’itérations atteinte",
    "unsupported_domain": "Domaine non pris en charge par le Simplexe continu",
    "invalid_model": "Modèle invalide",
    "numerical_issue": "Difficulté numérique",
}

VARIABLE_TYPE_LABELS = {
    "continuous": "Continue",
    "integer": "Entière",
    "binary": "Binaire",
}


def latex_escape(value: object) -> str:
    """Escape ordinary text before inserting it into LaTeX."""
    return "".join(LATEX_SPECIALS.get(char, char) for char in str(value))


def number_tex(value: float | int | None) -> str:
    """Format numbers using French decimal commas, without changing the value."""
    if value is None:
        return r"\text{n.d.}"
    numeric = float(value)
    if not math.isfinite(numeric):
        return r"\text{n.d.}"
    if abs(numeric) < 1e-12:
        return "0"

    raw = format(numeric, ".8g")
    if "e" in raw.lower():
        mantissa, exponent = re.split(r"e", raw, flags=re.IGNORECASE)
        mantissa = mantissa.replace(".", "{,}")
        return rf"{mantissa}\times 10^{{{int(exponent)}}}"
    return raw.replace(".", "{,}")


def number_text(value: float | int | None) -> str:
    """Readable text value for labels and metadata."""
    if value is None or not math.isfinite(float(value)):
        return "Non disponible"
    numeric = float(value)
    if abs(numeric) < 1e-12:
        numeric = 0.0
    return f"{numeric:,.8g}".replace(",", " ").replace(".", ",")


def math_variable(name: str) -> str:
    match = re.fullmatch(r"([A-Za-z]+)_?(\d+)", name)
    if match:
        return rf"\mathrm{{{latex_escape(match.group(1))}}}_{{{match.group(2)}}}"
    return rf"\text{{{latex_escape(name)}}}"


def linear_expression(coefficients: Iterable[float], variable_names: list[str]) -> str:
    terms: list[str] = []
    for index, coefficient in enumerate(coefficients):
        value = float(coefficient)
        if abs(value) < 1e-12:
            continue
        variable = math_variable(variable_names[index])
        magnitude = abs(value)
        factor = "" if abs(magnitude - 1.0) < 1e-12 else number_tex(magnitude)
        term = f"{factor}{variable}"
        if not terms:
            terms.append(("-" if value < 0 else "") + term)
        else:
            terms.append((" - " if value < 0 else " + ") + term)
    return "".join(terms) if terms else "0"


def operator_tex(operator: str) -> str:
    return {"<=": r"\leq", ">=": r"\geq", "=": "="}[operator]


def direction_label(direction: str) -> str:
    return "Maximisation" if direction == "max" else "Minimisation"


def direction_operator(direction: str) -> str:
    return r"\max" if direction == "max" else r"\min"


def status_label(status: str) -> str:
    return STATUS_LABELS.get(status, status.replace("_", " ").capitalize())


def status_color(status: str) -> str:
    return "OrizoneGreen" if status == "optimal" else "OrizoneCopper"


def variable_domain_tex(variable) -> str:
    name = math_variable(variable.name)
    if variable.type == "binary":
        domain = rf"{name}\in\{{0,1\}}"
    elif variable.type == "integer":
        domain = rf"{name}\in\mathbb{{Z}}"
    else:
        domain = rf"{name}\in\mathbb{{R}}"

    bounds: list[str] = []
    if variable.lowerBound is not None:
        bounds.append(rf"{number_tex(variable.lowerBound)}\leq {name}")
    if variable.upperBound is not None:
        bounds.append(rf"{name}\leq {number_tex(variable.upperBound)}")
    if bounds:
        return domain + r"\quad\text{; }\quad" + r"\quad\text{et}\quad".join(bounds)
    return domain


def build_constraint_table(entry: SimplexHistoryEntryPayload) -> str:
    variable_names = [variable.name for variable in entry.problem.variables]
    rows: list[str] = []
    for index, constraint in enumerate(entry.problem.constraints, start=1):
        expression = linear_expression(constraint.coefficients, variable_names)
        rows.append(
            rf"{index:02d} & ${expression}\;{operator_tex(constraint.operator)}\;"
            rf"{number_tex(constraint.rhs)}$ & ${number_tex(constraint.rhs)}$ \\")

    if not rows:
        return r"\textit{Aucune contrainte linéaire n’a été déclarée.}"

    return "\n".join([
        r"\begingroup",
        r"\renewcommand{\arraystretch}{1.28}",
        r"\rowcolors{2}{OrizoneSoft}{white}",
        r"\begin{tabularx}{\textwidth}{@{}>{\centering\arraybackslash}p{0.9cm}X>{\centering\arraybackslash}p{2.2cm}@{}}",
        r"\rowcolor{OrizoneDark}",
        r"\color{white}\textbf{N\textsuperscript{o}} & \color{white}\textbf{Contrainte} & \color{white}\textbf{Limite} \\",
        r"\arrayrulecolor{OrizoneBorder}\hline",
        *rows,
        r"\end{tabularx}",
        r"\rowcolors{2}{white}{white}",
        r"\endgroup",
    ])


def build_domain_cards(entry: SimplexHistoryEntryPayload) -> str:
    variables = entry.problem.variables
    cells: list[str] = []
    for variable in variables:
        name = math_variable(variable.name)
        label = VARIABLE_TYPE_LABELS.get(variable.type, variable.type.capitalize())
        domain = variable_domain_tex(variable)
        cell = "\n".join([
            r"\begin{tcolorbox}[colback=OrizoneGreenPale,colframe=OrizoneBorder,boxrule=.45pt,arc=1.5mm,left=2.5mm,right=2.5mm,top=1.5mm,bottom=1.5mm]",
            rf"{{\small\color{{OrizoneMuted}}\textbf{{VARIABLE ${name}$}}}}\par",
            rf"\centering\textbf{{{latex_escape(label)}}}\par",
            rf"\small ${domain}$",
            r"\end{tcolorbox}",
        ])
        cells.append(cell)

    rows: list[str] = []
    for start in range(0, len(cells), 2):
        left = cells[start]
        right = cells[start + 1] if start + 1 < len(cells) else r"\mbox{}"
        rows.append(left + " &\n" + right + r" \\")

    return "\n".join([
        r"\begin{tabularx}{\textwidth}{@{}X X@{}}",
        *rows,
        r"\end{tabularx}",
    ])


def build_solution_strip(entry: SimplexHistoryEntryPayload) -> str:
    result = entry.result
    values = result.variableValues or {}
    if not values and result.objectiveValue is None:
        return r"\textit{Aucune valeur de solution n’est disponible pour cette résolution.}"

    equations: list[str] = []
    for variable in entry.problem.variables:
        if variable.name in values:
            equations.append(rf"{math_variable(variable.name)} &= {number_tex(values[variable.name])}")

    if equations:
        solution_math = r"\[\begin{aligned}" + r"\\".join(equations) + r"\end{aligned}\]"
    else:
        solution_math = r"\textit{Valeurs des variables non disponibles.}"

    objective = (
        rf"{direction_operator(entry.problem.direction)}\;Z = {number_tex(result.objectiveValue)}"
        if result.objectiveValue is not None
        else r"\text{Valeur de l’objectif non disponible}"
    )

    return "\n".join([
        r"\begin{tcolorbox}[colback=OrizoneGreenPale,colframe=OrizoneGreen,boxrule=.65pt,arc=1.5mm,left=3mm,right=3mm,top=2mm,bottom=2mm]",
        r"{\small\color{OrizoneMuted}\textbf{SOLUTION RETENUE PAR LE MOTEUR}}\par",
        r"\vspace{1mm}",
        solution_math,
        rf"\begin{{center}}\large\bfseries ${objective}$\end{{center}}",
        r"\end{tcolorbox}",
    ])


def _constraint_check(constraint, variable_names: list[str], values: dict[str, float], tolerance: float = 1e-8):
    lhs = sum(float(coefficient) * float(values[name]) for coefficient, name in zip(constraint.coefficients, variable_names))
    rhs = float(constraint.rhs)
    operator = constraint.operator
    gap = rhs - lhs if operator == "<=" else lhs - rhs

    if operator == "=":
        difference = abs(lhs - rhs)
        if difference <= tolerance:
            label = "Égalité respectée"
        else:
            label = "Égalité non respectée"
    elif abs(lhs - rhs) <= tolerance:
        label = "Saturée"
    elif gap >= 0:
        label = f"Respectée · marge {number_text(gap)}"
    else:
        label = f"Non respectée · écart {number_text(abs(gap))}"
    return lhs, label


def build_constraint_verification(entry: SimplexHistoryEntryPayload) -> str:
    result = entry.result
    values = result.variableValues or {}
    variable_names = [variable.name for variable in entry.problem.variables]

    if not entry.problem.constraints:
        return r"\textit{Aucune contrainte à vérifier.}"
    if not values or any(name not in values for name in variable_names):
        return r"\textit{La vérification n’est pas disponible : toutes les valeurs des variables ne sont pas fournies.}"

    rows: list[str] = []
    for constraint in entry.problem.constraints:
        expression = linear_expression(constraint.coefficients, variable_names)
        lhs, label = _constraint_check(constraint, variable_names, values)
        rows.append(
            rf"${expression}$ & ${number_tex(lhs)}$ & ${operator_tex(constraint.operator)}\;{number_tex(constraint.rhs)}$ & {latex_escape(label)} \\")

    return "\n".join([
        r"\begingroup",
        r"\renewcommand{\arraystretch}{1.28}",
        r"\rowcolors{2}{OrizoneSoft}{white}",
        r"\begin{tabularx}{\textwidth}{@{}>{\raggedright\arraybackslash}p{4.4cm}>{\centering\arraybackslash}p{1.8cm}>{\centering\arraybackslash}p{2.2cm}X@{}}",
        r"\rowcolor{OrizoneDark}",
        r"\color{white}\textbf{Contrainte} & \color{white}\textbf{À la solution} & \color{white}\textbf{Limite} & \color{white}\textbf{Contrôle} \\",
        r"\arrayrulecolor{OrizoneBorder}\hline",
        *rows,
        r"\end{tabularx}",
        r"\rowcolors{2}{white}{white}",
        r"\endgroup",
    ])


def _table_cell(value: float, row_index: int, column_index: int, leaving_row: int, entering_column: int) -> str:
    formatted = rf"${number_tex(value)}$"
    if row_index == leaving_row and column_index == entering_column:
        return rf"\cellcolor{{OrizoneCopperPale}}\textbf{{{formatted}}}"
    if column_index == entering_column:
        return rf"\cellcolor{{OrizoneGreenPale}}{formatted}"
    return formatted


def build_iteration_table(iteration: SimplexIterationPayload, index: int) -> str:
    column_count = len(iteration.columns)
    leaving_row = (
        iteration.basis.index(iteration.leavingVariable)
        if iteration.leavingVariable in iteration.basis
        else -1
    )
    entering_column = (
        iteration.columns.index(iteration.enteringVariable)
        if iteration.enteringVariable in iteration.columns
        else -1
    )

    header_cells = [r"\textbf{Base}", r"\textbf{$z$}"]
    header_cells.extend(rf"\textbf{{${math_variable(column)}$}}" for column in iteration.columns)
    header_cells.extend([r"\textbf{Sol.}", r"\textbf{Rapport}"])
    header = r"\rowcolor{OrizoneDark}" + " & ".join(
        rf"\color{{white}}{cell}" for cell in header_cells
    ) + r" \\"

    objective_cells = [r"\textbf{$z$}", r"\cellcolor{OrizoneGreenPale}\textbf{$-1$}"]
    for column_index, value in enumerate(iteration.reducedCosts):
        formatted = rf"${number_tex(value)}$"
        if column_index == entering_column:
            formatted = rf"\cellcolor{{OrizoneGreenPale}}\textbf{{{formatted}}}"
        objective_cells.append(formatted)
    objective_cells.extend([rf"${number_tex(-iteration.objectiveValue)}$", r"\textemdash"])
    objective_row = r"\rowcolor{OrizoneGreenPale}" + " & ".join(objective_cells) + r" \\"

    rows: list[str] = []
    for row_index, row in enumerate(iteration.tableau):
        cells = [rf"\textbf{{${math_variable(iteration.basis[row_index])}$}}", r"$0$"]
        cells.extend(
            _table_cell(value, row_index, column_index, leaving_row, entering_column)
            for column_index, value in enumerate(row[:-1])
        )
        cells.append(rf"${number_tex(row[-1])}$")
        ratio = iteration.ratioTests[row_index]
        cells.append(rf"${number_tex(ratio)}$" if ratio is not None else r"\textemdash")
        line = " & ".join(cells) + r" \\"
        if row_index == leaving_row:
            line = r"\rowcolor{OrizoneGreenPale}" + line
        rows.append(line)

    phase_name = "recherche d’une base réalisable" if iteration.phase == 1 else "optimisation"
    heading = "\n".join([
        rf"\Needspace{{8\baselineskip}}",
        rf"{{\small\bfseries\color{{OrizoneCopper}} TABLEAU {index + 1:02d}  /  PHASE {iteration.phase}  /  ITÉRATION {iteration.iteration}}}\par",
        rf"{{\normalsize\bfseries\color{{OrizoneGreen}} Tableau {index + 1} -- {latex_escape(phase_name)}}}",
        r"\vspace{1.5mm}",
    ])

    landscape = column_count > 6
    table_font = r"\scriptsize" if column_count > 6 else r"\small"
    padding = "2.2pt" if column_count > 6 else "4pt"
    column_spec = "@{}l c" + ("r" * column_count) + " r r@{}"
    total_columns = column_count + 4

    table_lines = [
        r"\begingroup",
        table_font,
        rf"\setlength{{\tabcolsep}}{{{padding}}}",
        r"\renewcommand{\arraystretch}{1.22}",
        r"\setlength{\LTpre}{2pt}",
        r"\setlength{\LTpost}{5pt}",
        rf"\begin{{longtable}}{{{column_spec}}}",
        header,
        r"\midrule",
        r"\endfirsthead",
        header,
        r"\midrule",
        r"\endhead",
        r"\midrule",
        rf"\multicolumn{{{total_columns}}}{{r}}{{\scriptsize\itshape Suite du tableau à la page suivante}}\\",
        r"\endfoot",
        r"\bottomrule",
        r"\endlastfoot",
        objective_row,
        r"\midrule",
        *rows,
        r"\end{longtable}",
        r"\endgroup",
    ]

    pivot_data: list[str] = []
    if iteration.enteringVariable is not None:
        leaving_math = math_variable(iteration.leavingVariable) if iteration.leavingVariable is not None else r"\text{--}"
        pivot_data.append((
            rf"\begin{{tcolorbox}}[colback=OrizoneSoft,colframe=OrizoneBorder,boxrule=.45pt,arc=1mm,"
            r"left=1.5mm,right=1.5mm,top=1.2mm,bottom=1.2mm]"
            r"\begin{tabularx}{\linewidth}{@{}>{\centering\arraybackslash}X>{\centering\arraybackslash}X>{\centering\arraybackslash}X@{}}"
            rf"{{\scriptsize\color{{OrizoneMuted}} VARIABLE ENTRANTE}} & {{\scriptsize\color{{OrizoneMuted}} VARIABLE SORTANTE}} & {{\scriptsize\color{{OrizoneMuted}} ÉLÉMENT PIVOT}}\\"
            rf"{{\large\bfseries ${math_variable(iteration.enteringVariable)}$}} & "
            rf"{{\large\bfseries ${leaving_math}$}} & "
            rf"{{\large\bfseries ${number_tex(iteration.pivotValue)}$}}"
            r"\end{tabularx}\end{tcolorbox}"
        ))
    # For a terminal tableau, the explanation itself describes the stopping criterion.
    # Avoid a duplicate stop badge that can orphan the explanation on another page.

    if iteration.explanation:
        pivot_data.append(
            r"\begin{tcolorbox}[colback=OrizoneSoft,colframe=OrizoneBorder,boxrule=.4pt,arc=1mm,left=2mm,right=2mm,top=1.2mm,bottom=1.2mm]"
            + r"\small " + latex_escape(iteration.explanation)
            + r"\end{tcolorbox}"
        )

    block = "\n".join([heading, *table_lines, *pivot_data])
    if landscape:
        return r"\begin{landscape}" + "\n" + block + "\n" + r"\end{landscape}"
    return block


def _cover_variable_summary(entry: SimplexHistoryEntryPayload) -> str:
    values = entry.result.variableValues or {}
    shown: list[str] = []
    for variable in entry.problem.variables:
        if variable.name in values:
            shown.append(rf"{math_variable(variable.name)} = {number_tex(values[variable.name])}")
        if len(shown) >= 4:
            break
    if not shown:
        return r"\textit{Valeurs non disponibles}"
    return r"$" + r"\quad\cdot\quad".join(shown) + r"$"


def _summary_table(entry: SimplexHistoryEntryPayload) -> str:
    result = entry.result
    rows = [
        rf"\textbf{{Statut}} & {latex_escape(status_label(result.status))} \\",
        rf"\textbf{{Sens}} & {direction_label(entry.problem.direction)} \\",
        rf"\textbf{{Tableaux enregistrés}} & {len(result.iterations)} \\",
        rf"\textbf{{Pivots effectués}} & {result.totalPivots} \\",
    ]
    if result.objectiveValue is not None:
        rows.insert(1, rf"\textbf{{Valeur de l’objectif}} & ${direction_operator(entry.problem.direction)}\;Z = {number_tex(result.objectiveValue)}$ \\")

    return "\n".join([
        r"\begin{tcolorbox}[colback=OrizoneSoft,colframe=OrizoneBorder,boxrule=.45pt,arc=1mm,left=3mm,right=3mm,top=2mm,bottom=2mm]",
        r"\begin{tabularx}{\linewidth}{@{}p{4.1cm}X@{}}",
        *rows,
        r"\end{tabularx}",
        r"\end{tcolorbox}",
    ])


def generate_simplex_latex(entry: SimplexHistoryEntryPayload) -> str:
    problem = entry.problem
    result = entry.result
    variable_names = [variable.name for variable in problem.variables]
    objective = linear_expression(problem.objective, variable_names)
    direction = direction_label(problem.direction)
    direction_op = direction_operator(problem.direction)
    status = status_label(result.status)
    status_tone = status_color(result.status)
    created_at = entry.createdAt.strftime("%d/%m/%Y · %H:%M")
    identifier = latex_escape(entry.id)

    constraint_table = build_constraint_table(entry)
    domain_cards = build_domain_cards(entry)
    solution_strip = build_solution_strip(entry)
    verification_table = build_constraint_verification(entry)

    iteration_blocks = [
        build_iteration_table(iteration, index)
        for index, iteration in enumerate(result.iterations)
    ]
    if iteration_blocks:
        iteration_content = "\n\\vspace{5mm}\n".join(iteration_blocks)
    else:
        iteration_content = (
            r"\begin{tcolorbox}[colback=OrizoneSoft,colframe=OrizoneBorder,boxrule=.4pt,arc=1mm]"
            r"Aucun tableau Simplexe n’a été enregistré pour cette résolution."
            r"\end{tcolorbox}"
        )

    objective_cover = (
        rf"${direction_op}\;Z = {number_tex(result.objectiveValue)}$"
        if result.objectiveValue is not None
        else r"\textit{Valeur de l’objectif non disponible}"
    )

    result_values = _cover_variable_summary(entry)
    date_label = latex_escape(created_at)
    status_tex = latex_escape(status)
    direction_tex = latex_escape(direction.upper())
    notes_block = ""
    if result.notes:
        note_items = [rf"\item {latex_escape(note)}" for note in result.notes]
        notes_block = "\n".join([
            r"\subsection*{Remarques complémentaires}",
            r"\begin{itemize}[leftmargin=1.4em,itemsep=2pt,topsep=3pt]",
            *note_items,
            r"\end{itemize}",
        ])

    if result.objectiveValue is not None:
        objective_result = rf"\[{direction_op}\;Z = {number_tex(result.objectiveValue)}\]"
    else:
        objective_result = r"\textit{Aucune valeur d’objectif n’est disponible.}"

    result_message = latex_escape(result.message)

    parts = [
        r"% Rapport Orizone - compilation avec XeLaTeX.",
        r"\documentclass[10pt,a4paper]{article}",
        r"\usepackage{fontspec}",
        r"\setmainfont{Noto Sans}",
        r"\setsansfont{Noto Sans}",
        r"\usepackage[french]{babel}",
        r"\usepackage{geometry}",
        r"\geometry{top=1.8cm,bottom=1.65cm,left=1.7cm,right=1.7cm,headheight=15pt,headsep=7mm,footskip=10mm}",
        r"\usepackage{amsmath,amssymb}",
        r"\usepackage{booktabs,longtable,array,tabularx}",
        r"\usepackage[table]{xcolor}",
        r"\usepackage{colortbl}",
        r"\usepackage{pdflscape}",
        r"\usepackage{enumitem}",
        r"\usepackage{microtype}",
        r"\usepackage{titlesec}",
        r"\usepackage{fancyhdr}",
        r"\usepackage{needspace}",
        r"\usepackage{lastpage}",
        r"\usepackage{tikz}",
        r"\usepackage[most]{tcolorbox}",
        r"\usepackage[hidelinks]{hyperref}",
        r"\definecolor{OrizoneGreen}{HTML}{2F5D50}",
        r"\definecolor{OrizoneDark}{HTML}{183D35}",
        r"\definecolor{OrizoneDarker}{HTML}{122F29}",
        r"\definecolor{OrizoneCopper}{HTML}{C98A3D}",
        r"\definecolor{OrizoneIvory}{HTML}{F4F1EA}",
        r"\definecolor{OrizoneGreenPale}{HTML}{EAF1EC}",
        r"\definecolor{OrizoneCopperPale}{HTML}{F8EBDD}",
        r"\definecolor{OrizoneMuted}{HTML}{66736D}",
        r"\definecolor{OrizoneBorder}{HTML}{DCE4DE}",
        r"\definecolor{OrizoneSoft}{HTML}{F7F8F6}",
        r"\definecolor{OrizoneText}{HTML}{26332E}",
        r"\setlength{\parindent}{0pt}",
        r"\setlength{\parskip}{4pt}",
        r"\setlength{\emergencystretch}{3em}",
        r"\setlist[itemize]{leftmargin=1.4em,itemsep=2pt,topsep=3pt}",
        r"\arrayrulecolor{OrizoneBorder}",
        r"\titleformat{\section}{\Large\sffamily\bfseries\color{OrizoneGreen}}{}{0pt}{}",
        r"\titleformat{\subsection}{\large\sffamily\bfseries\color{OrizoneGreen}}{}{0pt}{}",
        r"\titlespacing*{\section}{0pt}{14pt}{7pt}",
        r"\titlespacing*{\subsection}{0pt}{10pt}{5pt}",
        r"\pagestyle{fancy}",
        r"\fancyhf{}",
        r"\fancyhead[L]{\small\sffamily\bfseries\color{OrizoneGreen}{ORIZONE}}",
        r"\fancyhead[R]{\small\sffamily\color{OrizoneMuted}{RAPPORT DE RÉSOLUTION / SIMPLEXE}}",
        r"\fancyfoot[L]{\small\sffamily\color{OrizoneMuted}{OPTIMISATION MATHÉMATIQUE}}",
        r"\fancyfoot[R]{\small\sffamily\color{OrizoneMuted}{\thepage\ / \pageref{LastPage}}}",
        r"\renewcommand{\headrulewidth}{0.45pt}",
        r"\renewcommand{\footrulewidth}{0pt}",
        r"\fancyheadoffset{0pt}",
        r"\hypersetup{colorlinks=true,linkcolor=OrizoneGreen,urlcolor=OrizoneCopper,pdftitle={Rapport de résolution - Orizone},pdfauthor={Orizone}}",
        r"\begin{document}",

        # COVER PAGE
        r"\begin{titlepage}",
        r"\thispagestyle{empty}",
        r"\pagecolor{OrizoneIvory}",
        r"\begin{tikzpicture}[remember picture,overlay]",
        r"\fill[OrizoneDark] (current page.north west) rectangle ([yshift=-0.535\paperheight]current page.north east);",
        r"\fill[OrizoneDarker] ([xshift=-12mm,yshift=-8mm]current page.north east) circle (42mm);",
        r"\fill[OrizoneGreen] ([xshift=-2mm,yshift=-2mm]current page.north east) circle (25mm);",
        r"\fill[OrizoneCopper] ([xshift=17mm,yshift=-0.535\paperheight]current page.north west) rectangle ([xshift=47mm,yshift=-0.535\paperheight+1.3mm]current page.north west);",
        r"\end{tikzpicture}",
        r"\vspace*{1.1cm}",
        r"{\sffamily\bfseries\fontsize{24}{28}\selectfont\color{white} ORIZONE}\par",
        r"\vspace{1mm}",
        r"{\sffamily\fontsize{8}{10}\selectfont\color{white!82} PLATEFORME D’OPTIMISATION MATHÉMATIQUE}\par",
        r"\vspace{1.1cm}",
        r"{\sffamily\bfseries\small\color{OrizoneCopper} RAPPORT DE RÉSOLUTION}\par",
        r"\vspace{3mm}",
        r"{\sffamily\bfseries\fontsize{27}{32}\selectfont\color{white} Méthode du}\par",
        r"{\sffamily\bfseries\fontsize{37}{42}\selectfont\color{white} Simplexe}\par",
        rf"{{\sffamily\small\color{{white!82}} {direction_tex} \quad\textperiodcentered\quad PROGRAMMATION LINÉAIRE}}\par",
        r"\vspace{1.15cm}",
        r"\begin{tcolorbox}[colback=OrizoneGreenPale,colframe=OrizoneGreenPale,boxrule=0pt,arc=2mm,left=4mm,right=4mm,top=3mm,bottom=3mm]",
        rf"{{\sffamily\scriptsize\bfseries\color{{OrizoneGreen}} {latex_escape(status.upper())}}}\par",
        r"\vspace{1mm}",
        r"\begin{minipage}[c]{0.57\linewidth}",
        rf"{{\sffamily\bfseries\fontsize{{27}}{{31}}\selectfont\color{{OrizoneDark}} {objective_cover}}}\par",
        r"{\small\color{OrizoneMuted} Valeur de la fonction objectif}\par",
        r"\end{minipage}\hfill",
        r"\begin{minipage}[c]{0.36\linewidth}",
        r"{\sffamily\scriptsize\bfseries\color{OrizoneGreen} SOLUTION RETENUE}\par",
        rf"{{\sffamily\small\bfseries\color{{OrizoneDark}} {result_values}}}",
        r"\end{minipage}",
        r"\end{tcolorbox}",
        r"\vspace{7mm}",
        r"\begin{tabularx}{\textwidth}{@{}X@{\hspace{5mm}}X@{}}",
        r"\begin{tcolorbox}[colback=white,colframe=OrizoneBorder,boxrule=.35pt,arc=1mm,left=2.5mm,right=2.5mm,top=1.8mm,bottom=1.8mm]",
        r"{\scriptsize\color{OrizoneMuted}\bfseries DATE DE SAUVEGARDE}\par",
        rf"{{\small\sffamily\bfseries\color{{OrizoneDark}} {date_label}}}",
        r"\end{tcolorbox} &",
        r"\begin{tcolorbox}[colback=white,colframe=OrizoneBorder,boxrule=.35pt,arc=1mm,left=2.5mm,right=2.5mm,top=1.8mm,bottom=1.8mm]",
        r"{\scriptsize\color{OrizoneMuted}\bfseries IDENTIFIANT DE RÉSOLUTION}\par",
        rf"{{\scriptsize\ttfamily\color{{OrizoneDark}} {identifier}}}",
        r"\end{tcolorbox} \\",
        r"\begin{tcolorbox}[colback=white,colframe=OrizoneBorder,boxrule=.35pt,arc=1mm,left=2.5mm,right=2.5mm,top=1.8mm,bottom=1.8mm]",
        r"{\scriptsize\color{OrizoneMuted}\bfseries TABLEAUX ENREGISTRÉS}\par",
        rf"{{\small\sffamily\bfseries\color{{OrizoneDark}} {len(result.iterations)} tableau(x)}}",
        r"\end{tcolorbox} &",
        r"\begin{tcolorbox}[colback=white,colframe=OrizoneBorder,boxrule=.35pt,arc=1mm,left=2.5mm,right=2.5mm,top=1.8mm,bottom=1.8mm]",
        r"{\scriptsize\color{OrizoneMuted}\bfseries PIVOTS EFFECTUÉS}\par",
        rf"{{\small\sffamily\bfseries\color{{OrizoneDark}} {result.totalPivots} pivot(s)}}",
        r"\end{tcolorbox}",
        r"\end{tabularx}",
        r"\vfill",
        r"\textcolor{OrizoneCopper}{\rule{\textwidth}{0.8pt}}\par",
        r"\vspace{2mm}",
        r"{\scriptsize\color{OrizoneMuted} Rapport généré automatiquement à partir des données enregistrées dans Orizone.}",
        r"\end{titlepage}",
        r"\nopagecolor",
        r"\setcounter{page}{2}",

        # MODEL PAGE
        r"\thispagestyle{fancy}",
        r"{\small\sffamily\bfseries\color{OrizoneCopper} 01 / LE MODÈLE}\par",
        r"\vspace{1mm}",
        r"{\sffamily\bfseries\fontsize{23}{27}\selectfont\color{OrizoneDark} Formulation mathématique}\par",
        r"\vspace{1mm}",
        r"{\small\color{OrizoneMuted} Le problème consiste à déterminer les valeurs des variables qui optimisent la fonction objectif tout en respectant les contraintes déclarées.}\par",
        r"\vspace{3mm}",
        r"\begin{tcolorbox}[colback=OrizoneGreenPale,colframe=OrizoneBorder,boxrule=.45pt,arc=1mm,left=3mm,right=3mm,top=2mm,bottom=2mm]",
        r"\begin{tabularx}{\linewidth}{@{}X>{\raggedleft\arraybackslash}p{3.5cm}@{}}",
        r"{\small\color{OrizoneMuted} FONCTION OBJECTIF} &",
        rf"\colorbox{{OrizoneGreen}}{{\parbox{{3.3cm}}{{\centering\color{{white}}\small\bfseries {direction.upper()}}}}}\\[2mm]",
        rf"\multicolumn{{2}}{{c}}{{\Large\bfseries\color{{OrizoneDark}} ${direction_op}\;Z = {objective}$}}",
        r"\end{tabularx}",
        r"\end{tcolorbox}",
        r"\vspace{3mm}",
        r"{\sffamily\bfseries\large\color{OrizoneGreen} Contraintes du problème}\par",
        r"\vspace{1.5mm}",
        constraint_table,
        r"\vspace{3mm}",
        r"{\sffamily\bfseries\large\color{OrizoneGreen} Domaines et bornes des variables}\par",
        r"\vspace{1.5mm}",
        domain_cards,
        r"\vspace{2mm}",
        r"{\sffamily\bfseries\large\color{OrizoneGreen} Solution retenue par le moteur}\par",
        r"\vspace{1.5mm}",
        solution_strip,
        r"\vspace{2mm}",
        r"{\sffamily\bfseries\large\color{OrizoneGreen} Vérification sur les contraintes originales}\par",
        r"\vspace{1.5mm}",
        verification_table,
        r"\vspace{3mm}",

        # ITERATIONS
        r"\clearpage",
        r"{\small\sffamily\bfseries\color{OrizoneCopper} 02 / LE CALCUL}\par",
        r"\vspace{1mm}",
        r"{\sffamily\bfseries\fontsize{23}{27}\selectfont\color{OrizoneDark} Déroulement du Simplexe}\par",
        rf"{{\small\color{{OrizoneMuted}} {len(result.iterations)} tableau(x) enregistré(s) par le moteur ; les opérations présentées ci-dessous reprennent les étapes sauvegardées.}}\par",
        r"\vspace{2mm}",
        r"\begin{tcolorbox}[colback=OrizoneGreenPale,colframe=OrizoneBorder,boxrule=.4pt,arc=1mm,left=2.5mm,right=2.5mm,top=1.5mm,bottom=1.5mm]",
        r"{\small\textbf{Lecture du tableau.} La première ligne présente les coefficients de la fonction objectif. Les lignes suivantes décrivent les variables de base. La colonne Sol. contient le second membre et la colonne Rapport reprend les rapports enregistrés pour le choix de la variable sortante.}",
        r"\end{tcolorbox}",
        r"\vspace{2mm}",
        iteration_content,

        # RESULT PAGE
        r"\clearpage",
        r"{\small\sffamily\bfseries\color{OrizoneCopper} 03 / LA CONCLUSION}\par",
        r"\vspace{1mm}",
        r"{\sffamily\bfseries\fontsize{23}{27}\selectfont\color{OrizoneDark} Résultat de la résolution}\par",
        rf"{{\small\color{{OrizoneMuted}} Statut retourné par le moteur : \textbf{{{status_tex}}}.}}\par",
        r"\vspace{3mm}",
        rf"\begin{{tcolorbox}}[colback=OrizoneGreenPale,colframe=OrizoneGreen,boxrule=.7pt,arc=1mm,left=3mm,right=3mm,top=2mm,bottom=2mm]",
        rf"{{\sffamily\small\bfseries\color{{{status_tone}}} {status_tex.upper()}}}",
        r"\end{tcolorbox}",
        r"\vspace{2mm}",
        solution_strip,
        r"\vspace{3mm}",
        r"\begin{tcolorbox}[colback=OrizoneSoft,colframe=OrizoneBorder,boxrule=.45pt,arc=1mm,left=3mm,right=3mm,top=2mm,bottom=2mm]",
        r"{\small\sffamily\bfseries\color{OrizoneGreen} MESSAGE DU MOTEUR}\par",
        rf"{result_message}",
        r"\end{tcolorbox}",
        notes_block,
        r"\vfill",
        r"\textcolor{OrizoneBorder}{\rule{\textwidth}{0.5pt}}\par",
        r"{\scriptsize\color{OrizoneMuted} Ce document reproduit les données et les tableaux sauvegardés pour cette résolution. Les résultats affichés sont ceux retournés par le moteur Simplexe d’Orizone.}",
        r"\end{document}",
    ]

    return "\n".join(parts) + "\n"
