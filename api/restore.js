// POST /api/restore
//   body: { versionId, editor }
// 동작: 선택한 버전의 "수정후내용/수정후필수변수" 상태로 템플릿을 되돌리고,
//       이 복구 자체도 새로운 이력 한 줄로 남긴다 (복구여부: true)

const {
  queryDataSource,
  getPage,
  updatePage,
  createPage,
  readRichText,
  readTitle,
  toTitle,
  toRichText,
  toMultiSelect,
  toDateNow,
  toRelation,
} = require('../lib/notion');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `허용되지 않는 메서드: ${req.method}` });
    }

    const { versionId, editor } = req.body || {};
    if (!versionId || !editor) {
      return res.status(400).json({ error: 'versionId, editor는 필수입니다.' });
    }

    // 1) 복구 대상 버전 정보 가져오기
    const versionPage = await getPage(versionId);
    const templateRelation = versionPage.properties?.['템플릿']?.relation?.[0]?.id;
    if (!templateRelation) {
      return res.status(400).json({ error: '이 버전에 연결된 템플릿을 찾을 수 없습니다.' });
    }

    const restoredBody = readRichText(versionPage, '수정후내용');
    const restoredVarsRaw = readRichText(versionPage, '수정후필수변수'); // "주문코드, 상품명" 형태 텍스트
    const restoredVars = restoredVarsRaw
      ? restoredVarsRaw.split(',').map((v) => v.trim()).filter(Boolean)
      : [];

    // 2) 복구 전, 현재 템플릿 상태를 "이번 변경의 수정전내용"으로 기록해두기 위해 조회
    const currentTemplate = await getPage(templateRelation);
    const currentBody = readRichText(currentTemplate, '템플릿본문');
    const currentVars = (currentTemplate.properties?.['필수변수']?.multi_select || []).map((o) => o.name);
    const templateName = readTitle(currentTemplate, '템플릿명');

    // 3) templates 페이지를 복구 내용으로 덮어쓰기
    const updated = await updatePage(templateRelation, {
      템플릿본문: toRichText(restoredBody),
      필수변수: toMultiSelect(restoredVars),
      최종수정자: toRichText(editor),
    });

    // 4) 이 복구 작업도 새로운 이력 한 줄로 남김 (복구여부: true)
    await createPage('versions', {
      버전제목: toTitle(`${templateName} - 복구 - ${new Date().toISOString()}`),
      템플릿: toRelation(templateRelation),
      수정전내용: toRichText(currentBody),
      수정후내용: toRichText(restoredBody),
      수정전필수변수: toRichText(currentVars.join(', ')),
      수정후필수변수: toRichText(restoredVars.join(', ')),
      수정일시: toDateNow(),
      수정자: toRichText(editor),
      복구여부: { checkbox: true },
    });

    return res.status(200).json({
      restored: {
        id: updated.id,
        body: restoredBody,
        requiredVars: restoredVars,
        lastEditedTime: updated.last_edited_time,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message });
  }
};
