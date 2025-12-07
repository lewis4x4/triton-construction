// =============================================================================
// Edge Function: weather-fetch
// Purpose: Fetch weather data for project locations
// Per CLAUDE.md: Integration with OpenWeatherMap
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherRequest {
  project_id?: string;
  latitude: number;
  longitude: number;
  date?: string; // For historical weather
}

interface WeatherData {
  temperature: number;
  high_temp: number;
  low_temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  wind_gust?: number;
  visibility: number;
  clouds: number;
  conditions: string;
  description: string;
  icon: string;
  precipitation?: number;
  snow?: number;
  uv_index?: number;
  sunrise: string;
  sunset: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openWeatherApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    if (!openWeatherApiKey) {
      throw new Error('OPENWEATHERMAP_API_KEY not configured');
    }

    const { project_id, latitude, longitude, date } = await req.json() as WeatherRequest;

    let lat = latitude;
    let lon = longitude;

    // If project_id provided, get project location
    if (project_id && (!lat || !lon)) {
      const { data: project } = await supabaseClient
        .from('projects')
        .select('latitude, longitude')
        .eq('id', project_id)
        .single();

      if (project?.latitude && project?.longitude) {
        lat = project.latitude;
        lon = project.longitude;
      } else {
        // Try project_locations
        const { data: location } = await supabaseClient
          .from('project_locations')
          .select('center_latitude, center_longitude')
          .eq('project_id', project_id)
          .limit(1)
          .single();

        if (location) {
          lat = location.center_latitude;
          lon = location.center_longitude;
        }
      }
    }

    if (!lat || !lon) {
      throw new Error('Location coordinates required');
    }

    console.log(`Fetching weather for: ${lat}, ${lon}`);

    // Fetch current weather
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}&units=imperial`;
    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();

    // Also fetch forecast for daily high/low
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}&units=imperial&cnt=8`;
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;

    // Calculate high/low from forecast if available
    let highTemp = weatherData.main.temp;
    let lowTemp = weatherData.main.temp;

    if (forecastData?.list) {
      const temps = forecastData.list.map((f: any) => f.main.temp);
      highTemp = Math.max(...temps, weatherData.main.temp);
      lowTemp = Math.min(...temps, weatherData.main.temp);
    }

    const result: WeatherData = {
      temperature: Math.round(weatherData.main.temp),
      high_temp: Math.round(highTemp),
      low_temp: Math.round(lowTemp),
      feels_like: Math.round(weatherData.main.feels_like),
      humidity: weatherData.main.humidity,
      pressure: weatherData.main.pressure,
      wind_speed: Math.round(weatherData.wind.speed),
      wind_direction: weatherData.wind.deg,
      wind_gust: weatherData.wind.gust ? Math.round(weatherData.wind.gust) : undefined,
      visibility: Math.round(weatherData.visibility / 1609.34), // Convert to miles
      clouds: weatherData.clouds.all,
      conditions: weatherData.weather[0].main,
      description: weatherData.weather[0].description,
      icon: weatherData.weather[0].icon,
      precipitation: weatherData.rain?.['1h'] || weatherData.rain?.['3h'] || 0,
      snow: weatherData.snow?.['1h'] || weatherData.snow?.['3h'] || 0,
      sunrise: new Date(weatherData.sys.sunrise * 1000).toISOString(),
      sunset: new Date(weatherData.sys.sunset * 1000).toISOString(),
    };

    // Save to weather_snapshots if project_id provided
    if (project_id) {
      const today = new Date().toISOString().split('T')[0];

      await supabaseClient
        .from('weather_snapshots')
        .upsert({
          project_id,
          snapshot_date: today,
          snapshot_time: new Date().toTimeString().split(' ')[0],
          temperature: result.temperature,
          high_temperature: result.high_temp,
          low_temperature: result.low_temp,
          humidity: result.humidity,
          wind_speed: result.wind_speed,
          wind_direction: result.wind_direction,
          precipitation: result.precipitation,
          conditions: result.conditions,
          description: result.description,
          raw_data: weatherData,
        }, {
          onConflict: 'project_id,snapshot_date',
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        location: { latitude: lat, longitude: lon },
        weather: result,
        fetched_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Weather fetch error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
