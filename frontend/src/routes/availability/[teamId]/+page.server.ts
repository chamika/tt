import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

const API_BASE_URL = 'http://localhost:8787/api';

export const load: PageServerLoad = async ({ params }) => {
	const { teamId } = params;

	try {
		const response = await fetch(`${API_BASE_URL}/availability/${teamId}`);

		if (!response.ok) {
			throw error(404, 'Team not found');
		}

		const data = await response.json();
		return data;
	} catch (err) {
		console.error('Failed to load team data:', err);
		throw error(500, 'Failed to load team data');
	}
};
