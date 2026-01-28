import { TemplateRegistry } from '../../inferutils/schemaFormatters';
import { PhaseConceptSchema, type PhaseConceptType } from '../../schemas';
import type { IssueReport } from '../../domain/values/IssueReport';
import type { UserContext } from '../../core/types';
import { issuesPromptFormatter, PROMPT_UTILS } from '../../prompts';

// Helper function to format live FlexiFunnels data for the prompt
export function formatLiveData(customData?: any): string {
	if (!customData || !customData.businessMetrics) {
		return '';
	}

	const { businessMetrics, apiEndpoints } = customData;
	let dataSection = '\n<LIVE_FLEXIFUNNELS_DATA>\n';
	dataSection += '**REAL BUSINESS DATA FROM FLEXIFUNNELS API**\n\n';
	dataSection += 'The following is actual live data from the user\'s FlexiFunnels account. Use this data structure to generate realistic, functional code that works with their real business metrics.\n\n';

	// Add summary first
	if (businessMetrics.summary) {
		dataSection += '**Business Summary:**\n';
		dataSection += `- Total Revenue: ${businessMetrics.summary.totalRevenue.toFixed(2)} ${businessMetrics.payments?.[0]?.currency || 'INR'}\n`;
		dataSection += `- Total Transactions: ${businessMetrics.summary.totalTransactions}\n`;
		dataSection += `- Average Order Value: ${businessMetrics.summary.averageOrderValue.toFixed(2)}\n`;
		dataSection += `- Conversion Rate: ${businessMetrics.summary.conversionRate.toFixed(2)}%\n`;
		dataSection += `- Total Visitors: ${businessMetrics.summary.totalVisitors}\n`;
		dataSection += `- Total Page Views: ${businessMetrics.summary.totalPageViews}\n\n`;
	}

	// Format Payments Data
	if (businessMetrics.payments && businessMetrics.payments.length > 0) {
		dataSection += '**Payments/Transactions Data Structure:**\n';
		dataSection += '```typescript\n';
		dataSection += 'interface Payment {\n';
		dataSection += '  id: string;\n';
		dataSection += '  amount: number;\n';
		dataSection += '  currency: string;\n';
		dataSection += '  status: string;\n';
		dataSection += '  date: string;\n';
		dataSection += '  customer?: string;\n';
		dataSection += '  method?: string;\n';
		dataSection += '  product?: string;\n';
		dataSection += '}\n';
		dataSection += '```\n\n';
		dataSection += '**Sample Payment Records (first 5):**\n';
		dataSection += '```json\n';
		dataSection += JSON.stringify(businessMetrics.payments.slice(0, 5), null, 2);
		dataSection += '\n```\n\n';
		dataSection += `Total Payments in Dataset: ${businessMetrics.payments.length}\n\n`;
	}

	// Format Sales Data
	if (businessMetrics.sales && businessMetrics.sales.length > 0) {
		dataSection += '**Sales Data Structure:**\n';
		dataSection += '```typescript\n';
		dataSection += 'interface Sale {\n';
		dataSection += '  id: string;\n';
		dataSection += '  product: string;\n';
		dataSection += '  quantity: number;\n';
		dataSection += '  revenue: number;\n';
		dataSection += '  date: string;\n';
		dataSection += '}\n';
		dataSection += '```\n\n';
		dataSection += '**Sample Sales Records:**\n';
		dataSection += '```json\n';
		dataSection += JSON.stringify(businessMetrics.sales.slice(0, 5), null, 2);
		dataSection += '\n```\n\n';
		dataSection += `Total Products Sold: ${businessMetrics.sales.length}\n\n`;
	}

	// Format Page Views Data
	if (businessMetrics.pageViews && businessMetrics.pageViews.length > 0) {
		dataSection += '**Page Views/Traffic Data Structure:**\n';
		dataSection += '```typescript\n';
		dataSection += 'interface PageView {\n';
		dataSection += '  page: string;\n';
		dataSection += '  views: number;\n';
		dataSection += '  uniqueVisitors: number;\n';
		dataSection += '  date: string;\n';
		dataSection += '}\n';
		dataSection += '```\n\n';
		dataSection += '**Traffic Data:**\n';
		dataSection += '```json\n';
		dataSection += JSON.stringify(businessMetrics.pageViews, null, 2);
		dataSection += '\n```\n\n';
	}

	// Format Checkout Views Data
	if (businessMetrics.checkoutViews && businessMetrics.checkoutViews.length > 0) {
		dataSection += '**Checkout/Conversion Analytics Structure:**\n';
		dataSection += '```typescript\n';
		dataSection += 'interface CheckoutAnalytics {\n';
		dataSection += '  date: string;\n';
		dataSection += '  views: number;\n';
		dataSection += '  conversions: number;\n';
		dataSection += '  abandonmentRate: number;\n';
		dataSection += '}\n';
		dataSection += '```\n\n';
		dataSection += '**Conversion Data:**\n';
		dataSection += '```json\n';
		dataSection += JSON.stringify(businessMetrics.checkoutViews, null, 2);
		dataSection += '\n```\n\n';
	}

	// Add API endpoints information
	if (apiEndpoints) {
		dataSection += '**FlexiFunnels API Integration:**\n';
		dataSection += `Base URL: ${apiEndpoints.baseUrl}\n`;
		dataSection += 'Available Endpoints:\n';
		Object.entries(apiEndpoints.endpoints || {}).forEach(([key, value]) => {
			dataSection += `  - ${key}: ${value}\n`;
		});
		dataSection += '\nAuthentication: Query parameter "userId"\n\n';
	}

	dataSection += '**CRITICAL INSTRUCTIONS FOR CODE GENERATION:**\n\n';
	dataSection += '1. **Use Exact Data Structures:** Create TypeScript interfaces that EXACTLY match the structures shown above\n';
	dataSection += '2. **Generate Realistic Mock Data:** Use the sample data as a template to generate additional realistic mock data\n';
	dataSection += '3. **API Integration:** Generate code that can fetch data from the FlexiFunnels API endpoints provided\n';
	dataSection += '4. **Data Visualization:** If building charts/dashboards, use this real data to show actual business metrics\n';
	dataSection += '5. **Type Safety:** Add proper TypeScript types for all data structures and API responses\n';
	dataSection += '6. **Error Handling:** Include proper error handling for API calls and data processing\n';
	dataSection += '7. **Loading States:** Add loading, empty, and error states for all data fetching\n';
	dataSection += '8. **Data Export:** MANDATORY - Include CSV/Excel export functionality for all data tables\n';
	dataSection += '9. **Date Filters:** MANDATORY - Add date range filters (today, week, month, last 30 days, etc.)\n';
	dataSection += '10. **Responsive Design:** Ensure all data visualizations work on mobile, tablet, and desktop\n';
	dataSection += '11. **FlexiFunnels Branding:** Use FlexiFunnels branding and add "Built with ❤️ at FlexiFunnels" in footer\n';
	dataSection += '12. **Real-time Updates:** Consider adding auto-refresh functionality for live data\n\n';
	
	dataSection += '**Example API Call Code to Generate:**\n';
	dataSection += '```typescript\n';
	dataSection += 'const fetchBusinessData = async (userId: string, daterange: string = "today") => {\n';
	dataSection += '  const timestamp = Date.now();\n';
	dataSection += '  const url = `${apiEndpoints.baseUrl}/get-overview-data?userId=${userId}&daterange=${daterange}&currency=INR&v=${timestamp}`;\n';
	dataSection += '  const response = await fetch(url);\n';
	dataSection += '  if (!response.ok) throw new Error("Failed to fetch data");\n';
	dataSection += '  return await response.json();\n';
	dataSection += '};\n';
	dataSection += '```\n\n';
	
	dataSection += '</LIVE_FLEXIFUNNELS_DATA>\n\n';

	return dataSection;
}

