import { Context } from 'hono';
import { FlexiFunnelsApiService } from '../../../services/flexifunnels/FlexiFunnelsApiService';

/**
 * Controller for creating projects with live FlexiFunnels data
 */

export interface CreateProjectWithFlexiFunnelsDataRequest {
	query: string;  // User's project description
	userId: string;  // FlexiFunnels user ID
	daterange?: string;  // Date range for data fetching (default: 'today')
	currency?: string;  // Currency code (default: 'INR')
	templateName?: string;  // Template to use
}

export async function createProjectWithFlexiFunnelsData(c: Context) {
	try {
		const body: CreateProjectWithFlexiFunnelsDataRequest = await c.req.json();
		
		const {
			query,
			userId,
			daterange = 'today',
			currency = 'INR',
			templateName = 'react-typescript',
		} = body;

		// Validate required fields
		if (!query) {
			return c.json({ error: 'Query is required' }, 400);
		}

		if (!userId) {
			return c.json({ error: 'userId is required' }, 400);
		}

		// Initialize FlexiFunnels API service
		const flexiFunnelsApi = new FlexiFunnelsApiService({
			baseUrl: 'https://statistics.flexifunnels.com/api',
			userId,
			currency,
		});

		// Fetch live business data from FlexiFunnels API
		console.log(`Fetching FlexiFunnels data for user ${userId}, daterange: ${daterange}`);
		const businessMetrics = await flexiFunnelsApi.getBusinessMetrics(daterange);
		const apiEndpoints = flexiFunnelsApi.getApiEndpoints();

		// Prepare custom data for the agent
		const customData = {
			businessMetrics,
			apiEndpoints,
			flexiFunnelsConfig: {
				userId,
				daterange,
				currency,
			},
		};

		// TODO: Integrate with your existing project creation logic
		// This is where you would call your agent initialization
		// and pass the customData to be stored in the project state
		
		// Example response structure:
		return c.json({
			success: true,
			message: 'Project created with FlexiFunnels data',
			data: {
				query,
				customData,
				templateName,
				// Add your project ID and other relevant data here
			},
			metrics: {
				totalRevenue: businessMetrics.summary.totalRevenue,
				totalTransactions: businessMetrics.summary.totalTransactions,
				totalVisitors: businessMetrics.summary.totalVisitors,
				conversionRate: businessMetrics.summary.conversionRate,
			},
		});
		
	} catch (error) {
		console.error('Error creating project with FlexiFunnels data:', error);
		return c.json({ 
			error: 'Failed to create project',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, 500);
	}
}

/**
 * Test endpoint to fetch FlexiFunnels data without creating a project
 */
export async function testFlexiFunnelsData(c: Context) {
	try {
		const { userId, daterange = 'today', currency = 'INR' } = c.req.query();

		if (!userId) {
			return c.json({ error: 'userId query parameter is required' }, 400);
		}

		const flexiFunnelsApi = new FlexiFunnelsApiService({
			baseUrl: 'https://statistics.flexifunnels.com/api',
			userId,
			currency,
		});

		const businessMetrics = await flexiFunnelsApi.getBusinessMetrics(daterange);
		const apiEndpoints = flexiFunnelsApi.getApiEndpoints();

		return c.json({
			success: true,
			data: {
				businessMetrics,
				apiEndpoints,
			},
		});
		
	} catch (error) {
		console.error('Error testing FlexiFunnels data:', error);
		return c.json({ 
			error: 'Failed to fetch data',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, 500);
	}
}
