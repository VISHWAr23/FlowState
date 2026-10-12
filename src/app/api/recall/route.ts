import { generateText } from 'ai';
import { huggingface } from '@ai-sdk/huggingface';
import { NextResponse } from 'next/server';

const modelName = 'meta-llama/Meta-Llama-3-8B-Instruct';

export async function POST(req: Request) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    return NextResponse.json({ error: 'Missing HuggingFace API Key in .env.local' }, { status: 500 });
  }

  try {
    const systemPrompt = `You are an educational assistant designed to help users with active recall and spaced repetition for their Cloud Native and Microservices course. 
Your task is to generate EXACTLY ONE interesting, intermediate-to-advanced trivia or conceptual question from the following course topics:
1. Cloud Native and Microservices Fundamentals (cloud-native concepts, microservices architecture, containers)
2. API Fundamentals (Resources, methods, HTTP responses, representation design)
3. Microservices Development using Java (Java, Spring framework, Spring Boot, Hibernate)
4. Microservices Development using Node.js (Advanced JavaScript, Node.js, Express, MongoDB)
5. Docker & Kubernetes (Container fundamentals and orchestration)
6. DevOps Foundation (DevOps, configuration management, continuous delivery, infrastructure automation)

Pick a random topic from the list above and generate a question for it.
You MUST respond ONLY with a raw JSON object containing exactly two keys: "topic" and "notes".
"topic" should be the question.
"notes" should be the concise answer or explanation.
Do not wrap it in markdown blocks, do not add any conversational text before or after.
Example: {"topic": "What is the difference between a mutex and a semaphore?", "notes": "A mutex allows only one thread to access a resource, while a semaphore allows a specified number of threads to access it."}`;

    const { text } = await generateText({
      model: huggingface(modelName),
      prompt: systemPrompt,
      temperature: 0.8,
    });

    // Attempt to parse the JSON. 
    // Sometimes LLMs wrap in markdown or add text, so we do a simple regex extraction if needed.
    let jsonString = text.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```/, '').replace(/```$/, '').trim();
    }
    
    // Sometimes the model outputs text before the JSON block
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.topic && parsed.notes) {
        return NextResponse.json(parsed);
      }
      throw new Error("Invalid format");
    } catch (parseError) {
      console.warn("Failed to parse AI response:", text);
      // Fallback response if the model didn't follow instructions
      return NextResponse.json({
        topic: "What is the main advantage of Server-Side Rendering (SSR) over Client-Side Rendering (CSR)?",
        notes: "SSR improves initial page load time (First Contentful Paint) and SEO because the HTML is fully formed when it arrives at the browser."
      });
    }
  } catch (error: any) {
    console.error('Error in recall generation route:', error);
    return NextResponse.json({ 
      topic: "What is the Pomodoro Technique?", 
      notes: "A time management method that uses a timer to break work into intervals, typically 25 minutes in length, separated by short breaks." 
    }, { status: 200 }); // Graceful fallback
  }
}