export const PHASE_IMPLEMENTATION_SYSTEM_PROMPT = `You are implementing a phase in a React + TypeScript codebase for FlexiFunnels.

<FLEXIFUNNELS_BRANDING>
**Company:** FlexiFunnels
**Product:** Build Vibe Production (powered by FlexiFunnels)
**Mission:** Create stunning, data-driven applications for FlexiFunnels users
**Footer Text:** Built with ❤️ at FlexiFunnels
**Brand Colors:** Use professional, modern color schemes appropriate for business analytics
</FLEXIFUNNELS_BRANDING>

<UX_RUBRIC>
- Layout: responsive, consistent spacing, clear hierarchy.
- Interaction: hover/focus states, sensible transitions.
- States: loading/empty/error handled.
- Accessibility: labels/aria where needed, keyboard focus visible.
- **Visual Excellence:** Create stunning, professional-grade UI that exceeds user expectations
- **Perfect Spacing:** Use consistent, harmonious spacing that creates visual rhythm
- **Interactive States:** Beautiful hover, focus, active, and loading states for all interactive elements
- **Smooth Animations:** Subtle, professional micro-interactions and transitions
- **Responsive Design:** Flawless layouts across all device sizes (mobile, tablet, desktop)
- **Data Visualization:** Use professional charts and graphs (Recharts, Chart.js, etc.)
</UX_RUBRIC>

<RELIABILITY>
- No TS errors.
- No hooks violations.
- No render loops.
- No whole-store selectors.
- Proper error handling with try-catch blocks.
- Null checks before property access (user?.name).
- Validate array length before element access.
- Handle API errors gracefully with user-friendly messages.
</RELIABILITY>

<CODE_QUALITY_STANDARDS>
**CRITICAL ERROR PREVENTION:**

1. **React Render Loop Prevention** - HIGHEST PRIORITY
   - Never call setState during render phase
   - Always use dependency arrays in useEffect
   - Avoid unconditional setState in useEffect
   - Stabilize object/array references with useMemo/useCallback

2. **Variable Declaration Order** - CRITICAL
   - Declare/import ALL variables before use
   - Avoid Temporal Dead Zone (TDZ) errors

3. **Import Validation** - DEPLOYMENT BLOCKER
   - Verify all imports against <DEPENDENCIES>
   - Check file paths are correct
   - Ensure named vs default import syntax is correct

4. **Runtime Error Prevention**
   - Add null checks before property access
   - Validate array length before element access
   - Use try-catch for async operations
   - Handle undefined values gracefully

**VISUAL EXCELLENCE:**
- **Pixel-Perfect Layouts:** Obsessive attention to spacing, alignment, and visual hierarchy
- **Beautiful Spacing Systems:** Consistent, harmonious spacing with visual rhythm
- **Interactive State Design:** Beautiful hover, focus, active, loading states
- **Smooth Animations:** Subtle, professional micro-interactions
- **Responsive Excellence:** Intentionally designed at every breakpoint
- **Visual Depth:** Strategic use of shadows, borders, gradients
- **Typography Mastery:** Clear visual hierarchy with perfect font sizes, weights
- **Color Harmony:** Thoughtful use of colors for emotional connection
- **Component Polish:** Every element looks professionally crafted

**DATA-HEAVY PAGES REQUIREMENTS (MANDATORY):**
- **Export Functionality:** Every page displaying data MUST include export options
- **Export Formats:** CSV, Excel, PDF (at minimum)
- **Date Range Filters:** today, yesterday, week, month, last 30 days, last 90 days, year
- **Real-time Updates:** Consider adding auto-refresh for live data
- **Empty States:** Beautiful empty states when no data is available
- **Loading States:** Professional loading skeletons/spinners
- **Error States:** User-friendly error messages with retry options
- **This is MANDATORY for ALL data-displaying pages**

**FLEXIFUNNELS SPECIFIC:**
- Always add footer: "Built with ❤️ at FlexiFunnels"
- Use FlexiFunnels branding where appropriate
- Follow existing custom patterns in the codebase
- Integrate with SSO authentication when needed
- Use FlexiFunnels API for data fetching
- Handle FlexiFunnels data structures correctly
</CODE_QUALITY_STANDARDS>

${PROMPT_UTILS.UI_NON_NEGOTIABLES_V3}

${PROMPT_UTILS.COMMON_PITFALLS}

${PROMPT_UTILS.COMMON_DEP_DOCUMENTATION}

<DEPENDENCIES>
{{dependencies}}

{{blueprintDependencies}}
</DEPENDENCIES>

{{liveData}}

{{template}}

<BLUEPRINT>
{{blueprint}}
</BLUEPRINT>`;

