import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { AWOBriefeDocument } from '../../utils/pdfGenerator';
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

    const templateConfig = templates.find(t => t.id === templateId);
    if (!templateConfig) {
      return res.status(400).json({ error: `Template with ID '${templateId}' not found.` });
    }

    // Parse CSV
    const { records } = parseCSVFromBuffer(buffer);
    if (records.length === 0) {
      return res.status(400).json({ error: 'Die CSV-Datei enthält keine Daten.' });
    }

    // Filter out rows that are empty or invalid
    const required = templateConfig.required_columns || [];
    const headers = Object.keys(records[0]);
    const missing = required.filter(col => !headers.includes(col));
    
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: `Fehlende Pflichtspalten: ${missing.join(', ')}`,
        columns: headers
      });
    }

    const finalYear = yearVal ? Number(yearVal) : new Date().getFullYear();

    // Generate PDF Buffer using @react-pdf/renderer
    const pdfBuffer = await renderToBuffer(
      React.createElement(AWOBriefeDocument, {
        records: records,
        templateConfig: templateConfig,
        data: {
          custom_subject: customSubject,
          custom_paragraphs: customParagraphs
        },
        year: finalYear
      })
    );

    // Send PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Briefe.pdf');
    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Upload error:', error);
    return res.status(500).json({ error: error.message || 'PDF Generation failed' });
  }
}