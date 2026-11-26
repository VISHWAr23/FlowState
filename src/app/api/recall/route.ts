import { generateText } from 'ai';
import { huggingface } from '@ai-sdk/huggingface';
import { NextResponse } from 'next/server';

const modelName = 'meta-llama/Meta-Llama-3-8B-Instruct';

const TOPIC_FALLBACKS = [
  {
    topic: 'How does Spring Boot’s @Transactional annotation work with AOP proxies?',
    notes: 'Spring creates a dynamic proxy around the bean. When the method is invoked from outside, the proxy intercepts the call, opens a transaction, executes the method, and commits or rolls back. Calling it from within the same class bypasses the proxy and fails to manage transactions.',
  },
  {
    topic: 'What is the circuit breaker pattern in microservices, and how does it prevent cascading failures?',
    notes: 'A circuit breaker detects failures and encapsulates the logic of preventing an operation from constantly executing during a recurring failure. When downstream service failure rate exceeds a threshold, the circuit trips open, immediately returning fallbacks without wasting thread pool resources.',
  },
  {
    topic: 'What is the difference between an Ingress Controller and a NodePort in Kubernetes?',
    notes: 'NodePort exposes a service on each node’s IP at a static port (30000-32767). Ingress acts as an intelligent HTTP/HTTPS reverse proxy and layer-7 load balancer routing traffic to internal services based on hostnames and paths, providing SSL termination and name-based virtual hosting.',
  },
  {
    topic: 'How does the Event Loop in Node.js handle non-blocking asynchronous I/O?',
    notes: 'Node.js offloads heavy I/O operations to libuv’s thread pool or the operating system kernel. When an operation finishes, its callback is placed on the event loop queue (timers, poll, check, close phases) and executed when the main JavaScript execution stack is clear.',
  },
  {
    topic: 'What is the Saga Pattern in distributed microservices transactions?',
    notes: 'A Saga is a sequence of local transactions where each service updates its own database and publishes an event. If a local transaction fails, the saga executes a series of compensating transactions that undo the changes made by the preceding local transactions.',
  },
  {
    topic: 'Why are container multi-stage builds recommended for production Dockerfiles?',
    notes: 'Multi-stage builds separate build-time dependencies (compilers, dev packages, package managers) from the final runtime image, resulting in drastically smaller image sizes, faster deployment pulls, and a minimized security attack surface.',
  },
];

export async function POST(req: Request) {
  if (process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY.startsWith('hf_')) {
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
Do not wrap it in markdown blocks.`;

      const { text } = await generateText({
        model: huggingface(modelName),
        prompt: systemPrompt,
        temperature: 0.8,
      });

      let jsonString = text.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonString);
      if (parsed.topic && parsed.notes) {
        return NextResponse.json(parsed);
      }
    } catch {
      // Fallback cleanly to high-value curated question bank
    }
  }

  // Curated educational question from random topic
  const randomQuestion = TOPIC_FALLBACKS[Math.floor(Math.random() * TOPIC_FALLBACKS.length)];
  return NextResponse.json(randomQuestion, { status: 200 });
}
