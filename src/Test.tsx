import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export default function TestSSOUser() {
	useEffect(() => {
		const fetchUser = async () => {
			try {
				const response = await apiClient.getUserByEmail(
					'developer@flexifunnels.com',
				);

				console.log(response.data?.user);
			} catch (err) {
				console.log(err);
			}
		};

		fetchUser();
	}, []);

	return <div>test</div>;
}
