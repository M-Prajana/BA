const API_URL = 'http://localhost:3001/api';

export async function compareModels(prompt, promptType) {
  const response = await fetch(`${API_URL}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, promptType })
  });
  
  if (!response.ok) {
    throw new Error('Failed to compare models');
  }
  
  return response.json();
}

export async function checkHealth() {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}
