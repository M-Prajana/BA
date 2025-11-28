import React, { useState, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { MODELS, PROMPT_TYPES } from './data/models';
import { compareModels, checkHealth } from './api/llmService';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [promptType, setPromptType] = useState('implicit');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [winner, setWinner] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkHealth().then(setApiStatus).catch(() => setApiStatus({ status: 'offline' }));
  }, []);

  const runComparison = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResults([]);
    setWinner(null);
    setError(null);

    try {
      const data = await compareModels(prompt, promptType);
      const modelResults = data.results.map(r => ({
        model: MODELS.find(m => m.id === r.modelId),
        response: r.response,
        scores: r.scores,
        reasoning: r.reasoning,
        error: r.error,
        latency: r.latency
      }));
      setResults(modelResults);
      setWinner(modelResults.find(r => r.model?.id === data.winner));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, promptType]);

  const getAvgScore = (scores) => {
    if (!scores) return 0;
    return ((scores.accuracy + scores.completeness + scores.coherence + scores.relevance) / 4).toFixed(2);
  };

  const sortedResults = [...results].filter(r => r.scores).sort((a, b) => getAvgScore(b.scores) - getAvgScore(a.scores));

  return (
    <div>
      <h1>LLM Comparison Dashboard</h1>
      <p>Compare responses from 5 LLMs using LLaMA as judge</p>
      
      <hr />

      {/* Input */}
      <div>
        <label><strong>Prompt Type: </strong></label>
        <select value={promptType} onChange={(e) => setPromptType(e.target.value)}>
          {PROMPT_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      
      <div style={{ marginTop: 10 }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          style={{ width: '70%' }}
          onKeyDown={(e) => e.key === 'Enter' && runComparison()}
        />
        <button onClick={runComparison} disabled={isLoading || !prompt.trim()} style={{ marginLeft: 10 }}>
          {isLoading ? 'Processing...' : 'Compare'}
        </button>
      </div>

      <hr />

      {/* Status */}
      {apiStatus?.status === 'offline' && (
        <p style={{ color: 'red' }}>⚠️ Backend offline. Run: cd server && npm start</p>
      )}
      
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {isLoading && <p className="loading">Calling all 5 models and judging responses...</p>}

      {/* Winner */}
      {winner && (
        <div>
          <h2>🏆 Winner: {winner.model.name}</h2>
          <p>Average Score: <strong>{getAvgScore(winner.scores)}/10</strong></p>
          {winner.reasoning && <p><em>{winner.reasoning.summary}</em></p>}
        </div>
      )}

      {/* Rankings Table */}
      {sortedResults.length > 0 && (
        <div>
          <h3>Rankings</h3>
          <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Model</th>
                <th>Avg Score</th>
                <th>Accuracy</th>
                <th>Completeness</th>
                <th>Coherence</th>
                <th>Relevance</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((r, idx) => (
                <tr key={r.model.id} style={idx === 0 ? { background: '#e6ffe6' } : {}}>
                  <td>{idx + 1}</td>
                  <td>{r.model.name}</td>
                  <td><strong>{getAvgScore(r.scores)}</strong></td>
                  <td>{r.scores.accuracy.toFixed(1)}</td>
                  <td>{r.scores.completeness.toFixed(1)}</td>
                  <td>{r.scores.coherence.toFixed(1)}</td>
                  <td>{r.scores.relevance.toFixed(1)}</td>
                  <td>{r.latency}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Comparison Charts */}
      {sortedResults.length > 0 && (
        <div>
          <h3>Comparison Charts</h3>
          
          {/* Bar Chart - Average Scores */}
          <div style={{ marginBottom: 30 }}>
            <h4>Average Score Comparison</h4>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={sortedResults.map(r => ({
                  name: r.model.name.split(' ')[0],
                  score: parseFloat(getAvgScore(r.scores)),
                  color: r.model.color
                }))} layout="vertical">
                  <XAxis type="number" domain={[0, 10]} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip formatter={(value) => value.toFixed(2)} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {sortedResults.map((r, idx) => (
                      <Cell key={idx} fill={idx === 0 ? '#22c55e' : r.model.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar Chart - Winner's Metrics */}
          {winner && (
            <div style={{ marginBottom: 30 }}>
              <h4>Winner Metrics Breakdown: {winner.model.name}</h4>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <RadarChart data={[
                    { metric: 'Accuracy', value: winner.scores.accuracy },
                    { metric: 'Completeness', value: winner.scores.completeness },
                    { metric: 'Coherence', value: winner.scores.coherence },
                    { metric: 'Relevance', value: winner.scores.relevance },
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis domain={[0, 10]} />
                    <Radar name={winner.model.name} dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Grouped Bar Chart - All Metrics */}
          <div>
            <h4>All Metrics Comparison</h4>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <BarChart data={sortedResults.map(r => ({
                  name: r.model.name.split(' ')[0],
                  Accuracy: r.scores.accuracy,
                  Completeness: r.scores.completeness,
                  Coherence: r.scores.coherence,
                  Relevance: r.scores.relevance,
                }))}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Bar dataKey="Accuracy" fill="#3b82f6" />
                  <Bar dataKey="Completeness" fill="#8b5cf6" />
                  <Bar dataKey="Coherence" fill="#22c55e" />
                  <Bar dataKey="Relevance" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: 12, color: '#666' }}>
              <span style={{ color: '#3b82f6' }}>■ Accuracy</span> | 
              <span style={{ color: '#8b5cf6' }}> ■ Completeness</span> | 
              <span style={{ color: '#22c55e' }}> ■ Coherence</span> | 
              <span style={{ color: '#f59e0b' }}> ■ Relevance</span>
            </p>
          </div>
        </div>
      )}

      {/* Responses */}
      {results.length > 0 && (
        <div>
          <h3>Responses</h3>
          {results.map(r => (
            <div key={r.model?.id || Math.random()} className={`response-box ${winner?.model?.id === r.model?.id ? 'winner' : ''}`}>
              <h4>{r.model?.name} {winner?.model?.id === r.model?.id && '🏆'}</h4>
              
              {r.error ? (
                <p style={{ color: 'red' }}>Error: {r.error}</p>
              ) : (
                <>
                  {r.scores && (
                    <p>
                      <strong>Score: {getAvgScore(r.scores)}/10</strong> | 
                      Accuracy: {r.scores.accuracy.toFixed(1)} | 
                      Completeness: {r.scores.completeness.toFixed(1)} | 
                      Coherence: {r.scores.coherence.toFixed(1)} | 
                      Relevance: {r.scores.relevance.toFixed(1)}
                    </p>
                  )}
                  
                  {r.reasoning && (
                    <p><em>Judge: {r.reasoning.summary}</em></p>
                  )}
                  
                  <div style={{ marginTop: 10 }}>
                    <strong>Response:</strong>
                    <pre>{r.response}</pre>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Initial state */}
      {results.length === 0 && !isLoading && !error && (
        <div>
          <p>Enter a prompt above to compare these models:</p>
          <ul>
            {MODELS.map(m => <li key={m.id}>{m.name} ({m.provider})</li>)}
          </ul>
          
          {apiStatus?.models && (
            <div>
              <p><strong>API Status:</strong></p>
              <ul>
                {Object.entries(apiStatus.models).map(([key, ok]) => (
                  <li key={key}>{key}: {ok ? '✅' : '❌'}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
