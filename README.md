# Insight Lab

Kiwoom Lab 2기 활동으로 시작한 공개 금융 리서치 프로젝트. Foundation에는 홈, 여섯 서비스 진입 페이지, 브라우저 내 서비스 검색과 공통 정책 페이지가 있다.

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

## GitHub Pages

워크플로는 main에서 검사와 빌드를 실행하고 `dist/`를 GitHub Pages에 배포한다. 저장소 Settings → Pages에서 Source를 GitHub Actions로 지정한다.

로컬 빌드의 기본 경로는 요구사항의 `/insight-lab/`이다. 배포 워크플로는 GitHub Pages가 제공하는 실제 경로로 빌드한다. 현재 origin 이름은 `insight_lab`이며, 요구사항의 주소 `https://scarletbreeze.github.io/insight-lab/`을 사용하려면 GitHub 저장소 이름과 공통 레이아웃의 GitHub 링크를 갱신한다.

## 개발 문서

- [에이전트 작업 지침](AGENTS.md)
- [인수인계](README_HANDOFF.md)
- [프로젝트 헌장](docs/00-project-charter.md)
- [디자인 시스템](docs/01-design-system.md)
- [데이터 정책](docs/02-data-policy.md)
