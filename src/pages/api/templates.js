import templates from '../../utils/templates.json';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    return res.status(200).json(templates);
  } catch (err) {
    console.error('Error fetching templates:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch templates' });
  }
}