const PHASE_IMPLEMENTATION_USER_PROMPT_TEMPLATE = `Phase Implementation

<OUTPUT_REQUIREMENTS>
- Output exactly {{fileCount}} files.
- One cat block per file.
- Output only file contents (no commentary).
</OUTPUT_REQUIREMENTS>

<ZUSTAND_STORE_LAW>
- One field per store call: useStore(s => s.field)
- NEVER: useStore(s => s) / useStore((state)=>state)
- NEVER destructure store results
- NEVER return object/array from selector
If you need multiple values/actions, write multiple store calls.
Example:
BAD: const { openWindow, setActiveWindow } = useOSStore(s => s)
GOOD: const openWindow = useOSStore(s => s.openWindow); const setActiveWindow = useOSStore(s => s.setActiveWindow)
</ZUSTAND_STORE_LAW>

<CURRENT_PHASE>
{{phaseText}}

{{issues}}

{{userSuggestions}}
</CURRENT_PHASE>`;

const formatUserSuggestions = (suggestions?: string[] | null): string => {
	if (!suggestions || suggestions.length === 0) return '';

	return `Client feedback to address in this phase:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
};

export function formatPhaseImplementationUserPrompt(args: {
	phaseText: string;
	issuesText?: string;
	userSuggestionsText?: string;
	fileCount?: number;
}): string {
	const prompt = PROMPT_UTILS.replaceTemplateVariables(PHASE_IMPLEMENTATION_USER_PROMPT_TEMPLATE, {
		phaseText: args.phaseText,
		issues: args.issuesText ?? '',
		userSuggestions: args.userSuggestionsText ?? '',
		fileCount: String(args.fileCount ?? 0),
	});

	return PROMPT_UTILS.verifyPrompt(prompt);
}

export function buildPhaseImplementationUserPrompt(args: {
	phase: PhaseConceptType;
	issues: IssueReport;
	userContext?: UserContext;
}): string {
	const phaseText = TemplateRegistry.markdown.serialize(args.phase, PhaseConceptSchema);
	const fileCount = args.phase.files?.length ?? 0;

	return formatPhaseImplementationUserPrompt({
		phaseText,
		issuesText: issuesPromptFormatter(args.issues),
		userSuggestionsText: formatUserSuggestions(args.userContext?.suggestions),
		fileCount,
	});
}
