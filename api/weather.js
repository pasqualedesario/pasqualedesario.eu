// Serverless Function to proxy weather data for Bari, Italy
// Hides geographic coordinates and sets CDN caching headers (10 minutes)

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Cache response at edge/CDN for 600s (10 min), allow stale-while-revalidate for 300s
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');

  try {
    const lat = '41.1171';
    const lon = '16.8719';
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    const response = await fetch(weatherUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch weather data from source' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
