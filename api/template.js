// GET /api/template?id=xxx     → 템플릿 1개 상세 조회
// PUT /api/template             → 템플릿 수정
//   body: {
//     id,                       // 수정할 템플릿 페이지 ID
//     name, body, requiredVars, // 새 값
//     editor,                   // 수정자 이름 (users DB에서 선택한 값)
//     expectedLastEditedTime    // 화면에 불러왔을 때의 최종수정일 (동시수정 확인용)
//   }

const {
  getPage,
  updatePage,
  createPage,
  readTitle,
  readRichText,
  readMultiSelect,
  toTitle,
  toRichText,
  toMultiSelect,
  toDateNow,
  toRelation,
} = require('../lib/notion');

function formatTemplate(page) {
  return {
    id: page.id,
    name: readTitle(page, '템플릿명'),
    body: readRichText(page, '템플릿본문'),
    requiredVars: readMultiSelect(page, '필수변수'),
    lastEditedTime: page.last_edited_time,
    lastEditor: readRichText(page, '최종수정자'),
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id 쿼리 파라미터가 필요합니다.' });
      const page = await getPage(id);
      return res.status(200).json({ template: formatTemplate(page) });
    }

    if (req.method === 'PUT') {
      const { id, name, body, requiredVars = [], editor, expectedLastEditedTime } = req.body || {};

      if (!id || !name || !body || !editor || !expectedLastEditedTime) {
        return res.status(400).json({
          error: 'id, name, body, editor, expectedLastEditedTime는 모두 필수입니다.',
        });
      }

      // 1) 현재 노션에 저장된 최신 상태를 가져와서, 화면이 불러온 시점과 같은지 비교
      const currentPage = await getPage(id);
      if (currentPage.last_edited_time !== expectedLastEditedTime) {
        // 다른 사람이 먼저 수정한 경우 → 덮어쓰지 않고, 최신 내용을 그대로 돌려줌
        return res.status(409).json({
          error: '다른 팀원이 먼저 수정했습니다. 최신 내용을 다시 불러온 뒤 재수정해주세요.',
          latest: formatTemplate(currentPage),
        });
      }

      const before = {
        body: readRichText(currentPage, '템플릿본문'),
        requiredVars: readMultiSelect(currentPage, '필수변수'),
      };

      // 2) templates 페이지 갱신
      const updated = await updatePage(id, {
        템플릿명: toTitle(name),
        템플릿본문: toRichText(body),
        필수변수: toMultiSelect(requiredVars),
        최종수정자: toRichText(editor),
      });

      // 3) template_versions에 이번 수정 기록 남기기
      await createPage('versions', {
        버전제목: toTitle(`${name} - ${new Date().toISOString()}`),
        템플릿: toRelation(id),
        수정전내용: toRichText(before.body),
        수정후내용: toRichText(body),
        수정전필수변수: toRichText(before.requiredVars.join(', ')),
        수정후필수변수: toRichText(requiredVars.join(', ')),
        수정일시: toDateNow(),
        수정자: toRichText(editor),
        복구여부: { checkbox: false },
      });

      return res.status(200).json({ template: formatTemplate(updated) });
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: `허용되지 않는 메서드: ${req.method}` });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message });
  }
};
