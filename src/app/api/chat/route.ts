import { streamText, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { huggingface } from '@ai-sdk/huggingface';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-server';
import { isPlaceholderUrl } from '@/lib/supabase';
import { ensureProfileInSupabase } from '@/lib/supabase-sync';

// Model to try if HuggingFace is reachable and has active quota
const modelName = 'meta-llama/Meta-Llama-3-8B-Instruct';

/**
 * Intelligent contextual fallback coach when HuggingFace or external LLM is offline/out of credits
 */
function generateContextualCoachReply(prompt: string, context: string): string {
  const cleanPrompt = prompt.toLowerCase().trim();

  // Parse tasks and habits from context if available
  const hasPendingTasks = context.includes('Pending Tasks for Today') && !context.includes('No pending tasks.');
  const hasHabits = context.includes('Active Habits') && !context.includes('No active habits.');

  if (cleanPrompt.includes('priority') || cleanPrompt.includes('priorities') || cleanPrompt.includes('review my daily')) {
    if (hasPendingTasks) {
      return `Here is your execution directive for today:\n\n1. Stop context switching. Look at your pending tasks—pick the single highest-priority task and execute it in an uninterrupted 25-minute focus session right now.\n2. Do not touch lower-priority items until your primary high-impact deliverable is complete.\n3. Log your focus session as soon as you finish to lock in your XP.\n\nCommit to this first block immediately. What task are you starting with?`;
    }
    return `You currently have no high-priority tasks scheduled for today. That is unacceptable if you want to maintain momentum.\n\nAction step: Open your Today view right now and capture your top 3 non-negotiable tasks before moving forward.`;
  }

  if (cleanPrompt.includes('spring boot') || cleanPrompt.includes('question') || cleanPrompt.includes('recall')) {
    const questions = [
      `Active Recall Challenge (Microservices & Spring Boot):\n\nHow does Spring Boot's @Transactional annotation work under the hood with AOP proxies, and why does calling a @Transactional method from within the same class fail to start a new transaction?`,
      `Active Recall Challenge (System Design):\n\nExplain the difference between Optimistic Locking (@Version) and Pessimistic Locking in database transactions. When would you choose one over the other in a high-concurrency productivity system?`,
      `Active Recall Challenge (Docker & Containers):\n\nWhat is the difference between the COPY and ADD instructions in a Dockerfile, and why does multi-stage building drastically reduce production container vulnerabilities?`
    ];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  if (cleanPrompt.includes('english') || cleanPrompt.includes('paragraph') || cleanPrompt.includes('assess')) {
    return `Drop your paragraph right here. I will critique your sentence structure, vocabulary precision, and conciseness with zero sugarcoating. Provide the text now.`;
  }

  if (cleanPrompt.includes('tired') || cleanPrompt.includes('lazy') || cleanPrompt.includes('procrastinat') || cleanPrompt.includes('slacking')) {
    return `Fatigue is mental resistance disguised as physical inability. You do not need motivation; you need disciplined execution.\n\nHere is your protocol:\n1. Put your phone in another room.\n2. Set a 15-minute timer.\n3. Do not open social media or YouTube.\n4. Just work for 15 minutes. Once momentum builds, resistance fades.\n\nStart now.`;
  }

  // General strict coach advice
  return `Execution over excuses.\n\n${hasPendingTasks ? 'You have unfinished priorities waiting on your scorecard today. Eliminate distractions, lock in a 25-minute deep work block, and knock the first one out.' : 'Define your core priorities for today and start your first focus session.'}\n\nWhat is stopping you from starting right this second?`;
}

// GET: Retrieve persistent chat history for the user
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ messages: [] });
    }

    if (isPlaceholderUrl) {
      return NextResponse.json({ messages: [] });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('chat_messages')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.warn('Error reading chat history from Supabase:', error.message);
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({
      messages: (data || []).map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        createdAt: msg.created_at,
      })),
    });
  } catch (err: unknown) {
    console.error('Chat GET error:', err);
    return NextResponse.json({ messages: [] });
  }
}

