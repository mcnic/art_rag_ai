const { glob } = require('glob');
const fs = require('fs/promises');
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { Document } = require('langchain/document');

async function loadAndProcessDocuments() {
  console.log('Starting document loading and processing...');

  const files = await new Promise((resolve, reject) => {
    glob('collection/objects/**/*.json', (err, files) => {
      if (err) {
        return reject(err);
      }
      resolve(files);
    });
  });

  console.log(`Found ${files.length} files to process.`);

  let documents = [];
  for (const file of files) {
    try {
      const data = await fs.readFile(file, 'utf-8');
      if (data) {
        const json = JSON.parse(data);

        // Extract relevant text fields
        const textContent = [
          json.title,
          json.description,
          json.text,
          json.artist,
          json.culture,
          json.department,
        ]
          .filter(Boolean)
          .join(' ');

        if (textContent) {
          documents.push(
            new Document({
              pageContent: textContent,
              metadata: {
                source: file,
                id: json.id,
                accession_number: json.accession_number,
              },
            })
          );
        }
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
    }
  }

  console.log(`Created ${documents.length} documents.`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 750,
    chunkOverlap: 75,
  });

  const chunks = await splitter.splitDocuments(documents);

  console.log(`Split documents into ${chunks.length} chunks.`);

  // For now, just log the first chunk to verify
  if (chunks.length > 0) {
    console.log('First chunk:', chunks[0]);
  }

  return chunks;
}

loadAndProcessDocuments().catch(console.error);

module.exports = { loadAndProcessDocuments };
