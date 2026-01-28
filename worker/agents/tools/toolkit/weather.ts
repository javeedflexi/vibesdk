// Simple weather tool for testing tool calling framework
import { tool, t, ToolDefinition } from '../types';

export interface WeatherResult {
	location: string;
	temperature: number;
	condition: string;
	humidity: number;
}

export function createWeatherTool(): ToolDefinition<{ location: string }, WeatherResult> {
	return tool({
		name: 'get_weather',
		description: 'Get current weather information for a location',
		args: {
			location: t.string().describe('The city or location name'),
		},
		run: async ({ location }) => {
			return {
				location,
				temperature: Math.floor(Math.random() * 40) - 10,
				condition: ['Sunny', 'Cloudy', 'Rainy', 'Snowy'][
					Math.floor(Math.random() * 4)
				],
				humidity: Math.floor(Math.random() * 100),
			};
		},
	});
}
