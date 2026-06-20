const TOKEN = process.env.FOOTBALL_DATA_TOKEN || '3f802ba34ffe4cb2ae4d9c7c2ea04d7e';

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const endpoints = [
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    'https://api.football-data.org/v4/matches'
  ];

  let lastError = null;
  for (const url of endpoints) {
    try {
      const response = await fetch(url, { headers: { 'X-Auth-Token': TOKEN } });
      const text = await response.text();

      if (!response.ok) {
        lastError = `${response.status} ${response.statusText}: ${text.slice(0, 300)}`;
        continue;
      }

      return {
        statusCode: 200,
        headers,
        body: text,
      };
    } catch (error) {
      lastError = error.message || String(error);
    }
  }

  return {
    statusCode: 502,
    headers,
    body: JSON.stringify({ error: 'Could not reach football-data.org', detail: lastError }),
  };
};
