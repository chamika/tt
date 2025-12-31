<script lang="ts">
	import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-svelte';
	
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
	
	const typeStyles = {
		success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400",
		error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400",
		warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/30 text-yellow-700 dark:text-yellow-400",
		info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400"
	};
	
	const icons = {
		success: CheckCircle,
		error: XCircle,
		warning: AlertCircle,
		info: Info
	};
	
	const Icon = icons[type];
</script>

<div class="p-4 rounded-lg border {typeStyles[type]} flex items-start gap-3 animate-slideDown">
	<Icon size={20} class="flex-shrink-0 mt-0.5" />
	<p class="text-sm flex-1">{message}</p>
	{#if dismissible && onDismiss}
		<button
			onclick={onDismiss}
			class="flex-shrink-0 hover:opacity-70 transition-opacity"
			aria-label="Dismiss"
		>
			<XCircle size={18} />
		</button>
	{/if}
</div>
