// GET  /api/templates          → 사용중인 템플릿 목록 전체 조회
// POST /api/templates          → 새 템플릿 생성
//   body: { name, body, requiredVars: string[], editor }

const {
  queryDataSource,
  createPage,
  readTitle,
  readRichText,
  readMultiSelect,
  toTitle,
  toRichText,
  toMultiSelect,
  toCheckbox,
  toDateNow,
  toRelation,
} = require('../lib/notion');

function formatTemplate(page) {
  return {
    id: page.id,
    name: readTitle(page, '템플릿명'),
    body: readRichText(page, '템플릿본문'),
    requiredVars: readMultiSelect(page, '필수변수'),
    lastEditedTime: page.last_edited_time, // 동시수정 방지에 이 값을 그대로 클라이언트가 들고 있어야 함
    lastEditor: readRichText(page, '최종수정자'),
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await queryDataSource('templates', {
        filter: { property: '사용여부', checkbox: { equals: true } },
        sorts: [{ property: '템플릿명', direction: 'ascending' }],
      });
      const templates = data.results.map(formatTemplate);
      return res.status(200).json({ templates });
    }

    if (req.method === 'POST') {
      const { name, body, requiredVars = [], editor } = req.body || {};

      if (!name || !body || !editor) {
        return res.status(400).json({ error: '템플릿명, 본문, 작성자(editor)는 필수입니다.' });
      }

      // 1) templates DB에 새 템플릿 생성
      const newPage = await createPage('templates', {
        템플릿명: toTitle(name),
        템플릿본문: toRichText(body),
        필수변수: toMultiSelect(requiredVars),
        사용여부: toCheckbox(true),
        최종수정자: toRichText(editor),
      });

      // 2) template_versions에 최초 생성 기록도 하나 남겨둠 (수정전내용은 빈 값)
      await createPage('versions', {
        버전제목: toTitle(`${name} - 최초생성 - ${new Date().toISOString()}`),
        템플릿: toRelation(newPage.id),
        수정전내용: toRichText(''),
        수정후내용: toRichText(body),
        수정전필수변수: toRichText(''),
        수정후필수변수: toRichText(requiredVars.join(', ')),
        수정일시: toDateNow(),
        수정자: toRichText(editor),
        복구여부: toCheckbox(false),
      });

      return res.status(201).json({ template: formatTemplate(newPage) });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `허용되지 않는 메서드: ${req.method}` });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message });
  }
};
