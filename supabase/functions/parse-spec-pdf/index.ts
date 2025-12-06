import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseRequest {
  documentId: string;
  forceReprocess?: boolean;
  // Optional: Skip PDF upload and use these pre-processed Parseur document IDs directly
  parseurDocumentIds?: string[];
}

interface Division {
  divisionNumber: number;
  title: string;
  startPage?: number;
  endPage?: number;
}

interface Section {
  sectionNumber: string;
  title: string;
  divisionNumber: number;
  startPage?: number;
  endPage?: number;
  relatedPayItems: string[];
  fullText: string;
}

interface Subsection {
  subsectionNumber: string;
  title: string;
  content: string;
  hierarchyLevel: number;
  pageNumber?: number;
  crossReferences: string[];
}

interface Chunk {
  chunkType: string;
  content: string;
  sectionContext: string;
  payItemCodes: string[];
  keywords: string[];
  pageNumber?: number;
}

// WVDOH specification structure patterns
const DIVISION_PATTERN = /^DIVISION\s+(\d+)\s*[-–—]\s*(.+)$/im;
const SECTION_PATTERN = /^SECTION\s+(\d+)\s*[-–—]\s*(.+)$/im;
const SUBSECTION_PATTERN = /^(\d+\.\d+(?:\.\d+)*)\s+(.+)$/m;
const PAY_ITEM_PATTERN = /(\d{3}-\d{2}(?:-\d{2})?)/g;
const CROSS_REF_PATTERN = /(?:Section|Subsection)\s+(\d+(?:\.\d+)*)/gi;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for processing
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Parse request
    const { documentId, forceReprocess = false, parseurDocumentIds }: ParseRequest = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('spec_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already processed
    if (document.processing_status === 'COMPLETED' && !forceReprocess) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Document already processed',
          documentId: document.id,
          stats: {
            totalSections: document.total_sections,
            totalChunks: document.total_chunks,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to EXTRACTING
    await supabaseAdmin
      .from('spec_documents')
      .update({
        processing_status: 'EXTRACTING',
        processing_started_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq('id', documentId);

    let extractedText: string;

    // Option 1: If pre-processed Parseur document IDs are provided, fetch directly
    if (parseurDocumentIds && parseurDocumentIds.length > 0) {
      console.log('Fetching from pre-processed Parseur documents:', parseurDocumentIds);

      const parseurApiKey = Deno.env.get('PARSEUR_API_KEY');
      if (!parseurApiKey) {
        await updateProcessingError(supabaseAdmin, documentId, 'PARSEUR_API_KEY not configured');
        return new Response(
          JSON.stringify({ error: 'PARSEUR_API_KEY not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update status to PARSING
      await supabaseAdmin
        .from('spec_documents')
        .update({ processing_status: 'PARSING' })
        .eq('id', documentId);

      // Fetch content from each Parseur document
      const allContent: string[] = [];
      for (const parseurDocId of parseurDocumentIds) {
        const response = await fetch(
          `https://api.parseur.com/document/${parseurDocId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Token ${parseurApiKey}`,
            },
          }
        );

        if (!response.ok) {
          console.error(`Failed to fetch Parseur document ${parseurDocId}:`, response.status);
          continue;
        }

        const docData = await response.json();
        if (docData.status !== 'PARSEDOK') {
          console.error(`Parseur document ${parseurDocId} not ready:`, docData.status);
          await updateProcessingError(supabaseAdmin, documentId, `Parseur document ${parseurDocId} status: ${docData.status}`);
          return new Response(
            JSON.stringify({ error: `Parseur document ${parseurDocId} not ready (status: ${docData.status})` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get content, trying multiple fields
        let content = docData.content;
        if ((!content || content.startsWith('<!--')) && docData.result) {
          try {
            const resultObj = typeof docData.result === 'string'
              ? JSON.parse(docData.result)
              : docData.result;
            content = resultObj.TextDocument || resultObj.text_document || content;
          } catch (e) {
            console.log('Could not parse result field:', e);
          }
        }

        // Clean up HTML artifacts
        if (content && content.startsWith('<!--')) {
          const cleanStart = content.indexOf('\n');
          if (cleanStart > 0) {
            content = content.substring(cleanStart + 1);
          }
        }

        if (content) {
          console.log(`Document ${parseurDocId}: ${content.length} characters`);
          allContent.push(content);
        }
      }

      if (allContent.length === 0) {
        await updateProcessingError(supabaseAdmin, documentId, 'No content retrieved from Parseur documents');
        return new Response(
          JSON.stringify({ error: 'No content retrieved from Parseur documents' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      extractedText = allContent.join('\n\n');
      console.log(`Total extracted text: ${extractedText.length} characters from ${allContent.length} documents`);

    } else {
      // Option 2: Download PDF and extract via Parseur/Azure
      // Get PDF content from storage
      const { data: fileData, error: fileError } = await supabaseAdmin.storage
        .from('spec-documents')
        .download(document.source_file_path);

      if (fileError || !fileData) {
        await updateProcessingError(supabaseAdmin, documentId, `Failed to download file: ${fileError?.message}`);
        return new Response(
          JSON.stringify({ error: 'Failed to download specification file' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update status to PARSING
      await supabaseAdmin
        .from('spec_documents')
        .update({ processing_status: 'PARSING' })
        .eq('id', documentId);

      // Extract text from PDF using external service
      const pdfArrayBuffer = await fileData.arrayBuffer();
      console.log('Downloaded PDF, size:', pdfArrayBuffer.byteLength);

      const extractResult = await extractPdfText(pdfArrayBuffer);

      if (!extractResult.text) {
        const errorMsg = extractResult.error || 'Failed to extract text from PDF';
        await updateProcessingError(supabaseAdmin, documentId, errorMsg);
        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      extractedText = extractResult.text;
    }

    // Parse document structure
    const { divisions, sections, subsections } = parseDocumentStructure(extractedText);

    // Clear existing data if reprocessing
    if (forceReprocess) {
      await supabaseAdmin.from('spec_chunks').delete().eq('document_id', documentId);
      await supabaseAdmin.from('spec_subsections').delete().match({ section_id: { in: sections.map(s => s.sectionNumber) } });
      await supabaseAdmin.from('spec_sections').delete().eq('document_id', documentId);
      await supabaseAdmin.from('spec_divisions').delete().eq('document_id', documentId);
    }

    // Insert divisions
    const divisionRecords = [];
    for (const div of divisions) {
      const { data: divRecord, error: divError } = await supabaseAdmin
        .from('spec_divisions')
        .insert({
          document_id: documentId,
          division_number: div.divisionNumber,
          title: div.title,
          start_page: div.startPage,
          end_page: div.endPage,
          sort_order: div.divisionNumber,
        })
        .select()
        .single();

      if (divError) {
        console.error('Failed to insert division:', divError);
        continue;
      }
      divisionRecords.push(divRecord);
    }

    // Insert sections
    const sectionRecords = [];
    for (const section of sections) {
      const divRecord = divisionRecords.find(d => d.division_number === section.divisionNumber);
      if (!divRecord) continue;

      const { data: secRecord, error: secError } = await supabaseAdmin
        .from('spec_sections')
        .insert({
          document_id: documentId,
          division_id: divRecord.id,
          section_number: section.sectionNumber,
          title: section.title,
          start_page: section.startPage,
          end_page: section.endPage,
          related_pay_items: section.relatedPayItems,
          full_text: section.fullText,
          sort_order: parseInt(section.sectionNumber),
        })
        .select()
        .single();

      if (secError) {
        console.error('Failed to insert section:', secError);
        continue;
      }
      sectionRecords.push({ ...secRecord, subsections: subsections.filter(ss => ss.subsectionNumber.startsWith(section.sectionNumber)) });
    }

    // Insert subsections
    for (const secRecord of sectionRecords) {
      for (const subsection of secRecord.subsections) {
        await supabaseAdmin
          .from('spec_subsections')
          .insert({
            section_id: secRecord.id,
            subsection_number: subsection.subsectionNumber,
            title: subsection.title,
            content: subsection.content,
            hierarchy_level: subsection.hierarchyLevel,
            page_number: subsection.pageNumber,
            cross_references: subsection.crossReferences,
            sort_order: parseSubsectionOrder(subsection.subsectionNumber),
          });
      }
    }

    // Update status to CHUNKING
    await supabaseAdmin
      .from('spec_documents')
      .update({ processing_status: 'CHUNKING' })
      .eq('id', documentId);

    // Create chunks for semantic search
    let chunkIndex = 0;
    for (const secRecord of sectionRecords) {
      const chunks = createChunks(secRecord, secRecord.subsections);

      for (const chunk of chunks) {
        await supabaseAdmin
          .from('spec_chunks')
          .insert({
            document_id: documentId,
            section_id: secRecord.id,
            chunk_type: chunk.chunkType,
            chunk_index: chunkIndex++,
            content: chunk.content,
            section_context: chunk.sectionContext,
            pay_item_codes: chunk.payItemCodes,
            keywords: chunk.keywords,
            page_number: chunk.pageNumber,
            content_tokens: estimateTokenCount(chunk.content),
          });
      }
    }

    // Update document statistics
    await supabaseAdmin.rpc('update_document_statistics', { p_document_id: documentId });

    // Update status to COMPLETED (embeddings will be generated separately)
    await supabaseAdmin
      .from('spec_documents')
      .update({
        processing_status: 'COMPLETED',
        processing_completed_at: new Date().toISOString(),
        total_pages: extractedText.split('\f').length, // Form feed as page separator
      })
      .eq('id', documentId);

    // Get final statistics
    const { data: finalDoc } = await supabaseAdmin
      .from('spec_documents')
      .select('total_sections, total_chunks')
      .eq('id', documentId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document parsed successfully',
        documentId: documentId,
        stats: {
          divisions: divisionRecords.length,
          sections: sectionRecords.length,
          totalSections: finalDoc?.total_sections || 0,
          totalChunks: finalDoc?.total_chunks || 0,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred during parsing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to update processing error
async function updateProcessingError(supabase: ReturnType<typeof createClient>, documentId: string, errorMessage: string) {
  await supabase
    .from('spec_documents')
    .update({
      processing_status: 'FAILED',
      processing_error: errorMessage,
    })
    .eq('id', documentId);
}

// Extract text from PDF with detailed error reporting
async function extractPdfText(pdfArrayBuffer: ArrayBuffer): Promise<{ text: string | null; error?: string }> {
  try {
    console.log('PDF size:', pdfArrayBuffer.byteLength, 'bytes');

    // Try Parseur first (no file size limits)
    const parseurApiKey = Deno.env.get('PARSEUR_API_KEY');
    const parseurMailboxId = Deno.env.get('PARSEUR_MAILBOX_ID');

    console.log('Parseur API key exists:', !!parseurApiKey, parseurApiKey ? `(${parseurApiKey.substring(0, 10)}...)` : '');
    console.log('Parseur mailbox ID:', parseurMailboxId || '(not set)');

    if (parseurApiKey && parseurMailboxId) {
      const result = await extractWithParseur(pdfArrayBuffer, parseurApiKey, parseurMailboxId);
      if (result.text) {
        return result;
      }
      // Don't fall back to Azure, return the Parseur error
      console.log('Parseur failed:', result.error);
      return result;
    } else {
      console.log('Parseur not configured, trying Azure');
    }

    // Fallback to Azure Document Intelligence
    const azureEndpoint = Deno.env.get('AZURE_DOCUMENT_AI_ENDPOINT');
    const azureKey = Deno.env.get('AZURE_DOCUMENT_AI_KEY');

    console.log('Azure endpoint configured:', !!azureEndpoint);
    console.log('Azure key configured:', !!azureKey);

    if (azureEndpoint && azureKey) {
      const result = await extractWithAzure(pdfArrayBuffer, azureEndpoint, azureKey);
      return result;
    }

    return { text: null, error: 'No document AI service configured (need PARSEUR or AZURE credentials)' };

  } catch (error) {
    console.error('PDF extraction error:', error);
    return { text: null, error: `Exception: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Extract text using Parseur.com
async function extractWithParseur(
  pdfArrayBuffer: ArrayBuffer,
  apiKey: string,
  mailboxId: string
): Promise<{ text: string | null; error?: string }> {
  try {
    console.log('Uploading to Parseur mailbox:', mailboxId);

    // Create form data with the PDF file
    const formData = new FormData();
    const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    formData.append('file', blob, 'document.pdf');

    // Upload document to Parseur
    // API requires "Token <key>" format: https://developer.parseur.com/authentication
    const uploadResponse = await fetch(
      `https://api.parseur.com/parser/${mailboxId}/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
        },
        body: formData,
      }
    );

    console.log('Parseur upload status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Parseur upload error:', errorText);
      return { text: null, error: `Parseur upload failed: ${uploadResponse.status} - ${errorText.substring(0, 200)}` };
    }

    const uploadResult = await uploadResponse.json();
    console.log('Parseur upload response:', JSON.stringify(uploadResult));

    // Parseur returns: { message: "OK", attachments: [{ name: "...", DocumentID: "..." }] }
    // Note: Large PDFs get split into multiple attachments (e.g., pages 1-500, 501-1000, etc.)
    const attachments = uploadResult.attachments || [];

    if (attachments.length === 0) {
      return { text: null, error: `No attachments in Parseur response: ${JSON.stringify(uploadResult)}` };
    }

    console.log(`Parseur created ${attachments.length} document(s):`, attachments.map((a: { name: string; DocumentID: string }) => a.name));

    // Wait for ALL attachments to complete processing
    const maxAttempts = 300; // 5 minutes max for large multi-part PDFs
    const allDocumentData: Array<{ id: string; status: string; content?: string; result?: string }> = [];

    for (const attachment of attachments) {
      const documentId = attachment.DocumentID;
      if (!documentId) {
        console.log('Skipping attachment without DocumentID:', attachment);
        continue;
      }

      console.log(`Polling for document ${documentId} (${attachment.name})`);
      let attempts = 0;
      let documentData = null;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls

        const statusResponse = await fetch(
          `https://api.parseur.com/document/${documentId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Token ${apiKey}`,
            },
          }
        );

        if (!statusResponse.ok) {
          console.error('Parseur status check error:', statusResponse.status);
          attempts++;
          continue;
        }

        documentData = await statusResponse.json();

        // Only log every 10th attempt to reduce noise
        if (attempts % 10 === 0) {
          console.log(`Document ${documentId} poll attempt ${attempts + 1}:`, documentData.status);
        }

        // Check status - PARSEDOK means successfully processed
        if (documentData.status === 'PARSEDOK') {
          console.log(`Document ${documentId} completed successfully`);
          break;
        } else if (documentData.status === 'QUOTAEXC') {
          return { text: null, error: 'Parseur quota exceeded' };
        } else if (documentData.status === 'SKIPPED') {
          return { text: null, error: 'Parseur skipped document (template issue)' };
        }

        attempts++;
      }

      if (!documentData || documentData.status !== 'PARSEDOK') {
        return { text: null, error: `Parseur timed out waiting for document ${documentId} after ${attempts * 2} seconds` };
      }

      allDocumentData.push(documentData);
    }

    // Combine text content from all document parts
    // Sort by name to ensure correct page order
    allDocumentData.sort((a, b) => {
      const nameA = (a as { name?: string }).name || '';
      const nameB = (b as { name?: string }).name || '';
      return nameA.localeCompare(nameB);
    });

    let fullText = '';
    for (const docData of allDocumentData) {
      // Get the text content from 'content' or 'result.TextDocument'
      let textContent = docData.content;

      // Try parsing the result field if content is empty or has HTML artifacts
      if ((!textContent || textContent.startsWith('<!--')) && docData.result) {
        try {
          const resultObj = typeof docData.result === 'string'
            ? JSON.parse(docData.result)
            : docData.result;
          textContent = resultObj.TextDocument || resultObj.text_document || textContent;
        } catch (e) {
          console.log('Could not parse result field:', e);
        }
      }

      // Clean up any HTML artifacts from Parseur
      if (textContent && textContent.startsWith('<!--')) {
        const cleanStart = textContent.indexOf('\n');
        if (cleanStart > 0) {
          textContent = textContent.substring(cleanStart + 1);
        }
      }

      if (textContent) {
        fullText += textContent + '\n\n';
      }
    }

    if (!fullText.trim()) {
      return { text: null, error: 'No text content in any Parseur document parts' };
    }

    console.log('Parseur extracted total text length:', fullText.length, 'from', allDocumentData.length, 'parts');
    return { text: fullText.trim() };

  } catch (error) {
    console.error('Parseur extraction error:', error);
    return { text: null, error: `Parseur exception: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Extract text using Azure Document Intelligence (Form Recognizer)
async function extractWithAzure(
  pdfArrayBuffer: ArrayBuffer,
  endpoint: string,
  apiKey: string
): Promise<{ text: string | null; error?: string }> {
  try {
    // Use the prebuilt-read model for general document text extraction
    const analyzeUrl = `${endpoint.replace(/\/$/, '')}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;

    console.log('Azure analyze URL:', analyzeUrl);

    // Submit document for analysis
    const submitResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      body: pdfArrayBuffer,
    });

    console.log('Azure submit status:', submitResponse.status);

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Azure submit error:', submitResponse.status, errorText);
      return { text: null, error: `Azure submit failed: ${submitResponse.status} - ${errorText.substring(0, 200)}` };
    }

    // Get the operation location for polling
    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) {
      console.error('No operation location returned from Azure');
      return { text: null, error: 'No operation location in Azure response' };
    }

    console.log('Azure operation location:', operationLocation);

    // Poll for results (Azure processes asynchronously)
    let result = null;
    let attempts = 0;
    const maxAttempts = 120; // Max 2 minutes wait for large PDFs

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const pollResponse = await fetch(operationLocation, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        },
      });

      if (!pollResponse.ok) {
        console.error('Azure poll error:', pollResponse.status);
        return { text: null, error: `Azure poll failed: ${pollResponse.status}` };
      }

      result = await pollResponse.json();
      console.log(`Azure poll attempt ${attempts + 1}:`, result.status);

      if (result.status === 'succeeded') {
        break;
      } else if (result.status === 'failed') {
        console.error('Azure analysis failed:', result.error);
        return { text: null, error: `Azure analysis failed: ${JSON.stringify(result.error || 'unknown')}` };
      }

      attempts++;
    }

    if (!result || result.status !== 'succeeded') {
      console.error('Azure analysis timed out after', attempts, 'attempts');
      return { text: null, error: `Azure timed out after ${attempts} seconds` };
    }

    // Extract text content from the result
    const analyzeResult = result.analyzeResult;
    if (!analyzeResult) {
      return { text: null, error: 'No analyzeResult in Azure response' };
    }

    console.log('Azure returned', analyzeResult.pages?.length || 0, 'pages');

    // Combine all page content with page separators
    let fullText = '';
    if (analyzeResult.pages) {
      for (const page of analyzeResult.pages) {
        // Get lines for this page
        const pageLines = (analyzeResult.paragraphs || [])
          .filter((p: { boundingRegions?: Array<{ pageNumber: number }> }) =>
            p.boundingRegions?.some(r => r.pageNumber === page.pageNumber)
          )
          .map((p: { content: string }) => p.content)
          .join('\n');

        fullText += pageLines + '\f'; // Form feed as page separator
      }
    } else if (analyzeResult.content) {
      // Fallback to raw content
      fullText = analyzeResult.content;
    }

    const trimmedText = fullText.trim();
    if (!trimmedText) {
      return { text: null, error: 'Azure returned empty text' };
    }

    console.log('Extracted text length:', trimmedText.length);
    return { text: trimmedText };

  } catch (error) {
    console.error('Azure extraction error:', error);
    return { text: null, error: `Azure exception: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Parse document structure from extracted text
function parseDocumentStructure(text: string): {
  divisions: Division[];
  sections: Section[];
  subsections: Subsection[];
} {
  const divisions: Division[] = [];
  const sections: Section[] = [];
  const subsections: Subsection[] = [];

  const lines = text.split('\n');
  let currentDivision: Division | null = null;
  let currentSection: Section | null = null;
  let currentSubsection: Subsection | null = null;
  let pageNumber = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track page breaks (form feed character)
    if (line.includes('\f')) {
      pageNumber++;
      continue;
    }

    // Check for division header
    const divMatch = line.match(DIVISION_PATTERN);
    if (divMatch) {
      currentDivision = {
        divisionNumber: parseInt(divMatch[1]),
        title: divMatch[2].trim(),
        startPage: pageNumber,
      };
      divisions.push(currentDivision);
      continue;
    }

    // Check for section header
    const secMatch = line.match(SECTION_PATTERN);
    if (secMatch && currentDivision) {
      // Close previous section
      if (currentSection) {
        currentSection.endPage = pageNumber - 1;
      }

      currentSection = {
        sectionNumber: secMatch[1],
        title: secMatch[2].trim(),
        divisionNumber: currentDivision.divisionNumber,
        startPage: pageNumber,
        relatedPayItems: [],
        fullText: '',
      };
      sections.push(currentSection);
      continue;
    }

    // Check for subsection
    const subMatch = line.match(SUBSECTION_PATTERN);
    if (subMatch && currentSection) {
      // Calculate hierarchy level from dots in number
      const level = (subMatch[1].match(/\./g) || []).length;

      currentSubsection = {
        subsectionNumber: subMatch[1],
        title: subMatch[2].trim(),
        content: '',
        hierarchyLevel: level,
        pageNumber: pageNumber,
        crossReferences: [],
      };
      subsections.push(currentSubsection);
      continue;
    }

    // Accumulate content
    if (currentSubsection && line) {
      currentSubsection.content += (currentSubsection.content ? '\n' : '') + line;

      // Extract cross-references
      const refs = line.matchAll(CROSS_REF_PATTERN);
      for (const ref of refs) {
        if (!currentSubsection.crossReferences.includes(ref[1])) {
          currentSubsection.crossReferences.push(ref[1]);
        }
      }
    }

    // Accumulate full text for section
    if (currentSection && line) {
      currentSection.fullText += (currentSection.fullText ? '\n' : '') + line;

      // Extract pay items
      const payItems = line.matchAll(PAY_ITEM_PATTERN);
      for (const item of payItems) {
        if (!currentSection.relatedPayItems.includes(item[1])) {
          currentSection.relatedPayItems.push(item[1]);
        }
      }
    }
  }

  // Close last section
  if (currentSection) {
    currentSection.endPage = pageNumber;
  }
  if (currentDivision) {
    currentDivision.endPage = pageNumber;
  }

  return { divisions, sections, subsections };
}

// Create chunks for semantic search
function createChunks(section: Section, subsections: Subsection[]): Chunk[] {
  const chunks: Chunk[] = [];
  const MAX_CHUNK_SIZE = 500; // tokens

  // Create section header chunk
  chunks.push({
    chunkType: 'SECTION_HEADER',
    content: `Section ${section.sectionNumber} - ${section.title}`,
    sectionContext: `Section ${section.sectionNumber} - ${section.title}`,
    payItemCodes: section.relatedPayItems,
    keywords: extractKeywords(section.title),
    pageNumber: section.startPage,
  });

  // Create chunks from subsections
  for (const subsection of subsections) {
    const chunkType = determineChunkType(subsection);
    const content = subsection.content;

    // Split large content into smaller chunks
    if (estimateTokenCount(content) > MAX_CHUNK_SIZE) {
      const paragraphs = content.split(/\n\n+/);
      let currentChunk = '';

      for (const para of paragraphs) {
        if (estimateTokenCount(currentChunk + '\n\n' + para) > MAX_CHUNK_SIZE && currentChunk) {
          chunks.push({
            chunkType,
            content: currentChunk.trim(),
            sectionContext: `Section ${section.sectionNumber} > ${subsection.subsectionNumber} ${subsection.title}`,
            payItemCodes: extractPayItems(currentChunk),
            keywords: extractKeywords(currentChunk),
            pageNumber: subsection.pageNumber,
          });
          currentChunk = para;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
      }

      // Add remaining content
      if (currentChunk.trim()) {
        chunks.push({
          chunkType,
          content: currentChunk.trim(),
          sectionContext: `Section ${section.sectionNumber} > ${subsection.subsectionNumber} ${subsection.title}`,
          payItemCodes: extractPayItems(currentChunk),
          keywords: extractKeywords(currentChunk),
          pageNumber: subsection.pageNumber,
        });
      }
    } else {
      chunks.push({
        chunkType,
        content: content.trim(),
        sectionContext: `Section ${section.sectionNumber} > ${subsection.subsectionNumber} ${subsection.title}`,
        payItemCodes: extractPayItems(content),
        keywords: extractKeywords(content),
        pageNumber: subsection.pageNumber,
      });
    }
  }

  return chunks;
}

// Determine chunk type based on content
function determineChunkType(subsection: Subsection): string {
  const title = subsection.title.toLowerCase();
  const content = subsection.content.toLowerCase();

  if (title.includes('measurement') || content.includes('measured by') || content.includes('basis of measurement')) {
    return 'MEASUREMENT';
  }
  if (title.includes('payment') || content.includes('paid for') || content.includes('basis of payment')) {
    return 'PAYMENT';
  }
  if (title.includes('material') || content.includes('materials shall') || content.includes('material requirements')) {
    return 'MATERIAL_SPEC';
  }
  if (title.includes('construction') || title.includes('procedure') || content.includes('shall be constructed')) {
    return 'PROCEDURE';
  }
  if (title.includes('definition') || content.includes('is defined as')) {
    return 'DEFINITION';
  }
  if (content.includes('shall') || content.includes('must') || content.includes('required')) {
    return 'REQUIREMENT';
  }

  return 'REQUIREMENT';
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
  // Simple keyword extraction - in production, use NLP
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall']);

  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  // Count frequency and return top keywords
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// Extract pay items from text
function extractPayItems(text: string): string[] {
  const items: string[] = [];
  const matches = text.matchAll(PAY_ITEM_PATTERN);
  for (const match of matches) {
    if (!items.includes(match[1])) {
      items.push(match[1]);
    }
  }
  return items;
}

// Estimate token count (rough approximation)
function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

// Parse subsection number for ordering
function parseSubsectionOrder(subsectionNumber: string): number {
  const parts = subsectionNumber.split('.');
  let order = 0;
  for (let i = 0; i < parts.length; i++) {
    order = order * 100 + parseInt(parts[i] || '0');
  }
  return order;
}
