import { streamText } from 'ai';
import { huggingface } from '@ai-sdk/huggingface';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const key = env.match(/HUGGINGFACE_API_KEY=(.*)/)[1];
process.env.HUGGINGFACE_API_KEY = key.trim();

async function main() {
  try {
    const result = streamText({
      model: huggingface('mistralai/Mistral-7B-Instruct-v0.3'),
      system: 'You are a helpful assistant.',
      messages: [{ role: 'user', content: 'hi' }],
    });
    const reader = result.textStream.getReader();
    const { value } = await reader.read();
    console.log('Success:', value);
  } catch (e) {
    console.error('FAILED:', e);
  }
}
main();
