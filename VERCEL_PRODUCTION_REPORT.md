# TrackLab Lite — Production 배포 완료

> **최신 상태 (2026-11-06):** 후속 사용자 요청에 따라 이 프로젝트의 Vercel 인증 보호를 해제했습니다 (`ssoProtection: null`). **https://tracklab-lite.vercel.app 에서 로그인 없이 바로 실행됩니다.** 인증 헤더·쿠키가 없는 새 Playwright 브라우저에서 HTTP 200, 업로드 파일 해시 일치, 3D 트랙, 슬라이더 자동 반영, 카메라, 코너 3종, 직접 주행, 미니맵, 코인 1개 수집 및 재생성 초기화를 모두 통과했습니다. 브라우저 오류와 예상 외 외부 요청은 0개입니다. 앱 코드 변경이나 재배포 없이 해당 프로젝트의 접근 설정만 변경했습니다. 다른 프로젝트·요금제는 변경하지 않았습니다. 검증 기록: [JSON](tmp/vercel-public-access-verification.json), [화면](test-results/vercel-public-access/initial.png). 아래 인증 보호 설명은 최초 배포 시점의 이력입니다.

완료일: 2026-11-06 (Asia/Seoul).

## 실행 주소와 상태

- **실행 URL: https://tracklab-lite.vercel.app**
- 상태: **READY / Production**.
- 프로젝트: 기존 독립 `twkims-projects-3852cfb1/tracklab-lite`.
- 프로젝트 ID: `prj_Hbz6pZFPKC3bA5N0gEwLmj2huePX`.
- 배포 ID: `dpl_32pf3eZQ76LTKstGZWMAqEiwwPYV`.
- 고정 배포 URL: https://tracklab-lite-324snw05h-twkims-projects-3852cfb1.vercel.app
- [Vercel 배포 상세](https://vercel.com/twkims-projects-3852cfb1/tracklab-lite/32pf3eZQ76LTKstGZWMAqEiwwPYV).

사용자가 이번 지시에서 이전 Production 금지를 해제하고 첫 Production 배포를 명시적으로 승인했습니다. 기존 프로젝트 연결을 그대로 사용했고 다른 Vercel 프로젝트는 변경하지 않았습니다.

## 접근 보호 실제 확인

- 배포 직전 및 배포 후 프로젝트 API에서 `ssoProtection.deploymentType = all`을 확인했습니다.
- 기본 주소와 고정 배포 주소 모두 **비로그인 요청은 HTTP 302로 Vercel SSO 로그인으로 이동**합니다. 검증용 임시 인증을 폐기한 뒤 새 비로그인 요청으로 다시 확인했습니다.
- 보호 예외는 최종 **0개**입니다. 원격 기능 검증에만 사용한 임시 자동화 인증 수단은 검증 종료 후 폐기했습니다.
- 인증된 HTTPS 요청은 HTTP 200이고, 배포된 정적 파일 6개의 SHA-256이 검토한 로컬 산출물과 모두 일치했습니다.
- 방문자는 프로젝트 접근 권한이 있는 Vercel 계정으로 로그인해야 합니다. 인증 없는 공개 접근은 허용하지 않았습니다.
- [최종 원격 상태](tmp/vercel-production-final-state.json), [보호 설정 및 임시 인증 폐기](tmp/vercel-production-protection.json), [비로그인 요청 결과](tmp/vercel-production-anonymous-check.json).

## 빌드와 기존 72개 회귀 검사

| 검사 | 결과 |
| --- | --- |
| `npm test` | 핵심 **37/37 통과** |
| `npm run test:browser` | 빌드 성공, 브라우저 **35/35 통과** |
| 전체 | **72/72 통과** |

기존 트랙·차량·충돌·카메라·미니맵·코인·코너 패턴의 앱 소스는 이번 배포 작업에서 변경하지 않았습니다. Three.js 포함 번들 약 608KB의 기존 청크 경고는 있으나 빌드는 성공했습니다.

## 실제 배포 주소 기능 검증

Production 앱에 개발 진단 API를 추가하지 않고 실제 HTTPS 주소와 키보드 입력으로 검사했습니다.

| 기능 | 실제 원격 결과 |
| --- | --- |
| 초기 3D 트랙 생성 | 정상 렌더링, 생성 완료 상태 확인 |
| 슬라이더 실시간 반영 | 도로 폭 슬라이더 End 키 → 80u, 버튼 없이 3D/미니맵 변경 |
| 카메라 | C 키로 Overview/Drive 전환 확인 |
| 90° 코너 | 2/2 적용, 측정 약 85°/87°, 도로/보도 검사 통과 |
| Hairpin | 2/2 적용, 측정 약 179°/178°, 도로/보도 검사 통과 |
| S-Curve | 2/2 적용, 각 곡률 반전 2회, 도로/보도 검사 통과 |
| 직접 주행 | 실제 방향키 입력으로 주행, HUD 최고 관측 속도 37.9u/s |
| 코인 수집 | 직접 주행으로 HUD **0/10 → 1/10** 확인 |
| 미니맵 | 형상 변경 및 주행 시 차량 마커 이동 확인 |
| 재생성 | 수동 Generate 후 속도 0, 코인 0/10 초기화 |
| 브라우저 오류/외부 요청 | 페이지 오류 0, 예상하지 않은 외부 origin 요청 0 |

원격 검증은 Chromium SwiftShader와 제어된 애니메이션 시계에서 수행했습니다. 실제 키 이벤트가 Production 앱의 정상 주행 루프를 움직였으며 차량 위치를 강제로 수정하지 않았습니다. 실제 데스크톱 GPU의 장시간 수동 주행/FPS 시험과는 구분합니다.

원격 렌더링 PNG를 직접 열어 3D 화면·패턴·주행·코인 카운터를 확인했습니다.

- [초기 화면](test-results/vercel-production/initial.png)
- [90°](test-results/vercel-production/right-angle.png)
- [Hairpin](test-results/vercel-production/hairpin.png)
- [S-Curve](test-results/vercel-production/s-curve.png)
- [직접 주행으로 코인 수집](test-results/vercel-production/driving-coin-collected.png)
- [원격 검증 상세 JSON](tmp/vercel-production-verification.json).

## 최종 산출물 점검

Production용 정적 검사와 CLI dry run에서 아래 **7개 파일, 625,427 bytes**만 선택됐습니다.

- Build Output API `config.json`.
- 정적 `index.html`, 해시된 JS/CSS, 직접 만든 일반 SVG 아이콘.
- `robots.txt`와 Three.js/OrbitControls·Vite 런타임의 MIT 라이선스 고지.

점검 범위에서 API 키/토큰, 개인정보 형태, 기밀 표식, 넥슨/게임 IP 명칭, 개인 로컬 경로, 개발 진단 API, 소스맵이 발견되지 않았습니다. 앱의 도로·차량·배경·코인은 기본 도형으로 생성합니다. 원본 PDF/PPTX/Processing, 프로젝트 소스, 보고서, 테스트/스크린샷, `node_modules`, `.env*` 및 CLI 인증 파일은 업로드 목록에 없습니다. 이전에 확인받은 외부 호스팅 권한과 이번 보호된 첫 Production 배포의 명시적 승인을 기록했으며, 이 기록을 앱에 대한 일반 공개 라이선스로 해석하지 않습니다.

`noindex`는 보조 색인 방지 설정이며 실제 접근 제한은 All Deployments 인증입니다.

- [Production 검사·파일 해시](tmp/vercel-production-audit.json).
- [실제 업로드 전 dry run](tmp/vercel-production-dry-run.json).
- [Vercel 배포 결과](tmp/vercel-production-deployment.json).

실행한 배포 명령은 `vercel deploy --prebuilt --prod --scope twkims-projects-3852cfb1 --yes --json`입니다. GitHub 저장소 생성/공개, 다른 프로젝트 변경, 플랜 변경 및 유료 추가 기능 구매는 하지 않았습니다.

## 배포 지원 파일

- `scripts/prepare-vercel-preview.mjs`: `production` 인자를 지원하도록 확장했습니다. 기존 산출물을 `tmp/`에 복사 보존하고, 경로를 검증한 뒤 오래된 생성 파일만 정리합니다. Windows 디렉터리 이동 잠금 문제를 피하며 앱 소스는 건드리지 않습니다.
- `scripts/verify-vercel-production.mjs`: 인증된 실제 HTTPS 기능 검사, 파일 해시 대조, 키보드 주행/수집, 스크린샷 및 검증 JSON 생성. 인증 값은 환경으로만 전달하고 보고서·URL·스크린샷에 저장하지 않습니다.
- `.vercel/project.json`: 기존 연결 유지.
- `vercel.json`, `.vercelignore`: 기존 보호 보조 헤더 및 prebuilt 업로드 제한 유지.
- `VERCEL_PRODUCTION_REPORT.md`: 이 보고서.

이전 중단 기록은 [VERCEL_DEPLOYMENT_REPORT.md](VERCEL_DEPLOYMENT_REPORT.md)에 보존합니다. 현재 상태는 이 문서와 `tmp/vercel-production-status.json`이 기준입니다.
