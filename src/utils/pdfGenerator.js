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
  // ==========================================
  // 1. Brief (Letter) Styles
  // ==========================================
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
  // DIN 5008 folding marks (small & delicate)
  dinMark: {
    position: 'absolute',
    left: 0,
    height: 0.5,
    backgroundColor: '#777777',
  },
  foldMark1: {
    top: mmToPt(105),
    width: mmToPt(3.5),
  },
  foldMark2: {
    top: mmToPt(200),
    width: mmToPt(3.5),
  },
  // Logo top right (Briefkopf at very top of page)
  logoContainer: {
    position: 'absolute',
    top: mmToPt(15),
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

  // ==========================================
  // 2. Urkunde (Certificate) Styles - Senior Standard
  // ==========================================
  urkundePage: {
    width: mmToPt(210),
    height: mmToPt(297),
    position: 'relative',
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  // Outer formal AWO red border
  urkundeOuterBorder: {
    position: 'absolute',
    top: mmToPt(10),
    left: mmToPt(10),
    right: mmToPt(10),
    bottom: mmToPt(10),
    borderWidth: 2,
    borderColor: '#e30613', // AWO Red
  },
  // Inner thin decorative accent border
  urkundeInnerBorder: {
    position: 'absolute',
    top: mmToPt(13),
    left: mmToPt(13),
    right: mmToPt(13),
    bottom: mmToPt(13),
    borderWidth: 0.6,
    borderColor: '#e30613',
  },
  // Logo top right
  urkundeLogoContainer: {
    position: 'absolute',
    top: mmToPt(18),
    right: mmToPt(18),
    width: mmToPt(44),
  },
  urkundeLogo: {
    width: '100%',
    height: 'auto',
  },
  // Header / Title container
  urkundeHeader: {
    marginTop: mmToPt(34),
    alignItems: 'center',
  },
  urkundeMainTitle: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#e30613', // Official AWO Red
    letterSpacing: 6,
    textAlign: 'center',
  },
  urkundeDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: mmToPt(3.5),
    width: mmToPt(80),
  },
  urkundeDividerLine: {
    flex: 1,
    height: 0.8,
    backgroundColor: '#e30613',
  },
  urkundeDividerDiamond: {
    width: 4.5,
    height: 4.5,
    backgroundColor: '#e30613',
    marginHorizontal: 6,
    transform: 'rotate(45deg)',
  },
  urkundeSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#334155',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Recipient honor section
  urkundeRecipientContainer: {
    alignItems: 'center',
    marginTop: mmToPt(18),
    marginBottom: mmToPt(16),
  },
  urkundeAnrede: {
    fontSize: 12,
    color: '#64748b',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: mmToPt(2),
  },
  urkundeName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.6,
  },
  // Body text
  urkundeBodyContainer: {
    paddingHorizontal: mmToPt(26),
    marginBottom: mmToPt(14),
  },
  urkundeParagraph: {
    fontSize: 12,
    lineHeight: 1.7,
    textAlign: 'center',
    color: '#1e293b',
    marginBottom: mmToPt(6),
  },
  urkundeParagraphHighlight: {
    fontSize: 12,
    lineHeight: 1.7,
    textAlign: 'center',
    color: '#0f172a',
    fontWeight: 'bold',
    marginBottom: mmToPt(6),
  },
  // Official Watermark / Seal Stamp
  urkundeWatermarkContainer: {
    position: 'absolute',
    top: mmToPt(173),
    left: mmToPt(76.5),
    width: mmToPt(57),
    height: mmToPt(57),
    opacity: 0.92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urkundeWatermark: {
    width: '100%',
    height: '100%',
  },
  // Footer
  urkundeFooter: {
    position: 'absolute',
    bottom: mmToPt(22),
    left: mmToPt(22),
    right: mmToPt(22),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  urkundeDateContainer: {
    width: 170,
  },
  urkundeDateCity: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  urkundeDateText: {
    fontSize: 9.5,
    color: '#475569',
  },
  urkundeSignatureContainer: {
    width: 195,
    alignItems: 'center',
  },
  urkundeSignatureSpace: {
    height: 36, // Blank space for manual pen signature
  },
  urkundeSignatureLine: {
    width: '100%',
    height: 0.8,
    backgroundColor: '#94a3b8',
    marginBottom: 5,
  },
  urkundeSignerName: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  urkundeSignerTitle: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'center',
  },
});

function getAssetDataUri(assetRelPath) {
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
}

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

