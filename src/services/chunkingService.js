const config = require('../config/config');
const logger = require('../utils/logger');

class ChunkingService {
  constructor() {
    this.chunkSize = config.chunking.chunkSize || 200;  // words
    this.chunkOverlap = config.chunking.chunkOverlap || 50; // words
    this.maxChunkSize = config.chunking.maxChunkSize || 300; // words
  }

  /**
   * Create intelligent chunks with semantic awareness
   */
  createChunks(text, sections, paperId) {
    try {
      logger.info(`📝 Creating chunks for paper ${paperId}`);
      
      const chunks = [];
      const lines = text.split('\n');
      
      // Process each section separately
      sections.forEach((section, sectionIndex) => {
        const sectionLines = lines.slice(section.startLine, section.endLine + 1);
        const sectionText = sectionLines.join('\n').trim();
        
        if (sectionText.length === 0) return;
        
        // Estimate pages for this section (more accurate)
        const sectionPage = this.estimatePageNumber(section.startLine, lines.length, sectionLines.length);
        
        // Split into paragraphs first for better semantic chunks
        const paragraphs = this.splitIntoParagraphs(sectionText);
        
        const sectionChunks = this.createSemanticChunks(
          paragraphs,
          section.name,
          sectionPage,
          paperId
        );
        
        chunks.push(...sectionChunks);
      });

      logger.info(`✅ Created ${chunks.length} chunks`);
      return chunks;

    } catch (error) {
      logger.error(`❌ Error creating chunks: ${error.message}`);
      throw error;
    }
  }

  /**
   * Split text into meaningful paragraphs
   */
  splitIntoParagraphs(text) {
    // Split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    
    // If no clear paragraphs, split by single newlines
    if (paragraphs.length <= 1) {
      return text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }
    
    return paragraphs;
  }

  /**
   * Create chunks that respect semantic boundaries
   */
  createSemanticChunks(paragraphs, sectionName, startPage, paperId) {
    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;
    let chunkIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paragraphWords = paragraph.split(/\s+/).length;

      // If adding this paragraph would exceed max size and we have content
      if (currentWordCount + paragraphWords > this.maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push(this.createChunkObject(
          currentChunk.join('\n\n'),
          sectionName,
          startPage + this.estimatePageOffset(chunkIndex),
          chunkIndex,
          paperId
        ));
        
        chunkIndex++;
        
        // Create overlap from the end of current chunk
        const overlapText = this.createOverlap(currentChunk);
        currentChunk = overlapText ? [overlapText, paragraph] : [paragraph];
        currentWordCount = this.countWords(currentChunk.join(' '));
      } else {
        // Add paragraph to current chunk
        currentChunk.push(paragraph);
        currentWordCount += paragraphWords;
      }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push(this.createChunkObject(
        currentChunk.join('\n\n'),
        sectionName,
        startPage + this.estimatePageOffset(chunkIndex),
        chunkIndex,
        paperId
      ));
    }

