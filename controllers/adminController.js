const { fn, col, Op } = require('sequelize');
const Contact = require('../models/contact');

/** GET /api/admin/stats  (requires login) */
async function getStats(req, res) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, last7Days, bySourceRows, recent] = await Promise.all([
      Contact.count(),
      Contact.count({ where: { created_at: { [Op.gte]: sevenDaysAgo } } }),
      Contact.findAll({
        attributes: ['source', [fn('COUNT', col('id')), 'count']],
        group: ['source'],
        raw: true,
      }),
      Contact.findAll({
        attributes: ['id', 'name', 'email', 'message', 'source', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 5,
      }),
    ]);

    return res.json({
      success: true,
      total,
      last7Days,
      bySource: bySourceRows.map((r) => ({ source: r.source || 'unknown', count: Number(r.count) })),
      recent,
    });
  } catch (err) {
    console.error('getStats failed:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load dashboard data.' });
  }
}

module.exports = { getStats };