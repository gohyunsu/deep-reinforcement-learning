"""Build a standalone Korean LaTeX guide from the edited slide explanations."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
OUT = ROOT / "guide" / "main.tex"


def escape(text: str) -> str:
    mapping = {
        "\\": r"\textbackslash{}", "{": r"\{", "}": r"\}", "%": r"\%",
        "&": r"\&", "#": r"\#", "_": r"\_", "^": r"\^{}",
        "~": r"\~{}",
    }
    return "".join(mapping.get(char, char) for char in text)


INLINE = re.compile(
    r"(?<!\\)\$((?:\\\$|[^$\n])+?)\$"
    r"|\[([^\]]+)\]\(([^)]+)\)"
    r"|\*\*([^*]+)\*\*"
    + r"|" + re.escape(chr(96)) + r"([^" + re.escape(chr(96)) + r"]+)" + re.escape(chr(96))
)


def inline(source: str) -> str:
    out, last = [], 0
    for match in INLINE.finditer(source):
        out.append(escape(source[last:match.start()]))
        math, label, url, bold, code = match.groups()
        if math is not None:
            out.append("$" + math + "$")
        elif label is not None:
            if url.startswith("http"):
                safe_url = url.replace("%", r"\%").replace("#", r"\#")
                out.append(r"\href{" + safe_url + "}{" + inline(label) + "}")
            else:
                out.append(inline(label))
        elif bold is not None:
            out.append(r"\textbf{" + inline(bold) + "}")
        else:
            out.append(r"\texttt{" + escape(code) + "}")
        last = match.end()
    out.append(escape(source[last:]))
    return "".join(out)


DETAIL = re.compile(r"<details><summary>(.*?)</summary><p>(.*?)</p></details>")
TABLE_ALIGN = re.compile(r"^:?-{3,}:?$")


def markdown(source: str, slide_headings: bool = False) -> str:
    lines = source.replace("\r\n", "\n").split("\n")
    result = []
    list_kind = None

    def close_list():
        nonlocal list_kind
        if list_kind:
            result.append(r"\end{" + list_kind + "}")
            list_kind = None

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            close_list()
            result.append("")
            i += 1
            continue
        if line == "$$":
            close_list()
            block = []
            i += 1
            while i < len(lines) and lines[i].strip() != "$$":
                block.append(lines[i])
                i += 1
            if i == len(lines):
                raise ValueError("Unclosed display formula")
            result.extend([r"\[", *block, r"\]"])
            i += 1
            continue
        details = DETAIL.fullmatch(line)
        if details:
            close_list()
            result.append(r"\par\medskip\noindent\textbf{" + inline(details[1]) +
                          r"}\quad " + inline(details[2]) + r"\par")
            i += 1
            continue
        if line.startswith("|"):
            close_list()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
                if not all(TABLE_ALIGN.fullmatch(cell) for cell in cells):
                    rows.append(cells)
                i += 1
            if not rows or any(len(row) != len(rows[0]) for row in rows):
                raise ValueError("Malformed table")
            n = len(rows[0])
            widths = ("p{0.21\\linewidth}p{0.31\\linewidth}p{0.39\\linewidth}"
                      if n == 3 else "p{0.2\\linewidth}" * n)
            result.append(r"\begin{longtable}{" + widths + r"}\hline")
            for j, row in enumerate(rows):
                result.append(" & ".join(inline(cell) for cell in row) + r" \\")
                if j == 0:
                    result.append(r"\hline")
            result.append(r"\hline\end{longtable}")
            continue
        if line.startswith("## "):
            close_list()
            head = line[3:]
            if slide_headings and not re.fullmatch(r"슬라이드 (\d{2}) · (.+)", head):
                raise ValueError("Malformed slide heading: " + head)
            result.append(r"\subsection{" + inline(head) + "}")
            i += 1
            continue
        if line.startswith("### "):
            close_list()
            result.append(r"\subsubsection{" + inline(line[4:]) + "}")
            i += 1
            continue
        bullet = re.match(r"^(?:[-*] |\d+\. )(.*)$", line)
        if bullet:
            kind = "itemize" if line.startswith(("- ", "* ")) else "enumerate"
            if list_kind != kind:
                close_list()
                result.append(r"\begin{" + kind + "}")
                list_kind = kind
            result.append(r"\item " + inline(bullet[1]))
            i += 1
            continue
        close_list()
        result.append(inline(line) + r"\par")
        i += 1
    close_list()
    return "\n".join(result)


def main():
    manifest = json.loads((CONTENT / "manifest.json").read_text(encoding="utf-8"))
    assignments = json.loads((CONTENT / "assignments.json").read_text(encoding="utf-8"))
    parts = [r"""\documentclass[11pt,a4paper]{article}
\usepackage[a4paper,margin=22mm,headheight=14pt]{geometry}
\usepackage{kotex}
\usepackage{amsmath,amssymb}
\usepackage{longtable,array}
\usepackage{xcolor}
\usepackage[colorlinks=true,linkcolor=blue!55!black,urlcolor=blue!55!black,bookmarksdepth=1]{hyperref}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.55em}
\setcounter{tocdepth}{2}
\renewcommand{\arraystretch}{1.2}
\begin{document}
\begin{titlepage}
\centering\vspace*{3cm}
{\Huge\bfseries Deep Reinforcement Learning\par}
\vspace{1.3cm}
{\Large 슬라이드별 학습 가이드\par}
\vspace{0.8cm}
{\large 순차 의사결정부터 오프라인 강화학습까지\par}
\vfill
{\large 2026년 2학기\par}
\end{titlepage}
\tableofcontents
\clearpage
"""]
    for chapter in manifest:
        source = (CONTENT / (chapter["id"] + ".md")).read_text(encoding="utf-8")
        first, rest = source.split("\n", 1)
        parts.append(r"\section{" + escape(first.removeprefix("# ")) + "}\n")
        parts.append(markdown(rest, slide_headings=True))
        parts.append(r"\clearpage")
    parts.append(r"\setlength{\parskip}{0.35em}")
    parts.append(r"\section{과제 가이드}")
    for assignment in assignments:
        source = (CONTENT / "assignments" / assignment["file"]).read_text(encoding="utf-8")
        first, rest = source.split("\n", 1)
        parts.append(r"\subsection{" + escape(first.removeprefix("# ")) + "}\n")
        content = markdown(rest)
        content = content.replace(r"\subsection{", r"\subsubsection{")
        parts.append(content)
    parts.append(r"\end{document}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(parts) + "\n", encoding="utf-8")
    print("Generated", OUT)


if __name__ == "__main__":
    main()
