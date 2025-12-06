import type { ParseurDocument, Division, Section, Subsection, PayItem, ParseResult } from './types.js';
import * as fs from 'fs';

// Division definitions from WVDOH Standard Specifications
const DIVISION_DEFINITIONS: Record<number, string> = {
  100: 'GENERAL PROVISIONS',
  200: 'EARTHWORK',
  300: 'BASES',
  400: 'ASPHALT PAVEMENTS',
  500: 'RIGID PAVEMENT',
  600: 'INCIDENTAL CONSTRUCTION',
  700: 'MATERIALS',
  800: 'CONSTRUCTION DETAILS',
  900: 'TRAFFIC CONTROL DEVICES',
};

// Regex patterns for parsing WVDOH specs
const PATTERNS = {
  // Section header: "SECTION 624" followed by title on next line or same line
  sectionHeader: /(?:^|\n)\s*SECTION\s+(\d{3})\s*\n\s*([A-Z][A-Z\s,&\-\/\(\)]+?)(?=\n)/gm,

  // Alternative section header: "601 STRUCTURAL CONCRETE" at start of section
  sectionHeaderAlt: /(?:^|\n)\s*(\d{3})\s+([A-Z][A-Z\s,&\-\/\(\)]{3,}?)(?=\n)/gm,

  // Subsection Level 1: "624.1-DESCRIPTION:" or "624.1 DESCRIPTION:"
  subsectionL1: /(?:^|\n)(\d{3}\.\d+)[\-\s]+([A-Z][A-Za-z\s,&\-\/\(\)]+?):/gm,

  // Subsection Level 2: "625.6.1-Excavation:" (indented or not)
  subsectionL2: /(?:^|\n)\s*(\d{3}\.\d+\.\d+)[\-\s]+([A-Za-z][A-Za-z\s,&\-\/\(\)]+?):/gm,

  // Subsection Level 3: "625.6.1.1-Scope:"
  subsectionL3: /(?:^|\n)\s*(\d{3}\.\d+\.\d+\.\d+)[\-\s]+([A-Za-z][A-Za-z\s,&\-\/\(\)]+?):/gm,

  // Pay item: "623001-*         Shotcrete                       Square Yard"
  payItem: /^\s*(\d{6})-\*\s+(.+?)\s{2,}(Square Yard|Linear Foot|Cubic Yard|Each|Lump Sum|Pound|Ton|Square Foot|Hour|Day|Mile|Gallon|.+?)\s*$/gm,

  // Page number at end of page (standalone 3-digit number)
  pageNumber: /^\s*(\d{3,4})\s*$/gm,

  // Table reference
  tableRef: /TABLE\s+(\d{3}(?:\.\d+)*(?:\-[A-Z0-9]+)?)/gi,

  // Cross-references to other sections
  crossRef: /Section\s+(\d{3}(?:\.\d+)*)/gi,

  // Form feed character (page break in PDF extraction)
  pageBreak: /\f/g,
};

export function loadJsonFiles(jsonPath1: string, jsonPath2: string): string {
  console.log('Loading JSON files...');

  const json1 = JSON.parse(fs.readFileSync(jsonPath1, 'utf-8')) as ParseurDocument;
  const json2 = JSON.parse(fs.readFileSync(jsonPath2, 'utf-8')) as ParseurDocument;

  console.log(`  File 1: ${json1.OriginalDocument.name} (${(json1.TextDocument.length / 1024).toFixed(0)} KB)`);
  console.log(`  File 2: ${json2.OriginalDocument.name} (${(json2.TextDocument.length / 1024).toFixed(0)} KB)`);

  // Combine text documents - they should be sequential pages
  const combinedText = json1.TextDocument + '\n' + json2.TextDocument;

  console.log(`  Combined text: ${(combinedText.length / 1024).toFixed(0)} KB`);

  return combinedText;
}

export function parseSpecifications(text: string): ParseResult {
  console.log('\nParsing specification structure...');

  // Clean the text
  const cleanedText = cleanText(text);

  // Extract divisions
  const divisions = extractDivisions(cleanedText);
  console.log(`  Found ${divisions.length} divisions`);

  // Extract sections
  const sections = extractSections(cleanedText);
  console.log(`  Found ${sections.length} sections`);

  // Extract subsections
  const subsections = extractSubsections(cleanedText, sections);
  console.log(`  Found ${subsections.length} subsections`);

  // Extract pay items
  const payItems = extractPayItems(cleanedText);
  console.log(`  Found ${payItems.length} pay items`);

  // Link pay items to sections
  linkPayItemsToSections(sections, payItems);

  return { divisions, sections, subsections, payItems };
}

