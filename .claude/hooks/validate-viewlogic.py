"""
ViewLogic 코드 품질 자동 검증 Hook (PostToolUse)

Edit/Write 도구 실행 후 파일을 검사하여 ViewLogic 규칙 위반을 감지한다.
위반 발견 시 Claude에게 즉시 수정 피드백을 제공한다.

검증 규칙:
  [HTML] <style> 태그 사용 금지 → css/style.css에 작성
  [HTML] <script> 태그 사용 금지 → logic/*.js 파일에 작성
  [HTML] :key="index" 사용 금지 → 고유 ID(ticker 등) 사용
  [HTML] v-for에 :key 누락 금지
  [HTML] <table> 사용 시 table-responsive 래퍼 필수
  [JS]   Promise.then/catch 금지 → async/await 사용
  [JS]   fetch() 직접 사용 금지 → this.$api 사용
  [JS]   async 함수에 try/catch 누락 경고
  [JS]   getParam() 후 null 체크 누락 경고
"""

import sys
import json
import re
import os


def validate_file(file_path):
    violations = []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            lines = content.splitlines(keepends=True)
    except Exception:
        return violations

    normalized = file_path.replace("\\", "/")

    # frontend/ 내 파일만 검사
    if "/frontend/" not in normalized:
        return violations

    # app.js, navbar.html, index.html 제외
    basename = os.path.basename(normalized)
    if basename in ("app.js", "navbar.html", "index.html", "auth.js"):
        return violations

    is_html = normalized.endswith(".html")
    is_js = normalized.endswith(".js")

    if not is_html and not is_js:
        return violations

    if is_html:
        for i, line in enumerate(lines, 1):
            if re.search(r"<style[\s>]", line, re.IGNORECASE):
                violations.append(
                    f"Line {i}: <style> 태그 사용 금지 → css/style.css에 작성하세요"
                )
            if re.search(r"<script[\s>]", line, re.IGNORECASE):
                violations.append(
                    f"Line {i}: <script> 태그 사용 금지 → logic/*.js 파일에 작성하세요"
                )
            # <table> 사용 시 table-responsive 래퍼 확인
            if re.search(r"<table[\s>]", line, re.IGNORECASE):
                prev_lines = "".join(lines[max(0, i - 4):i - 1])
                if "table-responsive" not in prev_lines:
                    violations.append(
                        f'Line {i}: <table> 사용 시 <div class="table-responsive"> 래퍼 필수'
                    )
            if ':key="index"' in line:
                violations.append(
                    f'Line {i}: :key="index" 사용 금지 → 고유 ticker/id를 key로 사용하세요'
                )
            # v-for에 :key 누락 검사
            if re.search(r'\bv-for\s*=', line) and ':key=' not in line:
                if re.search(r'>\s*$', line) or '/>' in line:
                    violations.append(
                        f"Line {i}: v-for에 :key 누락 → :key=\"item.ticker\" 또는 :key=\"item.id\" 추가"
                    )

    if is_js:
        in_block_comment = False

        for i, line in enumerate(lines, 1):
            stripped = line.strip()

            if "/*" in stripped:
                in_block_comment = True
            if "*/" in stripped:
                in_block_comment = False
                continue
            if in_block_comment:
                continue

            if stripped.startswith("//"):
                continue

            code_part = re.sub(r"//.*$", "", line)

            if re.search(r"\.then\s*\(", code_part):
                violations.append(
                    f"Line {i}: Promise.then() 사용 금지 → async/await 사용"
                )
            if re.search(r"\.catch\s*\(", code_part):
                violations.append(
                    f"Line {i}: Promise.catch() 사용 금지 → try/catch와 async/await 사용"
                )

            # fetch() 직접 사용 금지
            if re.search(r"\bfetch\s*\(", code_part):
                violations.append(
                    f"Line {i}: fetch() 직접 사용 금지 → this.$api.get/post/put/delete 사용"
                )

        # getParam() 후 null 체크 누락 검사
        getparam_pattern = re.compile(r"(?:const|let|var)\s+(\w+)\s*=\s*(?:this\.)?getParam\s*\(")
        for match in getparam_pattern.finditer(content):
            var_name = match.group(1)
            after_pos = match.end()
            after_text = content[after_pos:after_pos + 500]
            null_check = re.search(
                rf"if\s*\(\s*(?:!{re.escape(var_name)}\b|{re.escape(var_name)}\s*(?:&&|===|!==))",
                after_text
            )
            if not null_check:
                line_num = content[:match.start()].count("\n") + 1
                violations.append(
                    f"Line {line_num}: getParam('{var_name}') 후 null 체크 누락 → if (!{var_name}) {{ this.navigateTo('/'); return; }} 필수"
                )

        # async 함수에 try/catch 누락 검사
        method_blocks = re.finditer(
            r"async\s+(\w+)\s*\([^)]*\)\s*\{",
            content
        )
        for match in method_blocks:
            func_name = match.group(1)
            start_pos = match.end()
            if func_name in ("mounted", "created", "beforeMount", "beforeUnmount", "unmounted"):
                continue

            depth = 1
            pos = start_pos
            while pos < len(content) and depth > 0:
                if content[pos] == '{':
                    depth += 1
                elif content[pos] == '}':
                    depth -= 1
                pos += 1
            func_body = content[start_pos:pos]

            body_no_comments = re.sub(r"//.*", "", func_body)
            body_no_comments = re.sub(r"/\*.*?\*/", "", body_no_comments, flags=re.DOTALL)
            if "try" not in body_no_comments and "await" in body_no_comments:
                line_num = content[:match.start()].count("\n") + 1
                violations.append(
                    f"Line {line_num}: async {func_name}()에 try/catch 누락 → await 호출 시 에러 처리 필수"
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
        header = f"[ViewLogic 규칙 위반 감지] {file_path}"
        detail = "\n".join(f"  - {v}" for v in violations)
        msg = f"{header}\n{detail}\n\n위 위반 사항을 즉시 수정하세요."

        result = {"decision": "block", "reason": msg}
        print(json.dumps(result, ensure_ascii=False))

    sys.exit(0)


if __name__ == "__main__":
    main()
