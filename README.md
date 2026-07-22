# CS 메시지 자동생성 도구 — 백엔드

노션 DB(templates / template_versions / variables / users)를 실제 저장소로 쓰는 백엔드입니다.
화면(프론트)은 이 API들만 호출하고, 노션 토큰은 여기(서버)에만 있습니다.

## 배포 전 꼭 할 일: Vercel 환경변수 등록

1. Vercel 프로젝트 → Settings → Environment Variables
2. Key: `NOTION_TOKEN`
   Value: (노션에서 발급받은 `ntn_`으로 시작하는 액세스 토큰)
3. 저장 후 Redeploy 한번 해줘야 반영됩니다.

⚠️ 이 토큰을 코드 파일 안에 절대 직접 넣지 마세요. GitHub에 올라가면 안 됩니다.

## API 목록

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/templates` | 사용중인 템플릿 전체 목록 |
| POST | `/api/templates` | 새 템플릿 생성 |
| GET | `/api/template?id=xxx` | 템플릿 1개 상세 조회 |
| PUT | `/api/template` | 템플릿 수정 (동시수정 방지 포함) |
| GET | `/api/versions?templateId=xxx` | 특정 템플릿의 수정 이력 |
| POST | `/api/restore` | 과거 버전으로 복구 |
| GET | `/api/variables` | 사용중인 변수 목록 |
| GET | `/api/users` | 사용중인 팀원 목록 |

## 동시수정 방지는 이렇게 동작해요

1. 화면에서 템플릿을 불러올 때 `lastEditedTime` 값도 같이 저장해둡니다.
2. 수정 후 저장할 때 이 값을 `expectedLastEditedTime`으로 같이 보냅니다.
3. 서버가 노션에서 최신 상태를 다시 확인해서, 그 사이에 누가 먼저 수정했으면
   → 저장을 막고 `409` 에러 + 최신 내용을 돌려줍니다.
4. 화면에서는 이 경우 "다른 팀원이 먼저 수정했어요, 최신 내용을 다시 불러왔어요" 안내 후
   최신 내용을 보여주고 재수정하게 하면 됩니다.

## 필수 변수 텍스트 형식

`수정후필수변수` 등 이력 테이블의 값은 `"주문코드, 상품명"` 처럼 쉼표로 구분된
텍스트로 저장됩니다. (노션 관계형 필드가 아니라 그 시점의 스냅샷을 남기기 위함)

## 로컬 테스트

```bash
npm i -g vercel
vercel dev
```

`http://localhost:3000/api/templates` 로 접속해서 목록이 뜨는지 확인하세요.
(로컬에서도 `.env.local` 파일에 `NOTION_TOKEN=...` 넣어야 동작합니다. 이 파일은
`.gitignore`에 넣어서 GitHub에 올라가지 않게 하세요.)