// POST: Process chat input with streaming + resilient fallback + database persistence
export async function POST(req: Request) {
  let sessionUserId: string | null = null;
  let sessionUsername: string | undefined;
  let sessionName: string | undefined;
  try {
    const session = await getSessionUser();
    sessionUserId = session?.userId || null;
    sessionUsername = session?.username;
    sessionName = session?.name;
  } catch {
    // Non-blocking session extraction
  }

  try {
    const body = await req.json();
    const messages = body.messages || [];
    const context = body.context || '';

    // Extract latest user message
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    const userPromptText =
      lastUserMsg?.content ||
      (lastUserMsg?.parts
        ? lastUserMsg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
        : '');

    // Ensure profile exists and persist user message synchronously so timestamps precede assistant reply
    if (sessionUserId && userPromptText && !isPlaceholderUrl) {
      try {
        await ensureProfileInSupabase(sessionUserId, {
          username: sessionUsername,
          name: sessionName,
        });
        const admin = createAdminClient();
        await admin.from('chat_messages').insert({
          user_id: sessionUserId,
          role: 'user',
          content: userPromptText,
        });
      } catch (err) {
        console.warn('Failed to persist user chat message:', err);
      }
    }

    const systemPrompt = `You are FlowState AI, a strict, demanding, and uncompromising master. 
Your sole purpose is to forcefully push the user to drastically improve their productivity, communication, and knowledge.
Do not be gentle. Be direct, authoritative, and hold them to the absolute highest standards. Tolerate zero excuses.
If they are slacking or asking for easy outs, call them out on it and push them back to work.
Keep your responses concise, authoritative, and highly actionable.

Here is the user's current context:
${context || 'No specific context provided at this time.'}

When the user asks for suggestions or what to do next, refer to this context and give them a rigorous, demanding plan.`;

    const formattedMessages = messages
      .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content || (msg.parts ? msg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') : '')
      }))
      .filter((msg: any) => msg.content);

    const fallbackText = generateContextualCoachReply(userPromptText, context);

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        let streamedAnyText = false;
        let finalReplyText = '';

        // Try HuggingFace if key is available
        if (process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY.startsWith('hf_')) {
          try {
            const hfStream = streamText({
              model: huggingface(modelName),
              system: systemPrompt,
              messages: formattedMessages,
              temperature: 0.7,
            });

            for await (const textPart of hfStream.textStream) {
              if (textPart) {
                if (!streamedAnyText) {
                  writer.write({ type: 'text-start', id: 'coach-reply' });
                }
                writer.write({ type: 'text-delta', id: 'coach-reply', delta: textPart });
                finalReplyText += textPart;
                streamedAnyText = true;
              }
            }
            if (streamedAnyText) {
              writer.write({ type: 'text-end', id: 'coach-reply' });
            }
          } catch (hfErr) {
            console.warn('HuggingFace streaming unavailable, falling back to built-in coach:', hfErr);
          }
        }

        // Resilient Coach Fallback (if HF failed, wasn't configured, or streamed 0 characters)
        if (!streamedAnyText) {
          finalReplyText = fallbackText;
          writer.write({ type: 'text-start', id: 'coach-reply' });
          const words = fallbackText.split(' ');
          for (let i = 0; i < words.length; i += 3) {
            const slice = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
            writer.write({ type: 'text-delta', id: 'coach-reply', delta: slice });
            await new Promise((r) => setTimeout(r, 20));
          }
          writer.write({ type: 'text-end', id: 'coach-reply' });
        }

        // Persist the actual streamed reply to Supabase
        if (sessionUserId && finalReplyText && !isPlaceholderUrl) {
          const admin = createAdminClient();
          await Promise.resolve(
            admin.from('chat_messages').insert({
              user_id: sessionUserId,
              role: 'assistant',
              content: finalReplyText,
            })
          ).catch((err) => console.warn('Failed to persist assistant chat message:', err));
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    // Even in outer catch, return a valid stream response so UI never drops the reply
    const emergencyText = 'Eliminate distractions and focus on your top priority task right now. Execute!';
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: 'text-start', id: 'emergency-reply' });
        writer.write({ type: 'text-delta', id: 'emergency-reply', delta: emergencyText });
        writer.write({ type: 'text-end', id: 'emergency-reply' });
      },
    });

    return createUIMessageStreamResponse({ stream });
  }
}

export async function DELETE() {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isPlaceholderUrl) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('chat_messages')
      .delete()
      .eq('user_id', session.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to clear chat history' }, { status: 500 });
  }
}
