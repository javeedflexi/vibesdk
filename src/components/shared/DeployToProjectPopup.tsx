import { useCallback, useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import {
// 	Select,
// 	SelectTrigger,
// 	SelectValue,
// 	SelectContent,
// 	SelectItem,
// } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { apiClient, ApiError } from '@/lib/api-client';
import { AppDetailsData } from '@/api-types';
import { useParams } from 'react-router';

// Use proper types from API types
type AppDetails = AppDetailsData;

interface DeployToProjectPopupProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void> | void;
	title?: string;
	description?: string;
	isLoading?: boolean;
	setIsDeploy: (open: boolean) => void;
	deploymentUrl: string;
	setDeployData?: (data: Record<string, any>) => void;
	isCurrentlyDeploying?: boolean;
}

export function DeployToProjectPopup({
	open,
	onOpenChange,
	onConfirm,
	title = 'Deploy to Project',
	description = 'Select a project and enter page details to deploy.',
	// isLoading = false,
	setIsDeploy,
	deploymentUrl,
	setDeployData,
	isCurrentlyDeploying,
}: DeployToProjectPopupProps) {
	const { id } = useParams();
	const { user } = useAuth();
	const [pageName, setPageName] = useState<string>('');
	const [pagePath, setPagePath] = useState<string>('');
	const [userDetails, setUserDetails] = useState<Record<string, any>>({});
	const [app, setApp] = useState<AppDetails | null>(null);

	const fetchAppDetails = useCallback(async () => {
		if (!id) return;

		try {
			// setLoading(true);
			// setError(null);

			// Fetch app details using API client
			const appResponse = await apiClient.getAppDetails(id);

			if (appResponse.success && appResponse.data) {
				const appData = appResponse.data;
				setApp(appData);
				// setIsFavorited(appData.userFavorited || false);
				// setIsStarred(appData.userStarred || false);
			} else {
				throw new Error(
					appResponse.error?.message || 'Failed to fetch app details',
				);
			}
		} catch (err) {
			console.error('Error fetching app:', err);
			if (err instanceof ApiError) {
				if (err.status === 404) {
					// setError('App not found');
				} else {
					// setError(`Failed to load app: ${err.message}`);
				}
			} else {
				// setError(
				// 	err instanceof Error ? err.message : 'Failed to load app',
				// );
			}
		}
		// finally {
		// 	// setLoading(false);
		// }
	}, [id]);

	useEffect(() => {
		if (open) {
			fetchAppDetails();
			console.log('appdetails 1', app);
			console.log('Id 1', id);
		}
	}, [id, fetchAppDetails]);

	const extractSubdomain = (url: string): string | null => {
		try {
			const hostname = new URL(url).hostname;
			return hostname.split('.')[0];
		} catch (err) {
			console.error('Invalid URL:', err);
			return null;
		}
	};

	// ✅ Only extract if deploymentUrl is defined and not empty
	let deploymentId: string | null = null;

	if (deploymentUrl) {
		deploymentId = extractSubdomain(deploymentUrl);
		console.log(
			'Deployment ID:',
			deploymentId,
			'User Details:',
			userDetails,
		);
	}

	const getUserID = async () => {
		try {
			const res = await apiClient.getUserByEmail(user?.email || '');
			if (res.success && res.data !== undefined) {
				// handle success
				console.log('get user id', res.data);
				setUserDetails(res.data);
			}
		} catch (error) {
			console.log(error);
		}
	};

	//deploymentId: string | null
	const handleCreateProjectAndPage = async (deploymentId: string) => {
		const res = await apiClient.createProjectAndPage(
			3,
			pagePath,
			pageName,
			100,
			deploymentId,
		);

		if (res.success && res.data !== undefined && res.data !== null) {
			console.log('deploy data', res.data);
			setDeployData?.(res.data);
			setIsDeploy(true);
			onOpenChange(false);
		}
	};

	const handleDeploy = async () => {
		try {
			await onConfirm();

			// Only proceed if deploymentId is valid
			if (deploymentUrl && deploymentId) {
				await handleCreateProjectAndPage(deploymentId);
			} else {
				console.warn('onConfirm failed or returned false');
			}
		} catch (err) {
			console.error('Error during deployment:', err);
		}
	};

	useEffect(() => {
		if (!open) {
			setPageName('');
			setPagePath('');
			setApp(null);
		} else {
			if (user?.email) {
				getUserID();
			}
			console.log('appdetails 2', app);
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="overflow-y-auto max-w-md w-[90vw] sm:max-w-lg"
				onInteractOutside={(e) => {
					e.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						{title}
					</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Page Details */}
					<>
						<div className="space-y-2">
							<Label>Page Name</Label>
							<Input
								placeholder="Enter page name"
								value={pageName}
								onChange={(e) => setPageName(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label>Page Path</Label>
							<Input
								placeholder="Enter page path"
								value={pagePath}
								onChange={(e) => setPagePath(e.target.value)}
							/>
						</div>
					</>
				</div>

				<DialogFooter className="flex justify-end gap-2">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isCurrentlyDeploying}
					>
						Cancel
					</Button>
					<Button
						onClick={handleDeploy}
						disabled={
							isCurrentlyDeploying || !pageName || !pagePath
						}
						className="bg-green-600 text-white hover:bg-green-700"
					>
						{isCurrentlyDeploying ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
								Deploying...
							</>
						) : (
							'Deploy'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
