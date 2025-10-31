const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');
const giminiService = require('./giminiService');

class PDFProcessor {
  /**
   * Extract and process PDF - FULLY AUTOMATED using gimini LLM
   * gimini extracts: title, authors, year, abstract, AND sections
   * @param {String} filePath - Path to PDF file
   * @returns {Object} Extracted and structured data
   */
  async extractFromPDF(filePath) {
    try {
      logger.info(`📄 Processing PDF: ${filePath}`);
      
      // Step 1: Extract raw text from PDF (all pages)
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer, { max: 0 });
      
      // Step 2: Clean the text
      const cleanedText = this.cleanText(data.text);
      
      logger.info(`📝 Extracted ${data.numpages} pages, ${cleanedText.length} characters`);
      
      // Step 3: Use gimini to extract EVERYTHING - metadata AND sections
      // This is more reliable than regex patterns
      const extracted = await giminiService.extractMetadataAndSections(cleanedText);
      
      // Step 4: Convert gimini sections to our format with line numbers
      const sections = this.processSections(extracted.sections, cleanedText);
      
      logger.info(`✅ PDF processed: "${extracted.title}" by ${extracted.authors.join(', ')}`);
      logger.info(`📑 Sections found: ${sections.map(s => s.name).join(', ')}`);

      return {
        // Metadata extracted by gimini
        title: extracted.title,
        authors: extracted.authors,
        year: extracted.year,
        abstract: extracted.abstract,
        
        // PDF structure
        totalPages: data.numpages,
        fullText: cleanedText,
        sections, // Processed sections with line numbers
        
        // Additional info
        metadata: {
          textLength: cleanedText.length,
          wordCount: cleanedText.split(/\s+/).length,
          extractedBy: 'gimini-llm'
        }
      };

    } catch (error) {
      logger.error(`❌ Error processing PDF: ${error.message}`);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Process sections from gimini and add line number information
   */
  processSections(giminiSections, fullText) {
    if (!giminiSections || giminiSections.length === 0) {
      // Fallback: treat entire text as one section
      const lines = fullText.split('\n');
      return [{
        name: 'Full Text',
        startLine: 0,
        endLine: lines.length - 1,
        lineCount: lines.length,
        sectionIndex: 0
      }];
    }

    const lines = fullText.split('\n');
    const processedSections = [];
    
    giminiSections.forEach((section, idx) => {
      // Find where this section appears in the full text
      const sectionText = section.content || '';
      
      if (sectionText.length > 0) {
        // Find the section in full text
        const firstLine = sectionText.split('\n')[0].trim();
        let startLine = 0;
        let endLine = lines.length - 1;
        
        // Try to find start line
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(firstLine.substring(0, 50))) {
            startLine = i;
            break;
          }
        }
        
        // Estimate end line based on section length
        const sectionLines = sectionText.split('\n').length;
        endLine = Math.min(startLine + sectionLines, lines.length - 1);
        
        processedSections.push({
          name: section.name,
          startLine,
          endLine,
          lineCount: endLine - startLine + 1,
          sectionIndex: idx,
          header: section.name
        });
      } else {
        // Section with no content
        processedSections.push({
          name: section.name,
          startLine: 0,
          endLine: 0,
          lineCount: 0,
          sectionIndex: idx,
          header: section.name
        });
      }
    });

    return processedSections.filter(s => s.lineCount > 0);
  }

  /**
   * Clean extracted text - remove artifacts, normalize whitespace
   */
  cleanText(text) {
    let cleaned = text;
    
    // Replace multiple spaces with single space
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    
    // Replace multiple newlines with double newline
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Remove form feed characters
    cleaned = cleaned.replace(/\f/g, '\n');
    
    // Remove isolated page numbers (pattern: newline + number + newline)
    cleaned = cleaned.replace(/\n\s*\d{1,3}\s*\n/g, '\n');
    
    // Trim each line
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
    
    return cleaned.trim();
  }

  /**
   * Validate PDF file
   */
  async validatePDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      
      // Check if it's a valid PDF (starts with %PDF)
      const header = dataBuffer.slice(0, 5).toString();
      if (!header.startsWith('%PDF')) {
        throw new Error('Invalid PDF file format');
      }
      
      // Try to parse
      await pdfParse(dataBuffer);
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get basic file info
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      logger.error(`Error getting file info: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new PDFProcessor();