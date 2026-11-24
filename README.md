# Insight Lab

Kiwoom Lab 2기 활동으로 시작한 공개 금융 리서치 프로젝트. Astro 정적 사이트에서 여섯 서비스의 화면, 공개 자료와 출처를 탐색할 수 있다.

## 로컬 실행

Node.js 24에서 실행한다.

```sh
npm ci
npm run dev
```

Astro가 출력한 로컬 주소의 `/insight-lab/`으로 접속한다.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## 자료 갱신

- Hero Lab 화면 목록과 사용 예시는 `data/hero/`에 있다. 공식 화면 목록으로 확인한 항목과 화면별 도움말을 읽고 정리한 항목을 각각의 출처로 구분한다.
- VOC Studio 공지·문의 표본의 수집 범위와 부족한 자료는 [공개 자료 조사](docs/voc-source-research.md)에 기록한다.
- 시장 지표는 `python3 scripts/market/collect_prices.py --through YYYY-MM-DD`로 FRED의 일별 관측값을 월별로 집계한다.
- 공개 블로그 메타데이터는 `python3 scripts/archive/import_notes.py /path/to/scarletbreeze.github.io`로 재현한다. 원문과 비공개 자료는 원래 보관 위치에서 관리한다.

## GitHub Pages

프로젝트 워크플로는 main에서 검사와 빌드를 실행하고 `dist/`를 프로젝트 Pages에 배포한다. 로컬 기본 경로는 `/insight-lab/`이며 프로젝트 배포에서는 Pages의 실제 경로를 사용한다.

[계정 홈페이지](https://scarletbreeze.github.io/)는 별도 [루트 저장소의 워크플로](https://github.com/scarletbreeze/scarletbreeze.github.io/actions/workflows/deploy.yml)에서 Insight Lab의 main을 루트 경로로 빌드한다. Insight Lab main에 반영한 뒤 그 워크플로를 실행하면 계정 홈페이지에도 갱신된다.

## 개발 문서

- [에이전트 작업 지침](AGENTS.md)
- [인수인계](README_HANDOFF.md)
- [프로젝트 헌장](docs/00-project-charter.md)
- [디자인 시스템](docs/01-design-system.md)
- [데이터 정책](docs/02-data-policy.md)