function cleanText(text: string): string {
  return text
    // Remove form feeds but keep as section markers
    .replace(PATTERNS.pageBreak, '\n---PAGE_BREAK---\n')
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function extractDivisions(text: string): Division[] {
  const divisions: Division[] = [];

  // Check which divisions have content in the document
  for (const [numStr, title] of Object.entries(DIVISION_DEFINITIONS)) {
    const num = parseInt(numStr);
    // Look for any section in this division range
    const divPattern = new RegExp(`\\b(${num.toString().charAt(0)}\\d{2})\\b`);
    if (divPattern.test(text)) {
      divisions.push({
        number: num,
        title: title,
      });
    }
  }

  return divisions.sort((a, b) => a.number - b.number);
}

function extractSections(text: string): Section[] {
  const sections: Section[] = [];
  const seenSections = new Set<string>();

  // Try both section header patterns
  const patterns = [
    { regex: PATTERNS.sectionHeader, name: 'standard' },
    { regex: PATTERNS.sectionHeaderAlt, name: 'alt' },
  ];

  for (const { regex } of patterns) {
    let match;
    // Reset regex
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const sectionNumber = match[1];
      const title = match[2].trim().replace(/\s+/g, ' ');

      // Skip if we've seen this section or if title is too short
      if (seenSections.has(sectionNumber) || title.length < 3) continue;

      // Skip TOC entries (usually followed by page numbers)
      if (/^\d+$/.test(title)) continue;

      // Get division number (first digit * 100)
      const divisionNumber = Math.floor(parseInt(sectionNumber) / 100) * 100;

      // Extract full text for this section (everything until next section)
      const fullText = extractSectionText(text, sectionNumber, match.index);

      seenSections.add(sectionNumber);
      sections.push({
        sectionNumber,
        title,
        divisionNumber,
        fullText,
        relatedPayItems: [],
      });
    }
  }

  // Sort by section number
  return sections.sort((a, b) => parseInt(a.sectionNumber) - parseInt(b.sectionNumber));
}

function extractSectionText(text: string, sectionNumber: string, startIndex: number): string {
  // Find the end of this section (start of next section or end of text)
  const nextSectionPattern = new RegExp(`\\n\\s*(?:SECTION\\s+)?(${parseInt(sectionNumber) + 1})\\s+[A-Z]`, 'm');
  const nextMatch = text.slice(startIndex).match(nextSectionPattern);

  let endIndex = text.length;
  if (nextMatch && nextMatch.index) {
    endIndex = startIndex + nextMatch.index;
  }

  return text.slice(startIndex, endIndex).trim();
}

function extractSubsections(text: string, sections: Section[]): Subsection[] {
  const subsections: Subsection[] = [];
  const seenSubsections = new Set<string>();

  // Process each section to find its subsections
  for (const section of sections) {
    const sectionText = section.fullText;

    // Extract all levels of subsections
    const patterns = [
      { regex: PATTERNS.subsectionL1, level: 1 },
      { regex: PATTERNS.subsectionL2, level: 2 },
      { regex: PATTERNS.subsectionL3, level: 3 },
    ];

    for (const { regex, level } of patterns) {
      let match;
      regex.lastIndex = 0;

      while ((match = regex.exec(sectionText)) !== null) {
        const subsectionNumber = match[1];
        const title = match[2].trim();

        // Validate subsection belongs to this section
        if (!subsectionNumber.startsWith(section.sectionNumber + '.')) continue;

        // Skip duplicates
        if (seenSubsections.has(subsectionNumber)) continue;
        seenSubsections.add(subsectionNumber);

        // Extract content for this subsection
        const content = extractSubsectionContent(sectionText, subsectionNumber, match.index);

        // Find cross-references
        const crossRefs = extractCrossReferences(content);

        // Determine parent subsection
        let parentSubsection: string | undefined;
        if (level === 2) {
          // Parent is x.x
          parentSubsection = subsectionNumber.split('.').slice(0, 2).join('.');
        } else if (level === 3) {
          // Parent is x.x.x
          parentSubsection = subsectionNumber.split('.').slice(0, 3).join('.');
        }

        subsections.push({
          sectionNumber: section.sectionNumber,
          subsectionNumber,
          title,
          content,
          hierarchyLevel: level,
          parentSubsection,
          crossReferences: crossRefs,
        });
      }
    }
  }

  return subsections.sort((a, b) => {
    // Sort by section number first, then subsection number
    const aNum = a.subsectionNumber.split('.').map(n => parseInt(n) || 0);
    const bNum = b.subsectionNumber.split('.').map(n => parseInt(n) || 0);
    for (let i = 0; i < Math.max(aNum.length, bNum.length); i++) {
      if ((aNum[i] || 0) !== (bNum[i] || 0)) {
        return (aNum[i] || 0) - (bNum[i] || 0);
      }
    }
    return 0;
  });
}

