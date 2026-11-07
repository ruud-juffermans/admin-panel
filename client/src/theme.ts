// Follow the OS color scheme: stamp data-theme on <html> (tokens.css keys its
// variables off it) and keep it in sync when the OS preference changes.
// index.html sets the initial value inline to avoid a flash before this runs.
export function initTheme(): void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
  };
  apply();
  mq.addEventListener('change', apply);
}
