export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const fastApiResponse = await fetch(`${backendUrl}/templates`, {
      method: 'GET',
    });

    if (!fastApiResponse.ok) {
      throw new Error('Failed to fetch templates from FastAPI backend');
    }

    const data = await fastApiResponse.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching templates:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch templates' });
  }
}
