import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const darkMode = writable(browser && (localStorage.getItem('darkMode') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches));

if (browser) {
    darkMode.subscribe(value => {
        localStorage.setItem('darkMode', String(value));
        if (value) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    });
}
