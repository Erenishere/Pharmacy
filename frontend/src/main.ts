import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  BarController,
  LineController,
  DoughnutController,
  Filler
} from 'chart.js';

// Register Chart.js components globally
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  BarController,
  LineController,
  DoughnutController,
  Filler
);

// Suppress Chrome extension warnings
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    args[0]?.includes?.('runtime.lastError') ||
    args[0]?.includes?.('message channel closed')
  ) {
    return; // Suppress Chrome extension warnings
  }
  originalError.apply(console, args);
};

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
