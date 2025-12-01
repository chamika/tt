<script lang="ts">
  const tools = [
    { title: 'Handicap Calculator', href: '/handicap', description: 'Calculate handicap scores.' },
    { title: 'Availability Tracker', href: '/availability', description: 'Track match availability (coming soon).' }
  ];
</script>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
  .tile { padding: 1.2rem; border-radius: 8px; border: 1px solid #ddd; text-decoration: none; color: inherit; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
  .tile:hover { transform: translateY(-3px); box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
  h1 { margin-bottom: 0.5rem; }
</style>

<main>
  <h1>Table Tennis Tools</h1>
  <p>Choose a tool:</p>
  <div class="grid">
    {#each tools as t}
      <a class="tile" href={t.href} aria-label={t.title}>
        <h2>{t.title}</h2>
        <p>{t.description}</p>
      </a>
    {/each}
  </div>
</main>
