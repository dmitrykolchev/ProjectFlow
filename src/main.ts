import './index.css';
import './app-root';

// Ensure the theme from store is initialized on page load
import { store } from './state/store';
store.applyThemeAndCustomization();
store.initHistory();
