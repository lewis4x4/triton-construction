import type { Section, Subsection, Chunk, ChunkType } from './types.js';

// Chunking configuration
const MAX_CHUNK_TOKENS = 400;
const MIN_CHUNK_TOKENS = 100;
const OVERLAP_TOKENS = 50;

// Keywords for chunk type classification
const CHUNK_TYPE_KEYWORDS: Record<ChunkType, string[]> = {
  SECTION_HEADER: ['description', 'scope', 'general'],
  REQUIREMENT: ['shall', 'must', 'required', 'minimum', 'maximum', 'not less than', 'not more than'],
  PROCEDURE: ['procedure', 'method', 'process', 'operation', 'construction', 'installation', 'placing'],
  MATERIAL_SPEC: ['material', 'aggregate', 'cement', 'concrete', 'steel', 'asphalt', 'specification'],
  MEASUREMENT: ['measurement', 'measured', 'quantity', 'pay quantity', 'square yard', 'linear foot', 'cubic yard'],
  PAYMENT: ['payment', 'paid', 'compensation', 'unit price', 'lump sum', 'pay item'],
  TABLE: ['table', 'tabulated'],
  REFERENCE: ['section', 'specification', 'aashto', 'astm', 'refer to'],
  DEFINITION: ['definition', 'defined as', 'means', 'term'],
};

// Simple token estimation (roughly 1.3 tokens per word)
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(w => w.length > 0).length * 1.3);
}

export function createChunks(sections: Section[], subsections: Subsection[]): Chunk[] {
  console.log('\nCreating chunks for AI retrieval...');

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  // Create chunks from sections (section header chunks)
  for (const section of sections) {
    // Create a header chunk for each section
    const headerContent = `Section ${section.sectionNumber} - ${section.title}\n\n${getFirstParagraph(section.fullText)}`;
    const headerChunk = createChunk(
      headerContent,
      section.sectionNumber,
      undefined,
      `Section ${section.sectionNumber} - ${section.title}`,
      chunkIndex++,
      section.relatedPayItems
    );
    chunks.push(headerChunk);
  }

  // Create chunks from subsections
  for (const subsection of subsections) {
    const section = sections.find(s => s.sectionNumber === subsection.sectionNumber);
    const sectionTitle = section?.title || '';
    const context = buildContext(subsection, sectionTitle);

    // Split subsection content into chunks if needed
    const subsectionChunks = splitIntoChunks(
      subsection.content,
      subsection.sectionNumber,
      subsection.subsectionNumber,
      context,
      chunkIndex,
      section?.relatedPayItems || []
    );

    for (const chunk of subsectionChunks) {
      chunks.push(chunk);
      chunkIndex++;
    }
  }

  console.log(`  Created ${chunks.length} chunks`);
  console.log(`  Average tokens per chunk: ${Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length)}`);

  return chunks;
}

function getFirstParagraph(text: string): string {
  // Get the first meaningful paragraph (skip the section header line)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
  return paragraphs[0]?.trim().slice(0, 500) || text.slice(0, 500);
}

function buildContext(subsection: Subsection, sectionTitle: string): string {
  const parts = [
    `Section ${subsection.sectionNumber}`,
    sectionTitle,
  ];

  if (subsection.subsectionNumber) {
    parts.push(subsection.subsectionNumber);
  }

  if (subsection.title) {
    parts.push(subsection.title);
  }

  return parts.join(' > ');
}

function splitIntoChunks(
  content: string,
  sectionNumber: string,
  subsectionNumber: string,
  context: string,
  startIndex: number,
  relatedPayItems: string[]
): Chunk[] {
  const chunks: Chunk[] = [];
  const tokens = estimateTokens(content);

  // If content is small enough, create a single chunk
  if (tokens <= MAX_CHUNK_TOKENS) {
    chunks.push(createChunk(
      content,
      sectionNumber,
      subsectionNumber,
      context,
      startIndex,
      relatedPayItems
    ));
    return chunks;
  }

  // Split by paragraphs
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  let currentChunk = '';
  let currentTokens = 0;
  let chunkNum = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // If paragraph alone exceeds max, split by sentences
    if (paragraphTokens > MAX_CHUNK_TOKENS) {
      // Flush current chunk first
      if (currentChunk.trim()) {
        chunks.push(createChunk(
          currentChunk.trim(),
          sectionNumber,
          subsectionNumber,
          context,
          startIndex + chunkNum,
          relatedPayItems
        ));
        chunkNum++;
        currentChunk = '';
        currentTokens = 0;
      }

      // Split large paragraph
      const sentenceChunks = splitBySentences(
        paragraph,
        sectionNumber,
        subsectionNumber,
        context,
        startIndex + chunkNum,
        relatedPayItems
      );
      chunks.push(...sentenceChunks);
      chunkNum += sentenceChunks.length;
      continue;
    }

    // Check if adding this paragraph would exceed max
    if (currentTokens + paragraphTokens > MAX_CHUNK_TOKENS && currentChunk.trim()) {
      // Save current chunk and start new one
      chunks.push(createChunk(
        currentChunk.trim(),
        sectionNumber,
        subsectionNumber,
        context,
        startIndex + chunkNum,
        relatedPayItems
      ));
      chunkNum++;

      // Start new chunk with overlap if possible
      const overlapText = getOverlapText(currentChunk, OVERLAP_TOKENS);
      currentChunk = overlapText + '\n\n' + paragraph;
      currentTokens = estimateTokens(currentChunk);
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokens += paragraphTokens;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim() && estimateTokens(currentChunk) >= MIN_CHUNK_TOKENS) {
    chunks.push(createChunk(
      currentChunk.trim(),
      sectionNumber,
      subsectionNumber,
      context,
      startIndex + chunkNum,
      relatedPayItems
    ));
  }

  return chunks;
}

