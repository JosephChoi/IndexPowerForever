"""
파일 구조 검증 Hook (PostToolUse)

Edit/Write 도구 실행 후 프론트엔드 파일 구조 규칙을 검증한다.

검증 규칙:
  [구조] views/*.html ↔ logic/*.js 1:1 매칭 필수
"""

import sys
import json
import os


def validate_file(file_path):
    violations = []

    try:
        normalized = file_path.replace("\\", "/")
    except Exception:
        return violations

    # frontend/views/ 또는 frontend/logic/ 파일만 검사
    if "/frontend/views/" not in normalized and "/frontend/logic/" not in normalized:
        return violations

    # layout 파일 제외
    if "/layout/" in normalized:
        return violations

    # components 파일 제외
    if "/components/" in normalized:
        return violations

    # app.js 제외
    if normalized.endswith("/app.js"):
        return violations

    is_view = "/frontend/views/" in normalized
    is_logic = "/frontend/logic/" in normalized

    if is_view and normalized.endswith(".html"):
        # views/xxx.html → logic/xxx.js 존재 여부 확인
        pair_path = normalized.replace("/frontend/views/", "/frontend/logic/").replace(".html", ".js")
        pair_os_path = pair_path.replace("/", os.sep)

        if not os.path.exists(pair_os_path):
            rel = normalized.split("/frontend/views/")[1].replace(".html", ".js")
            violations.append(
                f"views 파일에 대응하는 logic 파일이 없습니다 → frontend/logic/{rel} 생성 필요"
            )

    elif is_logic and normalized.endswith(".js"):
        # logic/xxx.js → views/xxx.html 존재 여부 확인
        pair_path = normalized.replace("/frontend/logic/", "/frontend/views/").replace(".js", ".html")
        pair_os_path = pair_path.replace("/", os.sep)

        if not os.path.exists(pair_os_path):
            rel = normalized.split("/frontend/logic/")[1].replace(".js", ".html")
            violations.append(
                f"logic 파일에 대응하는 views 파일이 없습니다 → frontend/views/{rel} 생성 필요"
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
        header = f"[파일 구조 규칙 위반 감지] {file_path}"
        detail = "\n".join(f"  - {v}" for v in violations)
        msg = f"{header}\n{detail}\n\nView-Logic 1:1 매칭 규칙에 따라 대응 파일을 생성하세요."

        result = {"decision": "block", "reason": msg}
        print(json.dumps(result, ensure_ascii=False))

    sys.exit(0)


if __name__ == "__main__":
    main()
