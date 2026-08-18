import axios from "axios";
import { authService } from "../auth/AuthService";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4001/api";

const api = axios.create({ baseURL: BASE, timeout: 10000 });

// Attach access token if available
api.interceptors.request.use(async (cfg) => {
	try {
		const token = await authService.getAccessToken();
		if (token && cfg.headers) {
			cfg.headers.Authorization = `Bearer ${token}`;
		}
	} catch (err) {
		// ignore
	}
	return cfg;
});

export default api;
