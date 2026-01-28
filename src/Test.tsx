import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from './contexts/auth-context';

export default function TestSSOUser() {
	const { user } = useAuth();
	console.log(user);

	const fetchUser = async () => {
		try {
			const response = await apiClient.getUserByEmail(user?.email || '');

			console.log(response.data?.user);
		} catch (err) {
			console.log(err);
		}
	};
	useEffect(() => {
		if (user?.email) {
			fetchUser();
		}
	}, [user]);

	return <div>test</div>;
}