function splitBySentences(
  text: string,
  sectionNumber: string,
  subsectionNumber: string,
  context: string,
  startIndex: number,
  relatedPayItems: string[]
): Chunk[] {
  const chunks: Chunk[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  let currentChunk = '';
  let currentTokens = 0;
  let chunkNum = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > MAX_CHUNK_TOKENS && currentChunk.trim()) {
      chunks.push(createChunk(
        currentChunk.trim(),
        sectionNumber,
        subsectionNumber,
        context,
        startIndex + chunkNum,
        relatedPayItems
      ));
      chunkNum++;
      currentChunk = sentence;
      currentTokens = sentenceTokens;
    } else {
      currentChunk += ' ' + sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk.trim() && estimateTokens(currentChunk) >= MIN_CHUNK_TOKENS) {
    chunks.push(createChunk(
      currentChunk.trim(),
      sectionNumber,
      subsectionNumber,
      context,
      startIndex + chunkNum,
      relatedPayItems
    ));
  }

  return chunks;
}

function getOverlapText(text: string, targetTokens: number): string {
  const words = text.split(/\s+/);
  const targetWords = Math.ceil(targetTokens / 1.3);
  const overlapWords = words.slice(-targetWords);
  return overlapWords.join(' ');
}

function createChunk(
  content: string,
  sectionNumber: string,
  subsectionNumber: string | undefined,
  context: string,
  chunkIndex: number,
  relatedPayItems: string[]
): Chunk {
  const cleanContent = content.trim();
  const tokenCount = estimateTokens(cleanContent);
  const chunkType = classifyChunkType(cleanContent, subsectionNumber);
  const keywords = extractKeywords(cleanContent);

  return {
    sectionNumber,
    subsectionNumber,
    sectionContext: context,
    content: cleanContent,
    chunkType,
    chunkIndex,
    tokenCount,
    payItemCodes: relatedPayItems,
    keywords,
  };
}

function classifyChunkType(content: string, subsectionNumber?: string): ChunkType {
  const lowerContent = content.toLowerCase();

  // Check for specific subsection patterns
  if (subsectionNumber) {
    const parts = subsectionNumber.split('.');
    const lastPart = parts[parts.length - 1];

    // Common subsection numbering conventions
    if (['1', '01'].includes(lastPart) || lowerContent.includes('description')) {
      return 'SECTION_HEADER';
    }
  }

  // Check for table content
  if (lowerContent.includes('table ') || /\|\s*\w+\s*\|/.test(content)) {
    return 'TABLE';
  }

  // Check for measurement section
  if (/method\s+of\s+measurement/i.test(content) ||
      (lowerContent.includes('measurement') && lowerContent.includes('paid'))) {
    return 'MEASUREMENT';
  }

  // Check for payment section
  if (/basis\s+of\s+payment/i.test(content) ||
      (lowerContent.includes('payment') && lowerContent.includes('contract unit price'))) {
    return 'PAYMENT';
  }

  // Score based on keyword frequency
  const scores: Record<ChunkType, number> = {
    SECTION_HEADER: 0,
    REQUIREMENT: 0,
    PROCEDURE: 0,
    MATERIAL_SPEC: 0,
    MEASUREMENT: 0,
    PAYMENT: 0,
    TABLE: 0,
    REFERENCE: 0,
    DEFINITION: 0,
  };

  for (const [type, keywords] of Object.entries(CHUNK_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      const matches = lowerContent.match(new RegExp(keyword, 'gi')) || [];
      scores[type as ChunkType] += matches.length;
    }
  }

  // Find highest scoring type
  let maxScore = 0;
  let bestType: ChunkType = 'REQUIREMENT';

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestType = type as ChunkType;
    }
  }

  return bestType;
}

function extractKeywords(content: string): string[] {
  const keywords: string[] = [];
  const lowerContent = content.toLowerCase();

  // Extract technical terms
  const technicalPatterns = [
    /class\s+[A-Z]\b/gi,                    // Class A, Class B, etc.
    /type\s+[A-Z0-9]+/gi,                   // Type I, Type II, etc.
    /grade\s+\d+/gi,                        // Grade 60, etc.
    /\d+\s*psi/gi,                          // 4000 psi, etc.
    /\d+(?:\.\d+)?\s*(?:inch|foot|feet|yard|mile)/gi,  // Measurements
    /AASHTO\s+[A-Z]\s*\d+/gi,               // AASHTO standards
    /ASTM\s+[A-Z]\d+/gi,                    // ASTM standards
  ];

  for (const pattern of technicalPatterns) {
    const matches = content.match(pattern) || [];
    for (const match of matches) {
      const normalized = match.toLowerCase().trim();
      if (!keywords.includes(normalized)) {
        keywords.push(normalized);
      }
    }
  }

  // Extract construction terms
  const constructionTerms = [
    'concrete', 'asphalt', 'aggregate', 'reinforcing', 'steel', 'timber',
    'curing', 'mixing', 'placing', 'finishing', 'testing', 'inspection',
    'excavation', 'embankment', 'grading', 'drainage', 'culvert', 'bridge',
    'guardrail', 'pavement', 'subgrade', 'base course', 'wearing course',
  ];

  for (const term of constructionTerms) {
    if (lowerContent.includes(term)) {
      keywords.push(term);
    }
  }

  return keywords.slice(0, 10); // Limit to 10 keywords
}
