import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// AIML API client for Claude and MiniMax
const aimlApi = new OpenAI({ 
  apiKey: process.env.AIML_API_KEY, 
  baseURL: 'https://api.aimlapi.com/v1' 
});
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const groq = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY, 
  baseURL: 'https://api.groq.com/openai/v1' 
});

// Prompt formatters based on your 3 prompt types
function formatPrompt(prompt, promptType) {
  switch (promptType) {
    case 'explicit':
      return `Please provide a clear, detailed, and accurate explanation for the following question:\n\n${prompt}`;
    case 'autocot':
      return `${prompt}\n\nLet's think step by step to arrive at a comprehensive answer.`;
    case 'implicit':
    default:
      return prompt;
  }
}

// Model API calls
async function callOpenAI(prompt) {
  const start = Date.now();
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });
    return {
      success: true,
      response: response.choices[0].message.content,
      latency: Date.now() - start
    };
  } catch (error) {
    return { success: false, error: error.message, latency: Date.now() - start };
  }
}

// Claude via AIML API
async function callClaude(prompt) {
  const start = Date.now();
  try {
    const response = await aimlApi.chat.completions.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });
    return {
      success: true,
      response: response.choices[0].message.content,
      latency: Date.now() - start
    };
  } catch (error) {
    return { success: false, error: error.message, latency: Date.now() - start };
  }
}

async function callGemini(prompt) {
  const start = Date.now();
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    return {
      success: true,
      response: result.response.text(),
      latency: Date.now() - start
    };
  } catch (error) {
    return { success: false, error: error.message, latency: Date.now() - start };
  }
}

// DeepSeek via AIML API
async function callDeepSeek(prompt) {
  const start = Date.now();
  try {
    const response = await aimlApi.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });
    return {
      success: true,
      response: response.choices[0].message.content,
      latency: Date.now() - start
    };
  } catch (error) {
    return { success: false, error: error.message, latency: Date.now() - start };
  }
}

// MiniMax via AIML API
async function callMiniMax(prompt) {
  const start = Date.now();
  try {
    const response = await aimlApi.chat.completions.create({
      model: 'MiniMax-Text-01',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });
    return {
      success: true,
      response: response.choices[0].message.content,
      latency: Date.now() - start
    };
  } catch (error) {
    return { success: false, error: error.message, latency: Date.now() - start };
  }
}

// LLaMA Judge using Groq (fast & free)
async function judgeResponse(originalPrompt, modelName, response) {
  const judgePrompt = `You are an expert evaluator assessing the quality of AI responses.

ORIGINAL QUESTION: ${originalPrompt}

MODEL RESPONSE (${modelName}):
${response}

Evaluate this response on 4 metrics (score 0-10 for each):

1. ACCURACY: Is the information factually correct?
2. COMPLETENESS: Does it fully address the question?
3. COHERENCE: Is it logically structured and easy to follow?
4. RELEVANCE: Does it stay on topic and address what was asked?

Also provide:
- 2-3 key strengths
- 1-2 weaknesses
- Brief summary (1 sentence)

Respond ONLY in this exact JSON format:
{
  "accuracy": <number>,
  "completeness": <number>,
  "coherence": <number>,
  "relevance": <number>,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1"],
  "summary": "Brief evaluation summary"
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: judgePrompt }],
      temperature: 0.1,
      max_tokens: 500,
    });
    
    const content = response.choices[0].message.content;
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid JSON response from judge');
  } catch (error) {
    console.error('Judge error:', error);
    // Return default scores if judge fails
    return {
      accuracy: 5,
      completeness: 5,
      coherence: 5,
      relevance: 5,
      strengths: ['Response provided'],
      weaknesses: ['Could not fully evaluate'],
      summary: 'Evaluation incomplete'
    };
  }
}

// Main comparison endpoint
app.post('/api/compare', async (req, res) => {
  const { prompt, promptType } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const formattedPrompt = formatPrompt(prompt, promptType);
  
  console.log(`\n📝 Processing: "${prompt.slice(0, 50)}..." (${promptType})`);

  // Call all models in parallel
  const modelCalls = [
    { id: 'gpt4', name: 'GPT-4o-mini', fn: callOpenAI },
    { id: 'claude', name: 'Claude 3.5 Sonnet', fn: callClaude },
    { id: 'gemini', name: 'Gemini 2.0 Flash', fn: callGemini },
    { id: 'deepseek', name: 'DeepSeek Chat', fn: callDeepSeek },
    { id: 'minimax', name: 'MiniMax', fn: callMiniMax },
  ];

  const results = [];

  for (const model of modelCalls) {
    console.log(`  🤖 Calling ${model.name}...`);
    const result = await model.fn(formattedPrompt);
    
    if (result.success) {
      console.log(`  ✅ ${model.name} responded (${result.latency}ms)`);
      
      // Judge the response
      console.log(`  ⚖️ Judging ${model.name}...`);
      const judgment = await judgeResponse(prompt, model.name, result.response);
      
      results.push({
        modelId: model.id,
        modelName: model.name,
        response: result.response,
        latency: result.latency,
        scores: {
          accuracy: judgment.accuracy,
          completeness: judgment.completeness,
          coherence: judgment.coherence,
          relevance: judgment.relevance
        },
        reasoning: {
          summary: judgment.summary,
          strengths: judgment.strengths,
          weaknesses: judgment.weaknesses
        }
      });
    } else {
      console.log(`  ❌ ${model.name} failed: ${result.error}`);
      results.push({
        modelId: model.id,
        modelName: model.name,
        error: result.error,
        latency: result.latency
      });
    }
  }

  // Determine winner
  const validResults = results.filter(r => !r.error);
  let winner = null;
  
  if (validResults.length > 0) {
    winner = validResults.reduce((best, current) => {
      const bestAvg = (best.scores.accuracy + best.scores.completeness + best.scores.coherence + best.scores.relevance) / 4;
      const currentAvg = (current.scores.accuracy + current.scores.completeness + current.scores.coherence + current.scores.relevance) / 4;
      return currentAvg > bestAvg ? current : best;
    });
    console.log(`\n🏆 Winner: ${winner.modelName}`);
  }

  res.json({ results, winner: winner?.modelId });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    models: {
      openai: !!process.env.OPENAI_API_KEY,
      claude: !!process.env.AIML_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      deepseek: !!process.env.AIML_API_KEY,
      aiml: !!process.env.AIML_API_KEY,
      groq: !!process.env.GROQ_API_KEY
    }
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 LLM Comparison Server running on http://localhost:${PORT}`);
  console.log('\n📋 API Keys configured:');
  console.log(`   OpenAI:     ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`);
  console.log(`   AIML API:   ${process.env.AIML_API_KEY ? '✅' : '❌'} (Claude + DeepSeek + MiniMax)`);
  console.log(`   Google:     ${process.env.GOOGLE_API_KEY ? '✅' : '❌'}`);
  console.log(`   Groq:       ${process.env.GROQ_API_KEY ? '✅' : '❌'} (LLaMA Judge)`);
});
