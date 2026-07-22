// GET /api/variables → 사용중인 변수 목록 ( {key, label} 형태 )

const { queryDataSource, readTitle, readRichText } = require('../lib/notion');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `허용되지 않는 메서드: ${req.method}` });
    }

    const data = await queryDataSource('variables', {
      filter: { property: '사용여부', checkbox: { equals: true } },
    });

    const variables = data.results.map((page) => ({
      key: readTitle(page, '변수명'), // 예: order_code
      label: readRichText(page, '화면표시명'), // 예: 주문코드
    }));

    return res.status(200).json({ variables });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message });
  }
};
