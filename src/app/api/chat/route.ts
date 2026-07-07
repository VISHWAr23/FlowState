import { streamText } from 'ai';
import { huggingface } from '@ai-sdk/huggingface';
import { NextResponse } from 'next/server';

// We'll use a fast instruction-tuned model available on Hugging Face API
const modelName = 'Qwen/Qwen2.5-7B-Instruct';

export async function POST(req: Request) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    return NextResponse.json({ error: 'Missing HuggingFace API Key in .env.local' }, { status: 500 });
  }

  try {
    const { messages, context } = await req.json();

    // Create a system message with context about the user's tasks and habits
    const systemPrompt = `You are a helpful, motivating productivity assistant called FlowState AI. 
You act as a personal coach, helping the user stay on track with their goals, tasks, and habits.
Keep your responses concise, friendly, and actionable.

Here is the user's current context:
${context || 'No specific context provided at this time.'}

When the user asks for suggestions or what to do next, refer to this context to give personalized advice.`;

    const result = streamText({
      model: huggingface(modelName),
      system: systemPrompt,
      messages: (messages || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content || (msg.parts ? msg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') : '')
      })),
      temperature: 0.7,
    });

    const dataStream = result.textStream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(`0:${JSON.stringify(chunk)}\n`);
        }
      })
    ).pipeThrough(new TextEncoderStream());

    return new Response(dataStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-vercel-ai-data-stream': 'v1',
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
