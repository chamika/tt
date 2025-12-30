import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

const API_BASE_URL = 'http://localhost:8787/api';

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ params }) => {
	const { teamId } = params;

	// Validate teamId is a UUID format (skip static assets like .css.map files)
	if (!UUID_REGEX.test(teamId)) {
		throw error(404, 'Invalid team ID format');
	}

	try {
		const response = await fetch(`${API_BASE_URL}/availability/${teamId}`);
		
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw error(response.status, errorData.message || 'Team not found');
		}

		const data = await response.json();
		return data;
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Failed to load team data');
	}
};
