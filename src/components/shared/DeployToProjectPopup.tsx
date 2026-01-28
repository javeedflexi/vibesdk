import { useEffect, useState } from 'react';
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
import { apiClient } from '@/lib/api-client';

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
}

export function DeployToProjectPopup({
	open,
	onOpenChange,
	onConfirm,
	title = 'Deploy to Project',
	description = 'Select a project and enter page details to deploy.',
	isLoading = false,
	setIsDeploy,
	deploymentUrl,
	setDeployData,
}: DeployToProjectPopupProps) {
	const { user } = useAuth();
	const [pageName, setPageName] = useState<string>('');
	const [pagePath, setPagePath] = useState<string>('');
	const [userDetails, setUserDetails] = useState<Record<string, any>>({});

	const extractSubdomain = (url: string): string | null => {
		try {
			const hostname = new URL(url).hostname;
			return hostname.split('.')[0];
		} catch (err) {
			console.error('Invalid URL:', err);
			return null;
		}
	};

	const deploymentId = extractSubdomain(deploymentUrl);
	console.log(deploymentId, userDetails);

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
	const handleCreateProjectAndPage = async () => {
		const res = await apiClient.createProjectAndPage(
			3,
			pagePath,
			pageName,
			100,
			// deploymentId,
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
			if (deploymentId) {
				await handleCreateProjectAndPage();
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
		} else {
			getUserID();
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
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button
						onClick={handleDeploy}
						disabled={isLoading || !pageName || !pagePath}
						className="bg-green-600 text-white hover:bg-green-700"
					>
						{isLoading ? (
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
