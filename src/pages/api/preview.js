import { parseCSVFromBuffer } from '../../utils/csvParser';
import templates from '../../utils/templates.json';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read raw body stream
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const templateId = req.headers['x-template-id'] || 'birthday_standard';
    const templateConfig = templates.find(t => t.id === templateId);
    
    if (!templateConfig) {
      return res.status(400).json({ error: `Template with ID '${templateId}' not found.` });
    }

    const { records, detectedEncoding, detectedDelimiter } = parseCSVFromBuffer(buffer);

    const required = templateConfig.required_columns || [];
    
    // Check which required columns are present in the CSV headers
    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    const presence = {};
    for (const col of required) {
      presence[col] = headers.includes(col);
    }

    // Slice rows for preview (max 10)
    const previewRows = records.slice(0, 10);

    return res.status(200).json({
      file_path: 'in-memory',
      detected_encoding: detectedEncoding,
      detected_delimiter: detectedDelimiter,
      used_encoding: detectedEncoding,
      used_delimiter: detectedDelimiter,
      columns: headers,
      rows: previewRows,
      required_columns: presence,
      required_columns_order: required,
      row_count_estimate: records.length,
    });
  } catch (err) {
    console.error('Preview API error:', err);
    return res.status(500).json({ error: err.message || 'Preview failed' });
  }
}
