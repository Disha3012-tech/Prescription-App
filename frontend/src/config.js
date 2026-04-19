import { Platform } from 'react-native';

export const API_URL =
    Platform.OS === "web"
        ? "http://localhost:8000/"
        : "https://anew-rockslide-hyphen.ngrok-free.dev/";

export const COUNTRIES = [
    { label: '🇮🇳 India', value: 'India', currency: 'INR' },
    { label: '🇺🇸 USA', value: 'USA', currency: 'USD' },
    { label: '🇬🇧 UK', value: 'UK', currency: 'GBP' },
    { label: '🇦🇺 Australia', value: 'Australia', currency: 'AUD' },
    { label: '🇨🇦 Canada', value: 'Canada', currency: 'CAD' },
    { label: '🇩🇪 Germany', value: 'Germany', currency: 'EUR' },
    { label: '🇸🇬 Singapore', value: 'Singapore', currency: 'SGD' },
    { label: '🇦🇪 UAE', value: 'UAE', currency: 'AED' },
    { label: '🇿🇦 South Africa', value: 'South Africa', currency: 'ZAR' },
    { label: '🇧🇷 Brazil', value: 'Brazil', currency: 'BRL' },
];
