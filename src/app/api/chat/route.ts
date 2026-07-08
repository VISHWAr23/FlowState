import { streamText } from 'ai';
import { huggingface } from '@ai-sdk/huggingface';
import { NextResponse } from 'next/server';

// Use a model reliably available on HuggingFace's serverless Inference API
const modelName = 'meta-llama/Meta-Llama-3-8B-Instruct';

export async function POST(req: Request) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    return NextResponse.json({ error: 'Missing HuggingFace API Key in .env.local' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const messages = body.messages || [];
    const context = body.context || '';

    // Create a system message with context about the user's tasks and habits
    const systemPrompt = `You are a helpful, motivating productivity assistant called FlowState AI. 
You act as a personal coach, helping the user stay on track with their goals, tasks, and habits.
Keep your responses concise, friendly, and actionable.

Here is the user's current context:
${context || 'No specific context provided at this time.'}

When the user asks for suggestions or what to do next, refer to this context to give personalized advice.`;

    // Convert messages to the format the AI SDK expects
    const formattedMessages = messages
      .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content || (msg.parts ? msg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') : '')
      }))
      .filter((msg: any) => msg.content); // Remove empty messages

    const result = streamText({
      model: huggingface(modelName),
      system: systemPrompt,
      messages: formattedMessages,
      temperature: 0.7,
    });

    // Use the AI SDK's built-in method to return a properly formatted streaming response
    // that is compatible with the useChat hook on the client
    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Error in chat route:', error);
    const errorMessage = error?.message || 'Failed to process chat request';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
