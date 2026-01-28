/**
 * FlexiFunnels API Service
 * Fetches live business data from FlexiFunnels Analytics API
 */

export interface FlexiFunnelsApiConfig {
	baseUrl: string;
	userId: string;
	currency?: string;
}

export interface OverviewDataResponse {
	success: boolean;
	data: {
		revenue: {
			total: number;
			count: number;
			average: number;
			growth_percentage?: number;
		};
		visitors: {
			unique: number;
			total_pageviews: number;
			bounce_rate: number;
			avg_session_duration: number;
		};
		conversions: {
			total: number;
			rate: number;
			leads: number;
		};
		top_products?: Array<{
			id: number;
			name: string;
			sales: number;
			revenue: number;
		}>;
		comparison?: {
			previous_period: {
				revenue: number;
				change_percentage: number;
			};
		};
	};
}

export interface OverviewListResponse {
	success: boolean;
	data: {
		records: Array<{
			order_id: string;
			timestamp: string;
			product_id: number;
			product_name: string;
			amount: number;
			currency: string;
			customer_email?: string;
			customer_name?: string;
			payment_status: string;
			payment_mode: string;
			utm_source?: string;
			utm_medium?: string;
			utm_campaign?: string;
			device_type?: string;
			country?: string;
			city?: string;
			funnel_name?: string;
			affiliate_id?: string;
		}>;
		pagination: {
			current_page: number;
			total_pages: number;
			total_records: number;
			items_per_page: number;
		};
	};
}

export interface BusinessMetrics {
	payments: Array<{
		id: string;
		amount: number;
		currency: string;
		status: string;
		date: string;
		customer?: string;
		method?: string;
		product?: string;
	}>;
	sales: Array<{
		id: string;
		product: string;
		quantity: number;
		revenue: number;
		date: string;
	}>;
	pageViews: Array<{
		page: string;
		views: number;
		uniqueVisitors: number;
		date: string;
	}>;
	checkoutViews: Array<{
		date: string;
		views: number;
		conversions: number;
		abandonmentRate: number;
	}>;
	summary: {
		totalRevenue: number;
		totalTransactions: number;
		averageOrderValue: number;
		conversionRate: number;
		totalVisitors: number;
		totalPageViews: number;
	};
}

export class FlexiFunnelsApiService {
	private baseUrl: string;
	private userId: string;
	private currency: string;

	constructor(config: FlexiFunnelsApiConfig) {
		this.baseUrl = config.baseUrl || 'https://statistics.flexifunnels.com/api';
		this.userId = config.userId;
		this.currency = config.currency || 'INR';
	}

	/**
	 * Generate cache-busting timestamp
	 */
	private getTimestamp(): number {
		return Date.now();
	}

	/**
	 * Build URL with query parameters
	 */
	private buildUrl(endpoint: string, params: Record<string, any>): string {
		const url = new URL(endpoint, this.baseUrl);
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				url.searchParams.append(key, String(value));
			}
		});
		return url.toString();
	}

	/**
	 * Fetch overview data (aggregate metrics)
	 */
	async getOverviewData(daterange: string = 'today'): Promise<OverviewDataResponse> {
		const url = this.buildUrl('/get-overview-data', {
			product_id: 0,
			daterange,
			currency: this.currency,
			payMode: 3,
			saleType: 0,
			type: 0,
			defAffiliate: 0,
			userId: this.userId,
			suserId: 0,
			suserMode: 0,
			v: this.getTimestamp(),
		});

		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`API request failed: ${response.statusText}`);
			}
			return await response.json();
		} catch (error) {
			console.error('Error fetching overview data:', error);
			throw error;
		}
	}

	/**
	 * Fetch overview list (detailed transactions)
	 */
	async getOverviewList(
		daterange: string = 'today',
		itemsPerPage: number = 50,
		page: number = 1
	): Promise<OverviewListResponse> {
		const url = this.buildUrl('/get-overview-list', {
			itemsPerPage,
			page,
			product_id: 0,
			daterange,
			currency: this.currency,
			payMode: 3,
			saleType: 0,
			type: 0,
			defAffiliate: 0,
			userId: this.userId,
			suserId: 0,
			suserMode: 0,
			v: this.getTimestamp(),
		});

		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`API request failed: ${response.statusText}`);
			}
			return await response.json();
		} catch (error) {
			console.error('Error fetching overview list:', error);
			throw error;
		}
	}

	/**
	 * Fetch comprehensive business metrics for code generation
	 * This combines data from both endpoints to provide a complete picture
	 */
	async getBusinessMetrics(daterange: string = 'today'): Promise<BusinessMetrics> {
		try {
			// Fetch both overview data and transaction list
			const [overviewData, transactionList] = await Promise.all([
				this.getOverviewData(daterange),
				this.getOverviewList(daterange, 100, 1),
			]);

			if (!overviewData.success || !transactionList.success) {
				throw new Error('Failed to fetch business metrics');
			}

			// Transform overview data into payments array
			const payments = transactionList.data.records.map((record) => ({
				id: record.order_id,
				amount: record.amount,
				currency: record.currency,
				status: record.payment_status,
				date: record.timestamp,
				customer: record.customer_name,
				method: record.payment_mode,
				product: record.product_name,
			}));

			// Transform into sales array (grouped by product)
			const salesMap = new Map<string, { quantity: number; revenue: number }>();
			transactionList.data.records.forEach((record) => {
				const existing = salesMap.get(record.product_name) || { quantity: 0, revenue: 0 };
				salesMap.set(record.product_name, {
					quantity: existing.quantity + 1,
					revenue: existing.revenue + record.amount,
				});
			});

			const sales = Array.from(salesMap.entries()).map(([product, data], index) => ({
				id: `sale_${index + 1}`,
				product,
				quantity: data.quantity,
				revenue: data.revenue,
				date: daterange,
			}));

			// Create page views data from visitor stats
			const pageViews = [
				{
					page: 'All Pages',
					views: overviewData.data.visitors.total_pageviews,
					uniqueVisitors: overviewData.data.visitors.unique,
					date: daterange,
				},
			];

			// Create checkout views data from conversion stats
			const checkoutViews = [
				{
					date: daterange,
					views: overviewData.data.visitors.unique,
					conversions: overviewData.data.conversions.total,
					abandonmentRate: 100 - overviewData.data.conversions.rate,
				},
			];

			// Create summary
			const summary = {
				totalRevenue: overviewData.data.revenue.total,
				totalTransactions: overviewData.data.revenue.count,
				averageOrderValue: overviewData.data.revenue.average,
				conversionRate: overviewData.data.conversions.rate,
				totalVisitors: overviewData.data.visitors.unique,
				totalPageViews: overviewData.data.visitors.total_pageviews,
			};

			return {
				payments,
				sales,
				pageViews,
				checkoutViews,
				summary,
			};
		} catch (error) {
			console.error('Error fetching business metrics:', error);
			throw error;
		}
	}

	/**
	 * Get API endpoint configuration for generated code
	 */
	getApiEndpoints() {
		return {
			baseUrl: this.baseUrl,
			endpoints: {
				overviewData: '/get-overview-data',
				overviewList: '/get-overview-list',
			},
			authentication: {
				method: 'query_parameter',
				parameter: 'userId',
			},
		};
	}
}
