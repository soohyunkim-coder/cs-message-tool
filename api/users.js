// GET /api/users → 사용중인 팀원 목록 ( {name, role} 형태 )

const { queryDataSource, readTitle, readSelect } = require('../lib/notion');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `허용되지 않는 메서드: ${req.method}` });
    }

    const data = await queryDataSource('users', {
      filter: { property: '사용여부', checkbox: { equals: true } },
      sorts: [{ property: '이름', direction: 'ascending' }],
    });

    const users = data.results.map((page) => ({
      name: readTitle(page, '이름'),
      role: readSelect(page, '권한'), // '관리자' | '팀원' (지금은 정보성, 기능 제한 없음)
    }));

    return res.status(200).json({ users });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message });
  }
};
