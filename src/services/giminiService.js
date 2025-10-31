const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

class GiminiService {
  constructor() {
    this.apiKey = config.gimini.apiKey;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.gimini.apiKey}`;
    this.model = 'gemini-2.0-flash';
  }

  /**
   * Extract structured metadata AND sections from PDF text using Gimini
   * @param {String} pdfText - Raw text extracted from PDF
   * @returns {Object} Structured metadata with sections
   */
  async extractMetadataAndSections(pdfText) {
    try {
      logger.info('🤖 Extracting metadata and sections using Gimini...');

      // Use more text for better section detection (first 5000 chars for metadata, but we'll also ask about full structure)
      const textSample = pdfText;

      const prompt = `You are an expert at analyzing academic research papers. Extract the following information from this research paper text and return it as a valid JSON object.

Paper Text:
"""
${textSample}
"""

Analyze this research paper and extract the following as a JSON object:

{
  "title": "The full title of the paper",
  "authors": ["Author 1", "Author 2", "Author 3"],
  "year": 2024,
  "abstract": "The abstract text if found",
  "sections": [
    {
      "name": "Abstract",
      "content": "The abstract content..."
    },
    {
      "name": "Introduction", 
      "content": "The introduction content..."
    },
    {
      "name": "Methodology",
      "content": "The methodology content..."
    }
  ]
}

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown or extra text
2. For sections, identify these common types: Abstract, Introduction, Related Work, Methodology/Methods, Results, Discussion, Conclusion, References
3. Extract the actual content for each section from the provided text
4. If you cannot find a field, use: empty string for title/abstract, empty array for authors/sections, current year for year
5. Year must be a number between 1900 and 2025
6. Each section should have "name" and "content" fields
7. Keep section content as is from the paper
8. Identify sections even if headers use numbers like "1. Introduction" or "2.1 Methods"`;

      const response = await axios.post(
        this.apiUrl,
        {
            "contents":[
                {
                    "parts":[{"text":prompt}]
                }
            ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 45000 // 45 second timeout
        }
      );
     // console.log(response.data)
      const content = response.data.candidates[0].content.parts[0].text
;
      
      // Parse the JSON response
      let extracted;
      try {
        extracted = JSON.parse(content);
      } catch (parseError) {
        logger.warn('Failed to parse Gimini response, trying to extract JSON...');
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          extracted = JSON.parse(jsonStr);
        } else {
          throw new Error('Could not parse response from Gimini');
        }
      }

      // Validate and set defaults
      const metadata = {
        title: extracted.title || 'Untitled Paper',
        authors: Array.isArray(extracted.authors) && extracted.authors.length > 0 
          ? extracted.authors 
          : ['Unknown Author'],
        year: this.validateYear(extracted.year),
        abstract: extracted.abstract || '',
        sections: Array.isArray(extracted.sections) ? extracted.sections : []
      };

      // Validate sections structure
      metadata.sections = metadata.sections.map((section, idx) => ({
        name: section.name || 'Other',
        content: section.content || '',
        sectionIndex: idx
      }));

      logger.info(`✅ Extracted: ${metadata.title} (${metadata.year})`);
      logger.info(`   Authors: ${metadata.authors.join(', ')}`);
      logger.info(`   Sections: ${metadata.sections.map(s => s.name).join(', ')}`);

      return metadata;

    } catch (error) {
      logger.error(`❌ Error with Gimini: ${error.message}`);
      
      // Return fallback
      return {
        title: 'Untitled Paper',
        authors: ['Unknown Author'],
        year: new Date().getFullYear(),
        abstract: '',
        sections: [],
        error: error.message
      };
    }
  }

  /**
   * Generate answer for a query using RAG context
   * @param {String} query - User's question
   * @param {Array} contexts - Retrieved context chunks
   * @returns {Object} Generated answer with metadata
   */
  async generateAnswer(query, contexts) {
    try {
      logger.info(`🤖 Generating answer for query: ${query}`);

      // Build context from retrieved chunks
      const contextText = contexts.map((ctx, idx) => 
        `[${idx + 1}] From "${ctx.paper_title}" (${ctx.section}, Page ${ctx.page}):\n${ctx.text}`
      ).join('\n\n');

      const prompt = `You are a helpful research assistant. Answer the user's question based ONLY on the provided context from research papers.

Context from research papers:
${contextText}

User Question: ${query}

Instructions:
- Provide a clear, accurate answer based on the context
- Cite specific papers and sections when making claims
- If the context doesn't contain enough information, say so
- Be concise but thorough
- Use academic tone

Answer:`;

      const response = await axios.post(
        this.apiUrl,
        {
            "contents":[
                {
                    "parts":[{"text":prompt}]
                }
            ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 45000 // 45 second timeout
        }
      );

      const answer = response.data.candidates[0].content.parts[0].text;
      
      logger.info(`✅ Answer generated (${answer.length} chars)`);

      return {
        answer,
        model: this.model,
        
      };

    } catch (error) {
      logger.error(`❌ Error generating answer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate year is reasonable
   */
  validateYear(year) {
    const numYear = parseInt(year);
    const currentYear = new Date().getFullYear();
    
    if (isNaN(numYear) || numYear < 1900 || numYear > currentYear + 1) {
      return currentYear;
    }
    
    return numYear;
  }

  /**
   * Test Gimini connection
   */
  async testConnection() {
    try {
        console.log(this.apiUrl)
      const response = await axios.post(
        this.apiUrl,
        {
            "contents":[
                {
                    "parts":[{"text":"say hello if you can read this"}]
                }
            ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 45000 // 45 second timeout
        }
      );

      logger.info('✅ Gimini connection successful');
      return true;
    } catch (error) {
      logger.error(`❌ Gimini connection failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = new GiminiService();