function extractSubsectionContent(sectionText: string, subsectionNumber: string, startIndex: number): string {
  // Find the end (next subsection at same or higher level)
  const parts = subsectionNumber.split('.');
  const level = parts.length;

  // Pattern to find next subsection at same or higher level
  const nextPattern = new RegExp(
    `\\n\\s*(\\d{3}\\.\\d+(?:\\.\\d+)?(?:\\.\\d+)?)[\\-\\s]+[A-Za-z]`,
    'g'
  );

  let endIndex = sectionText.length;
  nextPattern.lastIndex = startIndex + subsectionNumber.length;

  let match;
  while ((match = nextPattern.exec(sectionText)) !== null) {
    const nextNum = match[1];
    const nextParts = nextNum.split('.');

    // Check if this is at same or higher level
    if (nextParts.length <= level && nextNum !== subsectionNumber) {
      endIndex = match.index;
      break;
    }
    // Also stop at same level
    if (nextParts.length === level && nextNum !== subsectionNumber) {
      endIndex = match.index;
      break;
    }
  }

  return sectionText.slice(startIndex, endIndex).trim();
}

function extractCrossReferences(content: string): string[] {
  const refs: string[] = [];
  const pattern = /Section\s+(\d{3}(?:\.\d+)*)/gi;

  let match;
  while ((match = pattern.exec(content)) !== null) {
    const ref = match[1];
    if (!refs.includes(ref)) {
      refs.push(ref);
    }
  }

  return refs;
}

function extractPayItems(text: string): PayItem[] {
  const payItems: PayItem[] = [];
  const seenItems = new Set<string>();

  // Look for PAY ITEMS or PAY ITEM sections
  const payItemSections = text.split(/PAY\s+ITEMS?:/i);

  for (let i = 1; i < payItemSections.length; i++) {
    const section = payItemSections[i];

    // Get the section number from context (look backwards for section header)
    const contextBefore = payItemSections[i - 1].slice(-500);
    const sectionMatch = contextBefore.match(/(\d{3})\.\d+[\-\s]+/);
    const sectionNumber = sectionMatch ? sectionMatch[1] : '';

    // Find pay items in this section
    let match;
    PATTERNS.payItem.lastIndex = 0;

    while ((match = PATTERNS.payItem.exec(section)) !== null) {
      const itemNumber = match[1];
      const description = match[2].trim();
      const unit = match[3].trim();

      // Skip if already seen
      if (seenItems.has(itemNumber)) continue;
      seenItems.add(itemNumber);

      // Derive section number from item number if not found
      const derivedSection = sectionNumber || itemNumber.slice(0, 3);

      payItems.push({
        itemNumber,
        description,
        unit,
        sectionNumber: derivedSection,
      });
    }
  }

  // Also try to find pay items in the general text
  let match;
  PATTERNS.payItem.lastIndex = 0;

  while ((match = PATTERNS.payItem.exec(text)) !== null) {
    const itemNumber = match[1];
    const description = match[2].trim();
    const unit = match[3].trim();

    if (!seenItems.has(itemNumber)) {
      seenItems.add(itemNumber);
      payItems.push({
        itemNumber,
        description,
        unit,
        sectionNumber: itemNumber.slice(0, 3),
      });
    }
  }

  return payItems.sort((a, b) => a.itemNumber.localeCompare(b.itemNumber));
}

function linkPayItemsToSections(sections: Section[], payItems: PayItem[]): void {
  for (const payItem of payItems) {
    const section = sections.find(s => s.sectionNumber === payItem.sectionNumber);
    if (section) {
      if (!section.relatedPayItems.includes(payItem.itemNumber)) {
        section.relatedPayItems.push(payItem.itemNumber);
      }
    }
  }
}
