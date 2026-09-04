<script lang="ts">
	import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-svelte';
	
	let {
		type = "info",
		message,
		dismissible = true,
		onDismiss
	}: {
		type?: "success" | "error" | "warning" | "info";
		message: string;
		dismissible?: boolean;
		onDismiss?: () => void;
	} = $props();
	
	// Fully opaque surfaces so the toast never blends into the page behind it.
	const typeStyles = {
		success: "bg-green-50 border-green-300 text-green-900 dark:bg-green-950 dark:border-green-700 dark:text-green-50",
		error: "bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-700 dark:text-red-50",
		warning: "bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-700 dark:text-yellow-50",
		info: "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-50"
	};
	
	const iconStyles = {
		success: "text-green-600 dark:text-green-400",
		error: "text-red-600 dark:text-red-400",
		warning: "text-yellow-600 dark:text-yellow-400",
		info: "text-blue-600 dark:text-blue-400"
	};
	
	const icons = {
		success: CheckCircle,
		error: XCircle,
		warning: AlertCircle,
		info: Info
	};
	
	const Icon = icons[type];
</script>

<div
	role="alert"
	class="p-4 rounded-lg border shadow-lg shadow-black/10 dark:shadow-black/50 {typeStyles[type]} flex items-start gap-3 animate-slideDown"
>
	<Icon size={20} class="flex-shrink-0 mt-0.5 {iconStyles[type]}" />
	<p class="text-sm font-medium flex-1">{message}</p>
	{#if dismissible && onDismiss}
		<button
			onclick={onDismiss}
			class="flex-shrink-0 -mt-0.5 -mr-1 p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-current"
			aria-label="Dismiss"
		>
			<X size={18} />
		</button>
	{/if}
</div>
