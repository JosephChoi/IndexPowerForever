"""
백엔드 코드 품질 자동 검증 Hook (PostToolUse)

Edit/Write 도구 실행 후 백엔드 파일(backend/src/)을 검사하여 규칙 위반을 감지한다.
위반 발견 시 Claude에게 즉시 수정 피드백을 제공한다.

검증 규칙:
  [ENV]  process.env 사용 금지 → c.env / this.env 사용 (Cloudflare Workers)
  [SQL]  SQL 문자열 연결 금지 → prepared statement + ? 파라미터 사용
  [SQL]  $1/$2 파라미터 사용 금지 → ? 사용 (D1/SQLite)
  [ROUTE] Route에서 직접 DB 쿼리 금지 → Service를 통해 접근
"""

import sys
import json
import re


def validate_file(file_path):
    violations = []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            lines = content.splitlines(keepends=True)
    except Exception:
        return violations

    normalized = file_path.replace("\\", "/")

    # backend/src/ 내 파일만 검사
    if "/backend/src/" not in normalized:
        return violations

    is_js = normalized.endswith(".js")
    if not is_js:
        return violations

    is_route = "/routes/" in normalized
    is_service = "/services/" in normalized

    in_block_comment = False

    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        # 블록 주석 처리
        if "/*" in stripped:
            in_block_comment = True
        if "*/" in stripped:
            in_block_comment = False
            continue
        if in_block_comment:
            continue

        # 한 줄 주석 건너뛰기
        if stripped.startswith("//"):
            continue

        # 주석 부분 제거
        code_part = re.sub(r"//.*$", "", line)

        # [ENV] process.env 사용 금지
        if "process.env" in code_part:
            violations.append(
                f"Line {i}: process.env 사용 금지 → c.env (Route) 또는 this.env (Service) 사용"
            )

        # [SQL] $1/$2 파라미터 사용 금지 (D1은 ? 사용)
        if is_service:
            if re.search(r'\$\d+', code_part) and re.search(r'(SELECT|INSERT|UPDATE|DELETE|WHERE)', code_part, re.IGNORECASE):
                violations.append(
                    f"Line {i}: SQL에 $1/$2 파라미터 사용 금지 (PostgreSQL 문법) → D1/SQLite는 ? 사용"
                )

        # [SQL] SQL 문자열 연결 금지
        if is_service:
            if re.search(r'`[^`]*\b(SELECT|INSERT|UPDATE|DELETE|WHERE|SET|FROM|JOIN)\b[^`]*\$\{', code_part, re.IGNORECASE):
                violations.append(
                    f"Line {i}: SQL 문자열에 ${{}} 템플릿 리터럴 금지 → prepared statement 사용"
                )
            if re.search(r'["\'][^"\']*\b(SELECT|INSERT|UPDATE|DELETE|WHERE)\b[^"\']*["\']\s*\+', code_part, re.IGNORECASE):
                violations.append(
                    f"Line {i}: SQL 문자열 연결(+) 금지 → prepared statement 사용"
                )

        # [ROUTE] Route에서 직접 DB 쿼리 금지
        if is_route:
            if re.search(r'env\.DB\b', code_part):
                violations.append(
                    f"Line {i}: Route에서 직접 D1(env.DB) 접근 금지 → Service를 통해 접근하세요"
                )

    return violations


def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except Exception:
        sys.exit(0)

    file_path = input_data.get("tool_input", {}).get("file_path", "")
    if not file_path:
        sys.exit(0)

    violations = validate_file(file_path)

    if violations:
        header = f"[백엔드 규칙 위반 감지] {file_path}"
        detail = "\n".join(f"  - {v}" for v in violations)
        msg = f"{header}\n{detail}\n\n위 위반 사항을 즉시 수정하세요."

        result = {"decision": "block", "reason": msg}
        print(json.dumps(result, ensure_ascii=False))

    sys.exit(0)


if __name__ == "__main__":
    main()
