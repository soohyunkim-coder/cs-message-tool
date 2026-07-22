// GET /api/versions?templateId=xxx  → 특정 템플릿의 수정 이력 (최신순)

const { queryDataSource, readTitle, readRichText, readCheckbox } = require('../lib/notion');

function formatVersion(page) {
  return {
    id: page.id,
    title: readTitle(page, '버전제목'),
    beforeBody: readRichText(page, '수정전내용'),
    afterBody: readRichText(page, '수정후내용'),
    beforeRequiredVars: readRichText(page, '수정전필수변수'),
    afterRequiredVars: readRichText(page, '수정후필수변수'),
    editor: readRichText(page, '수정자'),
    editedAt: page.properties?.['수정일시']?.date?.start || null,
    wasRestored: readCheckbox(page, '복구여부'),
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `허용되지 않는 메서드: ${req.method}` });
    }

    const { templateId } = req.query;
    if (!templateId) {
      return res.status(400).json({ error: 'templateId 쿼리 파라미터가 필요합니다.' });
    }

    const data = await queryDataSource('versions', {
      filter: { property: '템플릿', relation: { contains: templateId } },
      sorts: [{ property: '수정일시', direction: 'descending' }],
    });

    return res.status(200).json({ versions: data.results.map(formatVersion) });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message });
  }
};
