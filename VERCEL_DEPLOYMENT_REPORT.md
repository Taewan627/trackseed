# Vercel Preview 배포 준비·중단 기록 (이전 상태)

> **최신 상태:** 2026-11-06 Production 배포 후 후속 사용자 요청으로 인증 보호를 해제했습니다. https://tracklab-lite.vercel.app 에서 로그인 없이 실행됩니다. [최신 Production 결과](VERCEL_PRODUCTION_REPORT.md)를 참고하세요. 아래 내용은 이전 준비·중단 시점의 보존 기록입니다.

기준일: 2026-11-06 (Asia/Seoul).

## 현재 결과

**사용자 요청으로 배포를 중단했습니다. 독립 `tracklab-lite` 프로젝트, 로컬 연결, 현재 코드와 준비 파일을 보존합니다. 실행 URL은 아직 없고 실제 배포는 0건입니다. Production 배포는 수행하지 않았습니다.**

- 프로젝트: [twkims-projects-3852cfb1/tracklab-lite](https://vercel.com/twkims-projects-3852cfb1/tracklab-lite)
- 프로젝트 ID: `prj_Hbz6pZFPKC3bA5N0gEwLmj2huePX`
- 기존 CLI 로그인 확인 완료. 지정한 팀에 접근 가능하며 플랜은 Hobby입니다.
- Vercel CLI가 없어서 `npm install --global vercel`로 **65.11.0**을 설치했습니다. 별도 로그인 승인은 필요하지 않았습니다.
- 빈 원격 프로젝트를 생성하고 현재 로컬 디렉터리를 연결했습니다. GitHub 저장소는 만들거나 연결하지 않았습니다.
- 앞서 사용자가 보호된 Preview에 대해 **“권리 확인됨 — 인증 보호 Preview 배포 진행”**으로 답변했습니다. 이후 첫 배포 정책 확인 후 배포 중단을 지시했으며, 향후 외부 호스팅 허용 여부를 확인하고 첫 Production 배포를 별도로 승인하겠다고 명시했습니다. 현재 새 Production 배포 승인은 없고, 이전 Preview 답변을 Production 승인으로 해석하지 않습니다.
- 원격 설정을 다시 읽어 **Vercel Authentication / All Deployments (`ssoProtection.deploymentType = all`)**와 보호 예외 0개를 확인했습니다. Preview 피드백 툴바도 껐습니다.
- Vercel 공식 2026-09-09 안내에 따르면 All Deployments 인증 보호는 모든 플랜에서 추가 비용 없이 이용할 수 있습니다. 유료 플랜/추가 기능을 구매하지 않았습니다. [공식 안내](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan)

## 빌드 및 로컬 검사

- `npm test`: **37/37 통과**.
- `npm run test:browser`: 빌드 성공, **35/35 통과** (약 4.6분).
- 전체 **72/72 통과**. 기존 기능 소스는 변경하지 않았습니다.
- 로컬 프로덕션 렌더링, 주행, 실시간 파라미터, 미니맵, 코인, 패턴 3종, 충돌과 반복 재생성 검사를 포함합니다.
- 실제 Vercel 실행 URL은 생성되지 않아 **원격 URL의 기능·인증 차단 검사는 미실시**입니다. 로컬 테스트 결과와 구분합니다.

## 배포 파일 점검

소스 10개 및 빌드 파일 4개를 정적 검사했고, 준비된 업로드 파일을 다시 검사했습니다. 점검 범위에서 넥슨/게임 IP 명칭, 기밀 표식, 개인정보 형태, 키/토큰 패턴, 로컬 개인 경로, 개발 진단 API 또는 소스맵이 발견되지 않았습니다. 실제 화면과 소스는 기본 도형으로 만든 일반 도로·차량·배경·코인 및 직접 만든 SVG 아이콘입니다. 정적 검사만으로 원본의 저작권/외부 호스팅 권리를 확정할 수 없으므로 별도 사용자 확인을 받았습니다.

`vercel deploy --prebuilt --dry --environment preview --json`이 선택한 파일은 다음 **7개, 총 625,427 bytes**입니다.

| 파일 | bytes |
| --- | ---: |
| `.vercel/output/config.json` | 264 |
| `.vercel/output/static/index.html` | 670 |
| `.vercel/output/static/assets/index-BokGnQFF.js` | 608,335 |
| `.vercel/output/static/assets/index-m7Xjdl_s.css` | 13,530 |
| `.vercel/output/static/favicon.svg` | 216 |
| `.vercel/output/static/robots.txt` | 26 |
| `.vercel/output/static/THIRD_PARTY_NOTICES.txt` | 2,386 |

- 업로드 대상에 원본 Processing, PDF/PPTX, 프로젝트 소스, 보고서, 테스트/trace/스크린샷, `node_modules`, API 인증 파일, `.env*`, 개인 경로는 없습니다.
- Vercel link가 로컬에 생성한 `.env.local` 인증 파일과 `.vercel/project.json`은 이 업로드 목록에 포함되지 않습니다. 비밀 값은 로그/보고서에 기록하지 않았습니다.
- Three.js/OrbitControls와 Vite 런타임의 MIT 라이선스 고지를 포함했습니다. 이 고지가 앱/원본 코드에 별도 라이선스를 부여하는 것은 아닙니다.
- `robots.txt`와 `X-Robots-Tag`는 색인 방지 보조 설정입니다. 인증 보호를 대체하지 않으며, 실제 접근 제한은 원격 All Deployments 설정으로 확인했습니다.
- [파일 해시·검사 기록](tmp/vercel-preview-audit.json), [CLI dry run](tmp/vercel-upload-dry-run.json), [원격 보호 설정](tmp/vercel-project-protection.json).

## Preview 생성이 차단된 이유

권리 확인과 보호 재검증 후 실행한 명령:

```powershell
vercel deploy --prebuilt --environment preview --scope twkims-projects-3852cfb1 --yes --json
```

CLI는 `first_deployment_production`과 `action_required`를 반환했습니다. 새 프로젝트는 배포 이력이 없어서 첫 배포가 Production으로 지정됩니다. 공식 문서도 `--target=preview`나 다른 Git 브랜치로 시작해도 첫 배포는 Production이라고 명시합니다. 실패/취소된 배포도 이력으로 취급하지만, 배포 생성 전에 거부된 이번 요청은 이력에 포함되지 않습니다. [공식 First deployment 규칙](https://vercel.com/docs/deployments/environments#first-deployment)

사용자의 **Production 금지** 조건을 지켜, CLI가 제안한 Production 명령은 실행하지 않았고 API나 다른 플래그로 우회하지 않았습니다. 이후 원격에서 배포 목록 0개와 Production target 부재를 다시 확인했습니다.

사용자가 **기존 Vercel 프로젝트를 사용하지 말고 독립 tracklab-lite를 유지**하라고 지시했습니다. 다른 프로젝트로 연결을 옮기거나 기존 프로젝트를 덮어쓰지 않았습니다. 현재 프로젝트와 준비 파일은 그대로 보존합니다.

향후 재개 조건은 사용자의 외부 호스팅 허용 확인, 원격 All Deployments 인증 보호의 실제 활성 상태 재확인, 그리고 **첫 Production 배포에 대한 별도 명시적 승인**입니다. 지금은 이 배포를 진행하지 않습니다. 공개 배포, 유료 플랜 변경, 다른 기존 프로젝트 사용도 승인되지 않았습니다.

## 추가/변경 파일

- `vercel.json`: Vite 빌드/출력 및 noindex·nosniff 헤더 설정.
- `.vercelignore`: 검토한 prebuilt 출력만 허용하는 업로드 목록.
- `scripts/prepare-vercel-preview.mjs`: 로컬 검사·정적 출력 준비·라이선스 고지·SHA-256 manifest 생성. 네트워크 업로드는 수행하지 않습니다.
- `.gitignore`: CLI가 `.vercel`, `.env*` 제외 항목을 추가했습니다.
- `.vercel/project.json`: 지정된 원격 프로젝트 연결 정보, 업로드 대상 제외.
- `.vercel/output/`: 준비된 정적 배포 산출물.
- `tmp/vercel-*`: dry run, 검사·보호 설정 및 차단 상태 기록.
- `VERCEL_DEPLOYMENT_REPORT.md`: 이 보고서.

준비 파일 재생성만 수행하려면 `npm run build` 후 `node scripts/prepare-vercel-preview.mjs`를 실행합니다. 기존 `.vercel/output`은 삭제하지 않고 `tmp/`에 보존합니다. 원격 배포는 별도의 명령이며 현재 새 프로젝트에서는 위 첫 배포 제한이 적용됩니다.
