export interface WeatherToolResult {
  location: string;
  latitude: number;
  longitude: number;
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    is_day: number;
    time: string;
  };
}

export const weatherToolDef = {
  type: 'function',
  name: 'get_weather',
  description:
    "根据地点名称查询当前天气，使用 Open-Meteo。调用时 location 参数请只填写城市或地点名本身，例如 '北京'、'Shanghai' 或 'Beijing'，不要包含“天气怎么样”“现在的天气如何”等额外描述。",
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: "城市或地点名，比如 'Beijing' 或 '上海'",
      },
    },
    required: ['location'],
  },
} as const;

export async function runWeatherTool(args: {
  location: string;
}): Promise<WeatherToolResult | { error: string }> {
  const name = args.location.trim();

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      name,
    )}&count=1`,
  );
  const geo = await geoRes.json();

  if (!geo.results?.length) {
    return { error: '未找到该地点的地理信息' };
  }

  const { latitude, longitude } = geo.results[0];

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
  );
  const weather = await weatherRes.json();

  return {
    location: geo.results[0].name,
    latitude,
    longitude,
    current_weather: weather.current_weather,
  };
}
