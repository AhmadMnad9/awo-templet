import path from 'path';
import fs from 'fs';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// Helper to convert mm to points (1mm = 2.83464 points)
const mmToPt = (mm) => mm * 2.83464;

const themeColors = {
  'theme-red': '#e30613',
  'theme-blue': '#2980b9',
  'theme-gold': '#d4af37',
  'theme-green': '#27ae60',
};

const styles = StyleSheet.create({
  page: {
    width: mmToPt(210),
    height: mmToPt(297),
    position: 'relative',
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#000000',
  },
  // DIN 5008 folding and punching marks
  dinMark: {
    position: 'absolute',
    left: 0,
    height: 1,
    backgroundColor: '#333333',
  },
  foldMark1: {
    top: mmToPt(105),
    width: mmToPt(6),
  },
  foldMark2: {
    top: mmToPt(200),
    width: mmToPt(6),
  },
  punchMark: {
    top: mmToPt(148.5),
    width: mmToPt(8),
    height: 1.2,
    backgroundColor: '#333333',
  },
  // Logo top right
  logoContainer: {
    position: 'absolute',
    top: mmToPt(50),
    right: mmToPt(20),
    width: mmToPt(55),
  },
  logo: {
    width: '100%',
  },
  // Watermark
  watermarkContainer: {
    position: 'absolute',
    top: mmToPt(115),
    left: mmToPt(40),
    width: mmToPt(130),
    opacity: 0.85, // clear watermark visibility
  },
  watermark: {
    width: '100%',
  },
  // Address Field
  addressField: {
    position: 'absolute',
    top: mmToPt(45),
    left: mmToPt(20),
    width: mmToPt(85),
    height: mmToPt(45),
    paddingTop: mmToPt(2),
  },
  senderSmallLine: {
    fontSize: 7.5,
    color: '#555555',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
    paddingBottom: mmToPt(1.5),
    marginBottom: mmToPt(2),
  },
  recipientAddress: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  // Date
  dateZone: {
    position: 'absolute',
    top: mmToPt(95),
    right: mmToPt(20),
    fontSize: 11,
    textAlign: 'right',
  },
  // Subject
  subjectZone: {
    position: 'absolute',
    top: mmToPt(103.7),
    left: mmToPt(20),
    right: mmToPt(20),
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Body Zone
  bodyZone: {
    position: 'absolute',
    top: mmToPt(120),
    left: mmToPt(20),
    right: mmToPt(20),
  },
  salutation: {
    fontWeight: 'bold',
    marginBottom: mmToPt(4),
  },
  letterContent: {
    marginBottom: mmToPt(4),
  },
  paragraph: {
    marginBottom: mmToPt(4),
    textAlign: 'justify',
  },
  poemContainer: {
    marginVertical: mmToPt(6),
    paddingHorizontal: mmToPt(4),
    borderLeftWidth: 3,
    borderRightWidth: 3,
  },
  poemLine: {
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#555555',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  closing: {
    marginTop: mmToPt(6),
    marginBottom: mmToPt(4),
  },
  signatureArea: {
    marginTop: -15,
    marginBottom: mmToPt(2),
  },
  signatureImage: {
    width: 140,
    height: 'auto',
  },
});

function getSalutations(briefanrede) {
  if (!briefanrede || typeof briefanrede !== 'string') {
    return ["erhalten Sie", "Ihnen", "Ihr", "Ihren"];
  }
  const briefanredeLower = briefanrede.toLowerCase();
  
  if (
    briefanredeLower.includes("frau") || 
    briefanredeLower.includes("herr") || 
    briefanredeLower.includes("geehrte") || 
    briefanredeLower.includes("geehrter")
  ) {
    return ["erhalten Sie", "Ihnen", "Ihr", "Ihren"];
  }
  if (
    briefanredeLower.includes("liebe") || 
    briefanredeLower.includes("lieber") || 
    briefanredeLower.includes("hallo") || 
    briefanredeLower.includes("du") || 
    briefanredeLower.includes("dir")
  ) {
    return ["erhältst Du", "Dir", "Dein", "Deinen"];
  }
  return ["erhalten Sie", "Ihnen", "Ihr", "Ihren"];
}

function formatCustomText(text, salutations, row, year) {
  if (!text) return "";
  let formatted = text;
  formatted = formatted.replaceAll("[erhältst/erhalten]", salutations[0]);
  formatted = formatted.replaceAll("[Dir/Ihnen]", salutations[1]);
  formatted = formatted.replaceAll("[Dein/Ihr]", salutations[2]);
  formatted = formatted.replaceAll("[deinen/Ihren]", salutations[3]);
  
  // Variable interpolation: {{ row.Vorname }} etc
  formatted = formatted.replace(/\{\{\s*row\.(\w+)\s*\}\}/g, (match, key) => row[key] || "");
  formatted = formatted.replace(/\{\{\s*year\s*\}\}/g, String(year));
  
  return formatted;
}

// Single Brief Component
const Brief = ({ row, templateConfig, data, year, index, total }) => {
  const salutations = getSalutations(row[templateConfig.salutation_column || "Briefanrede"]);
  
  // Date formatting (DD.MM.YYYY)
  let formattedDate = new Date().toLocaleDateString('de-DE');
  const dateCol = templateConfig.date_column;
  if (dateCol && row[dateCol]) {
    const bdRaw = row[dateCol];
    // if DD.MM.YYYY
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(bdRaw)) {
      const parts = bdRaw.split('.');
      formattedDate = `${parts[0]}.${parts[1]}.${year}`;
    } else {
      formattedDate = bdRaw;
    }
  }
  row["formatted_date"] = formattedDate;

  // Resolve Subject and Paragraphs
  const subjectRaw = data.custom_subject || templateConfig.subject || "Herzlichen Glückwunsch!";
  const paragraphsRaw = data.custom_paragraphs || templateConfig.paragraphs || [];
  const poemRaw = templateConfig.poem || [];

  const renderedSubject = formatCustomText(subjectRaw, salutations, row, year);
  const renderedParagraphs = paragraphsRaw.map(p => formatCustomText(p, salutations, row, year));
  const renderedPoem = poemRaw.map(line => formatCustomText(line, salutations, row, year));
  const renderedClosingHeadline = formatCustomText(templateConfig.closing_headline || "", salutations, row, year);
  const renderedClosingWishes = formatCustomText(templateConfig.closing_wishes || "", salutations, row, year);

  const accentColor = themeColors[templateConfig.theme] || '#e30613';

  // Resolve assets as base64 data URIs for robust offline rendering
  const getAssetDataUri = (assetRelPath) => {
    if (!assetRelPath) return null;
    const absPath = path.join(process.cwd(), assetRelPath);
    if (fs.existsSync(absPath)) {
      try {
        const ext = path.extname(absPath).toLowerCase().replace('.', '');
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
        const base64 = fs.readFileSync(absPath, 'base64');
        return `data:${mime};base64,${base64}`;
      } catch (e) {
        console.error("Error reading asset file:", absPath, e);
      }
    }
    return null;
  };

  const logoUri = getAssetDataUri(templateConfig.assets?.logo_image);
  const watermarkUri = getAssetDataUri(templateConfig.assets?.watermark_image);
  const signatureUri = getAssetDataUri(templateConfig.assets?.signature_image);

  return (
    <Page size="A4" style={styles.page}>
      {/* Watermark Background */}
      {watermarkUri && (
        <View style={styles.watermarkContainer}>
          <Image style={styles.watermark} src={watermarkUri} />
        </View>
      )}

      {/* DIN 5008 Marks (Fold 1, Hole Punch, Fold 2) */}
      <View style={[styles.dinMark, styles.foldMark1]} />
      <View style={[styles.dinMark, styles.punchMark]} />
      <View style={[styles.dinMark, styles.foldMark2]} />

      {/* Logo Top Right */}
      {logoUri && (
        <View style={styles.logoContainer}>
          <Image style={styles.logo} src={logoUri} />
        </View>
      )}

      {/* Address Field */}
      <View style={styles.addressField}>
        <Text style={styles.senderSmallLine}>
          AWO Oberlar e. V. • Sieglarer Str. 66-68 • 53842 Troisdorf
        </Text>
        <Text style={styles.recipientAddress}>
          {row.Anrede ? `${row.Anrede} ` : ''}{row.Vorname} {row.Nachname}{"\n"}
          {row.Straße}{"\n"}
          {row.Postleitzahl} {row.Ort}
        </Text>
      </View>

      {/* Date */}
      <View style={styles.dateZone}>
        <Text>Troisdorf, {formattedDate}</Text>
      </View>

      {/* Subject */}
      <View style={[styles.subjectZone, { color: accentColor }]}>
        <Text>{renderedSubject}</Text>
      </View>

      {/* Body Zone */}
      <View style={styles.bodyZone}>
        <Text style={styles.salutation}>{row[templateConfig.salutation_column || "Briefanrede"] || "Sehr geehrte Damen und Herren"},</Text>
        
        <View style={styles.letterContent}>
          {renderedParagraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>{p}</Text>
          ))}
        </View>

        {/* Poem */}
        {renderedPoem.length > 0 && (
          <View style={[styles.poemContainer, { borderLeftColor: accentColor, borderRightColor: accentColor }]}>
            {renderedPoem.map((line, i) => (
              <Text key={i} style={styles.poemLine}>{line}</Text>
            ))}
          </View>
        )}

        {/* Closing */}
        {renderedClosingHeadline ? (
          <View style={styles.closing}>
            <Text style={{ fontWeight: 'bold' }}>{renderedClosingHeadline}</Text>
          </View>
        ) : null}
        
        <Text style={styles.paragraph}>{renderedClosingWishes}</Text>
        
        {/* Signature */}
        {signatureUri && (
          <View style={styles.signatureArea}>
            <Image style={styles.signatureImage} src={signatureUri} />
          </View>
        )}
        
        <Text style={styles.paragraph}>
          Birgit Biegel{"\n"}
          Vorsitzende
        </Text>
      </View>
    </Page>
  );
};

// Main Document Component
export const AWOBriefeDocument = ({ records, templateConfig, data, year }) => (
  <Document>
    {records.map((row, index) => (
      <Brief
        key={index}
        row={row}
        templateConfig={templateConfig}
        data={data}
        year={year}
        index={index}
        total={records.length}
      />
    ))}
  </Document>
);
