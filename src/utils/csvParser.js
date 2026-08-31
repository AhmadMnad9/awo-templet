/**
 * Auto-detects the encoding of a buffer and decodes it.
 * Try UTF-8 first, then Windows-1252 (German Excel default), then Latin1.
 */
export function decodeBuffer(buffer) {
  const encodings = ['utf-8', 'windows-1252', 'latin1'];
  
  // Check for UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    try {
      const decoder = new TextDecoder('utf-8');
      return { text: decoder.decode(buffer.slice(3)), encoding: 'utf-8-bom' };
    } catch (e) {
      // Fallback
    }
  }

  for (const enc of encodings) {
    try {
      const decoder = new TextDecoder(enc, { fatal: true });
      const text = decoder.decode(buffer);
      return { text, encoding: enc };
    } catch (e) {
      continue;
    }
  }

  // Fallback to lossy UTF-8
  const decoder = new TextDecoder('utf-8');
  return { text: decoder.decode(buffer), encoding: 'utf-8-lossy' };
}

/**
 * Auto-detects the CSV delimiter by counting occurrences on the first line.
 */
export function detectDelimiter(firstLine) {
  const candidates = [';', ',', '\t', '|', ':'];
  let maxCount = -1;
  let detected = ';'; // Default for German systems

  for (const cand of candidates) {
    const count = (firstLine.match(new RegExp(cand === '|' ? '\\|' : cand, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detected = cand;
    }
  }
  return maxCount > 0 ? detected : ';';
}

/**
 * Parses a CSV string into an array of objects.
 * Handles double quotes, newlines inside fields, and trims headers.
 */
export function parseCSV(text, delimiter) {
  const lines = [];
  let row = [""];
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === delimiter && !insideQuote) {
      row.push("");
    } else if (char === '\n' && !insideQuote) {
      if (text[i - 1] === '\r') {
        row[row.length - 1] = row[row.length - 1].slice(0, -1);
      }
      lines.push(row);
      row = [""];
    } else if (char === '\r' && !insideQuote) {
      // skip
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }

  if (lines.length === 0) return [];

  // Clean headers (remove BOM, trim whitespaces)
  const headers = lines[0].map(h => {
    let cleaned = h.replace(/^\ufeff/, '').trim();
    // remove multiple whitespaces
    return cleaned.replace(/\s+/g, ' ');
  });

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    if (values.length !== headers.length) {
      // Skip empty or mismatched rows
      if (values.length === 1 && values[0].trim() === "") continue;
      continue;
    }
    const record = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      const val = values[j].trim();
      record[headers[j]] = val;
      if (val !== "") hasData = true;
    }
    if (hasData) {
      records.push(record);
    }
  }
  return records;
}

/**
 * Combined helper to parse CSV from Buffer
 */
export function parseCSVFromBuffer(buffer, customEncoding = null, customDelimiter = null) {
  let { text, encoding } = decodeBuffer(buffer);
  
  const firstNewLine = text.indexOf('\n');
  const firstLine = firstNewLine !== -1 ? text.substring(0, firstNewLine) : text;
  
  const delimiter = customDelimiter || detectDelimiter(firstLine);
  const records = parseCSV(text, delimiter);
  
  return {
    records,
    detectedEncoding: encoding,
    detectedDelimiter: delimiter,
  };
}