    return chunks;
  }

  /**
   * Create overlap text from previous chunks
   */
  createOverlap(paragraphs) {
    if (paragraphs.length === 0) return null;
    
    const overlapSentences = [];
    let overlapWordCount = 0;
    
    // Take sentences from the last paragraph for overlap
    const lastParagraph = paragraphs[paragraphs.length - 1];
    const sentences = this.splitIntoSentences(lastParagraph);
    
    // Add sentences until we reach desired overlap
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i];
      const sentenceWords = sentence.split(/\s+/).length;
      
      if (overlapWordCount + sentenceWords <= this.chunkOverlap) {
        overlapSentences.unshift(sentence);
        overlapWordCount += sentenceWords;
      } else {
        break;
      }
    }
    
    return overlapSentences.join(' ');
  }

  /**
   * Split text into sentences (improved for academic text)
   */
  splitIntoSentences(text) {
    // Handle academic abbreviations that end with periods
    const abbreviations = ['et al', 'e.g', 'i.e', 'etc', 'vs', 'fig', 'eq', 'ref'];
    const abbreviationPattern = new RegExp(`\\b(${abbreviations.join('|')})\\.`, 'gi');
    
    // Temporarily replace abbreviation periods
    let processedText = text;
    const abbreviationMap = {};
    abbreviations.forEach((abbr, index) => {
      const placeholder = `ABBR${index}`;
      const regex = new RegExp(`\\b${abbr}\\.`, 'gi');
      processedText = processedText.replace(regex, placeholder);
      abbreviationMap[placeholder] = `${abbr}.`;
    });

    // Split sentences
    const sentences = processedText
      .split(/(?<=[.!?])\s+(?=[A-Z])/) // Split at sentence boundaries
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Restore abbreviations
    return sentences.map(sentence => {
      let restored = sentence;
      Object.entries(abbreviationMap).forEach(([placeholder, original]) => {
        restored = restored.replace(new RegExp(placeholder, 'g'), original);
      });
      return restored;
    });
  }

  /**
   * Estimate page number based on line position
   */
  estimatePageNumber(startLine, totalLines, sectionLines) {
    // Rough estimation: assume ~50 lines per page for academic papers
    const linesPerPage = 50;
    return Math.max(1, Math.floor(startLine / linesPerPage) + 1);
  }

  /**
   * Estimate page offset for chunks within a section
   */
  estimatePageOffset(chunkIndex) {
    // Each chunk roughly adds 0.2 pages (adjust based on your needs)
    return Math.floor(chunkIndex * 0.2);
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Create chunk object with better metadata
   */
  createChunkObject(text, sectionName, page, chunkIndex, paperId) {
    const wordCount = this.countWords(text);
    const charCount = text.length;

    return {
      id: `${paperId}-${sectionName}-${chunkIndex}`.toLowerCase().replace(/\s+/g, '-'),
      text: text.trim(),
      section: sectionName,
      chunkIndex,
      page: Math.max(1, page),
      wordCount,
      charCount,
      paperId,
      // Additional metadata for RAG
      hasCitations: /\[\d+\]|\(\d{4}\)/.test(text), // Check if contains citations
      hasEquations: /\$.*\$|\\[\[\]\(\)]|equation/.test(text), // Check if contains equations
      contentType: this.detectContentType(text)
    };
  }

  /**
   * Detect the type of content in chunk
   */
  detectContentType(text) {
    if (text.match(/abstract|summary/i)) return 'abstract';
    if (text.match(/introduction|background/i)) return 'introduction';
    if (text.match(/method|experiment|procedure/i)) return 'methodology';
    if (text.match(/result|finding|table|figure/i)) return 'results';
    if (text.match(/discussion|analysis|interpretation/i)) return 'discussion';
    if (text.match(/conclusion|summary|future work/i)) return 'conclusion';
    if (text.match(/reference|bibliography/i)) return 'references';
    return 'content';
  }

  /**
   * Validate chunk quality (improved)
   */
  validateChunk(chunk) {
    const minWords = 20;    // Reduced for academic text (may have equations, etc.)
    const maxWords = 500;   // Increased for academic paragraphs
    const minChars = 100;   // Reduced minimum characters
    
    return (
      chunk.text &&
      chunk.text.length >= minChars &&
      chunk.wordCount >= minWords &&
      chunk.wordCount <= maxWords &&
      !this.isLowQualityChunk(chunk.text)
    );
  }

  /**
   * Check if chunk is low quality (mostly references, equations only, etc.)
   */
  isLowQualityChunk(text) {
    // Mostly references/citations
    if (text.match(/^(\[\d+\][^a-z]*)+$/i)) return true;
    
    // Mostly equations/math
    if (text.replace(/[^a-z]/gi, '').length < text.length * 0.1) return true;
    
    // Mostly numbers or special characters
    if (text.replace(/[^0-9\s]/g, '').length > text.length * 0.7) return true;
    
    return false;
  }

  /**
   * Get chunking statistics
   */
  getChunkingStats(chunks) {
    const stats = {
      totalChunks: chunks.length,
      totalWords: 0,
      totalChars: 0,
      avgWordsPerChunk: 0,
      avgCharsPerChunk: 0,
      sectionDistribution: {},
      contentTypes: {}
    };

    chunks.forEach(chunk => {
      stats.totalWords += chunk.wordCount;
      stats.totalChars += chunk.charCount;
      
      // Section distribution
      stats.sectionDistribution[chunk.section] = 
        (stats.sectionDistribution[chunk.section] || 0) + 1;
      
      // Content type distribution
      stats.contentTypes[chunk.contentType] = 
        (stats.contentTypes[chunk.contentType] || 0) + 1;
    });

    if (chunks.length > 0) {
      stats.avgWordsPerChunk = Math.round(stats.totalWords / chunks.length);
      stats.avgCharsPerChunk = Math.round(stats.totalChars / chunks.length);
    }

    return stats;
  }

  /**
   * Fallback method for problematic PDFs
   */
  createSimpleChunks(text, paperId) {
    // Your existing method is fine as fallback
    const chunks = [];
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i += this.chunkSize - this.chunkOverlap) {
      const chunkWords = words.slice(i, i + this.chunkSize);
      if (chunkWords.length > 0) {
        chunks.push({
          text: chunkWords.join(' '),
          section: 'Content',
          chunkIndex: chunks.length,
          page: Math.floor(chunks.length / 3) + 1, // Rough estimate
          wordCount: chunkWords.length,
          charCount: chunkWords.join(' ').length,
          paperId,
          contentType: 'content'
        });
      }
    }
    
    return chunks;
  }
}

module.exports = new ChunkingService();