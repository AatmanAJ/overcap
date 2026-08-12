import { mount } from 'svelte';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import App from './App.svelte';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

const target = document.getElementById('app');

if (!target) {
  throw new Error('Overcap mount point was not found');
}

const localDemoRequested =
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === '1';
const demoBackendReady = import.meta.env.RECORDER_EDITION
  ? import('./demo/installDemoBackend').then(({ installRecorderEdition }) =>
      installRecorderEdition({ defaultTheme: import.meta.env.RECORDER_DEFAULT_THEME }),
    )
  : localDemoRequested
    ? import('./demo/installDemoBackend').then(({ installDemoBackend }) =>
        installDemoBackend({ defaultTheme: 'dark' }),
      )
    : Promise.resolve();

void demoBackendReady.then(() => mount(App, { target }));
