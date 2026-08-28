import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let uploadPath = null;
  try {
    // Datei aus dem Request streamen
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Temporären Dateinamen erstellen
    const tempFileName = `upload_${Date.now()}${path.extname(req.headers['x-file-name'] || '.tmp')}`;
    uploadPath = path.join(process.cwd(), 'uploads', tempFileName);

    // Upload-Verzeichnis sicherstellen
    if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
      fs.mkdirSync(path.join(process.cwd(), 'uploads'));
    }

    // Datei speichern
    fs.writeFileSync(uploadPath, buffer);

    const templateId = req.query.templateId || req.headers['x-template-id'] || 'birthday_standard';
    const yearVal = req.query.year || req.headers['x-letter-year'];
    
    const customSubjectB64 = req.query.customSubject || req.headers['x-custom-subject'];
    const customParagraphsB64 = req.query.customParagraphs || req.headers['x-custom-paragraphs'];
    
    let customSubject;
    let customParagraphs;
    
    if (customSubjectB64) {
      customSubject = Buffer.from(customSubjectB64, 'base64').toString('utf-8');
    }
    if (customParagraphsB64) {
      try {
        const decoded = Buffer.from(customParagraphsB64, 'base64').toString('utf-8');
        customParagraphs = JSON.parse(decoded);
      } catch (e) {
        console.error("Error decoding custom paragraphs:", e);
      }
    }

    console.log("DEBUG: api/upload query params:", req.query);
    console.log("DEBUG: resolved year is:", yearVal);
    console.log("DEBUG: custom subject is:", customSubject);

    // FastAPI Endpoint aufrufen
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const fastApiResponse = await fetch(`${backendUrl}/create_pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: uploadPath,
        template_id: templateId,
        year: yearVal ? Number(yearVal) : undefined,
        custom_subject: customSubject,
        custom_paragraphs: customParagraphs
      }),
    });

    if (!fastApiResponse.ok) {
      throw new Error('FastAPI processing failed');
    }

    const blob = await fastApiResponse.blob();
    const blobBuffer = await blob.arrayBuffer();
    
    // 4. Korrekte Next.js Response senden
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=document.pdf');
    res.status(200).send(Buffer.from(blobBuffer));

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'File upload failed' });
  } finally {
    if (uploadPath && fs.existsSync(uploadPath)) {
      try {
        fs.unlinkSync(uploadPath);
      } catch (err) {
        console.error('Error deleting temp CSV:', err);
      }
    }
  }
}