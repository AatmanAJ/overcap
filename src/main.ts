import { mount } from 'svelte';
import '@fontsource-variable/inter/wght.css';
import App from './App.svelte';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

const target = document.getElementById('app');

if (!target) {
  throw new Error('Overcap mount point was not found');
}

mount(App, { target });
