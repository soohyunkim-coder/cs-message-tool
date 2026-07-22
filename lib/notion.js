// ── 노션 API 호출 공통 함수 ─────────────────────────────────
// 이 파일 하나에 "노션이랑 어떻게 대화하는지"를 다 몰아넣었어요.
// 다른 api/*.js 파일들은 이 함수들만 불러다 쓰면 됩니다.

const NOTION_VERSION = '2025-09-03';
const BASE_URL = 'https://api.notion.com/v1';

// 4개 DB의 data source ID (노션에서 DB 만들 때 발급된 고유 ID, 비밀값 아님)
const DATA_SOURCES = {
  templates: 'b954b20a-fea3-4435-aedd-ba55625490c8',
  versions: '6bfb43e4-a248-4e53-8034-009d3cee0460',
  variables: '2e549936-6f5a-44ba-bb5d-b229ab291bff',
  users: '127e3551-01b1-4bd5-989f-3d5d33809c94',
};

// 토큰은 Vercel 환경변수(NOTION_TOKEN)에서만 읽어옵니다. 코드에 절대 직접 안 씀.
function getToken() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error('NOTION_TOKEN 환경변수가 설정되어 있지 않습니다. Vercel 프로젝트 설정에서 추가해주세요.');
  }
  return token;
}

async function notionFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const message = data?.message || `노션 API 오류 (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.notionCode = data?.code;
    throw err;
  }

  return data;
}

// 데이터소스(=DB) 안의 페이지들을 조건에 맞춰 조회
async function queryDataSource(dsKey, body = {}) {
  const dsId = DATA_SOURCES[dsKey];
  return notionFetch(`/data_sources/${dsId}/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// 페이지 1개 상세 조회 (최신 상태 확인용, 동시수정 방지에 사용)
async function getPage(pageId) {
  return notionFetch(`/pages/${pageId}`);
}

// 데이터소스 안에 새 페이지(=행) 생성
async function createPage(dsKey, properties) {
  const dsId = DATA_SOURCES[dsKey];
  return notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'data_source_id', data_source_id: dsId },
      properties,
    }),
  });
}

// 기존 페이지 속성 수정
async function updatePage(pageId, properties) {
  return notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

// ── 속성 값 읽기 헬퍼 (노션 응답 → 우리가 쓰기 편한 값으로) ──
function readTitle(page, propName) {
  return page.properties?.[propName]?.title?.[0]?.plain_text || '';
}
function readRichText(page, propName) {
  return (page.properties?.[propName]?.rich_text || [])
    .map((t) => t.plain_text)
    .join('');
}
function readMultiSelect(page, propName) {
  return (page.properties?.[propName]?.multi_select || []).map((o) => o.name);
}
function readCheckbox(page, propName) {
  return !!page.properties?.[propName]?.checkbox;
}
function readSelect(page, propName) {
  return page.properties?.[propName]?.select?.name || null;
}

// ── 속성 값 쓰기 헬퍼 (우리 값 → 노션이 원하는 형식으로) ──
function toTitle(value) {
  return { title: [{ text: { content: String(value ?? '') } }] };
}
function toRichText(value) {
  return { rich_text: [{ text: { content: String(value ?? '') } }] };
}
function toMultiSelect(values) {
  return { multi_select: (values || []).map((name) => ({ name })) };
}
function toCheckbox(value) {
  return { checkbox: !!value };
}
function toDateNow() {
  return { date: { start: new Date().toISOString() } };
}
function toRelation(pageId) {
  return { relation: [{ id: pageId }] };
}

module.exports = {
  DATA_SOURCES,
  queryDataSource,
  getPage,
  createPage,
  updatePage,
  readTitle,
  readRichText,
  readMultiSelect,
  readCheckbox,
  readSelect,
  toTitle,
  toRichText,
  toMultiSelect,
  toCheckbox,
  toDateNow,
  toRelation,
};
