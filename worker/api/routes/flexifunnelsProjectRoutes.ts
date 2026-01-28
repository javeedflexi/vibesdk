import { Hono } from 'hono';
import { 
	createProjectWithFlexiFunnelsData,
	testFlexiFunnelsData 
} from '../controllers/project/flexifunnelsProjectController';

const flexifunnelsProjectRoutes = new Hono();

/**
 * POST /api/flexifunnels/create-project
 * Create a new project with live FlexiFunnels data
 * 
 * Body:
 * {
 *   "query": "Create a sales dashboard",
 *   "userId": "n1BwmZx9XVrNkbRX",
 *   "daterange": "today",
 *   "currency": "INR",
 *   "templateName": "react-typescript"
 * }
 */
flexifunnelsProjectRoutes.post('/create-project', createProjectWithFlexiFunnelsData);

/**
 * GET /api/flexifunnels/test-data?userId=xxx&daterange=today&currency=INR
 * Test endpoint to fetch FlexiFunnels data without creating a project
 */
flexifunnelsProjectRoutes.get('/test-data', testFlexiFunnelsData);

export default flexifunnelsProjectRoutes;