// 1. Brief Component
const Brief = ({ row, templateConfig, data, year, index, total }) => {
  const salutations = getSalutations(row[templateConfig.salutation_column || "Briefanrede"]);
  
  // Date formatting (DD.MM.YYYY)
  let formattedDate = new Date().toLocaleDateString('de-DE');
  const dateCol = templateConfig.date_column;
  if (dateCol && row[dateCol]) {
    const bdRaw = row[dateCol];
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

      {/* DIN 5008 Folding Marks */}
      <View style={[styles.dinMark, styles.foldMark1]} />
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

// 2. Urkunde (Certificate) Component
const Urkunde = ({ row, templateConfig, data, year, index, total }) => {
  // Anrede formatting for certificate (e.g. "Herrn" -> "Herr")
  let anrede = row.Anrede || '';
  if (anrede.toLowerCase() === 'herrn') anrede = 'Herr';
  if (!anrede && row.Briefanrede) {
    if (row.Briefanrede.toLowerCase().includes('herr') || row.Briefanrede.toLowerCase().includes('lieber')) anrede = 'Herr';
    else if (row.Briefanrede.toLowerCase().includes('frau') || row.Briefanrede.toLowerCase().includes('liebe')) anrede = 'Frau';
  }

  const fullName = `${row.Vorname || ''} ${row.Nachname || ''}`.trim();
  const formattedDate = new Date().toLocaleDateString('de-DE');

  // Dynamic membership years from CSV (Jahre Mitglied or Jahre)
  const membershipYears = row["Jahre Mitglied"] || row["Jahre"] || "40";
  
  let subtitle = templateConfig.subtitle || `${membershipYears}-jährige AWO-Mitgliedschaft`;
  subtitle = subtitle.replaceAll("[Jahre]", membershipYears);
  subtitle = subtitle.replace(/\s*-\s*jährige/g, '-jährige').replace(/AWO\s*-\s*Mitgliedschaft/g, 'AWO-Mitgliedschaft');

  const subjectRaw = data.custom_subject || templateConfig.subject || "URKUNDE";
  const paragraphsRaw = data.custom_paragraphs || templateConfig.paragraphs || [];

  const renderedParagraphs = paragraphsRaw.map(p => {
    let text = p.replaceAll("[Jahre]", membershipYears);
    text = text.replace(/\{\{\s*row\.(\w+)\s*\}\}/g, (match, key) => row[key] || "");
    return text;
  });

  const logoUri = getAssetDataUri(templateConfig.assets?.logo_image);
  const watermarkUri = getAssetDataUri(templateConfig.assets?.watermark_image || "public/images/urkunde_watermark.png");

  return (
    <Page size="A4" style={styles.urkundePage}>
      {/* Decorative Outer and Inner AWO Red Borders */}
      <View style={styles.urkundeOuterBorder} />
      <View style={styles.urkundeInnerBorder} />

      {/* Official Watermark / Seal in the designated empty area */}
      {watermarkUri && (
        <View style={styles.urkundeWatermarkContainer}>
          <Image style={styles.urkundeWatermark} src={watermarkUri} />
        </View>
      )}

      {/* Logo placed at Top Right */}
      {logoUri && (
        <View style={styles.urkundeLogoContainer}>
          <Image style={styles.urkundeLogo} src={logoUri} />
        </View>
      )}

      {/* Header with Main Title, Diamond Divider, and Subtitle */}
      <View style={styles.urkundeHeader}>
        <Text style={styles.urkundeMainTitle}>{subjectRaw}</Text>
        <View style={styles.urkundeDividerContainer}>
          <View style={styles.urkundeDividerLine} />
          <View style={styles.urkundeDividerDiamond} />
          <View style={styles.urkundeDividerLine} />
        </View>
        {subtitle ? (
          <Text style={styles.urkundeSubtitle}>{subtitle}</Text>
        ) : null}
      </View>

      {/* Recipient Honor Section */}
      <View style={styles.urkundeRecipientContainer}>
        {anrede ? <Text style={styles.urkundeAnrede}>{anrede}</Text> : null}
        <Text style={styles.urkundeName}>{fullName}</Text>
      </View>

      {/* Body Paragraphs */}
      <View style={styles.urkundeBodyContainer}>
        {renderedParagraphs.map((p, i) => (
          <Text 
            key={i} 
            style={i === renderedParagraphs.length - 1 && renderedParagraphs.length > 1 
              ? styles.urkundeParagraphHighlight 
              : styles.urkundeParagraph}
          >
            {p}
          </Text>
        ))}
      </View>

      {/* Footer with Date and Manual Signature Area */}
      <View style={styles.urkundeFooter}>
        <View style={styles.urkundeDateContainer}>
          <Text style={styles.urkundeDateCity}>Troisdorf – Oberlar</Text>
          <Text style={styles.urkundeDateText}>den {formattedDate}</Text>
        </View>
        
        <View style={styles.urkundeSignatureContainer}>
          <View style={styles.urkundeSignatureSpace} />
          <View style={styles.urkundeSignatureLine} />
          <Text style={styles.urkundeSignerName}>
            {templateConfig.closing_wishes ? templateConfig.closing_wishes.split(',')[0].trim() : "Birgit Biegel"}
          </Text>
          <Text style={styles.urkundeSignerTitle}>
            {templateConfig.closing_wishes && templateConfig.closing_wishes.includes(',') 
              ? templateConfig.closing_wishes.split(',').slice(1).join(',').trim() 
              : "Vorsitzende AWO Oberlar e. V."}
          </Text>
        </View>
      </View>
    </Page>
  );
};

// Main Document Component
export const AWOBriefeDocument = ({ records, templateConfig, data, year }) => {
  const isUrkunde = templateConfig.type === 'urkunde' || templateConfig.id === 'urkunde_standard';
  
  return (
    <Document>
      {records.map((row, index) => (
        isUrkunde ? (
          <Urkunde
            key={index}
            row={row}
            templateConfig={templateConfig}
            data={data}
            year={year}
            index={index}
            total={records.length}
          />
        ) : (
          <Brief
            key={index}
            row={row}
            templateConfig={templateConfig}
            data={data}
            year={year}
            index={index}
            total={records.length}
          />
        )
      ))}
    </Document>
  );
};
